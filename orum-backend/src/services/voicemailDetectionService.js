const { Call } = require('../models');

/**
 * Voicemail Detection Service
 * Analyzes call audio and metadata to detect voicemail machines
 */
class VoicemailDetectionService {
  constructor() {
    this.signalwireService = require('./signalwireService');
    
    // Configuration
    this.config = {
      // AMD (Answering Machine Detection) settings
      enabled: process.env.VOICEMAIL_DETECTION_ENABLED !== 'false',
      timeout: parseInt(process.env.VOICEMAIL_DETECTION_TIMEOUT) || 5000, // 5 seconds
      
      // Voicemail indicators
      silenceThreshold: 2000, // 2 seconds of silence indicates voicemail
      beepFrequencyRange: [800, 1200], // Hz - typical voicemail beep range
      greetingMaxDuration: 8000, // 8 seconds - max greeting before assuming voicemail
      
      // Confidence thresholds
      highConfidenceThreshold: 0.85,
      mediumConfidenceThreshold: 0.65
    };
  }

  /**
   * Enable AMD (Answering Machine Detection) when placing call
   * SignalWire supports built-in AMD
   */
  getAMDParameters() {
    if (!this.config.enabled) {
      return {};
    }

    return {
      machineDetection: 'DetectMessageEnd', // or 'Enable' for faster detection
      machineDetectionTimeout: this.config.timeout,
      machineDetectionSpeechThreshold: 2400,
      machineDetectionSpeechEndThreshold: 1200,
      machineDetectionSilenceTimeout: 2000,
      asyncAmd: true, // Get webhook callback with results
      asyncAmdStatusCallback: `${process.env.BACKEND_URL}/api/webhooks/amd-status`
    };
  }

  /**
   * Handle AMD webhook from SignalWire
   */
  async handleAMDWebhook(amdData) {
    try {
      const { 
        CallSid, 
        AnsweredBy, // 'human' or 'machine'
        MachineDetectionDuration,
        Confidence // 0-100
      } = amdData;

      const isVoicemail = AnsweredBy === 'machine';
      const confidence = parseFloat(Confidence) / 100; // Convert to 0-1

      // Find call by SignalWire SID
      const call = await Call.findOne({ where: { twilioSid: CallSid } });
      
      if (call) {
        await call.update({
          voicemailDetected: isVoicemail,
          voicemailConfidence: confidence,
          outcome: isVoicemail ? 'voicemail' : 'connected'
        });

        console.log(`AMD Result for ${CallSid}: ${AnsweredBy} (confidence: ${confidence})`);

        // Return decision to caller
        return {
          callId: call.id,
          isVoicemail,
          confidence,
          shouldHangup: isVoicemail && confidence >= this.config.mediumConfidenceThreshold
        };
      }

      return null;
    } catch (error) {
      console.error('Error handling AMD webhook:', error);
      throw error;
    }
  }

  /**
   * Client-side voicemail detection (fallback/additional layer)
   * Analyzes audio patterns sent from frontend
   */
  async analyzeAudioPattern(audioData) {
    try {
      // Audio pattern analysis
      const patterns = {
        hasLongSilence: audioData.silenceDuration > this.config.silenceThreshold,
        hasBeep: this.detectBeepFrequency(audioData.frequencies),
        greetingTooLong: audioData.speechDuration > this.config.greetingMaxDuration,
        speechPattern: this.analyzeSpeechPattern(audioData.speechSegments)
      };

      // Calculate confidence score
      let confidence = 0;
      
      if (patterns.hasBeep) confidence += 0.4;
      if (patterns.hasLongSilence) confidence += 0.3;
      if (patterns.greetingTooLong) confidence += 0.2;
      if (patterns.speechPattern === 'monotone') confidence += 0.1;

      const isVoicemail = confidence >= this.config.mediumConfidenceThreshold;

      return {
        isVoicemail,
        confidence,
        patterns,
        recommendation: this.getRecommendation(confidence)
      };
    } catch (error) {
      console.error('Error analyzing audio pattern:', error);
      return { isVoicemail: false, confidence: 0, error: error.message };
    }
  }

  /**
   * Detect beep frequency in audio spectrum
   */
  detectBeepFrequency(frequencies) {
    if (!frequencies || frequencies.length === 0) return false;

    const [minFreq, maxFreq] = this.config.beepFrequencyRange;
    
    // Check if dominant frequency falls within voicemail beep range
    const dominantFrequency = this.findDominantFrequency(frequencies);
    return dominantFrequency >= minFreq && dominantFrequency <= maxFreq;
  }

  /**
   * Find dominant frequency from spectrum data
   */
  findDominantFrequency(frequencies) {
    let maxAmplitude = 0;
    let dominantFreq = 0;

    frequencies.forEach((amplitude, index) => {
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude;
        dominantFreq = index * 22050 / frequencies.length; // Assuming 44.1kHz sample rate
      }
    });

    return dominantFreq;
  }

  /**
   * Analyze speech pattern for monotone/robotic characteristics
   */
  analyzeSpeechPattern(speechSegments) {
    if (!speechSegments || speechSegments.length < 2) return 'unknown';

    // Check for consistent amplitude (monotone)
    const amplitudes = speechSegments.map(s => s.amplitude);
    const variance = this.calculateVariance(amplitudes);
    
    // Low variance indicates monotone (voicemail)
    return variance < 0.1 ? 'monotone' : 'varied';
  }

  /**
   * Calculate variance of array
   */
  calculateVariance(array) {
    const mean = array.reduce((a, b) => a + b, 0) / array.length;
    const variance = array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
    return variance;
  }

  /**
   * Get recommendation based on confidence score
   */
  getRecommendation(confidence) {
    if (confidence >= this.config.highConfidenceThreshold) {
      return 'hangup-immediately';
    } else if (confidence >= this.config.mediumConfidenceThreshold) {
      return 'hangup-suggested';
    } else {
      return 'continue-call';
    }
  }

  /**
   * Mark call as voicemail and optionally end it
   */
  async markAsVoicemail(callId, confidence, autoHangup = true) {
    try {
      const call = await Call.findByPk(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      await call.update({
        voicemailDetected: true,
        voicemailConfidence: confidence,
        outcome: 'voicemail'
      });

      // Hangup call if requested
      if (autoHangup && call.twilioSid) {
        await this.signalwireService.client.calls(call.twilioSid)
          .update({ status: 'completed' });
        
        console.log(`Call ${callId} ended due to voicemail detection`);
      }

      return call;
    } catch (error) {
      console.error('Error marking call as voicemail:', error);
      throw error;
    }
  }
}

module.exports = new VoicemailDetectionService();

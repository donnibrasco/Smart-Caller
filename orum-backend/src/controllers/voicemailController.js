const voicemailService = require('../services/voicemailDetectionService');
const powerDialerService = require('../services/powerDialerService');

/**
 * Analyze audio pattern for voicemail detection
 */
exports.analyzeAudio = async (req, res) => {
  try {
    const { audioData } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'audioData is required' });
    }

    const result = await voicemailService.analyzeAudioPattern(audioData);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error analyzing audio:', error);
    res.status(500).json({ error: 'Failed to analyze audio' });
  }
};

/**
 * Mark a call as voicemail
 */
exports.markAsVoicemail = async (req, res) => {
  try {
    const { callId, confidence, autoHangup } = req.body;
    
    if (!callId) {
      return res.status(400).json({ error: 'callId is required' });
    }

    const call = await voicemailService.markAsVoicemail(
      callId, 
      confidence || 0.8, 
      autoHangup !== false
    );
    
    res.json({
      success: true,
      call: {
        id: call.id,
        voicemailDetected: call.voicemailDetected,
        voicemailConfidence: call.voicemailConfidence,
        outcome: call.outcome
      }
    });
  } catch (error) {
    console.error('Error marking as voicemail:', error);
    res.status(500).json({ error: 'Failed to mark as voicemail' });
  }
};

/**
 * Webhook handler for AMD (Answering Machine Detection) from SignalWire
 */
exports.amdStatusWebhook = async (req, res) => {
  try {
    const result = await voicemailService.handleAMDWebhook(req.body);
    
    // If voicemail detected with high confidence, auto-hangup via power dialer
    if (result && result.shouldHangup) {
      // Notify power dialer to skip to next call
      const call = await require('../models').Call.findByPk(result.callId);
      if (call && call.userId) {
        await powerDialerService.handleCallCompletion(
          call.twilioSid,
          'completed',
          'voicemail'
        );
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling AMD webhook:', error);
    res.sendStatus(500);
  }
};

/**
 * Get voicemail detection configuration
 */
exports.getConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        enabled: voicemailService.config.enabled,
        timeout: voicemailService.config.timeout,
        silenceThreshold: voicemailService.config.silenceThreshold,
        beepFrequencyRange: voicemailService.config.beepFrequencyRange,
        highConfidenceThreshold: voicemailService.config.highConfidenceThreshold,
        mediumConfidenceThreshold: voicemailService.config.mediumConfidenceThreshold
      }
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
};

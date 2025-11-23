/**
 * Voicemail Detection Service
 * Analyzes call audio in real-time to detect voicemail machines
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://salescallagent.my/api';

interface AudioAnalysisData {
  frequencies: number[];
  silenceDuration: number;
  speechDuration: number;
  speechSegments: Array<{ amplitude: number; duration: number }>;
}

interface VoicemailDetectionResult {
  isVoicemail: boolean;
  confidence: number;
  patterns?: any;
  recommendation?: string;
}

export class VoicemailDetectionService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  
  private silenceStartTime: number | null = null;
  private speechStartTime: number | null = null;
  private silenceDuration: number = 0;
  private speechDuration: number = 0;
  private speechSegments: Array<{ amplitude: number; duration: number }> = [];
  private frequencies: number[] = [];
  
  private config = {
    silenceThreshold: 0.01, // Amplitude threshold for silence
    analysisInterval: 100, // ms
    minSilenceForVoicemail: 2000, // 2 seconds
    maxGreetingLength: 8000 // 8 seconds
  };

  /**
   * Start analyzing audio stream
   */
  async startAnalysis(stream: MediaStream, onDetection?: (result: VoicemailDetectionResult) => void): Promise<void> {
    try {
      this.stream = stream;
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      // Create processor for real-time analysis
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (e) => {
        this.processAudioData(e.inputBuffer);
        
        // Check for voicemail patterns periodically
        if (this.speechDuration > this.config.maxGreetingLength) {
          this.detectVoicemail().then(result => {
            if (result.isVoicemail && onDetection) {
              onDetection(result);
            }
          });
        }
      };

      console.log('Voicemail detection started');
    } catch (error) {
      console.error('Error starting voicemail detection:', error);
      throw error;
    }
  }

  /**
   * Process audio data
   */
  private processAudioData(buffer: AudioBuffer): void {
    const data = buffer.getChannelData(0);
    
    // Calculate RMS amplitude
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);

    // Detect silence vs speech
    const now = Date.now();
    if (rms < this.config.silenceThreshold) {
      // Silence
      if (!this.silenceStartTime) {
        this.silenceStartTime = now;
        
        // End speech segment
        if (this.speechStartTime) {
          const speechLen = now - this.speechStartTime;
          this.speechSegments.push({ amplitude: rms, duration: speechLen });
          this.speechStartTime = null;
        }
      }
      this.silenceDuration = now - (this.silenceStartTime || now);
    } else {
      // Speech
      if (!this.speechStartTime) {
        this.speechStartTime = now;
        this.silenceStartTime = null;
      }
      this.speechDuration += buffer.duration * 1000; // Convert to ms
    }

    // Get frequency data
    if (this.analyser) {
      const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(frequencyData);
      this.frequencies = Array.from(frequencyData);
    }
  }

  /**
   * Detect voicemail based on collected data
   */
  async detectVoicemail(): Promise<VoicemailDetectionResult> {
    const audioData: AudioAnalysisData = {
      frequencies: this.frequencies,
      silenceDuration: this.silenceDuration,
      speechDuration: this.speechDuration,
      speechSegments: this.speechSegments
    };

    // Local pattern analysis
    const localResult = this.analyzeLocalPatterns(audioData);

    // Server-side analysis (optional, more accurate)
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const serverResult = await this.analyzeOnServer(audioData, token);
        return serverResult;
      }
    } catch (error) {
      console.warn('Server analysis failed, using local result:', error);
    }

    return localResult;
  }

  /**
   * Analyze patterns locally
   */
  private analyzeLocalPatterns(data: AudioAnalysisData): VoicemailDetectionResult {
    let confidence = 0;

    // Long silence after greeting
    if (data.silenceDuration > this.config.minSilenceForVoicemail) {
      confidence += 0.3;
    }

    // Greeting too long
    if (data.speechDuration > this.config.maxGreetingLength) {
      confidence += 0.2;
    }

    // Detect beep frequency (800-1200 Hz)
    const hasBeep = this.detectBeep(data.frequencies);
    if (hasBeep) {
      confidence += 0.4;
    }

    // Monotone speech pattern
    if (this.isMonotone(data.speechSegments)) {
      confidence += 0.1;
    }

    const isVoicemail = confidence >= 0.65;

    return {
      isVoicemail,
      confidence,
      recommendation: confidence >= 0.85 ? 'hangup-immediately' : 
                     confidence >= 0.65 ? 'hangup-suggested' : 'continue-call'
    };
  }

  /**
   * Detect beep frequency
   */
  private detectBeep(frequencies: number[]): boolean {
    if (!frequencies || frequencies.length === 0) return false;

    // Find peak in 800-1200 Hz range (beep range)
    // Assuming 44.1kHz sample rate, bin size = 44100 / fftSize
    const binSize = 44100 / 2048;
    const minBin = Math.floor(800 / binSize);
    const maxBin = Math.floor(1200 / binSize);

    let maxAmplitude = 0;
    for (let i = minBin; i < maxBin && i < frequencies.length; i++) {
      if (frequencies[i] > maxAmplitude) {
        maxAmplitude = frequencies[i];
      }
    }

    return maxAmplitude > 150; // Threshold for beep detection
  }

  /**
   * Check if speech is monotone (robotic)
   */
  private isMonotone(segments: Array<{ amplitude: number; duration: number }>): boolean {
    if (segments.length < 3) return false;

    const amplitudes = segments.map(s => s.amplitude);
    const mean = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
    const variance = amplitudes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amplitudes.length;

    return variance < 0.001; // Low variance = monotone
  }

  /**
   * Send audio data to server for analysis
   */
  private async analyzeOnServer(audioData: AudioAnalysisData, token: string): Promise<VoicemailDetectionResult> {
    try {
      const response = await fetch(`${API_URL}/voicemail/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ audioData })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze audio');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error analyzing on server:', error);
      throw error;
    }
  }

  /**
   * Mark call as voicemail
   */
  async markAsVoicemail(callId: string, confidence: number, autoHangup: boolean = true): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${API_URL}/voicemail/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ callId, confidence, autoHangup })
      });

      if (!response.ok) {
        throw new Error('Failed to mark as voicemail');
      }

      console.log('Call marked as voicemail');
    } catch (error) {
      console.error('Error marking as voicemail:', error);
      throw error;
    }
  }

  /**
   * Stop analysis
   */
  stopAnalysis(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Reset state
    this.silenceStartTime = null;
    this.speechStartTime = null;
    this.silenceDuration = 0;
    this.speechDuration = 0;
    this.speechSegments = [];
    this.frequencies = [];

    console.log('Voicemail detection stopped');
  }
}

export default new VoicemailDetectionService();

export class OpenAIVoiceService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  
  // Callbacks
  public onTranscriptionUpdate: ((input: string, output: string) => void) | null = null;
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;

  constructor() {
    // Constructor
  }

  async connect(personaInstruction: string) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }

    // Initialize audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Get microphone access
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      throw new Error('Microphone access denied. Please allow microphone access to make calls.');
    }

    // Connect to OpenAI Realtime API
    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
    
    this.ws = new WebSocket(url, ['realtime', `openai-insecure-api-key.${apiKey}`, 'openai-beta.realtime-v1']);

    this.ws.addEventListener('open', () => {
      console.log('OpenAI Realtime connection opened');
      
      // Configure session
      this.sendMessage({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are acting as a potential sales prospect in a roleplay scenario. 
Your persona is: ${personaInstruction}. 
The user is a sales representative calling you.
Keep your responses concise, conversational, and realistic to a phone call. 
Do not be overly enthusiastic unless the persona dictates it.
If the sales rep is pushy, react negatively. If they are helpful, react positively.`,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        }
      });

      // Start audio streaming
      this.startAudioStreaming();
      
      if (this.onConnect) this.onConnect();
    });

    this.ws.addEventListener('message', (event) => {
      this.handleServerMessage(JSON.parse(event.data));
    });

    this.ws.addEventListener('close', () => {
      console.log('OpenAI Realtime connection closed');
      this.cleanup();
      if (this.onDisconnect) this.onDisconnect();
    });

    this.ws.addEventListener('error', (err) => {
      console.error('OpenAI Realtime error:', err);
      this.cleanup();
      if (this.onDisconnect) this.onDisconnect();
    });
  }

  private sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startAudioStreaming() {
    if (!this.mediaStream || !this.audioContext) return;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (PCM16)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

        this.sendMessage({
          type: 'input_audio_buffer.append',
          audio: base64
        });
      }
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  private async handleServerMessage(message: any) {
    // Handle different message types
    switch (message.type) {
      case 'response.audio.delta':
        // Play audio chunk
        if (message.delta && this.audioContext) {
          await this.playAudioChunk(message.delta);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User speech transcription
        if (message.transcript && this.onTranscriptionUpdate) {
          this.onTranscriptionUpdate(message.transcript, '');
        }
        break;

      case 'response.audio_transcript.delta':
        // AI speech transcription
        if (message.delta && this.onTranscriptionUpdate) {
          this.onTranscriptionUpdate('', message.delta);
        }
        break;

      case 'error':
        console.error('OpenAI Realtime API error:', message.error);
        break;
    }
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.audioContext) return;

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to AudioBuffer
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Play audio
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close();
    }
    
    this.audioContext = null;
    this.ws = null;
  }
}

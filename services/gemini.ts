import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createPCM16Blob, decodeAudioData, base64ToArrayBuffer } from "../utils/audioUtils";

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  
  // Callbacks
  public onTranscriptionUpdate: ((input: string, output: string) => void) | null = null;
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env file.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(personaInstruction: string) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
    }

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);
    this.nextStartTime = 0;

    // Get Microphone Stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log("Gemini Live Session Opened");
          this.startAudioStream(stream);
          if (this.onConnect) this.onConnect();
        },
        onmessage: async (message: LiveServerMessage) => {
          this.handleServerMessage(message);
        },
        onclose: () => {
          console.log("Gemini Live Session Closed");
          this.cleanup();
          if (this.onDisconnect) this.onDisconnect();
        },
        onerror: (err) => {
          console.error("Gemini Live Session Error", err);
          this.cleanup();
          if (this.onDisconnect) this.onDisconnect();
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: `You are acting as a potential sales prospect in a roleplay scenario. 
        Your persona is: ${personaInstruction}. 
        The user is a sales representative calling you.
        Keep your responses concise, conversational, and realistic to a phone call. 
        Do not be overly enthusiastic unless the persona dictates it.
        If the sales rep is pushy, react negatively. If they are helpful, react positively.`,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      }
    });
  }

  private startAudioStream(stream: MediaStream) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createPCM16Blob(inputData);
      
      if (this.sessionPromise) {
        this.sessionPromise.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      }
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleServerMessage(message: LiveServerMessage) {
    // Handle Audio
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
      const audioData = base64ToArrayBuffer(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, this.outputAudioContext, 24000);
      
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      source.start(this.nextStartTime);
      
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.add(source);
      
      source.onended = () => {
        this.activeSources.delete(source);
      };
    }

    // Handle Transcription
    const inputTrans = message.serverContent?.inputTranscription?.text;
    const outputTrans = message.serverContent?.outputTranscription?.text;
    
    if ((inputTrans || outputTrans) && this.onTranscriptionUpdate) {
       this.onTranscriptionUpdate(inputTrans || '', outputTrans || '');
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      this.activeSources.forEach(src => {
        try { src.stop(); } catch(e) {}
      });
      this.activeSources.clear();
      this.nextStartTime = 0;
    }
  }

  disconnect() {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => session.close());
    }
    this.cleanup();
  }

  private cleanup() {
    this.inputSource?.disconnect();
    this.processor?.disconnect();
    this.activeSources.forEach(src => {
        try { src.stop(); } catch(e) {}
    });
    this.activeSources.clear();
    
    if (this.inputAudioContext?.state !== 'closed') this.inputAudioContext?.close();
    if (this.outputAudioContext?.state !== 'closed') this.outputAudioContext?.close();
    
    this.inputAudioContext = null;
    this.outputAudioContext = null;
  }
}

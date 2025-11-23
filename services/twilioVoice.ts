import { Device, Call } from '@twilio/voice-sdk';

export class TwilioVoiceService {
  private device: Device | null = null;
  private activeCall: Call | null = null;
  
  // Callbacks
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  async initialize(token: string) {
    try {
      this.device = new Device(token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      });

      this.device.on('registered', () => {
        console.log('Twilio Device registered');
      });

      this.device.on('error', (error) => {
        console.error('Twilio Device error:', error);
        if (this.onError) this.onError(error.message);
      });

      this.device.on('incoming', (call) => {
        console.log('Incoming call from:', call.parameters.From);
        // Handle incoming calls if needed
      });

      await this.device.register();
    } catch (error: any) {
      console.error('Failed to initialize Twilio Device:', error);
      throw new Error('Failed to initialize voice service: ' + error.message);
    }
  }

  async makeCall(phoneNumber: string, fromNumber: string, contactName?: string, userId?: string) {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    try {
      // Log the call to backend
      const token = localStorage.getItem('token');
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://salescallagent.my/api';
      
      await fetch(`${apiUrl}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: phoneNumber,
          from: fromNumber,
          contactName: contactName || 'Unknown'
        })
      });

      const params = {
        To: phoneNumber,
        From: fromNumber
      };

      this.activeCall = await this.device.connect({ params });

      this.activeCall.on('accept', () => {
        console.log('Call connected');
        if (this.onConnect) this.onConnect();
      });

      this.activeCall.on('disconnect', () => {
        console.log('Call disconnected');
        this.activeCall = null;
        if (this.onDisconnect) this.onDisconnect();
      });

      this.activeCall.on('error', (error) => {
        console.error('Call error:', error);
        if (this.onError) this.onError(error.message);
      });

    } catch (error: any) {
      console.error('Failed to make call:', error);
      throw new Error('Failed to make call: ' + error.message);
    }
  }

  hangup() {
    if (this.activeCall) {
      this.activeCall.disconnect();
      this.activeCall = null;
    }
  }

  mute() {
    if (this.activeCall) {
      this.activeCall.mute(true);
    }
  }

  unmute() {
    if (this.activeCall) {
      this.activeCall.mute(false);
    }
  }

  async destroy() {
    if (this.activeCall) {
      this.activeCall.disconnect();
      this.activeCall = null;
    }
    
    if (this.device) {
      this.device.unregister();
      this.device.destroy();
      this.device = null;
    }
  }

  getCallStatus(): string {
    return this.activeCall?.status() || 'idle';
  }
}

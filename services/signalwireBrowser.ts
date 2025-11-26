/**
 * SignalWire Browser Calling Service
 * Handles WebRTC calls directly from the browser
 */

import { SignalWire } from '@signalwire/js';

class SignalWireBrowserService {
  private client: any = null;
  private currentCall: any = null;
  private token: string | null = null;

  /**
   * Initialize the SignalWire client with a token
   */
  async initialize(token: string): Promise<void> {
    try {
      this.token = token;
      
      this.client = await SignalWire({
        token: token,
        rootElement: document.getElementById('signalwire-call') // Hidden element for audio
      });

      console.log('[SignalWire Browser] Client initialized');

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('[SignalWire Browser] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for the client
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('call.received', (call: any) => {
      console.log('[SignalWire Browser] Incoming call:', call);
      this.currentCall = call;
    });

    this.client.on('call.state', (call: any) => {
      console.log('[SignalWire Browser] Call state changed:', call.state);
    });
  }

  /**
   * Make an outbound call
   */
  async makeCall(to: string, from?: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('SignalWire client not initialized');
      }

      console.log('[SignalWire Browser] Making call to:', to);

      const call = await this.client.dial({
        to: to,
        from: from,
        timeout: 30
      });

      this.currentCall = call;

      // Set up call event listeners
      call.on('state.changed', (state: string) => {
        console.log('[SignalWire Browser] Call state:', state);
      });

      call.on('ended', () => {
        console.log('[SignalWire Browser] Call ended');
        this.currentCall = null;
      });

      return call;
    } catch (error) {
      console.error('[SignalWire Browser] Make call error:', error);
      throw error;
    }
  }

  /**
   * Answer an incoming call
   */
  async answer(): Promise<void> {
    if (!this.currentCall) {
      throw new Error('No active call to answer');
    }

    try {
      await this.currentCall.answer();
      console.log('[SignalWire Browser] Call answered');
    } catch (error) {
      console.error('[SignalWire Browser] Answer error:', error);
      throw error;
    }
  }

  /**
   * Hangup the current call
   */
  async hangup(): Promise<void> {
    if (!this.currentCall) {
      console.log('[SignalWire Browser] No active call to hangup');
      return;
    }

    try {
      await this.currentCall.hangup();
      console.log('[SignalWire Browser] Call hung up');
      this.currentCall = null;
    } catch (error) {
      console.error('[SignalWire Browser] Hangup error:', error);
      throw error;
    }
  }

  /**
   * Mute/unmute the microphone
   */
  async toggleMute(): Promise<boolean> {
    if (!this.currentCall) {
      throw new Error('No active call');
    }

    try {
      const isMuted = await this.currentCall.toggleAudioMute();
      console.log('[SignalWire Browser] Mute toggled:', isMuted);
      return isMuted;
    } catch (error) {
      console.error('[SignalWire Browser] Toggle mute error:', error);
      throw error;
    }
  }

  /**
   * Get current call state
   */
  getCallState(): string | null {
    return this.currentCall ? this.currentCall.state : null;
  }

  /**
   * Check if there's an active call
   */
  hasActiveCall(): boolean {
    return this.currentCall !== null;
  }

  /**
   * Disconnect the client
   */
  async disconnect(): Promise<void> {
    try {
      if (this.currentCall) {
        await this.hangup();
      }

      if (this.client) {
        await this.client.disconnect();
        this.client = null;
      }

      console.log('[SignalWire Browser] Disconnected');
    } catch (error) {
      console.error('[SignalWire Browser] Disconnect error:', error);
      throw error;
    }
  }
}

export default new SignalWireBrowserService();

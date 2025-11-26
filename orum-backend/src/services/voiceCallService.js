const { SignalWire } = require('@signalwire/realtime-api');

/**
 * Voice Call Service - Handles browser-initiated calls via SignalWire Realtime API
 * Backend service that manages actual phone calls
 */
class VoiceCallService {
  constructor(io) {
    this.io = io;
    this.activeCalls = new Map(); // userId -> call object
    this.signalWireClient = null;
    this.voiceClient = null;
    
    this.projectId = process.env.SIGNALWIRE_PROJECT_ID;
    this.apiToken = process.env.SIGNALWIRE_API_TOKEN || process.env.SIGNALWIRE_AUTH_TOKEN;
    this.phoneNumber = process.env.SIGNALWIRE_PHONE_NUMBER;
    
    console.log('[VoiceCall] Service initialized');
  }

  /**
   * Initialize SignalWire Realtime client
   */
  async initialize() {
    try {
      if (this.signalWireClient) {
        return true;
      }

      console.log('[VoiceCall] Initializing SignalWire Realtime client...');
      
      this.signalWireClient = await SignalWire({
        project: this.projectId,
        token: this.apiToken
      });

      this.voiceClient = this.signalWireClient.voice;
      
      console.log('[VoiceCall] ✅ SignalWire Realtime client initialized');
      return true;
    } catch (error) {
      console.error('[VoiceCall] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Make an outbound call for a user
   */
  async makeCall(userId, phoneNumber, socketId) {
    try {
      await this.initialize();

      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) {
        throw new Error('Socket not found');
      }

      console.log('[VoiceCall] Making call to:', phoneNumber, 'for user:', userId);

      // Emit connecting state
      socket.emit('call:state', { status: 'connecting', phoneNumber });

      // Make the call using SignalWire Realtime API
      const call = await this.voiceClient.dialPhone({
        to: phoneNumber,
        from: this.phoneNumber,
        timeout: 30
      });

      // Store the active call
      this.activeCalls.set(userId, { call, socketId, phoneNumber });

      console.log('[VoiceCall] Call initiated:', call.id);

      // Emit ringing state
      socket.emit('call:state', { 
        status: 'ringing', 
        callId: call.id,
        phoneNumber 
      });

      // Listen for call events
      call.on('ended', () => {
        console.log('[VoiceCall] Call ended:', call.id);
        socket.emit('call:state', { status: 'ended', callId: call.id });
        this.activeCalls.delete(userId);
      });

      call.on('answered', () => {
        console.log('[VoiceCall] Call answered:', call.id);
        socket.emit('call:state', { status: 'active', callId: call.id });
      });

      return {
        callId: call.id,
        status: 'initiated'
      };
    } catch (error) {
      console.error('[VoiceCall] Call failed:', error);
      
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('call:error', { 
          error: error.message || 'Call failed',
          phoneNumber 
        });
      }
      
      throw error;
    }
  }

  /**
   * Hangup an active call
   */
  async hangup(userId) {
    try {
      const activeCall = this.activeCalls.get(userId);
      if (!activeCall) {
        console.log('[VoiceCall] No active call for user:', userId);
        return;
      }

      const { call, socketId } = activeCall;
      
      console.log('[VoiceCall] Hanging up call:', call.id);
      
      await call.hangup();
      
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('call:state', { status: 'ended', callId: call.id });
      }

      this.activeCalls.delete(userId);
    } catch (error) {
      console.error('[VoiceCall] Hangup failed:', error);
      throw error;
    }
  }

  /**
   * Get active call for user
   */
  getActiveCall(userId) {
    return this.activeCalls.get(userId);
  }

  /**
   * Cleanup
   */
  async cleanup() {
    console.log('[VoiceCall] Cleaning up...');
    
    // Hangup all active calls
    for (const [userId, { call }] of this.activeCalls) {
      try {
        await call.hangup();
      } catch (error) {
        console.error('[VoiceCall] Error hanging up call:', error);
      }
    }
    
    this.activeCalls.clear();
    
    if (this.signalWireClient) {
      // Disconnect SignalWire client if possible
      this.signalWireClient = null;
      this.voiceClient = null;
    }
  }
}

module.exports = VoiceCallService;

/**
 * SignalWire Voice Service - Browser-to-Phone Calling
 * Uses Socket.io to communicate with backend SignalWire Realtime API
 * Backend handles actual calls via @signalwire/realtime-api
 */

import { io, Socket } from 'socket.io-client';

export interface CallState {
  status: 'initializing' | 'connecting' | 'ringing' | 'active' | 'ended' | 'failed';
  duration: number;
}

export class SignalWireVoiceService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private currentCallId: string | null = null;
  private callStartTime: number | null = null;
  private durationInterval: NodeJS.Timeout | null = null;
  
  // Callbacks
  public onStateChange: ((state: CallState) => void) | null = null;
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  /**
   * Initialize Socket.io connection to backend
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[SignalWire] Initializing Socket.io connection...');
      
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://salescallagent.my/api';
      const authToken = localStorage.getItem('token');
      
      if (!authToken) {
        throw new Error('Please log in to make calls');
      }

      // Get session token and user info from backend
      const response = await fetch(`${apiUrl}/calls/browser-token`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get session token');
      }
      
      const data = await response.json();
      const { token, display_name, socket_url } = data;
      
      console.log('[SignalWire] Session token received for:', display_name);
      
      // Decode JWT to get userId
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      this.userId = tokenPayload.userId;
      
      console.log('[SignalWire] User ID:', this.userId);

      // Connect to Socket.io with authentication
      const socketUrl = apiUrl.replace('/api', '');
      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      // Set up Socket.io event handlers
      this.socket.on('connect', () => {
        console.log('[SignalWire] ✅ Socket.io connected:', this.socket?.id);
        
        // Join user's personal room
        if (this.userId) {
          this.socket?.emit('join_room', `user_${this.userId}`);
        }
      });
      
      this.socket.on('disconnect', () => {
        console.log('[SignalWire] Socket.io disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('[SignalWire] Socket.io connection error:', error);
        if (this.onError) {
          this.onError('Connection failed. Please try again.');
        }
      });

      // Listen for call state updates from backend
      this.socket.on('call:state', (data: { state: string; callId?: string }) => {
        console.log('[SignalWire] Call state update:', data);
        
        const { state, callId } = data;
        if (callId) {
          this.currentCallId = callId;
        }

        let callState: CallState = { status: 'connecting', duration: 0 };

        switch (state) {
          case 'connecting':
            callState.status = 'connecting';
            break;
          case 'ringing':
            callState.status = 'ringing';
            break;
          case 'answered':
          case 'active':
            callState.status = 'active';
            this.startDurationTimer();
            if (this.onConnect) this.onConnect();
            break;
          case 'ended':
            callState.status = 'ended';
            this.stopDurationTimer();
            this.currentCallId = null;
            if (this.onDisconnect) this.onDisconnect();
            break;
          case 'failed':
            callState.status = 'failed';
            this.stopDurationTimer();
            this.currentCallId = null;
            break;
        }

        if (this.callStartTime && callState.status === 'active') {
          callState.duration = Math.floor((Date.now() - this.callStartTime) / 1000);
        }

        if (this.onStateChange) {
          this.onStateChange(callState);
        }
      });

      // Listen for call errors from backend
      this.socket.on('call:error', (data: { error: string }) => {
        console.error('[SignalWire] Call error:', data.error);
        
        this.stopDurationTimer();
        this.currentCallId = null;
        
        if (this.onError) {
          this.onError(data.error);
        }
        
        if (this.onStateChange) {
          this.onStateChange({ status: 'failed', duration: 0 });
        }
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket.io connection timeout'));
        }, 5000);

        this.socket?.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        if (this.socket?.connected) {
          clearTimeout(timeout);
          resolve();
        }
      });

      console.log('[SignalWire] ✅ Socket.io initialized and ready');
      return true;
    } catch (error: any) {
      console.error('[SignalWire] Initialization failed:', error);
      if (this.onError) {
        this.onError(error.message || 'Failed to initialize calling');
      }
      return false;
    }
  }

  /**
   * Start duration timer
   */
  private startDurationTimer() {
    if (!this.callStartTime) {
      this.callStartTime = Date.now();
    }

    this.durationInterval = setInterval(() => {
      if (this.callStartTime && this.onStateChange) {
        const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
        this.onStateChange({ status: 'active', duration });
      }
    }, 1000);
  }

  /**
   * Stop duration timer
   */
  private stopDurationTimer() {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    this.callStartTime = null;
  }

  /**
   * Make a phone call from browser via backend
   */
  async makeCall(phoneNumber: string, fromNumber: string, contactName?: string, userId?: string) {
    try {
      console.log('[SignalWire] Making call to:', phoneNumber);
      
      // Initialize socket if not ready
      if (!this.socket || !this.socket.connected) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize calling');
        }
      }

      if (this.onStateChange) {
        this.onStateChange({ status: 'connecting', duration: 0 });
      }

      // Request backend to make the call via Socket.io
      this.socket!.emit('voice:dial', {
        userId: this.userId,
        phoneNumber,
        fromNumber,
        contactName
      });
      
      console.log('[SignalWire] Call request sent to backend');

      // Return temporary call info (real status will come via call:state event)
      return {
        sid: 'pending',
        status: 'connecting'
      };
    } catch (error: any) {
      console.error('[SignalWire] Call failed:', error);
      const errorMsg = error?.message || 'Failed to make call';
      
      if (this.onError) {
        this.onError(errorMsg);
      }
      if (this.onStateChange) {
        this.onStateChange({ status: 'failed', duration: 0 });
      }
      
      throw new Error(errorMsg);
    }
  }

  /**
   * Hangup current call
   */
  async hangup() {
    try {
      if (this.socket && this.userId) {
        console.log('[SignalWire] Hanging up call');
        
        this.socket.emit('voice:hangup', {
          userId: this.userId
        });
        
        this.stopDurationTimer();
        this.currentCallId = null;
        
        if (this.onDisconnect) this.onDisconnect();
        if (this.onStateChange) {
          this.onStateChange({ status: 'ended', duration: 0 });
        }
      }
    } catch (error) {
      console.error('[SignalWire] Hangup failed:', error);
    }
  }

  /**
   * Toggle mute (not supported in backend-controlled calls)
   */
  async toggleMute(): Promise<boolean> {
    console.warn('[SignalWire] Mute/unmute not supported in backend-controlled calling');
    return false;
  }

  /**
   * Mute microphone (not supported in backend-controlled calls)
   */
  async mute() {
    console.warn('[SignalWire] Mute not supported in backend-controlled calling');
  }

  /**
   * Unmute microphone (not supported in backend-controlled calls)
   */
  async unmute() {
    console.warn('[SignalWire] Unmute not supported in backend-controlled calling');
  }

  /**
   * Get current call ID
   */
  getCurrentCall() {
    return this.currentCallId ? { id: this.currentCallId } : null;
  }

  /**
   * Get call status
   */
  getCallStatus(): string {
    return this.currentCallId ? 'active' : 'idle';
  }

  /**
   * Clean up
   */
  async destroy() {
    try {
      await this.hangup();
      
      this.stopDurationTimer();
      
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      console.log('[SignalWire] Cleanup complete');
    } catch (error) {
      console.error('[SignalWire] Cleanup failed:', error);
    }
  }
}

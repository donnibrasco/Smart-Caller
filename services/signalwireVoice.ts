// SignalWire Voice Service - REST API Based
// For browser calling, we'll use the backend as a proxy to SignalWire

export class SignalWireVoiceService {
  private activeCallSid: string | null = null;
  private pollInterval: any = null;
  
  // Callbacks
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  async initialize(token: string) {
    // For REST-based calling, we don't need to initialize anything
    // The token is just for backend authentication
    console.log('[SignalWire] Service ready (REST mode)');
    return Promise.resolve();
  }

  async makeCall(phoneNumber: string, fromNumber: string, contactName?: string, userId?: string) {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://salescallagent.my/api';
      
      console.log('[SignalWire] Initiating call to:', phoneNumber);
      
      // Create call via backend
      const response = await fetch(`${apiUrl}/calls/initiate`, {
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate call');
      }

      const data = await response.json();
      this.activeCallSid = data.callSid;
      
      // Poll for call status
      this.startStatusPolling();
      
      // Simulate connection after 2 seconds (actual connection will be via polling)
      setTimeout(() => {
        if (this.onConnect) this.onConnect();
      }, 2000);

    } catch (error: any) {
      console.error('[SignalWire] Failed to make call:', error);
      if (this.onError) this.onError(error.message);
      throw error;
    }
  }

  private startStatusPolling() {
    // Poll call status every 2 seconds
    this.pollInterval = setInterval(async () => {
      if (!this.activeCallSid) {
        this.stopStatusPolling();
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://salescallagent.my/api';
        
        const response = await fetch(`${apiUrl}/calls/${this.activeCallSid}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'canceled') {
            this.stopStatusPolling();
            this.activeCallSid = null;
            if (this.onDisconnect) this.onDisconnect();
          }
        }
      } catch (error) {
        console.error('[SignalWire] Status polling error:', error);
      }
    }, 2000);
  }

  private stopStatusPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  hangup() {
    if (this.activeCallSid) {
      const token = localStorage.getItem('token');
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://salescallagent.my/api';
      
      fetch(`${apiUrl}/calls/${this.activeCallSid}/hangup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(error => {
        console.error('[SignalWire] Error hanging up:', error);
      });

      this.stopStatusPolling();
      this.activeCallSid = null;
      if (this.onDisconnect) this.onDisconnect();
    }
  }

  mute() {
    // Mute not supported in REST mode
    console.log('[SignalWire] Mute not supported in REST mode');
  }

  unmute() {
    // Unmute not supported in REST mode
    console.log('[SignalWire] Unmute not supported in REST mode');
  }

  async destroy() {
    this.stopStatusPolling();
    if (this.activeCallSid) {
      this.hangup();
    }
  }

  getCallStatus(): string {
    return this.activeCallSid ? 'active' : 'idle';
  }
}

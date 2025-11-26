const { Voice } = require('@signalwire/realtime-api');

/**
 * SignalWire Service
 * Native SignalWire implementation for voice calls
 */
class SignalWireService {
  constructor() {
    this.projectId = process.env.SIGNALWIRE_PROJECT_ID;
    this.authToken = process.env.SIGNALWIRE_API_TOKEN || process.env.SIGNALWIRE_AUTH_TOKEN;
    this.spaceUrl = process.env.SIGNALWIRE_SPACE_URL;
    this.phoneNumber = process.env.SIGNALWIRE_PHONE_NUMBER;
    this.apiKey = process.env.SIGNALWIRE_API_KEY;
    this.apiSecret = process.env.SIGNALWIRE_API_SECRET;
    this.appSid = process.env.SIGNALWIRE_APP_SID;
    
    if (!this.projectId || !this.authToken || !this.spaceUrl) {
      throw new Error('Missing required SignalWire credentials');
    }

    console.log('[SignalWire] Service initialized for space:', this.spaceUrl);
  }

  /**
   * Create a SignalWire client
   */
  async getClient() {
    try {
      const client = await Voice.Client({
        project: this.projectId,
        token: this.authToken,
        contexts: ['office']
      });

      return client;
    } catch (error) {
      console.error('[SignalWire] Failed to create client:', error);
      throw error;
    }
  }

  /**
   * Format phone number to E.164 format
   * Converts numbers like "825-712-6553" or "8257126553" to "+18257126553"
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If already has country code (11 digits), add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return '+' + digits;
    }
    
    // If 10 digits, add +1 prefix (US/Canada)
    if (digits.length === 10) {
      return '+1' + digits;
    }
    
    // If already starts with +, return as-is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // Return null for invalid formats
    console.log(`[SignalWire] Invalid phone number format: ${phoneNumber}`);
    return null;
  }

  /**
   * Make an outbound call using SignalWire REST API
   */
  async makeCall(to, from, options = {}) {
    try {
      // Format phone numbers to E.164
      const formattedTo = this.formatPhoneNumber(to);
      const formattedFrom = this.formatPhoneNumber(from || this.phoneNumber);
      
      if (!formattedTo) {
        throw new Error(`Invalid 'to' phone number: ${to}`);
      }
      if (!formattedFrom) {
        throw new Error(`Invalid 'from' phone number: ${from || this.phoneNumber}`);
      }
      
      console.log('[SignalWire] Making call to:', formattedTo, 'from:', formattedFrom);

      // Use SignalWire-compatible REST API format
      const url = `https://${this.spaceUrl}/api/laml/2010-04-01/Accounts/${this.projectId}/Calls`;
      
      const params = new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Url: options.url || `${process.env.BACKEND_URL}/api/webhooks/voice`,
        Method: 'POST',
        StatusCallback: options.statusCallback || `${process.env.BACKEND_URL}/api/webhooks/call-status`,
        StatusCallbackMethod: 'POST'
      });

      // Add StatusCallbackEvent as separate params (not comma-separated)
      ['initiated', 'ringing', 'answered', 'completed'].forEach(event => {
        params.append('StatusCallbackEvent', event);
      });

      if (options.record) {
        params.append('Record', 'true');
        params.append('RecordingStatusCallback', `${process.env.BACKEND_URL}/api/webhooks/recording-status`);
      }

      if (options.machineDetection) {
        params.append('MachineDetection', 'DetectMessageEnd');
        params.append('MachineDetectionTimeout', '30');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${this.projectId}:${this.authToken}`).toString('base64')
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SignalWire] Call failed:', errorText);
        throw new Error(`SignalWire API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[SignalWire] Call initiated:', data.sid);

      return {
        sid: data.sid,
        status: data.status,
        to: data.to,
        from: data.from
      };
    } catch (error) {
      console.error('[SignalWire] makeCall error:', error);
      throw error;
    }
  }

  /**
   * Generate TwiML response for voice webhook
   */
  generateTwiML(actions) {
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    actions.forEach(action => {
      switch (action.type) {
        case 'say':
          twiml += `<Say voice="${action.voice || 'alice'}">${action.text}</Say>`;
          break;
        case 'dial':
          twiml += `<Dial callerId="${action.callerId || this.phoneNumber}" timeout="${action.timeout || 30}">${action.number}</Dial>`;
          break;
        case 'hangup':
          twiml += '<Hangup/>';
          break;
        case 'redirect':
          twiml += `<Redirect>${action.url}</Redirect>`;
          break;
        case 'record':
          twiml += `<Record maxLength="${action.maxLength || 120}" action="${action.action}"/>`;
          break;
      }
    });

    twiml += '</Response>';
    return twiml;
  }

  /**
   * Handle voice webhook - generate TwiML
   */
  handleVoiceWebhook(params) {
    try {
      const { To, From, CallSid, Direction } = params;
      
      console.log('[SignalWire] Voice webhook:', {
        sid: CallSid,
        to: To,
        from: From,
        direction: Direction
      });

      // For outbound calls, dial the destination
      if (Direction === 'outbound-api') {
        return this.generateTwiML([
          { type: 'say', text: 'Connecting your call, please wait.' },
          { type: 'dial', number: To, timeout: 30 }
        ]);
      }

      // For inbound calls
      return this.generateTwiML([
        { type: 'say', text: 'Welcome. This call is being connected.' }
      ]);
    } catch (error) {
      console.error('[SignalWire] TwiML generation error:', error);
      return this.generateTwiML([
        { type: 'say', text: 'An error occurred. Please try again later.' },
        { type: 'hangup' }
      ]);
    }
  }

  /**
   * Update call status
   */
  async updateCall(callSid, updates) {
    try {
      const url = `https://${this.spaceUrl}/api/laml/2010-04-01/Accounts/${this.projectId}/Calls/${callSid}`;
      
      const params = new URLSearchParams();
      if (updates.status) params.append('Status', updates.status);
      if (updates.url) params.append('Url', updates.url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${this.projectId}:${this.authToken}`).toString('base64')
        },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error(`Failed to update call: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[SignalWire] updateCall error:', error);
      throw error;
    }
  }

  /**
   * Get call details
   */
  async getCall(callSid) {
    try {
      const url = `https://${this.spaceUrl}/api/laml/2010-04-01/Accounts/${this.projectId}/Calls/${callSid}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.projectId}:${this.authToken}`).toString('base64')
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get call: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[SignalWire] getCall error:', error);
      throw error;
    }
  }

  /**
   * List phone numbers
   */
  async listPhoneNumbers() {
    try {
      const url = `https://${this.spaceUrl}/api/laml/2010-04-01/Accounts/${this.projectId}/IncomingPhoneNumbers`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.projectId}:${this.authToken}`).toString('base64')
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list phone numbers: ${response.status}`);
      }

      const data = await response.json();
      return data.incoming_phone_numbers || [];
    } catch (error) {
      console.error('[SignalWire] listPhoneNumbers error:', error);
      throw error;
    }
  }

  /**
   * Generate browser token for SignalWire Relay SDK
   * Uses the Relay REST API JWT endpoint
   */
  async generateBrowserToken(userId) {
    try {
      // Use SignalWire Relay REST API to generate JWT token
      const url = `https://${this.spaceUrl}/api/relay/rest/jwt`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${this.projectId}:${this.authToken}`).toString('base64')
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SignalWire] JWT generation failed:', errorText);
        throw new Error(`SignalWire JWT API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[SignalWire] Generated Relay JWT token for user:', userId);
      
      // Return the JWT token
      return data.jwt_token;
    } catch (error) {
      console.error('[SignalWire] Token generation error:', error);
      throw error;
    }
  }

  /**
   * Handle browser dial request - returns TwiML for browser calling
   */
  handleBrowserDial(to, from, userIdentity) {
    const formattedTo = this.formatPhoneNumber(to);
    const formattedFrom = this.formatPhoneNumber(from || this.phoneNumber);
    
    console.log('[SignalWire] Browser dial:', formattedTo, 'from:', formattedFrom);
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting your call, please wait.</Say>
  <Dial callerId="${formattedFrom}">
    <Number>${formattedTo}</Number>
  </Dial>
</Response>`;
    
    return twiml;
  }

  /**
   * Handle status update webhook
   */
  async handleStatusUpdate(callSid, status, duration, to, from) {
    console.log('[SignalWire] Status update:', callSid, status, duration);
    // This is called by the webhook - just log for now
    return { success: true };
  }
}

module.exports = new SignalWireService();

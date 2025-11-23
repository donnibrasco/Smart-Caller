const { RestClient } = require('@signalwire/compatibility-api');
const { Call } = require('../models');

// SignalWire Controller
class SignalWireController {
  constructor() {
    const projectId = process.env.SIGNALWIRE_PROJECT_ID;
    const authToken = process.env.SIGNALWIRE_API_TOKEN;
    const signalwireSpace = process.env.SIGNALWIRE_SPACE_URL;
    
    if (!projectId || !authToken || !signalwireSpace) {
      throw new Error('SignalWire credentials not configured');
    }
    
    this.client = new RestClient(projectId, authToken, {
      signalwireSpaceUrl: signalwireSpace
    });
    this.provider = 'SignalWire';
  }

  // Get all phone numbers from SignalWire/Twilio account
  async listPhoneNumbers(req, res) {
    try {
      const incomingPhoneNumbers = await this.client.incomingPhoneNumbers.list({ limit: 50 });
      
      const numbers = incomingPhoneNumbers.map(number => ({
        id: number.sid,
        number: number.phoneNumber,
        label: number.friendlyName || number.phoneNumber,
        region: number.region || 'Unknown',
        capabilities: number.capabilities
      }));

      res.json({
        success: true,
        numbers,
        provider: this.provider
      });
    } catch (error) {
      console.error(`Error fetching ${this.provider} phone numbers:`, error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch phone numbers from ${this.provider}`,
        error: error.message
      });
    }
  }

  // Initiate an outbound call
  async initiateCall(req, res) {
    try {
      const { to, from, contactName } = req.body;
      const userId = req.user.id;

      if (!to || !from) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: to, from'
        });
      }

      console.log(`[SignalWire] Initiating call from ${from} to ${to}`);

      // Create call via SignalWire
      const call = await this.client.calls.create({
        from: from,
        to: to,
        url: `${process.env.BACKEND_URL}/api/calls/make`,
        statusCallback: `${process.env.BACKEND_URL}/api/webhooks/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true,
        recordingStatusCallback: `${process.env.BACKEND_URL}/api/webhooks/recording`
      });

      // Save to database
      const callRecord = await Call.create({
        userId,
        to,
        from,
        contactName: contactName || 'Unknown',
        twilioSid: call.sid,
        direction: 'outbound',
        status: 'initiated'
      });

      res.json({
        success: true,
        callSid: call.sid,
        status: call.status,
        call: callRecord
      });
    } catch (error) {
      console.error('[SignalWire] Error initiating call:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate call',
        error: error.message
      });
    }
  }

  // Get call status
  async getCallStatus(req, res) {
    try {
      const { callSid } = req.params;

      const call = await this.client.calls(callSid).fetch();

      res.json({
        success: true,
        status: call.status,
        duration: call.duration,
        direction: call.direction
      });
    } catch (error) {
      console.error('[SignalWire] Error fetching call status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch call status',
        error: error.message
      });
    }
  }

  // Hangup a call
  async hangupCall(req, res) {
    try {
      const { callSid } = req.params;

      await this.client.calls(callSid).update({ status: 'completed' });

      res.json({
        success: true,
        message: 'Call ended'
      });
    } catch (error) {
      console.error('[SignalWire] Error hanging up call:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to end call',
        error: error.message
      });
    }
  }
}

module.exports = new SignalWireController();

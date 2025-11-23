const { RestClient } = require('@signalwire/compatibility-api');
const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const { Call, User } = require('../models');

// SignalWire uses Twilio-compatible TwiML
class VoiceResponse {
  constructor() {
    this.commands = [];
  }

  say(message, options = {}) {
    this.commands.push({ verb: 'Say', message, ...options });
    return this;
  }

  dial(options = {}) {
    const dialCommand = { verb: 'Dial', ...options, nested: [] };
    this.commands.push(dialCommand);
    return {
      number: (phoneNumber) => {
        dialCommand.nested.push({ verb: 'Number', phoneNumber });
      },
      client: (clientName) => {
        dialCommand.nested.push({ verb: 'Client', clientName });
      }
    };
  }

  toString() {
    return this.toTwiML();
  }

  toTwiML() {
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    
    this.commands.forEach(cmd => {
      if (cmd.verb === 'Say') {
        twiml += `<Say>${cmd.message}</Say>`;
      } else if (cmd.verb === 'Dial') {
        const attrs = [];
        if (cmd.callerId) attrs.push(`callerId="${cmd.callerId}"`);
        if (cmd.record) attrs.push(`record="${cmd.record}"`);
        if (cmd.recordingStatusCallback) attrs.push(`recordingStatusCallback="${cmd.recordingStatusCallback}"`);
        if (cmd.action) attrs.push(`action="${cmd.action}"`);
        if (cmd.statusCallback) attrs.push(`statusCallback="${cmd.statusCallback}"`);
        if (cmd.statusCallbackEvent) attrs.push(`statusCallbackEvent="${cmd.statusCallbackEvent.join(' ')}"`);
        
        twiml += `<Dial ${attrs.join(' ')}>`;
        cmd.nested.forEach(nested => {
          if (nested.verb === 'Number') {
            twiml += `<Number>${nested.phoneNumber}</Number>`;
          } else if (nested.verb === 'Client') {
            twiml += `<Client>${nested.clientName}</Client>`;
          }
        });
        twiml += '</Dial>';
      }
    });
    
    twiml += '</Response>';
    return twiml;
  }
}

class SignalWireService {
  constructor() {
    // SignalWire client using compatibility API
    const projectId = process.env.SIGNALWIRE_PROJECT_ID;
    const authToken = process.env.SIGNALWIRE_API_TOKEN;
    const signalwireSpace = process.env.SIGNALWIRE_SPACE_URL;
    
    if (!projectId || !authToken || !signalwireSpace) {
      throw new Error('SignalWire credentials not configured. Please set SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, and SIGNALWIRE_SPACE_URL');
    }
    
    // Use SignalWire's compatibility API client
    this.client = new RestClient(projectId, authToken, { 
      signalwireSpaceUrl: signalwireSpace 
    });
    
    this.projectId = projectId;
    this.authToken = authToken;
    this.spaceUrl = signalwireSpace;
    
    console.log('[SignalWire] Initialized with space:', signalwireSpace);
  }

  // Generate Token for Frontend Browser SDK
  // Using Twilio's JWT format which SignalWire's Voice SDK accepts
  generateClientToken(identity) {
    try {
      // Create access token
      const accessToken = new AccessToken(
        this.projectId,  // SignalWire Project ID (acts as Account SID)
        this.projectId,  // SignalWire Project ID (acts as API Key SID)
        this.authToken   // SignalWire Auth Token (acts as API Key Secret)
      );

      // Set the identity
      accessToken.identity = identity;

      // Create a Voice grant
      const voiceGrant = new VoiceGrant({
        incomingAllow: true,
        // outgoingApplicationSid is optional - if not provided, calls go through default webhook
        ...(process.env.SIGNALWIRE_APP_SID && process.env.SIGNALWIRE_APP_SID !== 'YOUR_APP_SID' 
          ? { outgoingApplicationSid: process.env.SIGNALWIRE_APP_SID }
          : { 
              pushCredentialSid: undefined,
              outgoingApplicationSid: undefined
            }
        )
      });

      // Add the grant to the token
      accessToken.addGrant(voiceGrant);
      
      const token = accessToken.toJwt();
      console.log('[SignalWire] Generated client token for:', identity);
      
      return token;
    } catch (error) {
      console.error('[SignalWire] Token generation error:', error);
      throw new Error(`Failed to generate SignalWire token: ${error.message}`);
    }
  }

  // Handle Voice Request (When browser calls backend)
  handleVoiceRequest(to, from, userId) {
    const response = new VoiceResponse();

    if (!to) {
      response.say('Invalid phone number.');
      return response.toString();
    }

    const dial = response.dial({
      callerId: process.env.SIGNALWIRE_PHONE_NUMBER,
      record: 'record-from-answer',
      recordingStatusCallback: `${process.env.BACKEND_URL}/api/webhooks/recording`,
      action: `${process.env.BACKEND_URL}/api/webhooks/call-status`,
      statusCallback: `${process.env.BACKEND_URL}/api/webhooks/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    // Allow dialing real numbers
    if (/^[\d\+\-\(\) ]+$/.test(to)) {
      dial.number(to);
    } else {
      dial.client(to);
    }

    return response.toString();
  }

  // Webhook: Status Update
  async handleStatusUpdate(callSid, status, duration, to, from) {
    try {
      let call = await Call.findOne({ where: { twilioSid: callSid } });
      
      if (!call) {
        // Create call record if it doesn't exist
        call = await Call.create({
          twilioSid: callSid,
          to: to,
          from: from,
          status: status,
          duration: duration || 0
        });
      } else {
        call.status = status;
        if (duration) call.duration = duration;
        await call.save();
      }
      
      return call;
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }
}

module.exports = new SignalWireService();
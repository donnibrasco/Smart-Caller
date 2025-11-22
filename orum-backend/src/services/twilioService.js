const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const VoiceResponse = twilio.twiml.VoiceResponse;
const { Call, User } = require('../models');

class TwilioService {
  constructor() {
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  // Generate Token for Frontend Browser SDK
  generateClientToken(identity) {
    const accessToken = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: identity }
    );

    const grant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_APP_SID,
      incomingAllow: true,
    });

    accessToken.addGrant(grant);
    return accessToken.toJwt();
  }

  // Handle Voice Request (When browser calls backend)
  handleVoiceRequest(to, from, userId) {
    const response = new VoiceResponse();

    if (!to) {
      response.say('Invalid phone number.');
      return response.toString();
    }

    const dial = response.dial({
      callerId: process.env.TWILIO_CALLER_ID, // YOUR business number
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
  async handleStatusUpdate(callSid, status, duration) {
    try {
      const call = await Call.findOne({ where: { twilioSid: callSid } });
      if (call) {
        call.status = status;
        if (duration) call.duration = duration;
        await call.save();
        return call;
      }
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }
}

module.exports = new TwilioService();
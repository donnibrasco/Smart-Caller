const twilioService = require('../services/twilioService');
const { Call } = require('../models');

exports.getToken = (req, res) => {
  const identity = req.user.email; // Use email as client identity
  const token = twilioService.generateClientToken(identity);
  res.json({ token, identity });
};

exports.makeCall = async (req, res) => {
  // This endpoint is hit by Twilio when the Browser SDK starts a call
  const { To, From } = req.body;
  
  // We need to track this call in DB. Since this is a TwiML request, 
  // we can't easily get the User ID unless we pass it in CustomParameters from frontend
  // For now, we return TwiML
  
  const xml = twilioService.handleVoiceRequest(To, From);
  res.type('text/xml');
  res.send(xml);
};

exports.webhookStatus = async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  const io = req.app.get('io'); // Access Socket.io

  await twilioService.handleStatusUpdate(CallSid, CallStatus, CallDuration);

  // Emit real-time event to frontend
  io.emit('call_status', { sid: CallSid, status: CallStatus });

  res.sendStatus(200);
};
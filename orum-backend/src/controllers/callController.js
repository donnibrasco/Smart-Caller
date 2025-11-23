const signalwireService = require('../services/signalwireService');
const { Call } = require('../models');

exports.getToken = (req, res) => {
  const identity = req.user.email; // Use email as client identity
  const token = signalwireService.generateClientToken(identity);
  res.json({ token, identity });
};

exports.createCall = async (req, res) => {
  try {
    const { to, from, contactName } = req.body;
    const userId = req.user.id;

    const call = await Call.create({
      userId,
      to,
      from,
      contactName,
      direction: 'outbound',
      status: 'initiated'
    });

    res.json({ success: true, call });
  } catch (error) {
    console.error('Error creating call record:', error);
    res.status(500).json({ error: 'Failed to create call record' });
  }
};

exports.getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const calls = await Call.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Call.count({ where: { userId } });

    res.json({ calls, total });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
};

exports.makeCall = async (req, res) => {
  // This endpoint is hit by SignalWire when the Browser SDK starts a call
  const { To, From, CallSid } = req.body;
  
  const xml = signalwireService.handleVoiceRequest(To, From);
  res.type('text/xml');
  res.send(xml);
};

exports.webhookStatus = async (req, res) => {
  const { CallSid, CallStatus, CallDuration, To, From } = req.body;
  const io = req.app.get('io'); // Access Socket.io

  await signalwireService.handleStatusUpdate(CallSid, CallStatus, CallDuration, To, From);

  // Emit real-time event to frontend
  io.emit('call_status', { sid: CallSid, status: CallStatus });

  res.sendStatus(200);
};
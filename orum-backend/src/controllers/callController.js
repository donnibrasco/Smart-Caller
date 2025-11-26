const signalwireService = require('../services/signalwireService');
const { Call } = require('../models');

// Retrieve recent call history for the authenticated user
exports.getCallHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const userId = req.user?.id;

    const calls = await Call.findAll({
      where: userId ? { userId } : {},
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      attributes: [
        'id',
        'callSid',
        'toNumber',
        'fromNumber',
        'contactName',
        'status',
        'direction',
        'createdAt',
        'updatedAt'
      ]
    });

    res.json({
      success: true,
      calls
    });
  } catch (error) {
    console.error('[Get Call History] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve call history'
    });
  }
};

// Initiate a call (REST API - called from frontend)
exports.initiateCall = async (req, res) => {
  try {
    const { to, from, contactName, userId } = req.body;
    
    console.log('[Initiate Call] To:', to, 'From:', from, 'Name:', contactName);
    
    if (!to || !from) {
      return res.status(400).json({ error: 'Missing required parameters: to and from' });
    }
    
    // Make the call using SignalWire
    const result = await signalwireService.makeCall(to, from, {
      statusCallback: `${process.env.API_BASE_URL || 'https://salescallagent.my/api'}/webhook/status`
    });
    
    console.log('[Initiate Call] Result:', result);
    
    // Save call to database
    try {
      await Call.create({
        callSid: result.sid,
        toNumber: to,
        fromNumber: from,
        contactName: contactName || 'Unknown',
        userId: userId || req.user?.id,
        status: result.status,
        direction: 'outbound'
      });
    } catch (dbError) {
      console.error('[Initiate Call] Database error:', dbError);
      // Don't fail the call if DB save fails
    }
    
    res.json({ 
      callSid: result.sid,
      status: result.status,
      message: 'Call initiated successfully'
    });
  } catch (error) {
    console.error('[Initiate Call] Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to initiate call'
    });
  }
};

// Generate browser token for SignalWire browser calling (Twilio-compatible)
exports.getBrowserToken = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.email || 'anonymous';
    const userEmail = req.user?.email || `user${userId}@salescallagent.local`;
    const displayName = req.user?.full_name || req.user?.email || `User ${userId}`;
    
    console.log('[Browser Token] Generating token for:', displayName);
    
    // For browser calling with SignalWire, we use Socket.io connection
    // The frontend will connect via WebSocket and send dial commands
    // Backend will use SignalWire Realtime API to make the actual calls
    
    // Return a simple session token for Socket.io authentication
    const jwt = require('jsonwebtoken');
    const sessionToken = jwt.sign(
      {
        userId: userId,
        email: userEmail,
        displayName: displayName,
        type: 'voice_session'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('[Browser Token] ✅ Generated session token for Socket.io');
    
    res.json({ 
      token: sessionToken,
      display_name: displayName,
      socket_url: '/socket.io' // Frontend will connect to this
    });
  } catch (error) {
    console.error('[Browser Token] Error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to generate browser token' 
    });
  }
};

exports.makeCall = async (req, res) => {
  try {
    // This endpoint is hit by SignalWire/Twilio when making an outbound call from browser
    const To = req.body.To || req.query.To;
    const From = req.body.From || req.query.From;
    const CallSid = req.body.CallSid || req.query.CallSid;
    
    console.log('[TwiML] Voice request - To:', To, 'From:', From, 'CallSid:', CallSid);
    
    if (!To) {
      console.error('[TwiML] Error: No "To" parameter provided');
      return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Invalid phone number.</Say>
</Response>`);
    }
    
    // Generate TwiML to dial the number
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${From || process.env.SIGNALWIRE_PHONE_NUMBER}">
    <Number>${To}</Number>
  </Dial>
</Response>`;
    
    console.log('[TwiML] Generated response for call to:', To);
    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('[TwiML] Error:', error);
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred. Please try again.</Say>
</Response>`);
  }
};

// Handle browser-initiated calls (Device SDK)
exports.browserDial = async (req, res) => {
  try {
    const To = req.body.To || req.query.To;
    const From = req.body.From || req.query.From;
    const userIdentity = req.body.userIdentity || req.query.userIdentity;
    
    console.log('[Browser Dial] To:', To, 'From:', From, 'Identity:', userIdentity);
    
    if (!To) {
      const errorResponse = new signalwireService.VoiceResponse();
      errorResponse.say('Please provide a phone number to dial.');
      res.type('text/xml');
      return res.send(errorResponse.toString());
    }
    
    const xml = signalwireService.handleBrowserDial(To, From, userIdentity);
    console.log('[Browser Dial] TwiML:', xml);
    res.type('text/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Browser Dial] Error:', error);
    const errorResponse = new signalwireService.VoiceResponse();
    errorResponse.say('An error occurred. Please try again.');
    res.type('text/xml');
    res.send(errorResponse.toString());
  }
};

exports.webhookStatus = async (req, res) => {
  const { CallSid, CallStatus, CallDuration, To, From } = req.body;
  const io = req.app.get('io'); // Access Socket.io

  await signalwireService.handleStatusUpdate(CallSid, CallStatus, CallDuration, To, From);

  // Emit real-time event to frontend
  io.emit('call_status', { sid: CallSid, status: CallStatus });

  res.sendStatus(200);
};
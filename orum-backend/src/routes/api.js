const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validateSignalWireSignature, webhookRateLimit } = require('../middleware/webhookValidation');
const callController = require('../controllers/callController');
const authController = require('../controllers/authController');
const signalwireController = require('../controllers/signalwireController');
const recordingController = require('../controllers/recordingController');
const voicemailController = require('../controllers/voicemailController');
const powerDialerController = require('../controllers/powerDialerController');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Caller API is running' });
});

// Auth
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);

// Calls
router.get('/calls/token', authMiddleware, callController.getToken);
router.post('/calls', authMiddleware, callController.createCall);
router.get('/calls/history', authMiddleware, callController.getCallHistory);
router.post('/calls/initiate', authMiddleware, signalwireController.initiateCall.bind(signalwireController));
router.get('/calls/:callSid/status', authMiddleware, signalwireController.getCallStatus.bind(signalwireController));
router.post('/calls/:callSid/hangup', authMiddleware, signalwireController.hangupCall.bind(signalwireController));

// SignalWire
router.get('/twilio/phone-numbers', authMiddleware, signalwireController.listPhoneNumbers.bind(signalwireController));

// SignalWire Webhooks (Protected by signature validation and rate limiting)
router.post('/webhooks/voice', webhookRateLimit, validateSignalWireSignature, callController.makeCall);
router.post('/webhooks/call-status', webhookRateLimit, validateSignalWireSignature, callController.webhookStatus);
router.post('/webhooks/recording-status', webhookRateLimit, validateSignalWireSignature, recordingController.recordingStatusWebhook);
router.post('/webhooks/amd-status', webhookRateLimit, validateSignalWireSignature, voicemailController.amdStatusWebhook);

// Recording endpoints
router.post('/recordings/start', authMiddleware, recordingController.startRecording);
router.post('/recordings/stop', authMiddleware, recordingController.stopRecording);
router.get('/recordings/:recordingSid', authMiddleware, recordingController.getRecording);
router.get('/calls/:callId/recording', authMiddleware, recordingController.getCallRecording);
router.delete('/recordings/:recordingSid', authMiddleware, recordingController.deleteRecording);

// Voicemail detection endpoints
router.post('/voicemail/analyze', authMiddleware, voicemailController.analyzeAudio);
router.post('/voicemail/mark', authMiddleware, voicemailController.markAsVoicemail);
router.get('/voicemail/config', authMiddleware, voicemailController.getConfig);

// Power Dialer endpoints
router.post('/power-dialer/start', authMiddleware, powerDialerController.startSession);
router.post('/power-dialer/pause', authMiddleware, powerDialerController.pauseSession);
router.post('/power-dialer/resume', authMiddleware, powerDialerController.resumeSession);
router.post('/power-dialer/skip', authMiddleware, powerDialerController.skipCurrent);
router.post('/power-dialer/stop', authMiddleware, powerDialerController.stopSession);
router.get('/power-dialer/status', authMiddleware, powerDialerController.getStatus);
router.post('/power-dialer/queue', authMiddleware, powerDialerController.addToQueue);
router.get('/power-dialer/queue', authMiddleware, powerDialerController.getQueue);
router.delete('/power-dialer/queue', authMiddleware, powerDialerController.clearQueue);

module.exports = router;
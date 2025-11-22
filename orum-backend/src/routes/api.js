const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const callController = require('../controllers/callController');
const authController = require('../controllers/authController');
const twilioController = require('../controllers/twilioController');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Caller API is running' });
});

// Auth
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);

// Calls
router.get('/calls/token', authMiddleware, callController.getToken);

// Twilio
router.get('/twilio/phone-numbers', authMiddleware, twilioController.listPhoneNumbers.bind(twilioController));

// Twilio Webhooks (No Auth Middleware, secured by Twilio Signature validation in prod)
router.post('/webhooks/voice', callController.makeCall);
router.post('/webhooks/call-status', callController.webhookStatus);

module.exports = router;
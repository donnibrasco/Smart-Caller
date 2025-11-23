const crypto = require('crypto');

/**
 * Validate SignalWire webhook signatures
 * This ensures webhooks are actually from SignalWire and not malicious actors
 */
const validateSignalWireSignature = (req, res, next) => {
  // In production, validate SignalWire signatures
  if (process.env.NODE_ENV === 'production' && process.env.SIGNALWIRE_AUTH_TOKEN) {
    const signature = req.headers['x-signalwire-signature'] || req.headers['x-twilio-signature'];
    
    if (!signature) {
      console.warn('[WebhookValidation] Missing signature header');
      return res.status(403).json({ error: 'Missing signature' });
    }

    const url = `${process.env.BACKEND_URL}${req.originalUrl}`;
    const authToken = process.env.SIGNALWIRE_API_TOKEN;
    
    // Create signature
    const params = Object.keys(req.body)
      .sort()
      .map(key => `${key}${req.body[key]}`)
      .join('');
    
    const data = url + params;
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('[WebhookValidation] Invalid signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }
  }

  next();
};

/**
 * Rate limiting for webhooks
 */
const webhookRateLimit = (() => {
  const requests = new Map();
  const WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS = 100; // per minute per endpoint

  return (req, res, next) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const timestamps = requests.get(key);
    
    // Remove old timestamps
    const recent = timestamps.filter(ts => now - ts < WINDOW_MS);
    
    if (recent.length >= MAX_REQUESTS) {
      console.warn(`[WebhookRateLimit] Rate limit exceeded for ${key}`);
      return res.status(429).json({ error: 'Too many requests' });
    }

    recent.push(now);
    requests.set(key, recent);
    
    next();
  };
})();

module.exports = {
  validateSignalWireSignature,
  webhookRateLimit
};

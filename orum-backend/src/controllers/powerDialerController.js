const powerDialerService = require('../services/powerDialerService');

/**
 * Start power dialer session
 */
exports.startSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId, callerId } = req.body;

    const session = await powerDialerService.startSession(userId, {
      campaignId,
      callerId
    });

    res.json({
      success: true,
      session: {
        userId: session.userId,
        status: session.status,
        startTime: session.startTime,
        campaignId: session.campaignId,
        stats: session.stats
      }
    });
  } catch (error) {
    console.error('Error starting power dialer:', error);
    res.status(500).json({ error: error.message || 'Failed to start power dialer' });
  }
};

/**
 * Pause power dialer session
 */
exports.pauseSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const session = await powerDialerService.pauseSession(userId);

    res.json({
      success: true,
      session: {
        status: session.status,
        isPaused: session.isPaused,
        stats: session.stats
      }
    });
  } catch (error) {
    console.error('Error pausing power dialer:', error);
    res.status(500).json({ error: error.message || 'Failed to pause power dialer' });
  }
};

/**
 * Resume power dialer session
 */
exports.resumeSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const session = await powerDialerService.resumeSession(userId);

    res.json({
      success: true,
      session: {
        status: session.status,
        isPaused: session.isPaused,
        stats: session.stats
      }
    });
  } catch (error) {
    console.error('Error resuming power dialer:', error);
    res.status(500).json({ error: error.message || 'Failed to resume power dialer' });
  }
};

/**
 * Skip current call
 */
exports.skipCurrent = async (req, res) => {
  try {
    const userId = req.user.id;

    const session = await powerDialerService.skipCurrent(userId);

    res.json({
      success: true,
      session: {
        currentCall: session.currentCall,
        stats: session.stats
      }
    });
  } catch (error) {
    console.error('Error skipping call:', error);
    res.status(500).json({ error: error.message || 'Failed to skip call' });
  }
};

/**
 * Stop power dialer session
 */
exports.stopSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const session = await powerDialerService.stopSession(userId);

    res.json({
      success: true,
      session: {
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        stats: session.stats
      }
    });
  } catch (error) {
    console.error('Error stopping power dialer:', error);
    res.status(500).json({ error: error.message || 'Failed to stop power dialer' });
  }
};

/**
 * Get session status
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const session = powerDialerService.getSessionStatus(userId);

    if (!session) {
      return res.json({
        success: true,
        session: null,
        active: false
      });
    }

    res.json({
      success: true,
      active: true,
      session: {
        status: session.status,
        isPaused: session.isPaused,
        startTime: session.startTime,
        callsMade: session.callsMade,
        callsConnected: session.callsConnected,
        voicemailsDetected: session.voicemailsDetected,
        currentCall: session.currentCall,
        stats: session.stats
      }
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
};

/**
 * Add numbers to queue
 */
exports.addToQueue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phoneNumbers, campaignId, priority } = req.body;

    // Validation
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'phoneNumbers array is required and must not be empty',
        field: 'phoneNumbers'
      });
    }

    // Limit batch size
    if (phoneNumbers.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 1000 phone numbers allowed per batch',
        field: 'phoneNumbers'
      });
    }

    // Validate each phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    const invalidNumbers = phoneNumbers.filter(item => {
      const phone = typeof item === 'string' ? item : item.phoneNumber;
      return !phone || !phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    });

    if (invalidNumbers.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid phone number format. Use E.164 format (e.g., +15878421728)`,
        invalidNumbers: invalidNumbers.slice(0, 5),
        count: invalidNumbers.length
      });
    }

    const items = await powerDialerService.addToQueue(userId, phoneNumbers, {
      campaignId,
      priority: priority ? parseInt(priority) : 0
    });

    res.json({
      success: true,
      added: items.length,
      campaignId: campaignId,
      items: items.map(item => ({
        id: item.id,
        phoneNumber: item.phoneNumber,
        contactName: item.contactName,
        status: item.status,
        priority: item.priority
      }))
    });
  } catch (error) {
    console.error('[PowerDialerController] Error adding to queue:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to add to queue' 
    });
  }
};

/**
 * Get queue
 */
exports.getQueue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, campaignId, limit, offset } = req.query;

    // Validate pagination
    const parsedLimit = parseInt(limit) || 100;
    const parsedOffset = parseInt(offset) || 0;

    if (parsedLimit > 500) {
      return res.status(400).json({
        success: false,
        error: 'Maximum limit is 500',
        field: 'limit'
      });
    }

    if (parsedOffset < 0) {
      return res.status(400).json({
        success: false,
        error: 'Offset must be non-negative',
        field: 'offset'
      });
    }

    const result = await powerDialerService.getQueue(userId, {
      status,
      campaignId,
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json({
      success: true,
      total: result.total,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: result.total > (parsedOffset + parsedLimit),
      queue: result.queue.map(item => ({
        id: item.id,
        phoneNumber: item.phoneNumber,
        contactName: item.contactName,
        status: item.status,
        outcome: item.outcome,
        attemptCount: item.attemptCount,
        lastAttemptAt: item.lastAttemptAt,
        priority: item.priority,
        metadata: item.metadata
      }))
    });
  } catch (error) {
    console.error('[PowerDialerController] Error getting queue:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to get queue' 
    });
  }
};

/**
 * Clear queue
 */
exports.clearQueue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId } = req.query;

    const deleted = await powerDialerService.clearQueue(userId, campaignId);

    res.json({
      success: true,
      deleted
    });
  } catch (error) {
    console.error('Error clearing queue:', error);
    res.status(500).json({ error: 'Failed to clear queue' });
  }
};

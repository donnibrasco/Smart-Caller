const { PowerDialerQueue, Call, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Power Dialer Service
 * Manages auto-dialing queue, rate limiting, and campaign execution
 */
class PowerDialerService {
  constructor() {
    this.activeSessions = new Map(); // userId -> session data
    this.signalwireService = require('./signalwireService');
    this.voicemailService = require('./voicemailDetectionService');
    
    // Configuration
    this.config = {
      maxCallsPerMinute: parseInt(process.env.POWER_DIALER_MAX_CALLS_PER_MIN) || 10,
      maxCallsPerHour: parseInt(process.env.POWER_DIALER_MAX_CALLS_PER_HOUR) || 200,
      callTimeout: parseInt(process.env.POWER_DIALER_CALL_TIMEOUT) || 30000, // 30s
      retryAttempts: parseInt(process.env.POWER_DIALER_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.POWER_DIALER_RETRY_DELAY) || 3600000, // 1 hour
      dialingInterval: parseInt(process.env.POWER_DIALER_INTERVAL) || 2000 // 2s between calls
    };
  }

  /**
   * Start power dialer session for a user
   */
  async startSession(userId, options = {}) {
    try {
      // Check if already active
      if (this.activeSessions.has(userId)) {
        throw new Error('Power dialer session already active');
      }

      const session = {
        userId,
        status: 'active',
        startTime: new Date(),
        callsMade: 0,
        callsConnected: 0,
        voicemailsDetected: 0,
        currentCall: null,
        isPaused: false,
        campaignId: options.campaignId || `campaign_${Date.now()}`,
        callerId: options.callerId,
        intervalId: null,
        stats: {
          totalCalls: 0,
          connected: 0,
          voicemail: 0,
          noAnswer: 0,
          failed: 0,
          busy: 0
        }
      };

      this.activeSessions.set(userId, session);
      
      // Start auto-dialing
      await this.startDialing(userId);

      console.log(`Power dialer started for user ${userId}`);
      return session;
    } catch (error) {
      console.error('Error starting power dialer session:', error);
      throw error;
    }
  }

  /**
   * Start auto-dialing loop
   */
  async startDialing(userId) {
    const session = this.activeSessions.get(userId);
    if (!session) return;

    const dialNext = async () => {
      try {
        // Check if paused or stopped
        if (!session || session.isPaused || session.status === 'stopped') {
          return;
        }

        // Check rate limits
        if (!this.checkRateLimit(userId)) {
          console.log('Rate limit reached, pausing...');
          session.isPaused = true;
          setTimeout(() => {
            session.isPaused = false;
            this.startDialing(userId);
          }, 60000); // Resume after 1 minute
          return;
        }

        // Get next number from queue
        const nextItem = await this.getNextQueueItem(userId);
        
        if (!nextItem) {
          console.log('No more numbers in queue, stopping session');
          await this.stopSession(userId);
          return;
        }

        // Place call
        await this.placeCall(userId, nextItem);

        // Schedule next call
        session.intervalId = setTimeout(dialNext, this.config.dialingInterval);
      } catch (error) {
        console.error('Error in dialing loop:', error);
        session.intervalId = setTimeout(dialNext, this.config.dialingInterval);
      }
    };

    // Start the loop
    dialNext();
  }

  /**
   * Get next item from queue
   */
  async getNextQueueItem(userId) {
    try {
      const item = await PowerDialerQueue.findOne({
        where: {
          userId,
          status: 'pending',
          [Op.or]: [
            { nextRetryAt: null },
            { nextRetryAt: { [Op.lte]: new Date() } }
          ]
        },
        order: [
          ['priority', 'DESC'],
          ['createdAt', 'ASC']
        ]
      });

      return item;
    } catch (error) {
      console.error('Error getting next queue item:', error);
      return null;
    }
  }

  /**
   * Place a call from power dialer
   */
  async placeCall(userId, queueItem) {
    const session = this.activeSessions.get(userId);
    if (!session) return;

    try {
      // Update queue item status
      await queueItem.update({
        status: 'calling',
        attemptCount: queueItem.attemptCount + 1,
        lastAttemptAt: new Date()
      });

      // Get user for caller identity
      const user = await User.findByPk(userId);
      const identity = user.email;

      // Create call with AMD enabled
      const amdParams = this.voicemailService.getAMDParameters();
      
      const call = await this.signalwireService.client.calls.create({
        to: queueItem.phoneNumber,
        from: session.callerId || process.env.SIGNALWIRE_PHONE_NUMBER,
        url: `${process.env.BACKEND_URL}/api/webhooks/voice`,
        statusCallback: `${process.env.BACKEND_URL}/api/webhooks/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: 'record-from-answer', // Auto-record
        recordingStatusCallback: `${process.env.BACKEND_URL}/api/webhooks/recording-status`,
        timeout: this.config.callTimeout / 1000,
        ...amdParams
      });

      // Create call record in database
      const callRecord = await Call.create({
        userId,
        twilioSid: call.sid,
        to: queueItem.phoneNumber,
        from: session.callerId || process.env.SIGNALWIRE_PHONE_NUMBER,
        contactName: queueItem.contactName,
        direction: 'outbound',
        status: 'initiated',
        powerDialerQueueId: queueItem.id
      });

      // Update session
      session.currentCall = {
        queueItemId: queueItem.id,
        callId: callRecord.id,
        callSid: call.sid,
        startTime: new Date()
      };
      session.callsMade++;
      session.stats.totalCalls++;

      console.log(`Power dialer call placed: ${queueItem.phoneNumber}`);
      
      return callRecord;
    } catch (error) {
      console.error('Error placing power dialer call:', error);
      
      // Mark as failed
      await queueItem.update({
        status: 'failed',
        outcome: 'failed'
      });
      
      session.stats.failed++;
      
      throw error;
    }
  }

  /**
   * Handle call completion (called from webhook)
   */
  async handleCallCompletion(callSid, status, outcome) {
    try {
      // Find call
      const call = await Call.findOne({ 
        where: { twilioSid: callSid },
        include: ['queueItem']
      });

      if (!call || !call.powerDialerQueueId) {
        return; // Not a power dialer call
      }

      // Find session
      const session = this.activeSessions.get(call.userId);
      
      // Update queue item
      const queueItem = await PowerDialerQueue.findByPk(call.powerDialerQueueId);
      if (queueItem) {
        const shouldRetry = this.shouldRetry(queueItem, outcome);
        
        await queueItem.update({
          status: shouldRetry ? 'pending' : 'completed',
          outcome,
          nextRetryAt: shouldRetry ? 
            new Date(Date.now() + this.config.retryDelay) : null
        });
      }

      // Update session stats
      if (session) {
        session.stats[outcome] = (session.stats[outcome] || 0) + 1;
        
        if (outcome === 'connected') session.callsConnected++;
        if (outcome === 'voicemail') session.voicemailsDetected++;
        
        session.currentCall = null;
      }

      console.log(`Power dialer call completed: ${outcome}`);
    } catch (error) {
      console.error('Error handling call completion:', error);
    }
  }

  /**
   * Check if should retry based on outcome
   */
  shouldRetry(queueItem, outcome) {
    if (queueItem.attemptCount >= this.config.retryAttempts) {
      return false;
    }

    // Retry for no-answer and busy
    return ['no-answer', 'busy'].includes(outcome);
  }

  /**
   * Check rate limit
   */
  checkRateLimit(userId) {
    const session = this.activeSessions.get(userId);
    if (!session) return false;

    const now = Date.now();
    const sessionDuration = now - session.startTime.getTime();
    const minutes = sessionDuration / 60000;
    const hours = sessionDuration / 3600000;

    const callsPerMinute = session.callsMade / (minutes || 1);
    const callsPerHour = session.callsMade / (hours || 1);

    return callsPerMinute < this.config.maxCallsPerMinute && 
           callsPerHour < this.config.maxCallsPerHour;
  }

  /**
   * Pause dialing
   */
  async pauseSession(userId) {
    const session = this.activeSessions.get(userId);
    if (!session) {
      throw new Error('No active session found');
    }

    session.isPaused = true;
    
    if (session.intervalId) {
      clearTimeout(session.intervalId);
      session.intervalId = null;
    }

    console.log(`Power dialer paused for user ${userId}`);
    return session;
  }

  /**
   * Resume dialing
   */
  async resumeSession(userId) {
    const session = this.activeSessions.get(userId);
    if (!session) {
      throw new Error('No active session found');
    }

    session.isPaused = false;
    await this.startDialing(userId);

    console.log(`Power dialer resumed for user ${userId}`);
    return session;
  }

  /**
   * Skip current call and dial next
   */
  async skipCurrent(userId) {
    const session = this.activeSessions.get(userId);
    if (!session || !session.currentCall) {
      throw new Error('No current call to skip');
    }

    // Hangup current call
    if (session.currentCall.callSid) {
      await this.signalwireService.client.calls(session.currentCall.callSid)
        .update({ status: 'completed' });
    }

    // Mark queue item as skipped
    if (session.currentCall.queueItemId) {
      await PowerDialerQueue.findByPk(session.currentCall.queueItemId)
        .then(item => item?.update({ status: 'skipped', outcome: 'skipped' }));
    }

    session.currentCall = null;
    
    console.log(`Call skipped for user ${userId}`);
    return session;
  }

  /**
   * Stop power dialer session
   */
  async stopSession(userId) {
    const session = this.activeSessions.get(userId);
    if (!session) {
      throw new Error('No active session found');
    }

    // Clear interval
    if (session.intervalId) {
      clearTimeout(session.intervalId);
    }

    // Hangup current call if any
    if (session.currentCall?.callSid) {
      try {
        await this.signalwireService.client.calls(session.currentCall.callSid)
          .update({ status: 'completed' });
      } catch (error) {
        console.error('Error hanging up current call:', error);
      }
    }

    session.status = 'stopped';
    session.endTime = new Date();

    // Remove from active sessions
    this.activeSessions.delete(userId);

    console.log(`Power dialer stopped for user ${userId}`);
    return session;
  }

  /**
   * Get session status
   */
  getSessionStatus(userId) {
    return this.activeSessions.get(userId) || null;
  }

  /**
   * Cleanup stuck queue items (reset calling -> pending when no active session)
   */
  async cleanupStuckItems(userId) {
    try {
      // Only cleanup if there's no active session
      if (this.activeSessions.has(userId)) {
        return 0;
      }

      // Reset any items stuck in "calling" status back to pending
      const [updated] = await PowerDialerQueue.update(
        { 
          status: 'pending',
          outcome: 'pending'
        },
        {
          where: {
            userId,
            status: 'calling'
          }
        }
      );

      if (updated > 0) {
        console.log(`Reset ${updated} stuck calling items for user ${userId}`);
      }

      return updated;
    } catch (error) {
      console.error('Error cleaning up stuck items:', error);
      return 0;
    }
  }

  /**
   * Add numbers to queue
   */
  async addToQueue(userId, phoneNumbers, options = {}) {
    try {
      const items = phoneNumbers.map((phone, index) => ({
        userId,
        phoneNumber: typeof phone === 'string' ? phone : phone.number,
        contactName: typeof phone === 'object' ? phone.name : null,
        status: 'pending',
        attemptCount: 0,
        priority: options.priority || 0,
        campaignId: options.campaignId,
        metadata: typeof phone === 'object' ? phone.metadata : null
      }));

      const created = await PowerDialerQueue.bulkCreate(items);
      
      console.log(`Added ${created.length} numbers to power dialer queue`);
      return created;
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  }

  /**
   * Get queue for user
   */
  async getQueue(userId, options = {}) {
    try {
      const where = { userId };
      
      if (options.status) {
        where.status = options.status;
      }
      
      if (options.campaignId) {
        where.campaignId = options.campaignId;
      }

      const queue = await PowerDialerQueue.findAll({
        where,
        order: [
          ['priority', 'DESC'],
          ['createdAt', 'ASC']
        ],
        limit: options.limit || 100,
        offset: options.offset || 0
      });

      const total = await PowerDialerQueue.count({ where });

      return { queue, total };
    } catch (error) {
      console.error('Error getting queue:', error);
      throw error;
    }
  }

  /**
   * Clear queue
   */
  async clearQueue(userId, campaignId = null) {
    try {
      const where = { userId, status: 'pending' };
      
      if (campaignId) {
        where.campaignId = campaignId;
      }

      const deleted = await PowerDialerQueue.destroy({ where });
      
      console.log(`Cleared ${deleted} items from queue`);
      return deleted;
    } catch (error) {
      console.error('Error clearing queue:', error);
      throw error;
    }
  }
}

module.exports = new PowerDialerService();

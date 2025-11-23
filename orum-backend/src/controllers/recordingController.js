const recordingService = require('../services/recordingService');
const { Call } = require('../models');

/**
 * Start recording for an active call
 */
exports.startRecording = async (req, res) => {
  try {
    const { callSid } = req.body;
    
    if (!callSid) {
      return res.status(400).json({ 
        success: false,
        error: 'callSid is required',
        field: 'callSid'
      });
    }

    // Validate callSid format (SignalWire uses CA... format)
    if (!callSid.match(/^CA[a-f0-9]{32}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid callSid format',
        field: 'callSid'
      });
    }

    const recording = await recordingService.startRecording(callSid);
    
    res.json({
      success: true,
      recordingSid: recording.sid,
      status: recording.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[RecordingController] Error starting recording:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to start recording',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Stop recording for an active call
 */
exports.stopRecording = async (req, res) => {
  try {
    const { callSid, recordingSid } = req.body;
    
    if (!callSid || !recordingSid) {
      return res.status(400).json({ error: 'callSid and recordingSid are required' });
    }

    const recording = await recordingService.stopRecording(callSid, recordingSid);
    
    res.json({
      success: true,
      recordingSid: recording.sid,
      status: recording.status
    });
  } catch (error) {
    console.error('Error stopping recording:', error);
    res.status(500).json({ error: 'Failed to stop recording' });
  }
};

/**
 * Get recording URL for playback
 */
exports.getRecording = async (req, res) => {
  try {
    const { recordingSid } = req.params;
    
    const recording = await recordingService.getRecordingUrl(recordingSid);
    
    res.json({
      success: true,
      ...recording
    });
  } catch (error) {
    console.error('Error getting recording:', error);
    res.status(500).json({ error: 'Failed to get recording' });
  }
};

/**
 * Get recording for a specific call
 */
exports.getCallRecording = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;
    
    // Validate UUID format
    if (!callId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid callId format' 
      });
    }
    
    const call = await Call.findOne({
      where: { id: callId, userId },
      attributes: ['id', 'recordingSid', 'recordingUrl', 'recordingDuration', 'contactName', 'to']
    });
    
    if (!call) {
      return res.status(404).json({ 
        success: false,
        error: 'Call not found or access denied' 
      });
    }
    
    if (!call.recordingSid) {
      return res.status(404).json({ 
        success: false,
        error: 'No recording available for this call' 
      });
    }
    
    const recording = await recordingService.getRecordingUrl(call.recordingSid);
    
    res.json({
      success: true,
      callId: call.id,
      contactName: call.contactName,
      phoneNumber: call.to,
      ...recording
    });
  } catch (error) {
    console.error('[RecordingController] Error getting call recording:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to get call recording' 
    });
  }
};

/**
 * Delete a recording
 */
exports.deleteRecording = async (req, res) => {
  try {
    const { recordingSid } = req.params;
    
    await recordingService.deleteRecording(recordingSid);
    
    res.json({
      success: true,
      message: 'Recording deleted'
    });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
};

/**
 * Webhook handler for recording status updates from SignalWire
 */
exports.recordingStatusWebhook = async (req, res) => {
  try {
    await recordingService.handleRecordingStatusWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling recording status webhook:', error);
    res.sendStatus(500);
  }
};

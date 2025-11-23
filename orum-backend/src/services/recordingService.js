const { Call } = require('../models');

class RecordingService {
  constructor() {
    this.signalwireService = require('./signalwireService');
  }

  /**
   * Start recording for a call
   * SignalWire handles recording server-side via RecordingSid
   */
  async startRecording(callSid) {
    try {
      const recording = await this.signalwireService.client.calls(callSid)
        .recordings
        .create({
          recordingChannels: 'dual',
          recordingStatusCallback: `${process.env.BACKEND_URL}/api/webhooks/recording-status`,
          recordingStatusCallbackEvent: ['completed']
        });

      console.log('Recording started:', recording.sid);
      return recording;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording for a call
   */
  async stopRecording(callSid, recordingSid) {
    try {
      const recording = await this.signalwireService.client.calls(callSid)
        .recordings(recordingSid)
        .update({ status: 'stopped' });

      console.log('Recording stopped:', recordingSid);
      return recording;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Save recording metadata to database
   */
  async saveRecordingMetadata(callId, recordingData) {
    try {
      const call = await Call.findByPk(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      await call.update({
        recordingSid: recordingData.sid,
        recordingUrl: recordingData.url || recordingData.uri,
        recordingDuration: recordingData.duration,
        recordingStatus: recordingData.status
      });

      console.log('Recording metadata saved for call:', callId);
      return call;
    } catch (error) {
      console.error('Error saving recording metadata:', error);
      throw error;
    }
  }

  /**
   * Get recording URL for playback
   */
  async getRecordingUrl(recordingSid) {
    try {
      if (!recordingSid) {
        throw new Error('Recording SID is required');
      }

      const recording = await this.signalwireService.client.recordings(recordingSid).fetch();
      
      if (!recording) {
        throw new Error('Recording not found');
      }

      // Construct full URL for media file
      const baseUrl = `https://${process.env.SIGNALWIRE_SPACE_URL}`;
      const mediaUrl = `${baseUrl}${recording.uri.replace('.json', '.mp3')}`;
      
      console.log(`[RecordingService] Retrieved recording URL for ${recordingSid}`);
      
      return {
        url: mediaUrl,
        duration: recording.duration,
        status: recording.status,
        dateCreated: recording.dateCreated,
        channels: recording.channels || 1
      };
    } catch (error) {
      console.error(`[RecordingService] Error fetching recording URL for ${recordingSid}:`, error.message);
      throw new Error(`Failed to retrieve recording: ${error.message}`);
    }
  }

  /**
   * Delete recording (for privacy/compliance)
   */
  async deleteRecording(recordingSid) {
    try {
      await this.signalwireService.client.recordings(recordingSid).remove();
      console.log('Recording deleted:', recordingSid);
      return true;
    } catch (error) {
      console.error('Error deleting recording:', error);
      throw error;
    }
  }

  /**
   * Handle recording status webhook from SignalWire
   */
  async handleRecordingStatusWebhook(recordingData) {
    try {
      const { RecordingSid, CallSid, RecordingUrl, RecordingDuration, RecordingStatus } = recordingData;

      // Find call by SignalWire SID
      const call = await Call.findOne({ where: { twilioSid: CallSid } });
      
      if (call) {
        await call.update({
          recordingSid: RecordingSid,
          recordingUrl: RecordingUrl,
          recordingDuration: RecordingDuration,
          recordingStatus: RecordingStatus
        });

        console.log('Recording webhook processed for call:', call.id);
      }

      return true;
    } catch (error) {
      console.error('Error handling recording webhook:', error);
      throw error;
    }
  }
}

module.exports = new RecordingService();

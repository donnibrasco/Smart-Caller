/**
 * Call Recording Service
 * Handles call recording using MediaRecorder API and SignalWire backend recording
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://salescallagent.my/api';

export class CallRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /**
   * Start local browser recording (for backup/testing)
   */
  async startLocalRecording(stream: MediaStream): Promise<void> {
    try {
      this.stream = stream;
      this.recordedChunks = [];

      // Create MediaRecorder with appropriate codec
      const options = { mimeType: 'audio/webm;codecs=opus' };
      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      console.log('Local recording started');
    } catch (error) {
      console.error('Error starting local recording:', error);
      throw error;
    }
  }

  /**
   * Stop local browser recording
   */
  async stopLocalRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedChunks = [];
        resolve(blob);
      };

      this.mediaRecorder.stop();
      console.log('Local recording stopped');
    });
  }

  /**
   * Start server-side recording via SignalWire
   */
  async startRecording(callSid: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/recordings/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ callSid })
      });

      if (!response.ok) {
        throw new Error('Failed to start recording');
      }

      const data = await response.json();
      console.log('Server recording started:', data.recordingSid);
      return data;
    } catch (error) {
      console.error('Error starting server recording:', error);
      throw error;
    }
  }

  /**
   * Stop server-side recording
   */
  async stopRecording(callSid: string, recordingSid: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/recordings/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ callSid, recordingSid })
      });

      if (!response.ok) {
        throw new Error('Failed to stop recording');
      }

      const data = await response.json();
      console.log('Server recording stopped');
      return data;
    } catch (error) {
      console.error('Error stopping server recording:', error);
      throw error;
    }
  }

  /**
   * Get recording URL for playback
   */
  async getRecordingUrl(callId: string, token: string): Promise<string> {
    try {
      if (!callId) {
        throw new Error('Call ID is required');
      }

      if (!token) {
        throw new Error('Authentication token is required');
      }

      const response = await fetch(`${API_URL}/calls/${callId}/recording`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        throw new Error('Recording not available for this call');
      }

      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to get recording');
      }

      const data = await response.json();
      
      if (!data.success || !data.url) {
        throw new Error('Invalid response from server');
      }

      return data.url;
    } catch (error) {
      console.error('[CallRecordingService] Error getting recording URL:', error);
      throw error;
    }
  }

  /**
   * Download recording as file
   */
  downloadRecording(blob: Blob, filename: string = 'recording.webm'): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

export default new CallRecordingService();

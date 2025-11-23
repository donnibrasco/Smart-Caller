/**
 * Power Dialer Service
 * Manages automated dialing queue and campaign execution
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://salescallagent.my/api';

export interface PowerDialerStats {
  totalCalls: number;
  connected: number;
  voicemail: number;
  noAnswer: number;
  failed: number;
  busy: number;
}

export interface PowerDialerSession {
  userId: string;
  status: 'active' | 'paused' | 'stopped';
  isPaused: boolean;
  startTime: Date;
  callsMade: number;
  callsConnected: number;
  voicemailsDetected: number;
  currentCall: any | null;
  stats: PowerDialerStats;
}

export interface QueueItem {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: 'pending' | 'calling' | 'completed' | 'failed' | 'skipped';
  outcome?: 'connected' | 'voicemail' | 'no-answer' | 'busy' | 'failed' | 'pending';
  attemptCount: number;
  lastAttemptAt?: Date;
  priority: number;
  metadata?: any;
}

export class PowerDialerService {
  private token: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.token = localStorage.getItem('token');
  }

  /**
   * Start power dialer session
   */
  async startSession(campaignId?: string, callerId?: string): Promise<PowerDialerSession> {
    try {
      const response = await fetch(`${API_URL}/power-dialer/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ campaignId, callerId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start power dialer');
      }

      const data = await response.json();
      this.emit('sessionStarted', data.session);
      return data.session;
    } catch (error) {
      console.error('Error starting power dialer:', error);
      throw error;
    }
  }

  /**
   * Pause power dialer session
   */
  async pauseSession(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/power-dialer/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to pause power dialer');
      }

      const data = await response.json();
      this.emit('sessionPaused', data.session);
    } catch (error) {
      console.error('Error pausing power dialer:', error);
      throw error;
    }
  }

  /**
   * Resume power dialer session
   */
  async resumeSession(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/power-dialer/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to resume power dialer');
      }

      const data = await response.json();
      this.emit('sessionResumed', data.session);
    } catch (error) {
      console.error('Error resuming power dialer:', error);
      throw error;
    }
  }

  /**
   * Skip current call
   */
  async skipCurrent(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/power-dialer/skip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to skip call');
      }

      const data = await response.json();
      this.emit('callSkipped', data.session);
    } catch (error) {
      console.error('Error skipping call:', error);
      throw error;
    }
  }

  /**
   * Stop power dialer session
   */
  async stopSession(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/power-dialer/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to stop power dialer');
      }

      const data = await response.json();
      this.emit('sessionStopped', data.session);
    } catch (error) {
      console.error('Error stopping power dialer:', error);
      throw error;
    }
  }

  /**
   * Get current session status
   */
  async getStatus(): Promise<{ active: boolean; session: PowerDialerSession | null }> {
    try {
      const response = await fetch(`${API_URL}/power-dialer/status`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting status:', error);
      throw error;
    }
  }

  /**
   * Add phone numbers to queue
   */
  async addToQueue(
    phoneNumbers: Array<string | { number: string; name?: string; metadata?: any }>,
    campaignId?: string,
    priority: number = 0
  ): Promise<QueueItem[]> {
    try {
      const response = await fetch(`${API_URL}/power-dialer/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ phoneNumbers, campaignId, priority })
      });

      if (!response.ok) {
        throw new Error('Failed to add to queue');
      }

      const data = await response.json();
      this.emit('queueUpdated', data.items);
      return data.items;
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  }

  /**
   * Get queue
   */
  async getQueue(
    status?: string,
    campaignId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ queue: QueueItem[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (campaignId) params.append('campaignId', campaignId);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`${API_URL}/power-dialer/queue?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get queue');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting queue:', error);
      throw error;
    }
  }

  /**
   * Clear queue
   */
  async clearQueue(campaignId?: string): Promise<number> {
    try {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      const response = await fetch(`${API_URL}/power-dialer/queue${params}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to clear queue');
      }

      const data = await response.json();
      this.emit('queueCleared', data.deleted);
      return data.deleted;
    } catch (error) {
      console.error('Error clearing queue:', error);
      throw error;
    }
  }

  /**
   * Event listener system
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Import contacts from CSV
   */
  async importFromCSV(file: File, campaignId?: string): Promise<QueueItem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const phoneNumbers: Array<{ number: string; name?: string }> = [];

          // Skip header row
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = line.split(',');
            const number = columns[0]?.trim();
            const name = columns[1]?.trim();

            if (number) {
              phoneNumbers.push({ number, name });
            }
          }

          const items = await this.addToQueue(phoneNumbers, campaignId);
          resolve(items);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

export default new PowerDialerService();

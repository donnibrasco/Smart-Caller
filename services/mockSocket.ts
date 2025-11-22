
import { SalesfloorUser } from '../types';

type EventType = 'activity' | 'status_update';
type Listener = (data: any) => void;

export class MockSocketService {
  private listeners: Map<EventType, Set<Listener>> = new Map();
  private intervalId: any;

  // Mock Data Pools
  private names = ['Sarah Miller', 'Mike Ross', 'Harvey Specter', 'Donna Paulsen', 'Jessica Pearson', 'Louis Litt'];
  private companies = ['TechCorp', 'Acme Inc', 'Global Logistics', 'Stark Ind', 'Wayne Ent', 'Cyberdyne'];
  private actions = [
    { action: 'booked a meeting', type: 'success' },
    { action: 'connected with', type: 'neutral' },
    { action: 'left a voicemail', type: 'neutral' },
    { action: 'closed deal', type: 'success' },
    { action: 'scheduled follow-up', type: 'neutral' }
  ];

  constructor() {
    this.listeners.set('activity', new Set());
    this.listeners.set('status_update', new Set());
  }

  connect() {
    console.log('Mock Socket Connected');
    this.startEmitting();
  }

  disconnect() {
    if (this.intervalId) clearInterval(this.intervalId);
    console.log('Mock Socket Disconnected');
  }

  on(event: EventType, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: EventType, callback: Listener) {
    this.listeners.get(event)?.delete(callback);
  }

  private startEmitting() {
    // Emit random events every 3-8 seconds
    this.intervalId = setInterval(() => {
      const random = Math.random();
      
      if (random > 0.5) {
        this.emitActivity();
      } else {
        this.emitStatusUpdate();
      }
    }, 4000);
  }

  private emitActivity() {
    const user = this.names[Math.floor(Math.random() * this.names.length)];
    const act = this.actions[Math.floor(Math.random() * this.actions.length)];
    const target = this.companies[Math.floor(Math.random() * this.companies.length)];
    
    const activity = {
      id: Date.now(),
      user,
      action: act.action,
      target,
      time: 'Just now',
      type: act.type
    };

    this.notify('activity', activity);
  }

  private emitStatusUpdate() {
    const statuses: SalesfloorUser['status'][] = ['Available', 'On Call', 'Wrap Up', 'Away'];
    const user = this.names[Math.floor(Math.random() * this.names.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const update = {
      userName: user,
      status,
      callDuration: status === 'On Call' ? 0 : undefined,
      currentTask: status === 'On Call' ? `Calling: ${this.companies[Math.floor(Math.random() * this.companies.length)]}` : undefined
    };

    this.notify('status_update', update);
  }

  private notify(event: EventType, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

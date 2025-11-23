
export enum Page {
  DASHBOARD = 'DASHBOARD',
  DIALER = 'DIALER',
  MANUAL_DIALER = 'MANUAL_DIALER',
  POWER_DIALER = 'POWER_DIALER',
  CALL_HISTORY = 'CALL_HISTORY',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS',
  SALESFLOOR = 'SALESFLOOR',
  SCRIPTS = 'SCRIPTS',
  TEAM = 'TEAM',
}

export interface Lead {
  id: string;
  name: string;
  title?: string;
  company: string;
  phone: string;
  status: 'new' | 'New' | 'Contacted' | 'Qualified' | 'Lost';
  lastActivity?: string;
  personaPrompt?: string; // Instructions for Gemini to act as this person
}

export interface PhoneNumber {
  id?: string;
  sid: string;
  number: string;
  label?: string;
  region?: string;
  capabilities?: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export enum CallState {
  IDLE = 'IDLE',
  DIALING = 'DIALING',
  CONNECTED = 'CONNECTED',
  ENDING = 'ENDING',
}

export interface AudioChunk {
  data: Uint8Array;
  timestamp: number;
}

export interface SalesfloorUser {
  id: string;
  name: string;
  avatar: string;
  status: 'Available' | 'On Call' | 'Wrap Up' | 'Away';
  currentTask?: string;
  callDuration?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Agent';
  status: 'Active' | 'Inactive';
  performance: {
    calls: number;
    meetings: number;
  };
  avatar: string;
}

export interface Script {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  tags: string[];
}

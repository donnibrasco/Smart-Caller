
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, 
  Phone, 
  Settings as SettingsIcon, 
  LogOut, 
  Bell, 
  Search,
  Users,
  FileText,
  Activity,
  History
} from 'lucide-react';
import { Dialer } from './components/Dialer';
import { Analytics } from './components/Analytics';
import { ActiveCall } from './components/ActiveCall';
import { Salesfloor } from './components/Salesfloor';
import { Dashboard } from './components/Dashboard';
import { ScriptEditor } from './components/ScriptEditor';
import { Login } from './components/Login';
import { Team } from './components/Team';
import { ManualDialer } from './components/ManualDialer';
import { CallHistory } from './components/CallHistory';
import { PowerDialer } from './components/PowerDialer';
import { Lead, Page, PhoneNumber, Script } from './types';

const INITIAL_LEADS: Lead[] = [];

const INITIAL_SCRIPTS: Script[] = [
  {
    id: 's1',
    name: 'Cold Call - Tech Sales',
    content: 'Hi {FirstName}, this is {MyName} from {MyCompany}. I saw {Company} is hiring sales reps and wanted to ask how you are currently handling outbound efficiency?',
    isDefault: true,
    tags: ['Outbound', 'Tech']
  },
  {
    id: 's2',
    name: 'Follow Up - Post Demo',
    content: 'Hi {FirstName}, {MyName} here. Just calling to see if you had any questions about the pricing proposal I sent over for {Company}?',
    isDefault: false,
    tags: ['Follow Up']
  }
];

const Settings = () => (
  <div className="p-8 max-w-2xl mx-auto overflow-y-auto h-full">
    <h2 className="text-2xl font-bold text-slate-800 mb-6">Settings & Integrations</h2>
    
    <div className="space-y-6">
      {/* Twilio Config */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Twilio Voice Configuration</h3>
        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm mb-4">
          <strong>Integration Status:</strong> Connected. Backend webhook URLs are configured for production usage.
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Account SID</label>
          <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="AC..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Auth Token</label>
          <input type="password" className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="••••••••••••••••" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">TwiML App SID</label>
          <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="AP..." />
        </div>
      </div>

      {/* CRM Integration */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">CRM Connections</h3>
        
        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-bold">SF</div>
            <div>
              <div className="font-medium text-slate-900">Salesforce</div>
              <div className="text-xs text-slate-500">Sync leads, contacts, and tasks</div>
            </div>
          </div>
          <button className="text-sm px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-700">Connect</button>
        </div>

        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded flex items-center justify-center text-orange-600 font-bold">HS</div>
            <div>
              <div className="font-medium text-slate-900">HubSpot</div>
              <div className="text-xs text-slate-500">Bi-directional sync active</div>
            </div>
          </div>
          <button className="text-sm px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded font-medium">Connected</button>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm">
          Save Configuration
        </button>
      </div>
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [activePage, setActivePage] = useState<Page>(Page.DASHBOARD);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [scripts, setScripts] = useState<Script[]>(INITIAL_SCRIPTS);
  
  // Dialer State
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [twilioNumbers, setTwilioNumbers] = useState<PhoneNumber[]>([]);
  const [selectedNumberId, setSelectedNumberId] = useState<string>('');
  
  // Auto-Dialer Queue State
  const [isAutoDialing, setIsAutoDialing] = useState(false);
  const [dialQueue, setDialQueue] = useState<Lead[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch real Twilio phone numbers
      fetchTwilioNumbers();
    }
  }, [isAuthenticated]);

  const fetchTwilioNumbers = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://salescallagent.my/api';
      const response = await fetch(`${apiUrl}/twilio/phone-numbers`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.numbers.length > 0) {
          setTwilioNumbers(data.numbers);
          setSelectedNumberId(data.numbers[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch Twilio phone numbers:', error);
    }
  };

  const handleImportLeads = (newLeads: Lead[]) => {
    setLeads(prev => [...prev, ...newLeads]);
  };

  const handleDeleteLeads = (ids: string[]) => {
    setLeads(prev => prev.filter(lead => !ids.includes(lead.id)));
  };

  const handleStartAutoDial = (queue: Lead[]) => {
    if (queue.length === 0) {
      alert("No leads in the current list to dial.");
      return;
    }
    setIsAutoDialing(true);
    setDialQueue(queue);
    setActiveLead(queue[0]);
  };

  const handleHangup = () => {
    if (isAutoDialing && activeLead) {
      const currentIndex = dialQueue.findIndex(l => l.id === activeLead.id);
      const nextIndex = currentIndex + 1;

      setActiveLead(null); // Close current call window

      if (nextIndex < dialQueue.length) {
        // Simulate "Wrap up" time then dial next
        setTimeout(() => {
          setActiveLead(dialQueue[nextIndex]);
        }, 1500);
      } else {
        // Queue finished
        setIsAutoDialing(false);
        setDialQueue([]);
        alert("Power Dialing List Completed!");
      }
    } else {
      // Manual mode hangup
      setActiveLead(null);
    }
  };

  const selectedNumber = twilioNumbers.find(n => n.id === selectedNumberId) || twilioNumbers[0];
  const defaultScript = scripts.find(s => s.isDefault) || scripts[0];

  const handleLogin = (token: string, user: any) => {
    setAuthToken(token);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken('');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Check for existing session on mount
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setAuthToken(token);
      setCurrentUser(JSON.parse(user));
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-6 flex items-center space-x-2 text-white">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
            <Phone className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">creativeprocess<span className="text-blue-500">.io</span></span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { page: Page.DASHBOARD, icon: Activity, label: 'Dashboard' },
            { page: Page.DIALER, icon: Phone, label: 'Power Dialer' },
            { page: Page.MANUAL_DIALER, icon: Phone, label: 'Manual Dialer' },
            { page: Page.POWER_DIALER, icon: Phone, label: 'Auto Dialer' },
            { page: Page.CALL_HISTORY, icon: History, label: 'Call History' },
            { page: Page.SALESFLOOR, icon: Users, label: 'Salesfloor' },
            { page: Page.ANALYTICS, icon: LayoutGrid, label: 'Analytics' },
            { page: Page.SCRIPTS, icon: FileText, label: 'Scripts' },
            { page: Page.TEAM, icon: Users, label: 'Team' },
            { page: Page.SETTINGS, icon: SettingsIcon, label: 'Settings' },
          ].map((item) => (
            <button 
              key={item.page}
              onClick={() => setActivePage(item.page)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activePage === item.page 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2 text-slate-400 hover:text-white transition-colors w-full"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="flex items-center text-slate-400 w-96 bg-slate-100 rounded-full px-4 py-2 border border-transparent focus-within:border-blue-300 focus-within:bg-white transition-all">
             <Search size={18} className="mr-2" />
             <input 
               type="text" 
               placeholder="Search leads, recordings, notes..." 
               className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder-slate-400"
             />
          </div>
          
          <div className="flex items-center space-x-6">
             <button className="relative text-slate-500 hover:text-blue-600 transition-colors">
               <Bell size={20} />
               <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full transform translate-x-1 -translate-y-1 border border-white"></span>
             </button>
             <div className="flex items-center space-x-3 pl-6 border-l border-slate-200">
               <div className="text-right hidden md:block">
                 <div className="text-sm font-bold text-slate-800">{currentUser?.name || 'User'}</div>
                 <div className="text-xs text-slate-500">{currentUser?.role || 'Agent'} • Online</div>
               </div>
               <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white">
                 {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
               </div>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden relative">
           {activePage === Page.DASHBOARD && <Dashboard />}
           {activePage === Page.CALL_HISTORY && <CallHistory />}
           {activePage === Page.POWER_DIALER && <PowerDialer />}
           {activePage === Page.MANUAL_DIALER && (
             <ManualDialer 
               twilioNumbers={twilioNumbers}
               onCall={(phoneNumber, name, callerId) => {
                 const tempLead: Lead = {
                   id: `manual-${Date.now()}`,
                   name: name,
                   phone: phoneNumber,
                   company: 'Manual Call',
                   status: 'new'
                 };
                 setActiveLead(tempLead);
               }}
             />
           )}
           {activePage === Page.DIALER && (
             <div className="h-full p-6">
                <Dialer 
                  leads={leads} 
                  onCall={(lead) => setActiveLead(lead)}
                  onImport={handleImportLeads}
                  onDelete={handleDeleteLeads}
                  twilioNumbers={twilioNumbers}
                  selectedNumberId={selectedNumberId}
                  onSelectNumber={setSelectedNumberId}
                  onStartAutoDial={handleStartAutoDial}
                />
             </div>
           )}
           {activePage === Page.SALESFLOOR && <Salesfloor />}
           {activePage === Page.ANALYTICS && <Analytics />}
           {activePage === Page.SCRIPTS && (
             <ScriptEditor 
               scripts={scripts}
               onSave={setScripts}
             />
           )}
           {activePage === Page.TEAM && <Team />}
           {activePage === Page.SETTINGS && <Settings />}
        </main>
      </div>

      {/* Active Call Overlay */}
      {activeLead && (
        <ActiveCall 
          lead={activeLead} 
          callerId={selectedNumber}
          isAutoDialing={isAutoDialing}
          activeScript={defaultScript}
          onHangup={handleHangup} 
        />
      )}
    </div>
  );
}

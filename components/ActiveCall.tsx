
import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, PhoneOff, User, Building, History, FileText, Zap, PenTool, Database, Sparkles, Voicemail, Circle } from 'lucide-react';
import { Lead, CallState, PhoneNumber, Script } from '../types';
import { TwilioVoiceService } from '../services/twilioVoice';

interface ActiveCallProps {
  lead: Lead;
  callerId: PhoneNumber;
  isAutoDialing: boolean;
  activeScript?: Script;
  onHangup: () => void;
}

export const ActiveCall: React.FC<ActiveCallProps> = ({ lead, callerId, isAutoDialing, activeScript, onHangup }) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<CallState>(CallState.DIALING);
  const [activeTab, setActiveTab] = useState<'script' | 'notes' | 'crm'>('script');
  const [notes, setNotes] = useState('');
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  
  const twilioService = useRef<TwilioVoiceService | null>(null);

  useEffect(() => {
    let timer: any;
    if (status === CallState.CONNECTED) {
      timer = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://salescallagent.my/api';
    
    // Initialize Twilio Voice Service
    const initCall = async () => {
      try {
        // Get Twilio token from backend
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiUrl}/calls/token`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to get voice token');
        }

        const data = await response.json();
        
        // Initialize Twilio Device
        const service = new TwilioVoiceService();
        twilioService.current = service;

        service.onConnect = () => {
          setStatus(CallState.CONNECTED);
        };
        
        service.onDisconnect = () => {
          setStatus(CallState.ENDING);
          setTimeout(() => {
            onHangup();
          }, 1500);
        };

        service.onError = (error) => {
          console.error('Call error:', error);
          alert(`Call error: ${error}`);
          onHangup();
        };

        await service.initialize(data.token);
        
        // Make the call
        await service.makeCall(lead.phone, callerId.number);
        
      } catch (err: any) {
        console.error("Failed to connect call", err);
        const errorMessage = err.message || "Unknown error";
        alert(`Could not connect call: ${errorMessage}`);
        onHangup();
      }
    };

    initCall();

    return () => {
      if (twilioService.current) {
        twilioService.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleVmDrop = () => {
    alert("Dropping pre-recorded Voicemail...");
    onHangup();
  };

  const toggleMute = () => {
    if (twilioService.current) {
      if (isMuted) {
        twilioService.current.unmute();
      } else {
        twilioService.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  // Process script variables
  const processedScript = activeScript ? activeScript.content
    .replace(/{FirstName}/g, lead.name.split(' ')[0])
    .replace(/{LastName}/g, lead.name.split(' ').slice(1).join(' '))
    .replace(/{Company}/g, lead.company)
    .replace(/{Title}/g, lead.title)
    .replace(/{MyName}/g, 'Alex')
    .replace(/{MyCompany}/g, 'creativeprocess.io') 
    : "No script selected.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel: Lead Info & Tabs */}
        <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center space-x-3">
                 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                   {lead.name.charAt(0)}
                 </div>
                 <div>
                   <h2 className="font-bold text-xl text-slate-900">{lead.name}</h2>
                   <p className="text-slate-500 text-sm">{lead.title}</p>
                 </div>
               </div>
               <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                 status === CallState.CONNECTED ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-yellow-100 text-yellow-600'
               }`}>
                 {status}
               </div>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center text-slate-600 text-sm">
                <Building size={16} className="mr-2 text-slate-400" />
                {lead.company}
              </div>
              <div className="flex items-center text-slate-600 text-sm">
                <History size={16} className="mr-2 text-slate-400" />
                Last: {lead.lastActivity}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-white">
             <button 
               onClick={() => setActiveTab('script')}
               className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'script' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}
             >
               Script
             </button>
             <button 
               onClick={() => setActiveTab('notes')}
               className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'notes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}
             >
               Notes
             </button>
             <button 
               onClick={() => setActiveTab('crm')}
               className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'crm' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}
             >
               CRM
             </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {activeTab === 'script' && (
              <div className="prose prose-sm prose-slate text-slate-600">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 flex items-center m-0">
                    <FileText size={16} className="mr-2" /> 
                    {activeScript?.name || 'Default Script'}
                  </h3>
                </div>
                <div className="whitespace-pre-wrap text-base leading-relaxed font-medium text-slate-700">
                  {processedScript}
                </div>
              </div>
            )}
            
            {activeTab === 'notes' && (
               <div className="h-full flex flex-col">
                  <h3 className="font-semibold text-slate-800 flex items-center mb-3">
                    <PenTool size={16} className="mr-2" /> Call Notes
                  </h3>
                  <textarea 
                    className="flex-1 w-full border border-slate-200 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50"
                    placeholder="Type notes here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                  <div className="mt-3 flex justify-end">
                    <button className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm">Save to CRM</button>
                  </div>
               </div>
            )}

            {activeTab === 'crm' && (
              <div className="space-y-4">
                 <h3 className="font-semibold text-slate-800 flex items-center mb-3">
                    <Database size={16} className="mr-2" /> Salesforce Data
                  </h3>
                 <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between"><span className="text-slate-500">Stage:</span> <span className="font-medium">Discovery</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Amount:</span> <span className="font-medium">$12,000</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Close Date:</span> <span className="font-medium">Oct 30, 2025</span></div>
                 </div>
                 <button className="w-full py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 text-xs font-bold">
                   View in Salesforce
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Active Call Visualizer */}
        <div className="flex-1 flex flex-col bg-white relative">
          {/* Top Bar */}
          <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white z-20">
             <div className="flex items-center space-x-4">
                <div className="font-mono text-2xl font-light text-slate-700 w-20">
                  {formatTime(duration)}
                </div>
                <div className="flex items-center space-x-2 px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100">
                   <Circle size={8} className="fill-current animate-pulse" />
                   <span>REC</span>
                </div>
             </div>
             
             <div className="flex items-center space-x-3">
                {isAutoDialing && (
                    <div className="flex items-center text-xs text-indigo-600 font-bold uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        <Zap size={12} className="mr-1 fill-current" />
                        Power Dialer
                    </div>
                )}
                <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">
                   {callerId.region} Local ID
                </div>
             </div>
          </div>

          {/* Visualizer Area */}
          <div className="flex-1 bg-slate-900 relative flex flex-col items-center justify-center p-8 overflow-hidden">
            {/* Abstract Waveform BG */}
            <div className="absolute inset-0 opacity-20 flex items-center justify-center space-x-1">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-3 bg-blue-500 rounded-full animate-pulse" 
                  style={{ 
                    height: `${Math.random() * 60 + 20}%`, 
                    animationDuration: `${Math.random() * 0.5 + 0.5}s` 
                  }}
                />
              ))}
            </div>

            {/* Central Avatar */}
            <div className="relative z-10 group">
               <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1 shadow-2xl shadow-blue-500/50">
                 <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center overflow-hidden">
                    {status === CallState.CONNECTED ? (
                       <div className="w-24 h-24 bg-blue-400 rounded-full animate-ping opacity-75 absolute"></div>
                    ) : null}
                    <User size={48} className="text-white relative z-10" />
                 </div>
               </div>
               <div className="mt-6 text-center">
                 <h2 className="text-white text-2xl font-light">{lead.name}</h2>
                 <p className="text-blue-300 text-sm mt-1 font-mono">{lead.phone}</p>
               </div>
            </div>

             {/* AI Coaching Tip Overlay */}
             {coachingTip && (
               <div className="absolute top-10 bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm animate-bounce text-sm flex items-start">
                 <Sparkles size={16} className="mr-2 mt-0.5 flex-shrink-0 text-yellow-300" />
                 <div>
                    <span className="font-bold block text-xs text-indigo-200 uppercase mb-1">AI Coach Tip</span>
                    {coachingTip}
                 </div>
               </div>
             )}
          </div>

          {/* Controls */}
          <div className="h-24 bg-slate-50 border-t border-slate-200 flex items-center justify-center space-x-6 relative z-20">
             <button 
               onClick={toggleMute}
               className={`p-4 rounded-full transition-all ${isMuted ? 'bg-slate-200 text-slate-500' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
               title={isMuted ? "Unmute" : "Mute"}
             >
               {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
             </button>
             
             <button 
               onClick={onHangup}
               className="bg-red-500 hover:bg-red-600 text-white p-5 rounded-full shadow-lg shadow-red-200 transform hover:scale-105 transition-all flex items-center space-x-2 px-8"
             >
               <PhoneOff size={32} />
               {isAutoDialing && (
                   <div className="flex flex-col items-start ml-2 text-xs text-red-100 opacity-80">
                       <span className="font-bold uppercase">Next</span>
                   </div>
               )}
             </button>

             <button 
                onClick={handleVmDrop}
                className="p-4 bg-white border border-slate-300 rounded-full text-slate-700 hover:bg-slate-50 shadow-sm flex flex-col items-center justify-center w-16 h-16"
                title="Drop Voicemail"
             >
               <Voicemail size={20} />
               <span className="text-[10px] font-bold mt-1">VM Drop</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

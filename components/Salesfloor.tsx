
import React, { useEffect, useState } from 'react';
import { Mic, Headphones, Clock, Users, Phone } from 'lucide-react';
import { SalesfloorUser } from '../types';

export const Salesfloor: React.FC = () => {
  const [team, setTeam] = useState<SalesfloorUser[]>([]);

  // Simulate local call timers for active calls
  useEffect(() => {
    const timer = setInterval(() => {
      setTeam(prev => prev.map(user => {
        if (user.status === 'On Call' && user.callDuration !== undefined) {
          return { ...user, callDuration: user.callDuration + 1 };
        }
        return user;
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-8 h-full bg-slate-50 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Virtual Salesfloor</h2>
          <p className="text-slate-500">Real-time collaboration and team status</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-slate-600">Live Updates Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {team.map((user) => (
          <div key={user.id} className={`bg-white rounded-xl border shadow-sm transition-all hover:shadow-md duration-500 ${
            user.status === 'On Call' ? 'border-green-200 ring-1 ring-green-100' : 'border-slate-200'
          }`}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors duration-500 ${
                    user.status === 'On Call' ? 'bg-green-500' : 
                    user.status === 'Away' ? 'bg-slate-300' : 
                    user.status === 'Wrap Up' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    {user.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{user.name}</h3>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 transition-colors duration-500 ${
                      user.status === 'On Call' ? 'bg-green-100 text-green-700' :
                      user.status === 'Away' ? 'bg-slate-100 text-slate-500' :
                      user.status === 'Wrap Up' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {user.status}
                    </div>
                  </div>
                </div>
                {user.status === 'On Call' && (
                  <div className="animate-pulse">
                    <Mic size={16} className="text-green-500" />
                  </div>
                )}
              </div>

              <div className="space-y-2 min-h-[3rem]">
                {user.currentTask && (
                  <div className="flex items-center text-sm text-slate-600 bg-slate-50 p-2 rounded animate-in fade-in duration-300">
                    <Phone size={14} className="mr-2 text-slate-400" />
                    <span className="truncate">{user.currentTask}</span>
                  </div>
                )}
                {user.callDuration !== undefined && user.status === 'On Call' && (
                   <div className="flex items-center text-xs text-slate-500">
                     <Clock size={12} className="mr-1" />
                     <span>Duration: {Math.floor(user.callDuration / 60)}:{(user.callDuration % 60).toString().padStart(2, '0')}</span>
                   </div>
                )}
              </div>
            </div>
            
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-xl">
              <button 
                disabled={user.status !== 'On Call'}
                className={`flex items-center space-x-1 text-xs font-medium transition-colors ${
                  user.status === 'On Call' 
                    ? 'text-blue-600 hover:text-blue-800 cursor-pointer' 
                    : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                <Headphones size={14} />
                <span>Listen In</span>
              </button>
              
              <button className="text-slate-400 hover:text-blue-600 transition-colors">
                 <Users size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

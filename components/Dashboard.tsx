
import React, { useEffect, useState } from 'react';
import { Activity, Phone, Clock, Calendar, TrendingUp, User, Zap, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const [feed, setFeed] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    dailyCalls: 0,
    connectRate: 0,
    meetingsBooked: 0,
    avgTalkTime: '0m 0s'
  });

  return (
    <div className="p-8 bg-slate-50 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Command Center</h1>
          <p className="text-slate-500">Real-time overview of sales operations</p>
        </div>
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-sm font-medium text-slate-700">System Operational</span>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Phone className="text-blue-600" size={20} />
              </div>
           </div>
           <div className="text-3xl font-bold text-slate-900">{metrics.dailyCalls.toLocaleString()}</div>
           <div className="text-slate-500 text-sm mt-1">Daily Calls</div>
           <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500"></div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Zap className="text-purple-600" size={20} />
              </div>
           </div>
           <div className="text-3xl font-bold text-slate-900">{metrics.connectRate > 0 ? metrics.connectRate.toFixed(1) + '%' : '0%'}</div>
           <div className="text-slate-500 text-sm mt-1">Connect Rate</div>
           <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500"></div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Target className="text-orange-600" size={20} />
              </div>
           </div>
           <div className="text-3xl font-bold text-slate-900">{metrics.meetingsBooked}</div>
           <div className="text-slate-500 text-sm mt-1">Meetings Booked</div>
           <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-500"></div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Clock className="text-emerald-600" size={20} />
              </div>
           </div>
           <div className="text-3xl font-bold text-slate-900">{metrics.avgTalkTime}</div>
           <div className="text-slate-500 text-sm mt-1">Avg Talk Time</div>
           <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
             <h3 className="font-bold text-slate-800 flex items-center">
               <Activity size={18} className="mr-2 text-blue-500" />
               Live Call Volume
             </h3>
             <select className="bg-slate-50 border border-slate-200 text-xs rounded-md px-2 py-1 outline-none">
               <option>Today</option>
               <option>Yesterday</option>
             </select>
          </div>
          <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                   <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                   <Tooltip 
                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                   />
                   <Area type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
           <h3 className="font-bold text-slate-800 mb-6 flex items-center">
             <TrendingUp size={18} className="mr-2 text-indigo-500" />
             Live Activity Feed
           </h3>
           <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar max-h-[400px]">
              {feed.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 group animate-in fade-in slide-in-from-top-2 duration-300">
                   <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                      item.type === 'success' ? 'bg-green-500 shadow-sm shadow-green-200' : 'bg-slate-300'
                   }`}></div>
                   <div>
                      <p className="text-sm text-slate-800 leading-snug">
                        <span className="font-semibold">{item.user}</span> {item.action} <span className="font-medium text-slate-600">{item.target}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{item.time}</p>
                   </div>
                </div>
              ))}
           </div>
           <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View Full Log</button>
           </div>
        </div>
      </div>
    </div>
  );
};

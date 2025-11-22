import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#94a3b8', '#cbd5e1', '#f1f5f9'];

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalCalls: 0,
    connectRate: 0,
    conversations: 0
  });
  return (
    <div className="p-8 overflow-y-auto h-full bg-slate-50">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Performance Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Total Calls</div>
          <div className="text-4xl font-bold text-slate-900 mt-2">{metrics.totalCalls.toLocaleString()}</div>
          <div className="text-slate-400 text-sm mt-1 flex items-center">No data yet</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Connect Rate</div>
          <div className="text-4xl font-bold text-slate-900 mt-2">{metrics.connectRate > 0 ? metrics.connectRate.toFixed(1) + '%' : '0%'}</div>
          <div className="text-slate-400 text-sm mt-1 flex items-center">No data yet</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Conversations</div>
          <div className="text-4xl font-bold text-slate-900 mt-2">{metrics.conversations}</div>
          <div className="text-slate-400 text-sm mt-1 flex items-center">No data yet</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">Weekly Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="connects" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Call Outcomes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">Call Outcomes</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-2">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full mr-1" style={{backgroundColor: COLORS[index]}}></span>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

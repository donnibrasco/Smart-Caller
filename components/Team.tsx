
import React, { useState } from 'react';
import { Users, UserPlus, MoreVertical, Mail, Shield, TrendingUp, Phone } from 'lucide-react';
import { TeamMember } from '../types';

export const Team: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);

  return (
    <div className="p-8 bg-slate-50 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500">Manage users, roles, and permissions</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <UserPlus size={18} />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Performance (Weekly)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {member.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{member.name}</div>
                      <div className="text-xs text-slate-500 flex items-center">
                        <Mail size={12} className="mr-1" /> {member.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-sm text-slate-700">
                    <Shield size={14} className="mr-2 text-slate-400" />
                    {member.role}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {member.status === 'Active' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>}
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end space-x-4 text-sm">
                     <div className="flex items-center text-slate-600" title="Calls Made">
                        <Phone size={14} className="mr-1 text-slate-400" />
                        {member.performance.calls}
                     </div>
                     <div className="flex items-center text-blue-600 font-medium" title="Meetings Booked">
                        <TrendingUp size={14} className="mr-1" />
                        {member.performance.meetings}
                     </div>
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

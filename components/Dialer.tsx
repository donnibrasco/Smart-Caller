
import React, { useState, useRef, useEffect } from 'react';
import { Phone, Upload, Zap, ChevronDown, Trash2, Search, Filter, Layers, Sparkles } from 'lucide-react';
import { Lead, PhoneNumber } from '../types';

interface DialerProps {
  leads: Lead[];
  onCall: (lead: Lead) => void;
  onImport: (leads: Lead[]) => void;
  onDelete: (ids: string[]) => void;
  twilioNumbers: PhoneNumber[];
  selectedNumberId: string;
  onSelectNumber: (id: string) => void;
  onStartAutoDial: (filteredLeads: Lead[]) => void;
}

export const Dialer: React.FC<DialerProps> = ({ 
  leads, 
  onCall, 
  onImport,
  onDelete,
  twilioNumbers, 
  selectedNumberId, 
  onSelectNumber,
  onStartAutoDial
}) => {
  const [filter, setFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isParallelMode, setIsParallelMode] = useState(false);
  const [internalLeads, setInternalLeads] = useState<Lead[]>(leads);
  const [manualPhoneNumber, setManualPhoneNumber] = useState('');
  const [manualName, setManualName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal leads when props change, but allow sorting locally
  useEffect(() => {
    setInternalLeads(leads);
  }, [leads]);

  // Sync selection with current leads to avoid stale IDs
  useEffect(() => {
    const currentIds = new Set(internalLeads.map(l => l.id));
    setSelectedIds(prev => {
      const next = new Set<string>();
      prev.forEach(id => {
        if (currentIds.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [internalLeads]);

  const filteredLeads = filter === 'All' ? internalLeads : internalLeads.filter(l => l.status === filter);

  const isAllSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    const newSelected = new Set(selectedIds);
    if (isAllSelected) {
      filteredLeads.forEach(l => newSelected.delete(l.id));
    } else {
      filteredLeads.forEach(l => newSelected.add(l.id));
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} records?`)) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSingle = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      onDelete([id]);
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    }
  };

  const handlePowerDial = () => {
    const leadsToDial = selectedIds.size > 0 
      ? leads.filter(l => selectedIds.has(l.id))
      : filteredLeads;
      
    if (isParallelMode && leadsToDial.length < 3) {
      alert("Parallel dialing requires at least 3 leads.");
      return;
    }

    onStartAutoDial(leadsToDial);
  };

  const handleAiPrioritize = () => {
    // Simulate AI sorting - move "Qualified" or "New" to top randomly for demo
    const sorted = [...internalLeads].sort((a, b) => {
      const scoreA = a.status === 'New' ? 2 : a.status === 'Qualified' ? 1 : 0;
      const scoreB = b.status === 'New' ? 2 : b.status === 'Qualified' ? 1 : 0;
      return scoreB - scoreA;
    });
    setInternalLeads(sorted);
    alert("Leads re-ordered by AI propensity score.");
  };

  const handleManualCall = () => {
    if (!manualPhoneNumber.trim()) {
      alert("Please enter a phone number");
      return;
    }

    // Create a temporary lead for the manual call
    const manualLead: Lead = {
      id: `manual-${Date.now()}`,
      name: manualName.trim() || 'Manual Call',
      title: 'Contact',
      company: 'Manual',
      phone: manualPhoneNumber.trim(),
      status: 'New',
      lastActivity: 'Just now',
      personaPrompt: `You are calling ${manualName.trim() || 'a prospect'}.`
    };

    onCall(manualLead);
    setManualPhoneNumber('');
    setManualName('');
  };

  const formatPhoneInput = (value: string) => {
    // Remove all non-numeric characters except +
    const cleaned = value.replace(/[^\d+]/g, '');
    setManualPhoneNumber(cleaned);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const firstLineLower = lines[0].toLowerCase();
      const hasHeader = firstLineLower.includes('name') || firstLineLower.includes('phone');
      const startIndex = hasHeader ? 1 : 0;
      
      const newLeads: Lead[] = [];
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        
        if (parts.length >= 1) {
            const name = parts[0] || 'Unknown Prospect';
            const title = parts[1] || 'Contact';
            const company = parts[2] || 'Unknown Co';
            const phone = parts[3] || '';

            const uniqueId = `lead-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`;

            newLeads.push({
              id: uniqueId,
              name,
              title,
              company,
              phone,
              status: 'New',
              lastActivity: 'Just imported',
              personaPrompt: `You are ${name}, ${title} at ${company}.`
            });
        }
      }
      
      if (newLeads.length > 0) {
        onImport(newLeads);
      } else {
        alert("No valid leads found in CSV.");
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Manual Dialer Section */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center">
            <Phone size={16} className="mr-2 text-blue-600" />
            Quick Dial
          </h3>
          <span className="text-xs text-slate-500">
            Using: {twilioNumbers.find(n => n.id === selectedNumberId)?.label || 'Select number'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Name (optional)"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="tel"
            placeholder="Phone number (e.g., +1234567890)"
            value={manualPhoneNumber}
            onChange={(e) => formatPhoneInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualCall()}
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
          />
          <button
            type="button"
            onClick={handleManualCall}
            disabled={!manualPhoneNumber.trim() || twilioNumbers.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-md shadow-sm transition-colors"
          >
            <Phone size={16} />
            <span>Call Now</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
             <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
              {leads.length} Leads
             </span>
             {selectedIds.size > 0 && (
               <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                 {selectedIds.size} Selected
               </span>
             )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
           {selectedIds.size > 0 && (
              <button 
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center space-x-1 px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium rounded-md transition-colors"
              >
                <Trash2 size={16} />
                <span>Delete Selected</span>
              </button>
           )}

          <div className="relative">
             <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-md px-3 py-2 hover:border-blue-400 transition-colors">
                <Phone size={16} className="text-slate-500" />
                <select 
                  value={selectedNumberId} 
                  onChange={(e) => onSelectNumber(e.target.value)}
                  className="appearance-none bg-transparent text-sm text-slate-700 font-medium outline-none cursor-pointer pr-6 min-w-[140px]"
                >
                  {twilioNumbers.map(num => (
                    <option key={num.id} value={num.id}>
                      {num.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
             </div>
          </div>

           {/* AI Prioritize */}
           <button 
            type="button"
            onClick={handleAiPrioritize}
            className="flex items-center space-x-2 px-3 py-2 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-sm font-medium rounded-md transition-colors"
            title="Sort by AI Score"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">AI Prioritize</span>
          </button>

          {/* Parallel Toggle */}
          <button 
            type="button"
            onClick={() => setIsParallelMode(!isParallelMode)}
            className={`flex items-center space-x-2 px-3 py-2 border text-sm font-medium rounded-md transition-colors ${
              isParallelMode 
                ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers size={16} />
            <span className="hidden sm:inline">Parallel: {isParallelMode ? 'ON (3x)' : 'OFF'}</span>
          </button>
          
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-md transition-colors"
          >
            <Upload size={16} />
            <span>Import</span>
          </button>

          <button 
            type="button"
            onClick={handlePowerDial}
            className={`flex items-center space-x-2 px-4 py-2 text-white text-sm font-bold rounded-md shadow-sm transition-transform active:scale-95 ${
              isParallelMode 
               ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' 
               : 'bg-green-600 hover:bg-green-700 shadow-green-200'
            }`}
          >
             <Zap size={16} className="fill-current" />
             <span>
               {selectedIds.size > 0 
                  ? `Dial (${selectedIds.size})` 
                  : isParallelMode ? 'Start Parallel Dial' : 'Start Power Dial'}
             </span>
          </button>
        </div>
      </div>

      {/* Header Row */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider items-center">
        <div className="col-span-1 flex justify-center">
           <input 
             type="checkbox" 
             className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
             checked={isAllSelected}
             onChange={toggleSelectAll}
           />
        </div>
        <div className="col-span-3">Prospect</div>
        <div className="col-span-3">Company</div>
        <div className="col-span-2">Phone</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* Lead List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <Filter size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-600">No leads found</h3>
                <p className="text-sm text-slate-400 mb-4">Adjust filters or import a CSV file.</p>
                <button 
                   type="button"
                   onClick={() => fileInputRef.current?.click()}
                   className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                >
                  Upload CSV
                </button>
            </div>
        ) : (
        filteredLeads.map((lead) => (
          <div 
            key={lead.id} 
            className={`grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-100 transition-colors items-center group ${
               selectedIds.has(lead.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50'
            }`}
          >
            <div className="col-span-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
               <input 
                 type="checkbox" 
                 className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 checked={selectedIds.has(lead.id)}
                 onChange={() => toggleSelectRow(lead.id)}
               />
            </div>
            <div className="col-span-3">
              <div className="font-semibold text-slate-900 text-sm">{lead.name}</div>
              <div className="text-xs text-slate-500 truncate">{lead.title}</div>
            </div>
            <div className="col-span-3 text-sm text-slate-700 truncate">
              {lead.company}
            </div>
            <div className="col-span-2 text-sm text-slate-600 font-mono">
              {lead.phone}
            </div>
            <div className="col-span-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                lead.status === 'Qualified' ? 'bg-green-100 text-green-800' :
                lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {lead.status}
              </span>
            </div>
            <div className="col-span-1 flex justify-end space-x-2">
               <button 
                 type="button"
                 onClick={(e) => handleDeleteSingle(e, lead.id, lead.name)}
                 className="flex items-center justify-center w-8 h-8 bg-white border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded shadow-sm transition-colors"
                 title="Delete"
               >
                 <Trash2 size={14} />
               </button>
               <button 
                 type="button"
                 onClick={() => onCall(lead)}
                 className="flex items-center justify-center w-8 h-8 bg-slate-800 hover:bg-slate-900 text-white rounded shadow-sm transition-colors"
                 title="Call Now"
               >
                 <Phone size={14} />
               </button>
            </div>
          </div>
        )))}
      </div>
      
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
        <span>{selectedIds.size} selected</span>
        <span>{isParallelMode ? 'Parallel Dialing (3x)' : 'Single Line Dialing'}</span>
      </div>
    </div>
  );
};

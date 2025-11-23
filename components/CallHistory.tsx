import React, { useEffect, useState, useRef } from 'react';
import { Phone, Clock, User, Calendar, TrendingUp, TrendingDown, Minus, Play, Pause, Download, Volume2 } from 'lucide-react';
import callRecordingService from '../services/callRecording';

interface CallRecord {
  id: string;
  userId: string;
  twilioSid: string | null;
  to: string;
  from: string;
  contactName: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration: number;
  recordingUrl?: string;
  recordingSid?: string;
  outcome?: string;
  voicemailDetected?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CallHistory: React.FC = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [loadingRecording, setLoadingRecording] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://salescallagent.my/api';
      
      const response = await fetch(`${apiUrl}/calls/history?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch call history');
      }

      const data = await response.json();
      setCalls(data.calls || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed' || statusLower === 'answered') return 'text-green-600 bg-green-50';
    if (statusLower === 'busy' || statusLower === 'failed' || statusLower === 'no-answer') return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed' || statusLower === 'answered') return <TrendingUp size={14} />;
    if (statusLower === 'busy' || statusLower === 'failed' || statusLower === 'no-answer') return <TrendingDown size={14} />;
    return <Minus size={14} />;
  };

  const handlePlayRecording = async (call: CallRecord) => {
    if (!call.recordingSid) {
      alert('No recording available for this call');
      return;
    }

    try {
      setLoadingRecording(call.id);

      if (playingCallId === call.id && audioRef.current) {
        // Pause if already playing
        audioRef.current.pause();
        setPlayingCallId(null);
      } else {
        // Fetch recording URL
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No auth token');

        const url = await callRecordingService.getRecordingUrl(call.id, token);
        
        // Play recording
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setPlayingCallId(call.id);

          audioRef.current.onended = () => {
            setPlayingCallId(null);
          };
        }
      }
    } catch (error: any) {
      console.error('Error playing recording:', error);
      alert(error.message || 'Failed to play recording');
    } finally {
      setLoadingRecording(null);
    }
  };

  const handleDownloadRecording = async (call: CallRecord) => {
    if (!call.recordingSid) {
      alert('No recording available for this call');
      return;
    }

    try {
      setLoadingRecording(call.id);

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const url = await callRecordingService.getRecordingUrl(call.id, token);
      
      // Download
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${call.contactName}-${new Date(call.createdAt).toISOString()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading recording:', error);
      alert(error.message || 'Failed to download recording');
    } finally {
      setLoadingRecording(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full p-8 bg-slate-50 overflow-auto">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Call History</h1>
          <p className="text-slate-600">View all your past calls and activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-1">Total Calls</p>
                <p className="text-3xl font-bold text-slate-800">{total}</p>
              </div>
              <Phone className="text-blue-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">
                  {calls.filter(c => c.status.toLowerCase() === 'completed').length}
                </p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-1">Avg Duration</p>
                <p className="text-3xl font-bold text-slate-800">
                  {formatDuration(Math.round(calls.reduce((acc, c) => acc + c.duration, 0) / (calls.length || 1)))}
                </p>
              </div>
              <Clock className="text-purple-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-1">Today</p>
                <p className="text-3xl font-bold text-blue-600">
                  {calls.filter(c => {
                    const callDate = new Date(c.createdAt);
                    const today = new Date();
                    return callDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <Calendar className="text-blue-500" size={32} />
            </div>
          </div>
        </div>

        {/* Call List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Recent Calls</h2>
          </div>

          {calls.length === 0 ? (
            <div className="p-12 text-center">
              <Phone className="mx-auto text-slate-300 mb-4" size={64} />
              <p className="text-slate-500 text-lg">No calls yet</p>
              <p className="text-slate-400 text-sm mt-2">Your call history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {calls.map((call) => (
                <div key={call.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`p-3 rounded-full ${call.direction === 'outbound' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        <Phone size={20} className={call.direction === 'outbound' ? 'text-blue-600' : 'text-green-600'} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-slate-800">{call.contactName}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(call.status)}`}>
                            {getStatusIcon(call.status)}
                            {call.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {call.to}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDuration(call.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(call.createdAt)}
                          </span>
                          {call.voicemailDetected && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 font-medium">
                              Voicemail
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {call.recordingSid && (
                        <>
                          <button
                            onClick={() => handlePlayRecording(call)}
                            disabled={loadingRecording === call.id}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                            title={playingCallId === call.id ? 'Pause' : 'Play Recording'}
                          >
                            {loadingRecording === call.id ? (
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : playingCallId === call.id ? (
                              <Pause size={18} className="text-blue-600" />
                            ) : (
                              <Play size={18} className="text-blue-600" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleDownloadRecording(call)}
                            disabled={loadingRecording === call.id}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                            title="Download Recording"
                          >
                            <Download size={18} className="text-slate-600" />
                          </button>
                        </>
                      )}

                      <div className="text-right ml-4">
                        <span className="text-xs text-slate-400 uppercase">
                          {call.direction}
                        </span>
                        {call.recordingSid && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                            <Volume2 size={12} />
                            Recorded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

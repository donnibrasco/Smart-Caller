import React, { useState, useEffect } from 'react';
import { Phone, Pause, Play, SkipForward, Square, Upload, Trash2, TrendingUp, AlertCircle } from 'lucide-react';
import powerDialerService, { PowerDialerSession, QueueItem, PowerDialerStats } from '../services/powerDialer';
import { formatPhoneNumber } from '../utils/phoneUtils';

export const PowerDialer: React.FC = () => {
  const [session, setSession] = useState<PowerDialerSession | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [totalQueue, setTotalQueue] = useState(0);
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    loadQueue();

    // Set up event listeners
    powerDialerService.on('sessionStarted', handleSessionUpdate);
    powerDialerService.on('sessionPaused', handleSessionUpdate);
    powerDialerService.on('sessionResumed', handleSessionUpdate);
    powerDialerService.on('sessionStopped', handleSessionStopped);
    powerDialerService.on('queueUpdated', loadQueue);

    // Poll for status updates
    const interval = setInterval(loadStatus, 3000);

    return () => {
      powerDialerService.off('sessionStarted', handleSessionUpdate);
      powerDialerService.off('sessionPaused', handleSessionUpdate);
      powerDialerService.off('sessionResumed', handleSessionUpdate);
      powerDialerService.off('sessionStopped', handleSessionStopped);
      clearInterval(interval);
    };
  }, []);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const loadStatus = async () => {
    try {
      const status = await powerDialerService.getStatus();
      setIsActive(status.active);
      if (status.session) {
        setSession(status.session);
      } else {
        // Backend reports no active session - reset frontend state
        setSession(null);
        setIsActive(false);
      }
    } catch (error: any) {
      console.error('Error loading status:', error);
      // Don't show error for polling failures
    }
  };

  const loadQueue = async () => {
    try {
      const result = await powerDialerService.getQueue('pending');
      setQueue(result.queue);
      setTotalQueue(result.total);
    } catch (error: any) {
      console.error('Error loading queue:', error);
    }
  };

  const handleSessionUpdate = (updatedSession: PowerDialerSession) => {
    setSession(updatedSession);
  };

  const handleSessionStopped = () => {
    setSession(null);
    setIsActive(false);
    loadQueue();
    showSuccess('Power dialer session stopped');
  };

  const handleStart = async () => {
    try {
      if (totalQueue === 0) {
        showError('Please add phone numbers to the queue before starting');
        return;
      }

      setLoading(true);
      setError(null);
      await powerDialerService.startSession(campaignId || undefined);
      setIsActive(true);
      showSuccess('Power dialer started successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to start power dialer');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setLoading(true);
      setError(null);
      await powerDialerService.pauseSession();
      showSuccess('Power dialer paused');
    } catch (error: any) {
      showError(error.message || 'Failed to pause power dialer');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      setError(null);
      await powerDialerService.resumeSession();
      showSuccess('Power dialer resumed');
    } catch (error: any) {
      showError(error.message || 'Failed to resume power dialer');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      setError(null);
      await powerDialerService.skipCurrent();
      showSuccess('Call skipped');
    } catch (error: any) {
      showError(error.message || 'Failed to skip call');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      setError(null);
      await powerDialerService.stopSession();
      showSuccess('Power dialer stopped');
      setIsActive(false);
      setSession(null);
      loadQueue();
    } catch (error: any) {
      showError(error.message || 'Failed to stop power dialer');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumbers = async () => {
    try {
      if (!phoneNumbers.trim()) {
        alert('Please enter phone numbers');
        return;
      }

      setLoading(true);
      const numbers = phoneNumbers
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(number => formatPhoneNumber(number)); // Format to E.164

      await powerDialerService.addToQueue(numbers, campaignId || undefined);
      setPhoneNumbers('');
      loadQueue();
      alert(`Added ${numbers.length} numbers to queue`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const items = await powerDialerService.importFromCSV(file, campaignId || undefined);
      loadQueue();
      alert(`Imported ${items.length} contacts`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleClearQueue = async () => {
    if (!confirm('Are you sure you want to clear the entire queue?')) return;

    try {
      setLoading(true);
      const deleted = await powerDialerService.clearQueue(campaignId || undefined);
      loadQueue();
      alert(`Cleared ${deleted} items from queue`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const stats: PowerDialerStats = session?.stats || {
    totalCalls: 0,
    connected: 0,
    voicemail: 0,
    noAnswer: 0,
    failed: 0,
    busy: 0
  };

  const connectRate = stats.totalCalls > 0 
    ? ((stats.connected / stats.totalCalls) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Power Dialer</h1>
          <p className="text-gray-600">Automated calling with voicemail detection</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <TrendingUp className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900">Success</p>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Calls</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCalls}</p>
              </div>
              <Phone className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connected</p>
                <p className="text-3xl font-bold text-green-600">{stats.connected}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Voicemail</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.voicemail}</p>
              </div>
              <Phone className="w-10 h-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">No Answer</p>
                <p className="text-3xl font-bold text-gray-600">{stats.noAnswer}</p>
              </div>
              <Phone className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connect Rate</p>
                <p className="text-3xl font-bold text-indigo-600">{connectRate}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-indigo-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Controls</h2>

              {/* Campaign ID */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign ID (Optional)
                </label>
                <input
                  type="text"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  placeholder="my-campaign"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isActive}
                />
              </div>

              {/* Current Call Info */}
              {session?.currentCall && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Currently Calling:</p>
                  <p className="text-lg font-bold text-blue-700">
                    {session.currentCall.phoneNumber || 'Unknown'}
                  </p>
                </div>
              )}

              {/* Control Buttons */}
              <div className="space-y-3">
                {!isActive ? (
                  <button
                    onClick={handleStart}
                    disabled={loading || totalQueue === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold py-4 px-6 rounded-lg flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    <Play className="w-6 h-6" />
                    START POWER DIALER
                  </button>
                ) : (
                  <>
                    {session?.isPaused ? (
                      <button
                        onClick={handleResume}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-6 rounded-lg flex items-center justify-center gap-3 text-lg shadow-lg"
                      >
                        <Play className="w-6 h-6" />
                        RESUME DIALING
                      </button>
                    ) : (
                      <button
                        onClick={handlePause}
                        disabled={loading}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-extrabold py-4 px-6 rounded-lg flex items-center justify-center gap-3 text-lg shadow-lg"
                      >
                        <Pause className="w-6 h-6" />
                        PAUSE DIALING
                      </button>
                    )}

                    <button
                      onClick={handleSkip}
                      disabled={loading || !session?.currentCall}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-4 px-6 rounded-lg flex items-center justify-center gap-3 text-lg disabled:opacity-50 shadow-lg"
                    >
                      <SkipForward className="w-6 h-6" />
                      SKIP CURRENT CALL
                    </button>

                    <button
                      onClick={handleStop}
                      disabled={loading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-4 px-6 rounded-lg flex items-center justify-center gap-3 text-lg shadow-lg animate-pulse"
                    >
                      <Square className="w-6 h-6" />
                      STOP DIALER
                    </button>
                  </>
                )}
              </div>

              {/* Status */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-bold ${
                    isActive 
                      ? session?.isPaused ? 'text-yellow-600' : 'text-green-600'
                      : 'text-gray-600'
                  }`}>
                    {isActive 
                      ? session?.isPaused ? 'Paused' : 'Active'
                      : 'Stopped'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Queue Size:</span>
                  <span className="font-bold text-gray-900">{totalQueue}</span>
                </div>
              </div>
            </div>

            {/* Add Numbers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add Numbers</h2>

              <textarea
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="+15551234567&#10;+15559876543&#10;..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
                disabled={loading}
              />

              <button
                onClick={handleAddNumbers}
                disabled={loading || !phoneNumbers.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
              >
                <Phone className="w-5 h-5" />
                Add to Queue
              </button>

              <label className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                  disabled={loading}
                />
              </label>

              <button
                onClick={handleClearQueue}
                disabled={loading || totalQueue === 0}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                Clear Queue
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Call Queue ({totalQueue} pending)
              </h2>

              <div className="overflow-y-auto max-h-[600px]">
                {queue.length === 0 ? (
                  <div className="text-center py-12">
                    <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No numbers in queue</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Add phone numbers to start dialing
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((item, index) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border-2 ${
                          item.status === 'calling'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-gray-500">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="font-bold text-gray-900">
                                {item.phoneNumber}
                              </p>
                              {item.contactName && (
                                <p className="text-sm text-gray-600">
                                  {item.contactName}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              item.status === 'calling' ? 'bg-blue-100 text-blue-800' :
                              item.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                              item.status === 'completed' ? 'bg-green-100 text-green-800' :
                              item.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status}
                            </span>
                            {item.attemptCount > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Attempts: {item.attemptCount}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerDialer;

import React, { useState, useEffect } from 'react';
import { Phone, Delete, User } from 'lucide-react';
import { PhoneNumber } from '../types';
import { formatPhoneNumber } from '../utils/phoneUtils';
import { SignalWireVoiceService } from '../services/signalwireVoice';

const voiceService = new SignalWireVoiceService();

interface ManualDialerProps {
  twilioNumbers: PhoneNumber[];
  onCall: (phoneNumber: string, name: string, callerId: PhoneNumber) => void;
}

export const ManualDialer: React.FC<ManualDialerProps> = ({ twilioNumbers, onCall }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [selectedCallerId, setSelectedCallerId] = useState<PhoneNumber | null>(
    twilioNumbers.length > 0 ? twilioNumbers[0] : null
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState('');

  useEffect(() => {
    let isMounted = true;
    let initializationTimeout: number | undefined;

    const markInitialized = () => {
      if (isMounted) {
        setIsInitialized(true);
      }
    };

    // Initialize SignalWire voice service for browser calling
    const initializeVoice = async () => {
      if (!isMounted) return;
      try {
        const initialized = await voiceService.initialize('');
        markInitialized();
        if (initialized) {
          console.log('[ManualDialer] Voice service initialized - browser calling ready!');
        } else {
          console.log('[ManualDialer] Voice service not ready yet - will retry when needed');
        }
      } catch (error) {
        console.warn('[ManualDialer] Voice initialization skipped:', error);
        markInitialized();
      }
    };

    // Small delay to ensure auth token is loaded
    initializationTimeout = window.setTimeout(initializeVoice, 500);
    
    // Re-initialize if storage changes (user logs in)
    const attemptReinit = (_event?: Event) => {
      if (!isMounted) return;
      if (localStorage.getItem('token')) {
        console.log('[ManualDialer] Auth token detected, re-initializing voice...');
        window.clearTimeout(initializationTimeout);
        initializationTimeout = window.setTimeout(initializeVoice, 200);
      }
    };
    
    window.addEventListener('storage', attemptReinit);
    window.addEventListener('voice-auth-ready', attemptReinit as EventListener);

    // Set up callbacks
    voiceService.onConnect = () => {
      if (!isMounted) return;
      setIsCallActive(true);
      setCallStatus('Connected - Audio streaming in browser');
    };

    voiceService.onDisconnect = () => {
      if (!isMounted) return;
      setIsCallActive(false);
      setCallStatus('');
      setPhoneNumber('');
      setContactName('');
    };

    voiceService.onError = (error) => {
      if (!isMounted) return;
      setCallStatus(`Error: ${error}`);
      setIsCallActive(false);
    };

    return () => {
      isMounted = false;
      window.removeEventListener('storage', attemptReinit);
      window.removeEventListener('voice-auth-ready', attemptReinit as EventListener);
      if (initializationTimeout) {
        window.clearTimeout(initializationTimeout);
      }
      voiceService.destroy();
    };
  }, []);

  const handleKeypadClick = (digit: string) => {
    if (phoneNumber.length < 15) {
      setPhoneNumber(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneNumber('');
    setContactName('');
  };

  const formatPhoneDisplay = (num: string) => {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handleCall = async () => {
    if (!phoneNumber || !selectedCallerId) return;
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setCallStatus('Initiating call...');
      
      // Use phone formatting utility to ensure E.164 format
      const formattedNumber = formatPhoneNumber(phoneNumber);
      const name = contactName.trim() || 'Manual Call';
      
      // Make browser call - audio will stream through browser
      await voiceService.makeCall(
        formattedNumber,
        selectedCallerId.number,
        name
      );
      
      setCallStatus('Calling... Listen for audio in your browser!');
    } catch (error: any) {
      console.error('[ManualDialer] Call failed:', error);
      setCallStatus(`Call failed: ${error.message}`);
      setTimeout(() => setCallStatus(''), 3000);
    }
  };

  const handleHangup = async () => {
    await voiceService.hangup();
    setIsCallActive(false);
    setCallStatus('');
  };

  const keypadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Manual Dialer</h1>
          <p className="text-slate-600">Enter a phone number and make a call</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Contact Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Name (Optional)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Enter contact name"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Phone Number Display */}
          <div className="mb-8">
            <div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200">
              <div className="text-center">
                <div className="text-3xl font-mono font-semibold text-slate-800 min-h-[40px] tracking-wider">
                  {formatPhoneDisplay(phoneNumber) || 'Enter Number'}
                </div>
              </div>
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {keypadButtons.map((row, rowIndex) => (
              <React.Fragment key={rowIndex}>
                {row.map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleKeypadClick(digit)}
                    className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl p-6 text-2xl font-semibold text-slate-800 transition-all transform hover:scale-105 active:scale-95 shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleBackspace}
              className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-xl font-semibold transition-all"
            >
              <Delete size={20} />
              Backspace
            </button>
            <button
              onClick={handleClear}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-xl font-semibold transition-all"
            >
              Clear
            </button>
          </div>

          {/* Caller ID Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Call From
            </label>
            <select
              value={selectedCallerId?.sid || ''}
              onChange={(e) => {
                const selected = twilioNumbers.find(n => n.sid === e.target.value);
                setSelectedCallerId(selected || null);
              }}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {twilioNumbers.map((number) => (
                <option key={number.sid} value={number.sid}>
                  {number.number} {number.label ? `(${number.label})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Call Button - Always Visible */}
          <button
            onClick={isCallActive ? handleHangup : handleCall}
            disabled={!isInitialized || (!isCallActive && (phoneNumber.replace(/\D/g, '').length < 10 || !selectedCallerId))}
            className={`w-full py-6 rounded-xl font-bold text-xl transition-all shadow-lg flex items-center justify-center gap-3 ${
              isCallActive
                ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                : !isInitialized
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : phoneNumber.replace(/\D/g, '').length >= 10 && selectedCallerId
                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer animate-pulse'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            <Phone size={28} className={isCallActive ? 'animate-bounce' : ''} />
            <span className="font-extrabold">
              {isCallActive 
                ? 'HANG UP' 
                : !isInitialized 
                ? 'INITIALIZING...' 
                : phoneNumber.replace(/\D/g, '').length < 10 
                ? `ENTER ${10 - phoneNumber.replace(/\D/g, '').length} MORE DIGITS` 
                : 'CALL NOW'}
            </span>
          </button>
          
          {/* Call Status */}
          {callStatus && (
            <div className={`mt-4 p-4 rounded-lg text-center font-medium ${
              callStatus.includes('Error') || callStatus.includes('failed')
                ? 'bg-red-100 text-red-700 border border-red-300'
                : callStatus.includes('Connected')
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-100 text-blue-700 border border-blue-300'
            }`}>
              {callStatus}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Enter a 10-digit US phone number</li>
            <li>• Use the keypad or type directly in the name field</li>
            <li>• Select which Twilio number to call from</li>
            <li>• Add a contact name to help identify the call</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
// Force rebuild Tue Nov 25 05:33:43 PM UTC 2025

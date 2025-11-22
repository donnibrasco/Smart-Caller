import React, { useState } from 'react';
import { Phone, Delete, User } from 'lucide-react';
import { PhoneNumber } from '../types';

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

  const handleCall = () => {
    if (!phoneNumber || !selectedCallerId) return;
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    const formattedNumber = `+1${cleaned}`;
    const name = contactName.trim() || 'Manual Call';
    
    onCall(formattedNumber, name, selectedCallerId);
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

          {/* Call Button */}
          <button
            onClick={handleCall}
            disabled={phoneNumber.replace(/\D/g, '').length < 10 || !selectedCallerId}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-slate-300 disabled:to-slate-400 text-white py-5 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
          >
            <Phone size={24} />
            {phoneNumber.replace(/\D/g, '').length < 10 ? 'Enter Phone Number' : 'Make Call'}
          </button>
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

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Call = sequelize.define('Call', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  twilioSid: { type: DataTypes.STRING, unique: true }, // SignalWire uses Twilio-compatible SID format
  to: { type: DataTypes.STRING, allowNull: false },
  from: { type: DataTypes.STRING, allowNull: false },
  contactName: { type: DataTypes.STRING },
  direction: { type: DataTypes.ENUM('inbound', 'outbound'), defaultValue: 'outbound' },
  status: { type: DataTypes.STRING, defaultValue: 'queued' },
  duration: { type: DataTypes.INTEGER, defaultValue: 0 },
  recordingUrl: { type: DataTypes.STRING },
  recordingSid: { type: DataTypes.STRING },
  recordingDuration: { type: DataTypes.INTEGER },
  recordingStatus: { type: DataTypes.STRING },
  outcome: { 
    type: DataTypes.ENUM('connected', 'voicemail', 'no-answer', 'busy', 'failed', 'answered'),
    defaultValue: 'answered'
  },
  voicemailDetected: { type: DataTypes.BOOLEAN, defaultValue: false },
  voicemailConfidence: { type: DataTypes.FLOAT }, // Confidence score 0-1
  powerDialerQueueId: { type: DataTypes.UUID },
  notes: { type: DataTypes.TEXT },
  sentiment: { type: DataTypes.STRING }
}, {
  indexes: [
    { fields: ['userId', 'createdAt'] },
    { fields: ['outcome'] },
    { fields: ['voicemailDetected'] }
  ]
});

module.exports = Call;
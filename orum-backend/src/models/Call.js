const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Call = sequelize.define('Call', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  twilioSid: { type: DataTypes.STRING, unique: true },
  direction: { type: DataTypes.ENUM('inbound', 'outbound'), defaultValue: 'outbound' },
  status: { type: DataTypes.STRING, defaultValue: 'queued' },
  duration: { type: DataTypes.INTEGER, defaultValue: 0 },
  recordingUrl: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  sentiment: { type: DataTypes.STRING }
});

module.exports = Call;
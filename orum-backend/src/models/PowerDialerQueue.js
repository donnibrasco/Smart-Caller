const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PowerDialerQueue = sequelize.define('PowerDialerQueue', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  phoneNumber: { type: DataTypes.STRING, allowNull: false },
  contactName: { type: DataTypes.STRING },
  status: { 
    type: DataTypes.ENUM('pending', 'calling', 'completed', 'failed', 'skipped'), 
    defaultValue: 'pending' 
  },
  attemptCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastAttemptAt: { type: DataTypes.DATE },
  nextRetryAt: { type: DataTypes.DATE },
  priority: { type: DataTypes.INTEGER, defaultValue: 0 },
  metadata: { type: DataTypes.JSON }, // Store custom fields from CRM
  campaignId: { type: DataTypes.STRING },
  outcome: { 
    type: DataTypes.ENUM('connected', 'voicemail', 'no-answer', 'busy', 'failed', 'pending'),
    defaultValue: 'pending'
  },
  notes: { type: DataTypes.TEXT }
}, {
  indexes: [
    { fields: ['userId', 'status'] },
    { fields: ['campaignId'] },
    { fields: ['nextRetryAt'] }
  ]
});

module.exports = PowerDialerQueue;

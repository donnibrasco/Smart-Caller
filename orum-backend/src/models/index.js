const sequelize = require('../config/database');
const User = require('./User');
const Call = require('./Call');
const PowerDialerQueue = require('./PowerDialerQueue');

User.hasMany(Call);
Call.belongsTo(User);

User.hasMany(PowerDialerQueue);
PowerDialerQueue.belongsTo(User);

Call.belongsTo(PowerDialerQueue, { foreignKey: 'powerDialerQueueId', as: 'queueItem' });
PowerDialerQueue.hasMany(Call, { foreignKey: 'powerDialerQueueId', as: 'calls' });

const db = {
  sequelize,
  User,
  Call,
  PowerDialerQueue
};

module.exports = db;
const sequelize = require('../config/database');
const User = require('./User');
const Call = require('./Call');

User.hasMany(Call);
Call.belongsTo(User);

const db = {
  sequelize,
  User,
  Call
};

module.exports = db;
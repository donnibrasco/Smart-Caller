#!/usr/bin/env node
require('dotenv').config();
const db = require('./src/models');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Test connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync all models (creates tables if they don't exist)
    await db.sequelize.sync({ force: false, alter: true });
    console.log('✅ Database tables synchronized');
    
    // Check if admin user exists
    const adminExists = await db.User.findOne({ where: { email: 'admin@salescallagent.my' } });
    
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('Admin123!', 10);
      
      await db.User.create({
        email: 'admin@salescallagent.my',
        password: hashedPassword,
        name: 'Admin User',
        role: 'manager'
      });
      console.log('✅ Admin user created');
      console.log('   Email: admin@salescallagent.my');
      console.log('   Password: Admin123!');
    } else {
      console.log('ℹ️  Admin user already exists');
    }
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

#!/usr/bin/env node

/**
 * Database Migration Script
 * Safely applies schema changes to the database
 */

const { sequelize, User, Call, PowerDialerQueue } = require('../src/models');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...\n');

    // Test connection
    console.log('📡 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Show current tables
    const [tables] = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    console.log('📋 Current tables:', tables.map(t => t.tablename).join(', '), '\n');

    // Sync models with alter (safer than force)
    console.log('🔧 Applying schema changes (alter mode)...');
    await sequelize.sync({ alter: true });
    console.log('✅ Schema synchronized successfully\n');

    // Verify models
    console.log('🔍 Verifying models...');
    
    const userCount = await User.count();
    console.log(`  Users: ${userCount} records`);
    
    const callCount = await Call.count();
    console.log(`  Calls: ${callCount} records`);
    
    const queueCount = await PowerDialerQueue.count();
    console.log(`  PowerDialerQueue: ${queueCount} records`);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('  1. Rebuild Docker containers: docker compose build app');
    console.log('  2. Restart services: docker compose up -d app');
    console.log('  3. Check logs: docker logs -f orum-backend-app-1\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migration
migrate();

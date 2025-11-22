const bcrypt = require('bcryptjs');
const db = require('./src/models');

async function testLogin() {
  try {
    await db.sequelize.sync();
    
    const email = 'admin@salescallagent.my';
    const password = 'Admin123!';
    
    // Find user
    const user = await db.User.findOne({ where: { email } });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found:', user.email);
    console.log('Stored password hash:', user.password);
    
    // Test password
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      // Reset password
      const newHash = await bcrypt.hash(password, 10);
      console.log('New hash:', newHash);
      await user.update({ password: newHash });
      console.log('✅ Password reset');
      
      // Test again
      const isValidNow = await bcrypt.compare(password, newHash);
      console.log('New password valid:', isValidNow);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();

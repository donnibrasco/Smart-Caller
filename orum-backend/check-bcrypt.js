const bcrypt = require('bcryptjs');
const db = require('./src/models');

async function checkPassword() {
  try {
    await db.sequelize.sync();
    
    const email = 'test@test.com';
    const password = 'Test123!';
    
    // Create test user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Delete if exists
    await db.User.destroy({ where: { email } });
    
    const user = await db.User.create({
      email,
      password: hashedPassword,
      name: 'Test User',
      role: 'agent'
    });
    
    console.log('✅ Test user created');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Hash:', hashedPassword);
    
    // Test password
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', isValid);
    
    // Test via API simulation
    const fetchedUser = await db.User.findOne({ where: { email } });
    const isValidFetched = await bcrypt.compare(password, fetchedUser.password);
    console.log('Fetched user password valid:', isValidFetched);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPassword();

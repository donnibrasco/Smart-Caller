const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthService {
  generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  async login(email, password) {
    // Need to include password field for validation
    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user || !(await user.validatePassword(password))) {
      throw new Error('Invalid credentials');
    }
    const token = this.generateToken(user);
    return { user, token };
  }

  async register(data) {
    const exists = await User.findOne({ where: { email: data.email } });
    if (exists) throw new Error('User already exists');
    const user = await User.create(data);
    const token = this.generateToken(user);
    return { user, token };
  }
}

module.exports = new AuthService();
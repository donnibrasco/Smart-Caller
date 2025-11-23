const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: 'No authorization header provided',
        code: 'AUTH_HEADER_MISSING'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_PAYLOAD'
      });
    }

    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'name', 'role']
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found or deleted',
        code: 'USER_NOT_FOUND'
      });
    }
    
    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    console.error('[AuthMiddleware] Error:', err);
    res.status(401).json({ 
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};
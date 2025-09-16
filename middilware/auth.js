// middleware/auth.js
const jwt = require('jsonwebtoken');

function auth() {
  return (req, res, next) => {
    try {
      console.log('=== AUTH MIDDLEWARE DEBUG ===');
      console.log('Headers:', req.headers);
      
      const hdr = req.headers.authorization || req.headers.Authorization || '';
      console.log('Authorization header:', hdr);
      
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
      console.log('Extracted token:', token ? token.substring(0, 20) + '...' : 'No token');

      if (!token) {
        console.log('No token found');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret'); // validates signature & exp
      console.log('Token decoded successfully:', decoded);
      console.log('Decoded token fields:', {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
        name: decoded.name
      });
      
      req.user = { 
        id: decoded.id, 
        role: decoded.role,
        email: decoded.email,
        name: decoded.name
      };
      console.log('User set in req.user:', req.user);
      
      return next();
    } catch (err) {
      console.log('Auth error:', err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  };
}


function authorize(roles = []) {
  return (req, res, next) => {
    console.log('=== AUTHORIZE MIDDLEWARE DEBUG ===');
    console.log('Required roles:', roles);
    console.log('User:', req.user);
    console.log('User role:', req.user?.role);
    
    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      console.log('User role not in required roles');
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    console.log('Authorization successful');
    return next();
  };
}

// Alias for compatibility
const authenticateToken = auth;

module.exports = { auth, authorize, authenticateToken };

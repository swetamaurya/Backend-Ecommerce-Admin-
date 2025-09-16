// middleware/auth.js
const jwt = require('jsonwebtoken');

function auth() {
  return (req, res, next) => {
    try {
      const hdr = req.headers.authorization || req.headers.Authorization || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;

      if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret'); // validates signature & exp
      req.user = { id: decoded.id, role: decoded.role };
      return next();
    } catch (err) {
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
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return next();
  };
}

// Alias for compatibility
const authenticateToken = auth;

module.exports = { auth, authorize, authenticateToken };

const jwt = require('jsonwebtoken');
const { jwtAccessSecret } = require('../config/env');

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, jwtAccessSecret);
    req.user = payload; // contains sub and role
    return next();
  } catch (_err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};



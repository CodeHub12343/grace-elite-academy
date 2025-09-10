const jwt = require('jsonwebtoken');
const { jwtAccessSecret, jwtRefreshSecret } = require('./env');

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

function signAccessToken(payload) {
  return jwt.sign(payload, jwtAccessSecret, { expiresIn: ACCESS_EXPIRES_IN });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, jwtRefreshSecret, { expiresIn: REFRESH_EXPIRES_IN });
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtAccessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, jwtRefreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
};



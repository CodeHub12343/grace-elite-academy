const path = require('path');
const dotenv = require('dotenv');

// Load .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Simple required vars guard for early feedback
const requiredVars = ['MONGO_URI'];
for (const key of requiredVars) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.warn(`Warning: Missing required env var: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
};













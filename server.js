const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('mongo-sanitize');
const cookieParser = require('cookie-parser');

// Load env early
require('./config/env');
const { connectToMongo } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
let io = null;

// Security & common middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'https://grace-elite-academy.onrender.com').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
// Note: Avoid xss-clean with Express 5; handle sanitization manually below
// Basic request sanitization wrapper (do not reassign getter-backed props)
app.use((req, _res, next) => {
  if (req.body) {
    const cleaned = mongoSanitize(req.body);
    Object.assign(req.body, cleaned);
  }
  next();
});

// Rate limiter (generic global limiter)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

// Routes
const routes = require('./routes');
app.use('/api', routes);

// Health endpoint (also top-level)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Not found and error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server after DB connection
connectToMongo()
  .then(() => {
    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${PORT}`);
    });
    // Socket.IO
    try {
      const { Server } = require('socket.io');
      const { setIO, registerConnection } = require('./utils/socket');
      io = new Server(server, { cors: { origin: allowedOrigins, credentials: true } });
      setIO(io);
      registerConnection(io);
    } catch (_e) {}
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

module.exports = app;



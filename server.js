const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { startRenewalReminder } = require('./services/cronService');

dotenv.config();

const app = express();

connectDB();

// Stripe webhook — raw body BEFORE json parser
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

// Security
app.use(helmet());
// CORS — support multiple origins safely
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  (process.env.FRONTEND_URL || '').trim(),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting — 100 requests per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter limit on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth/', authLimiter);

// Logging — only in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Routes
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/scores',        require('./routes/scoreRoutes'));
app.use('/api/draws',         require('./routes/drawRoutes'));
app.use('/api/charities',     require('./routes/charityRoutes'));
app.use('/api/winners',       require('./routes/winnerRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', env: process.env.NODE_ENV }));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  startRenewalReminder();
});

module.exports = app;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const env = require('./lib/env');
const requestLogger = require('./middleware/requestLogger');
const usersRoutes = require('./routes/users.routes');
const authRoutes = require('./routes/auth.routes');
const auditRoutes = require('./routes/audit.routes');
const healthRoutes = require('./routes/health.routes');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(requestLogger);
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
  }),
);

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-CSRF-Token'],
    maxAge: 86400,
  }),
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
    },
  }),
);

app.use(healthRoutes);

app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'User Management API',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      stats: '/api/users/stats',
      liveness: '/healthz',
      readiness: '/readyz',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit-logs', auditRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

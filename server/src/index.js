require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

// Validate critical secrets in production
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is missing in production.');
    process.exit(1);
  } else {
    console.warn('WARNING: JWT_SECRET environment variable is missing. Using development fallback.');
    process.env.JWT_SECRET = 'c26-workspace-dev-jwt-secret-do-not-use-in-production';
  }
}

const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const taskRoutes         = require('./routes/tasks');
const commentRoutes      = require('./routes/comments');
const analyticsRoutes    = require('./routes/analytics');
const departmentRoutes   = require('./routes/departments');
const worklogRoutes      = require('./routes/worklogs');
const recruitmentRoutes  = require('./routes/recruitment');
const directiveRoutes    = require('./routes/directives');
const manpowerPlanRoutes = require('./routes/manpowerPlan');
const hiringRoutes       = require('./routes/hiring');

const app = express();
const server = http.createServer(app);

// Configure allowed CORS origins
const clientUrl = process.env.CLIENT_URL;
const allowedOrigins = clientUrl
  ? clientUrl.split(',').map(u => u.trim().replace(/\/+$/, ''))
  : ['http://localhost:5173', 'http://localhost:3000'];

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Mobile apps, curl, native HTTP clients
  if (process.env.NODE_ENV !== 'production') return true;
  if (allowedOrigins.includes('*')) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  return false;
};

// Setup Socket.IO with WebSocket and Polling fallback for cloud proxies
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Provide io instance to all routes
app.set('io', io);

io.on('connection', socket => {
  console.log('Realtime client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Realtime client disconnected:', socket.id);
  });
});

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api/auth',          loginLimiter, authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/comments',      commentRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/departments',   departmentRoutes);
app.use('/api/worklogs',      worklogRoutes);
app.use('/api/recruitment',   recruitmentRoutes);
app.use('/api/directives',    directiveRoutes);
app.use('/api/manpower-plan', manpowerPlanRoutes);
app.use('/api/hiring',        hiringRoutes);

// Reliable Health Check Endpoint for Render and monitoring
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'connected';
  let dbEngine = 'PostgreSQL';

  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.startsWith('postgres')) {
      dbEngine = 'PostgreSQL';
    } else if (process.env.DATABASE_URL.startsWith('file:')) {
      dbEngine = 'SQLite';
    }
  }

  try {
    // Non-destructive probe verifying active database connectivity
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'disconnected';
    console.error('Database health check probe failed:', err.message);
  }

  const isHealthy = dbStatus === 'connected';

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'hr-c26-workforce-platform',
    version: '1.0.1',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      engine: dbEngine,
    },
    realtime: 'socket.io-enabled',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`C26 Realtime Server listening on 0.0.0.0:${PORT} (${process.env.NODE_ENV || 'development'})`);
});

// Graceful shutdown handling for Render zero-downtime rolling deploys
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Closing HTTP and Realtime server...`);
  server.close(async () => {
    console.log('HTTP server closed. Disconnecting database client...');
    await prisma.$disconnect();
    console.log('Database client disconnected. Process exiting cleanly.');
    process.exit(0);
  });
  // Force exit if connections don't drain within 10s
  setTimeout(() => {
    console.error('Forcefully terminating server after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));


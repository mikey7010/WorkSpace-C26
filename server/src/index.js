require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

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

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Provide io instance to all routes
app.set('io', io);

io.on('connection', socket => {
  console.log('Realtime client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Realtime client disconnected:', socket.id);
  });
});

app.use(cors({ origin: '*', credentials: true }));
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

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  service: 'hr-c26-workforce-platform',
  realtime: 'socket.io-enabled',
  database: process.env.DATABASE_URL?.includes('supabase') ? 'Supabase-PostgreSQL' : 'Local-SQLite',
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => console.log(`C26 Realtime Server running on http://localhost:${PORT}`));

import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import { sequelize } from './models/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initCronJobs } from './services/cronJobs.js';

// Routes
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import leaseRoutes from './routes/leases.js';
import paymentRoutes from './routes/payments.js';
import tenantRoutes from './routes/tenants.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import maintenanceRoutes from './routes/maintenance.js';
import aiRoutes from './routes/ai.js';
import webhookRoutes from './routes/webhooks.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 login attempts per hour
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui { font-family: sans-serif; } .topbar { background-color: #1b6ca8; }',
  customSiteTitle: 'Tenant API Documentation'
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Tenant Payment & Communication API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/refresh': 'Refresh token',
        'GET /api/auth/me': 'Get current user',
        'PUT /api/auth/profile': 'Update profile',
        'PUT /api/auth/change-password': 'Change password',
        'PUT /api/auth/push-token': 'Update push token'
      },
      properties: {
        'GET /api/properties': 'List properties (landlord)',
        'POST /api/properties': 'Create property',
        'GET /api/properties/:id': 'Get property details',
        'PUT /api/properties/:id': 'Update property',
        'DELETE /api/properties/:id': 'Delete property',
        'GET /api/properties/:id/units': 'List units',
        'POST /api/properties/:id/units': 'Create unit'
      },
      leases: {
        'GET /api/leases': 'List leases',
        'POST /api/leases': 'Create lease',
        'GET /api/leases/:id': 'Get lease details',
        'PUT /api/leases/:id': 'Update lease',
        'POST /api/leases/:id/terminate': 'Terminate lease',
        'GET /api/leases/tenant/current': 'Get tenant current lease'
      },
      payments: {
        'GET /api/payments': 'List payments',
        'POST /api/payments': 'Create payment',
        'GET /api/payments/:id': 'Get payment details',
        'POST /api/payments/:id/pay': 'Initiate Stripe payment',
        'POST /api/payments/:id/confirm': 'Confirm payment',
        'POST /api/payments/:id/record-manual': 'Record manual payment',
        'GET /api/payments/stats/summary': 'Get payment stats',
        'POST /api/payments/generate-monthly': 'Generate monthly payments'
      },
      tenants: {
        'GET /api/tenants': 'List tenants (landlord)',
        'GET /api/tenants/:id': 'Get tenant details',
        'POST /api/tenants/invite': 'Invite tenant',
        'GET /api/tenants/:id/payments': 'Get tenant payment history',
        'GET /api/tenants/search/available': 'Search tenants'
      },
      messages: {
        'GET /api/messages/conversations': 'List conversations',
        'POST /api/messages/conversations': 'Create conversation',
        'GET /api/messages/conversations/:id/messages': 'Get messages',
        'POST /api/messages/conversations/:id/messages': 'Send message',
        'PUT /api/messages/conversations/:id/archive': 'Archive conversation',
        'GET /api/messages/unread-count': 'Get unread count'
      },
      notifications: {
        'GET /api/notifications': 'List notifications',
        'PUT /api/notifications/:id/read': 'Mark as read',
        'PUT /api/notifications/read-all': 'Mark all as read',
        'DELETE /api/notifications/:id': 'Delete notification',
        'DELETE /api/notifications': 'Clear all notifications',
        'GET /api/notifications/unread-count': 'Get unread count',
        'PUT /api/notifications/preferences': 'Update preferences'
      },
      maintenance: {
        'GET /api/maintenance': 'List requests',
        'POST /api/maintenance': 'Create request (tenant)',
        'GET /api/maintenance/:id': 'Get request details',
        'PUT /api/maintenance/:id': 'Update request (landlord)',
        'POST /api/maintenance/:id/cancel': 'Cancel request',
        'GET /api/maintenance/stats/summary': 'Get maintenance stats'
      },
      ai: {
        'POST /api/ai/conversations/:id/summarize': 'Summarize conversation',
        'GET /api/ai/conversations/:id/suggestions': 'Get reply suggestions',
        'POST /api/ai/maintenance/analyze': 'Analyze maintenance priority',
        'GET /api/ai/leases/:id/summary': 'Generate lease summary',
        'POST /api/ai/payments/reminder-message': 'Generate reminder message'
      }
    }
  });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('[DB] Database connection established');
    if (process.env.FORCE_DB_SYNC === 'true' || process.env.DB_SYNC_ALTER === 'true') {
      console.warn('[DB] Ignoring unsafe sync environment flags. Startup never runs force/alter sync; use explicit migrations.');
    }
    console.log('[DB] Startup schema sync disabled. Run `npm run db:migrate` for safe, explicit migrations.');

    // Initialize cron jobs
    if (process.env.ENABLE_CRON !== 'false') {
      initCronJobs();
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] API docs: http://localhost:${PORT}/api`);
      console.log(`[Server] Network accessible at: http://192.168.32.74:${PORT}/api`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
};

startServer();

export default app;

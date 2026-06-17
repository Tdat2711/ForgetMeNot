// backend/src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const routes = require('./routes/index');
const { errorHandler } = require('./middleware/error.middleware');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Express app
const app = express();

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ==================== CORS CONFIGURATION - MỞ RỘNG ====================
// Cho phép tất cả origin trong development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://0.0.0.0:5000',
  // Thêm origin từ frontend nếu chạy ở port khác
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Cho phép tất cả origin trong dev
  if (process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Production: chỉ cho phép các origin cụ thể
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'test') {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      // Nếu không match, vẫn cho phép (có thể tùy chỉnh)
      res.header('Access-Control-Allow-Origin', '*');
    }
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-RateLimit-Remaining');
  
  // Xử lý preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Ngoài ra vẫn dùng cors middleware cho các header mặc định
app.use(cors({
  origin: function (origin, callback) {
    // Cho phép tất cả origin trong dev
    if (process.env.NODE_ENV === 'development' || !origin) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Tạm thời cho phép tất cả để debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining'],
  maxAge: 86400
}));

// ==================== RATE LIMITING ====================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 1 giờ.',
  },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ==================== REQUEST PARSING ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== LOGGING ====================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Log mọi request (thêm để debug)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==================== STATIC FILES ====================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== DATABASE CONNECTION ====================
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// ==================== ROUTES ====================
app.use('/api', routes);

// ==================== HEALTH CHECK ====================
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ==================== TEST ROUTE (để kiểm tra kết nối) ====================
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Kết nối thành công!',
    timestamp: new Date().toISOString()
  });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} không tồn tại`,
  });
});

// ==================== ERROR HANDLER ====================
app.use(errorHandler);

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log('🚀 ForgetMeNot Server is running!');
      console.log(`📍 URL: http://${HOST}:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health: http://${HOST}:${PORT}/api/health`);
      console.log(`🧪 Test: http://${HOST}:${PORT}/api/test`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        await prisma.$disconnect();
        console.log('Database connection closed');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();

module.exports = app;
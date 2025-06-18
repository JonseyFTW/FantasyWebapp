import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { AIManager } from './services/ai-manager';
import { createAIConfig } from './config/ai-config';
import { createAIRoutes } from './routes/ai-routes';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:4000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Request timing middleware
app.use((req, res, next) => {
  req.headers['x-start-time'] = Date.now().toString();
  next();
});

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    },
  });
});

// Metrics endpoint (basic)
app.get('/metrics', (req, res) => {
  const usage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_rss_bytes ${usage.rss}
nodejs_memory_usage_heap_total_bytes ${usage.heapTotal}
nodejs_memory_usage_heap_used_bytes ${usage.heapUsed}
nodejs_memory_usage_external_bytes ${usage.external}

# HELP nodejs_cpu_usage_microseconds CPU usage in microseconds
# TYPE nodejs_cpu_usage_microseconds counter
nodejs_cpu_usage_user_microseconds ${cpuUsage.user}
nodejs_cpu_usage_system_microseconds ${cpuUsage.system}

# HELP nodejs_uptime_seconds Node.js uptime in seconds
# TYPE nodejs_uptime_seconds gauge
nodejs_uptime_seconds ${process.uptime()}
  `.trim());
});

async function startServer() {
  try {
    console.log('🤖 Starting AI Service...');
    
    // Initialize AI Manager
    const aiConfig = createAIConfig();
    const aiManager = new AIManager(aiConfig);
    await aiManager.initialize();
    
    // Setup AI routes
    app.use('/ai', createAIRoutes(aiManager));
    
    // Global error handler
    app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            version: '1.0.0',
          },
        });
      }
    });
    
    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    });
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 AI Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Status: http://localhost:${PORT}/ai/status`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('📴 HTTP server closed');
        
        try {
          await aiManager.destroy();
          console.log('📴 AI Manager destroyed');
          process.exit(0);
        } catch (error) {
          console.error('📴 Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('📴 Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start AI Service:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Startup error:', error);
  process.exit(1);
});
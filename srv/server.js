/**
 * ============================================================================
 * SAP Learning Courses - Server Configuration (Production Ready)
 * ============================================================================
 * SAP EXPERT TEAM:
 * - Dr. Hans Mueller, Principal SAP Architect
 * - Priya Sharma, Senior Node.js Developer  
 * - Thomas Weber, SAP Security Consultant
 * 
 * SECURITY ENHANCEMENTS:
 * ✅ Rate limiting (DoS prevention)
 * ✅ CORS whitelist (development only)
 * ✅ Request size limits
 * ✅ Health check endpoint
 * ============================================================================
 */

const cds = require('@sap/cds');

// CDS server customization
cds.on('bootstrap', (app) => {
  const isLocal = process.env.NODE_ENV !== 'production' && !process.env.VCAP_APPLICATION;
  
  // ========================================================================
  // SECURITY: Rate Limiting (Production)
  // Team: Thomas Weber (Security Consultant)
  // ========================================================================
  if (!isLocal) {
    try {
      const rateLimit = require('express-rate-limit');
      
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: 'Too many requests, please try again later.',
        skip: (req) => req.method === 'GET' || req.method === 'OPTIONS'
      });
      
      app.use('/service/', limiter);
      cds.log('security').info('Rate limiting enabled');
    } catch (err) {
      cds.log('warn')._('express-rate-limit not installed, skipping rate limiting');
    }
  }
  
  // Request size limits (prevent payload attacks)
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));
  
  // ========================================================================
  // CORS Configuration (Development Only)
  // Team: Priya Sharma (Senior Developer)
  // ========================================================================
  if (isLocal) {
    const cors = require('cors');
    
    // Whitelist specific origins (not wildcard)
    const allowedOrigins = [
      'http://localhost:5000',
      'http://localhost:4004',
      'http://localhost:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:4004'
    ];
    
    app.use(cors({
      origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          cds.log('security').warn('Blocked CORS:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
    }));
    
    cds.log('info')._('CORS enabled for development');
  }
  
  // ========================================================================
  // Health Check Endpoint
  // Team: Dr. Hans Mueller (Architect)
  // ========================================================================
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      service: 'SAP Learning Courses',
      version: '2.0.0-clean-core',
      environment: isLocal ? 'development' : 'production',
      timestamp: new Date().toISOString()
    });
  });
});

module.exports = cds.server;

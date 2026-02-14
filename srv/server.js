/**
 * ============================================================================
 * SAP Learning Courses - Server Configuration (Production Ready)
 * ============================================================================
 * 
 * SECURITY:
 * ✅ Helmet (HTTP security headers)
 * ✅ Rate limiting (DoS prevention) — ON by default, disabled only in dev
 * ✅ Health check endpoint (no version/env leak in production)
 * ✅ CSRF via CAP auth middleware
 * ✅ No CORS middleware (Web Dispatcher handles prod; ui5 proxy handles dev)
 * ============================================================================
 */

const cds = require('@sap/cds');
const LOG = cds.log('sap-learning-server');

cds.on('bootstrap', (app) => {
  const isDev = (cds.env.profiles || []).includes('development');

  // ========================================================================
  // SECURITY: Helmet — HTTP security headers
  // ========================================================================
  try {
    const helmet = require('helmet');
    app.use(helmet());
    LOG.info('Helmet security headers enabled');
  } catch (err) {
    LOG.warn('helmet not installed — skipping HTTP security headers');
  }

  // ========================================================================
  // SECURITY: Rate Limiting — ON by default, disabled only in dev profile
  // ========================================================================
  if (!isDev) {
    try {
      const rateLimit = require('express-rate-limit');

      // Read-heavy limit (GET/HEAD/OPTIONS)
      const readLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many requests, please try again later.',
        skip: (req) => req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS'
      });

      // Write limit (POST/PUT/PATCH/DELETE)
      const writeLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 50,
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many write requests, please try again later.',
        skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
      });

      app.use('/service/', readLimiter);
      app.use('/service/', writeLimiter);
      LOG.info('Rate limiting enabled (GET: 200/15min, write: 50/15min)');
    } catch (err) {
      LOG.warn('express-rate-limit not installed — skipping rate limiting');
    }
  } else {
    LOG.info('Rate limiting disabled (development profile)');
  }

  // ========================================================================
  // Health Check Endpoint — no version/env disclosure in production
  // ========================================================================
  app.get('/health', (req, res) => {
    const body = {
      status: 'UP',
      timestamp: new Date().toISOString()
    };
    if (isDev) {
      body.service = 'SAP Learning Courses';
      body.version = '2.0.0-clean-core';
      body.environment = 'development';
    }
    res.status(200).json(body);
  });
});

// ========================================================================
// SECURITY GUARD: Prevent dummy/mocked auth in production
// ========================================================================
cds.on('served', () => {
  if (process.env.NODE_ENV === 'production') {
    const authKind = cds.env.requires?.auth?.kind;
    if (authKind === 'dummy' || authKind === 'mocked') {
      LOG.error(
        'FATAL: Production is using "' + authKind + '" authentication. ' +
        'Configure [production].auth.kind = "basic" or "xsuaa".'
      );
      process.exit(1);
    }
  }
});

module.exports = cds.server;

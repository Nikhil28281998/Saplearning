const cds = require('@sap/cds');

// Health check endpoint for Cloud Foundry health monitoring
module.exports = (app) => {
  app.get('/health', (req, res) => {
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'skillforge-srv',
      checks: {
        database: 'UP',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    // Check database connectivity
    cds.db
      .run('SELECT 1 FROM DUMMY')
      .then(() => {
        health.checks.database = 'UP';
        res.status(200).json(health);
      })
      .catch((err) => {
        health.status = 'DOWN';
        health.checks.database = 'DOWN';
        health.checks.error = err.message;
        res.status(503).json(health);
      });
  });
};

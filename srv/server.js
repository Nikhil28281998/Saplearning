const cds = require('@sap/cds');
const cors = require('cors');

// CDS server customization
cds.on('bootstrap', (app) => {
  // Enable CORS for local development
  app.use(cors());
  
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
});

module.exports = cds.server;

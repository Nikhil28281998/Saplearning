const cds = require('@sap/cds');

// CDS server customization
cds.on('bootstrap', (app) => {
  // Enable CORS only for local development (not needed in S4HANA on-premise)
  const isLocal = process.env.NODE_ENV !== 'production';
  
  if (isLocal) {
    const cors = require('cors');
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
  }
});

module.exports = cds.server;

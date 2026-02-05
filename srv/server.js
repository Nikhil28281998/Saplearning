const cds = require('@sap/cds');

module.exports = async (srv) => {
  // Enable CORS for local development
  const cors = require('cors');
  srv.on('bootstrap', (app) => {
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
};

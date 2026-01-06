const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

module.exports = async (server) => {
  // Serve static UI files from app/dist folder
  const appPath = path.join(__dirname, 'app', 'dist');
  
  // Serve UI5 app at root and /index.html
  server.get('/', (req, res) => {
    res.redirect('/index.html');
  });
  
  // Serve all static files from dist folder
  server.use(express.static(appPath));
  
  console.log(`[SkillForge] Serving UI from: ${appPath}`);
};

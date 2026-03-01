const { chromium } = require('playwright');

(async () => {
  try {
    const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const pages = b.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('ZLEARNING'));
    if (!page) { console.log('No page'); await b.close(); return; }
    
    console.log('URL:', page.url().substring(0,100));
    
    // Try to get console errors by checking UI5 log
    const errors = await page.evaluate(() => {
      const r = {};
      
      // Try to access sap.ui.require for log
      try {
        const Log = sap.ui.require('sap/base/Log');
        if (Log) {
          const entries = Log.getLogEntries();
          r.logEntries = entries.filter(e => e.level <= 1) // ERROR and FATAL
            .slice(-20)
            .map(e => ({ level: e.level, message: e.message?.substring(0, 200), details: e.details?.substring(0, 200) }));
          r.totalLogs = entries.length;
          r.errorCount = entries.filter(e => e.level <= 1).length;
          r.warningCount = entries.filter(e => e.level === 2).length;
        }
      } catch(e) {
        r.logError = e.message;
      }
      
      // Check component metadata  
      try {
        const comp = sap.ui.getCore().getComponent('application-ZLEARNING-display-component');
        if (comp) {
          const manifest = comp.getManifest();
          r.appId = manifest?.['sap.app']?.id;
          r.appVersion = manifest?.['sap.app']?.applicationVersion?.version;
          r.dataSources = Object.keys(manifest?.['sap.app']?.dataSources || {});
          r.routingConfig = manifest?.['sap.ui5']?.routing?.config;
          r.routes = manifest?.['sap.ui5']?.routing?.routes;
          r.targets = Object.keys(manifest?.['sap.ui5']?.routing?.targets || {});
          
          // Check if the app control exists
          const appControl = comp.getRootControl();
          if (appControl) {
            r.rootControl = { id: appControl.getId(), type: appControl.getMetadata().getName() };
            const pages = appControl.getPages ? appControl.getPages() : [];
            r.pages = pages.map(p => ({ id: p.getId(), type: p.getMetadata().getName() }));
          }
          
          // Check router
          const router = comp.getRouter();
          if (router) {
            r.routerInitialized = true;
            r.currentHash = router.getHashChanger().getHash();
          }
          
          // Check models
          const modelNames = Object.keys(comp.oModels || {});
          r.models = modelNames;
        }
      } catch(e) {
        r.componentError = e.message;
      }
      
      return r;
    });
    
    console.log('\n=== UI5 LOGS ===');
    console.log('Total logs:', errors.totalLogs);
    console.log('Errors:', errors.errorCount, 'Warnings:', errors.warningCount);
    console.log('\nRecent errors:');
    (errors.logEntries || []).forEach(e => {
      console.log(`  [${e.level === 0 ? 'FATAL' : 'ERROR'}] ${e.message}`);
      if (e.details) console.log(`    Details: ${e.details}`);
    });
    
    console.log('\n=== COMPONENT INFO ===');
    console.log('App ID:', errors.appId);
    console.log('Version:', errors.appVersion);
    console.log('Data sources:', errors.dataSources);
    console.log('Routing config:', JSON.stringify(errors.routingConfig));
    console.log('Routes:', JSON.stringify(errors.routes, null, 2));
    console.log('Targets:', errors.targets);
    console.log('Root control:', JSON.stringify(errors.rootControl));
    console.log('Pages:', JSON.stringify(errors.pages));
    console.log('Router initialized:', errors.routerInitialized);
    console.log('Current hash:', errors.currentHash);
    console.log('Models:', errors.models);
    
    if (errors.logError) console.log('Log access error:', errors.logError);
    if (errors.componentError) console.log('Component error:', errors.componentError);
    
    await b.close();
  } catch(e) {
    console.log('ERROR:', e.message);
  }
})();

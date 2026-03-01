const { chromium } = require('playwright');

(async () => {
  try {
    const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const pages = b.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('ZLEARNING'));
    if (!page) { 
      console.log('No FLP page. Available:');
      for (const p of pages) console.log(' ', p.url().substring(0,80));
      await b.close(); 
      return; 
    }
    
    console.log('Connected:', page.url().substring(0,100));
    const hash = await page.evaluate(() => window.location.hash);
    console.log('Hash:', hash);
    
    // If on Shell-home, navigate to app
    if (hash.includes('Shell-home') || !hash.includes('ZLEARNING')) {
      console.log('On home, navigating to ZLEARNING app...');
      await page.evaluate(() => { window.location.hash = '#ZLEARNING-display'; });
      await page.waitForTimeout(5000);
    }
    
    // Wait for app content to load
    await page.waitForTimeout(3000);
    
    // Check for errors first
    const errors = await page.evaluate(() => {
      try {
        var Log = sap.ui.require('sap/base/Log');
        if (Log) {
          var entries = Log.getLogEntries();
          return entries.filter(function(e) { return e.level <= 1; })
            .slice(-10)
            .map(function(e) { return { level: e.level === 0 ? 'FATAL' : 'ERROR', msg: (e.message || '').substring(0, 150) }; });
        }
      } catch(e) {}
      return [];
    });
    
    console.log('\n=== UI5 ERRORS ===');
    if (errors.length === 0) console.log('  No errors!');
    errors.forEach(function(e) { console.log('  [' + e.level + '] ' + e.msg); });
    
    // Full page inspection
    const info = await page.evaluate(() => {
      var r = {};
      r.hash = window.location.hash;
      
      // Buttons
      r.buttons = [];
      document.querySelectorAll('button').forEach(function(b) {
        if (b.offsetParent !== null) {
          var t = b.textContent.trim();
          if (t && t.length > 0 && t.length < 60) r.buttons.push(t);
        }
      });
      r.buttons = Array.from(new Set(r.buttons));
      
      // Titles  
      r.titles = [];
      document.querySelectorAll('.sapMTitle').forEach(function(t) {
        if (t.offsetParent !== null) {
          var txt = t.textContent.trim();
          if (txt) r.titles.push(txt.substring(0, 50));
        }
      });
      r.titles = Array.from(new Set(r.titles));
      
      // KPI ObjectNumbers
      r.kpis = [];
      document.querySelectorAll('.sapMObjectNumber').forEach(function(o) {
        if (o.offsetParent !== null) {
          var parent = o.closest('.sapMVBox, .sapMFlexBox');
          var title = parent ? parent.querySelector('.sapMTitle') : null;
          r.kpis.push({ value: o.textContent.trim(), card: title ? title.textContent.trim() : 'N/A' });
        }
      });
      
      // Icons
      r.icons = [];
      document.querySelectorAll('.sapUiIcon').forEach(function(i) {
        if (i.offsetParent !== null) {
          var label = i.getAttribute('aria-label') || '';
          if (label) r.icons.push(label);
        }
      });
      r.icons = Array.from(new Set(r.icons));
      
      // Custom elements
      var customClasses = ['analyticsCard','analyticsContainer','filterContainer','headerActions','glassmorphism','managerWelcome','trainingListTable'];
      r.custom = {};
      customClasses.forEach(function(cls) {
        var els = document.querySelectorAll('.' + cls);
        if (els.length) r.custom[cls] = els.length;
      });
      
      // List items  
      r.listItems = document.querySelectorAll('.sapMLIB').length;
      
      // Views
      r.views = [];
      document.querySelectorAll('[id*="__xmlview"]').forEach(function(v) {
        if (v.tagName === 'DIV' || v.tagName === 'SECTION') {
          r.views.push({ id: v.id, display: getComputedStyle(v).display, hidden: v.classList.contains('sapMNavItemHidden') });
        }
      });
      
      return r;
    });
    
    console.log('\n=== HOME PAGE TEST ===');
    console.log('Hash:', info.hash);
    console.log('\nButtons:', info.buttons.join(' | '));
    console.log('\nTitles:', info.titles.join(' | '));
    console.log('\nKPI Cards:');
    info.kpis.forEach(function(k) { console.log('  ' + k.card + ': ' + k.value); });
    console.log('\nIcons:', info.icons.join(', '));
    console.log('\nCustom CSS elements:', JSON.stringify(info.custom));
    console.log('List items:', info.listItems);
    console.log('Views:', JSON.stringify(info.views));
    
    await page.screenshot({ path: 'test-screenshots/test-home-after-fix.png' });
    console.log('\nScreenshot: test-home-after-fix.png');
    
    // Detailed check
    console.log('\n=== CHECKS ===');
    var hasMyAssign = info.buttons.some(function(b) { return b.includes('Assignment') || b.includes('Assign'); });
    var hasExport = info.buttons.some(function(b) { return b.includes('Export'); });
    var hasDelegate = info.buttons.some(function(b) { return b.includes('Delegate'); });
    var hasAnalytics = (info.custom.analyticsCard || 0) > 0;
    var hasFilter = (info.custom.filterContainer || 0) > 0;
    var hasList = info.listItems > 0;
    
    console.log('  My Assignments button:', hasMyAssign ? 'PASS' : 'FAIL');
    console.log('  Export Report button:', hasExport ? 'PASS' : 'FAIL');
    console.log('  Delegate Authority button:', hasDelegate ? 'PASS' : 'FAIL');
    console.log('  Analytics cards:', hasAnalytics ? 'PASS (' + info.custom.analyticsCard + ' cards)' : 'FAIL');
    console.log('  Filter container:', hasFilter ? 'PASS' : 'FAIL');
    console.log('  Training list items:', hasList ? 'PASS (' + info.listItems + ' items)' : 'FAIL');
    console.log('  KPI values:', info.kpis.length > 0 ? 'PASS (' + info.kpis.length + ' values)' : 'FAIL');
    
    await b.close();
  } catch(e) {
    console.log('ERROR:', e.message);
  }
})();

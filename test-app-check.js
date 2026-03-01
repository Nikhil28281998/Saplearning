const { chromium } = require('playwright');

(async () => {
  try {
    const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const pages = b.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('ZLEARNING'));
    if (!page) { console.log('No page'); await b.close(); return; }
    
    console.log('URL:', page.url().substring(0,100));
    
    const appInfo = await page.evaluate(() => {
      const r = {};
      
      // Find the sap.m.App control container
      const app = document.getElementById('application-ZLEARNING-display-component---app--app');
      if (app) {
        r.appHTML = app.innerHTML.substring(0, 3000);
        r.appChildren = Array.from(app.children).map(c => ({
          id: c.id, tag: c.tagName, class: c.className.substring(0, 100),
          display: getComputedStyle(c).display,
          height: c.getBoundingClientRect().height,
          childCount: c.children.length,
          innerTextPreview: c.innerText?.substring(0, 100)
        }));
      } else {
        r.appHTML = 'App element not found';
      }
      
      // Search for ALL __xmlview elements anywhere
      const allViewEls = document.querySelectorAll('[id^="__xmlview"]');
      r.allViews = Array.from(allViewEls).slice(0, 30).map(e => ({
        id: e.id, tag: e.tagName, display: getComputedStyle(e).display,
        visible: e.offsetParent !== null,
        height: e.getBoundingClientRect().height,
        width: e.getBoundingClientRect().width,
        classList: Array.from(e.classList).join(' ')
      }));
      
      // Check if UI5 is loaded and has models
      try {
        // Check sap.ui.getCore()
        const core = sap.ui.getCore();
        const component = core.getComponent('application-ZLEARNING-display-component');
        if (component) {
          r.componentExists = true;
          const router = component.getRouter();
          r.routerHash = router ? router.getHashChanger().getHash() : 'no router';
        }
      } catch(e) {
        r.ui5Error = e.message;
      }
      
      // Check for error messages in the page
      const msgStrip = document.querySelectorAll('.sapMMsgStrip, .sapMMessageStrip');
      r.messageStrips = Array.from(msgStrip).map(m => m.innerText?.substring(0, 200));
      
      // Check console errors (if available)
      r.pageTitle = document.title;
      
      return r;
    });
    
    console.log('App children:', JSON.stringify(appInfo.appChildren, null, 2));
    console.log('\nAll __xmlview elements:', JSON.stringify(appInfo.allViews, null, 2));
    console.log('\nComponent exists:', appInfo.componentExists);
    console.log('Router hash:', appInfo.routerHash);
    console.log('UI5 error:', appInfo.ui5Error);
    console.log('Message strips:', appInfo.messageStrips);
    console.log('\nApp HTML (first 2000):', appInfo.appHTML?.substring(0, 2000));
    
    await b.close();
  } catch(e) {
    console.log('ERROR:', e.message);
  }
})();

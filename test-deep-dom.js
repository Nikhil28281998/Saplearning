const { chromium } = require('playwright');

(async () => {
  try {
    const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const pages = b.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('ZLEARNING'));
    if (!page) { console.log('No page'); await b.close(); return; }
    
    console.log('URL:', page.url().substring(0,100));
    await page.waitForTimeout(1000);
    
    // Deep DOM inspection - check what's inside canvas
    const domInfo = await page.evaluate(() => {
      const r = {};
      
      // Check for loading indicators
      r.busyIndicators = document.querySelectorAll('.sapUiLocalBusyIndicator, .sapUiBusy, .sapMBusyIndicator').length;
      
      // Check for error dialogs
      r.dialogs = Array.from(document.querySelectorAll('.sapMDialog, .sapMMessageBox'))
        .map(d => ({ visible: d.style.display !== 'none', text: d.innerText?.substring(0,200) }));
      
      // Check canvas deeply
      const canvas = document.getElementById('canvas');
      r.canvasHTML = canvas ? canvas.innerHTML.substring(0, 2000) : 'canvas not found';
      
      // Check for the app component
      const component = document.querySelector('[id*="application-ZLEARNING"]');
      r.appComponent = component ? { id: component.id, class: component.className.substring(0,100), visible: component.offsetParent !== null } : 'not found';
      
      // Check for the component container
      const containers = document.querySelectorAll('.sapUiComponentContainer');
      r.componentContainers = Array.from(containers).map(c => ({
        id: c.id, children: c.children.length, innerText: c.innerText?.substring(0, 200)
      }));
      
      // Get all elements with IDs that start with our app prefix
      const appEls = document.querySelectorAll('[id^="__xmlview0"], [id^="application"]');
      r.appElements = Array.from(appEls).slice(0, 20).map(e => ({
        id: e.id, tag: e.tagName, display: getComputedStyle(e).display, visible: e.offsetParent !== null
      }));
      
      // Check console errors
      r.title = document.title;
      
      // Full body structure
      r.bodyChildIds = Array.from(document.body.children).map(c => c.id || c.tagName);
      
      return r;
    });
    
    console.log('Title:', domInfo.title);
    console.log('Busy indicators:', domInfo.busyIndicators);
    console.log('Dialogs:', JSON.stringify(domInfo.dialogs));
    console.log('App component:', JSON.stringify(domInfo.appComponent));
    console.log('Component containers:', JSON.stringify(domInfo.componentContainers, null, 2));
    console.log('App elements:', JSON.stringify(domInfo.appElements, null, 2));
    console.log('Body child IDs:', domInfo.bodyChildIds);
    console.log('\nCanvas HTML (first 1500):', domInfo.canvasHTML.substring(0, 1500));
    
    await b.close();
  } catch(e) {
    console.log('ERROR:', e.message);
  }
})();

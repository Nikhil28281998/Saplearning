const { chromium } = require('playwright');

(async () => {
  try {
    const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const pages = b.contexts()[0].pages();
    
    // Just pick the first tab that has ZLEARNING in URL
    let page = null;
    for (const p of pages) {
      if (p.url().includes('ZLEARNING')) {
        page = p;
        break;
      }
    }
    
    if (!page) {
      console.log('No FLP page. Tabs:');
      for (const p of pages) console.log(' ', p.url().substring(0,80));
      await b.close();
      return;
    }
    
    console.log('Connected:', page.url().substring(0,100));
    
    // Wait for page to be ready
    await page.waitForTimeout(2000);
    
    // Get body text first as a sanity check
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('\n=== BODY TEXT PREVIEW ===');
    console.log(bodyText.substring(0, 800));
    
    // Get detailed info
    const info = await page.evaluate(() => {
      const r = {};
      r.hash = window.location.hash;
      r.readyState = document.readyState;
      
      // All visible buttons
      r.buttons = [];
      document.querySelectorAll('button').forEach(b => {
        if (b.offsetParent !== null) {
          const t = b.textContent.trim();
          if (t) r.buttons.push(t.substring(0,60));
        }
      });
      
      // All visible titles
      r.titles = [];
      document.querySelectorAll('.sapMTitle, .sapMText, .sapMLabel').forEach(t => {
        if (t.offsetParent !== null) {
          const txt = t.textContent.trim();
          if (txt && txt.length > 1 && txt.length < 100) r.titles.push(txt.substring(0,60));
        }
      });
      
      // Remove duplicates
      r.titles = [...new Set(r.titles)];
      r.buttons = [...new Set(r.buttons)];
      
      // Views
      r.views = [];
      document.querySelectorAll('[id*="xmlview"]').forEach(v => {
        r.views.push({
          id: v.id,
          display: getComputedStyle(v).display,
          hidden: v.classList.contains('sapMNavItemHidden')
        });
      });
      
      // Count analytics-related elements
      r.analyticsCards = document.querySelectorAll('.analyticsCard').length;
      r.vboxes = document.querySelectorAll('.sapMVBox').length;
      r.flexboxes = document.querySelectorAll('.sapMFlexBox').length;
      r.objectNumbers = document.querySelectorAll('.sapMObjectNumber').length;
      
      return r;
    });
    
    console.log('\n=== PAGE INFO ===');
    console.log('Hash:', info.hash);
    console.log('Ready state:', info.readyState);
    console.log('Views:', JSON.stringify(info.views));
    console.log('Buttons:', info.buttons.join(' | '));
    console.log('Titles (sample):', info.titles.slice(0, 20).join(' | '));
    console.log('Analytics cards:', info.analyticsCards);
    console.log('VBoxes:', info.vboxes, 'FlexBoxes:', info.flexboxes, 'ObjectNumbers:', info.objectNumbers);
    
    await page.screenshot({ path: 'test-screenshots/retest-home2.png' });
    console.log('\nScreenshot: retest-home2.png');
    await b.close();
  } catch(e) {
    console.log('ERROR:', e.message);
  }
})();

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  
  // Find the FLP page
  let page = null;
  for (const p of pages) {
    const url = p.url();
    if (url.includes('flp') || url.includes('ZLEARNING')) {
      page = p;
      break;
    }
  }
  
  if (!page) {
    console.log('FLP page not found. Available pages:');
    for (const p of pages) {
      console.log(' -', p.url());
    }
    await browser.close();
    return;
  }

  console.log('Connected to FLP page:', page.url());
  
  const action = process.argv[2] || 'screenshot';
  
  if (action === 'screenshot') {
    await page.screenshot({ path: 'test-screenshots/retest-current.png', fullPage: false });
    console.log('Screenshot saved to test-screenshots/retest-current.png');
    
    // Check current hash
    const hash = await page.evaluate(() => window.location.hash);
    console.log('Current hash:', hash);
    
    // Count analytics cards visible
    const cardCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('.analyticsCard');
      return { total: cards.length, visible: Array.from(cards).filter(c => c.offsetParent !== null).length };
    });
    console.log('Analytics cards:', JSON.stringify(cardCount));
  }
  
  if (action === 'test-nav') {
    // First ensure we're on home page
    const hash = await page.evaluate(() => window.location.hash);
    console.log('Current hash:', hash);
    
    if (!hash.includes('assignments')) {
      // Navigate to assignments
      console.log('\n--- Clicking My Assignments button ---');
      try {
        const btn = await page.$('button:has-text("My Assignments")');
        if (btn) {
          await btn.click();
          await page.waitForTimeout(2000);
          const newHash = await page.evaluate(() => window.location.hash);
          console.log('After click hash:', newHash);
          await page.screenshot({ path: 'test-screenshots/retest-on-assignments.png' });
          console.log('Screenshot: retest-on-assignments.png');
          
          // Count analytics cards on assignments page
          const cardInfo = await page.evaluate(() => {
            const cards = document.querySelectorAll('.analyticsCard');
            const cardDetails = [];
            cards.forEach(c => {
              const title = c.querySelector('.sapMTitle, .sapMText');
              const vis = c.offsetParent !== null;
              cardDetails.push({ text: title?.textContent || 'N/A', visible: vis, id: c.id });
            });
            return cardDetails;
          });
          console.log('Cards on assignments page:', JSON.stringify(cardInfo, null, 2));
        } else {
          console.log('My Assignments button not found');
        }
      } catch(e) {
        console.log('Error:', e.message);
      }
    } else {
      console.log('Already on assignments page, testing back navigation...');
      
      // Check view states BEFORE back nav
      const viewsBefore = await page.evaluate(() => {
        const views = document.querySelectorAll('[id*="xmlview"]');
        return Array.from(views).map(v => ({
          id: v.id,
          classes: v.className.split(' ').filter(c => c.includes('Nav') || c.includes('Hidden') || c.includes('hidden')),
          display: getComputedStyle(v).display,
          zIndex: getComputedStyle(v).zIndex
        }));
      });
      console.log('Views BEFORE back:', JSON.stringify(viewsBefore, null, 2));
      
      // Click back
      console.log('\n--- Clicking Back button ---');
      const backBtn = await page.$('.sapMBarLeft .sapMBtn');
      if (backBtn) {
        await backBtn.click();
        await page.waitForTimeout(2000);
        const newHash = await page.evaluate(() => window.location.hash);
        console.log('After back hash:', newHash);
        
        // Check view states AFTER back nav
        const viewsAfter = await page.evaluate(() => {
          const views = document.querySelectorAll('[id*="xmlview"]');
          return Array.from(views).map(v => ({
            id: v.id,
            classes: v.className.split(' ').filter(c => c.includes('Nav') || c.includes('Hidden') || c.includes('hidden')),
            display: getComputedStyle(v).display,
            zIndex: getComputedStyle(v).zIndex
          }));
        });
        console.log('Views AFTER back:', JSON.stringify(viewsAfter, null, 2));
        
        await page.screenshot({ path: 'test-screenshots/retest-after-back.png' });
        console.log('Screenshot: retest-after-back.png');
      } else {
        console.log('Back button not found');
      }
    }
  }
  
  if (action === 'home-inspect') {
    // Inspect the home page in detail
    const hash = await page.evaluate(() => window.location.hash);
    console.log('Current hash:', hash);
    
    const homeInfo = await page.evaluate(() => {
      const result = {};
      
      // Header buttons
      const buttons = document.querySelectorAll('button');
      result.allButtons = Array.from(buttons).map(b => ({ text: b.textContent.trim().substring(0, 50), visible: b.offsetParent !== null })).filter(b => b.visible);
      
      // Analytics cards
      const cards = document.querySelectorAll('.analyticsCard');
      result.analyticsCards = Array.from(cards).map(c => {
        const title = c.querySelector('.sapMTitle');
        const number = c.querySelector('.sapMObjectNumber');
        const icon = c.querySelector('.sapUiIcon');
        return {
          id: c.id,
          title: title?.textContent || 'N/A',
          number: number?.textContent || 'N/A', 
          iconSrc: icon?.getAttribute('data-sap-ui-icon-content') || 'N/A',
          visible: c.offsetParent !== null,
          rect: c.getBoundingClientRect()
        };
      });
      
      // Filter bar
      const filterBar = document.querySelector('.filterContainer, [id*="filterBar"]');
      result.filterBar = filterBar ? { visible: filterBar.offsetParent !== null, id: filterBar.id } : 'not found';
      
      // Table
      const table = document.querySelector('.sapMList, .sapUiTable');
      result.table = table ? { rows: table.querySelectorAll('.sapMListItems .sapMLIB, .sapMListTblRow').length } : 'not found';
      
      return result;
    });
    
    console.log('HOME PAGE INSPECTION:');
    console.log('Buttons:', JSON.stringify(homeInfo.allButtons, null, 2));
    console.log('Analytics Cards:', JSON.stringify(homeInfo.analyticsCards, null, 2));
    console.log('Filter Bar:', JSON.stringify(homeInfo.filterBar));
    console.log('Table:', JSON.stringify(homeInfo.table));
    
    await page.screenshot({ path: 'test-screenshots/retest-home-inspect.png' });
  }
  
  await browser.close();
})();

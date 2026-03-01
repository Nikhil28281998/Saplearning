const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const pages = b.contexts()[0].pages();
  let page = pages.find(p => p.url().includes('flp'));
  if (!page) { console.log('No page'); await b.close(); return; }
  
  console.log('URL:', page.url().substring(0,90));
  const hash = await page.evaluate(() => window.location.hash);
  console.log('Hash:', hash);
  
  const step = process.argv[2] || '1';
  
  if (step === '1') {
    // Step 1: Click My Assignments from home page
    console.log('\n=== STEP 1: Navigate to My Assignments ===');
    
    // Ensure we're on home page
    if (hash.includes('assignments')) {
      console.log('Already on assignments, going home first...');
      await page.evaluate(() => { window.location.hash = '#ZLEARNING-display'; });
      await page.waitForTimeout(3000);
    }
    
    // Click My Assignments button
    const btn = await page.$('button:has-text("My Assignments")');
    if (btn) {
      console.log('Clicking My Assignments...');
      await btn.click();
      await page.waitForTimeout(3000);
      
      const newHash = await page.evaluate(() => window.location.hash);
      console.log('Hash after click:', newHash);
      
      // Check view states
      const views = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div[id^="__xmlview"]')).filter(v => 
          v.id.match(/^__xmlview\d+$/)
        ).map(v => ({
          id: v.id,
          display: getComputedStyle(v).display,
          hidden: v.classList.contains('sapMNavItemHidden')
        }));
      });
      console.log('Views:', JSON.stringify(views));
      
      // Check what's visible on the assignments page
      const assignInfo = await page.evaluate(() => {
        return {
          titles: Array.from(document.querySelectorAll('.sapMTitle')).filter(t => t.offsetParent !== null).map(t => t.textContent.trim().substring(0,50)),
          buttons: Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null && b.textContent.trim()).map(b => b.textContent.trim().substring(0,50)),
          kpis: Array.from(document.querySelectorAll('.sapMObjectNumber')).filter(o => o.offsetParent !== null).map(o => o.textContent.trim()),
          listItems: document.querySelectorAll('.sapMLIB').length
        };
      });
      console.log('Titles:', assignInfo.titles.join(' | '));
      console.log('KPIs:', assignInfo.kpis.join(' | '));
      console.log('List items:', assignInfo.listItems);
      
      await page.screenshot({ path: 'test-screenshots/test-nav-step1.png' });
      console.log('Screenshot: test-nav-step1.png');
      console.log(newHash.includes('assignments') ? '\nPASS: On assignments page' : '\nFAIL: Not on assignments page');
    } else {
      console.log('FAIL: My Assignments button not found');
    }
  }
  
  if (step === '2') {
    // Step 2: Test back navigation from assignments
    console.log('\n=== STEP 2: Back Navigation ===');
    
    if (!hash.includes('assignments')) {
      console.log('Not on assignments page. Navigate there first (step 1).');
      await b.close();
      return;
    }
    
    // Check view states before
    const viewsBefore = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div[id^="__xmlview"]')).filter(v => 
        v.id.match(/^__xmlview\d+$/)
      ).map(v => ({
        id: v.id,
        display: getComputedStyle(v).display,
        hidden: v.classList.contains('sapMNavItemHidden')
      }));
    });
    console.log('Views BEFORE back:', JSON.stringify(viewsBefore));
    
    // Find and click back button
    const backBtn = await page.$('[id*="navButton"], [id*="navBtn"], .sapMBtnBack');
    if (!backBtn) {
      // Try finding the nav button in the page header
      const headerBtns = await page.$$('.sapMBar .sapMBtn');
      for (const hb of headerBtns) {
        const icon = await hb.$('.sapUiIcon');
        if (icon) {
          const content = await icon.evaluate(el => el.getAttribute('data-sap-ui-icon-content'));
          // Nav back icon
          if (content === '\ue04c' || content === '\ue070') {
            console.log('Found back button via icon');
            await hb.click();
            break;
          }
        }
      }
    } else {
      console.log('Found back button via selector');
      await backBtn.click();
    }
    
    await page.waitForTimeout(3000);
    
    const newHash = await page.evaluate(() => window.location.hash);
    console.log('Hash after back:', newHash);
    
    // Check view states after
    const viewsAfter = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div[id^="__xmlview"]')).filter(v => 
        v.id.match(/^__xmlview\d+$/)
      ).map(v => ({
        id: v.id,
        display: getComputedStyle(v).display,
        hidden: v.classList.contains('sapMNavItemHidden'),
        height: v.getBoundingClientRect().height
      }));
    });
    console.log('Views AFTER back:', JSON.stringify(viewsAfter));
    
    // Check visible content
    const visibleTitles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.sapMTitle')).filter(t => t.offsetParent !== null).map(t => t.textContent.trim().substring(0,50));
    });
    console.log('Visible titles:', visibleTitles.join(' | '));
    
    await page.screenshot({ path: 'test-screenshots/test-nav-step2-back.png' });
    console.log('Screenshot: test-nav-step2-back.png');
    
    if (!newHash.includes('assignments') && viewsAfter.some(v => v.id === '__xmlview1' && (v.display === 'none' || v.hidden))) {
      console.log('\nPASS: Back navigation works! Assignments view is hidden.');
    } else if (!newHash.includes('assignments')) {
      console.log('\nPARTIAL: Hash changed but check screenshots for visual correctness.');
    } else {
      console.log('\nFAIL: Still on assignments page.');
    }
  }
  
  await b.close();
})().catch(e => console.error('ERR:', e.message));

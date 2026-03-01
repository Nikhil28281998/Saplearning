const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  
  let page = null;
  for (const p of pages) {
    const url = p.url();
    if (url.includes('flp') || url.includes('ZLEARNING') || url.includes('Shell-home')) { page = p; break; }
  }
  
  if (!page) { console.log('No FLP page'); await browser.close(); return; }
  console.log('Connected:', page.url());
  
  const hash = await page.evaluate(() => window.location.hash);
  console.log('Hash:', hash);
  
  const action = process.argv[2] || 'navigate';
  
  if (action === 'navigate') {
    // Navigate to the app directly via hash
    console.log('Navigating to app via hash change...');
    await page.evaluate(() => {
      window.location.hash = '#ZLEARNING-display';
    });
    await page.waitForTimeout(5000);
    
    const newHash = await page.evaluate(() => window.location.hash);
    console.log('New hash:', newHash);
    
    // Check what's on the page now
    const pageInfo = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      const visibleBtns = Array.from(btns)
        .filter(b => b.offsetParent !== null && b.textContent.trim().length > 0)
        .map(b => b.textContent.trim().substring(0, 50));
      
      const titles = document.querySelectorAll('.sapMTitle');
      const visibleTitles = Array.from(titles)
        .filter(t => t.offsetParent !== null)
        .map(t => t.textContent.trim().substring(0, 40));
      
      const objNums = document.querySelectorAll('.sapMObjectNumber');
      const visibleNums = Array.from(objNums)
        .filter(o => o.offsetParent !== null)
        .map(o => o.textContent.trim());
      
      const text = document.body.innerText.substring(0, 1000);
      
      return { buttons: visibleBtns, titles: visibleTitles, numbers: visibleNums, textPreview: text };
    });
    
    console.log('\nVisible buttons:', pageInfo.buttons);
    console.log('Visible titles:', pageInfo.titles);
    console.log('KPI Numbers:', pageInfo.numbers);
    console.log('\nText preview:\n', pageInfo.textPreview.substring(0, 500));
    
    await page.screenshot({ path: 'test-screenshots/retest-app-opened.png' });
    console.log('\nScreenshot saved: retest-app-opened.png');
  }
  
  if (action === 'full-inspect') {
    // Deep inspect current page
    const pageInfo = await page.evaluate(() => {
      const result = {};
      
      // Buttons
      const btns = document.querySelectorAll('button');
      result.buttons = Array.from(btns)
        .filter(b => b.offsetParent !== null && b.textContent.trim().length > 0)
        .map(b => ({ text: b.textContent.trim().substring(0, 60), id: b.id }));
      
      // Titles
      const titles = document.querySelectorAll('.sapMTitle');
      result.titles = Array.from(titles)
        .filter(t => t.offsetParent !== null)
        .map(t => ({ text: t.textContent.trim().substring(0, 60), level: t.getAttribute('level') }));
      
      // ObjectNumbers (KPI values)
      const objNums = document.querySelectorAll('.sapMObjectNumber');
      result.kpiNumbers = Array.from(objNums).map(o => ({
        text: o.textContent.trim(),
        visible: o.offsetParent !== null,
        parentClasses: o.parentElement?.className?.substring(0, 80) || ''
      }));
      
      // Icons
      const icons = document.querySelectorAll('.sapUiIcon');
      result.icons = Array.from(icons)
        .filter(i => i.offsetParent !== null)
        .map(i => ({ id: i.id, ariaLabel: i.getAttribute('aria-label') || i.getAttribute('title') || '' }));
      
      // VBox/FlexBox that look like cards
      const boxes = document.querySelectorAll('.sapMVBox');
      result.vboxes = Array.from(boxes)
        .filter(b => b.offsetParent !== null)
        .map(b => ({
          id: b.id,
          class: b.className.substring(0, 80),
          childCount: b.children.length,
          innerText: b.innerText?.substring(0, 60)
        }));
        
      // Any element with custom CSS classes from our app
      const customClasses = ['analyticsCard', 'analyticsContainer', 'userAnalyticsContainer', 
        'filterContainer', 'headerActions', 'glassmorphism', 'managerWelcome'];
      result.customElements = {};
      customClasses.forEach(cls => {
        const els = document.querySelectorAll('.' + cls);
        if (els.length > 0) {
          result.customElements[cls] = Array.from(els).map(e => ({
            id: e.id, visible: e.offsetParent !== null, children: e.children.length
          }));
        }
      });
      
      // Table/List
      const lists = document.querySelectorAll('.sapMList');
      result.lists = Array.from(lists).map(l => ({
        id: l.id, items: l.querySelectorAll('.sapMLIB').length, visible: l.offsetParent !== null
      }));
      
      // Check views
      const views = document.querySelectorAll('[id*="__xmlview"]');
      result.views = Array.from(views).map(v => ({
        id: v.id, display: getComputedStyle(v).display,
        hasHidden: v.classList.contains('sapMNavItemHidden')
      }));
      
      return result;
    });
    
    console.log('\n=== BUTTONS ===');
    pageInfo.buttons.forEach(b => console.log(`  [${b.id}] ${b.text}`));
    
    console.log('\n=== TITLES ===');
    pageInfo.titles.forEach(t => console.log(`  ${t.text} (level: ${t.level})`));
    
    console.log('\n=== KPI NUMBERS ===');
    pageInfo.kpiNumbers.forEach(n => console.log(`  ${n.text} (visible: ${n.visible})`));
    
    console.log('\n=== ICONS ===');
    pageInfo.icons.forEach(i => console.log(`  [${i.id}] ${i.ariaLabel}`));
    
    console.log('\n=== CUSTOM CSS ELEMENTS ===');
    Object.entries(pageInfo.customElements).forEach(([cls, els]) => {
      console.log(`  .${cls}:`);
      els.forEach(e => console.log(`    [${e.id}] visible=${e.visible} children=${e.children}`));
    });
    
    console.log('\n=== VIEWS ===');
    pageInfo.views.forEach(v => console.log(`  [${v.id}] display=${v.display} hidden=${v.hasHidden}`));
    
    console.log('\n=== LISTS ===');
    pageInfo.lists.forEach(l => console.log(`  [${l.id}] items=${l.items} visible=${l.visible}`));
    
    console.log('\n=== VBOXES (sample) ===');
    pageInfo.vboxes.slice(0, 15).forEach(v => console.log(`  [${v.id}] "${v.innerText?.substring(0, 40)}"`));
    
    await page.screenshot({ path: 'test-screenshots/retest-full-inspect.png' });
  }
  
  if (action === 'test-back-nav') {
    console.log('\n=== BACK NAVIGATION TEST ===');
    
    // First, navigate to assignments page
    console.log('Step 1: Navigate to assignments...');
    await page.evaluate(() => { window.location.hash = '#ZLEARNING-display&/assignments'; });
    await page.waitForTimeout(4000);
    
    let hash2 = await page.evaluate(() => window.location.hash);
    console.log('On assignments page, hash:', hash2);
    await page.screenshot({ path: 'test-screenshots/retest-step1-assignments.png' });
    
    // Check views
    let views = await page.evaluate(() => {
      const vs = document.querySelectorAll('[id*="__xmlview"]');
      return Array.from(vs).map(v => ({ id: v.id, display: getComputedStyle(v).display, hidden: v.classList.contains('sapMNavItemHidden') }));
    });
    console.log('Views on assignments:', JSON.stringify(views));
    
    // Step 2: Click back button
    console.log('\nStep 2: Click back button...');
    const backBtn = await page.$('.sapMBtnBack, [id*="backBtn"]');
    if (backBtn) {
      await backBtn.click();
    } else {
      // Try finding in the bar
      const barBtns = await page.$$('.sapMBar .sapMBtn');
      for (const btn of barBtns) {
        const icon = await btn.$('.sapUiIcon');
        if (icon) {
          const ariaLabel = await icon.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.toLowerCase().includes('back')) {
            console.log('Found back via aria-label');
            await btn.click();
            break;
          }
        }
        // Also try NavButton 
        const cls = await btn.getAttribute('class');
        if (cls && cls.includes('Back')) {
          await btn.click();
          break;
        }
      }
      
      // Last resort: use browser back or nav button
      if (!backBtn) {
        const navBtn = await page.$('button[id*="navButton"], .sapMBtnBack');
        if (navBtn) {
          console.log('Found nav button');
          await navBtn.click();
        } else {
          console.log('Trying page.goBack()');
          await page.goBack();
        }
      }
    }
    
    await page.waitForTimeout(4000);
    
    let hash3 = await page.evaluate(() => window.location.hash);
    console.log('After back, hash:', hash3);
    
    views = await page.evaluate(() => {
      const vs = document.querySelectorAll('[id*="__xmlview"]');
      return Array.from(vs).map(v => ({ id: v.id, display: getComputedStyle(v).display, hidden: v.classList.contains('sapMNavItemHidden') }));
    });
    console.log('Views after back:', JSON.stringify(views));
    
    // Check what's visible
    const visibleContent = await page.evaluate(() => {
      const titles = document.querySelectorAll('.sapMTitle');
      return Array.from(titles).filter(t => t.offsetParent !== null).map(t => t.textContent.trim().substring(0, 40));
    });
    console.log('Visible titles:', visibleContent);
    
    await page.screenshot({ path: 'test-screenshots/retest-step2-after-back.png' });
    
    if (hash3.includes('assignments')) {
      console.log('\n❌ FAIL: Still on assignments page!');
    } else {
      console.log('\n✅ PASS: Back to home page!');
    }
  }
  
  await browser.close();
})();

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const pages = contexts[0].pages();
  const page = pages.find(p => p.url().includes('flp'));
  if (!page) { console.log('No FLP page found'); process.exit(1); }

  // Navigate to assignments if not already there
  const hash = new URL(page.url()).hash;
  if (!hash.includes('assignments')) {
    console.log('Navigating to assignments...');
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.sapMBtn');
      for (const b of btns) {
        if (b.textContent.includes('My Assignments')) { b.click(); break; }
      }
    });
    await page.waitForTimeout(4000);
  } else {
    console.log('Already on assignments page');
    await page.waitForTimeout(1000);
  }

  // Check view state
  const viewState = await page.evaluate(() => {
    const v0 = document.getElementById('__xmlview0');
    const v1 = document.getElementById('__xmlview1');
    return {
      view0: { display: v0 ? getComputedStyle(v0).display : 'N/A', w: v0 ? v0.offsetWidth : 0, h: v0 ? v0.offsetHeight : 0 },
      view1: { display: v1 ? getComputedStyle(v1).display : 'N/A', w: v1 ? v1.offsetWidth : 0, h: v1 ? v1.offsetHeight : 0 }
    };
  });
  console.log('View states:', JSON.stringify(viewState));

  // Check KPI cards with correct selectors
  const kpis = await page.evaluate(() => {
    const view = document.getElementById('__xmlview1');
    if (!view) return 'No view';
    
    // Check the ObjectNumbers directly
    const nums = view.querySelectorAll('.sapMObjectNumber');
    const result = [];
    for (const n of nums) {
      const card = n.closest('.analyticsCard');
      result.push({
        cardId: card ? card.id : 'no-card',
        value: n.textContent.trim(),
        rect: { w: Math.round(n.offsetWidth), h: Math.round(n.offsetHeight) },
        cardRect: card ? { w: Math.round(card.offsetWidth), h: Math.round(card.offsetHeight) } : null
      });
    }
    return result;
  });
  console.log('\nKPI ObjectNumbers:', JSON.stringify(kpis, null, 2));

  // Check analyticsContainer
  const container = await page.evaluate(() => {
    const view = document.getElementById('__xmlview1');
    const c = view ? view.querySelector('.analyticsContainer') : null;
    if (!c) return 'No container';
    return {
      w: c.offsetWidth,
      h: c.offsetHeight,
      display: getComputedStyle(c).display,
      childCount: c.children.length
    };
  });
  console.log('\nAnalytics container:', JSON.stringify(container));

  // Check the page scroll container
  const scroll = await page.evaluate(() => {
    const view = document.getElementById('__xmlview1');
    const page = view ? view.querySelector('.sapMPage') : null;
    const content = page ? page.querySelector('.sapMPageBgSolid') : null;
    return {
      pageW: page ? page.offsetWidth : 0,
      pageH: page ? page.offsetHeight : 0,
      contentW: content ? content.offsetWidth : 0,
      contentH: content ? content.offsetHeight : 0
    };
  });
  console.log('\nPage/Content:', JSON.stringify(scroll));

  // Full screenshot
  await page.screenshot({ path: 'test-assignments-fresh.png', fullPage: false });
  console.log('\nScreenshot: test-assignments-fresh.png');

  // Now go back to home
  console.log('\nNavigating back to home...');
  await page.evaluate(() => {
    const back = document.querySelector('.sapMNavItem .sapMBtnIcon[src*="nav-back"], .sapMBtn .sapUiIcon');
    // Try navButton
    const navBtn = document.querySelector('.sapMPageHeader .sapMBtn');
    if (navBtn) navBtn.click();
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-home-fresh.png', fullPage: false });
  console.log('Home screenshot: test-home-fresh.png');
  
  const finalHash = new URL(page.url()).hash;
  console.log('Final hash:', finalHash);
})();

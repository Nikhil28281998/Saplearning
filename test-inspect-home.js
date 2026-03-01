const { chromium } = require('playwright');

(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const pages = b.contexts()[0].pages();
  
  let page = null;
  for (const p of pages) {
    const u = p.url();
    if (u.includes('ZLEARNING') && !u.includes('devtools')) {
      try {
        const h = await p.evaluate(() => window.location.hash);
        const hasContent = await p.evaluate(() => document.querySelectorAll('.sapMTitle').length);
        console.log('Tab:', u.substring(0,90), '-> hash:', h, 'titles:', hasContent);
        if (hasContent > 0 && !page) page = p;
      } catch(e) {
        console.log('Tab error:', e.message.substring(0,60));
      }
    }
  }
  
  if (!page) {
    // fallback to last ZLEARNING tab
    for (const p of pages) {
      if (p.url().includes('ZLEARNING')) page = p;
    }
  }
  
  if (!page) { console.log('No FLP page found'); await b.close(); return; }
  console.log('\nUsing:', page.url().substring(0,90));

  const info = await page.evaluate(() => {
    const r = {};
    r.hash = window.location.hash;
    r.buttons = Array.from(document.querySelectorAll('button'))
      .filter(b => b.offsetParent !== null && b.textContent.trim())
      .map(b => b.textContent.trim().substring(0,50));
    r.titles = Array.from(document.querySelectorAll('.sapMTitle'))
      .filter(t => t.offsetParent !== null)
      .map(t => t.textContent.trim().substring(0,50));
    r.objNums = Array.from(document.querySelectorAll('.sapMObjectNumber'))
      .filter(o => o.offsetParent !== null)
      .map(o => ({ text: o.textContent.trim(), parent: o.closest('[id]') ? o.closest('[id]').id : '' }));
    r.icons = Array.from(document.querySelectorAll('.sapUiIcon'))
      .filter(i => i.offsetParent !== null)
      .map(i => (i.getAttribute('aria-label') || '')).filter(x => x);
    r.listItems = document.querySelectorAll('.sapMLIB').length;
    r.views = Array.from(document.querySelectorAll('[id*="__xmlview"]'))
      .map(v => ({ id: v.id, display: getComputedStyle(v).display, hidden: v.classList.contains('sapMNavItemHidden') }));
    
    // Custom CSS classes from our app
    ['analyticsCard','analyticsContainer','userAnalyticsContainer','filterContainer',
     'headerActions','glassmorphism','managerWelcome','trainingListTable'].forEach(cls => {
      const els = document.querySelectorAll('.' + cls);
      if (els.length) {
        r[cls] = Array.from(els).map(e => ({
          id: e.id, visible: e.offsetParent !== null, children: e.children.length,
          text: e.innerText ? e.innerText.substring(0,60) : ''
        }));
      }
    });
    return r;
  });
  
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'test-screenshots/retest-home.png' });
  console.log('Screenshot saved: retest-home.png');
  await b.close();
})();

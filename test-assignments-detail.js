const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const pages = contexts[0].pages();
  const page = pages.find(p => p.url().includes('flp'));
  if (!page) { console.log('No FLP page found'); process.exit(1); }

  // Make sure we're on assignments page
  const hash = new URL(page.url()).hash;
  if (!hash.includes('assignments')) {
    console.log('Navigating to assignments page first...');
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.sapMBtn');
      for (const b of btns) {
        if (b.textContent.includes('My Assignments')) { b.click(); break; }
      }
    });
    await page.waitForTimeout(3000);
  }

  console.log('=== ASSIGNMENTS PAGE INSPECTION ===\n');

  // 1. Check KPI cards
  const kpis = await page.evaluate(() => {
    const view = document.getElementById('__xmlview1');
    if (!view) return 'No assignments view';
    
    const cards = view.querySelectorAll('.analyticsCard');
    const result = [];
    for (const card of cards) {
      const num = card.querySelector('.sapMOHNum');
      const label = card.querySelector('.sapMOHTitleDiv, .sapMTitle');
      const icon = card.querySelector('.sapUiIcon');
      const rect = card.getBoundingClientRect();
      result.push({
        id: card.id,
        classes: card.className.substring(0, 100),
        number: num ? num.textContent.trim() : 'N/A',
        label: label ? label.textContent.trim() : 'N/A',
        icon: icon ? icon.getAttribute('data-sap-ui-icon-content') : 'N/A',
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
      });
    }
    return result;
  });
  console.log('KPI Cards:', JSON.stringify(kpis, null, 2));

  // 2. Check analytics container layout
  const grid = await page.evaluate(() => {
    const view = document.getElementById('__xmlview1');
    if (!view) return 'No view';
    
    const container = view.querySelector('.analyticsContainer');
    if (!container) return 'No analytics container';
    
    const style = window.getComputedStyle(container);
    return {
      display: style.display,
      gridTemplateColumns: style.gridTemplateColumns,
      gap: style.gap,
      width: container.getBoundingClientRect().width
    };
  });
  console.log('\nGrid Layout:', JSON.stringify(grid, null, 2));

  // 3. Check page header / title
  const header = await page.evaluate(() => {
    const view = document.getElementById('__xmlview1');
    const titles = view.querySelectorAll('.sapMTitle, .sapMPageHeader .sapMTitle');
    return Array.from(titles).slice(0, 5).map(t => ({
      text: t.textContent.trim(),
      visible: t.offsetHeight > 0
    }));
  });
  console.log('\nTitles:', JSON.stringify(header, null, 2));

  // 4. Check list items count and first few
  const list = await page.evaluate(() => {
    const view = document.getElementById('__xmlview1');
    const items = view.querySelectorAll('.sapMLIB');
    const first5 = Array.from(items).slice(0, 3).map(li => {
      const title = li.querySelector('.sapMOHTitle, .sapMSLITitle, .sapMText');
      const status = li.querySelector('.sapMObjStatusText, .sapMObjStatus');
      return {
        title: title ? title.textContent.trim().substring(0, 60) : 'N/A',
        status: status ? status.textContent.trim() : 'N/A'
      };
    });
    return { total: items.length, first: first5 };
  });
  console.log('\nList:', JSON.stringify(list, null, 2));

  // 5. Screenshot
  await page.screenshot({ path: 'test-assignments-detail.png', fullPage: false });
  console.log('\nScreenshot saved: test-assignments-detail.png');

  console.log('\n=== DONE ===');
})();

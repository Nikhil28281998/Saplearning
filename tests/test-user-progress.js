const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  // Inject the fixes
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = [
      '.chartCard { max-height: none !important; overflow-y: visible !important; }',
      '.chartCard > .sapMFlexItem { width: 100% !important; }',
      '.chartCard .sapMList { width: 100% !important; }',
      '.teamUserRow { width: 100% !important; }',
      '.moduleBarRow { overflow: hidden !important; max-width: 100% !important; }',
      '@media (max-width: 600px) {',
      '  .analyticsContainer .analyticsCard { grid-column: span 1 !important; }',
      '  .chartCard { overflow: hidden !important; }',
      '  .moduleBarLabel { min-width: 6rem !important; max-width: 6rem !important; font-size: 0.6875rem !important; }',
      '  .moduleBarRow { overflow: hidden !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  });
  console.log('Injected fixes\n');

  const sizes = [
    { name: 'Phone', w: 375, h: 667 },
    { name: 'Tablet', w: 768, h: 1024 },
    { name: 'Laptop', w: 1366, h: 768 },
    { name: 'Desktop', w: 1920, h: 1080 },
    { name: 'Current', w: 767, h: 730 }
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.waitForTimeout(800);
    
    const r = await page.evaluate(() => {
      // Team KPIs
      const teamKpis = document.querySelectorAll('.teamKpiCard');
      const kpiSizes = [];
      teamKpis.forEach(k => { if (k.offsetWidth > 0) kpiSizes.push({ w: k.offsetWidth, h: k.offsetHeight }); });
      
      // Chart cards
      const chartCards = document.querySelectorAll('.chartCard');
      const chartSizes = [];
      chartCards.forEach(c => {
        if (c.offsetWidth > 0) {
          chartSizes.push({
            w: c.offsetWidth, h: c.offsetHeight,
            sH: c.scrollHeight,
            clipped: c.scrollHeight > c.clientHeight + 5
          });
        }
      });
      
      // User rows
      const userRows = document.querySelectorAll('.teamUserRow');
      const rowSizes = [];
      userRows.forEach(r => {
        if (r.offsetWidth > 0) {
          const name = r.querySelector('.teamUserName');
          const pi = r.querySelector('.sapMPI');
          rowSizes.push({
            rW: r.offsetWidth,
            nameW: name?.offsetWidth,
            piW: pi?.offsetWidth,
            name: name?.textContent?.substring(0, 15)
          });
        }
      });
      
      // Overflow check
      const overflows = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > el.clientWidth + 5 && el.offsetWidth > 0 && el.clientWidth > 50) {
          const cs = window.getComputedStyle(el);
          if (cs.overflowX !== 'hidden' && cs.overflowX !== 'scroll' && cs.overflow !== 'hidden') {
            overflows.push({ id: el.id?.substring(0, 40) || el.tagName, d: el.scrollWidth - el.clientWidth });
          }
        }
      });
      
      return { kpiSizes, chartSizes, rowSizes, overflows: overflows.slice(0, 5) };
    });
    
    console.log(size.name + ' (' + size.w + 'x' + size.h + '):');
    console.log('  KPIs: ' + r.kpiSizes.map(k => k.w + 'x' + k.h).join(', '));
    console.log('  Charts: ' + r.chartSizes.map(c => c.w + 'x' + c.h + (c.clipped ? ' CLIPPED' : ' ok')).join(', '));
    console.log('  Rows: ' + r.rowSizes.map(u => u.name + ':' + u.rW + '(pi:' + u.piW + ')').join(', '));
    console.log('  Overflows: ' + (r.overflows.length === 0 ? 'None' : r.overflows.map(o => o.id + '(+' + o.d + ')').join(', ')));
    console.log();
  }

  await page.setViewportSize({ width: 767, height: 730 });
  await browser.close();
})();

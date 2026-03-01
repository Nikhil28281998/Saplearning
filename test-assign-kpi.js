const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const pages = contexts[0].pages();
  const page = pages.find(p => p.url().includes('flp'));
  
  console.log('Hash:', new URL(page.url()).hash);
  
  // Check assignments page details
  const details = await page.evaluate(() => {
    const view = document.getElementById('__xmlview1');
    if (!view || view.offsetWidth === 0) return { error: 'Not on assignments page' };
    
    // KPI cards
    const cards = view.querySelectorAll('.analyticsCard');
    const kpiData = Array.from(cards).map(c => {
      const num = c.querySelector('.sapMObjectNumber');
      const title = c.querySelector('.sapMTitle');
      const icon = c.querySelector('.sapUiIcon');
      return {
        id: (c.id.split('--')[1] || c.id),
        w: c.offsetWidth,
        h: c.offsetHeight,
        value: num ? num.querySelector('.sapMObjectNumberText')?.textContent?.trim() : 'N/A',
        label: title ? title.textContent.trim() : 'N/A',
        iconSize: icon ? getComputedStyle(icon).fontSize : 'N/A'
      };
    });

    // Grid container
    const container = view.querySelector('.analyticsContainer');
    const gridStyle = container ? getComputedStyle(container) : null;

    // List
    const listItems = view.querySelectorAll('.sapMLIB');
    const firstItems = Array.from(listItems).slice(0, 3).map(li => {
      const t = li.querySelector('.sapMSLITitle, .sapMOHTitle, .sapMText');
      const s = li.querySelector('.sapMObjStatus');
      return {
        title: t ? t.textContent.trim().substring(0, 50) : 'N/A',
        status: s ? s.querySelector('.sapMObjStatusText')?.textContent?.trim() : 'N/A'
      };
    });

    // Page header
    const pageTitle = view.querySelector('.sapMPageHeader .sapMTitle');

    return {
      pageTitle: pageTitle ? pageTitle.textContent : 'N/A',
      kpis: kpiData,
      grid: gridStyle ? {
        cols: gridStyle.gridTemplateColumns,
        gap: gridStyle.gap,
        w: container.offsetWidth,
        h: container.offsetHeight
      } : null,
      listCount: listItems.length,
      firstItems: firstItems
    };
  });

  console.log('\n=== ASSIGNMENTS PAGE ===');
  console.log('Page Title:', details.pageTitle);
  console.log('\nKPI Cards (' + details.kpis.length + '):');
  details.kpis.forEach(k => {
    console.log(`  ${k.id}: ${k.w}x${k.h} | value="${k.value}" label="${k.label}" iconSize=${k.iconSize}`);
  });
  console.log('\nGrid:', JSON.stringify(details.grid));
  console.log('\nList Items:', details.listCount);
  details.firstItems.forEach(i => console.log(`  - ${i.title} [${i.status}]`));

  // Screenshot
  await page.screenshot({ path: 'test-assignments-kpi.png' });
  console.log('\nScreenshot: test-assignments-kpi.png');

  // Navigate back
  await page.evaluate(() => window.hasher.setHash('ZLEARNING-display&/'));
  await page.waitForTimeout(2000);
  console.log('Back on home');
})();

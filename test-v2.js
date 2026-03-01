const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const pages = contexts[0].pages();
  const page = pages.find(p => p.url().includes('flp'));
  if (!page) { console.log('No FLP page found'); process.exit(1); }

  // Navigate to assignments via hash
  console.log('Current hash:', new URL(page.url()).hash);
  
  // Use the router to navigate
  await page.evaluate(() => {
    window.location.hash = '#ZLEARNING-display&/assignments';
  });
  await page.waitForTimeout(5000);
  
  console.log('New hash:', new URL(page.url()).hash);

  // Check view states
  const states = await page.evaluate(() => {
    const v0 = document.getElementById('__xmlview0');
    const v1 = document.getElementById('__xmlview1');
    return {
      view0: { display: getComputedStyle(v0).display, w: v0.offsetWidth, h: v0.offsetHeight },
      view1: { display: getComputedStyle(v1).display, w: v1.offsetWidth, h: v1.offsetHeight }
    };
  });
  console.log('View states:', JSON.stringify(states));

  if (states.view1.w > 0) {
    // Check KPIs
    const kpis = await page.evaluate(() => {
      const view = document.getElementById('__xmlview1');
      const cards = view.querySelectorAll('.analyticsCard');
      return Array.from(cards).map(c => ({
        id: c.id.split('--')[1] || c.id,
        w: c.offsetWidth,
        h: c.offsetHeight,
        text: c.textContent.trim().substring(0, 80)
      }));
    });
    console.log('\nKPI Cards:');
    kpis.forEach(k => console.log(`  ${k.id}: ${k.w}x${k.h} - "${k.text}"`));

    // Check grid
    const grid = await page.evaluate(() => {
      const view = document.getElementById('__xmlview1');
      const c = view.querySelector('.analyticsContainer');
      if (!c) return null;
      const s = getComputedStyle(c);
      return { w: c.offsetWidth, h: c.offsetHeight, cols: s.gridTemplateColumns, gap: s.gap };
    });
    console.log('\nGrid:', JSON.stringify(grid));

    // Count list items
    const listCount = await page.evaluate(() => {
      const view = document.getElementById('__xmlview1');
      return view.querySelectorAll('.sapMLIB').length;
    });
    console.log('\nList items:', listCount);

    // Screenshot
    await page.screenshot({ path: 'test-assignments-v2.png', fullPage: false });
    console.log('Screenshot: test-assignments-v2.png');
  } else {
    console.log('WARNING: Assignments view still not visible!');
    await page.screenshot({ path: 'test-assignments-v2.png', fullPage: false });
  }

  // Navigate back
  await page.evaluate(() => {
    window.location.hash = '#ZLEARNING-display&/';
  });
  await page.waitForTimeout(3000);
  console.log('\nBack on home. Hash:', new URL(page.url()).hash);
  await page.screenshot({ path: 'test-home-v2.png', fullPage: false });
  console.log('Home screenshot: test-home-v2.png');
})();

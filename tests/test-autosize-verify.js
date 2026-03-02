const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== AUTOSIZE VERIFICATION (deployed code — NO injection) ===\n');

  const sizes = [
    { name: 'Phone (375x667)', w: 375, h: 667 },
    { name: 'Tablet (768x1024)', w: 768, h: 1024 },
    { name: 'Laptop (1366x768)', w: 1366, h: 768 },
    { name: 'Desktop (1920x1080)', w: 1920, h: 1080 },
    { name: 'Current (767x730)', w: 767, h: 730 }
  ];

  function checkOverflows() {
    return page.evaluate(() => {
      const overflows = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > el.clientWidth + 5 && el.offsetWidth > 0 && el.clientWidth > 50) {
          const cs = window.getComputedStyle(el);
          if (cs.overflowX !== 'hidden' && cs.overflowX !== 'scroll' && cs.overflow !== 'hidden') {
            overflows.push({
              id: el.id?.substring(0, 50) || el.tagName,
              cls: Array.from(el.classList).slice(0, 3).join(' '),
              cW: el.clientWidth, sW: el.scrollWidth,
              delta: el.scrollWidth - el.clientWidth
            });
          }
        }
      });
      overflows.sort((a, b) => b.delta - a.delta);
      return {
        overflows: overflows.slice(0, 8),
        hasHScroll: document.body.scrollWidth > document.body.clientWidth,
        bodyW: document.body.clientWidth,
        bodySW: document.body.scrollWidth
      };
    });
  }

  function printResults(label, r) {
    const overflowStr = r.overflows.length > 0
      ? '❌ ' + r.overflows.map(o => `${o.id}(+${o.delta}px)`).join(', ')
      : '✅ None';
    const bodyStr = r.hasHScroll ? `❌ H-scroll (${r.bodyW} vs ${r.bodySW})` : '✅ OK';
    console.log(`${label}: ${overflowStr} | Body: ${bodyStr}`);
    return r.overflows.length === 0 && !r.hasHScroll;
  }

  let allPass = true;

  // ---- TRAININGS PAGE ----
  console.log('--- Trainings Page ---');
  for (const size of sizes) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.waitForTimeout(1000);
    const r = await checkOverflows();
    if (!printResults(size.name, r)) allPass = false;
  }

  // ---- ASSIGNMENTS PAGE ----
  console.log('\n--- Assignments Page ---');
  const switched = await page.evaluate(() => {
    // Try IconTabBar text elements
    const tabs = document.querySelectorAll('.sapMITBText, .sapMITBItem');
    for (const t of tabs) {
      if (t.textContent && t.textContent.includes('Assignment')) {
        t.click();
        return true;
      }
    }
    // Try hash navigation
    if (window.location.hash.indexOf('Assignments') === -1) {
      const h = window.hasher || (sap && sap.ui && sap.ui.core && sap.ui.core.routing);
      // Try direct hash
      window.location.hash = window.location.hash.replace(/(&\/.*)?$/, '&/Assignments');
      return 'hash';
    }
    return false;
  });
  console.log(`Navigation: ${switched}`);
  await page.waitForTimeout(2500);

  for (const size of sizes) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.waitForTimeout(1000);
    const r = await checkOverflows();
    if (!printResults(size.name, r)) allPass = false;
  }

  // Navigate back
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('.sapMITBText, .sapMITBItem');
    for (const t of tabs) {
      if (t.textContent && t.textContent.includes('Training') && !t.textContent.includes('Assignment')) {
        t.click();
        return;
      }
    }
  });
  await page.waitForTimeout(1000);

  // Restore viewport
  await page.setViewportSize({ width: 767, height: 730 });

  console.log('\n========================================');
  console.log(allPass ? '✅ ALL SIZES PASS on both pages!' : '❌ SOME ISSUES REMAIN — see above');
  console.log('========================================');
  
  await browser.close();
})();

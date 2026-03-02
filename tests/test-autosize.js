const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== AUTOSIZE DIAGNOSTIC: Both Pages ===\n');

  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    screenWidth: screen.width,
    screenHeight: screen.height
  }));
  console.log('Viewport:', JSON.stringify(viewport));

  // Check Trainings page (current page) sizing
  const trainingsPage = await page.evaluate(() => {
    const results = {};
    
    // Page container
    const pg = document.querySelector('.sapMPage');
    if (pg) {
      const cs = window.getComputedStyle(pg);
      results.page = { w: pg.offsetWidth, h: pg.offsetHeight, overflow: cs.overflow, overflowY: cs.overflowY };
    }
    
    // Section
    const sec = document.querySelector('.sapMPage > section');
    if (sec) {
      const cs = window.getComputedStyle(sec);
      results.section = { 
        w: sec.offsetWidth, h: sec.offsetHeight, 
        overflow: cs.overflow, overflowY: cs.overflowY,
        scrollHeight: sec.scrollHeight, clientHeight: sec.clientHeight
      };
    }
    
    // SmartTable
    const st = document.querySelector('.sapUiCompSmartTable');
    if (st) {
      const cs = window.getComputedStyle(st);
      results.smartTable = { 
        w: st.offsetWidth, h: st.offsetHeight,
        minHeight: cs.minHeight, flex: cs.flex
      };
    }
    
    // Grid table inside
    const gt = document.querySelector('.sapUiTable');
    if (gt) {
      results.gridTable = { w: gt.offsetWidth, h: gt.offsetHeight };
    }
    
    // ScrollContainer for card view
    const sc = document.querySelector('.sapMScrollCont');
    if (sc) {
      const cs = window.getComputedStyle(sc);
      results.scrollContainer = { 
        w: sc.offsetWidth, h: sc.offsetHeight,
        visibility: cs.visibility, display: cs.display
      };
    }
    
    // Analytics panel
    const analytics = document.querySelector('.analyticsContainer, [class*="analytics"]');
    if (analytics) {
      results.analytics = { w: analytics.offsetWidth, h: analytics.offsetHeight };
    }
    
    // Check if anything overflows horizontally
    const body = document.body;
    results.bodyOverflow = {
      scrollWidth: body.scrollWidth, clientWidth: body.clientWidth,
      hasHScroll: body.scrollWidth > body.clientWidth
    };

    // Check card grid
    const cardGrid = document.querySelector('.sapFGridList');
    if (cardGrid) {
      const cs = window.getComputedStyle(cardGrid);
      results.cardGrid = { w: cardGrid.offsetWidth, h: cardGrid.offsetHeight, display: cs.display };
    }
    
    // Check all elements wider than viewport
    const allWide = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.offsetWidth > window.innerWidth + 5) {
        allWide.push({
          tag: el.tagName,
          id: el.id ? el.id.substring(0, 60) : '',
          class: (el.className || '').toString().substring(0, 60),
          w: el.offsetWidth
        });
      }
    });
    if (allWide.length > 0) results.elementsWiderThanViewport = allWide.slice(0, 10);
    
    return results;
  });
  console.log('\n--- TRAININGS PAGE ---');
  console.log(JSON.stringify(trainingsPage, null, 2));

  // Now check at different viewport sizes
  const sizes = [
    { name: 'Phone (375x667)', w: 375, h: 667 },
    { name: 'Tablet (768x1024)', w: 768, h: 1024 },
    { name: 'Small Laptop (1366x768)', w: 1366, h: 768 },
    { name: 'Current', w: viewport.innerWidth, h: viewport.innerHeight }
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.waitForTimeout(500);
    
    const sizeResult = await page.evaluate(() => {
      const sec = document.querySelector('.sapMPage > section');
      const st = document.querySelector('.sapUiCompSmartTable');
      const body = document.body;
      return {
        pageW: document.querySelector('.sapMPage')?.offsetWidth || 0,
        sectionH: sec ? sec.offsetHeight : 0,
        sectionScrollH: sec ? sec.scrollHeight : 0,
        tableH: st ? st.offsetHeight : 0,
        tableMinH: st ? window.getComputedStyle(st).minHeight : '',
        hasHScroll: body.scrollWidth > body.clientWidth,
        bodyScrollW: body.scrollWidth,
        bodyClientW: body.clientWidth
      };
    });
    console.log(`\n${size.name} (${size.w}x${size.h}):`, JSON.stringify(sizeResult));
  }

  // Reset viewport
  await page.setViewportSize({ width: viewport.innerWidth, height: viewport.innerHeight });

  // Try to navigate to assignments page
  console.log('\n--- CHECKING ASSIGNMENTS PAGE ---');
  const navResult = await page.evaluate(() => {
    // Find nav to assignments
    const allBtns = document.querySelectorAll('.sapMSegBBtn, [id*="assignment"], [id*="myAssignment"]');
    const btnInfo = [];
    allBtns.forEach(b => btnInfo.push({ id: b.id, text: b.textContent?.substring(0, 30) }));
    return btnInfo;
  });
  console.log('Assignment nav buttons:', JSON.stringify(navResult.slice(0, 10)));

  await browser.close();
})();

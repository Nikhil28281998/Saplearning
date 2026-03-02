const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== AUTOSIZE DEEP DIAGNOSTIC ===\n');

  // 1. Get all visible pages and their sizes
  const pageInfo = await page.evaluate(() => {
    const pages = document.querySelectorAll('[class*="sapMPage"], [class*="sapMNavContainer"]');
    const visible = [];
    pages.forEach(p => {
      if (p.offsetWidth > 0 && p.offsetHeight > 0) {
        visible.push({
          id: p.id?.substring(0, 60) || '', 
          tag: p.tagName,
          classes: p.className?.toString().substring(0, 80) || '',
          w: p.offsetWidth, h: p.offsetHeight,
          scrollW: p.scrollWidth, scrollH: p.scrollHeight
        });
      }
    });
    return visible;
  });
  console.log('1. Visible page containers:');
  pageInfo.forEach(p => console.log(`   ${p.id} (${p.w}x${p.h}) scroll:(${p.scrollW}x${p.scrollH})`));

  // 2. Check specific view containers
  const views = await page.evaluate(() => {
    const results = [];
    // Check xmlview0 (Trainings) and xmlview1 (Assignments)
    for (let i = 0; i < 5; i++) {
      const v = document.getElementById('__xmlview' + i);
      if (v) {
        const cs = window.getComputedStyle(v);
        results.push({
          id: '__xmlview' + i,
          w: v.offsetWidth, h: v.offsetHeight,
          display: cs.display, visibility: cs.visibility,
          overflow: cs.overflow, overflowY: cs.overflowY,
          scrollH: v.scrollHeight, clientH: v.clientHeight,
          childClass: v.firstElementChild?.className?.toString().substring(0, 50) || ''
        });
      }
    }
    return results;
  });
  console.log('\n2. XML Views:');
  views.forEach(v => console.log(`   ${v.id}: ${v.w}x${v.h} display:${v.display} scroll:${v.scrollH} child:${v.childClass}`));

  // 3. Check the currently active page content
  const activeContent = await page.evaluate(() => {
    // Find main content sections
    const sections = document.querySelectorAll('section');
    const visibleSections = [];
    sections.forEach(s => {
      if (s.offsetWidth > 0 && s.offsetHeight > 0) {
        const cs = window.getComputedStyle(s);
        visibleSections.push({
          parentId: s.parentElement?.id?.substring(0, 50) || '',
          w: s.offsetWidth, h: s.offsetHeight, 
          scrollH: s.scrollHeight,
          overflow: cs.overflow, overflowY: cs.overflowY,
          flex: cs.flex
        });
      }
    });

    // Find visible SmartTables
    const tables = document.querySelectorAll('.sapUiCompSmartTable');
    const visTables = [];
    tables.forEach(t => {
      if (t.offsetWidth > 0) {
        const cs = window.getComputedStyle(t);
        visTables.push({
          id: t.id?.substring(0, 60) || '',
          w: t.offsetWidth, h: t.offsetHeight,
          minH: cs.minHeight, flex: cs.flex,
          visible: t.offsetHeight > 0
        });
      }
    });

    // Find responsive tables
    const respTables = document.querySelectorAll('.sapMList, .sapMListTbl');
    const visResp = [];
    respTables.forEach(t => {
      if (t.offsetWidth > 0 && t.offsetHeight > 0) {
        visResp.push({
          id: t.id?.substring(0, 60) || '',
          w: t.offsetWidth, h: t.offsetHeight,
          scrollH: t.scrollHeight
        });
      }
    });

    // Check any elements that cause horizontal overflow
    const overflows = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollWidth > el.clientWidth + 2 && el.offsetWidth > 0 && el.clientWidth > 0) {
        const cs = window.getComputedStyle(el);
        if (cs.overflowX !== 'hidden' && cs.overflowX !== 'scroll' && cs.overflow !== 'hidden') {
          overflows.push({
            id: el.id?.substring(0, 50) || '',
            tag: el.tagName,
            class: el.className?.toString().substring(0, 50) || '',
            clientW: el.clientWidth, scrollW: el.scrollWidth,
            diff: el.scrollWidth - el.clientWidth
          });
        }
      }
    });

    return { sections: visibleSections, smartTables: visTables, respTables: visResp, overflows: overflows.slice(0, 15) };
  });
  console.log('\n3. Visible sections:');
  activeContent.sections.forEach(s => console.log(`   parent:${s.parentId} ${s.w}x${s.h} scrollH:${s.scrollH} overflow:${s.overflowY}`));
  console.log('\n4. SmartTables:');
  activeContent.smartTables.forEach(t => console.log(`   ${t.id} ${t.w}x${t.h} minH:${t.minH} flex:${t.flex}`));
  console.log('\n5. Responsive Tables:');
  activeContent.respTables.forEach(t => console.log(`   ${t.id} ${t.w}x${t.h} scrollH:${t.scrollH}`));
  console.log('\n6. Elements with horizontal overflow:');
  if (activeContent.overflows.length === 0) console.log('   None found');
  activeContent.overflows.forEach(o => console.log(`   ${o.tag}#${o.id} .${o.class} clientW:${o.clientW} scrollW:${o.scrollW} (+${o.diff}px)`));

  // 4. Test at different sizes
  const testSizes = [
    { name: 'Phone', w: 375, h: 667 },
    { name: 'Tablet', w: 768, h: 1024 },
    { name: 'Laptop', w: 1366, h: 768 }
  ];

  for (const size of testSizes) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.waitForTimeout(800);
    
    const r = await page.evaluate(() => {
      const overflows = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > el.clientWidth + 5 && el.offsetWidth > 0 && el.clientWidth > 50) {
          overflows.push({
            id: el.id?.substring(0, 40) || '',
            tag: el.tagName,
            class: (el.className || '').toString().substring(0, 40),
            cW: el.clientWidth, sW: el.scrollWidth
          });
        }
      });

      // Card sizes
      const cards = document.querySelectorAll('.sapFCard, .sapMCard, [class*="cardItem"]');
      let cardInfo = [];
      cards.forEach((c, i) => {
        if (i < 3 && c.offsetWidth > 0) {
          cardInfo.push({ w: c.offsetWidth, h: c.offsetHeight });
        }
      });
      
      // Check visible sections
      const secs = [];
      document.querySelectorAll('section').forEach(s => {
        if (s.offsetHeight > 0) {
          secs.push({ h: s.offsetHeight, scrollH: s.scrollHeight, canScroll: s.scrollHeight > s.clientHeight });
        }
      });
      
      return { overflows: overflows.slice(0, 8), cards: cardInfo, sections: secs };
    });
    console.log(`\n--- ${size.name} (${size.w}x${size.h}) ---`);
    console.log('   Overflows:', r.overflows.length > 0 ? JSON.stringify(r.overflows) : 'None');
    console.log('   Cards:', JSON.stringify(r.cards));
    console.log('   Sections:', JSON.stringify(r.sections));
  }

  // Reset
  await page.setViewportSize({ width: 767, height: 730 });
  
  await browser.close();
})();

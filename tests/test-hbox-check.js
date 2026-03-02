const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  // Check what __hbox6 clones are
  const info = await page.evaluate(() => {
    const el = document.getElementById('__hbox6-__clone1');
    if (!el) return { error: 'not found' };
    const cs = window.getComputedStyle(el);
    return {
      tag: el.tagName,
      class: el.className?.toString().substring(0, 100),
      parentClass: el.parentElement?.className?.toString().substring(0, 80),
      grandparentClass: el.parentElement?.parentElement?.className?.toString().substring(0, 80),
      innerHTML: el.innerHTML.substring(0, 300),
      w: el.offsetWidth, h: el.offsetHeight,
      cW: el.clientWidth, sW: el.scrollWidth,
      overflow: cs.overflow, overflowX: cs.overflowX,
      display: cs.display, flexWrap: cs.flexWrap,
      whiteSpace: cs.whiteSpace
    };
  });
  console.log('__hbox6-__clone1:', JSON.stringify(info, null, 2));
  await browser.close();
})();

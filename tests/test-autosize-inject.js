const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== INJECT CSS FIX + VERIFY ===\n');

  // Inject the phone fix CSS at runtime
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 600px) {
        .cardGridWrapper .sapFGridList .sapFGridListUl,
        .sapFGridList .sapUiLayoutCSSGridBoxLayoutPolyfill,
        .sapFGridList ul[class*="sapUiLayoutCSSGrid"] {
          grid-template-columns: 1fr !important;
          max-width: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .sapMScrollCont,
        .sapMScrollContScroll {
          max-width: 100vw !important;
          overflow-x: hidden !important;
        }
        .cardGridWrapper {
          max-width: 100% !important;
          overflow: hidden !important;
        }
        .learningCard {
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        .learningCardMeta .sapMObjStatusText {
          max-width: 100% !important;
        }
      }
      /* Global dialog height cap */
      .sapMDialog {
        max-width: 90vw !important;
        max-height: 90vh !important;
      }
      /* ObjectStatus text fix */
      .learningCardMeta {
        overflow: hidden !important;
        max-width: 100% !important;
      }
      .learningCardMeta .sapMObjStatus {
        max-width: 100% !important;
        overflow: hidden !important;
      }
      .learningCardMeta .sapMObjStatusText {
        max-width: 100% !important;
        overflow: hidden !important;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Card body overflow containment */
      .learningCardBody {
        overflow: hidden !important;
        min-width: 0 !important;
      }
      .learningCardContent {
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      /* ScrollContainer flex */
      .sapMScrollCont {
        flex: 1 1 auto !important;
        min-height: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
  console.log('CSS injected\n');

  const sizes = [
    { name: 'Phone (375x667)', w: 375, h: 667 },
    { name: 'Tablet (768x1024)', w: 768, h: 1024 },
    { name: 'Laptop (1366x768)', w: 1366, h: 768 },
    { name: 'Current (767x730)', w: 767, h: 730 }
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.waitForTimeout(800);
    
    const r = await page.evaluate(() => {
      const overflows = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > el.clientWidth + 5 && el.offsetWidth > 0 && el.clientWidth > 50) {
          const cs = window.getComputedStyle(el);
          if (cs.overflowX !== 'hidden' && cs.overflowX !== 'scroll' && cs.overflow !== 'hidden') {
            overflows.push({
              id: el.id?.substring(0, 40) || el.tagName,
              cW: el.clientWidth, sW: el.scrollWidth
            });
          }
        }
      });
      return { overflows: overflows.slice(0, 5), hasHScroll: document.body.scrollWidth > document.body.clientWidth };
    });

    const overflow = r.overflows.length > 0 ? '❌ ' + r.overflows.map(o => `${o.id}(+${o.sW-o.cW}px)`).join(', ') : '✅ None';
    console.log(`${size.name}: ${overflow} | Body: ${r.hasHScroll ? '❌ H-scroll' : '✅ OK'}`);
  }

  await page.setViewportSize({ width: 767, height: 730 });
  await browser.close();
})();

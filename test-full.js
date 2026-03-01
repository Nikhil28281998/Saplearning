const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  
  let page = null;
  for (const p of pages) {
    const url = p.url();
    if (url.includes('flp') || url.includes('ZLEARNING')) { page = p; break; }
  }
  
  if (!page) { console.log('No FLP page found'); await browser.close(); return; }
  console.log('Connected:', page.url());

  const action = process.argv[2] || 'inspect';

  if (action === 'inspect') {
    const info = await page.evaluate(() => {
      const result = {};
      
      // All visible buttons
      const btns = document.querySelectorAll('button');
      result.buttons = Array.from(btns)
        .filter(b => b.offsetParent !== null && b.textContent.trim().length > 0)
        .map(b => ({ text: b.textContent.trim().substring(0, 60), id: b.id }));
      
      // All VBox items that could be analytics cards (look for sapMFlexBox with specific structure)
      const vboxes = document.querySelectorAll('.sapMFlexBox, .sapMVBox');
      result.vboxCount = vboxes.length;
      
      // Look for ObjectNumber elements (KPI values)
      const objNums = document.querySelectorAll('.sapMObjectNumber');
      result.objectNumbers = Array.from(objNums).map(o => ({
        text: o.textContent.trim(),
        visible: o.offsetParent !== null,
        parentId: o.closest('[id]')?.id
      }));
      
      // Look for titles
      const titles = document.querySelectorAll('.sapMTitle');
      result.titles = Array.from(titles)
        .filter(t => t.offsetParent !== null)
        .map(t => ({ text: t.textContent.trim().substring(0, 40), id: t.id }));
      
      // Look for icons  
      const icons = document.querySelectorAll('.sapUiIcon');
      result.iconCount = icons.length;
      result.iconSamples = Array.from(icons).slice(0, 10).map(i => ({
        src: i.getAttribute('data-sap-ui-icon-content'),
        parentId: i.closest('[id]')?.id,
        visible: i.offsetParent !== null
      }));
      
      // Any element with 'analytics' in class or id
      const analyticsEls = document.querySelectorAll('[class*="analytics" i], [id*="analytics" i], [class*="Analytics" i], [id*="Analytics" i]');
      result.analyticsElements = Array.from(analyticsEls).map(e => ({
        tag: e.tagName, id: e.id, class: e.className.substring(0, 80),
        visible: e.offsetParent !== null, childCount: e.children.length
      }));
      
      // Training list table
      const listItems = document.querySelectorAll('.sapMLIB, .sapMListTblRow');
      result.listItemCount = listItems.length;
      
      // Filter bar elements
      const inputs = document.querySelectorAll('.sapMInput, .sapMSlt, .sapMCB');
      result.inputElements = Array.from(inputs)
        .filter(i => i.offsetParent !== null)
        .map(i => ({ tag: i.tagName, id: i.id, class: i.className.substring(0, 60) }));
      
      // All custom CSS classes
      const allEls = document.querySelectorAll('[class*="Container"], [class*="container"]');
      result.containers = Array.from(allEls).map(e => ({
        id: e.id, class: e.className.substring(0, 100), childCount: e.children.length, visible: e.offsetParent !== null
      })).filter(e => e.visible);
      
      return result;
    });
    
    console.log('\n=== VISIBLE BUTTONS ===');
    info.buttons.forEach(b => console.log(`  [${b.id}] ${b.text}`));
    
    console.log('\n=== OBJECT NUMBERS (KPI VALUES) ===');
    info.objectNumbers.forEach(o => console.log(`  ${o.text} (visible: ${o.visible}, parent: ${o.parentId})`));
    
    console.log('\n=== VISIBLE TITLES ===');
    info.titles.forEach(t => console.log(`  [${t.id}] ${t.text}`));
    
    console.log('\n=== ANALYTICS ELEMENTS ===');
    info.analyticsElements.forEach(e => console.log(`  [${e.id}] ${e.tag} class="${e.class}" visible=${e.visible} children=${e.childCount}`));
    
    console.log('\n=== CONTAINERS ===');
    info.containers.forEach(c => console.log(`  [${c.id}] class="${c.class}" children=${c.childCount}`));
    
    console.log('\n=== INPUTS/FILTERS ===');
    info.inputElements.forEach(i => console.log(`  [${i.id}] ${i.class}`));
    
    console.log(`\nList items: ${info.listItemCount}, VBox count: ${info.vboxCount}, Icons: ${info.iconCount}`);
    
    await page.screenshot({ path: 'test-screenshots/retest-home-full.png', fullPage: false });
    console.log('\nScreenshot saved.');
  }
  
  if (action === 'nav-test') {
    const hash = await page.evaluate(() => window.location.hash);
    console.log('Current hash:', hash);
    
    // Step 1: Click My Assignments
    console.log('\n--- STEP 1: Click My Assignments ---');
    const myAssignBtn = await page.$('button:has-text("My Assignments")');
    if (!myAssignBtn) {
      // Try alternative selector
      const allBtns = await page.$$('button');
      for (const btn of allBtns) {
        const text = await btn.textContent();
        if (text.includes('My Assign') || text.includes('Assignments')) {
          console.log('Found button via scan:', text.trim());
          await btn.click();
          break;
        }
      }
    } else {
      await myAssignBtn.click();
    }
    
    await page.waitForTimeout(3000);
    
    const hash2 = await page.evaluate(() => window.location.hash);
    console.log('Hash after My Assignments click:', hash2);
    await page.screenshot({ path: 'test-screenshots/retest-assignments.png' });
    
    // Inspect assignments page
    const assignInfo = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="analytics"], [class*="Analytics"]');
      const objNums = document.querySelectorAll('.sapMObjectNumber');
      const titles = document.querySelectorAll('.sapMTitle');
      
      return {
        analyticsEls: Array.from(cards).map(c => ({
          id: c.id, class: c.className.substring(0, 80), visible: c.offsetParent !== null, children: c.children.length
        })),
        numbers: Array.from(objNums).filter(o => o.offsetParent !== null).map(o => ({
          text: o.textContent.trim(), parent: o.closest('[id]')?.id
        })),
        titles: Array.from(titles).filter(t => t.offsetParent !== null).map(t => ({
          text: t.textContent.trim().substring(0, 40), id: t.id
        }))
      };
    });
    console.log('Assignments page analytics:', JSON.stringify(assignInfo.analyticsEls, null, 2));
    console.log('Assignments page numbers:', JSON.stringify(assignInfo.numbers, null, 2));
    console.log('Assignments page titles:', JSON.stringify(assignInfo.titles, null, 2));
    
    // Step 2: Test back navigation
    console.log('\n--- STEP 2: Click Back ---');
    
    // Check view states before
    const viewsBefore = await page.evaluate(() => {
      const views = document.querySelectorAll('[id*="xmlview"], [id*="__xmlview"]');
      return Array.from(views).map(v => ({
        id: v.id, display: getComputedStyle(v).display,
        hasHidden: v.classList.contains('sapMNavItemHidden'),
        rect: { x: v.getBoundingClientRect().x, y: v.getBoundingClientRect().y, w: v.getBoundingClientRect().width, h: v.getBoundingClientRect().height }
      }));
    });
    console.log('Views BEFORE back:', JSON.stringify(viewsBefore, null, 2));
    
    const backBtn = await page.$('.sapMBarLeft .sapMBtn, [id*="backBtn"], .sapMBtnBack');
    if (backBtn) {
      await backBtn.click();
      await page.waitForTimeout(3000);
      
      const hash3 = await page.evaluate(() => window.location.hash);
      console.log('Hash after back:', hash3);
      
      // Check view states after
      const viewsAfter = await page.evaluate(() => {
        const views = document.querySelectorAll('[id*="xmlview"], [id*="__xmlview"]');
        return Array.from(views).map(v => ({
          id: v.id, display: getComputedStyle(v).display,
          hasHidden: v.classList.contains('sapMNavItemHidden'),
          rect: { x: v.getBoundingClientRect().x, y: v.getBoundingClientRect().y, w: v.getBoundingClientRect().width, h: v.getBoundingClientRect().height }
        }));
      });
      console.log('Views AFTER back:', JSON.stringify(viewsAfter, null, 2));
      
      await page.screenshot({ path: 'test-screenshots/retest-after-back.png' });
      console.log('Screenshot saved: retest-after-back.png');
      
      // Check if the correct page is showing
      const visiblePage = await page.evaluate(() => {
        const views = document.querySelectorAll('[id*="__xmlview"]');
        for (const v of views) {
          if (getComputedStyle(v).display !== 'none' && v.offsetParent !== null) {
            const title = v.querySelector('.sapMTitle');
            return { id: v.id, title: title?.textContent?.substring(0, 40) || 'N/A' };
          }
        }
        return null;
      });
      console.log('Visible page after back:', JSON.stringify(visiblePage));
    } else {
      console.log('Back button not found!');
    }
  }
  
  await browser.close();
})();

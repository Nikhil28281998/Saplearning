const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('ZLEARNING') || p.url().includes('flp'));
  
  // 1. Check dropdown items class
  const roleSelect = await page.$('[id$="--filterRole"]');
  if (roleSelect) {
    await roleSelect.click();
    await page.waitForTimeout(800);
    const items = await page.evaluate(() => {
      const popover = document.querySelector('.sapMSltPicker, .sapMPopover, .sapMDialog');
      if (!popover) return { found: false };
      const lis = popover.querySelectorAll('li, .sapMSLI, .sapMSelectListItem');
      return { found: true, count: lis.length, text: popover.innerText.substring(0,400), cls: popover.className.substring(0,100) };
    });
    console.log('1. Role dropdown:', JSON.stringify(items));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  
  // 2. ViewMode buttons
  const segBtns = await page.evaluate(() => {
    const btns = document.querySelectorAll('[id*="viewMode"]');
    return Array.from(btns).map(b => ({ id: b.id.split('--').pop(), tag: b.tagName, vis: b.offsetParent !== null }));
  });
  console.log('2. ViewMode buttons:', JSON.stringify(segBtns));
  
  // 3. SmartTable
  const st = await page.evaluate(() => {
    const el = document.querySelector('[id$="--smartTable"]');
    return el ? { found: true, vis: el.offsetParent !== null, display: getComputedStyle(el).display } : { found: false };
  });
  console.log('3. SmartTable:', JSON.stringify(st));
  
  // 4. Try clicking table button
  const tableBtn = await page.$('[id$="--viewModeTable"]');
  if (tableBtn) {
    const vis = await tableBtn.isVisible();
    console.log('4a. viewModeTable visible:', vis);
    if (vis) {
      await tableBtn.click();
      await page.waitForTimeout(2000);
      const st2 = await page.evaluate(() => {
        const el = document.querySelector('[id$="--smartTable"]');
        return el ? { vis: el.offsetParent !== null } : { found: false };
      });
      console.log('4b. After click SmartTable:', JSON.stringify(st2));
    }
  }
  
  // 5. OData model - better approach
  const odata = await page.evaluate(() => {
    try {
      // Try component registry (SAPUI5 1.x)
      const registry = sap.ui.core.Component.registry;
      if (registry) {
        const all = registry.all();
        const keys = Object.keys(all);
        if (keys.length > 0) {
          const comp = all[keys[0]];
          const model = comp.getModel();
          return { method: 'registry', comps: keys.length, model: model ? model.getMetadata().getName() : 'none' };
        }
      }
      // Fallback
      const view = sap.ui.getCore().byId('__component0---TrainingsList');
      if (view) {
        const m = view.getModel();
        return { method: 'byId', model: m ? m.getMetadata().getName() : 'none' };
      }
      return { method: 'none' };
    } catch(e) { return { error: e.message }; }
  });
  console.log('5. OData:', JSON.stringify(odata));
  
  // 6. InvisibleText labels
  const labels = await page.evaluate(() => {
    return ['trainingsFilterLabel','trainingsTableLabel','refreshButtonLabel'].map(id => {
      const el = document.querySelector('[id$="--' + id + '"]');
      return { id, found: !!el };
    });
  });
  console.log('6. Labels:', JSON.stringify(labels));
  
  // 7. Due date warning elements (on Assignments page)  
  // Navigate to assignments first
  const myAssBtn = await page.$('[id$="--myAssignmentsBtn"]');
  if (myAssBtn && await myAssBtn.isVisible()) {
    await myAssBtn.click();
    await page.waitForTimeout(3000);
  }
  const dueWarn = await page.evaluate(() => {
    const banner = document.querySelector('[id$="--dueDateWarningBanner"]');
    const icon = document.querySelector('[id$="--dueDateWarningIcon"]');
    const btn = document.querySelector('[id$="--dueDateWarningBtn"]');
    // Check all elements with dueDateWarning in ID
    const allDue = document.querySelectorAll('[id*="dueDateWarning"]');
    return {
      banner: !!banner, bannerVis: banner ? banner.offsetParent !== null : false,
      icon: !!icon, btn: !!btn,
      bannerClass: banner ? banner.className.substring(0,100) : '',
      allDueIds: Array.from(allDue).map(e => e.id.split('--').pop())
    };
  });
  console.log('7. DueWarn:', JSON.stringify(dueWarn));
  
  // 8. Assignment card grid
  const agrid = await page.evaluate(() => {
    const g = document.querySelector('[id$="--assignCardGrid"]');
    return g ? { found: true, vis: g.offsetParent !== null, children: g.children.length } : { found: false };
  });
  console.log('8. AssignCardGrid:', JSON.stringify(agrid));
  
  // 9. Status filter
  const stFilter = await page.$('[id$="--filterAssignStatus"]');
  if (stFilter) {
    await stFilter.click();
    await page.waitForTimeout(800);
    const fitems = await page.evaluate(() => {
      const popup = document.querySelector('.sapMSltPicker, .sapMPopover');
      if (!popup) return { found: false };
      const lis = popup.querySelectorAll('li');
      return { found: true, count: lis.length, text: popup.innerText.substring(0,300) };
    });
    console.log('9. StatusFilter:', JSON.stringify(fitems));
    await page.keyboard.press('Escape');
  }
  
  // 10. Button types on assignment page
  const btnTypes = await page.evaluate(() => {
    const start = document.querySelector('[id$="--startTrainingBtn"]');
    const complete = document.querySelector('[id$="--markCompletedBtn"]');
    return {
      start: start ? start.className.substring(0,150) : 'NOT FOUND',
      complete: complete ? complete.className.substring(0,150) : 'NOT FOUND'
    };
  });
  console.log('10. BtnTypes:', JSON.stringify(btnTypes));
  
  // 11. Assign button on home page (need to navigate back)
  await page.goBack();
  await page.waitForTimeout(2000);
  // Switch to table
  const tBtn = await page.$('[id$="--viewModeTable"]');
  if (tBtn && await tBtn.isVisible()) { await tBtn.click(); await page.waitForTimeout(2000); }
  const assignBtn = await page.evaluate(() => {
    const el = document.querySelector('[id$="--assignButton"]');
    return el ? { found: true, vis: el.offsetParent !== null, class: el.className.substring(0,100) } : { found: false };
  });
  console.log('11. AssignBtn:', JSON.stringify(assignBtn));
  
  // 12. Empty state illustration
  const emptyState = await page.evaluate(() => {
    const el = document.querySelector('[id$="--trainingsEmptyState"]');
    // Also check any IllustratedMessage
    const ills = document.querySelectorAll('.sapFIllustratedMessage, [id*="EmptyState"], [id*="emptyState"]');
    return { found: !!el, allEmpties: Array.from(ills).map(e => e.id.split('--').pop()) };
  });
  console.log('12. EmptyState:', JSON.stringify(emptyState));

  await browser.close();
})();

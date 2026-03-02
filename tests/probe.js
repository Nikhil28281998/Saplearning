/**
 * Quick probe to verify Playwright can interact with the SAP app
 */
const { chromium } = require('@playwright/test');

(async () => {
  console.log('Connecting to Chrome...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages().find(p => p.url().includes('ZLEARNING') || p.url().includes('flp'));
  
  if (!page) {
    console.log('ERROR: No SAP tab found');
    await browser.close();
    process.exit(1);
  }

  console.log('URL:', page.url().substring(0, 100));
  
  // Wait for SAPUI5
  await page.waitForTimeout(2000);
  
  const ui5Loaded = await page.evaluate(() => {
    try { return typeof sap !== 'undefined' && typeof sap.ui !== 'undefined'; }
    catch(e) { return false; }
  });
  console.log('SAPUI5 loaded:', ui5Loaded);
  
  // Check main page
  const mainPage = await page.$('[id$="--trainingsListPage"]');
  console.log('TrainingsList page:', mainPage ? 'FOUND' : 'NOT FOUND');
  
  // Check role badge
  const roleBadge = await page.$('[id$="--roleBadge"]');
  if (roleBadge) {
    const text = await roleBadge.textContent();
    console.log('Role badge:', text.trim());
  } else {
    console.log('Role badge: NOT FOUND');
  }
  
  // Check analytics panel
  const analyticsPanel = await page.$('[id$="--teamAnalyticsPanel"]');
  console.log('Analytics panel:', analyticsPanel ? 'FOUND' : 'NOT FOUND');
  
  // Check KPI cards
  const kpiCards = ['teamTotalBox', 'teamAssignedBox', 'teamInProgressBox', 'teamOverdueBox', 'teamCompletedBox', 'teamCompletionPctBox'];
  for (const card of kpiCards) {
    const el = await page.$(`[id$="--${card}"]`);
    if (el) {
      const visible = await el.isVisible();
      console.log(`  ${card}: ${visible ? 'VISIBLE' : 'hidden'}`);
    } else {
      console.log(`  ${card}: NOT IN DOM`);
    }
  }
  
  // Check SmartFilterBar
  const sfb = await page.$('[id$="--smartFilterBar"]');
  console.log('SmartFilterBar:', sfb ? 'FOUND' : 'NOT FOUND');
  
  // Check filter dropdowns
  for (const fid of ['filterRole', 'filterTopic', 'filterModule']) {
    const el = await page.$(`[id$="--${fid}"]`);
    console.log(`  ${fid}: ${el ? 'FOUND' : 'NOT FOUND'}`);
  }
  
  // Check card grid
  const cardGrid = await page.$('[id$="--cardGrid"]');
  const smartTable = await page.$('[id$="--smartTable"]');
  console.log('Card grid:', cardGrid ? (await cardGrid.isVisible() ? 'VISIBLE' : 'hidden') : 'NOT FOUND');
  console.log('Smart table:', smartTable ? (await smartTable.isVisible() ? 'VISIBLE' : 'hidden') : 'NOT FOUND');
  
  // Count cards
  if (cardGrid) {
    const cards = await page.$$('[id$="--cardGrid"] .learningCard');
    console.log('Learning cards count:', cards.length);
  }
  
  // Check toolbar buttons
  for (const bid of ['createTrainingBtn', 'editTrainingBtn', 'deleteTrainingBtn', 'assignButton', 'enrollMeBtn', 'detailsButton', 'myAssignmentsBtn']) {
    const el = await page.$(`[id$="--${bid}"]`);
    if (el) {
      const vis = await el.isVisible();
      console.log(`  ${bid}: ${vis ? 'VISIBLE' : 'hidden'}`);
    } else {
      console.log(`  ${bid}: NOT IN DOM`);
    }
  }
  
  console.log('\nDONE - probe successful');
  await browser.close();
})();

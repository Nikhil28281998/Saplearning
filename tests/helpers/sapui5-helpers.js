/**
 * SAPUI5 Playwright Helpers
 * 
 * Helper functions for interacting with SAPUI5 controls in Playwright tests.
 * SAPUI5 generates IDs with a prefix in Fiori Launchpad:
 *   application-{semanticObject}-{action}-component---{viewName}--{controlId}
 * 
 * We use [id$="--controlId"] (CSS ends-with selector) for robustness.
 */

const { expect } = require('@playwright/test');

const APP_URL = 'https://vhbrbws1wd01.hec.bridgebio.com:44380/sap/bc/ui2/flp?saml2=disabled&sap-client=400&sap-language=EN';
const HOME_HASH = '#ZLEARNING-display';
const ASSIGNMENTS_HASH = '#ZLEARNING-mytrainings';

/**
 * Get a SAPUI5 control by its view-local ID (suffix match)
 */
function ui5(controlId) {
  return `[id$="--${controlId}"]`;
}

/**
 * Get a SAPUI5 control by partial ID match (contains)
 */
function ui5Contains(partial) {
  return `[id*="${partial}"]`;
}

/**
 * Wait for SAPUI5 to finish loading and OData calls to complete
 */
async function waitForUI5(page, timeout = 20000) {
  // Wait for the shell to be rendered
  await page.waitForSelector('.sapUshellShellHead, .sapMPage, [id$="--trainingsListPage"], [id$="--assignmentsListPage"]', { 
    timeout, 
    state: 'visible' 
  }).catch(() => {});

  // Wait for busy indicators to disappear
  await page.waitForFunction(() => {
    const busyIndicators = document.querySelectorAll('.sapUiLocalBusyIndicator, .sapUiBusy');
    return busyIndicators.length === 0;
  }, { timeout: timeout }).catch(() => {});

  // Small extra wait for rendering
  await page.waitForTimeout(500);
}

/**
 * Wait for OData request to complete
 */
async function waitForOData(page, timeout = 15000) {
  await page.waitForFunction(() => {
    // Check if there are pending XHR requests
    return !document.querySelector('.sapUiLocalBusyIndicator');
  }, { timeout }).catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * Navigate to Home page (Training Catalog)
 */
async function navigateToHome(page) {
  const currentUrl = page.url();
  if (!currentUrl.includes('ZLEARNING-display') || currentUrl.includes('mytrainings')) {
    await page.goto(`${APP_URL}${HOME_HASH}`, { waitUntil: 'networkidle' });
  }
  await waitForUI5(page);
}

/**
 * Navigate to My Assignments page
 */
async function navigateToAssignments(page) {
  const currentUrl = page.url();
  if (!currentUrl.includes('ZLEARNING-mytrainings')) {
    // Try clicking the My Assignments button first
    const btn = page.locator(ui5('myAssignmentsBtn'));
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await waitForUI5(page);
    } else {
      await page.goto(`${APP_URL}${ASSIGNMENTS_HASH}`, { waitUntil: 'networkidle' });
      await waitForUI5(page);
    }
  }
  await waitForUI5(page);
}

/**
 * Get the visible text of a SAPUI5 control
 */
async function getControlText(page, controlId) {
  const el = page.locator(ui5(controlId));
  await el.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  return await el.textContent();
}

/**
 * Check if a SAPUI5 control is visible
 */
async function isControlVisible(page, controlId) {
  const el = page.locator(ui5(controlId));
  return await el.isVisible().catch(() => false);
}

/**
 * Check if a SAPUI5 control exists in DOM
 */
async function controlExists(page, controlId) {
  const count = await page.locator(ui5(controlId)).count();
  return count > 0;
}

/**
 * Click a SAPUI5 button by ID
 */
async function clickButton(page, controlId) {
  const btn = page.locator(ui5(controlId));
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
  await page.waitForTimeout(500);
}

/**
 * Get the number displayed in an ObjectNumber control
 */
async function getObjectNumberValue(page, controlId) {
  const el = page.locator(`${ui5(controlId)} .sapMObjectNumberText, ${ui5(controlId)}`);
  const text = await el.textContent();
  return text ? text.trim() : '';
}

/**
 * Check if an element has a specific CSS class
 */
async function hasClass(page, controlId, className) {
  const el = page.locator(ui5(controlId));
  const classes = await el.getAttribute('class');
  return classes ? classes.includes(className) : false;
}

/**
 * Get the user's role from the role badge
 */
async function getUserRole(page) {
  const roleBadge = page.locator(ui5('roleBadge'));
  if (await roleBadge.isVisible().catch(() => false)) {
    return await roleBadge.textContent();
  }
  return '';
}

/**
 * Switch to card view
 */
async function switchToCardView(page, isAssignmentPage = false) {
  const toggleId = isAssignmentPage ? 'assignViewModeCards' : 'viewModeCards';
  const btn = page.locator(ui5(toggleId));
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await waitForUI5(page);
  }
}

/**
 * Switch to table view
 */
async function switchToTableView(page, isAssignmentPage = false) {
  const toggleId = isAssignmentPage ? 'assignViewModeTable' : 'viewModeTable';
  const btn = page.locator(ui5(toggleId));
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await waitForUI5(page);
  }
}

/**
 * Connect to existing Chrome via CDP
 */
async function connectToChrome(chromium) {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  
  // Find the SAP app tab
  let page = pages.find(p => p.url().includes('ZLEARNING') || p.url().includes('flp'));
  
  if (!page && pages.length > 0) {
    page = pages[0];
  }
  
  if (!page) {
    page = await context.newPage();
    await page.goto(`${APP_URL}${HOME_HASH}`, { waitUntil: 'networkidle' });
  }
  
  return { browser, context, page };
}

/**
 * Count visible items in a list/grid
 */
async function countListItems(page, listId) {
  const items = page.locator(`${ui5(listId)} .sapMLIB, ${ui5(listId)} .sapMCLI`);
  return await items.count();
}

/**
 * Check if SmartFilterBar has filter fields visible
 */
async function isFilterBarVisible(page, filterBarId) {
  const filterBar = page.locator(ui5(filterBarId));
  return await filterBar.isVisible().catch(() => false);
}

/**
 * Select a value from a Select dropdown
 */
async function selectDropdownValue(page, selectId, value) {
  const select = page.locator(ui5(selectId));
  await select.click();
  await page.waitForTimeout(300);
  // Click the item in the dropdown popover
  const item = page.locator(`.sapMSelectList .sapMSLI:has-text("${value}")`);
  if (await item.isVisible().catch(() => false)) {
    await item.click();
  }
  await page.waitForTimeout(300);
}

/**
 * Check if a dialog is open
 */
async function isDialogOpen(page, dialogId) {
  const dialog = page.locator(ui5(dialogId));
  return await dialog.isVisible().catch(() => false);
}

/**
 * Close a dialog via its close/cancel button
 */
async function closeDialog(page, buttonId) {
  const btn = page.locator(ui5(buttonId));
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Get all CSS custom properties from the page
 */
async function getCSSCustomProperty(page, property) {
  return await page.evaluate((prop) => {
    return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  }, property);
}

/**
 * Check if an element matches a CSS selector
 */
async function elementMatchesSelector(page, elementId, cssSelector) {
  return await page.evaluate(({ id, selector }) => {
    const el = document.querySelector(`[id$="--${id}"]`);
    return el ? el.matches(selector) : false;
  }, { id: elementId, selector: cssSelector });
}

/**
 * Get table row count
 */
async function getTableRowCount(page, tableId) {
  const rows = page.locator(`${ui5(tableId)} tr.sapUiTableRow, ${ui5(tableId)} .sapMLIB`);
  return await rows.count();
}

/**
 * Verify responsive layout at specific viewport
 */
async function setViewport(page, width, height = 900) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
}

module.exports = {
  APP_URL,
  HOME_HASH,
  ASSIGNMENTS_HASH,
  ui5,
  ui5Contains,
  waitForUI5,
  waitForOData,
  navigateToHome,
  navigateToAssignments,
  getControlText,
  isControlVisible,
  controlExists,
  clickButton,
  getObjectNumberValue,
  hasClass,
  getUserRole,
  switchToCardView,
  switchToTableView,
  connectToChrome,
  countListItems,
  isFilterBarVisible,
  selectDropdownValue,
  isDialogOpen,
  closeDialog,
  getCSSCustomProperty,
  elementMatchesSelector,
  getTableRowCount,
  setViewport,
};

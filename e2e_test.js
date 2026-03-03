/**
 * SAP Learning App — Comprehensive E2E Test Suite
 * Tests Admin role functionality end-to-end via Playwright + Chrome CDP
 * 
 * NOTE: Tests run against the LIVE deployed SAP backend.
 * If local code changes haven't been deployed, some tests may fail
 * because the browser serves the older BSP version.
 */
const { chromium } = require('playwright');

var results = [];
var screenshots = [];
var testNum = 0;

function pass(name, detail) {
    testNum++;
    results.push({ num: testNum, name: name, status: 'PASS', detail: detail || '' });
    console.log('  [PASS] T' + testNum + ': ' + name + (detail ? ' — ' + detail : ''));
}

function fail(name, detail) {
    testNum++;
    results.push({ num: testNum, name: name, status: 'FAIL', detail: detail || '' });
    console.log('  [FAIL] T' + testNum + ': ' + name + (detail ? ' — ' + detail : ''));
}

function skip(name, detail) {
    testNum++;
    results.push({ num: testNum, name: name, status: 'SKIP', detail: detail || '' });
    console.log('  [SKIP] T' + testNum + ': ' + name + (detail ? ' — ' + detail : ''));
}

async function shot(page, name) {
    var fname = 'e2e_' + name + '.png';
    await page.screenshot({ path: fname });
    screenshots.push(fname);
}

(async () => {
    var browser, page;
    try {
        browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
        page = browser.contexts()[0].pages()[0];
    } catch (e) {
        console.error('FATAL: Cannot connect to Chrome CDP — ' + e.message);
        process.exit(1);
    }

    console.log('\n================================================================');
    console.log('  SAP Learning App — Full E2E Test Suite (Admin)');
    console.log('  ' + new Date().toISOString());
    console.log('================================================================\n');

    // ============================================================
    // SECTION 1: PAGE LOAD & ROLE VERIFICATION
    // ============================================================
    console.log('--- Section 1: Page Load & Role ---');

    // Navigate to home
    var baseUrl = page.url().split('#')[0];
    await page.goto(baseUrl + '#ZLEARNING-display', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(6000);

    // T1: Page loads
    var title = await page.title();
    if (title) { pass('Page loads', 'Title: ' + title); }
    else { fail('Page loads', 'No title'); }

    // T2: Role badge shows Admin
    var roleBadge = page.locator('[id$="roleBadge"]').first();
    var roleText = await roleBadge.textContent().catch(function () { return ''; });
    if (roleText && roleText.indexOf('Admin') >= 0) { pass('Admin role badge', roleText.trim()); }
    else { fail('Admin role badge', 'Got: ' + roleText); }

    await shot(page, '01_home_page');

    // ============================================================
    // SECTION 2: HOME PAGE — TEAM ANALYTICS KPI CARDS
    // ============================================================
    console.log('\n--- Section 2: Team Analytics KPIs ---');

    var kpiIds = ['teamTotalBox', 'teamAssignedBox', 'teamInProgressBox', 'teamOverdueBox', 'teamCompletedBox', 'teamCompletionPctBox'];
    for (var ki = 0; ki < kpiIds.length; ki++) {
        var kpiEl = page.locator('[id$="' + kpiIds[ki] + '"]').first();
        var kpiVis = await kpiEl.isVisible().catch(function () { return false; });
        if (kpiVis) {
            var kpiText = await kpiEl.textContent().catch(function () { return ''; });
            pass('KPI card: ' + kpiIds[ki], kpiText.replace(/\s+/g, ' ').trim().substring(0, 50));
        } else {
            fail('KPI card: ' + kpiIds[ki], 'Not visible');
        }
    }

    // T9: Team Analytics panel visible
    var teamPanel = page.locator('[id$="teamAnalyticsPanel"]').first();
    var teamPanelVis = await teamPanel.isVisible().catch(function () { return false; });
    if (teamPanelVis) { pass('Team Analytics panel visible'); }
    else { fail('Team Analytics panel visible'); }

    await shot(page, '02_kpi_cards');

    // ============================================================
    // SECTION 3: HOME PAGE — ANALYTICS BUTTON & DASHBOARD
    // ============================================================
    console.log('\n--- Section 3: Analytics Dashboard ---');

    var analyticsBtn = page.locator('[id$="analyticsDashboardBtn"]').first();
    var abVis = await analyticsBtn.isVisible().catch(function () { return false; });
    if (abVis) { pass('Analytics button visible'); }
    else { fail('Analytics button visible'); }

    if (abVis) {
        await analyticsBtn.click();
        await page.waitForTimeout(3000);

        // T11: Dialog opens
        var dashDialog = page.locator('.analyticsDashboardDialog').first();
        var ddVis = await dashDialog.isVisible().catch(function () { return false; });
        if (ddVis) { pass('Analytics Dashboard opens'); }
        else { fail('Analytics Dashboard opens'); }

        // T12: NO duplicate KPIs (dashStatusCard / Quick Stats / Status Overview)
        var statusCardCount = await page.locator('.dashStatusCard').count();
        var quickStatCount = await page.locator('.dashQuickStatCard').count();
        var statusOverviewCount = await page.locator('[id*="dashStatusPanel"], [id*="dashQuickStats"], [id*="dashStatusDist"]').count();
        if (statusCardCount === 0 && quickStatCount === 0 && statusOverviewCount === 0) {
            pass('No duplicate KPIs in dashboard', 'Cards: ' + statusCardCount + ', Quick: ' + quickStatCount + ', Panels: ' + statusOverviewCount);
        } else {
            fail('No duplicate KPIs in dashboard', 'Cards: ' + statusCardCount + ', Quick: ' + quickStatCount + ', Panels: ' + statusOverviewCount);
        }

        // T13: Module Distribution panel present
        var modulePanel = page.locator('[id*="dashModulePanel"]').first();
        var mpVis = await modulePanel.isVisible().catch(function () { return false; });
        if (mpVis) { pass('Module Distribution panel'); }
        else { fail('Module Distribution panel'); }

        // T14: Module rows have data
        var moduleRows = await page.locator('.dashModuleRow').count();
        if (moduleRows > 0) { pass('Module data populated', moduleRows + ' modules'); }
        else { fail('Module data populated', '0 rows'); }

        // T15: More than 5 modules (top-5 cap removed)
        if (moduleRows > 5) { pass('All modules shown (>5)', moduleRows + ' modules'); }
        else if (moduleRows > 0) { fail('All modules shown (>5)', 'Only ' + moduleRows + ' — may still be capped'); }
        else { skip('All modules check', 'No module data'); }

        // T16: Team Member Progress panel present
        var userPanel = page.locator('[id*="dashUserPanel"]').first();
        var upVis = await userPanel.isVisible().catch(function () { return false; });
        if (upVis) { pass('Team Member Progress panel'); }
        else { fail('Team Member Progress panel'); }

        // T17: User rows have data
        var userRows = await page.locator('.dashUserRow').count();
        if (userRows > 0) { pass('User data populated', userRows + ' users'); }
        else { fail('User data populated', '0 rows'); }

        // T18: Dashboard is NOT fullscreen (should be 90x85%)
        var dialogBox = await dashDialog.boundingBox().catch(function () { return null; });
        var vpSize = await page.viewportSize();
        if (dialogBox && vpSize) {
            var widthRatio = dialogBox.width / vpSize.width;
            var heightRatio = dialogBox.height / vpSize.height;
            if (widthRatio < 0.98 && heightRatio < 0.98) {
                pass('Dashboard is not fullscreen', Math.round(widthRatio * 100) + '%W x ' + Math.round(heightRatio * 100) + '%H');
            } else {
                fail('Dashboard is not fullscreen', Math.round(widthRatio * 100) + '%W x ' + Math.round(heightRatio * 100) + '%H — still fullscreen');
            }
        } else {
            skip('Dashboard size check', 'Could not get bounding box');
        }

        // T19: Export button present
        var exportBtn = page.locator('[id*="dashExportBtn"]').first();
        var ebVis = await exportBtn.isVisible().catch(function () { return false; });
        if (ebVis) { pass('Export Report button in dashboard'); }
        else { fail('Export Report button in dashboard'); }

        await shot(page, '03_analytics_dashboard');

        // T20: Close button works
        var closeBtn = page.locator('[id*="dashCloseBtn"]').first();
        var cbVis = await closeBtn.isVisible().catch(function () { return false; });
        if (cbVis) {
            await closeBtn.click();
            await page.waitForTimeout(1000);
            var ddGone = !(await dashDialog.isVisible().catch(function () { return false; }));
            if (ddGone) { pass('Dashboard close button works'); }
            else { fail('Dashboard close button works', 'Dialog still open'); }
        } else {
            fail('Dashboard close button', 'Not found');
        }
    }

    // ============================================================
    // SECTION 4: CARD VIEW — TRAINING CARDS
    // ============================================================
    console.log('\n--- Section 4: Card View — Training Cards ---');

    // Check if card view is visible; if in table mode, switch
    var cardGrid = page.locator('[id$="cardGrid"]').first();
    var cgVis = await cardGrid.isVisible().catch(function () { return false; });
    if (!cgVis) {
        // Try clicking the card view toggle
        var cardToggle = page.locator('[id$="viewModeCards"]').first();
        if (await cardToggle.isVisible().catch(function () { return false; })) {
            await cardToggle.click();
            await page.waitForTimeout(2000);
            cgVis = await cardGrid.isVisible().catch(function () { return false; });
        }
    }

    if (cgVis) {
        pass('Card grid visible');

        // T22: Cards have data
        var cards = page.locator('.learningCard');
        var cardCount = await cards.count();
        if (cardCount > 0) { pass('Training cards populated', cardCount + ' cards'); }
        else { fail('Training cards populated', '0 cards'); }

        if (cardCount > 0) {
            var firstCard = cards.first();

            // T23: Card has title
            var cardTitle = firstCard.locator('.learningCardTitle').first();
            var ctText = await cardTitle.textContent().catch(function () { return ''; });
            if (ctText.trim()) { pass('Card has title', ctText.trim().substring(0, 60)); }
            else { fail('Card has title', 'Empty'); }

            // T24: Card has description
            var cardDesc = firstCard.locator('.learningCardDesc').first();
            var cdText = await cardDesc.textContent().catch(function () { return ''; });
            if (cdText.trim()) { pass('Card has description', cdText.trim().substring(0, 60)); }
            else { fail('Card has description', 'Empty'); }

            // T25: Card has module icon
            var cardIcon = firstCard.locator('.learningCardTitleRow .sapUiIcon').first();
            var ciVis = await cardIcon.isVisible().catch(function () { return false; });
            if (ciVis) { pass('Card has module icon'); }
            else { fail('Card has module icon'); }

            // T26: Card has meta info (Topic + Module)
            var cardMeta = firstCard.locator('.learningCardMeta .sapMObjStatus');
            var metaCount = await cardMeta.count();
            if (metaCount >= 2) { pass('Card has meta info', metaCount + ' ObjectStatus items'); }
            else { fail('Card has meta info', 'Only ' + metaCount); }

            // T27: Card has action buttons (inspect + open URL)
            var cardActions = firstCard.locator('.learningCardActions .sapMBtn');
            var actionCount = await cardActions.count();
            if (actionCount >= 2) { pass('Card has action buttons', actionCount + ' buttons'); }
            else { fail('Card has action buttons', actionCount + ' buttons'); }

            // T28: View Details button works (opens detail popup)
            var detailBtn = firstCard.locator('.learningCardActions button').first();
            if (await detailBtn.isVisible().catch(function () { return false; })) {
                await detailBtn.click();
                await page.waitForTimeout(2000);
                // Check if a dialog opened
                var detailDialog = page.locator('.sapMDialog:visible').first();
                var ddOpen = await detailDialog.isVisible().catch(function () { return false; });
                if (ddOpen) {
                    pass('View Details opens dialog');
                    await shot(page, '04_card_detail');
                    // Close it
                    var closeDetail = page.locator('.sapMDialog:visible button:has-text("Close")').first();
                    if (await closeDetail.isVisible().catch(function () { return false; })) {
                        await closeDetail.click();
                        await page.waitForTimeout(1000);
                    } else {
                        // Try ESC
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(1000);
                    }
                } else {
                    fail('View Details opens dialog', 'No dialog appeared');
                }
            }

            // T29: Open URL button present (icon sap-icon://open-command-field)
            var urlBtn = firstCard.locator('.learningCardActions button').nth(1);
            var urlBtnVis = await urlBtn.isVisible().catch(function () { return false; });
            if (urlBtnVis) { pass('Open URL button present'); }
            else { fail('Open URL button present'); }

            // T30: Card title height consistency
            // Check that first 3 cards all have the same title element height
            if (cardCount >= 3) {
                var heights = [];
                for (var ci = 0; ci < 3; ci++) {
                    var titleEl = cards.nth(ci).locator('.learningCardTitle').first();
                    var box = await titleEl.boundingBox().catch(function () { return null; });
                    if (box) { heights.push(Math.round(box.height)); }
                }
                if (heights.length === 3 && heights[0] === heights[1] && heights[1] === heights[2]) {
                    pass('Card title height consistent', heights[0] + 'px across 3 cards');
                } else {
                    fail('Card title height consistent', 'Heights: ' + heights.join(', ') + 'px');
                }
            }
        }
    } else {
        fail('Card grid visible', 'Could not switch to card view');
    }

    await shot(page, '05_card_view');

    // ============================================================
    // SECTION 5: TABLE VIEW — SMART TABLE
    // ============================================================
    console.log('\n--- Section 5: Table View ---');

    var tableToggle = page.locator('[id$="viewModeTable"]').first();
    if (await tableToggle.isVisible().catch(function () { return false; })) {
        await tableToggle.click();
        await page.waitForTimeout(2000);

        var smartTable = page.locator('[id$="smartTable"]').first();
        var stVis = await smartTable.isVisible().catch(function () { return false; });
        if (stVis) { pass('Smart table visible'); }
        else { fail('Smart table visible'); }

        // T32: Table has rows
        var tableRows = await page.locator('[id$="smartTable"] .sapUiTableRow, [id$="smartTable"] .sapMListItems .sapMLIB').count();
        if (tableRows > 0) { pass('Table has data rows', tableRows + ' rows'); }
        else { fail('Table has data rows', '0 rows'); }

        await shot(page, '06_table_view');
    }

    // ============================================================
    // SECTION 6: SMART FILTER BAR
    // ============================================================
    console.log('\n--- Section 6: Smart Filter Bar ---');

    var filterBar = page.locator('[id$="smartFilterBar"]').first();
    var fbVis = await filterBar.isVisible().catch(function () { return false; });
    if (fbVis) { pass('Smart Filter Bar visible'); }
    else { fail('Smart Filter Bar visible'); }

    // T34: Role filter dropdown
    var roleFilter = page.locator('[id$="filterRole"]').first();
    var rfVis = await roleFilter.isVisible().catch(function () { return false; });
    if (rfVis) { pass('Role filter dropdown'); }
    else { fail('Role filter dropdown'); }

    // T35: Topic filter
    var topicFilter = page.locator('[id$="filterTopic"]').first();
    var tfVis = await topicFilter.isVisible().catch(function () { return false; });
    if (tfVis) { pass('Topic filter dropdown'); }
    else { fail('Topic filter dropdown'); }

    // T36: Module filter
    var moduleFilter = page.locator('[id$="filterModule"]').first();
    var mfVis = await moduleFilter.isVisible().catch(function () { return false; });
    if (mfVis) { pass('Module filter dropdown'); }
    else { fail('Module filter dropdown'); }

    // ============================================================
    // SECTION 7: KPI CARD DRILL-DOWN
    // ============================================================
    console.log('\n--- Section 7: KPI Drill-Down ---');

    // Switch back to card view for better visual
    var cardToggle2 = page.locator('[id$="viewModeCards"]').first();
    if (await cardToggle2.isVisible().catch(function () { return false; })) {
        await cardToggle2.click();
        await page.waitForTimeout(1000);
    }

    // Click Team Assigned (Pending) KPI card
    var pendingKpi = page.locator('[id$="teamAssignedBox"]').first();
    var pkVis = await pendingKpi.isVisible().catch(function () { return false; });
    if (pkVis) {
        await pendingKpi.click();
        await page.waitForTimeout(3000);

        // T37: Drill-down dialog opens
        var drillDialog = page.locator('.sapMDialog:visible').first();
        var ddOpen2 = await drillDialog.isVisible().catch(function () { return false; });
        if (ddOpen2) {
            pass('Pending KPI drill-down opens');

            // T38: Dialog has a table/list with data
            var drillItems = await drillDialog.locator('.sapMListItems .sapMLIB, .sapMListTblRow').count();
            if (drillItems > 0) { pass('Drill-down has data', drillItems + ' items'); }
            else { fail('Drill-down has data', '0 items'); }

            // T39: De-assign button in drill-down
            var drillBtns = await drillDialog.locator('.sapMBtn').allTextContents();
            var btnTexts = drillBtns.map(function (t) { return t.trim(); }).filter(function (t) { return t; });
            var hasDeassign = btnTexts.some(function (t) { return t.indexOf('De-assign') >= 0 || t.indexOf('assign') >= 0; });
            if (hasDeassign) { pass('De-assign button in drill-down', btnTexts.join(', ')); }
            else { fail('De-assign button in drill-down', 'Buttons: ' + btnTexts.join(', ')); }

            // T40: Send Reminder in drill-down (for Pending status)
            var hasReminder = btnTexts.some(function (t) { return t.indexOf('Reminder') >= 0; });
            if (hasReminder) { pass('Send Reminder in drill-down'); }
            else { fail('Send Reminder in drill-down', 'Buttons: ' + btnTexts.join(', ')); }

            // T41: Close button
            var hasClose = btnTexts.some(function (t) { return t.indexOf('Close') >= 0; });
            if (hasClose) { pass('Close button in drill-down'); }
            else { fail('Close button in drill-down'); }

            await shot(page, '07_drill_down');

            // Close drill-down
            var closeDrill = drillDialog.locator('button:has-text("Close")').first();
            if (await closeDrill.isVisible().catch(function () { return false; })) {
                await closeDrill.click();
                await page.waitForTimeout(1000);
            }
        } else {
            fail('Pending KPI drill-down opens');
        }
    } else {
        skip('Pending KPI drill-down', 'KPI card not visible');
    }

    // ============================================================
    // SECTION 8: MY ASSIGNMENTS PAGE
    // ============================================================
    console.log('\n--- Section 8: My Assignments Page ---');

    var myAssignBtn = page.locator('[id$="myAssignmentsBtn"]').first();
    var maVis = await myAssignBtn.isVisible().catch(function () { return false; });
    if (maVis) {
        await myAssignBtn.click();
        await page.waitForTimeout(5000);

        // T42: Assignments page loads
        var assignPage = page.locator('[id$="assignmentsListPage"]').first();
        var apVis = await assignPage.isVisible().catch(function () { return false; });
        if (apVis) { pass('My Assignments page loads'); }
        else { fail('My Assignments page loads'); }

        // T43: My Progress KPI cards
        var myKpiIds = ['myAssignedBox', 'myInProgressBox', 'myOverdueBox', 'myCompletedBox'];
        var myKpiOk = 0;
        for (var mi = 0; mi < myKpiIds.length; mi++) {
            var myKpi = page.locator('[id$="' + myKpiIds[mi] + '"]').first();
            if (await myKpi.isVisible().catch(function () { return false; })) { myKpiOk++; }
        }
        if (myKpiOk === myKpiIds.length) { pass('My Progress KPI cards', myKpiOk + '/' + myKpiIds.length); }
        else { fail('My Progress KPI cards', myKpiOk + '/' + myKpiIds.length + ' visible'); }

        // T44: No Send Reminder button on My Assignments
        var allBtnTexts = await page.locator('.sapMBtn').allTextContents();
        var hasSendReminder = allBtnTexts.some(function (t) { return t.indexOf('Send Reminder') >= 0; });
        if (!hasSendReminder) { pass('No Send Reminder on My Assignments'); }
        else { fail('No Send Reminder on My Assignments', 'Button still present'); }

        // T45: Assignment SmartTable or Card grid
        var assignTable = page.locator('[id$="assignSmartTable"]').first();
        var assignCards = page.locator('[id$="assignCardGrid"]').first();
        var atVis = await assignTable.isVisible().catch(function () { return false; });
        var acVis = await assignCards.isVisible().catch(function () { return false; });
        if (atVis || acVis) { pass('Assignment data view', atVis ? 'Table' : 'Cards'); }
        else { fail('Assignment data view', 'Neither table nor cards visible'); }

        // T46: Assignment filter bar
        var assignFilter = page.locator('[id$="assignSmartFilterBar"]').first();
        var afVis = await assignFilter.isVisible().catch(function () { return false; });
        if (afVis) { pass('Assignment filter bar'); }
        else { fail('Assignment filter bar'); }

        // T47: View mode toggle
        var assignToggle = page.locator('[id$="assignViewModeToggle"]').first();
        var avgVis = await assignToggle.isVisible().catch(function () { return false; });
        if (avgVis) { pass('Assignment view mode toggle'); }
        else { fail('Assignment view mode toggle'); }

        // T48: Back button present on Assignments page
        var backBtn = page.locator('[id$="assignmentsListPage"] .sapMBarLeft .sapMBtn, [id$="assignmentsListPage-navButton"]').first();
        var bbVis = await backBtn.isVisible().catch(function () { return false; });
        if (bbVis) { pass('Back button on Assignments page'); }
        else { fail('Back button on Assignments page'); }

        await shot(page, '08_my_assignments');

        // T49: Switch to card view on assignments page
        var assignCardToggle = page.locator('[id$="assignViewModeCards"]').first();
        if (await assignCardToggle.isVisible().catch(function () { return false; })) {
            await assignCardToggle.click();
            await page.waitForTimeout(2000);

            var assignCardGrid = page.locator('[id$="assignCardGrid"]').first();
            var acgVis = await assignCardGrid.isVisible().catch(function () { return false; });
            if (acgVis) {
                pass('Assignment card view works');

                // T50: Assignment cards have correct fields
                var assignCardEl = page.locator('.assignmentCard').first();
                if (await assignCardEl.isVisible().catch(function () { return false; })) {
                    var hasTitle = await assignCardEl.locator('.learningCardTitle').first().isVisible().catch(function () { return false; });
                    var hasMeta = await assignCardEl.locator('.learningCardMeta').first().isVisible().catch(function () { return false; });
                    var hasActions = await assignCardEl.locator('.learningCardActions').first().isVisible().catch(function () { return false; });
                    if (hasTitle && hasMeta && hasActions) { pass('Assignment card structure', 'Title + Meta + Actions'); }
                    else { fail('Assignment card structure', 'Title:' + hasTitle + ' Meta:' + hasMeta + ' Actions:' + hasActions); }

                    // T51: Assignment card action buttons (start, complete, detail, open URL)
                    var assignActions = await assignCardEl.locator('.learningCardActions .sapMBtn').count();
                    if (assignActions >= 3) { pass('Assignment card actions', assignActions + ' buttons'); }
                    else { fail('Assignment card actions', assignActions + ' buttons (expected 3+)'); }
                }
            } else {
                fail('Assignment card view works');
            }
        }

        await shot(page, '09_assign_cards');
    } else {
        skip('My Assignments tests', 'My Assignments button not found');
    }

    // ============================================================
    // SECTION 9: NAVIGATION — BACK BUTTON
    // ============================================================
    console.log('\n--- Section 9: Navigation ---');

    // T52: Navigate back from Assignments to Home
    var backBtn2 = page.locator('[id$="assignmentsListPage"] .sapMBarLeft .sapMBtn, [id$="assignmentsListPage-navButton"]').first();
    if (await backBtn2.isVisible().catch(function () { return false; })) {
        await backBtn2.click();
        await page.waitForTimeout(3000);

        // Check we're on the home page
        var homePanel = page.locator('[id$="teamAnalyticsPanel"]').first();
        var hpVis = await homePanel.isVisible().catch(function () { return false; });
        if (hpVis) { pass('Back nav: Assignments → Home'); }
        else { fail('Back nav: Assignments → Home', 'Team Analytics panel not visible'); }
    } else {
        // Try router navigation
        skip('Back nav test', 'Back button not found — may not be deployed yet');
        // Navigate manually to home for remaining tests
        await page.goto(baseUrl + '#ZLEARNING-display', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(4000);
    }

    // T53: Home page back button present
    var homeBackBtn = page.locator('[id$="trainingsListPage"] .sapMBarLeft .sapMBtn, [id$="trainingsListPage-navButton"]').first();
    var hbbVis = await homeBackBtn.isVisible().catch(function () { return false; });
    if (hbbVis) { pass('Back button on Home page'); }
    else { fail('Back button on Home page', 'Not found — may not be deployed'); }

    await shot(page, '10_home_after_nav');

    // ============================================================
    // SECTION 10: HELP/TUTORIAL BUTTON
    // ============================================================
    console.log('\n--- Section 10: Help & Misc ---');

    var tutorialBtn = page.locator('[id$="tutorialBtn"]').first();
    var tbVis = await tutorialBtn.isVisible().catch(function () { return false; });
    if (tbVis) {
        pass('Tutorial/Help button visible');
        await tutorialBtn.click();
        await page.waitForTimeout(2000);

        var tutDialog = page.locator('.sapMDialog:visible').first();
        var tdVis = await tutDialog.isVisible().catch(function () { return false; });
        if (tdVis) {
            pass('Tutorial dialog opens');
            // Close it
            var closeTut = tutDialog.locator('button:has-text("Close"), button:has-text("Got It")').first();
            if (await closeTut.isVisible().catch(function () { return false; })) {
                await closeTut.click();
                await page.waitForTimeout(1000);
            }
        } else {
            fail('Tutorial dialog opens');
        }
    } else {
        fail('Tutorial/Help button visible');
    }

    // T56: Refresh button
    var refreshBtn = page.locator('[id$="refreshButtonCard"], [id$="refreshButton"]').first();
    var rbVis = await refreshBtn.isVisible().catch(function () { return false; });
    if (rbVis) { pass('Refresh button visible'); }
    else { fail('Refresh button visible'); }

    // T57: Assign Training button (Admin only)
    var assignTrainBtn = page.locator('[id$="assignTrainingsBtn"]').first();
    var atbVis = await assignTrainBtn.isVisible().catch(function () { return false; });
    if (atbVis) { pass('Assign Training button (Admin)'); }
    else { fail('Assign Training button (Admin)'); }

    // T58: Export Report button on main page
    var exportReportBtn = page.locator('[id$="exportTeamReportBtn"]').first();
    var erbVis = await exportReportBtn.isVisible().catch(function () { return false; });
    if (erbVis) { pass('Export Report button on main page'); }
    else { fail('Export Report button on main page'); }

    // ============================================================
    // PRINT RESULTS
    // ============================================================
    console.log('\n================================================================');
    console.log('  TEST RESULTS SUMMARY');
    console.log('================================================================');

    var passed = results.filter(function (r) { return r.status === 'PASS'; }).length;
    var failed = results.filter(function (r) { return r.status === 'FAIL'; }).length;
    var skipped = results.filter(function (r) { return r.status === 'SKIP'; }).length;

    console.log('  Total: ' + results.length + ' | PASS: ' + passed + ' | FAIL: ' + failed + ' | SKIP: ' + skipped);
    console.log('');

    results.forEach(function (r) {
        var icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '○';
        console.log('  ' + icon + ' T' + r.num + ' [' + r.status + '] ' + r.name + (r.detail ? ' — ' + r.detail : ''));
    });

    console.log('\n  Screenshots: ' + screenshots.join(', '));
    console.log('================================================================\n');

    // Exit with non-zero if any failures
    if (failed > 0) { process.exit(1); }
})();

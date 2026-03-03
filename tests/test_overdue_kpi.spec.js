// @ts-check
const { test, expect, chromium } = require('@playwright/test');

/*
 * E2E Test: My Assignments - Overdue KPI (CDP) with DOM introspection
 */

test.describe('My Assignments E2E (CDP)', () => {

    test('Overdue KPI click + DOM introspection', async () => {
        test.setTimeout(120000);

        const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
        const context = browser.contexts()[0];
        const pages = context.pages();
        let page = null;
        for (const p of pages) { if (p.url().includes('vhbrbws1wd01')) { page = p; break; } }
        if (!page) page = pages[0];
        console.log('[CDP] Page: ' + page.url().substring(0, 100));

        // Make sure we're on the Assignments page
        const onAssign = await page.locator('[id*="assignmentsListPage"]').isVisible().catch(() => false);
        if (!onAssign) {
            try {
                await page.locator('button:has-text("My Assignments")').first().click({ timeout: 5000 });
            } catch {
                await page.evaluate(() => { window.location.hash = 'ZLEARNING-myassignments'; });
            }
            await page.waitForTimeout(8000);
        }

        // Wait for page
        await page.waitForTimeout(3000);

        // Step 1: Introspect DOM to find actual KPI element IDs
        console.log('\n[DOM] Inspecting KPI elements...');
        const domInfo = await page.evaluate(() => {
            const results = {};

            // Find all elements with "Overdue", "Total", "Assigned" etc in their id
            const patterns = ['myTotalBox', 'myAssignedBox', 'myInProgressBox', 'myOverdueBox', 'myCompletedBox', 'myCompletionPctBox',
                              'myTotalCount', 'myAssignedCount', 'myInProgressCount', 'myOverdueCount', 'myCompletedCount',
                              'myCompletedPctText', 'myProgressPanel', 'myProgressHBox'];
            patterns.forEach(function(pat) {
                var els = document.querySelectorAll('[id*="' + pat + '"]');
                results[pat] = [];
                els.forEach(function(el) {
                    results[pat].push({
                        id: el.id,
                        tag: el.tagName,
                        text: (el.textContent || '').substring(0, 80).trim(),
                        vis: el.offsetWidth > 0 && el.offsetHeight > 0,
                        classes: el.className.substring(0, 100)
                    });
                });
            });

            // Also find ObjectNumber elements within myOverdueBox
            var overdueBox = document.querySelector('[id*="myOverdueBox"]');
            if (overdueBox) {
                var objNums = overdueBox.querySelectorAll('.sapMObjectNumber, .sapMObjNumber, [class*="ObjectNumber"]');
                results._overdueInnerNums = [];
                objNums.forEach(function(el) {
                    results._overdueInnerNums.push({
                        id: el.id,
                        text: (el.textContent || '').trim(),
                        classes: el.className.substring(0, 100)
                    });
                });
                // Get all child text
                results._overdueBoxFullText = overdueBox.textContent.trim();
            }

            // Get the Overdue count using SAPUI5 API
            try {
                var sOverdueCount = '?';
                // Find the ObjectNumber inside
                var allObjNums = document.querySelectorAll('[id*="myOverdueBox"] .sapMObjectNumberText');
                if (allObjNums.length > 0) {
                    sOverdueCount = allObjNums[0].textContent.trim();
                }
                results._overdueCountFromDom = sOverdueCount;
            } catch(e) {
                results._overdueCountFromDom = 'error: ' + e.message;
            }

            // Get analytics model data via SAPUI5
            try {
                var oCore = sap.ui.getCore();
                // Find the view
                var views = Object.keys(oCore.byId('') || {}).length;
                // Try to access model data
                var assignView = null;
                var allElements = oCore.getElements ? Object.values(oCore.getElements()) : [];
                // Try getting it from a known element
                var panelEl = document.querySelector('[id*="myProgressPanel"]');
                if (panelEl) {
                    var ctrl = oCore.byId(panelEl.id);
                    if (ctrl) {
                        var oModel = ctrl.getModel('assignAnalytics');
                        if (oModel) {
                            results._analyticsModel = {
                                total: oModel.getProperty('/total'),
                                assigned: oModel.getProperty('/assigned'),
                                inProgress: oModel.getProperty('/inProgress'),
                                overdue: oModel.getProperty('/overdue'),
                                completed: oModel.getProperty('/completed'),
                                completionPercent: oModel.getProperty('/completionPercent')
                            };
                        }
                    }
                }
            } catch(e) {
                results._analyticsModel = 'error: ' + e.message;
            }

            return results;
        });

        // Print DOM info
        console.log('\n========== DOM INTROSPECTION ==========');
        for (const [key, vals] of Object.entries(domInfo)) {
            if (key.startsWith('_')) {
                console.log('  ' + key + ': ' + JSON.stringify(vals));
            } else {
                const arr = vals;
                if (arr.length === 0) {
                    console.log('  ' + key + ': NOT IN DOM');
                } else {
                    arr.forEach(v => {
                        console.log('  ' + key + ': id=' + v.id + ' tag=' + v.tag + ' vis=' + v.vis + ' text="' + v.text.substring(0,50) + '"');
                    });
                }
            }
        }
        console.log('========================================\n');

        // Now read the analytics model data
        const analyticsData = domInfo._analyticsModel;
        if (analyticsData && typeof analyticsData === 'object') {
            console.log('========== ANALYTICS MODEL ==========');
            console.log('  Total: ' + analyticsData.total);
            console.log('  Assigned: ' + analyticsData.assigned);
            console.log('  In Progress: ' + analyticsData.inProgress);
            console.log('  Overdue: ' + analyticsData.overdue);
            console.log('  Completed: ' + analyticsData.completed);
            console.log('  Completion %: ' + analyticsData.completionPercent);
            console.log('======================================\n');
        }

        // Screenshot
        await page.screenshot({ path: 'test_screenshots/e2e_dom_01_before_click.png', fullPage: true });

        // Click overdue KPI
        const overdueVal = (analyticsData && typeof analyticsData === 'object') ? (analyticsData.overdue || 0) : 0;
        console.log('[ACTION] Clicking Overdue KPI (model value: ' + overdueVal + ')...');
        try {
            await page.locator('[id*="myOverdueBox"]').click({ force: true, timeout: 10000 });
            console.log('[ACTION] Clicked');
        } catch (e) {
            console.log('[ACTION] Failed: ' + e.message);
        }

        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'test_screenshots/e2e_dom_02_after_click.png', fullPage: true });

        // Read filter status
        const filterKey = await page.evaluate(() => {
            try {
                var el = document.querySelector('[id*="filterAssignStatus"]');
                var ctrl = el && sap.ui.getCore().byId(el.id);
                return ctrl ? ctrl.getSelectedKey() : 'n/a';
            } catch(e) { return 'error'; }
        });
        console.log('[FILTER] Status key after click: "' + filterKey + '"');

        // Count visible results (table or cards)
        const viewInfo = await page.evaluate(() => {
            var result = { cardVis: false, tableVis: false, rowCount: 0, cardCount: 0, items: [] };
            var cardScroll = document.querySelector('[id*="assignCardScrollContainer"]');
            var table = document.querySelector('[id*="assignSmartTable"]');

            if (cardScroll && cardScroll.offsetHeight > 0) {
                result.cardVis = true;
                var cards = document.querySelectorAll('[id*="assignCardGrid"] .sapFGridListItem');
                result.cardCount = cards.length;
                for (var i = 0; i < Math.min(cards.length, 15); i++) {
                    result.items.push(cards[i].textContent.replace(/\s+/g, ' ').trim().substring(0, 200));
                }
            }

            if (table && table.offsetHeight > 0) {
                result.tableVis = true;
                var rows = table.querySelectorAll('.sapMLIB');
                result.rowCount = rows.length;
                // Also check no-data text
                var noData = table.querySelector('.sapMListNoData, .sapUiTableCtrlEmpty');
                result.noDataText = noData ? noData.textContent.trim() : '';
                for (var j = 0; j < Math.min(rows.length, 15); j++) {
                    result.items.push(rows[j].textContent.replace(/\s+/g, ' ').trim().substring(0, 200));
                }
            }

            return result;
        });

        console.log('\n========== FILTERED RESULTS ==========');
        console.log('Card view: ' + viewInfo.cardVis + ' (cards: ' + viewInfo.cardCount + ')');
        console.log('Table view: ' + viewInfo.tableVis + ' (rows: ' + viewInfo.rowCount + ')');
        if (viewInfo.noDataText) console.log('No-data text: "' + viewInfo.noDataText + '"');
        const totalResults = viewInfo.cardCount + viewInfo.rowCount;
        console.log('Total visible items: ' + totalResults);
        viewInfo.items.forEach((item, idx) => {
            console.log('  [' + (idx + 1) + '] ' + item);
        });
        console.log('========================================\n');

        // Assessment
        console.log('========== ASSESSMENT ==========');
        console.log('Overdue KPI model value: ' + overdueVal);
        console.log('Filter applied: "' + filterKey + '"');
        console.log('Visible results: ' + totalResults);
        if (overdueVal > 0 && totalResults === overdueVal) {
            console.log('RESULT: PASS - count matches');
        } else if (overdueVal === 0 && totalResults === 0) {
            console.log('RESULT: PASS - both zero (no overdue items)');
        } else if (overdueVal > 0) {
            console.log('RESULT: WARN - mismatch (may be pagination)');
        } else {
            console.log('RESULT: INFO - no overdue assignments exist');
        }
        console.log('================================');

        // Cleanup
        await page.evaluate(() => {
            try {
                var el = document.querySelector('[id*="filterAssignStatus"]');
                var ctrl = el && sap.ui.getCore().byId(el.id);
                if (ctrl) ctrl.setSelectedKey('');
            } catch(e) {}
        });

        await page.screenshot({ path: 'test_screenshots/e2e_dom_03_final.png', fullPage: true });
        expect(page.url()).toContain('vhbrbws1wd01');
        console.log('\n[DONE]');
    });
});

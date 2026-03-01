/**
 * SAP Learning App - Manager E2E Testing
 * Interactive test session - tests one feature at a time
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'test-screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

let stepCounter = 0;

async function getPage() {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('bridgebio') || p.url().includes('flp'));
    if (!page) page = pages[pages.length - 1];
    return { browser, page };
}

async function screenshot(page, name) {
    stepCounter++;
    const filename = `${SCREENSHOT_DIR}/${String(stepCounter).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`📸 Screenshot: ${filename}`);
    return filename;
}

async function getPageInfo(page) {
    return await page.evaluate(() => {
        const r = {};
        r.url = location.href;
        r.hash = location.hash;
        r.title = document.title;
        r.pageTitle = document.querySelector('.sapMTitle')?.textContent?.trim() || '';
        r.buttons = Array.from(document.querySelectorAll('.sapMBtn .sapMBtnContent'))
            .map(b => b.textContent?.trim()).filter(Boolean).slice(0, 25);
        r.headers = Array.from(document.querySelectorAll('.sapMTitle'))
            .map(h => h.textContent?.trim()).filter(Boolean).slice(0, 10);
        r.messages = Array.from(document.querySelectorAll('.sapMMsgStrip'))
            .map(m => ({ text: m.textContent?.trim(), type: m.className })).slice(0, 5);
        r.dialogs = Array.from(document.querySelectorAll('.sapMDialog'))
            .map(d => ({ title: d.querySelector('.sapMDialogTitle')?.textContent?.trim(), visible: d.style.display !== 'none' }));
        r.errors = Array.from(document.querySelectorAll('.sapMMessagePage, .sapMMsgBox'))
            .map(e => e.textContent?.trim()).slice(0, 5);
        return r;
    });
}

// ====================================================================
// TEST 1: Manager Home Page Inspection
// ====================================================================
async function testManagerHome() {
    console.log('\n========================================');
    console.log('TEST 1: MANAGER HOME PAGE');
    console.log('========================================\n');
    
    const { browser, page } = await getPage();
    
    const info = await page.evaluate(() => {
        const r = {};
        
        // Team Analytics section
        r.analyticsCards = Array.from(document.querySelectorAll('.sapMNCValue, .sapMNC'))
            .map(c => c.textContent?.trim()).filter(Boolean).slice(0, 10);
        
        // Team stats
        r.teamStats = Array.from(document.querySelectorAll('.sapMText'))
            .map(t => t.textContent?.trim())
            .filter(t => t.includes('Team') || t.includes('Completed') || t.includes('Remaining') || t.includes('%'))
            .slice(0, 10);
        
        // Filter bar
        r.filterBar = !!document.querySelector('[class*="SmartFilterBar"], .sapUiCompFilterBar');
        r.filterFields = Array.from(document.querySelectorAll('.sapUiCompFilterBarCBItem, .sapMLabel'))
            .map(f => f.textContent?.trim()).filter(Boolean).slice(0, 15);
        
        // Table info
        const tables = document.querySelectorAll('.sapMList, .sapMTable');
        r.tableCount = tables.length;
        
        // Table headers/columns
        r.tableHeaders = Array.from(document.querySelectorAll('.sapMListHdr .sapMTitle, .sapMListTblCell .sapMText'))
            .map(h => h.textContent?.trim()).filter(Boolean).slice(0, 15);
        
        // Row count indicator
        r.rowCountText = Array.from(document.querySelectorAll('.sapMTitle'))
            .map(t => t.textContent?.trim())
            .filter(t => t.match(/\(\d+\)/))
            .join(', ');
        
        // Action buttons
        r.actionButtons = Array.from(document.querySelectorAll('.sapMBtn .sapMBtnContent'))
            .map(b => b.textContent?.trim()).filter(Boolean);
        
        // Icons in toolbar
        r.toolbarIcons = Array.from(document.querySelectorAll('.sapMTBShrinkItem .sapUiIcon, .sapMBarChild .sapUiIcon'))
            .map(i => i.getAttribute('data-sap-ui-icon-content') || i.className).slice(0, 10);
        
        return r;
    });
    
    console.log('📊 Team Analytics Cards:', info.analyticsCards);
    console.log('📈 Team Stats:', info.teamStats);
    console.log('🔍 Filter Bar Present:', info.filterBar);
    console.log('📋 Tables Found:', info.tableCount);
    console.log('📑 Row Count:', info.rowCountText);
    console.log('🔘 Action Buttons:', info.actionButtons);
    console.log('');
    
    // Check specific manager features
    const hasMyAssignments = info.actionButtons.includes('My Assignments');
    const hasExportReport = info.actionButtons.includes('Export Report');
    const hasDelegate = info.actionButtons.includes('Delegate Authority');
    const hasAssignBtn = info.actionButtons.some(b => b.includes('Assign'));
    
    console.log('✅ My Assignments button:', hasMyAssignments ? 'PRESENT' : '❌ MISSING');
    console.log('✅ Export Report button:', hasExportReport ? 'PRESENT' : '❌ MISSING');
    console.log('✅ Delegate Authority button:', hasDelegate ? 'PRESENT' : '❌ MISSING');
    console.log('ℹ️  Assign buttons:', info.actionButtons.filter(b => b.toLowerCase().includes('assign')));
    
    await screenshot(page, 'manager-home');
    await browser.close();
    
    return { hasMyAssignments, hasExportReport, hasDelegate, actionButtons: info.actionButtons };
}

// ====================================================================
// TEST 2: My Assignments Navigation + Back Button
// ====================================================================
async function testMyAssignmentsNav() {
    console.log('\n========================================');
    console.log('TEST 2: MY ASSIGNMENTS NAVIGATION');
    console.log('========================================\n');
    
    const { browser, page } = await getPage();
    
    // Record starting point
    const startHash = await page.evaluate(() => location.hash);
    console.log('📍 Starting hash:', startHash);
    
    // Click "My Assignments"
    console.log('🖱️  Clicking "My Assignments"...');
    const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.sapMBtn'));
        const btn = btns.find(b => b.textContent?.trim() === 'My Assignments');
        if (btn) { btn.click(); return true; }
        return false;
    });
    
    if (!clicked) {
        console.log('❌ Could not find "My Assignments" button');
        await browser.close();
        return;
    }
    
    await page.waitForTimeout(3000);
    await screenshot(page, 'my-assignments-page');
    
    const assignInfo = await page.evaluate(() => {
        const r = {};
        r.hash = location.hash;
        r.pageTitle = document.querySelector('.sapMTitle')?.textContent?.trim();
        r.headers = Array.from(document.querySelectorAll('.sapMTitle'))
            .map(h => h.textContent?.trim()).filter(Boolean).slice(0, 5);
        r.buttons = Array.from(document.querySelectorAll('.sapMBtn .sapMBtnContent'))
            .map(b => b.textContent?.trim()).filter(Boolean).slice(0, 15);
        r.backButton = !!document.querySelector('.sapMBarLeft .sapMBtn, [id*="navButton"], .sapMBtnBack, [id*="backBtn"]');
        r.tables = document.querySelectorAll('.sapMList, .sapMTable').length;
        r.listItems = document.querySelectorAll('.sapMLIB, .sapMListTblRow, .sapMObjLItem').length;
        return r;
    });
    
    console.log('📍 Assignments hash:', assignInfo.hash);
    console.log('📄 Page title:', assignInfo.pageTitle);
    console.log('📋 Headers:', assignInfo.headers);
    console.log('🔘 Buttons:', assignInfo.buttons);
    console.log('⬅️  Back button visible:', assignInfo.backButton);
    console.log('📊 Tables:', assignInfo.tables, '| Items:', assignInfo.listItems);
    
    // TEST: Click back button
    console.log('\n🖱️  Testing BACK NAVIGATION...');
    const backClicked = await page.evaluate(() => {
        // Try multiple selectors for back button
        const selectors = [
            '.sapMBarLeft .sapMBtn',
            '[id*="navButton"]', 
            '.sapMBtnBack',
            '[id*="backBtn"]',
            '.sapMBar .sapMBtnIcon'
        ];
        for (const sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) {
                btn.click();
                return { clicked: true, selector: sel };
            }
        }
        return { clicked: false };
    });
    
    console.log('Back button click result:', backClicked);
    await page.waitForTimeout(3000);
    
    const afterBackHash = await page.evaluate(() => location.hash);
    const afterBackInfo = await getPageInfo(page);
    
    console.log('📍 After back, hash:', afterBackHash);
    console.log('📄 After back, title:', afterBackInfo.pageTitle);
    
    if (afterBackHash.includes('ZLEARNING') && !afterBackHash.includes('assignments')) {
        console.log('✅ BACK NAVIGATION: SUCCESS - Returned to home page!');
    } else if (afterBackHash === startHash) {
        console.log('✅ BACK NAVIGATION: SUCCESS - Returned to starting page!');
    } else {
        console.log('❌ BACK NAVIGATION: FAILED - Current hash:', afterBackHash, 'Expected:', startHash);
    }
    
    await screenshot(page, 'after-back-nav');
    await browser.close();
}

// ====================================================================
// TEST 3: Assign Training Workflow + Due Date
// ====================================================================
async function testAssignTraining() {
    console.log('\n========================================');
    console.log('TEST 3: ASSIGN TRAINING + DUE DATE');
    console.log('========================================\n');
    
    const { browser, page } = await getPage();
    
    // First, select a training from the table
    console.log('🖱️  Looking for training items to select...');
    const tableInfo = await page.evaluate(() => {
        const rows = document.querySelectorAll('.sapMLIB, .sapMListTblRow');
        const items = [];
        rows.forEach((row, i) => {
            if (i < 5) {
                const cells = row.querySelectorAll('.sapMText, .sapMLabel, .sapMLnk');
                items.push(Array.from(cells).map(c => c.textContent?.trim()).filter(Boolean).slice(0, 5).join(' | '));
            }
        });
        
        // Try clicking first checkbox or row
        const checkbox = document.querySelector('.sapMCb:not(:checked)') || document.querySelector('.sapMLIBSelectM .sapMCb');
        if (checkbox) { checkbox.click(); return { items, selected: 'checkbox' }; }
        
        const firstRow = document.querySelector('.sapMLIB');
        if (firstRow) { firstRow.click(); return { items, selected: 'row' }; }
        
        return { items, selected: false };
    });
    
    console.log('📋 First 5 rows:', tableInfo.items.slice(0, 3));
    console.log('☑️  Selection:', tableInfo.selected);
    await page.waitForTimeout(1000);
    
    // Look for Assign button
    const assignBtnInfo = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.sapMBtn'));
        const assignBtns = btns.filter(b => {
            const text = b.textContent?.trim().toLowerCase();
            return text.includes('assign') && !text.includes('my assignment') && !text.includes('reassign');
        });
        return assignBtns.map(b => ({ text: b.textContent?.trim(), enabled: !b.classList.contains('sapMBtnDisabled'), id: b.id }));
    });
    
    console.log('🔘 Assign buttons found:', assignBtnInfo);
    
    if (assignBtnInfo.length > 0 && assignBtnInfo[0].enabled) {
        console.log('🖱️  Clicking Assign button...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('.sapMBtn'));
            const assignBtn = btns.find(b => {
                const text = b.textContent?.trim().toLowerCase();
                return text.includes('assign') && !text.includes('my assignment') && !text.includes('reassign');
            });
            if (assignBtn) assignBtn.click();
        });
        
        await page.waitForTimeout(3000);
        await screenshot(page, 'assign-dialog-opened');
        
        // Inspect dialog
        const dialogInfo = await page.evaluate(() => {
            const r = {};
            const dialog = document.querySelector('.sapMDialog, .sapMMessageDialog');
            if (!dialog) return { dialogFound: false };
            
            r.dialogFound = true;
            r.title = dialog.querySelector('.sapMDialogTitle, .sapMTitle')?.textContent?.trim();
            r.buttons = Array.from(dialog.querySelectorAll('.sapMBtn .sapMBtnContent'))
                .map(b => b.textContent?.trim()).filter(Boolean);
            r.labels = Array.from(dialog.querySelectorAll('.sapMLabel'))
                .map(l => ({ text: l.textContent?.trim(), required: l.classList.contains('sapMLabelRequired') || l.hasAttribute('required') }));
            r.inputs = Array.from(dialog.querySelectorAll('.sapMInput, .sapMDP, .sapMSelect, .sapMComboBox, .sapMMultiComboBox'))
                .map(i => ({ id: i.id, type: i.className.split(' ')[0], required: i.hasAttribute('required') || i.classList.contains('sapMDPRequired') }));
            r.messageStrips = Array.from(dialog.querySelectorAll('.sapMMsgStrip'))
                .map(m => m.textContent?.trim());
            r.wizardSteps = Array.from(dialog.querySelectorAll('.sapMWizardStep, [class*="WizardStep"]'))
                .map(s => s.querySelector('.sapMTitle, .sapMWizardStepTitle, .sapMText')?.textContent?.trim());
            
            // Check for date picker specifically 
            r.datePickers = Array.from(dialog.querySelectorAll('.sapMDP, [id*="dueDate"], [id*="DueDate"]'))
                .map(dp => ({
                    id: dp.id,
                    required: dp.getAttribute('required') === 'true' || dp.classList.contains('sapMDPRequired'),
                    value: dp.querySelector('input')?.value || ''
                }));
            
            return r;
        });
        
        console.log('\n📋 Dialog Info:');
        console.log('  Title:', dialogInfo.title);
        console.log('  Buttons:', dialogInfo.buttons);
        console.log('  Labels:', dialogInfo.labels);
        console.log('  Inputs:', dialogInfo.inputs);
        console.log('  Date Pickers:', dialogInfo.datePickers);
        console.log('  Message Strips:', dialogInfo.messageStrips);
        console.log('  Wizard Steps:', dialogInfo.wizardSteps);
        
        // Check due date required
        if (dialogInfo.datePickers?.length > 0) {
            const dp = dialogInfo.datePickers[0];
            console.log('\n🗓️  DUE DATE CHECK:');
            console.log('  Required attribute:', dp.required);
            console.log('  Current value:', dp.value || '(empty)');
            if (dp.required) {
                console.log('  ✅ Due date is marked as REQUIRED');
            } else {
                console.log('  ⚠️  Due date may not be visually required');
            }
        }
        
        // Close dialog
        await page.evaluate(() => {
            const dialog = document.querySelector('.sapMDialog');
            if (dialog) {
                const closeBtn = dialog.querySelector('.sapMBtn:has(.sapMBtnContent)');
                const cancelBtn = Array.from(dialog.querySelectorAll('.sapMBtn')).find(b => 
                    b.textContent?.trim().toLowerCase().includes('cancel') || 
                    b.textContent?.trim().toLowerCase().includes('close'));
                if (cancelBtn) cancelBtn.click();
                else if (closeBtn) closeBtn.click();
            }
        });
        await page.waitForTimeout(1000);
    } else {
        console.log('ℹ️  No enabled Assign button found. May need to select a training first.');
    }
    
    await browser.close();
}

// ====================================================================
// TEST 4: Team Analytics Section
// ====================================================================
async function testTeamAnalytics() {
    console.log('\n========================================');
    console.log('TEST 4: TEAM ANALYTICS');
    console.log('========================================\n');
    
    const { browser, page } = await getPage();
    
    const analytics = await page.evaluate(() => {
        const r = {};
        
        // Numeric cards (Team Total, Pending, etc.)
        const cards = document.querySelectorAll('.sapMNC, [class*="NumericContent"]');
        r.numericCards = Array.from(cards).map(c => ({
            value: c.querySelector('.sapMNCValue, .sapMNCValueScr')?.textContent?.trim(),
            label: c.closest('[class*="Card"], .sapMGT, .sapFCard')?.querySelector('.sapMTitle, .sapMGTHdrTxt, .sapMText')?.textContent?.trim()
        }));
        
        // Chart presence
        r.hasCharts = !!document.querySelector('[class*="viz"], canvas, svg[class*="chart"], .sapSuiteUiMCC');
        r.svgElements = document.querySelectorAll('svg').length;
        
        // Progress indicator
        r.progressBars = Array.from(document.querySelectorAll('.sapMPI, [class*="ProgressIndicator"]'))
            .map(p => ({
                value: p.querySelector('.sapMPIText')?.textContent?.trim(),
                percentage: p.getAttribute('aria-valuenow')
            }));
        
        // Completion text
        r.completionTexts = Array.from(document.querySelectorAll('.sapMText'))
            .map(t => t.textContent?.trim())
            .filter(t => t.includes('Completed') || t.includes('%') || t.includes('Remaining'))
            .slice(0, 5);
        
        // Status distribution
        r.statusLabels = Array.from(document.querySelectorAll('.sapMText, .sapMLabel'))
            .map(t => t.textContent?.trim())
            .filter(t => ['Pending', 'In Progress', 'Overdue', 'Done', 'Completed', 'Assigned'].includes(t));
        
        return r;
    });
    
    console.log('📊 Numeric Cards:', analytics.numericCards);
    console.log('📈 Charts present:', analytics.hasCharts, '| SVGs:', analytics.svgElements);
    console.log('📉 Progress Bars:', analytics.progressBars);
    console.log('📋 Completion info:', analytics.completionTexts);
    console.log('🏷️  Status labels:', analytics.statusLabels);
    
    await screenshot(page, 'team-analytics');
    await browser.close();
}

// ====================================================================
// TEST 5: Delegate Authority
// ====================================================================
async function testDelegateAuthority() {
    console.log('\n========================================');
    console.log('TEST 5: DELEGATE AUTHORITY');
    console.log('========================================\n');
    
    const { browser, page } = await getPage();
    
    console.log('🖱️  Clicking "Delegate Authority"...');
    const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.sapMBtn'));
        const btn = btns.find(b => b.textContent?.trim().includes('Delegate'));
        if (btn) { btn.click(); return true; }
        return false;
    });
    
    if (!clicked) {
        console.log('❌ Delegate Authority button not found');
        await browser.close();
        return;
    }
    
    await page.waitForTimeout(2000);
    await screenshot(page, 'delegate-dialog');
    
    const dialogInfo = await page.evaluate(() => {
        const dialog = document.querySelector('.sapMDialog');
        if (!dialog) return { dialogFound: false };
        
        return {
            dialogFound: true,
            title: dialog.querySelector('.sapMDialogTitle, .sapMTitle')?.textContent?.trim(),
            content: dialog.textContent?.substring(0, 500),
            buttons: Array.from(dialog.querySelectorAll('.sapMBtn .sapMBtnContent'))
                .map(b => b.textContent?.trim()).filter(Boolean),
            inputs: Array.from(dialog.querySelectorAll('.sapMInput, .sapMDP, .sapMSelect'))
                .map(i => ({ id: i.id, type: i.className.split(' ')[0] }))
        };
    });
    
    console.log('📋 Delegate Dialog:', dialogInfo);
    
    // Close dialog
    await page.evaluate(() => {
        const dialog = document.querySelector('.sapMDialog');
        if (dialog) {
            const cancelBtn = Array.from(dialog.querySelectorAll('.sapMBtn')).find(b => 
                b.textContent?.trim().toLowerCase().includes('cancel') || 
                b.textContent?.trim().toLowerCase().includes('close'));
            if (cancelBtn) cancelBtn.click();
        }
    });
    await page.waitForTimeout(1000);
    
    await browser.close();
}

// ====================================================================
// TEST 6: Export Report
// ====================================================================
async function testExportReport() {
    console.log('\n========================================');
    console.log('TEST 6: EXPORT REPORT');
    console.log('========================================\n');
    
    const { browser, page } = await getPage();
    
    console.log('🖱️  Clicking "Export Report"...');
    const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.sapMBtn'));
        const btn = btns.find(b => b.textContent?.trim().includes('Export Report'));
        if (btn) { btn.click(); return true; }
        return false;
    });
    
    await page.waitForTimeout(2000);
    await screenshot(page, 'export-report');
    
    const afterExport = await page.evaluate(() => {
        return {
            dialogs: Array.from(document.querySelectorAll('.sapMDialog')).map(d => d.querySelector('.sapMDialogTitle')?.textContent?.trim()),
            messages: Array.from(document.querySelectorAll('.sapMMsgStrip, .sapMMessageToast')).map(m => m.textContent?.trim()),
            toast: document.querySelector('.sapMMessageToast')?.textContent?.trim()
        };
    });
    
    console.log('Export result:', afterExport);
    await browser.close();
}

// ====================================================================
// TEST 7: Filter Bar & Search
// ====================================================================
async function testFilterBar() {
    console.log('\n========================================');
    console.log('TEST 7: FILTER BAR & SEARCH');
    console.log('========================================\n');
    
    const { browser, page } = await getPage();
    
    const filterInfo = await page.evaluate(() => {
        const r = {};
        
        // Smart filter bar
        const filterBar = document.querySelector('[class*="SmartFilterBar"], .sapUiCompFilterBar');
        r.hasFilterBar = !!filterBar;
        
        // Filter fields
        r.filterLabels = Array.from(document.querySelectorAll('.sapUiCompFilterBarCBItem, .sapMLabel'))
            .map(l => l.textContent?.trim())
            .filter(Boolean)
            .slice(0, 15);
        
        // Search field
        r.hasSearchField = !!document.querySelector('.sapMSF, [id*="searchField"]');
        
        // Go button
        r.hasGoButton = !!Array.from(document.querySelectorAll('.sapMBtn')).find(b => b.textContent?.trim() === 'Go');
        
        // Current table row count
        const countMatch = document.querySelector('.sapMTitle')?.textContent?.match(/\((\d+)\)/);
        r.totalItems = countMatch ? parseInt(countMatch[1]) : 'N/A';
        
        return r;
    });
    
    console.log('🔍 Filter bar present:', filterInfo.hasFilterBar);
    console.log('🏷️  Filter labels:', filterInfo.filterLabels);
    console.log('🔎 Search field:', filterInfo.hasSearchField);
    console.log('▶️  Go button:', filterInfo.hasGoButton);
    console.log('📊 Total items:', filterInfo.totalItems);
    
    await screenshot(page, 'filter-bar');
    await browser.close();
}

// ====================================================================
// MAIN - Run specific test
// ====================================================================
const testName = process.argv[2] || 'home';

const tests = {
    'home': testManagerHome,
    'nav': testMyAssignmentsNav,
    'assign': testAssignTraining,
    'analytics': testTeamAnalytics,
    'delegate': testDelegateAuthority,
    'export': testExportReport,
    'filter': testFilterBar,
};

(async () => {
    const testFn = tests[testName];
    if (!testFn) {
        console.log('Available tests:', Object.keys(tests).join(', '));
        return;
    }
    try {
        await testFn();
    } catch (err) {
        console.error('Test error:', err.message);
    }
})();

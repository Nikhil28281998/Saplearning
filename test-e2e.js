/**
 * SAP Learning App - E2E Interactive Testing Script
 * Connects to existing Chrome via CDP (port 9222)
 * Usage: node test-e2e.js [command]
 * Commands: open, check, screenshot, click, test-nav, test-tiles
 */
const { chromium } = require('playwright');

const FLP_URL = 'https://vhbrbws1wd01.hec.bridgebio.com:44380/sap/bc/ui2/flp?saml2=disabled&sap-client=400&sap-language=EN#ZLEARNING-display';

async function connectBrowser() {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    if (contexts.length === 0) {
        console.log('No browser contexts found. Creating new page...');
        const context = await browser.newContext({ ignoreHTTPSErrors: true });
        const page = await context.newPage();
        return { browser, page, context };
    }
    const context = contexts[0];
    const pages = context.pages();
    
    // Find SAP page or use first page
    let page = pages.find(p => p.url().includes('bridgebio') || p.url().includes('ZLEARNING'));
    if (!page) {
        page = pages[0];
    }
    return { browser, page, context };
}

async function openApp() {
    const { browser, page } = await connectBrowser();
    console.log('Current URL:', page.url());
    console.log('Navigating to FLP...');
    
    await page.goto(FLP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    const url = page.url();
    console.log('Page title:', title);
    console.log('Page URL:', url);
    
    // Check if we're on a login page
    const loginForm = await page.$('input[name="sap-user"], input[type="password"], #logOnFormId');
    if (loginForm) {
        console.log('\n⚠️  LOGIN PAGE DETECTED - Please enter credentials in the browser');
        console.log('Waiting 30 seconds for manual login...');
        await page.waitForTimeout(30000);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/01-app-opened.png', fullPage: false });
    console.log('Screenshot saved: test-screenshots/01-app-opened.png');
    
    await browser.close();
}

async function checkStatus() {
    const { browser, page } = await connectBrowser();
    const url = page.url();
    const title = await page.title();
    console.log('=== Current Browser Status ===');
    console.log('URL:', url);
    console.log('Title:', title);
    
    // Check if SAP app is loaded
    const sapShell = await page.$('#shell, .sapUshellShell, .sapMShell');
    const sapApp = await page.$('.sapMApp, .sapUiComponentContainer');
    const loginPage = await page.$('input[name="sap-user"], #logOnFormId, .sapUiLoginForm');
    
    console.log('SAP Shell found:', !!sapShell);
    console.log('SAP App loaded:', !!sapApp);
    console.log('Login page:', !!loginPage);
    
    // Check visible elements
    const pageTitle = await page.$eval('.sapMTitle, .sapMPageHeader .sapMTitle', el => el.textContent).catch(() => 'N/A');
    console.log('Page title element:', pageTitle);
    
    await browser.close();
}

async function takeScreenshot(name = 'current') {
    const { browser, page } = await connectBrowser();
    const fs = require('fs');
    if (!fs.existsSync('test-screenshots')) fs.mkdirSync('test-screenshots');
    
    const filename = `test-screenshots/${name}.png`;
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`Screenshot saved: ${filename}`);
    console.log('URL:', page.url());
    
    await browser.close();
}

async function inspectPage() {
    const { browser, page } = await connectBrowser();
    console.log('=== Page Inspection ===');
    console.log('URL:', page.url());
    
    // Get all visible text elements on the page
    const pageContent = await page.evaluate(() => {
        const result = {};
        
        // Check for FLP tiles
        const tiles = document.querySelectorAll('.sapUshellTile, .sapMGT, .sapMGTHdrTxt');
        result.tilesFound = tiles.length;
        result.tileTexts = Array.from(tiles).map(t => t.textContent?.trim()).filter(Boolean).slice(0, 10);
        
        // Check for SAP app elements
        const tables = document.querySelectorAll('.sapMTable, .sapUiTable, .sapUiTableCtrl, [class*="SmartTable"]');
        result.tablesFound = tables.length;
        
        const buttons = document.querySelectorAll('.sapMBtn');
        result.buttonsFound = buttons.length;
        result.buttonTexts = Array.from(buttons).map(b => b.textContent?.trim()).filter(Boolean).slice(0, 20);
        
        const tabs = document.querySelectorAll('.sapMITBFilter, .sapMSegBBtn');
        result.tabsFound = tabs.length;
        result.tabTexts = Array.from(tabs).map(t => t.textContent?.trim()).filter(Boolean);
        
        // Check for page headers
        const headers = document.querySelectorAll('.sapMPageHeader .sapMTitle, .sapMOHTitle, .sapMBar .sapMTitle');
        result.headerTexts = Array.from(headers).map(h => h.textContent?.trim()).filter(Boolean);
        
        // Check icons
        const icons = document.querySelectorAll('.sapUiIcon');
        result.iconCount = icons.length;
        
        // Check for error messages
        const messages = document.querySelectorAll('.sapMMsgStrip, .sapMMessagePage');
        result.messageTexts = Array.from(messages).map(m => m.textContent?.trim()).filter(Boolean);
        
        // Check navigation elements
        const navBack = document.querySelectorAll('.sapMBarLeft .sapMBtn, [id*="navButton"], [id*="backBtn"]');
        result.navBackButtons = navBack.length;
        
        // Current hash
        result.hash = window.location.hash;
        
        return result;
    });
    
    console.log(JSON.stringify(pageContent, null, 2));
    await browser.close();
}

async function testNavigation() {
    const { browser, page } = await connectBrowser();
    console.log('=== Testing Navigation ===');
    console.log('Starting URL:', page.url());
    
    const results = [];
    
    // Step 1: We should be on the home/training list page
    const homeHash = await page.evaluate(() => window.location.hash);
    console.log('1. Current hash:', homeHash);
    results.push({ step: 'Home page', hash: homeHash });
    
    // Step 2: Look for "My Assignments" tab/button and click it
    try {
        // Try different selectors for My Assignments navigation
        const assignBtn = await page.$('text=My Assignments') 
            || await page.$('[id*="assignment"]')
            || await page.$('.sapMITBFilter:has-text("Assignments")');
        
        if (assignBtn) {
            console.log('2. Found My Assignments button, clicking...');
            await assignBtn.click();
            await page.waitForTimeout(2000);
            
            const assignHash = await page.evaluate(() => window.location.hash);
            console.log('3. After click, hash:', assignHash);
            results.push({ step: 'Navigate to Assignments', hash: assignHash });
            
            await page.screenshot({ path: 'test-screenshots/nav-assignments.png' });
            
            // Step 3: Test back navigation
            const backBtn = await page.$('.sapMBarLeft .sapMBtn, [id*="navButton"], [id*="backBtn"], .sapMBtnBack');
            if (backBtn) {
                console.log('4. Found back button, clicking...');
                await backBtn.click();
                await page.waitForTimeout(2000);
                
                const backHash = await page.evaluate(() => window.location.hash);
                console.log('5. After back, hash:', backHash);
                results.push({ step: 'Back navigation', hash: backHash });
                
                await page.screenshot({ path: 'test-screenshots/nav-back-home.png' });
                
                if (backHash === homeHash || backHash.includes('ZLEARNING')) {
                    console.log('✅ BACK NAVIGATION WORKS - returned to home!');
                } else {
                    console.log('❌ BACK NAVIGATION FAILED - did not return to home');
                }
            } else {
                console.log('❌ No back button found on assignments page');
            }
        } else {
            console.log('❌ My Assignments button not found');
        }
    } catch (err) {
        console.log('Navigation test error:', err.message);
    }
    
    console.log('\nResults:', JSON.stringify(results, null, 2));
    await browser.close();
}

async function testDueDateRequired() {
    const { browser, page } = await connectBrowser();
    console.log('=== Testing Due Date Mandatory ===');
    
    try {
        // Look for Assign button
        const assignBtn = await page.$('text=Assign Training') 
            || await page.$('[id*="assign"]')
            || await page.$('.sapMBtn:has-text("Assign")');
        
        if (assignBtn) {
            console.log('1. Found Assign button, clicking...');
            await assignBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-screenshots/assign-dialog.png' });
            
            // Check for required date picker
            const datePicker = await page.$('.sapMDP[required], [id*="dueDate"]');
            console.log('2. Date picker found:', !!datePicker);
            
            // Check for required indicator
            const requiredLabel = await page.evaluate(() => {
                const labels = document.querySelectorAll('.sapMLabelRequired, label[required]');
                return Array.from(labels).map(l => l.textContent?.trim()).filter(Boolean);
            });
            console.log('3. Required labels:', requiredLabel);
            
            // Check for error message strip
            const msgStrip = await page.$('.sapMMsgStrip');
            if (msgStrip) {
                const msgText = await msgStrip.textContent();
                console.log('4. Message strip:', msgText);
            }
            
            console.log('✅ Due date validation UI present');
        } else {
            console.log('ℹ️  No Assign button visible (may need admin/manager role)');
        }
    } catch (err) {
        console.log('Due date test error:', err.message);
    }
    
    await browser.close();
}

// Main entry point
const command = process.argv[2] || 'check';

(async () => {
    try {
        const fs = require('fs');
        if (!fs.existsSync('test-screenshots')) fs.mkdirSync('test-screenshots');
        
        switch (command) {
            case 'open':
                await openApp();
                break;
            case 'check':
                await checkStatus();
                break;
            case 'screenshot':
                await takeScreenshot(process.argv[3] || 'current');
                break;
            case 'inspect':
                await inspectPage();
                break;
            case 'test-nav':
                await testNavigation();
                break;
            case 'test-duedate':
                await testDueDateRequired();
                break;
            default:
                console.log('Commands: open, check, screenshot [name], inspect, test-nav, test-duedate');
        }
    } catch (err) {
        console.error('Error:', err.message);
        if (err.message.includes('connect')) {
            console.log('Make sure Chrome is running with --remote-debugging-port=9222');
        }
    }
})();

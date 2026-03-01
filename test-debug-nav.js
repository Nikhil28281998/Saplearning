/**
 * Debug back navigation - detailed check of what's visible
 */
const { chromium } = require('playwright');
const fs = require('fs');
if (!fs.existsSync('test-screenshots')) fs.mkdirSync('test-screenshots');

(async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('bridgebio'));
    if (!page) { console.log('No SAP page found'); process.exit(1); }

    const currentHash = await page.evaluate(() => location.hash);
    console.log('Current hash:', currentHash);

    // Navigate to home first if not there
    if (currentHash.includes('assignment')) {
        console.log('On assignments page. Let me check the detailed view state...');
    } else {
        // Navigate to assignments first
        console.log('Navigating to assignments first...');
        await page.getByRole('button', { name: 'My Assignments' }).click({ timeout: 5000 });
        await page.waitForTimeout(4000);
        console.log('Hash now:', await page.evaluate(() => location.hash));
    }

    // Take screenshot of assignments page
    await page.screenshot({ path: 'test-screenshots/10-assignments-before-back.png' });

    // Now check ALL pages in the App control
    const beforeBack = await page.evaluate(() => {
        var result = {};
        // Get all direct children of the sap.m.App
        var appControl = document.getElementById('app');
        if (appControl) {
            var children = appControl.children;
            result.appChildren = [];
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                result.appChildren.push({
                    id: child.id,
                    display: window.getComputedStyle(child).display,
                    visibility: window.getComputedStyle(child).visibility,
                    height: child.offsetHeight,
                    className: child.className.substring(0, 80)
                });
            }
        }
        result.hash = location.hash;
        // What's in the viewport
        result.viewportTitle = document.querySelector('.sapMPage:not([style*="display: none"]) .sapMTitle');
        result.viewportTitle = result.viewportTitle ? result.viewportTitle.textContent : 'N/A';
        return result;
    });
    console.log('\n=== BEFORE BACK (on assignments) ===');
    console.log('App children:', JSON.stringify(beforeBack.appChildren, null, 2));
    console.log('Viewport title:', beforeBack.viewportTitle);

    // Click the back navigation button
    console.log('\nClicking back button...');
    var navBtn = page.locator('#__xmlview1--assignmentsListPage-navButton');
    if (await navBtn.count() > 0 && await navBtn.isVisible()) {
        await navBtn.click();
        console.log('Clicked nav button');
    } else {
        // Try other selectors
        var backBtn = page.locator('.sapMBarLeft .sapMBtn').first();
        if (await backBtn.count() > 0 && await backBtn.isVisible()) {
            await backBtn.click();
            console.log('Clicked bar-left button');
        }
    }

    await page.waitForTimeout(4000);

    // Check state after back
    const afterBack = await page.evaluate(() => {
        var result = {};
        var appControl = document.getElementById('app');
        if (appControl) {
            var children = appControl.children;
            result.appChildren = [];
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                var style = window.getComputedStyle(child);
                result.appChildren.push({
                    id: child.id,
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                    transform: style.transform,
                    height: child.offsetHeight,
                    scrollTop: child.scrollTop,
                    inViewport: child.getBoundingClientRect().top >= 0
                });
            }
        }
        result.hash = location.hash;

        // Check which sapMPage is actually showing
        var allPages = document.querySelectorAll('.sapMPage');
        result.sapPages = [];
        for (var j = 0; j < allPages.length; j++) {
            var pg = allPages[j];
            var pgStyle = window.getComputedStyle(pg);
            result.sapPages.push({
                id: pg.id,
                display: pgStyle.display,
                visibility: pgStyle.visibility,
                height: pg.offsetHeight,
                offsetTop: pg.offsetTop
            });
        }

        // What's the first visible title in viewport
        var titles = document.querySelectorAll('.sapMTitle');
        result.visibleTitles = [];
        for (var k = 0; k < titles.length; k++) {
            var t = titles[k];
            var rect = t.getBoundingClientRect();
            if (rect.top >= 0 && rect.top < window.innerHeight && t.offsetParent) {
                result.visibleTitles.push({ text: t.textContent.trim(), top: Math.round(rect.top) });
            }
        }

        return result;
    });

    console.log('\n=== AFTER BACK ===');
    console.log('Hash:', afterBack.hash);
    console.log('App children:', JSON.stringify(afterBack.appChildren, null, 2));
    console.log('SAP Pages:', JSON.stringify(afterBack.sapPages, null, 2));
    console.log('Visible titles in viewport:', JSON.stringify(afterBack.visibleTitles, null, 2));

    await page.screenshot({ path: 'test-screenshots/11-after-back-debug.png' });
    console.log('Screenshots saved');

    await browser.close();
})();

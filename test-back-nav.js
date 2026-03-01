/**
 * Test back navigation from My Assignments page
 */
const { chromium } = require('playwright');
const fs = require('fs');

if (!fs.existsSync('test-screenshots')) fs.mkdirSync('test-screenshots');

(async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('bridgebio'));
    if (!page) { console.log('No SAP page found'); process.exit(1); }

    console.log('=== TESTING BACK NAVIGATION FROM ASSIGNMENTS ===');
    const currentHash = await page.evaluate(() => location.hash);
    console.log('Current hash:', currentHash);

    // If not on assignments, navigate there first
    if (!currentHash.includes('assignment')) {
        console.log('Not on assignments page, navigating...');
        await page.getByRole('button', { name: 'My Assignments' }).click({ timeout: 5000 });
        await page.waitForTimeout(4000);
        const newHash = await page.evaluate(() => location.hash);
        console.log('After nav hash:', newHash);
    }

    await page.screenshot({ path: 'test-screenshots/05-on-assignments.png' });

    // Gather info about what's on the assignments page
    const assignPageInfo = await page.evaluate(() => {
        return {
            hash: location.hash,
            titles: Array.from(document.querySelectorAll('.sapMTitle')).map(t => t.textContent ? t.textContent.trim() : '').filter(Boolean).slice(0, 8),
            backButtons: Array.from(document.querySelectorAll('[id*="back"], [id*="Back"], [id*="nav"], .sapMBarLeft .sapMBtn')).map(b => ({
                id: b.id,
                text: (b.textContent || '').trim().substring(0, 30),
                visible: b.offsetParent !== null
            })),
            allBarLeftBtns: Array.from(document.querySelectorAll('.sapMBarLeft .sapMBtn')).map(b => ({
                id: b.id,
                visible: b.offsetParent !== null
            }))
        };
    });

    console.log('\nAssignments page info:');
    console.log('Hash:', assignPageInfo.hash);
    console.log('Titles:', assignPageInfo.titles);
    console.log('Back buttons:', JSON.stringify(assignPageInfo.backButtons));
    console.log('Bar-left buttons:', JSON.stringify(assignPageInfo.allBarLeftBtns));

    // Click back button
    console.log('\nAttempting to click back...');
    let clicked = false;

    // Method 1: Click visible back/nav button by ID
    for (const btn of assignPageInfo.backButtons) {
        if (btn.visible && btn.id) {
            try {
                await page.locator('#' + CSS.escape(btn.id)).click({ timeout: 3000 });
                console.log('Clicked:', btn.id);
                clicked = true;
                break;
            } catch(e) {
                console.log('Could not click', btn.id, e.message.substring(0, 50));
            }
        }
    }

    // Method 2: Click first visible bar-left button
    if (!clicked) {
        try {
            const barLeftBtns = page.locator('.sapMBarLeft .sapMBtn');
            const count = await barLeftBtns.count();
            console.log('Bar-left button count:', count);
            for (let i = 0; i < count; i++) {
                const btn = barLeftBtns.nth(i);
                if (await btn.isVisible()) {
                    await btn.click({ timeout: 3000 });
                    console.log('Clicked bar-left button index:', i);
                    clicked = true;
                    break;
                }
            }
        } catch(e) {
            console.log('Bar-left click failed:', e.message.substring(0, 80));
        }
    }

    // Method 3: Try shell back button
    if (!clicked) {
        try {
            await page.locator('#backBtn, #shellBackBtn, .sapUshellShellHeadItm').first().click({ timeout: 3000 });
            clicked = true;
            console.log('Clicked shell back button');
        } catch(e) {
            console.log('Shell back also failed');
        }
    }

    await page.waitForTimeout(3000);

    const afterBack = await page.evaluate(() => ({
        hash: location.hash,
        titles: Array.from(document.querySelectorAll('.sapMTitle')).map(t => t.textContent ? t.textContent.trim() : '').filter(Boolean).slice(0, 8),
        buttons: Array.from(document.querySelectorAll('.sapMBtn .sapMBtnContent')).map(b => b.textContent ? b.textContent.trim() : '').filter(Boolean).slice(0, 15)
    }));

    console.log('\n=== AFTER BACK ===');
    console.log('Hash:', afterBack.hash);
    console.log('Titles:', afterBack.titles);
    console.log('Buttons:', afterBack.buttons.slice(0, 8));

    if (!afterBack.hash.includes('assignment')) {
        console.log('\n✅ BACK NAVIGATION: SUCCESS - Returned to home!');
    } else {
        console.log('\n❌ BACK NAVIGATION: FAILED - Still on assignments');
    }

    await page.screenshot({ path: 'test-screenshots/06-after-back.png' });
    console.log('Screenshots saved.');
    await browser.close();
})();

/**
 * Debug page overlay issue - find how pages are structured in DOM
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('bridgebio'));
    if (!page) { console.log('No SAP page found'); process.exit(1); }

    // Find the DOM structure
    const structure = await page.evaluate(() => {
        var result = {};
        
        // Find all nav items (sap.m.App pages)
        var navItems = document.querySelectorAll('.sapMNavItem');
        result.navItems = [];
        for (var i = 0; i < navItems.length; i++) {
            var ni = navItems[i];
            var s = getComputedStyle(ni);
            result.navItems.push({
                id: ni.id,
                classes: ni.className.substring(0, 150),
                display: s.display,
                visibility: s.visibility,
                height: ni.offsetHeight,
                pointerEvents: s.pointerEvents,
                position: s.position,
                zIndex: s.zIndex,
                overflow: s.overflow,
                opacity: s.opacity,
                isHidden: ni.classList.contains('sapMNavItemHidden')
            });
        }
        
        // Find App control
        var appEls = document.querySelectorAll('[id*="app"]');
        result.appElements = [];
        for (var j = 0; j < Math.min(appEls.length, 10); j++) {
            result.appElements.push({
                id: appEls[j].id,
                tag: appEls[j].tagName,
                childCount: appEls[j].children.length
            });
        }
        
        // Find the XML views
        var views = document.querySelectorAll('[id*="xmlview"]');
        result.views = [];
        for (var k = 0; k < views.length; k++) {
            var v = views[k];
            var vs = getComputedStyle(v);
            result.views.push({
                id: v.id,
                display: vs.display,
                visibility: vs.visibility,
                height: v.offsetHeight,
                pointerEvents: vs.pointerEvents,
                position: vs.position,
                isHidden: v.classList.contains('sapMNavItemHidden'),
                classes: v.className.substring(0, 120)
            });
        }
        
        result.hash = location.hash;
        return result;
    });

    console.log('Hash:', structure.hash);
    console.log('\n=== Nav Items (sap.m.App pages) ===');
    console.log(JSON.stringify(structure.navItems, null, 2));
    console.log('\n=== XML Views ===');
    console.log(JSON.stringify(structure.views, null, 2));
    console.log('\n=== App elements ===');
    console.log(JSON.stringify(structure.appElements, null, 2));
    
    await browser.close();
})();

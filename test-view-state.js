/**
 * Check exact visibility state of both views
 */
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('bridgebio'));
    if (!page) { console.log('No SAP page'); process.exit(1); }

    console.log('Hash:', await page.evaluate(() => location.hash));

    const viewState = await page.evaluate(() => {
        // Get the App control's DOM ID
        var appDom = document.querySelector('[id$="--app"]');
        var result = { appId: appDom ? appDom.id : 'not found' };
        
        if (appDom) {
            result.appChildren = [];
            for (var i = 0; i < appDom.children.length; i++) {
                var c = appDom.children[i];
                var s = getComputedStyle(c);
                result.appChildren.push({
                    id: c.id,
                    classes: c.className.substring(0, 150),
                    display: s.display,
                    visibility: s.visibility,
                    height: c.offsetHeight,
                    width: c.offsetWidth,
                    pointerEvents: s.pointerEvents,
                    position: s.position,
                    zIndex: s.zIndex,
                    overflow: s.overflow,
                    top: c.getBoundingClientRect().top,
                    left: c.getBoundingClientRect().left,
                    isHidden: c.classList.contains('sapMNavItemHidden')
                });
            }
        }
        
        // Also check __xmlview0 and __xmlview1 directly  
        ['__xmlview0', '__xmlview1'].forEach(function(vid) {
            var el = document.getElementById(vid);
            if (el) {
                var s = getComputedStyle(el);
                result[vid] = {
                    display: s.display,
                    visibility: s.visibility,
                    height: el.offsetHeight,
                    width: el.offsetWidth,
                    pointerEvents: s.pointerEvents,
                    position: s.position,
                    zIndex: s.zIndex,
                    classes: el.className.substring(0, 150),
                    isHidden: el.classList.contains('sapMNavItemHidden'),
                    rect: el.getBoundingClientRect()
                };
            }
        });
        
        return result;
    });

    console.log('\nApp control ID:', viewState.appId);
    console.log('\nApp children:');
    if (viewState.appChildren) {
        viewState.appChildren.forEach(function(c) { console.log(JSON.stringify(c)); });
    }
    console.log('\n__xmlview0 (TrainingsList):', JSON.stringify(viewState.__xmlview0, null, 2));
    console.log('\n__xmlview1 (Assignments):', JSON.stringify(viewState.__xmlview1, null, 2));

    await browser.close();
})();

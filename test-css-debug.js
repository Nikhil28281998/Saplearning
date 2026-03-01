const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const page = browser.contexts()[0].pages().find(p => p.url().includes('bridgebio'));
    
    // Check what CSS rules apply to sapMNavItemHidden
    const cssInfo = await page.evaluate(() => {
        var hidden = document.querySelector('.sapMNavItemHidden');
        if (!hidden) return { found: false };
        
        var s = getComputedStyle(hidden);
        return {
            found: true,
            id: hidden.id,
            // All relevant CSS properties
            display: s.display,
            visibility: s.visibility,
            opacity: s.opacity,
            height: s.height,
            maxHeight: s.maxHeight,
            overflow: s.overflow,
            pointerEvents: s.pointerEvents,
            position: s.position,
            top: s.top,
            left: s.left,
            right: s.right,
            bottom: s.bottom,
            width: s.width,
            zIndex: s.zIndex,
            transform: s.transform,
            clip: s.clip,
            clipPath: s.clipPath,
            // Check inline styles
            inlineStyle: hidden.getAttribute('style'),
            // Get matched CSS rules for sapMNavItemHidden
            allClasses: hidden.className
        };
    });
    
    console.log('Hidden element CSS state:', JSON.stringify(cssInfo, null, 2));
    
    // Also get the framework CSS for .sapMNavItemHidden via stylesheets
    const frameworkCSS = await page.evaluate(() => {
        var rules = [];
        for (var i = 0; i < document.styleSheets.length; i++) {
            try {
                var sheet = document.styleSheets[i];
                for (var j = 0; j < sheet.cssRules.length; j++) {
                    var rule = sheet.cssRules[j];
                    if (rule.selectorText && rule.selectorText.includes('sapMNavItemHidden')) {
                        rules.push({
                            selector: rule.selectorText,
                            css: rule.cssText.substring(0, 200),
                            href: sheet.href ? sheet.href.substring(sheet.href.lastIndexOf('/') + 1, sheet.href.lastIndexOf('/') + 40) : 'inline'
                        });
                    }
                }
            } catch(e) {} // CORS may block some stylesheets
        }
        return rules;
    });
    
    console.log('\nCSS rules matching .sapMNavItemHidden:');
    frameworkCSS.forEach(function(r) { console.log(JSON.stringify(r)); });
    
    await browser.close();
})();

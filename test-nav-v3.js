const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const pages = contexts[0].pages();
  const page = pages.find(p => p.url().includes('flp'));
  if (!page) { console.log('No FLP page found'); process.exit(1); }

  console.log('Hash:', new URL(page.url()).hash);

  // First ensure we're on home
  await page.evaluate(() => {
    window.hasher.setHash('ZLEARNING-display&/');
  });
  await page.waitForTimeout(2000);

  let states = await page.evaluate(() => {
    const v0 = document.getElementById('__xmlview0');
    const v1 = document.getElementById('__xmlview1');
    return {
      view0: v0 ? { d: getComputedStyle(v0).display, w: v0.offsetWidth } : null,
      view1: v1 ? { d: getComputedStyle(v1).display, w: v1.offsetWidth } : null
    };
  });
  console.log('On home:', JSON.stringify(states));

  // Now navigate to assignments using hasher
  console.log('\nNavigating to assignments...');
  await page.evaluate(() => {
    window.hasher.setHash('ZLEARNING-display&/assignments');
  });
  await page.waitForTimeout(3000);

  states = await page.evaluate(() => {
    const v0 = document.getElementById('__xmlview0');
    const v1 = document.getElementById('__xmlview1');
    return {
      view0: v0 ? { d: getComputedStyle(v0).display, w: v0.offsetWidth, h: v0.offsetHeight } : null,
      view1: v1 ? { d: getComputedStyle(v1).display, w: v1.offsetWidth, h: v1.offsetHeight } : null
    };
  });
  console.log('After nav:', JSON.stringify(states));

  // If view1 is still not visible, try clicking the actual button
  if (states.view1.w === 0) {
    console.log('\nHash nav failed, trying button click...');
    // Go back to home first
    await page.evaluate(() => window.hasher.setHash('ZLEARNING-display&/'));
    await page.waitForTimeout(2000);
    
    // Click the button
    const clicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('.sapMBtn');
      for (const b of btns) {
        if (b.textContent.includes('My Assignments')) {
          b.querySelector('.sapMBtnInner').click();
          return 'clicked inner';
        }
      }
      return 'not found';
    });
    console.log('Button click:', clicked);
    await page.waitForTimeout(4000);

    states = await page.evaluate(() => {
      const v0 = document.getElementById('__xmlview0');
      const v1 = document.getElementById('__xmlview1');
      return {
        hash: window.location.hash,
        view0: { d: getComputedStyle(v0).display, w: v0.offsetWidth },
        view1: { d: getComputedStyle(v1).display, w: v1.offsetWidth }
      };
    });
    console.log('After button:', JSON.stringify(states));
  }

  // Take screenshot regardless
  await page.screenshot({ path: 'test-nav-v3.png', fullPage: false });
  console.log('\nScreenshot: test-nav-v3.png');

  // Check current page
  const pageInfo = await page.evaluate(() => {
    // Find visible page title
    const views = [document.getElementById('__xmlview0'), document.getElementById('__xmlview1')];
    const visible = views.find(v => v && v.offsetWidth > 0);
    if (!visible) return { visibleView: 'none' };
    const title = visible.querySelector('.sapMTitle');
    return { 
      visibleView: visible.id, 
      title: title ? title.textContent : 'N/A',
      w: visible.offsetWidth, 
      h: visible.offsetHeight
    };
  });
  console.log('Visible:', JSON.stringify(pageInfo));
})();

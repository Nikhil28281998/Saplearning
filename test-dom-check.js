const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  
  let page = null;
  for (const p of pages) {
    const url = p.url();
    if (url.includes('flp') || url.includes('ZLEARNING')) {
      page = p;
      break;
    }
  }
  
  if (!page) {
    console.log('FLP page not found. Available pages:');
    for (const p of pages) console.log(' -', p.url());
    await browser.close();
    return;
  }

  console.log('Connected:', page.url());
  
  // Check for iframes
  const frames = page.frames();
  console.log('\nFrames:', frames.length);
  for (const f of frames) {
    console.log(' Frame:', f.url().substring(0, 120));
  }
  
  // Check top-level DOM
  const domInfo = await page.evaluate(() => {
    const body = document.body;
    const children = body.children;
    let info = [];
    for (let i = 0; i < Math.min(children.length, 10); i++) {
      const c = children[i];
      info.push({ tag: c.tagName, id: c.id, class: c.className.substring(0, 80), childCount: c.children.length });
    }
    
    // Check if there's a shell container
    const shell = document.querySelector('#shell-ctn, #canvas, .sapUShellFullWidth, [id*="shell"]');
    
    // Check any visible text
    const allText = document.body.innerText.substring(0, 500);
    
    return { bodyChildren: info, shell: shell ? { id: shell.id, tag: shell.tagName } : null, textPreview: allText };
  });
  
  console.log('\nBody children:', JSON.stringify(domInfo.bodyChildren, null, 2));
  console.log('Shell:', JSON.stringify(domInfo.shell));
  console.log('Text preview:', domInfo.textPreview.substring(0, 300));
  
  // Try looking in all frames for app content
  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    try {
      const frameContent = await frame.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return {
          buttonCount: buttons.length,
          buttonTexts: Array.from(buttons).slice(0, 5).map(b => b.textContent.trim().substring(0, 30)),
          bodyText: document.body?.innerText?.substring(0, 200) || 'empty'
        };
      });
      console.log('\nFrame content:', JSON.stringify(frameContent, null, 2));
    } catch(e) {
      console.log('Frame eval error:', e.message.substring(0, 100));
    }
  }
  
  await browser.close();
})();

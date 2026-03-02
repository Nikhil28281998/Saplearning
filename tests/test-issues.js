const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== ISSUE 4 & 5 TESTING ===\n');

  // Navigate to assignments tab
  const navResult = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.sapMITBText, .sapMITBItem, .sapMITBFilter');
    for (const t of tabs) {
      if (t.textContent && t.textContent.includes('Assignment')) { t.click(); return 'clicked tab'; }
    }
    return 'no tab found';
  });
  console.log('Nav: ' + navResult);
  await page.waitForTimeout(3000);
  
  // Check card view
  console.log('\n--- Card View ---');
  const cardInfo = await page.evaluate(() => {
    const cards = document.querySelectorAll('.assignmentCard');
    const cardDetails = [];
    cards.forEach((c, i) => {
      if (i < 3 && c.offsetWidth > 0) {
        const btns = c.querySelectorAll('button');
        const title = c.querySelector('.learningCardTitle');
        const statuses = c.querySelectorAll('.sapMObjStatus');
        cardDetails.push({
          title: title?.textContent?.substring(0, 30),
          status: Array.from(statuses).map(s => s.textContent?.substring(0, 20)).join(', '),
          btnCount: btns.length,
          btns: Array.from(btns).map(b => ({
            tooltip: b.getAttribute('title') || 'none',
            icon: b.querySelector('.sapUiIcon')?.getAttribute('data-sap-ui-icon-content') ? 'has-icon' : 'no-icon',
            type: b.getAttribute('type'),
            id: b.id?.substring(0, 40)
          }))
        });
      }
    });
    
    // Check if card grid is visible
    const grid = document.querySelector('[id*=assignCardGrid]');
    const scrollCont = document.querySelector('[id*=assignCardScrollContainer]');
    
    return {
      cardsRendered: cards.length,
      cardsVisible: Array.from(cards).filter(c => c.offsetWidth > 0).length,
      gridVisible: grid?.offsetHeight > 0,
      scrollContVisible: scrollCont?.offsetHeight > 0,
      cardDetails
    };
  });
  console.log(JSON.stringify(cardInfo, null, 2));

  // Now switch to table view
  console.log('\n--- Switch to Table View ---');
  await page.evaluate(() => {
    const items = document.querySelectorAll('.sapMSegBBtn');
    for (const item of items) {
      const icon = item.querySelector('.sapUiIcon');
      if (icon && icon.getAttribute('data-sap-ui-icon-content') && item.getAttribute('title')?.includes('Table')) {
        item.click();
        return;
      }
    }
    // Fallback: try by ID pattern
    const btn = document.querySelector('[id*=assignViewModeTable]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(2000);

  const tableInfo = await page.evaluate(() => {
    const smartTable = document.querySelector('[id*=assignSmartTable]');
    const isVisible = smartTable?.offsetHeight > 0;
    const table = smartTable?.querySelector('.sapMList, .sapMTable');
    const rows = table ? table.querySelectorAll('.sapMLIB') : [];
    const startBtn = document.querySelector('[id*=startTrainingBtn]');
    const markBtn = document.querySelector('[id*=markCompletedBtn]');
    const fsBtn = smartTable?.querySelector('[id*=btnFullScreen]');
    
    // Check table selection mode
    const selMode = table?.getAttribute('data-sap-ui-mode') || table?.classList?.toString()?.match(/sapMListMd\w+/)?.[0] || 'unknown';
    
    return {
      smartTableH: smartTable?.offsetHeight,
      isVisible,
      rows: rows.length,
      selMode,
      startBtn: startBtn ? { 
        visible: startBtn.offsetHeight > 0, 
        text: startBtn.textContent?.substring(0, 20),
        enabled: !startBtn.classList.contains('sapMBtnDisabled')
      } : null,
      markBtn: markBtn ? { visible: markBtn.offsetHeight > 0 } : null,
      fsBtn: fsBtn ? { visible: fsBtn.offsetHeight > 0, id: fsBtn.id?.substring(0, 40) } : null,
      rowDetails: Array.from(rows).slice(0, 3).map(r => ({
        text: r.textContent?.substring(0, 60),
        selectable: r.querySelector('.sapMLIBSelectM, .sapMCb') ? true : false
      }))
    };
  });
  console.log(JSON.stringify(tableInfo, null, 2));

  // Try clicking fullscreen if available
  if (tableInfo.fsBtn?.visible) {
    console.log('\n--- Test Fullscreen ---');
    await page.evaluate(() => {
      const fsBtn = document.querySelector('[id*=assignSmartTable] [id*=btnFullScreen]');
      if (fsBtn) fsBtn.click();
    });
    await page.waitForTimeout(1500);
    
    // Now try switching to card view while fullscreen
    const fsInfo = await page.evaluate(() => {
      const toggle = document.querySelector('[id*=assignViewModeCards2]');
      const isFs = document.querySelector('.sapUiCompSmartTableFullScreen, [class*=FullScreen]');
      return {
        isFullscreen: !!isFs,
        toggleVisible: toggle?.offsetHeight > 0,
        toggleId: toggle?.id?.substring(0, 40)
      };
    });
    console.log('Fullscreen state: ' + JSON.stringify(fsInfo));
    
    if (fsInfo.toggleVisible) {
      await page.evaluate(() => {
        const toggle = document.querySelector('[id*=assignViewModeCards2]');
        if (toggle) toggle.click();
      });
      await page.waitForTimeout(1500);
      
      const afterSwitch = await page.evaluate(() => {
        const cards = document.querySelectorAll('.assignmentCard');
        const grid = document.querySelector('[id*=assignCardGrid]');
        const smartTable = document.querySelector('[id*=assignSmartTable]');
        return {
          cardsVisible: Array.from(cards).filter(c => c.offsetWidth > 0).length,
          gridVisible: grid?.offsetHeight > 0,
          smartTableVisible: smartTable?.offsetHeight > 0,
          bodyHtml: document.body.innerHTML.substring(0, 200)
        };
      });
      console.log('After card switch in FS: ' + JSON.stringify(afterSwitch));
    }
    
    // Exit fullscreen
    await page.evaluate(() => {
      const fsBtn = document.querySelector('[id*=assignSmartTable] [id*=btnFullScreen]');
      if (fsBtn) fsBtn.click();
    });
    await page.waitForTimeout(1000);
  }

  // Switch back to cards
  await page.evaluate(() => {
    const items = document.querySelectorAll('.sapMSegBBtn');
    for (const item of items) {
      if (item.getAttribute('title')?.includes('Card')) { item.click(); return; }
    }
    const btn = document.querySelector('[id*=assignViewModeCards]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  
  await browser.close();
})();

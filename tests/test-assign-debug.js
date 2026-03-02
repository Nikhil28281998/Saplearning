const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  console.log('Page:', page.url().substring(0, 60));
  await page.waitForTimeout(1000);

  // We should be on table view already. Let's verify.
  const tableVis = await page.evaluate(() => {
    const st = document.querySelector('[id$="--smartTable"]');
    return st ? st.offsetParent !== null : false;
  });
  console.log('Table visible:', tableVis);

  if (!tableVis) {
    // Switch to table
    const btn = await page.$('li[id$="--viewModeTable-button"]');
    if (btn) { await btn.click(); await page.waitForTimeout(2000); }
  }

  // 1. Investigate table selection mode
  const tableSel = await page.evaluate(() => {
    // Get SAPUI5 SmartTable control's inner table
    const smartTable = document.querySelector('[id$="--smartTable"]');
    if (!smartTable) return { error: 'no smartTable' };
    
    // Find inner table - could be sap.ui.table.Table (GridTable)
    const gridTable = smartTable.querySelector('.sapUiTable');
    const selMode = gridTable ? gridTable.getAttribute('data-sap-ui-selmode') || 'unknown' : 'no grid table';
    
    // Check row selection headers
    const rowHdrs = smartTable.querySelectorAll('.sapUiTableRowHdr');
    const rowSelCells = smartTable.querySelectorAll('.sapUiTableRowSelectionCell');
    const selectAllCb = smartTable.querySelector('.sapUiTableSelAllCb, .sapUiTableColRowHdr');
    
    return {
      hasGridTable: !!gridTable,
      selMode,
      rowHdrs: rowHdrs.length,
      rowSelCells: rowSelCells.length,
      hasSelectAll: !!selectAllCb,
      selectAllClass: selectAllCb ? selectAllCb.className.substring(0, 80) : ''
    };
  });
  console.log('1. Table selection info:', JSON.stringify(tableSel, null, 2));

  // 2. Try selecting row via row header click
  const rowHdr = await page.$('[id$="--smartTable"] .sapUiTableRowHdr');
  if (rowHdr) {
    await rowHdr.click();
    await page.waitForTimeout(1000);
    console.log('2. Clicked row header');
  }

  // 3. Check selection state
  const selState = await page.evaluate(() => {
    const selected = document.querySelectorAll('.sapUiTableRowSel, .sapUiTableRowSelected');
    const hdrSel = document.querySelectorAll('.sapUiTableRowHdrSel');
    return {
      selectedRows: selected.length,
      selectedHdrs: hdrSel.length
    };
  });
  console.log('3. Selection state:', JSON.stringify(selState));

  // 4. Now try clicking Assign
  const assignBtn = await page.$('[id$="--assignButton"]');
  if (assignBtn && await assignBtn.isVisible()) {
    console.log('4. Clicking Assign...');
    await assignBtn.click();
    await page.waitForTimeout(4000);

    // Check for dialog
    const dlg = await page.evaluate(() => {
      // Check ALL dialogs that might have opened
      const allDialogs = document.querySelectorAll('.sapMDialog, .sapMPopup');
      const assignDlg = document.querySelector('[id$="--assignTrainingDialog"]');
      
      // Check for any message toast
      const toast = document.querySelector('.sapMMessageToast');
      const toastText = toast ? toast.textContent : '';
      
      // Check message popover
      const msgPopover = document.querySelector('.sapMMsgPopover');
      
      return {
        dialogCount: allDialogs.length,
        assignDlgFound: !!assignDlg,
        assignDlgVis: assignDlg ? assignDlg.offsetParent !== null : false,
        toast: toastText,
        msgPopover: !!msgPopover,
        dialogIds: Array.from(allDialogs).map(d => d.id.split('--').pop().substring(0, 40))
      };
    });
    console.log('4. After Assign click:', JSON.stringify(dlg, null, 2));
  } else {
    console.log('4. Assign button not visible');
  }

  // 5. Alternative: try selecting row first by clicking on a cell
  console.log('\n--- Round 2: Try selecting via cell click ---');
  
  // First close any dialog
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Click on first data cell
  const firstCell = await page.$('[id$="--smartTable"] .sapUiTableCellInner');
  if (firstCell) {
    await firstCell.click();
    await page.waitForTimeout(1000);
    console.log('5a. Clicked first data cell');
    
    const sel2 = await page.evaluate(() => ({
      selectedRows: document.querySelectorAll('.sapUiTableRowSel').length,
      selectedHdrs: document.querySelectorAll('.sapUiTableRowHdrSel').length
    }));
    console.log('5b. Selection:', JSON.stringify(sel2));
  }

  // 6. Try Assign again
  if (assignBtn && await assignBtn.isVisible()) {
    await assignBtn.click();
    await page.waitForTimeout(4000);
    
    const dlg2 = await page.evaluate(() => {
      const assignDlg = document.querySelector('[id$="--assignTrainingDialog"]');
      const allDialogs = document.querySelectorAll('.sapMDialog');
      const toast = document.querySelector('.sapMMessageToast');
      return {
        assignDlgFound: !!assignDlg,
        assignDlgVis: assignDlg ? getComputedStyle(assignDlg).display !== 'none' : false,
        dialogCount: allDialogs.length,
        dialogIds: Array.from(allDialogs).map(d => d.id.split('--').pop().substring(0, 40)),
        toast: toast ? toast.textContent : ''
      };
    });
    console.log('6. After 2nd Assign click:', JSON.stringify(dlg2, null, 2));

    // 7. Check if maybe it takes longer or the dialog ID is different
    await page.waitForTimeout(2000);
    const dlg3 = await page.evaluate(() => {
      // Search broadly for any recently opened overlay
      const overlays = document.querySelectorAll('.sapMDialogOpen, .sapUiDlg, .sapMDialog, .sapMPopover, [role="dialog"]');
      return {
        overlayCount: overlays.length,
        overlayInfo: Array.from(overlays).map(o => ({
          id: o.id.substring(o.id.lastIndexOf('--') + 2, o.id.lastIndexOf('--') + 42) || o.id.substring(0, 40),
          role: o.getAttribute('role'),
          vis: o.offsetParent !== null,
          text: o.textContent.substring(0, 100)
        }))
      };
    });
    console.log('7. All overlays:', JSON.stringify(dlg3, null, 2));
  }

  await browser.close();
})();

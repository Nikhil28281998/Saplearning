const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const pages = browser.contexts()[0].pages();
  console.log('Pages found:', pages.length, pages.map(p => p.url().substring(0, 60)));
  const page = pages.find(p => p.url().includes('ZLEARNING') || p.url().includes('flp'));
  if (!page) { console.log('ERROR: No SAP tab found!'); await browser.close(); process.exit(1); }
  console.log('Using page:', page.url().substring(0, 80));

  // Navigate to home page
  await page.goto('https://vhbrbws1wd01.hec.bridgebio.com:44380/sap/bc/ui2/flp?saml2=disabled&sap-client=400&sap-language=EN#ZLEARNING-display', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Nav warn:', e.message));
  await page.waitForTimeout(5000);

  // 1. Check current view state
  const state = await page.evaluate(() => {
    const cardGrid = document.querySelector('[id$="--cardGrid"]');
    const smartTable = document.querySelector('[id$="--smartTable"]');
    return {
      cardVis: cardGrid ? cardGrid.offsetParent !== null : false,
      tableVis: smartTable ? smartTable.offsetParent !== null : false,
      url: location.hash
    };
  });
  console.log('1. Current state:', JSON.stringify(state));

  // 2. We need table view for the Assign button. Find and click the correct table toggle.
  // From diagnostics: SAPUI5 renders SegmentedButtonItem as "viewModeTable-button"
  const tableBtnLI = await page.$('li[id$="--viewModeTable-button"]');
  if (tableBtnLI) {
    console.log('2. Found table toggle button (LI), clicking...');
    await tableBtnLI.click();
    await page.waitForTimeout(2000);
  } else {
    // Try the SegmentedButtonItem directly
    const altBtn = await page.$('[id$="--viewModeTable"]');
    if (altBtn) {
      console.log('2. Found viewModeTable, clicking...');
      await altBtn.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('2. ERROR: No table toggle button found');
    }
  }

  // 3. Check if table is now visible
  const tableState = await page.evaluate(() => {
    const st = document.querySelector('[id$="--smartTable"]');
    const toolbar = document.querySelector('[id$="--tableToolbar"]');
    const assignBtn = document.querySelector('[id$="--assignButton"]');
    return {
      tableVis: st ? st.offsetParent !== null : false,
      toolbarVis: toolbar ? toolbar.offsetParent !== null : false,
      assignBtnFound: !!assignBtn,
      assignBtnVis: assignBtn ? assignBtn.offsetParent !== null : false
    };
  });
  console.log('3. Table state after toggle:', JSON.stringify(tableState));

  // 4. Select a row in the table
  if (tableState.tableVis) {
    // Find rows - could be GridTable (sapUiTableRow) or ResponsiveTable
    const rowInfo = await page.evaluate(() => {
      const gridRows = document.querySelectorAll('.sapUiTableRow');
      const respRows = document.querySelectorAll('[id$="--smartTable"] .sapMListTblRow, [id$="--smartTable"] tr.sapMLIB');
      const anyRows = document.querySelectorAll('[id$="--smartTable"] .sapUiTableRowHdr, [id$="--smartTable"] .sapUiTableRow .sapUiTableRowSelectionCell');
      return { gridRows: gridRows.length, respRows: respRows.length, selCells: anyRows.length };
    });
    console.log('4a. Row info:', JSON.stringify(rowInfo));

    // Click first data row
    const firstRow = await page.$('.sapUiTableRow:first-child .sapUiTableRowSelectionCell, .sapUiTableRow:first-child td:first-child');
    if (firstRow) {
      await firstRow.click();
      await page.waitForTimeout(500);
      console.log('4b. Clicked first row selection cell');
    } else {
      // Try clicking row header
      const rowHdr = await page.$('.sapUiTableRowHdr');
      if (rowHdr) {
        await rowHdr.click();
        await page.waitForTimeout(500);
        console.log('4b. Clicked row header');
      } else {
        console.log('4b. Could not find a clickable row');
      }
    }
  }

  // 5. Click Assign button
  if (tableState.assignBtnVis) {
    console.log('5. Clicking Assign button...');
    await page.click('[id$="--assignButton"]');
    await page.waitForTimeout(3000);

    // 6. Check if AssignDialog opened
    const dlgState = await page.evaluate(() => {
      const dlg = document.querySelector('[id$="--assignTrainingDialog"]');
      const wizStep1 = document.querySelector('[id$="--wizStep1"]');
      const trainingsList = document.querySelector('[id$="--assignTrainingsList"]');
      const prioritySel = document.querySelector('[id$="--assignPrioritySelect"]');
      const dueDatePicker = document.querySelector('[id$="--assignDueDate"]');
      const noteInput = document.querySelector('[id$="--assignNotesInput"]');
      const userList = document.querySelector('[id$="--assignUserList"]');
      const submitBtn = document.querySelector('[id$="--assignSubmitBtn"]');
      
      // Get training list items
      let trainingItems = 0;
      if (trainingsList) {
        trainingItems = trainingsList.querySelectorAll('.sapMLIB, li').length;
      }
      
      return {
        dialogOpen: dlg ? dlg.offsetParent !== null : false,
        dialogClass: dlg ? dlg.className.substring(0, 80) : 'NOT FOUND',
        wizStep1: !!wizStep1,
        trainingsList: !!trainingsList,
        trainingItems,
        prioritySelect: !!prioritySel,
        dueDatePicker: !!dueDatePicker,
        notesInput: !!noteInput,
        userList: !!userList,
        submitBtn: !!submitBtn
      };
    });
    console.log('6. AssignDialog state:', JSON.stringify(dlgState, null, 2));

    if (dlgState.dialogOpen) {
      // 7. Explore Step 1 content
      const step1 = await page.evaluate(() => {
        const items = document.querySelectorAll('[id$="--assignTrainingsList"] .sapMLIB');
        const firstItem = items[0];
        return {
          itemCount: items.length,
          firstItemText: firstItem ? firstItem.textContent.substring(0, 100) : 'none',
          // Check if items have checkboxes (multi-select)
          checkboxes: document.querySelectorAll('[id$="--assignTrainingsList"] .sapMCb').length
        };
      });
      console.log('7. Step 1 trainings:', JSON.stringify(step1));

      // 8. Check wizard navigation buttons
      const wizBtns = await page.evaluate(() => {
        const nextBtn = document.querySelector('[id$="--wizNextBtn"], [id$="--assignNextBtn"]');
        const backBtn = document.querySelector('[id$="--wizBackBtn"], [id$="--assignBackBtn"]');
        const cancelBtn = document.querySelector('[id$="--assignCancelBtn"]');
        // Get all buttons in the dialog
        const dlg = document.querySelector('[id$="--assignTrainingDialog"]');
        const allBtns = dlg ? Array.from(dlg.querySelectorAll('button')).map(b => ({
          id: b.id.split('--').pop(),
          text: b.textContent.trim().substring(0, 30),
          vis: b.offsetParent !== null
        })) : [];
        return {
          nextBtn: !!nextBtn,
          backBtn: !!backBtn,
          cancelBtn: !!cancelBtn,
          allButtons: allBtns
        };
      });
      console.log('8. Wizard buttons:', JSON.stringify(wizBtns, null, 2));

      // Close dialog without making changes
      const cancelBtn = await page.$('[id$="--assignCancelBtn"]');
      if (cancelBtn) {
        await cancelBtn.click();
        console.log('9. Closed dialog via Cancel');
      } else {
        await page.keyboard.press('Escape');
        console.log('9. Closed dialog via Escape');
      }
    }
  } else {
    console.log('5. Assign button not visible - checking why...');
    const debug = await page.evaluate(() => {
      const all = document.querySelectorAll('[id*="assign"]');
      return Array.from(all).map(e => ({ id: e.id.split('--').pop(), vis: e.offsetParent !== null, tag: e.tagName })).filter(e => e.id.toLowerCase().includes('button') || e.id.toLowerCase().includes('btn'));
    });
    console.log('5b. Assign-related buttons:', JSON.stringify(debug));
  }

  await browser.close();
})();

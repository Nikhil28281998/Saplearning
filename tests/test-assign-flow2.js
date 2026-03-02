const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  console.log('Page:', page.url().substring(0, 60));
  await page.waitForTimeout(1000);

  // Ensure table view
  const tableVis = await page.evaluate(() => {
    const st = document.querySelector('[id$="--smartTable"]');
    return st ? st.offsetParent !== null : false;
  });
  if (!tableVis) {
    const btn = await page.$('li[id$="--viewModeTable-button"]');
    if (btn) { await btn.click(); await page.waitForTimeout(2000); }
  }

  // 1. Select first row using SAPUI5 API
  const selectResult = await page.evaluate(() => {
    try {
      // Find the SmartTable's inner GridTable
      const viewId = document.querySelector('[id$="--smartTable"]').id.replace('--smartTable', '');
      const smartTableId = viewId + '--smartTable';
      
      // Get SAPUI5 control
      const oSmartTable = sap.ui.getCore().byId(smartTableId);
      if (!oSmartTable) return { error: 'SmartTable not found via sap.ui.getCore()' };
      
      const oTable = oSmartTable.getTable();
      if (!oTable) return { error: 'Inner table not found' };

      // Get selection mode
      const selMode = oTable.getSelectionMode ? oTable.getSelectionMode() : 'unknown';
      const rowCount = oTable.getBinding('rows') ? oTable.getBinding('rows').getLength() : 0;
      
      // Select first row
      if (oTable.setSelectedIndex) {
        oTable.setSelectedIndex(0);
      } else if (oTable.addSelectionInterval) {
        oTable.addSelectionInterval(0, 0);
      }
      
      const selectedIndices = oTable.getSelectedIndices ? oTable.getSelectedIndices() : [];
      
      // Get data of selected row
      let selectedData = null;
      if (selectedIndices.length > 0) {
        const ctx = oTable.getContextByIndex(selectedIndices[0]);
        if (ctx) selectedData = { title: ctx.getProperty('Title'), module: ctx.getProperty('Module'), role: ctx.getProperty('Role') };
      }
      
      return { selMode, rowCount, selectedIndices, selectedData };
    } catch(e) { return { error: e.message }; }
  });
  console.log('1. Row selection:', JSON.stringify(selectResult, null, 2));

  // 2. Click Assign button
  const assignBtn = await page.$('[id$="--assignButton"]');
  if (assignBtn && await assignBtn.isVisible()) {
    console.log('2. Clicking Assign...');
    await assignBtn.click();
    await page.waitForTimeout(4000);

    // 3. Check dialog
    const dialogState = await page.evaluate(() => {
      const dlg = document.querySelector('[id$="--assignTrainingDialog"]');
      if (!dlg) {
        // Check for MessageToast
        const toast = document.querySelector('.sapMMessageToast');
        return { dialogOpen: false, toast: toast ? toast.textContent : 'no toast' };
      }
      
      // Dialog found! Explore contents
      const wizSteps = dlg.querySelectorAll('.sapMWizardStep');
      const trainingsList = dlg.querySelector('[id*="assignTrainingsList"]');
      const listItems = trainingsList ? trainingsList.querySelectorAll('.sapMLIB') : [];
      const prioritySel = dlg.querySelector('[id*="assignPrioritySelect"]');
      const dueDatePicker = dlg.querySelector('[id*="assignDueDate"]');
      const notesInput = dlg.querySelector('[id*="assignNotesInput"]');
      const seqInput = dlg.querySelector('[id*="assignSequenceInput"]');
      const recurSwitch = dlg.querySelector('[id*="assignRecurringSwitch"]');
      const cancelBtn = dlg.querySelector('[id*="assignCancelBtn"]');
      const nextBtn = dlg.querySelector('[id*="wizNextBtn"], [id*="assignNextBtn"]');
      
      // Get all button texts
      const allBtns = Array.from(dlg.querySelectorAll('button')).map(b => ({
        id: b.id.split('--').pop().substring(0, 30),
        text: b.textContent.trim().substring(0, 30),
        vis: b.offsetParent !== null
      }));

      return {
        dialogOpen: true,
        wizardSteps: wizSteps.length,
        trainingsListItems: listItems.length,
        firstTraining: listItems[0] ? listItems[0].textContent.substring(0, 80) : '',
        hasPriority: !!prioritySel,
        hasDueDate: !!dueDatePicker,
        hasNotes: !!notesInput,
        hasSequence: !!seqInput,
        hasRecurring: !!recurSwitch,
        hasCancel: !!cancelBtn,
        buttons: allBtns
      };
    });
    console.log('3. Dialog state:', JSON.stringify(dialogState, null, 2));

    if (dialogState.dialogOpen) {
      // 4. Take screenshot info of dialog
      console.log('\n=== ASSIGN DIALOG OPENED SUCCESSFULLY ===');
      console.log(`Wizard Steps: ${dialogState.wizardSteps}`);
      console.log(`Trainings pre-selected: ${dialogState.trainingsListItems}`);
      console.log(`Priority selector: ${dialogState.hasPriority}`);
      console.log(`Due Date picker: ${dialogState.hasDueDate}`);
      console.log(`Notes input: ${dialogState.hasNotes}`);
      console.log(`Sequence input: ${dialogState.hasSequence}`);
      console.log(`Recurring toggle: ${dialogState.hasRecurring}`);

      // 5. Try navigating to Step 2 (User selection)
      const nextBtn = await page.$('[id$="--wizNextBtn"]');
      const next2 = await page.evaluate(() => {
        const dlg = document.querySelector('[id$="--assignTrainingDialog"]');
        const btns = Array.from(dlg.querySelectorAll('button'));
        const nextBtn = btns.find(b => b.textContent.includes('Next') || b.textContent.includes('Step'));
        return nextBtn ? { id: nextBtn.id.split('--').pop(), text: nextBtn.textContent.trim() } : null;
      });
      console.log('\n5. Next button:', JSON.stringify(next2));

      if (next2) {
        const nb = await page.$(`#${(await page.evaluate(() => {
          const dlg = document.querySelector('[id$="--assignTrainingDialog"]');
          const btns = Array.from(dlg.querySelectorAll('button'));
          return btns.find(b => b.textContent.includes('Next') || b.textContent.includes('Step'))?.id || '';
        }))}`);
        if (nb) {
          await nb.click();
          await page.waitForTimeout(2000);
          
          // Check step 2
          const step2 = await page.evaluate(() => {
            const dlg = document.querySelector('[id$="--assignTrainingDialog"]');
            const userList = dlg.querySelector('[id*="assignUserList"]');
            const users = userList ? userList.querySelectorAll('.sapMLIB') : [];
            const selectAll = dlg.querySelector('[id*="selectAllUsersBtn"]');
            const search = dlg.querySelector('[id*="assignUserSearch"]');
            return {
              userListFound: !!userList,
              userCount: users.length,
              firstUser: users[0] ? users[0].textContent.substring(0, 60) : '',
              hasSelectAll: !!selectAll,
              hasSearch: !!search
            };
          });
          console.log('6. Step 2 (Users):', JSON.stringify(step2, null, 2));
        }
      }

      // Close dialog
      const cancelBtn = await page.$('[id$="--assignCancelBtn"]');
      if (cancelBtn) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
        console.log('\n7. Dialog closed via Cancel');
      } else {
        await page.keyboard.press('Escape');
        console.log('\n7. Dialog closed via Escape');
      }
    }
  }

  await browser.close();
})();

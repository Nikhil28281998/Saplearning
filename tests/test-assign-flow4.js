const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];

  // Listen for console messages to catch errors
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`  [browser ${msg.type()}] ${msg.text().substring(0, 150)}`);
    }
  });

  console.log('=== Assign Course Flow Test ===\n');

  // 1. Get training data + call openAssignDialog directly
  const result = await page.evaluate(() => {
    try {
      const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
      if (!comp) return { error: 'Component not found' };

      const model = comp.getModel();
      if (!model) return { error: 'No OData model' };

      // Read the first training from the table
      const smartTableId = comp.createId('TrainingsList--smartTable');
      const smartTable = sap.ui.getCore().byId(smartTableId);
      
      // Try alternate ID patterns
      let table = null;
      if (smartTable) {
        table = smartTable.getTable();
      } else {
        // Find by DOM
        const stEl = document.querySelector('[id$="--smartTable"]');
        if (stEl) {
          const st = sap.ui.getCore().byId(stEl.id);
          table = st && st.getTable ? st.getTable() : null;
        }
      }

      if (!table) return { error: 'Table not found', smartTableId };

      // Select row 0
      table.setSelectedIndex(0);
      const ctx = table.getContextByIndex(0);
      if (!ctx) return { error: 'No row context' };

      const training = ctx.getObject();
      return {
        success: true,
        training: { Title: training.Title, Module: training.Module, Role: training.Role, Url: training.Url },
        calling: 'openAssignDialog'
      };
    } catch(e) { return { error: e.message, stack: e.stack?.substring(0, 300) }; }
  });
  console.log('1. Prep:', JSON.stringify(result, null, 2));

  if (!result.success) { await browser.close(); return; }

  // 2. Call openAssignDialog via evaluate and wait
  console.log('\n2. Calling openAssignDialog...');
  const callResult = await page.evaluate((trainingData) => {
    return new Promise((resolve) => {
      try {
        const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
        comp.openAssignDialog([trainingData]);
        // The method is async (OData reads), so we'll check later
        resolve({ called: true });
      } catch(e) { resolve({ error: e.message }); }
    });
  }, result.training);
  console.log('  Call result:', JSON.stringify(callResult));

  // 3. Wait for OData calls + fragment loading
  console.log('\n3. Waiting for OData calls and dialog loading...');
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);
    const dlg = await page.evaluate(() => {
      const allDlg = document.querySelectorAll('.sapMDialog, [role="dialog"]');
      const assignDlg = document.querySelector('[id*="assignTrainingDialog"]');
      const toast = document.querySelector('.sapMMessageToast');
      return {
        dialogCount: allDlg.length,
        assignFound: !!assignDlg,
        assignVis: assignDlg ? assignDlg.offsetParent !== null : false,
        toast: toast ? toast.textContent : ''
      };
    });
    
    if (dlg.assignFound || dlg.toast || dlg.dialogCount > 0) {
      console.log(`  [${i+1}s] ${JSON.stringify(dlg)}`);
      if (dlg.assignVis) break;
    } else {
      process.stdout.write('.');
    }
  }
  console.log('');

  // 4. Final dialog inspection
  const finalState = await page.evaluate(() => {
    const assignDlg = document.querySelector('[id*="assignTrainingDialog"]');
    if (!assignDlg) {
      // Check if any dialog opened at all
      const allDialogs = document.querySelectorAll('.sapMDialog');
      const overlays = document.querySelectorAll('.sapUiOverlay, .sapUiBLy');
      return {
        noDialog: true,
        allDialogIds: Array.from(allDialogs).map(d => d.id.substring(d.id.lastIndexOf('--') + 2).substring(0, 40)),
        overlays: overlays.length
      };
    }

    // Explore the dialog
    const wizSteps = assignDlg.querySelectorAll('.sapMWizardStep, [id*="wizStep"]');
    const trainingsList = assignDlg.querySelector('[id*="assignTrainingsList"], [id*="TrainingsList"]');
    const listItems = trainingsList ? trainingsList.querySelectorAll('.sapMLIB, .sapMListItem') : [];
    const userList = assignDlg.querySelector('[id*="assignUserList"]');
    const userItems = userList ? userList.querySelectorAll('.sapMLIB') : [];
    const prioritySel = assignDlg.querySelector('[id*="assignPrioritySelect"], [id*="Priority"]');
    const dueDatePicker = assignDlg.querySelector('[id*="assignDueDate"]');
    const notesInput = assignDlg.querySelector('[id*="assignNotesInput"]');

    // Get all buttons
    const buttons = Array.from(assignDlg.querySelectorAll('button')).map(b => ({
      id: b.id.split('--').pop().substring(0, 25),
      text: b.textContent.trim().substring(0, 30),
      vis: b.offsetParent !== null
    }));

    // Get dialog title
    const title = assignDlg.querySelector('.sapMDialogTitle, .sapMTitle');

    return {
      dialogVisible: assignDlg.offsetParent !== null,
      title: title ? title.textContent.trim() : '',
      wizardSteps: wizSteps.length,
      trainingCount: listItems.length,
      firstTraining: listItems[0] ? listItems[0].textContent.substring(0, 80) : '',
      userCount: userItems.length,
      hasPriority: !!prioritySel,
      hasDueDate: !!dueDatePicker,
      hasNotes: !!notesInput,
      buttons
    };
  });
  console.log('4. Final state:', JSON.stringify(finalState, null, 2));

  if (finalState.dialogVisible) {
    console.log('\n✅ ASSIGN DIALOG IS OPEN!');
    console.log(`   Title: ${finalState.title}`);
    console.log(`   Trainings: ${finalState.trainingCount}`);
    console.log(`   Users: ${finalState.userCount}`);
    console.log(`   Has Priority: ${finalState.hasPriority}`);
    console.log(`   Has Due Date: ${finalState.hasDueDate}`);
    console.log(`   Buttons: ${finalState.buttons.map(b => b.text).join(', ')}`);

    // Close dialog
    await page.keyboard.press('Escape');
    console.log('\n   Dialog closed.');
  } else if (finalState.noDialog) {
    console.log('\n❌ Dialog did NOT open.');
    console.log('   Possible reasons: OData call to UserSet failed, or fragment load error.');
    console.log('   Other dialogs:', finalState.allDialogIds);
  }

  await browser.close();
})();

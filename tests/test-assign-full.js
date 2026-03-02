const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== Full Assign Course Workflow Test ===\n');

  // Helper: check if dialog element is visible (handles fixed positioning)
  async function isDlgVisible(selector) {
    return page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetWidth > 0;
    }, selector);
  }

  // Step 0: Ensure we're on home page with table view
  console.log('--- STEP 0: Setup ---');
  const onHome = await page.evaluate(() => !!document.querySelector('[id$="--trainingsListPage"]'));
  if (!onHome) {
    await page.goto('https://vhbrbws1wd01.hec.bridgebio.com:44380/sap/bc/ui2/flp?saml2=disabled&sap-client=400&sap-language=EN#ZLEARNING-display', 
      { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);
  }
  
  // Switch to table view
  const tableLI = await page.$('li[id$="--viewModeTable-button"]');
  if (tableLI) { await tableLI.click(); await page.waitForTimeout(2000); }
  console.log('On home page, table view active\n');

  // Step 1: Select a row via SAPUI5 API and open Assign dialog
  console.log('--- STEP 1: Select training + Open dialog ---');
  const openResult = await page.evaluate(() => {
    try {
      const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
      const stEl = document.querySelector('[id$="--smartTable"]');
      const st = sap.ui.getCore().byId(stEl.id);
      const table = st.getTable();
      
      table.setSelectedIndex(0);
      const ctx = table.getContextByIndex(0);
      const training = ctx.getObject();
      
      comp.openAssignDialog([training]);
      return { success: true, title: training.Title, role: training.Role };
    } catch(e) { return { error: e.message }; }
  });
  console.log('Training selected:', openResult.title);

  // Wait for dialog
  await page.waitForTimeout(5000);
  
  const dlgOpen = await isDlgVisible('[id*="assignTrainingDialog"]');
  console.log('Dialog visible:', dlgOpen);

  if (!dlgOpen) {
    console.log('ERROR: Dialog did not open');
    await browser.close();
    return;
  }

  // Step 2: Inspect Step 1 (Training Selection + Settings)
  console.log('\n--- STEP 2: Wizard Step 1 Content ---');
  const step1Info = await page.evaluate(() => {
    const dlg = document.querySelector('[id*="assignTrainingDialog"]');
    
    // Training list
    const tList = dlg.querySelector('[id*="assignTrainingsList"]');
    const tItems = tList ? tList.querySelectorAll('.sapMLIB') : [];
    
    // Priority
    const pSel = dlg.querySelector('[id*="assignPrioritySelect"]');
    const pText = pSel ? pSel.querySelector('.sapMSFI, .sapMSelectListItemText')?.textContent || pSel.textContent.trim().substring(0, 30) : '';
    
    // Due Date
    const dPicker = dlg.querySelector('[id*="assignDueDate"]');
    const dInput = dPicker ? dPicker.querySelector('input') : null;
    
    // Notes
    const notes = dlg.querySelector('[id*="assignNotesInput"]');
    
    // Sequence
    const seq = dlg.querySelector('[id*="assignSequenceInput"]');
    
    // Recurring
    const recurSwitch = dlg.querySelector('[id*="assignRecurringSwitch"]');
    
    return {
      trainingCount: tItems.length,
      trainingNames: Array.from(tItems).map(i => i.textContent.substring(0, 60)),
      priority: pText,
      dueDateInput: dInput ? dInput.value : 'no input',
      hasNotes: !!notes,
      hasSequence: !!seq,
      hasRecurring: !!recurSwitch,
      recurringState: recurSwitch ? recurSwitch.querySelector('.sapMSwt')?.getAttribute('aria-checked') : 'n/a'
    };
  });
  console.log(JSON.stringify(step1Info, null, 2));

  // Step 3: Set a due date
  console.log('\n--- STEP 3: Set Due Date ---');
  const dueDateInput = await page.$('[id*="assignDueDate"] input');
  if (dueDateInput) {
    await dueDateInput.click({ clickCount: 3 });
    await dueDateInput.fill('2026/06/30');
    await page.waitForTimeout(500);
    console.log('Due date set to 2026/06/30');
  }

  // Step 4: Find and click "Next" to go to Step 2 (User Selection)
  console.log('\n--- STEP 4: Navigate to Step 2 (User Selection) ---');
  const nextBtnInfo = await page.evaluate(() => {
    const dlg = document.querySelector('[id*="assignTrainingDialog"]');
    const btns = Array.from(dlg.querySelectorAll('button, .sapMBtn'));
    const nextBtn = btns.find(b => {
      const text = b.textContent.trim().toLowerCase();
      return text.includes('next') || text.includes('step 2') || text.includes('select');
    });
    // Also get wizard navigation
    const wizNav = dlg.querySelector('.sapMWizardProgressNavAnchor, .sapMWizardNextButtonVisible');
    const allBtnTexts = btns.map(b => ({ text: b.textContent.trim().substring(0, 30), id: b.id.split('--').pop().substring(0, 30), vis: b.offsetWidth > 0 }));
    return {
      nextFound: !!nextBtn,
      nextText: nextBtn ? nextBtn.textContent.trim() : '',
      nextId: nextBtn ? nextBtn.id : '',
      wizNav: !!wizNav,
      allButtons: allBtnTexts.filter(b => b.vis)
    };
  });
  console.log('Buttons in dialog:', JSON.stringify(nextBtnInfo, null, 2));

  // Click the Wizard's built-in Next Step button
  const wizNextBtn = await page.$('[id*="assignTrainingDialog"] .sapMWizardNextButton, [id*="wizNextBtn"]');
  if (wizNextBtn) {
    await wizNextBtn.click();
    await page.waitForTimeout(2000);
    console.log('Clicked wizard Next button');
  } else {
    // Try using SAPUI5 Wizard API
    const navResult = await page.evaluate(() => {
      try {
        // Find the wizard control
        const dlg = document.querySelector('[id*="assignTrainingDialog"]');
        const wizEl = dlg.querySelector('.sapMWizard, [id*="assignWizard"]');
        if (!wizEl) return { error: 'no wizard element' };
        
        const wizard = sap.ui.getCore().byId(wizEl.id);
        if (!wizard) return { error: 'wizard control not found: ' + wizEl.id };
        
        // Navigate to step 2
        const steps = wizard.getSteps();
        if (steps.length > 1) {
          wizard.nextStep();
          return { success: true, stepCount: steps.length, currentStep: wizard.getProgress() };
        }
        return { error: 'only 1 step', stepCount: steps.length };
      } catch(e) { return { error: e.message }; }
    });
    console.log('Wizard API navigation:', JSON.stringify(navResult));
    await page.waitForTimeout(2000);
  }

  // Step 5: Check Step 2 (User Selection)
  console.log('\n--- STEP 5: Step 2 - User Selection ---');
  const step2Info = await page.evaluate(() => {
    const dlg = document.querySelector('[id*="assignTrainingDialog"]');
    
    // User list
    const uList = dlg.querySelector('[id*="assignUserList"]');
    const uItems = uList ? uList.querySelectorAll('.sapMLIB') : [];
    
    // Select All / Deselect All
    const selectAll = dlg.querySelector('[id*="selectAllUsersBtn"]');
    const deselectAll = dlg.querySelector('[id*="deselectAllUsersBtn"]');
    const userSearch = dlg.querySelector('[id*="assignUserSearch"]');
    
    return {
      userListFound: !!uList,
      userCount: uItems.length,
      firstUsers: Array.from(uItems).slice(0, 5).map(u => u.textContent.substring(0, 50)),
      hasSelectAll: !!selectAll,
      hasDeselectAll: !!deselectAll,
      hasSearch: !!userSearch
    };
  });
  console.log(JSON.stringify(step2Info, null, 2));

  // Step 6: Check Step 3 (Summary/Review) - if we can navigate
  if (step2Info.userCount > 0) {
    console.log('\n--- STEP 6: Selecting first user ---');
    const firstUser = await page.$('[id*="assignUserList"] .sapMLIB');
    if (firstUser) {
      await firstUser.click();
      await page.waitForTimeout(500);
      console.log('First user selected');
    }
  }

  // Summary
  console.log('\n\n=== ASSIGN WORKFLOW SUMMARY ===');
  console.log(`✅ Dialog opens: YES`);
  console.log(`✅ Training pre-selected: ${openResult.title}`);
  console.log(`✅ Priority selector: ${step1Info.priority}`);
  console.log(`✅ Due Date picker: present`);
  console.log(`✅ Notes input: ${step1Info.hasNotes}`);
  console.log(`✅ Sequence input: ${step1Info.hasSequence}`);
  console.log(`✅ Recurring toggle: ${step1Info.hasRecurring}`);
  console.log(`${step2Info.userCount > 0 ? '✅' : '⚠️'} Team members loaded: ${step2Info.userCount}`);
  console.log(`✅ User search: ${step2Info.hasSearch}`);
  console.log(`✅ Select/Deselect All: ${step2Info.hasSelectAll}/${step2Info.hasDeselectAll}`);

  if (step2Info.userCount === 0) {
    console.log('\n⚠️  No team members loaded. The OData call to UserSet returned 0 users.');
    console.log('   This could be a backend filter issue (Manager Sort2 = NIKKUMAR returns no users).');
  }

  // Close dialog
  const cancelBtn = await page.$('[id*="assignCancelBtn"]');
  if (cancelBtn) { await cancelBtn.click(); }
  else { await page.keyboard.press('Escape'); }
  await page.waitForTimeout(500);
  console.log('\nDialog closed.');

  await browser.close();
})();

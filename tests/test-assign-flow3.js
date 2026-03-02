const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  // Find our component among all registered ones
  const compInfo = await page.evaluate(() => {
    try {
      const all = sap.ui.core.Component.registry.all();
      const keys = Object.keys(all);
      const results = keys.map(k => {
        const c = all[k];
        return {
          id: k.substring(0, 40),
          name: c.getMetadata().getName(),
          hasModel: !!c.getModel(),
          hasOpenAssign: typeof c.openAssignDialog === 'function',
          hasGetCurrentUserId: typeof c.getCurrentUserId === 'function'
        };
      });
      return { total: keys.length, components: results };
    } catch(e) { return { error: e.message }; }
  });
  console.log('All components:', JSON.stringify(compInfo, null, 2));

  // Find our component (has openAssignDialog)
  const ourComp = await page.evaluate(() => {
    const all = sap.ui.core.Component.registry.all();
    for (const [id, c] of Object.entries(all)) {
      if (typeof c.openAssignDialog === 'function') {
        return {
          id,
          name: c.getMetadata().getName(),
          role: c._role,
          userId: c.getCurrentUserId ? c.getCurrentUserId() : 'no method',
          hasModel: !!c.getModel(),
          modelType: c.getModel() ? c.getModel().getMetadata().getName() : 'none',
          userEntitySet: c._userEntitySet,
          assignEntitySet: c._assignmentEntitySet
        };
      }
    }
    // Also check by name
    for (const [id, c] of Object.entries(all)) {
      const name = c.getMetadata().getName();
      if (name.includes('courses') || name.includes('learning') || name.includes('sap.courses') || name.includes('z.sap')) {
        return { id, name, note: 'found by name but no openAssignDialog' };
      }
    }
    return { error: 'not found' };
  });
  console.log('\nOur component:', JSON.stringify(ourComp, null, 2));

  // Also check - get the controller/view owner component
  const viewComp = await page.evaluate(() => {
    // Find the TrainingsList view
    const trainingsPage = document.querySelector('[id$="--trainingsListPage"]');
    if (!trainingsPage) return { error: 'trainingsListPage not found' };
    
    // Get its SAPUI5 control
    const viewEl = trainingsPage.closest('[data-sap-ui]');
    if (!viewEl) return { viewId: trainingsPage.id };
    
    const viewId = viewEl.id;
    const view = sap.ui.getCore().byId(viewId);
    if (!view) return { viewId, error: 'view not found by id' };
    
    const controller = view.getController ? view.getController() : null;
    if (!controller) return { viewId, error: 'no controller' };
    
    const ownerComp = controller.getOwnerComponent ? controller.getOwnerComponent() : null;
    return {
      viewId: viewId.substring(0, 60),
      controllerName: controller.getMetadata().getName(),
      hasOwnerComp: !!ownerComp,
      ownerCompId: ownerComp ? ownerComp.getId() : 'none',
      ownerHasOpenAssign: ownerComp ? typeof ownerComp.openAssignDialog === 'function' : false,
      ownerHasModel: ownerComp ? !!ownerComp.getModel() : false,
      ownerRole: ownerComp ? ownerComp._role : 'none'
    };
  });
  console.log('\nView-based lookup:', JSON.stringify(viewComp, null, 2));

  // If we found the component, let's try calling openAssignDialog directly
  if (viewComp.ownerHasOpenAssign) {
    console.log('\n=== Attempting direct assign via SAPUI5 API ===');
    
    // Select first row and call openAssignDialog
    const assignResult = await page.evaluate(() => {
      try {
        const trainingsPage = document.querySelector('[id$="--trainingsListPage"]');
        const viewEl = trainingsPage.closest('[data-sap-ui]');
        const view = sap.ui.getCore().byId(viewEl.id);
        const controller = view.getController();
        const comp = controller.getOwnerComponent();

        // Get selected training data
        const smartTable = controller.byId('smartTable');
        const table = smartTable.getTable();
        
        // Ensure row 0 is selected
        table.setSelectedIndex(0);
        const indices = table.getSelectedIndices();
        if (indices.length === 0) return { error: 'No row selected' };
        
        const ctx = table.getContextByIndex(indices[0]);
        const training = ctx ? ctx.getObject() : null;
        if (!training) return { error: 'No context data' };
        
        // Call openAssignDialog
        comp.openAssignDialog([training]);
        return { success: true, training: training.Title, module: training.Module };
      } catch(e) { return { error: e.message, stack: e.stack ? e.stack.substring(0, 300) : '' }; }
    });
    console.log('Assign call result:', JSON.stringify(assignResult, null, 2));

    if (assignResult.success) {
      // Wait for UserSet OData call + dialog fragment loading
      await page.waitForTimeout(8000);

      const dlgFinal = await page.evaluate(() => {
        // Check for dialog
        const allDlg = document.querySelectorAll('.sapMDialog');
        const assignDlg = document.querySelector('[id*="assignTrainingDialog"]');
        const allOverlays = document.querySelectorAll('[role="dialog"]');
        
        // Also check for any popover/toast
        const toast = document.querySelector('.sapMMessageToast');
        const msgStrip = document.querySelector('.sapMMsgStrip');
        
        let dlgContent = null;
        if (assignDlg) {
          const steps = assignDlg.querySelectorAll('.sapMWizardStep');
          const items = assignDlg.querySelectorAll('.sapMLIB');
          dlgContent = {
            visible: assignDlg.offsetParent !== null,
            steps: steps.length,
            listItems: items.length,
            text: assignDlg.textContent.substring(0, 200)
          };
        }
        
        return {
          totalDialogs: allDlg.length,
          assignDlgFound: !!assignDlg,
          dlgContent,
          overlays: allOverlays.length,
          toast: toast ? toast.textContent : '',
          msgStrip: msgStrip ? msgStrip.textContent.substring(0, 100) : '',
          dlgIds: Array.from(allDlg).map(d => d.id.split('--').pop().substring(0, 40))
        };
      });
      console.log('\nDialog state after wait:', JSON.stringify(dlgFinal, null, 2));

      if (dlgFinal.assignDlgFound && dlgFinal.dlgContent && dlgFinal.dlgContent.visible) {
        console.log('\n✅ ASSIGN DIALOG OPENED SUCCESSFULLY!');
        
        // Close it
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
  }

  await browser.close();
})();

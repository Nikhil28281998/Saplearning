const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  // Check if the assign dialog is still in DOM from the previous test
  const state = await page.evaluate(() => {
    const dlg = document.querySelector('[id*="assignTrainingDialog"]');
    if (!dlg) return { inDom: false };
    
    const style = getComputedStyle(dlg);
    const parent = dlg.parentElement;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    
    // Check overlay/blocking layer
    const overlay = document.querySelector('.sapUiBLy');
    
    return {
      inDom: true,
      id: dlg.id.substring(0, 60),
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      position: style.position,
      zIndex: style.zIndex,
      top: style.top,
      left: style.left,
      width: style.width,
      height: style.height,
      offsetW: dlg.offsetWidth,
      offsetH: dlg.offsetHeight,
      parentTag: parent ? parent.tagName : '',
      parentDisplay: parentStyle ? parentStyle.display : '',
      parentClass: parent ? parent.className.substring(0, 80) : '',
      overlay: !!overlay,
      isOpen: dlg.getAttribute('aria-hidden'),
      role: dlg.getAttribute('role'),
      // Check if the Dialog control thinks it's open
      sapOpenClass: dlg.classList.contains('sapMDialogOpen'),
      sapBlockClass: document.querySelector('.sapUiBLy') !== null
    };
  });
  console.log('Dialog CSS state:', JSON.stringify(state, null, 2));

  // If dialog is there, try to screenshot it
  if (state.inDom && state.offsetW > 0) {
    console.log('\nDialog has dimensions — it might actually be visible!');
    
    // Get full dialog content
    const content = await page.evaluate(() => {
      const dlg = document.querySelector('[id*="assignTrainingDialog"]');
      
      // Get all wizard step content
      const steps = dlg.querySelectorAll('.sapMWizardStep');
      const stepInfo = Array.from(steps).map((s, i) => ({
        index: i,
        id: s.id.split('--').pop().substring(0, 30),
        visible: s.offsetParent !== null,
        text: s.textContent.substring(0, 100)
      }));
      
      // Get specific controls
      const trainingItems = dlg.querySelectorAll('[id*="assignTrainingsList"] .sapMLIB, [id*="assignTrainingsList"] li');
      const userItems = dlg.querySelectorAll('[id*="assignUserList"] .sapMLIB');
      const prioritySel = dlg.querySelector('[id*="assignPrioritySelect"]');
      const dueDatePicker = dlg.querySelector('[id*="assignDueDate"]');
      const notesInput = dlg.querySelector('[id*="assignNotesInput"]');
      const seqInput = dlg.querySelector('[id*="assignSequenceInput"]');
      const recurSwitch = dlg.querySelector('[id*="assignRecurringSwitch"]');
      
      // Get all visible buttons
      const buttons = Array.from(dlg.querySelectorAll('button, .sapMBtn'))
        .filter(b => b.offsetParent !== null)
        .map(b => ({ text: b.textContent.trim().substring(0, 30), id: b.id.split('--').pop().substring(0, 30) }));
      
      // Get the dialog title
      const titleEl = dlg.querySelector('.sapMDialogTitle, .sapMTitle');
      
      return {
        title: titleEl ? titleEl.textContent.trim() : '',
        steps: stepInfo,
        trainings: Array.from(trainingItems).map(t => t.textContent.substring(0, 60)),
        userCount: userItems.length,
        priority: prioritySel ? { found: true, selectedText: prioritySel.textContent.substring(0, 30) } : { found: false },
        dueDate: !!dueDatePicker,
        notes: !!notesInput,
        sequence: !!seqInput,
        recurring: !!recurSwitch,
        visibleButtons: buttons
      };
    });
    console.log('\nDialog content:', JSON.stringify(content, null, 2));
  }

  // Clean up - close dialog if open
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  
  const afterClose = await page.evaluate(() => {
    return !document.querySelector('[id*="assignTrainingDialog"]');
  });
  console.log('\nDialog closed:', afterClose);

  await browser.close();
})();

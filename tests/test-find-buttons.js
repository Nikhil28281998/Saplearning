const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  // Find all buttons in the assign dialog
  const dlgBtns = await page.evaluate(() => {
    const dlg = document.querySelector('[id*="assignTrainingDialog"]');
    if (!dlg) return { error: 'dialog not in DOM' };
    
    // Get all buttons anywhere inside or associated with the dialog
    // Dialog footer is a separate DOM area
    const parent = dlg.parentElement;
    const footer = dlg.querySelector('.sapMDialogFooter, footer, [id*="footer"]');
    
    // Get all button-like elements in and around the dialog
    const allBtns = document.querySelectorAll('button, .sapMBtn, .sapMBtnBase');
    const dialogRect = dlg.getBoundingClientRect();
    
    // Also search for buttons by ID pattern
    const idBtns = document.querySelectorAll('[id*="assignNext"], [id*="assignBack"], [id*="assignCancel"], [id*="NextBtn"], [id*="BackBtn"], [id*="CancelBtn"]');
    
    // Check Dialog SAPUI5 control
    const dlgControl = sap.ui.getCore().byId(dlg.id || 'assignTrainingDialog');
    let controlBtns = null;
    if (dlgControl) {
      const beginBtn = dlgControl.getBeginButton();
      const endBtn = dlgControl.getEndButton();
      const buttons = dlgControl.getButtons();
      controlBtns = {
        beginBtn: beginBtn ? { id: beginBtn.getId(), text: beginBtn.getText(), visible: beginBtn.getVisible() } : null,
        endBtn: endBtn ? { id: endBtn.getId(), text: endBtn.getText(), visible: endBtn.getVisible() } : null,
        buttons: buttons.map(b => ({ id: b.getId(), text: b.getText(), visible: b.getVisible() }))
      };
    }
    
    return {
      idBtns: Array.from(idBtns).map(b => ({ id: b.id, text: b.textContent?.substring(0, 30), vis: b.offsetWidth > 0 })),
      controlBtns,
      hasFooter: !!footer,
      footerHtml: footer ? footer.innerHTML.substring(0, 200) : ''
    };
  });
  console.log('Dialog buttons:', JSON.stringify(dlgBtns, null, 2));

  await browser.close();
})();

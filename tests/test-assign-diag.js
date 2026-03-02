const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== DIAGNOSTIC: Why 312 users? Why no buttons visible? ===\n');

  // 1. Check component state
  const compState = await page.evaluate(() => {
    const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
    return {
      role: comp._role,
      userId: comp.getCurrentUserId(),
      userManagerProperty: comp._userManagerProperty,
      userEntitySet: comp._userEntitySet,
      assignmentEntitySet: comp._assignmentEntitySet
    };
  });
  console.log('1. Component state:', JSON.stringify(compState, null, 2));

  // 2. Check what filter is actually being sent
  console.log('\n2. Testing OData UserSet read with filter...');
  const userData = await page.evaluate(() => {
    return new Promise((resolve) => {
      const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
      const oModel = comp.getModel();
      const sManagerProp = comp._userManagerProperty || 'Sort2';
      const sUserId = comp.getCurrentUserId();
      
      // Read WITH filter
      oModel.read('/UserSet', {
        filters: [new sap.ui.model.Filter(sManagerProp, sap.ui.model.FilterOperator.EQ, sUserId)],
        success: (data) => resolve({
          filterApplied: `${sManagerProp} eq '${sUserId}'`,
          count: data.results.length,
          first3: data.results.slice(0, 3).map(u => ({
            UserId: u.UserId, FirstName: u.FirstName, LastName: u.LastName, Sort2: u.Sort2, Manager: u.Manager
          }))
        }),
        error: (err) => resolve({ err: err.message })
      });
    });
  });
  console.log('   With filter:', JSON.stringify(userData, null, 2));

  // 3. Read WITHOUT filter for comparison
  const unfiltered = await page.evaluate(() => {
    return new Promise((resolve) => {
      const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
      const oModel = comp.getModel();
      oModel.read('/UserSet', {
        urlParameters: { "$top": "5" },
        success: (data) => resolve({
          count: data.results.length,
          first3: data.results.slice(0, 3).map(u => ({
            UserId: u.UserId, FirstName: u.FirstName, LastName: u.LastName, 
            Sort2: u.Sort2, Manager: u.Manager, ManagerId: u.ManagerId
          }))
        }),
        error: (err) => resolve({ err: err.message })
      });
    });
  });
  console.log('\n3. Without filter (top 5):', JSON.stringify(unfiltered, null, 2));

  // 4. Check the $metadata for the User entity type - what properties exist?
  const metaFields = await page.evaluate(() => {
    const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
    const oModel = comp.getModel();
    try {
      const meta = oModel.getServiceMetadata();
      const schemas = meta.dataServices.schema || [];
      for (var s = 0; s < schemas.length; s++) {
        var types = schemas[s].entityType || [];
        for (var t = 0; t < types.length; t++) {
          if (types[t].name === 'User' || types[t].name.indexOf('User') >= 0 && types[t].name.indexOf('Context') < 0) {
            return {
              entityTypeName: types[t].name,
              properties: (types[t].property || []).map(p => p.name)
            };
          }
        }
      }
    } catch(e) { return { error: e.message }; }
    return { error: 'User entity type not found' };
  });
  console.log('\n4. User entity type properties:', JSON.stringify(metaFields, null, 2));

  // 5. Now open dialog and check button visibility in the DOM
  console.log('\n5. Opening assign dialog to check buttons...');
  await page.evaluate(() => {
    const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
    const stEl = document.querySelector('[id$="--smartTable"]');
    const st = sap.ui.getCore().byId(stEl.id);
    const table = st.getTable();
    table.setSelectedIndex(0);
    const ctx = table.getContextByIndex(0);
    comp.openAssignDialog([ctx.getObject()]);
  });
  await page.waitForTimeout(4000);

  const btnVisibility = await page.evaluate(() => {
    const dlg = sap.ui.getCore().byId('assignTrainingDialog');
    if (!dlg) return { error: 'dialog not found' };
    
    const dlgDom = dlg.getDomRef();
    if (!dlgDom) return { error: 'dialog has no DOM' };
    
    // Check footer area
    const footer = dlgDom.querySelector('.sapMDialogFooter, .sapMBar.sapMFooter-CTX');
    const allBtns = dlgDom.querySelectorAll('button.sapMBtn, .sapMBtnInner');
    
    // Get specific buttons
    const begin = dlg.getBeginButton();
    const end = dlg.getEndButton();
    const extra = dlg.getButtons();
    
    const btnDetails = [];
    if (begin) {
      const dom = begin.getDomRef();
      btnDetails.push({
        name: 'Next/Assign (beginButton)',
        id: begin.getId(),
        text: begin.getText(),
        hasDom: !!dom,
        domDisplay: dom ? window.getComputedStyle(dom).display : 'no-dom',
        domVisibility: dom ? window.getComputedStyle(dom).visibility : 'no-dom',
        domWidth: dom ? dom.offsetWidth : 0,
        domHeight: dom ? dom.offsetHeight : 0
      });
    }
    if (end) {
      const dom = end.getDomRef();
      btnDetails.push({
        name: 'Cancel (endButton)',
        id: end.getId(),
        text: end.getText(),
        hasDom: !!dom,
        domDisplay: dom ? window.getComputedStyle(dom).display : 'no-dom',
        domVisibility: dom ? window.getComputedStyle(dom).visibility : 'no-dom',
        domWidth: dom ? dom.offsetWidth : 0,
        domHeight: dom ? dom.offsetHeight : 0
      });
    }
    extra.forEach((b, i) => {
      const dom = b.getDomRef();
      btnDetails.push({
        name: 'Back (button[' + i + '])',
        id: b.getId(),
        text: b.getText(),
        uiVisible: b.getVisible(),
        hasDom: !!dom,
        domDisplay: dom ? window.getComputedStyle(dom).display : 'no-dom',
        domVisibility: dom ? window.getComputedStyle(dom).visibility : 'no-dom',
        domWidth: dom ? dom.offsetWidth : 0,
        domHeight: dom ? dom.offsetHeight : 0
      });
    });

    // Check if footer bar exists and its dimensions
    const footerBar = dlgDom.querySelector('.sapMDialogFooter');
    const footerInfo = footerBar ? {
      exists: true,
      display: window.getComputedStyle(footerBar).display,
      visibility: window.getComputedStyle(footerBar).visibility,
      height: footerBar.offsetHeight,
      overflow: window.getComputedStyle(footerBar).overflow,
      html: footerBar.innerHTML.substring(0, 500)
    } : { exists: false };

    // Dialog dimensions
    return {
      dlgHeight: dlgDom.offsetHeight,
      dlgWidth: dlgDom.offsetWidth,
      dlgContentHeight: dlg.getContentHeight(),
      dlgContentWidth: dlg.getContentWidth(),
      dlgVerticalScrolling: dlg.getVerticalScrolling(),
      totalDomButtons: allBtns.length,
      footer: footerInfo,
      buttons: btnDetails
    };
  });
  console.log('   Button visibility:', JSON.stringify(btnVisibility, null, 2));

  // 6. Check dialog container scroll and overflow
  const scrollInfo = await page.evaluate(() => {
    const dlg = document.getElementById('assignTrainingDialog');
    if (!dlg) return { error: 'no dialog dom' };
    
    const section = dlg.querySelector('.sapMDialogSection');
    const scroll = dlg.querySelector('.sapMDialogScroll');
    
    return {
      dlgScrollTop: dlg.scrollTop,
      dlgScrollHeight: dlg.scrollHeight,
      dlgClientHeight: dlg.clientHeight,
      dlgOverflow: window.getComputedStyle(dlg).overflow,
      sectionHeight: section ? section.offsetHeight : 'none',
      sectionOverflow: section ? window.getComputedStyle(section).overflow : 'none',
      scrollHeight: scroll ? scroll.offsetHeight : 'none',
      scrollOverflow: scroll ? window.getComputedStyle(scroll).overflow : 'none',
    };
  });
  console.log('\n6. Scroll/overflow info:', JSON.stringify(scrollInfo, null, 2));

  // Close
  await page.evaluate(() => {
    const dlg = sap.ui.getCore().byId('assignTrainingDialog');
    if (dlg) dlg.close();
  });
  await page.waitForTimeout(500);

  await browser.close();
})();

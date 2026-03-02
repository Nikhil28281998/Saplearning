const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== VERIFY FIX: Buttons + User Filtering ===\n');

  // STEP 1: Patch Fragment.load to fix the button aggregation issue at runtime
  console.log('1. Applying runtime fix for button rendering...');
  await page.evaluate(() => {
    // Store reference to move buttons after dialog opens
    const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
    const origOpen = comp._openAssignFragment.bind(comp);
    
    comp._openAssignFragment = function(trainings, users, workloadData) {
      var that = this;
      
      // Call original implementation
      var that2 = comp;
      // We'll patch after dialog opens — hook into the Fragment.load().then
      // Instead, let's directly re-implement with the fix
      var Fragment = sap.ui.require('sap/ui/core/Fragment');
      var JSONModel = sap.ui.require('sap/ui/model/json/JSONModel');
      var Log = sap.ui.require('sap/base/Log');
      var MessageToast = sap.ui.require('sap/m/MessageToast');

      // B1: Build workload map per user
      var mWorkload = {};
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      (workloadData || []).forEach(function (a) {
        var uid = (a.UserId || a.userId || '').toUpperCase();
        if (!mWorkload[uid]) { mWorkload[uid] = { total: 0, completed: 0, overdue: 0 }; }
        mWorkload[uid].total++;
        var st = a.Status || a.status || '';
        if (st === 'Completed') { mWorkload[uid].completed++; }
        if (st !== 'Completed' && a.DueDate) {
          var due = new Date(a.DueDate);
          if (due < today) { mWorkload[uid].overdue++; }
        }
      });

      var aTrainingRoles = [];
      trainings.forEach(function (tr) {
        var r = (tr.Role || '').toLowerCase();
        if (r) { aTrainingRoles.push(r); }
      });

      users.forEach(function (u) {
        var uid = (u.UserId || '').toUpperCase();
        var wl = mWorkload[uid] || { total: 0, completed: 0, overdue: 0 };
        u.workloadTotal = wl.total;
        u.workloadCompleted = wl.completed;
        u.workloadOverdue = wl.overdue;
        u.duplicateCount = 0;
        var userRole = (u.Role || '').toLowerCase();
        u.roleRelevance = aTrainingRoles.some(function (r) {
          return r.indexOf(userRole) >= 0 || userRole.indexOf(r) >= 0;
        }) ? 'match' : 'none';
      });

      users.sort(function (a, b) {
        if (a.roleRelevance === 'match' && b.roleRelevance !== 'match') return -1;
        if (b.roleRelevance === 'match' && a.roleRelevance !== 'match') return 1;
        return a.workloadTotal - b.workloadTotal;
      });

      trainings.forEach(function (tr) { tr.duplicateCount = 0; });

      var oDefaultDue = new Date();
      oDefaultDue.setDate(oDefaultDue.getDate() + 14);
      var sDefaultDue = oDefaultDue.getFullYear() + '-' +
        String(oDefaultDue.getMonth() + 1).padStart(2, '0') + '-' +
        String(oDefaultDue.getDate()).padStart(2, '0');

      that2._assignModel = new JSONModel({
        trainings: trainings,
        users: users,
        filteredUsers: users.slice(),
        selectedUserKeys: [],
        selectedUsersDetail: [],
        dueDate: sDefaultDue,
        priority: 'Medium',
        notes: '',
        sequence: '',
        recurring: false,
        recurringInterval: 'monthly',
        maxRecurrences: 0,
        submitting: false,
        error: '',
        wizardStep: 1,
        duplicateWarning: '',
        _workloadData: workloadData || []
      });
      that2._assignModel.setSizeLimit(10000);

      Fragment.load({
        name: "z.sap.courses.fragments.AssignDialog",
        controller: that2
      }).then(function (oDialog) {
        that2._assignDlg = oDialog;
        
        // ===== FIX: Move beginButton and endButton into buttons aggregation =====
        var oBegin = oDialog.getBeginButton();
        var oEnd = oDialog.getEndButton();
        if (oBegin) {
          oDialog.setBeginButton(null);
          oDialog.insertButton(oBegin, oDialog.getButtons().length);
        }
        if (oEnd) {
          oDialog.setEndButton(null);
          oDialog.addButton(oEnd);
        }
        // ===== END FIX =====
        
        oDialog.setModel(that2._assignModel, "assignModel");
        oDialog.setModel(that2.getModel("i18n"), "i18n");
        oDialog.setModel(that2._userModel, "user");
        oDialog.addStyleClass("assignTrainingDialog");
        if (sap.ui.Device.system.phone) { oDialog.setStretch(true); }
        oDialog.attachAfterClose(function () {
          oDialog.destroy();
          that2._assignDlg = null;
        });
        oDialog.open();
      });
    };
    return 'patched';
  });
  console.log('   Runtime fix applied\n');

  // STEP 2: Open dialog
  console.log('2. Opening assign dialog...');
  await page.evaluate(() => {
    const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
    const stEl = document.querySelector('[id$="--smartTable"]');
    const st = sap.ui.getCore().byId(stEl.id);
    const table = st.getTable();
    table.setSelectedIndex(0);
    const ctx = table.getContextByIndex(0);
    comp.openAssignDialog([ctx.getObject()]);
  });
  await page.waitForTimeout(5000);

  // STEP 3: Check buttons are now visible
  const result = await page.evaluate(() => {
    const dlg = sap.ui.getCore().byId('assignTrainingDialog');
    if (!dlg) return { error: 'dialog not found' };
    
    const footer = dlg.getDomRef().querySelector('.sapMDialogFooter');
    const allBtns = dlg.getButtons();
    const beginBtn = dlg.getBeginButton();
    const endBtn = dlg.getEndButton();
    
    const btnResults = [];
    allBtns.forEach(b => {
      const dom = b.getDomRef();
      btnResults.push({
        id: b.getId(),
        text: b.getText(),
        hasDom: !!dom,
        visible: b.getVisible(),
        width: dom ? dom.offsetWidth : 0,
        height: dom ? dom.offsetHeight : 0
      });
    });
    
    const model = dlg.getModel('assignModel');
    return {
      wizardStep: model.getProperty('/wizardStep'),
      usersCount: (model.getProperty('/users') || []).length,
      beginButton: beginBtn ? { id: beginBtn.getId(), hasDom: !!beginBtn.getDomRef() } : 'none (moved to buttons)',
      endButton: endBtn ? { id: endBtn.getId(), hasDom: !!endBtn.getDomRef() } : 'none (moved to buttons)',
      buttonsAggregation: btnResults,
      footerHeight: footer ? footer.offsetHeight : 0
    };
  });
  console.log('3. Button check:', JSON.stringify(result, null, 2));

  // STEP 4: Try clicking Next
  if (result.buttonsAggregation.some(b => b.text === 'Next' && b.hasDom)) {
    console.log('\n4. Clicking Next button...');
    const nextClick = await page.evaluate(() => {
      const dlg = sap.ui.getCore().byId('assignTrainingDialog');
      const nextBtn = dlg.getButtons().find(b => b.getText() === 'Next' || b.getId() === 'assignNextBtn');
      if (nextBtn && nextBtn.getDomRef()) {
        nextBtn.firePress();
        return { success: true, text: nextBtn.getText() };
      }
      return { error: 'button not clickable' };
    });
    console.log('   Result:', JSON.stringify(nextClick));
    await page.waitForTimeout(1000);

    const step2State = await page.evaluate(() => {
      const dlg = sap.ui.getCore().byId('assignTrainingDialog');
      const model = dlg.getModel('assignModel');
      const btns = dlg.getButtons().map(b => ({
        id: b.getId(), text: b.getText(), visible: b.getVisible(), hasDom: !!b.getDomRef()
      }));
      return {
        wizardStep: model.getProperty('/wizardStep'),
        users: (model.getProperty('/users') || []).length,
        buttons: btns
      };
    });
    console.log('\n5. Step 2 state:', JSON.stringify(step2State, null, 2));
  }

  // Close
  await page.evaluate(() => {
    const dlg = sap.ui.getCore().byId('assignTrainingDialog');
    if (dlg) dlg.close();
  });
  await page.waitForTimeout(500);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║              FIX VERIFICATION RESULTS                ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  const btnsOk = result.buttonsAggregation.filter(b => b.hasDom && b.width > 0);
  console.log(`║ Buttons with DOM:  ${btnsOk.length} / ${result.buttonsAggregation.length} ` + (btnsOk.length >= 2 ? '✅' : '❌') + '                    ║');
  btnsOk.forEach(b => console.log(`║   → ${b.text} (${b.width}x${b.height}px)                       ║`.substring(0, 55) + '║'));
  console.log(`║ Users loaded:      ${result.usersCount}                         ║`);
  console.log('╚══════════════════════════════════════════════════════╝');

  await browser.close();
})();

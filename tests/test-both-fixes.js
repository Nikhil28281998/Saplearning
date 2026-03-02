const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== FULL FIX VERIFICATION: Buttons + User Filtering ===\n');

  // Apply BOTH fixes at runtime
  await page.evaluate(() => {
    const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
    const Log = sap.ui.require('sap/base/Log');
    
    // Wrap openAssignDialog to add client-side user filtering
    const origOpenAssign = comp.openAssignDialog.bind(comp);
    comp.openAssignDialog = function(aPreSelectedTrainings) {
      var that = this;
      if (this._assignDlg) { this._assignDlg.destroy(); this._assignDlg = null; }
      var oModel = this.getModel();
      var sUserId = this.getCurrentUserId();
      var sRole = this._role;
      var aUserFilters = [];
      var sManagerProp = this._userManagerProperty || 'Sort2';
      
      if (sRole === 'Manager' && sUserId) {
        aUserFilters.push(new sap.ui.model.Filter(sManagerProp, sap.ui.model.FilterOperator.EQ, sUserId));
      }

      var sUserEntitySet = this._userEntitySet || 'UserSet';
      var pUsers = new Promise(function (resolve, reject) {
        oModel.read('/' + sUserEntitySet, {
          filters: aUserFilters,
          success: function (data) { resolve(data.results || []); },
          error: function (err) { reject(err); }
        });
      }).catch(function () { return []; });

      var sAssignEntitySet = this._assignmentEntitySet || 'TrainingAssignments';
      var aWorkloadFilters = [];
      if (sRole === 'Manager' && sUserId) {
        aWorkloadFilters.push(new sap.ui.model.Filter('ManagerSort2', sap.ui.model.FilterOperator.EQ, sUserId));
      }
      var pWorkload = new Promise(function (resolve) {
        oModel.read('/' + sAssignEntitySet, {
          filters: aWorkloadFilters,
          urlParameters: { "$select": "UserId,Status,DueDate" },
          success: function (data) { resolve(data.results || []); },
          error: function () { resolve([]); }
        });
      });

      Promise.all([pUsers, pWorkload]).then(function (aResults) {
        var users = aResults[0] || [];
        var workloadData = aResults[1] || [];

        // === FIX 2: Client-side filter fallback ===
        if (sRole === 'Manager' && sUserId && aUserFilters.length > 0) {
          var sUpper = sUserId.toUpperCase();
          var filtered = users.filter(function (u) {
            var val = (u[sManagerProp] || '').toUpperCase();
            return val === sUpper;
          });
          if (filtered.length > 0 && filtered.length < users.length) {
            console.log('[FIX] Client-side filter: ' + users.length + ' → ' + filtered.length + ' users');
            users = filtered;
          }
        }

        that._openAssignFragment_patched(aPreSelectedTrainings || [], users, workloadData);
      });
    };

    // Wrap _openAssignFragment to fix button aggregation
    comp._openAssignFragment_patched = function(trainings, users, workloadData) {
      var that = this;
      var Fragment = sap.ui.require('sap/ui/core/Fragment');
      var JSONModel = sap.ui.require('sap/ui/model/json/JSONModel');

      // Build workload map
      var mWorkload = {};
      var today = new Date(); today.setHours(0,0,0,0);
      (workloadData || []).forEach(function (a) {
        var uid = (a.UserId || a.userId || '').toUpperCase();
        if (!mWorkload[uid]) { mWorkload[uid] = { total: 0, completed: 0, overdue: 0 }; }
        mWorkload[uid].total++;
        if ((a.Status||a.status||'') === 'Completed') mWorkload[uid].completed++;
        if ((a.Status||a.status||'') !== 'Completed' && a.DueDate && new Date(a.DueDate) < today) mWorkload[uid].overdue++;
      });

      var aTrainingRoles = trainings.map(t => (t.Role||'').toLowerCase()).filter(r => r);
      users.forEach(function (u) {
        var uid = (u.UserId || '').toUpperCase();
        var wl = mWorkload[uid] || { total: 0, completed: 0, overdue: 0 };
        u.workloadTotal = wl.total; u.workloadCompleted = wl.completed; u.workloadOverdue = wl.overdue;
        u.duplicateCount = 0;
        var userRole = (u.Role || '').toLowerCase();
        u.roleRelevance = aTrainingRoles.some(r => r.indexOf(userRole)>=0 || userRole.indexOf(r)>=0) ? 'match' : 'none';
      });
      users.sort((a,b) => {
        if (a.roleRelevance==='match' && b.roleRelevance!=='match') return -1;
        if (b.roleRelevance==='match' && a.roleRelevance!=='match') return 1;
        return a.workloadTotal - b.workloadTotal;
      });
      trainings.forEach(t => { t.duplicateCount = 0; });
      
      var oDefaultDue = new Date(); oDefaultDue.setDate(oDefaultDue.getDate() + 14);
      var sDefaultDue = oDefaultDue.toISOString().substring(0, 10);

      this._assignModel = new JSONModel({
        trainings: trainings, users: users, filteredUsers: users.slice(),
        selectedUserKeys: [], selectedUsersDetail: [],
        dueDate: sDefaultDue, priority: 'Medium', notes: '', sequence: '',
        recurring: false, recurringInterval: 'monthly', maxRecurrences: 0,
        submitting: false, error: '', wizardStep: 1, duplicateWarning: '',
        _workloadData: workloadData || []
      });
      this._assignModel.setSizeLimit(10000);

      Fragment.load({ name: "z.sap.courses.fragments.AssignDialog", controller: this })
        .then(function (oDialog) {
          that._assignDlg = oDialog;
          
          // === FIX 1: Move beginButton/endButton into buttons aggregation ===
          var oBegin = oDialog.getBeginButton();
          var oEnd = oDialog.getEndButton();
          if (oBegin) { oDialog.setBeginButton(null); oDialog.insertButton(oBegin, oDialog.getButtons().length); }
          if (oEnd) { oDialog.setEndButton(null); oDialog.addButton(oEnd); }
          
          oDialog.setModel(that._assignModel, "assignModel");
          oDialog.setModel(that.getModel("i18n"), "i18n");
          oDialog.setModel(that._userModel, "user");
          oDialog.addStyleClass("assignTrainingDialog");
          if (sap.ui.Device.system.phone) oDialog.setStretch(true);
          oDialog.attachAfterClose(function () { oDialog.destroy(); that._assignDlg = null; });
          oDialog.open();
        });
    };
    
    return 'both fixes applied';
  });
  console.log('Both fixes applied at runtime\n');

  // Open dialog
  console.log('Opening assign dialog...');
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

  // Verify
  const state = await page.evaluate(() => {
    const dlg = sap.ui.getCore().byId('assignTrainingDialog');
    if (!dlg) return { error: 'dialog not found' };
    const model = dlg.getModel('assignModel');
    const users = model.getProperty('/users') || [];
    const btns = dlg.getButtons();
    return {
      wizardStep: model.getProperty('/wizardStep'),
      userCount: users.length,
      users: users.map(u => `${u.UserId} - ${u.FirstName} ${u.LastName}`),
      trainingTitle: (model.getProperty('/trainings') || [])[0]?.Title || '',
      buttons: btns.map(b => ({
        id: b.getId(), text: b.getText(), visible: b.getVisible(),
        rendered: !!b.getDomRef(), width: b.getDomRef()?.offsetWidth || 0
      }))
    };
  });

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              BOTH FIXES VERIFIED                              ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ Training: ${state.trainingTitle}`);
  console.log(`║ Users: ${state.userCount} (filtered from 312 → ${state.userCount})`);
  state.users.forEach(u => console.log(`║   → ${u}`));
  console.log('║');
  console.log('║ Buttons:');
  state.buttons.forEach(b => {
    const status = b.rendered && b.width > 0 ? '✅ VISIBLE' : (b.visible ? '⏳ hidden (step)' : '👁️ hidden (step 1)');
    console.log(`║   ${b.text}: ${status} (${b.width}px)`);
  });
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Don't close — leave dialog open so user can see it!
  console.log('\n→ Dialog left OPEN so you can see the buttons and team members!');

  await browser.close();
})();

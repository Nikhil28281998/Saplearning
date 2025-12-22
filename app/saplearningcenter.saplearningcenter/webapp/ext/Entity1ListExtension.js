sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension"
], function (ControllerExtension) {
  "use strict";

  return ControllerExtension.extend("saplearningcenter.saplearningcenter.ext.Entity1ListExtension", {
    override: {
      onInit: function () {
        try {
          var appComp = (this.base && this.base.getAppComponent) ? this.base.getAppComponent() : null;
          var api = (this.base && this.base.getExtensionAPI) ? this.base.getExtensionAPI() : null;
          var role = (appComp && appComp._role) || "Manager";
          var canHeader = !!(api && api.addHeaderAction);
          // Only attach actions on Entity1 ListReport
          var view = (this.base && this.base.getView) ? this.base.getView() : null;
          var vd = view && view.getViewData ? view.getViewData() : null;
          var entitySet = vd && vd.entitySet;
          if (entitySet && entitySet !== "Trainings") { return; }

        // Add header action: Trainings (text-only)
        if (canHeader) api.addHeaderAction({
          id: "TrainingAssignmentsNav",
          text: "Trainings",
          press: function () {
            if (appComp && appComp.navigateToTraining) {
              appComp.navigateToTraining();
            }
          }
        });

        // Also add a Trainings button into the results (table) toolbar
        (function injectToolbarBtn(){
          try{
            var view = (this.base && this.base.getView) ? this.base.getView() : null;
            // find first OverflowToolbar in LR view (table toolbar)
            var tbars = view && view.findAggregatedObjects && view.findAggregatedObjects(true, function(o){ return o && o.getMetadata && o.getMetadata().getName() === 'sap.m.OverflowToolbar'; });
            var tbar = (tbars && tbars.length) ? tbars[0] : null;
            if (!tbar || !tbar.insertContent) { setTimeout(injectToolbarBtn.bind(this), 400); return; }
            var btn = new sap.m.Button({ text: 'Trainings', press: function(){ if (appComp && appComp.navigateToTraining) { appComp.navigateToTraining(); } } });
            // place near the beginning to appear left of settings/export
            try { tbar.insertContent(btn, 0); } catch(_) { tbar.addContent(btn); }
          }catch(_){ setTimeout(injectToolbarBtn.bind(this), 400); }
        }).call(this);

        // Fallback for MDC Table toolbar (sap.ui.mdc.ActionToolbar)
        (function injectMdcActionToolbar(){
          try{
            var view = (this.base && this.base.getView) ? this.base.getView() : null;
            var atbars = view && view.findAggregatedObjects && view.findAggregatedObjects(true, function(o){ return o && o.getMetadata && o.getMetadata().getName() === 'sap.ui.mdc.ActionToolbar'; });
            var at = (atbars && atbars.length) ? atbars[0] : null;
            if (!at || !at.insertContent) { setTimeout(injectMdcActionToolbar.bind(this), 400); return; }
            var btn = new sap.m.Button({ text: 'Trainings', type: 'Transparent', press: function(){ if (appComp && appComp.navigateToTraining) { appComp.navigateToTraining(); } } });
            try { at.insertContent(btn, 0); } catch(_) { at.addContent(btn); }
          }catch(_){ setTimeout(injectMdcActionToolbar.bind(this), 400); }
        }).call(this);

        // Manager/Admin Assign action: navigate and trigger Create on TrainingAssignments LR
        if (role === "Manager" || role === "Admin") {
          if (canHeader) api.addHeaderAction({
            id: "TrainingAssignCreate",
            text: "Assign",
            icon: "sap-icon://add-document",
            press: function () {
              if (appComp && appComp.openAssignDialog) {
                appComp.openAssignDialog();
              } else if (appComp && appComp.openTrainingAssignmentsAndCreate) {
                appComp.openTrainingAssignmentsAndCreate();
              } else if (appComp && appComp.navigateToTraining) {
                appComp.navigateToTraining();
              }
            }
          });
        }

        // Admin-only: navigate to Users management
        if (role === "Admin") {
          if (canHeader) api.addHeaderAction({
            id: "UsersNav",
            text: "Users",
            press: function () {
              var r = appComp && appComp.getRouter && appComp.getRouter();
              if (r && r.navTo) { r.navTo('UsersList'); }
            }
          });
        }

        // Preview role switchers: always available to quickly test roles
        if (canHeader) {
          api.addHeaderAction({
            id: "RoleAdmin",
            text: "Role: Admin",
            press: function(){ if(appComp){ appComp._role='Admin'; try{ localStorage.setItem('saplc-role','Admin'); }catch(_){} appComp._applyRoleUI && appComp._applyRoleUI(); } }
          });
          api.addHeaderAction({
            id: "RoleManager",
            text: "Role: Manager",
            press: function(){ if(appComp){ appComp._role='Manager'; try{ localStorage.setItem('saplc-role','Manager'); }catch(_){} appComp._applyRoleUI && appComp._applyRoleUI(); } }
          });
          api.addHeaderAction({
            id: "RoleUser",
            text: "Role: User",
            press: function(){ if(appComp){ appComp._role='User'; try{ localStorage.setItem('saplc-role','User'); }catch(_){} appComp._applyRoleUI && appComp._applyRoleUI(); } }
          });
        }
        } catch(e) {
          // fail-safe: do not block boot if extension wiring fails
          try { jQuery.sap.log.error('Header extension failed to init: ' + (e && e.message)); } catch(_) {}
        }
      }
    }
  });
});

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
          if (!api || !api.addHeaderAction) { return; }
          // Only attach actions on Entity1 ListReport
          var view = (this.base && this.base.getView) ? this.base.getView() : null;
          var vd = view && view.getViewData ? view.getViewData() : null;
          var entitySet = vd && vd.entitySet;
          if (entitySet && entitySet !== "Entity1") { return; }

        // Add header action: Trainings (text-only)
        api.addHeaderAction({
          id: "TrainingAssignmentsNav",
          text: "Trainings",
          press: function () {
            if (appComp && appComp.navigateToTraining) {
              appComp.navigateToTraining();
            }
          }
        });

        // Manager/Admin Assign action: navigate and trigger Create on TrainingAssignments LR
        if (role === "Manager" || role === "Admin") {
          api.addHeaderAction({
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
          api.addHeaderAction({
            id: "UsersNav",
            text: "Users",
            press: function () {
              var r = appComp && appComp.getRouter && appComp.getRouter();
              if (r && r.navTo) { r.navTo('UsersList'); }
            }
          });
          // Admin-only: quick role switcher for BAS preview (client-side)
          api.addHeaderAction({
            id: "RoleAdmin",
            text: "Role: Admin",
            press: function(){ if(appComp){ appComp._role='Admin'; appComp._applyRoleUI && appComp._applyRoleUI(); } }
          });
          api.addHeaderAction({
            id: "RoleManager",
            text: "Role: Manager",
            press: function(){ if(appComp){ appComp._role='Manager'; appComp._applyRoleUI && appComp._applyRoleUI(); } }
          });
          api.addHeaderAction({
            id: "RoleUser",
            text: "Role: User",
            press: function(){ if(appComp){ appComp._role='User'; appComp._applyRoleUI && appComp._applyRoleUI(); } }
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

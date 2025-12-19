sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension"
], function (ControllerExtension) {
  "use strict";

  return ControllerExtension.extend("saplearningcenter.saplearningcenter.ext.Entity1ListExtension", {
    override: {
      onInit: function () {
        var appComp = (this.base.getAppComponent && this.base.getAppComponent());
        var api = this.base.getExtensionAPI && this.base.getExtensionAPI();
        var role = (appComp && appComp._role) || "Manager";
        if (!api) { return; }
        // Only attach actions on Entity1 ListReport
        var vd = this.base.getView && this.base.getView().getViewData && this.base.getView().getViewData();
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
      }
    }
  });
});

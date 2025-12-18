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

        // Add header action: Training Assignments
        api.addHeaderAction({
          id: "TrainingAssignmentsNav",
          text: "Training Assignments",
          icon: "sap-icon://study",
          press: function () {
            if (appComp && appComp.navigateToTraining) {
              appComp.navigateToTraining();
            }
          }
        });

        // Manager-only Assign action: navigate and trigger Create on TrainingAssignments LR
        if (role === "Manager") {
          api.addHeaderAction({
            id: "TrainingAssignCreate",
            text: "Assign",
            icon: "sap-icon://add-document",
            press: function () {
              if (appComp && appComp.openTrainingAssignmentsAndCreate) {
                appComp.openTrainingAssignmentsAndCreate();
              } else if (appComp && appComp.navigateToTraining) {
                appComp.navigateToTraining();
              }
            }
          });
        }
      }
    }
  });
});

sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/Button"
], function (ControllerExtension, Button) {
  "use strict";

  return ControllerExtension.extend("saplearningcenter.saplearningcenter.ext.Entity1ListExtension", {
    override: {
      onAfterRendering: function () {
        var view = this.base.getView();
        var appComp = (this.base.getAppComponent && this.base.getAppComponent()) || sap.ui.core.Component.getOwnerComponentFor(view);
        var role = (appComp && appComp._role) || "Manager";

        // find header toolbars
        var toolbars = view.findAggregatedObjects(true, function (o) {
          return o.getMetadata && o.getMetadata().getName() === "sap.m.OverflowToolbar";
        });
        var addIfMissing = function (tb, text, icon, handler) {
          var items = tb.getContent && tb.getContent();
          var exists = (items || []).some(function (it) { return it.getText && it.getText() === text; });
          if (!exists) {
            tb.addContent(new Button({ text: text, icon: icon, type: "Transparent", press: handler }));
          }
        };

        toolbars.forEach(function (tb) {
          // Navigate to Training Assignments
          addIfMissing(tb, "Training Assignments", "sap-icon://study", function () {
            var r = appComp && appComp.getRouter && appComp.getRouter();
            if (r && r.navTo) { r.navTo("TrainingAssignmentsList"); }
          });
          // Manager-only Assign shortcut (triggers standard Create)
          if (role === "Manager") {
            addIfMissing(tb, "Assign", "sap-icon://add-document", function () {
              var items = tb.getContent && tb.getContent();
              var createBtn = (items || []).find(function (it) { return it.getText && it.getText() === "Create"; });
              if (createBtn) { createBtn.firePress(); }
            });
          }
        });
      }
    }
  });
});

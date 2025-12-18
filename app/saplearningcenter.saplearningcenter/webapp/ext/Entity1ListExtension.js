sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/Button"
], function (ControllerExtension, Button) {
  "use strict";

  return ControllerExtension.extend("saplearningcenter.saplearningcenter.ext.Entity1ListExtension", {
    override: {
      onAfterRendering: function () {
        var view = this.base.getView();
        var ownerComp = sap.ui.core.Component.getOwnerComponentFor(view);
        var role = (ownerComp && ownerComp._role) || "Manager";

        // find header toolbars
        var toolbars = view.findAggregatedObjects(true, function (o) {
          return o.getMetadata && o.getMetadata().getName() === "sap.m.OverflowToolbar";
        });
        var addIfMissing = function (tb, text, handler) {
          var items = tb.getContent && tb.getContent();
          var exists = (items || []).some(function (it) { return it.getText && it.getText() === text; });
          if (!exists) {
            tb.addContent(new Button({ text: text, type: "Transparent", press: handler }));
          }
        };

        toolbars.forEach(function (tb) {
          // Navigate to Training Assignments
          addIfMissing(tb, "Training Assignments", function () {
            var r = ownerComp && ownerComp.getRouter && ownerComp.getRouter();
            if (r && r.navTo) { r.navTo("TrainingAssignmentsList"); }
          });
          // Manager-only Assign shortcut (triggers standard Create)
          if (role === "Manager") {
            addIfMissing(tb, "Assign", function () {
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

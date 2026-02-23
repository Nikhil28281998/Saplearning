sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.NotFound", {

        onNavBack: function () {
            var oComponent = this.getOwnerComponent();
            var sRole = oComponent._role || "User";
            var sTarget = (sRole === "User") ? "TrainingAssignmentsList" : "TrainingsList";
            oComponent.getRouter().navTo(sTarget, {}, true);
        }

    });
});

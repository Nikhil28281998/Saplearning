sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingsList", {
        
        onInit: function () {
            // OData model and "user" role model propagate from Component automatically
            // No manual model setup needed - Component._applyRoleUI() sets the "user" model
        },

        onRefresh: function () {
            var oModel = this.getView().getModel();
            oModel.refresh(true);
            MessageToast.show("Data refreshed");
        },

        onItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var oTraining = oContext.getObject();
            
            MessageBox.information(
                "Training: " + oTraining.title + "\\n" +
                "Module: " + oTraining.sap_module + "\n" +
                "Role: " + oTraining.role + "\n\n" +
                "Description: " + oTraining.description,
                {
                    title: "Training Details",
                    actions: [MessageBox.Action.CLOSE],
                    onClose: function() {
                        if (oTraining.url) {
                            MessageBox.confirm(
                                "Would you like to open the training material?",
                                {
                                    onClose: function(sAction) {
                                        if (sAction === MessageBox.Action.OK) {
                                            window.open(oTraining.url, "_blank");
                                        }
                                    }
                                }
                            );
                        }
                    }
                }
            );
        },

        onAssignTraining: function () {
            var oComponent = this.getOwnerComponent();
            if (oComponent && oComponent.openAssignDialog) {
                oComponent.openAssignDialog();
            }
        },

        onViewAssignments: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TrainingAssignmentsList");
        }
    });
});

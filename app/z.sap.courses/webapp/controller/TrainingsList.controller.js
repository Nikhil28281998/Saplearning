sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingsList", {
        
        onInit: function () {
            // Set view model for UI state
            var oViewModel = new JSONModel({
                role: "User"  // Default, will be updated from Component
            });
            this.getView().setModel(oViewModel, "view");
            
            // Get role from Component
            var oComponent = this.getOwnerComponent();
            if (oComponent && oComponent._role) {
                oViewModel.setProperty("/role", oComponent._role);
            }
            
            // Bind to root for role updates
            var oModel = this.getOwnerComponent().getModel();
            this.getView().setModel(oModel);
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
                "Module: " + oTraining.module + "\\n" +
                "Duration: " + oTraining.durationHours + " hours\\n\\n" +
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

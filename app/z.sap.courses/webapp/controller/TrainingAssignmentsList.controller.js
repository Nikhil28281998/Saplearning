sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingAssignmentsList", {
        
        onInit: function () {
            var oModel = this.getOwnerComponent().getModel();
            this.getView().setModel(oModel);
        },

        onRefresh: function () {
            var oModel = this.getView().getModel();
            oModel.refresh(true);
            MessageToast.show("Data refreshed");
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TrainingsList");
        },

        onItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var oAssignment = oContext.getObject();
            
            MessageBox.information(
                "Training: " + oAssignment.Title + "\n" +
                "User: " + oAssignment.UserId + " - " + oAssignment.UserName + "\n" +
                "Status: " + oAssignment.Status + "\n" +
                "Module: " + oAssignment.SapModule,
                {
                    title: "Assignment Details"
                }
            );
        }
    });
});

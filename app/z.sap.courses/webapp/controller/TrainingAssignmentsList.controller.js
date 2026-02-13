sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingAssignmentsList", {

        onInit: function () {
            // SmartFilterBar + SmartTable handle all filtering, sorting, grouping
        },

        /**
         * SmartTable initialise – configure inner responsive table
         */
        onSmartTableInit: function () {
            var oSmartTable = this.byId("assignSmartTable");
            var oTable = oSmartTable.getTable();
            if (oTable) {
                oTable.setMode("SingleSelectMaster");
                oTable.attachItemPress(this.onItemPress.bind(this));
                oTable.setAlternateRowColors(true);
            }
        },

        /* ===== Refresh ===== */
        onRefresh: function () {
            var oSmartTable = this.byId("assignSmartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable(true);
            }
            MessageToast.show("Data refreshed");
        },

        /* ===== Nav Back ===== */
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TrainingsList");
        },

        /* ===== Item Press ===== */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) { return; }
            var oAssignment = oContext.getObject();

            MessageBox.information(
                "Training: " + (oAssignment.Title || "") + "\n" +
                "User: " + (oAssignment.UserId || "") + " - " + (oAssignment.UserName || "") + "\n" +
                "Status: " + (oAssignment.Status || "") + "\n" +
                "Module: " + (oAssignment.SapModule || ""),
                { title: "Assignment Details" }
            );
        }
    });
});

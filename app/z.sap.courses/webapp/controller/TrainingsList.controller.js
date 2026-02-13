sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingsList", {

        onInit: function () {
            // SmartFilterBar + SmartTable handle all filter/sort/group/column logic
            // No manual setup needed — driven by OData metadata + annotation.xml
        },

        /* ===== SmartTable initialise: configure inner table ===== */
        onSmartTableInit: function () {
            var oSmartTable = this.byId("smartTable");
            var oTable = oSmartTable.getTable();
            if (oTable) {
                oTable.setMode("SingleSelectMaster");
                oTable.attachItemPress(this.onItemPress.bind(this));
                oTable.setAlternateRowColors(true);
            }
        },

        /* ===== Optional: inject extra logic before data fetch ===== */
        onBeforeRebindTable: function (oEvent) {
            // Hook for adding custom filters/sorters if needed
            // var oBindingParams = oEvent.getParameter("bindingParams");
        },

        /* ===== Refresh via SmartTable rebind ===== */
        onRefresh: function () {
            var oSmartTable = this.byId("smartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable(true);
            }
            MessageToast.show("Data refreshed");
        },

        /* ===== Row Press: show training detail ===== */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) { return; }
            var oTraining = oContext.getObject();

            MessageBox.information(
                "Training: " + (oTraining.Title || "") + "\n" +
                "Module: " + (oTraining.SapModule || "") + "\n" +
                "Role: " + (oTraining.Role || "") + "\n\n" +
                "Description: " + (oTraining.Description || ""),
                {
                    title: "Training Details",
                    actions: [MessageBox.Action.CLOSE],
                    onClose: function () {
                        if (oTraining.Url) {
                            MessageBox.confirm(
                                "Would you like to open the training material?",
                                {
                                    onClose: function (sAction) {
                                        if (sAction === MessageBox.Action.OK) {
                                            window.open(oTraining.Url, "_blank");
                                        }
                                    }
                                }
                            );
                        }
                    }
                }
            );
        },

        /* ===== Navigation ===== */
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

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/library"
], function (Controller, MessageToast, MessageBox, JSONModel, coreLibrary) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingsList", {

        onInit: function () {
            // Analytics model for dashboard
            var oAnalyticsModel = new JSONModel({
                totalTrainings: 0,
                assigned: 0,
                inProgress: 0,
                completed: 0,
                completionPercent: 0
            });
            this.getView().setModel(oAnalyticsModel, "analyticsModel");
            
            // Load analytics data
            this._loadAnalytics();
        },

        _loadAnalytics: function () {
            var that = this;
            var oModel = this.getOwnerComponent().getModel();
            var oAnalyticsModel = this.getView().getModel("analyticsModel");
            
            // Count trainings
            oModel.read("/Trainings/$count", {
                success: function (count) {
                    oAnalyticsModel.setProperty("/totalTrainings", count || 0);
                },
                error: function () { /* ignore */ }
            });
            
            // Count assignments by status
            oModel.read("/TrainingAssignments", {
                success: function (data) {
                    var results = data.results || [];
                    var assigned = 0, inProgress = 0, completed = 0;
                    results.forEach(function (a) {
                        if (a.Status === "Assigned") { assigned++; }
                        else if (a.Status === "In Progress") { inProgress++; }
                        else if (a.Status === "Completed") { completed++; }
                    });
                    var total = results.length || 1;
                    var pct = Math.round((completed / total) * 100);
                    
                    oAnalyticsModel.setProperty("/assigned", assigned);
                    oAnalyticsModel.setProperty("/inProgress", inProgress);
                    oAnalyticsModel.setProperty("/completed", completed);
                    oAnalyticsModel.setProperty("/completionPercent", pct);
                },
                error: function () { /* ignore */ }
            });
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
        },

        /* ===== Refresh via SmartTable rebind ===== */
        onRefresh: function () {
            var oSmartTable = this.byId("smartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable(true);
            }
            this._loadAnalytics();
            MessageToast.show("Data refreshed");
        },

        /* ===== Open URL in same window or new tab ===== */
        onOpenUrl: function (sUrl, bSameWindow) {
            if (!sUrl) { return; }
            if (bSameWindow) {
                window.location.href = sUrl;
            } else {
                window.open(sUrl, "_blank", "noopener,noreferrer");
            }
        },

        /* ===== Row Press: show training detail with link options ===== */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) { return; }
            var oTraining = oContext.getObject();
            var that = this;

            // Build actions array
            var aActions = [];
            if (oTraining.Url) {
                aActions.push("Open Training Link");
            }
            if (oTraining.SapHelpLink) {
                aActions.push("Open SAP Help");
            }
            aActions.push(MessageBox.Action.CLOSE);

            MessageBox.show(
                "Title: " + (oTraining.Title || "") + "\n" +
                "Module: " + (oTraining.SapModule || "") + "\n" +
                "Role: " + (oTraining.Role || "") + "\n\n" +
                (oTraining.Description || ""),
                {
                    title: "Training Details",
                    icon: MessageBox.Icon.INFORMATION,
                    actions: aActions,
                    emphasizedAction: aActions[0],
                    onClose: function (sAction) {
                        if (sAction === "Open Training Link" && oTraining.Url) {
                            that.onOpenUrl(oTraining.Url, false);
                        } else if (sAction === "Open SAP Help" && oTraining.SapHelpLink) {
                            that.onOpenUrl(oTraining.SapHelpLink, false);
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

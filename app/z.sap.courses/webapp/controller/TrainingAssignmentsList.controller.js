sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function (Controller, MessageToast, MessageBox, JSONModel, History) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingAssignmentsList", {

        onInit: function () {
            // Analytics model for my progress
            var oAnalyticsModel = new JSONModel({
                assigned: 0,
                inProgress: 0,
                completed: 0,
                completionPercent: 0
            });
            this.getView().setModel(oAnalyticsModel, "assignAnalytics");
            
            // Load analytics when view appears
            this._loadAnalytics();
        },

        _loadAnalytics: function () {
            var that = this;
            var oModel = this.getOwnerComponent().getModel();
            var oAnalyticsModel = this.getView().getModel("assignAnalytics");
            
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
            this._loadAnalytics();
            MessageToast.show("Data refreshed");
        },

        /* ===== Nav Back – robust approach for FLP + standalone ===== */
        onNavBack: function () {
            // Method 1: Check UI5 navigation history
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                // Browser back (works in FLP when user navigated forward)
                window.history.go(-1);
                return;
            }

            // Method 2: Use HashChanger to set app hash to root
            try {
                var oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
                oHashChanger.setHash("");
                return;
            } catch (e) {
                // ignore
            }

            // Method 3: Router navTo
            try {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("TrainingsList", {}, true);
            } catch (e2) {
                // Method 4: Direct hash manipulation for FLP
                var sHash = window.location.hash || "";
                // Strip the app-internal part (&/assignments)
                var sNewHash = sHash.replace(/&\/assignments.*$/, "");
                if (sNewHash !== sHash) {
                    window.location.hash = sNewHash;
                } else {
                    window.history.go(-1);
                }
            }
        },

        /* ===== Item Press ===== */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) { return; }
            var oAssignment = oContext.getObject();
            var that = this;

            var aActions = [];
            if (oAssignment.Url) {
                aActions.push("Open Training");
            }
            if (oAssignment.Status !== "Completed") {
                aActions.push("Mark Completed");
            }
            aActions.push(MessageBox.Action.CLOSE);

            MessageBox.show(
                "Training: " + (oAssignment.Title || "") + "\n" +
                "User: " + (oAssignment.UserId || "") + " - " + (oAssignment.UserName || "") + "\n" +
                "Status: " + (oAssignment.Status || "") + "\n" +
                "Module: " + (oAssignment.SapModule || ""),
                {
                    title: "Assignment Details",
                    icon: MessageBox.Icon.INFORMATION,
                    actions: aActions,
                    emphasizedAction: aActions[0],
                    onClose: function (sAction) {
                        if (sAction === "Open Training" && oAssignment.Url) {
                            window.open(oAssignment.Url, "_blank", "noopener,noreferrer");
                        } else if (sAction === "Mark Completed") {
                            that._markCompleted(oContext);
                        }
                    }
                }
            );
        },

        _markCompleted: function (oContext) {
            var that = this;
            var oModel = this.getView().getModel();
            var sPath = oContext.getPath();
            
            oModel.update(sPath, {
                Status: "Completed",
                CompletionDate: new Date().toISOString()
            }, {
                success: function () {
                    MessageToast.show("Marked as completed!");
                    that.onRefresh();
                },
                error: function (err) {
                    MessageBox.error("Failed to update: " + (err.message || "Unknown error"));
                }
            });
        }
    });
});

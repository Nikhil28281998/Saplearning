sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/base/Log"
], function (Controller, MessageToast, MessageBox, JSONModel, History, Filter, FilterOperator, Log) {
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
            
            oModel.read("/" + this.getOwnerComponent().getAssignmentEntitySet(), {
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
                error: function (err) {
                    Log.warning("[AssignAnalytics] Failed to load assignments: " + (err && err.message || ""));
                    MessageToast.show("Failed to load assignment data");
                }
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

        /**
         * beforeRebindTable – handle SmartFilterBar filters for Assignments.
         * Converts basic search to Title EQ and sanitizes SEGW-incompatible operators.
         */
        onBeforeRebindTable: function (oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");
            var oSmartFilterBar = this.byId("assignSmartFilterBar");

            // SEGW filter sanitizer - convert Contains to EQ for string fields
            var fnSanitize = function (oFilter) {
                if (oFilter.aFilters) {
                    for (var k = 0; k < oFilter.aFilters.length; k++) {
                        oFilter.aFilters[k] = fnSanitize(oFilter.aFilters[k]);
                    }
                    return oFilter;
                }
                if ((oFilter.sPath === "Role" || oFilter.sPath === "SapModule" || oFilter.sPath === "Status") &&
                    oFilter.sOperator && oFilter.sOperator !== FilterOperator.EQ) {
                    return new Filter(oFilter.sPath, FilterOperator.EQ, oFilter.oValue1);
                }
                return oFilter;
            };
            for (var i = 0; i < mBindingParams.filters.length; i++) {
                mBindingParams.filters[i] = fnSanitize(mBindingParams.filters[i]);
            }

            // Basic search → Title EQ filter
            var sSearchVal = "";
            if (oSmartFilterBar && oSmartFilterBar.getBasicSearchValue) {
                sSearchVal = (oSmartFilterBar.getBasicSearchValue() || "").trim();
            }
            if (sSearchVal) {
                mBindingParams.filters.push(new Filter("Title", FilterOperator.EQ, sSearchVal));
            }

            // Remove $search parameter
            if (mBindingParams.parameters && mBindingParams.parameters.custom) {
                delete mBindingParams.parameters.custom.search;
            }

            Log.info("[AssignFilter] Total filters: " + mBindingParams.filters.length);
        },

        /* ===== Nav Back – standard Fiori Router pattern (audit fix #18) ===== */
        onNavBack: function () {
            // Use router navigation — the standard and reliable Fiori approach.
            // Handles both FLP and standalone scenarios correctly.
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("TrainingsList", {}, true);
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

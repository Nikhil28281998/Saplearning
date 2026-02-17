sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/base/Log",
    "z/sap/courses/services/AnalyticsService"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Log, AnalyticsService) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingAssignmentsList", {

        onInit: function () {
            this._analyticsService = new AnalyticsService();

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
            var oModel = this.getOwnerComponent().getModel();
            var oAnalyticsModel = this.getView().getModel("assignAnalytics");
            var sEntitySet = this.getOwnerComponent().getAssignmentEntitySet();

            // Set analytics panel busy during load
            var oPanel = this.byId("myProgressPanel");
            if (oPanel) { oPanel.setBusy(true); }

            this._analyticsService.getAssignmentStats(oModel, sEntitySet).then(function (oStats) {
                oAnalyticsModel.setProperty("/assigned", oStats.assigned);
                oAnalyticsModel.setProperty("/inProgress", oStats.inProgress);
                oAnalyticsModel.setProperty("/completed", oStats.completed);
                oAnalyticsModel.setProperty("/completionPercent", oStats.completionPercent);
            }).catch(function (err) {
                Log.warning("[AssignAnalytics] Failed to load assignments: " + (err && err.message || ""));
            }).finally(function () {
                if (oPanel) { oPanel.setBusy(false); }
            });
        },

        /**
         * SmartTable initialise – configure inner responsive table.
         * Guards against re-attaching itemPress on repeat init calls.
         */
        onSmartTableInit: function () {
            var oSmartTable = this.byId("assignSmartTable");
            var oTable = oSmartTable.getTable();
            if (oTable) {
                oTable.setMode("SingleSelectMaster");
                oTable.setAlternateRowColors(true);
                if (!this._itemPressAttached) {
                    oTable.attachItemPress(this.onItemPress.bind(this));
                    this._itemPressAttached = true;
                }
            }
        },

        /* ===== Refresh ===== */
        onRefresh: function () {
            var oSmartTable = this.byId("assignSmartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable(true);
            }
            this._loadAnalytics();
            MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("dataRefreshed"));
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

        /* ===== Nav Back – always use router.navTo for reliability in FLP ===== */
        onNavBack: function () {
            // Always use explicit router navigation — window.history.go(-1) is unreliable
            // inside FLP because FLP manages the hash independently.
            this.getOwnerComponent().getRouter().navTo("TrainingsList", {}, true);
        },

        /* ===== Item Press ===== */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) { return; }
            var oAssignment = oContext.getObject();
            var that = this;
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            var aActions = [];
            if (oAssignment.Url) {
                aActions.push(i18n.getText("openTraining"));
            }
            if (oAssignment.Status !== "Completed") {
                aActions.push(i18n.getText("markCompleted"));
            }
            aActions.push(MessageBox.Action.CLOSE);

            MessageBox.show(
                "Training: " + (oAssignment.Title || "") + "\n" +
                "User: " + (oAssignment.UserId || "") + " - " + (oAssignment.UserName || "") + "\n" +
                "Status: " + (oAssignment.Status || "") + "\n" +
                "Module: " + (oAssignment.SapModule || ""),
                {
                    title: i18n.getText("assignmentDetails"),
                    icon: MessageBox.Icon.INFORMATION,
                    actions: aActions,
                    emphasizedAction: aActions[0],
                    onClose: function (sAction) {
                        if (sAction === i18n.getText("openTraining") && oAssignment.Url) {
                            window.open(oAssignment.Url, "_blank", "noopener,noreferrer");
                        } else if (sAction === i18n.getText("markCompleted")) {
                            that._markCompleted(oContext);
                        }
                    }
                }
            );
        },

        _markCompleted: function (oContext) {
            var that = this;
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            // Confirmation dialog — irreversible action
            MessageBox.confirm(i18n.getText("confirmText"), {
                title: i18n.getText("confirmTitle"),
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }

                    var oModel = that.getView().getModel();
                    var sPath = oContext.getPath();
                    var oSmartTable = that.byId("assignSmartTable");
                    if (oSmartTable) { oSmartTable.setBusy(true); }

                    oModel.update(sPath, {
                        Status: "Completed",
                        CompletionDate: new Date()
                    }, {
                        success: function () {
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            MessageToast.show(i18n.getText("markedCompleted"));
                            that.onRefresh();
                        },
                        error: function (err) {
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            MessageBox.error(i18n.getText("updateFailed") + ": " + (err.message || "Unknown error"));
                        }
                    });
                }
            });
        }
    });
});

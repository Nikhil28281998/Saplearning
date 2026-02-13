sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/m/Link",
    "sap/m/Text"
], function (Controller, MessageToast, MessageBox, JSONModel, Link, Text) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingsList", {

        onInit: function () {
            // Analytics model for dashboard + charts
            var oAnalyticsModel = new JSONModel({
                totalTrainings: 0,
                assigned: 0,
                inProgress: 0,
                completed: 0,
                completionPercent: 0
            });
            this.getView().setModel(oAnalyticsModel, "analyticsModel");
            this._loadAnalytics();
        },

        _loadAnalytics: function () {
            var oModel = this.getOwnerComponent().getModel();
            var oAnalyticsModel = this.getView().getModel("analyticsModel");
            var that = this;

            // Load all trainings for count + module distribution chart
            oModel.read("/Trainings", {
                success: function (data) {
                    var results = data.results || [];
                    var count = data.__count ? parseInt(data.__count, 10) : results.length;
                    oAnalyticsModel.setProperty("/totalTrainings", count);

                    // Build module distribution for chart
                    var moduleMap = {};
                    results.forEach(function (t) {
                        if (t.SapModule) {
                            moduleMap[t.SapModule] = (moduleMap[t.SapModule] || 0) + 1;
                        }
                    });
                    var moduleArr = Object.keys(moduleMap).map(function (m) {
                        return { label: m, count: moduleMap[m] };
                    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 5);

                    that._buildModuleChart(moduleArr);
                },
                error: function () {
                    oAnalyticsModel.setProperty("/totalTrainings", 0);
                }
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

        /**
         * Build module distribution ComparisonMicroChart programmatically
         */
        _buildModuleChart: function (moduleArr) {
            var oContainer = this.byId("moduleChartContainer");
            if (!oContainer) { return; }
            oContainer.destroyItems();

            if (moduleArr.length === 0) {
                oContainer.addItem(new Text({ text: "No module data available" }));
                return;
            }

            sap.ui.require([
                "sap/suite/ui/microchart/ComparisonMicroChart",
                "sap/suite/ui/microchart/ComparisonMicroChartData"
            ], function (ComparisonMicroChart, ComparisonMicroChartData) {
                var oChart = new ComparisonMicroChart({
                    size: "M",
                    shrinkable: true,
                    width: "220px"
                });

                var colors = ["Good", "Neutral", "Critical", "Error", "Neutral"];
                moduleArr.forEach(function (m, i) {
                    oChart.addData(new ComparisonMicroChartData({
                        title: m.label,
                        value: m.count,
                        color: colors[i % colors.length],
                        displayValue: m.count + ""
                    }));
                });

                oContainer.addItem(oChart);
            });
        },

        /* ===== SmartTable initialise: configure GridTable + clickable links ===== */
        onSmartTableInit: function () {
            var that = this;
            var oSmartTable = this.byId("smartTable");
            var oTable = oSmartTable.getTable();
            if (oTable) {
                // GridTable (sap.ui.table.Table) configuration
                oTable.setSelectionMode("Single");
                oTable.setSelectionBehavior("RowOnly");
                oTable.setAlternateRowColors(true);
                oTable.setEnableColumnFreeze(true);
                oTable.setEnableColumnReordering(true);

                // Replace URL column templates with clickable Links
                // Use short delay to ensure SmartTable has generated columns
                setTimeout(function () {
                    that._replaceUrlColumnsWithLinks(oTable);
                }, 300);
            }
        },

        /**
         * Replace Url and SapHelpLink column templates with sap.m.Link controls
         * that open in a new browser tab (target="_blank")
         */
        _replaceUrlColumnsWithLinks: function (oTable) {
            if (!oTable || !oTable.getColumns) { return; }
            var aColumns = oTable.getColumns();
            aColumns.forEach(function (oCol) {
                var sColumnKey = "";
                var aCustomData = oCol.getCustomData();
                for (var i = 0; i < aCustomData.length; i++) {
                    if (aCustomData[i].getKey() === "p13nData") {
                        try {
                            var oP13n = JSON.parse(aCustomData[i].getValue());
                            sColumnKey = oP13n.columnKey || oP13n.leadingProperty || "";
                        } catch (e) { /* ignore parse errors */ }
                        break;
                    }
                }

                if (sColumnKey === "Url") {
                    oCol.setTemplate(new Link({
                        text: {
                            path: "Url",
                            formatter: function (v) { return v ? "Open Link" : ""; }
                        },
                        href: "{Url}",
                        target: "_blank",
                        wrapping: false
                    }));
                } else if (sColumnKey === "SapHelpLink") {
                    oCol.setTemplate(new Link({
                        text: {
                            path: "SapHelpLink",
                            formatter: function (v) { return v ? "SAP Help" : ""; }
                        },
                        href: "{SapHelpLink}",
                        target: "_blank",
                        wrapping: false
                    }));
                }
            });
        },

        /* ===== Re-apply link templates after variant changes ===== */
        onBeforeRebindTable: function (oEvent) {
            var that = this;
            setTimeout(function () {
                var oSmartTable = that.byId("smartTable");
                if (oSmartTable) {
                    that._replaceUrlColumnsWithLinks(oSmartTable.getTable());
                }
            }, 200);
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

        /* ===== View details of the selected row ===== */
        onViewDetails: function () {
            var oSmartTable = this.byId("smartTable");
            var oTable = oSmartTable.getTable();
            var iIndex = oTable.getSelectedIndex();
            if (iIndex < 0) {
                MessageToast.show("Please select a training first");
                return;
            }
            var oContext = oTable.getContextByIndex(iIndex);
            if (!oContext) { return; }
            var oTraining = oContext.getObject();

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
                            window.open(oTraining.Url, "_blank", "noopener,noreferrer");
                        } else if (sAction === "Open SAP Help" && oTraining.SapHelpLink) {
                            window.open(oTraining.SapHelpLink, "_blank", "noopener,noreferrer");
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

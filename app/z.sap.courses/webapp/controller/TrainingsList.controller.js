sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Link",
    "sap/m/Text",
    "sap/base/Log"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Link, Text, Log) {
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

            // Count assignments by status (use detected entity set name)
            var sAssignEntitySet = this.getOwnerComponent().getAssignmentEntitySet();
            oModel.read("/" + sAssignEntitySet, {
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
                oTable.setSelectionMode("Single");
                oTable.setSelectionBehavior("RowOnly");
                oTable.setAlternateRowColors(true);
                oTable.setEnableColumnFreeze(true);
                oTable.setEnableColumnReordering(true);
                oTable.setEnableCellFilter(true);
                oTable.setEnableGrouping(true);

                // Fit-to-screen: auto-fill available height like standard Fiori
                oTable.setVisibleRowCountMode("Auto");
                oTable.setMinAutoRowCount(5);

                // Configure column menus and URL links AFTER first data render.
                // rowsUpdated fires reliably when columns are fully created and data is rendered.
                // Flag prevents re-processing on every scroll; reset in onBeforeRebindTable.
                that._columnsConfigured = false;
                oTable.attachRowsUpdated(function () {
                    if (!that._columnsConfigured) {
                        that._enableColumnMenus(oTable);
                        that._replaceUrlColumnsWithLinks(oTable);
                        that._columnsConfigured = true;
                    }
                });
            }
        },

        /**
         * Enable Sort Ascending / Sort Descending / Filter on every column header menu.
         * Standard Fiori GridTable behavior — requires sortProperty and filterProperty.
         */
        _enableColumnMenus: function (oTable) {
            if (!oTable || !oTable.getColumns) { return; }
            var aColumns = oTable.getColumns();
            aColumns.forEach(function (oCol) {
                var sProperty = "";
                var aCustomData = oCol.getCustomData();
                for (var i = 0; i < aCustomData.length; i++) {
                    if (aCustomData[i].getKey() === "p13nData") {
                        try {
                            var oP13n = JSON.parse(aCustomData[i].getValue());
                            sProperty = oP13n.columnKey || oP13n.leadingProperty || "";
                        } catch (e) { /* ignore */ }
                        break;
                    }
                }
                if (sProperty) {
                    // Enable sort and filter on column header dropdown menu
                    oCol.setSortProperty(sProperty);
                    oCol.setFilterProperty(sProperty);
                    oCol.setShowFilterMenuEntry(true);
                    oCol.setShowSortMenuEntry(true);
                }
            });
        },

        /**
         * Replace Url and SapHelpLink column templates with sap.m.Link controls
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
                        } catch (e) { /* ignore */ }
                        break;
                    }
                }

                if (sColumnKey === "Url") {
                    oCol.setTemplate(new Link({
                        text: { path: "Url", formatter: function (v) { return v ? "Open Link" : ""; } },
                        href: "{Url}",
                        target: "_blank",
                        wrapping: false
                    }));
                } else if (sColumnKey === "SapHelpLink") {
                    oCol.setTemplate(new Link({
                        text: { path: "SapHelpLink", formatter: function (v) { return v ? "SAP Help" : ""; } },
                        href: "{SapHelpLink}",
                        target: "_blank",
                        wrapping: false
                    }));
                }
            });
        },

        /**
         * beforeRebindTable — Standard Fiori approach.
         * 
         * SmartFilterBar auto-generates proper EQ filters for Role, SapModule, LastUpdated
         * from UI.SelectionFields annotation. These pass through natively to SEGW.
         * 
         * We only intercept the Basic Search to convert it to a Title EQ filter
         * (SEGW doesn't support $search; ABAP does LIKE matching on Title).
         */
        onBeforeRebindTable: function (oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");

            // ---- Basic search box → Title EQ filter ----
            // SmartFilterBar sends basic search as $search param which SEGW ignores.
            // Convert it to a proper Title EQ filter for our ABAP LIKE matching.
            var oSmartFilterBar = this.byId("smartFilterBar");
            var sSearchVal = "";
            if (oSmartFilterBar && oSmartFilterBar.getBasicSearchValue) {
                sSearchVal = (oSmartFilterBar.getBasicSearchValue() || "").trim();
            }
            if (sSearchVal) {
                mBindingParams.filters.push(new Filter("Title", FilterOperator.EQ, sSearchVal));
                Log.info("[Filter] Title EQ (from basic search): " + sSearchVal);
            }

            // Remove $search parameter that SEGW doesn't support
            if (mBindingParams.parameters && mBindingParams.parameters.custom) {
                delete mBindingParams.parameters.custom.search;
            }

            // Log all filters that SmartFilterBar is sending
            Log.info("[Filter] Total filters: " + mBindingParams.filters.length);

            // Reset columns flag so menus + links get re-applied after new data
            this._columnsConfigured = false;
        },

        onRefresh: function () {
            var oSmartTable = this.byId("smartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable(true);
            }
            this._loadAnalytics();
            MessageToast.show("Data refreshed");
        },

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
            if (oTraining.Url) { aActions.push("Open Training Link"); }
            if (oTraining.SapHelpLink) { aActions.push("Open SAP Help"); }
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

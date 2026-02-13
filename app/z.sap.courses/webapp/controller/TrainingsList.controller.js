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

            // Filter model for Role/Module cross-reference dropdowns
            var oFilterModel = new JSONModel({
                allTrainings: [],       // master data for cross-referencing
                roles: [],              // [{key:"Developer", text:"Developer"}, ...]
                modules: [],            // [{key:"FI", text:"FI"}, ...]
                allRoles: [],           // unfiltered master list of roles
                allModules: []          // unfiltered master list of modules
            });
            oFilterModel.setSizeLimit(5000);
            this.getView().setModel(oFilterModel, "filterModel");

            this._loadAnalytics();
            this._loadFilterDropdowns();
        },

        /**
         * Load training data to populate Role and Module dropdowns
         */
        _loadFilterDropdowns: function () {
            var oModel = this.getOwnerComponent().getModel();
            var oFilterModel = this.getView().getModel("filterModel");

            oModel.read("/Trainings", {
                success: function (data) {
                    var trainings = data.results || [];
                    oFilterModel.setProperty("/allTrainings", trainings);

                    // Extract unique roles and modules
                    var roleSet = {};
                    var moduleSet = {};
                    trainings.forEach(function (t) {
                        if (t.Role) { roleSet[t.Role] = true; }
                        if (t.SapModule) { moduleSet[t.SapModule] = true; }
                    });

                    var roles = Object.keys(roleSet).sort().map(function (r) {
                        return { key: r, text: r };
                    });
                    var modules = Object.keys(moduleSet).sort().map(function (m) {
                        return { key: m, text: m };
                    });

                    oFilterModel.setProperty("/roles", roles);
                    oFilterModel.setProperty("/modules", modules);
                    oFilterModel.setProperty("/allRoles", roles.slice());
                    oFilterModel.setProperty("/allModules", modules.slice());
                },
                error: function () { /* ignore */ }
            });
        },

        /**
         * Cross-reference: Role selected → filter Module dropdown to show only related modules
         */
        onRoleFilterChange: function (oEvent) {
            var oFilterModel = this.getView().getModel("filterModel");
            var oCombo = oEvent.getSource();
            var sSelectedRole = oCombo.getSelectedKey();

            if (!sSelectedRole) {
                // "All Roles" or cleared → restore full module list
                oFilterModel.setProperty("/modules", oFilterModel.getProperty("/allModules").slice());
                return;
            }

            // Filter modules: only those that have trainings with the selected role
            var trainings = oFilterModel.getProperty("/allTrainings") || [];
            var moduleSet = {};
            trainings.forEach(function (t) {
                if (t.Role === sSelectedRole && t.SapModule) {
                    moduleSet[t.SapModule] = true;
                }
            });

            var filteredModules = Object.keys(moduleSet).sort().map(function (m) {
                return { key: m, text: m };
            });
            oFilterModel.setProperty("/modules", filteredModules);

            // If currently selected module is no longer valid, clear it
            var oModuleCombo = this.byId("filterModuleCombo");
            if (oModuleCombo) {
                var sCurModule = oModuleCombo.getSelectedKey();
                if (sCurModule && !moduleSet[sCurModule]) {
                    oModuleCombo.setSelectedKey("");
                    oModuleCombo.setValue("");
                }
            }
        },

        /**
         * Cross-reference: Module selected → filter Role dropdown to show only related roles
         */
        onModuleFilterChange: function (oEvent) {
            var oFilterModel = this.getView().getModel("filterModel");
            var oCombo = oEvent.getSource();
            var sSelectedModule = oCombo.getSelectedKey();

            if (!sSelectedModule) {
                // Cleared → restore full role list
                oFilterModel.setProperty("/roles", oFilterModel.getProperty("/allRoles").slice());
                return;
            }

            // Filter roles: only those that have trainings with the selected module
            var trainings = oFilterModel.getProperty("/allTrainings") || [];
            var roleSet = {};
            trainings.forEach(function (t) {
                if (t.SapModule === sSelectedModule && t.Role) {
                    roleSet[t.Role] = true;
                }
            });

            var filteredRoles = Object.keys(roleSet).sort().map(function (r) {
                return { key: r, text: r };
            });
            oFilterModel.setProperty("/roles", filteredRoles);

            // If currently selected role is no longer valid, clear it
            var oRoleCombo = this.byId("filterRoleCombo");
            if (oRoleCombo) {
                var sCurRole = oRoleCombo.getSelectedKey();
                if (sCurRole && !roleSet[sCurRole]) {
                    oRoleCombo.setSelectedKey("");
                    oRoleCombo.setValue("");
                }
            }
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
         * CRITICAL: beforeRebindTable — inject OData $filter from custom filterGroupItems.
         * Uses FilterOperator.EQ for exact match (SEGW standard).
         * For Title: uses EQ — ABAP backend does LIKE matching for partial text.
         *
         * IMPORTANT: We CLEAR mBindingParams.filters first to remove SmartFilterBar's
         * auto-generated filters. SmartFilterBar may create substringof/contains filters
         * for Edm.String properties which SEGW backends do NOT support.
         * Only our explicit EQ/GE filters are sent to the OData service.
         */
        onBeforeRebindTable: function (oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");
            var aFilters = [];

            // ---- Read values from custom SmartFilterBar controls ----
            var oTitleInput = this.byId("filterTitleInput");
            var oRoleCombo  = this.byId("filterRoleCombo");
            var oModuleCombo = this.byId("filterModuleCombo");
            var oDatePicker = this.byId("filterLastUpdatedPicker");

            // Title: EQ filter — ABAP backend handles partial match via LIKE
            var sTitleVal = oTitleInput ? oTitleInput.getValue().trim() : "";
            if (sTitleVal) {
                aFilters.push(new Filter("Title", FilterOperator.EQ, sTitleVal));
                Log.info("[Filter] Title EQ: " + sTitleVal);
            }

            // Role: exact match
            var sRoleVal = oRoleCombo ? (oRoleCombo.getSelectedKey() || "") : "";
            if (sRoleVal) {
                aFilters.push(new Filter("Role", FilterOperator.EQ, sRoleVal));
                Log.info("[Filter] Role EQ: " + sRoleVal);
            }

            // Module: exact match
            var sModuleVal = oModuleCombo ? (oModuleCombo.getSelectedKey() || "") : "";
            if (sModuleVal) {
                aFilters.push(new Filter("SapModule", FilterOperator.EQ, sModuleVal));
                Log.info("[Filter] SapModule EQ: " + sModuleVal);
            }

            // LastUpdated: date >= selected date
            if (oDatePicker && oDatePicker.getDateValue()) {
                aFilters.push(new Filter("LastUpdated", FilterOperator.GE, oDatePicker.getDateValue()));
                Log.info("[Filter] LastUpdated GE: " + oDatePicker.getDateValue());
            }

            // CLEAR SmartFilterBar's auto-generated filters (may contain unsupported
            // substringof/contains for Edm.String). Replace with our explicit filters only.
            mBindingParams.filters = [];

            if (aFilters.length > 0) {
                var oCombinedFilter = new Filter({ filters: aFilters, and: true });
                mBindingParams.filters.push(oCombinedFilter);
                Log.info("[Filter] Applied " + aFilters.length + " manual EQ/GE filter(s)");
            } else {
                Log.info("[Filter] No filters — showing all records");
            }

            // Reset columns flag so menus + links get re-applied after new data
            this._columnsConfigured = false;
        },

        onRefresh: function () {
            var oSmartTable = this.byId("smartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable(true);
            }
            this._loadAnalytics();
            this._loadFilterDropdowns();
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

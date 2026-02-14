sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Link",
    "sap/m/Text",
    "sap/base/Log",
    "sap/ui/core/BusyIndicator"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Link, Text, Log, BusyIndicator) {
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

            // Filter data model for Role/Module dropdowns + cross-filtering
            var oFilterModel = new JSONModel({
                roles: [{ key: "", text: "All" }],
                modules: [{ key: "", text: "All" }],
                allModules: [{ key: "", text: "All" }],
                roleModuleMap: {}
            });
            this.getView().setModel(oFilterModel, "filterData");

            this._loadAllData();
        },

        /**
         * Consolidated data loader: single Trainings read + single Assignments read.
         * Feeds analytics model, filter dropdowns, and module chart from one data fetch.
         * Fixes audit #8 (was 3 separate OData calls loading same data).
         */
        _loadAllData: function () {
            var oModel = this.getOwnerComponent().getModel();
            var oAnalyticsModel = this.getView().getModel("analyticsModel");
            var oFilterModel = this.getView().getModel("filterData");
            var that = this;
            var iPending = 2; // two reads
            BusyIndicator.show(0);

            var fnDone = function () {
                iPending--;
                if (iPending <= 0) {
                    BusyIndicator.hide();
                }
            };

            // Single read: all trainings → analytics + filter dropdowns + chart
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

                    // Also build filter dropdowns from this same data (eliminates duplicate read)
                    var roleSet = {};
                    var moduleSet = {};
                    var roleModuleMap = {};
                    results.forEach(function (t) {
                        if (t.Role) {
                            roleSet[t.Role] = true;
                            if (!roleModuleMap[t.Role]) { roleModuleMap[t.Role] = {}; }
                            if (t.SapModule) { roleModuleMap[t.Role][t.SapModule] = true; }
                        }
                        if (t.SapModule) { moduleSet[t.SapModule] = true; }
                    });
                    var roles = [{ key: "", text: "All" }];
                    Object.keys(roleSet).sort().forEach(function (r) {
                        roles.push({ key: r, text: r });
                    });
                    var modules = [{ key: "", text: "All" }];
                    Object.keys(moduleSet).sort().forEach(function (m) {
                        modules.push({ key: m, text: m });
                    });
                    oFilterModel.setProperty("/roles", roles);
                    oFilterModel.setProperty("/modules", modules);
                    oFilterModel.setProperty("/allModules", modules.slice(0));
                    oFilterModel.setProperty("/roleModuleMap", roleModuleMap);

                    fnDone();
                },
                error: function (err) {
                    oAnalyticsModel.setProperty("/totalTrainings", 0);
                    Log.error("[Analytics] Failed to load trainings: " + (err && err.message || ""));
                    MessageToast.show("Failed to load training data");
                    fnDone();
                }
            });

            // Single read: all assignments → status counts
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
                    fnDone();
                },
                error: function (err) {
                    Log.error("[Analytics] Failed to load assignments: " + (err && err.message || ""));
                    fnDone();
                }
            });
        },

        /**
         * Refresh analytics - called by role switch and manual refresh.
         */
        _loadAnalytics: function () {
            this._loadAllData();
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

        // _loadFilterData removed: consolidated into _loadAllData (audit fix #8)

        /**
         * Cross-filtering: when Role changes, filter Module dropdown
         * to only show modules available for the selected role.
         */
        onRoleFilterChange: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            var sRole = oItem ? oItem.getKey() : "";
            var oFilterModel = this.getView().getModel("filterData");
            var roleModuleMap = oFilterModel.getProperty("/roleModuleMap") || {};
            var allModules = oFilterModel.getProperty("/allModules") || [];

            if (!sRole) {
                oFilterModel.setProperty("/modules", allModules.slice(0));
            } else {
                var modulesForRole = roleModuleMap[sRole] || {};
                var filtered = [{ key: "", text: "All" }];
                Object.keys(modulesForRole).sort().forEach(function (m) {
                    filtered.push({ key: m, text: m });
                });
                oFilterModel.setProperty("/modules", filtered);
            }
            var oModuleSelect = this.byId("filterModule");
            if (oModuleSelect) { oModuleSelect.setSelectedKey(""); }
        },

        /**
         * Role switcher: switch between Admin/Manager/User views.
         * All UI bindings automatically update via the user JSON model.
         */
        onSwitchRole: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            var sNewRole = oItem ? oItem.getKey() : "";
            if (sNewRole) {
                var oComponent = this.getOwnerComponent();
                if (oComponent && oComponent.switchRole) {
                    oComponent.switchRole(sNewRole);
                }
                this._loadAnalytics();
                MessageToast.show("Switched to " + sNewRole + " view");
            }
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

                // Apply link templates + column menus + date formatting once after first data load
                // Uses a flag to avoid repeated heavy DOM operations (audit fix #13)
                this._linksApplied = false;
                oTable.attachRowsUpdated(function () {
                    that._enableColumnMenus(oTable);
                    if (!that._linksApplied) {
                        that._applyLinkTemplates(oTable);
                        that._linksApplied = true;
                    }
                    that._formatDateColumns(oTable);
                });

                // Fallback: cellClick handler opens URLs even if Link templates fail
                oTable.attachCellClick(function (oEvent) {
                    var oRow = oEvent.getParameter("rowBindingContext");
                    var iColIdx = oEvent.getParameter("columnIndex");
                    if (!oRow) { return; }
                    var aCols = oTable.getColumns();
                    if (iColIdx >= 0 && iColIdx < aCols.length) {
                        var sKey = that._getColumnKey(aCols[iColIdx]);
                        if (sKey === "Url" || sKey === "SapHelpLink") {
                            var sUrl = oRow.getProperty(sKey);
                            if (sUrl) {
                                window.open(sUrl, "_blank", "noopener,noreferrer");
                            }
                        }
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
         * Format date columns to show date only (no time).
         * Replaces LastUpdated column template with date-only formatter.
         */
        /**
         * Format date columns to show date only (no time).
         * Reapplies on each rowsUpdated since column templates can be reset.
         * (Audit fix #14: removed one-shot flag that prevented re-formatting)
         */
        _formatDateColumns: function (oTable) {
            if (!oTable || !oTable.getColumns) { return; }
            var that = this;
            var aColumns = oTable.getColumns();
            aColumns.forEach(function (oCol) {
                var sKey = that._getColumnKey(oCol);
                if (sKey === "LastUpdated") {
                    // Check if already formatted (has our custom formatter)
                    var oTpl = oCol.getTemplate();
                    if (oTpl && oTpl._dateFormatApplied) { return; }
                    var oNewTpl = new Text({
                        text: {
                            path: "LastUpdated",
                            formatter: function (v) {
                                if (!v) { return ""; }
                                var d = (v instanceof Date) ? v : new Date(v);
                                if (isNaN(d.getTime())) { return v + ""; }
                                return d.toLocaleDateString("en-US", {
                                    year: "numeric", month: "short", day: "numeric"
                                });
                            }
                        },
                        wrapping: false
                    });
                    oNewTpl._dateFormatApplied = true;
                    oCol.setTemplate(oNewTpl);
                }
            });
        },

        /**
         * Robustly extract OData property name for a GridTable column.
         * Tries p13nData (leadingProperty, columnKey), then column label text.
         */
        _getColumnKey: function (oCol) {
            var aCD = oCol.getCustomData();
            for (var i = 0; i < aCD.length; i++) {
                if (aCD[i].getKey() === "p13nData") {
                    try {
                        var oP13n = JSON.parse(aCD[i].getValue());
                        var sKey = oP13n.leadingProperty || oP13n.columnKey || "";
                        // Strip namespace prefix (e.g. "ZCOURSES_SRV.Training/Url" → "Url")
                        if (sKey.indexOf("/") >= 0) { sKey = sKey.substring(sKey.lastIndexOf("/") + 1); }
                        if (sKey.indexOf("::") >= 0) { sKey = sKey.substring(sKey.lastIndexOf("::") + 2); }
                        return sKey;
                    } catch (e) { /* ignore */ }
                }
            }
            // Fallback: check column label text
            var oLabel = oCol.getLabel();
            if (oLabel && typeof oLabel.getText === "function") {
                var sText = oLabel.getText();
                if (sText === "Training Link" || sText === "Url") { return "Url"; }
                if (sText === "SAP Help" || sText === "SapHelpLink") { return "SapHelpLink"; }
            }
            return "";
        },

        /**
         * Replace Url and SapHelpLink column templates with sap.m.Link controls.
         * Uses template type check — only replaces non-Link templates.
         * Called from rowsUpdated, beforeRebindTable, and delayed fallback.
         */
        _applyLinkTemplates: function (oTable) {
            if (!oTable || !oTable.getColumns) { return; }
            var that = this;
            var aColumns = oTable.getColumns();
            var bChanged = false;

            aColumns.forEach(function (oCol) {
                // Skip if column already has a Link template
                var oTpl = oCol.getTemplate();
                if (oTpl && oTpl.getMetadata && oTpl.getMetadata().getName() === "sap.m.Link") {
                    return;
                }

                var sKey = that._getColumnKey(oCol);

                if (sKey === "Url") {
                    oCol.setTemplate(new Link({
                        text: { path: "Url", formatter: function (v) { return v ? "Open Link" : ""; } },
                        href: "{Url}",
                        target: "_blank",
                        wrapping: false
                    }));
                    bChanged = true;
                    Log.info("[URLLinks] Applied Link template for Url column");
                } else if (sKey === "SapHelpLink") {
                    oCol.setTemplate(new Link({
                        text: { path: "SapHelpLink", formatter: function (v) { return v ? "SAP Help" : ""; } },
                        href: "{SapHelpLink}",
                        target: "_blank",
                        wrapping: false
                    }));
                    bChanged = true;
                    Log.info("[URLLinks] Applied Link template for SapHelpLink column");
                }
            });

            // Force re-render with new templates
            if (bChanged) {
                oTable.invalidate();
            }
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
            var oSmartFilterBar = this.byId("smartFilterBar");

            // ---- Step 1: Remove any existing Role/SapModule filters ----
            // SmartFilterBar may generate malformed filters from sap.m.Select controls
            // (Select lacks getValue()). We strip them and re-inject clean EQ filters.
            var fnStripRoleModule = function (aFilters) {
                for (var i = aFilters.length - 1; i >= 0; i--) {
                    var oF = aFilters[i];
                    if (oF.aFilters) {
                        fnStripRoleModule(oF.aFilters);
                        if (oF.aFilters.length === 0) { aFilters.splice(i, 1); }
                    } else if (oF.sPath === "Role" || oF.sPath === "SapModule") {
                        aFilters.splice(i, 1);
                    }
                }
            };
            fnStripRoleModule(mBindingParams.filters);

            // ---- Step 2: Read filter values from FilterGroupItems ----
            // This is the ONLY reliable way to read sap.m.Select values inside SmartFilterBar.
            // We iterate the SmartFilterBar's filterGroupItems, get each control, read getSelectedKey().
            if (oSmartFilterBar && oSmartFilterBar.getFilterGroupItems) {
                var aFGItems = oSmartFilterBar.getFilterGroupItems();
                for (var g = 0; g < aFGItems.length; g++) {
                    var oFGI = aFGItems[g];
                    var sName = oFGI.getName ? oFGI.getName() : "";
                    var oControl = oFGI.getControl ? oFGI.getControl() : null;
                    if (oControl && typeof oControl.getSelectedKey === "function") {
                        var sKey = oControl.getSelectedKey();
                        if (sKey) {
                            mBindingParams.filters.push(new Filter(sName, FilterOperator.EQ, sKey));
                            Log.info("[Filter] " + sName + " EQ: " + sKey + " (from FilterGroupItem)");
                        }
                    }
                }
            }

            // ---- Step 3: SEGW filter sanitizer ----
            // Convert any remaining Contains/substringof to EQ for SEGW compatibility.
            var fnSanitize = function (oFilter) {
                if (oFilter.aFilters) {
                    for (var k = 0; k < oFilter.aFilters.length; k++) {
                        oFilter.aFilters[k] = fnSanitize(oFilter.aFilters[k]);
                    }
                    return oFilter;
                }
                if ((oFilter.sPath === "Role" || oFilter.sPath === "SapModule") &&
                    oFilter.sOperator && oFilter.sOperator !== FilterOperator.EQ) {
                    return new Filter(oFilter.sPath, FilterOperator.EQ, oFilter.oValue1);
                }
                return oFilter;
            };
            for (var i = 0; i < mBindingParams.filters.length; i++) {
                mBindingParams.filters[i] = fnSanitize(mBindingParams.filters[i]);
            }

            // ---- Step 4: Basic search box → Title EQ filter ----
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

            // Debug: log final filter count and details
            Log.info("[Filter] Total filters being sent: " + mBindingParams.filters.length);
            mBindingParams.filters.forEach(function (f, idx) {
                if (f.sPath) {
                    Log.info("[Filter]   [" + idx + "] " + f.sPath + " " + f.sOperator + " " + f.oValue1);
                }
            });

            // Apply link templates + date formatting before data is bound
            var oTable = this.byId("smartTable").getTable();
            if (oTable) {
                this._applyLinkTemplates(oTable);
                this._formatDateColumns(oTable);
            }
        },

        /* ===== Admin CRUD: Create New Training ===== */
        onCreateTraining: function () {
            var that = this;
            var oModel = this.getOwnerComponent().getModel();
            if (this._createDlg) {
                this._createDlg.destroy();
                this._createDlg = null;
            }

            var oDlgModel = new JSONModel({
                title: "",
                description: "",
                role: "",
                sapModule: "",
                url: "",
                sapHelpLink: "",
                submitting: false,
                error: ""
            });

            sap.ui.require(["sap/ui/layout/form/SimpleForm"], function (SimpleForm) {
                var oForm = new SimpleForm({
                    editable: true,
                    layout: "ResponsiveGridLayout",
                    labelSpanXL: 3, labelSpanL: 3, labelSpanM: 4, labelSpanS: 12,
                    columnsXL: 1, columnsL: 1, columnsM: 1,
                    content: [
                        new sap.m.Label({ text: "Title", required: true }),
                        new sap.m.Input({ value: "{/title}", placeholder: "Training title" }),
                        new sap.m.Label({ text: "Role" }),
                        new sap.m.Input({ value: "{/role}", placeholder: "e.g. Developer, Consultant" }),
                        new sap.m.Label({ text: "Module" }),
                        new sap.m.Input({ value: "{/sapModule}", placeholder: "e.g. FI, MM, SD" }),
                        new sap.m.Label({ text: "Description" }),
                        new sap.m.TextArea({ value: "{/description}", rows: 3, placeholder: "Brief description" }),
                        new sap.m.Label({ text: "URL", required: true }),
                        new sap.m.Input({ value: "{/url}", type: "Url", placeholder: "https://learning.sap.com/..." }),
                        new sap.m.Label({ text: "SAP Help Link" }),
                        new sap.m.Input({ value: "{/sapHelpLink}", type: "Url", placeholder: "https://help.sap.com/..." })
                    ]
                });

                var oErrorStrip = new sap.m.MessageStrip({
                    text: "{/error}",
                    visible: "{= !!${/error} }",
                    type: "Error",
                    showIcon: true
                });
                oErrorStrip.addStyleClass("sapUiSmallMarginTop");

                var oContent = new sap.m.VBox({ items: [oForm, oErrorStrip] });
                oContent.addStyleClass("sapUiSmallMargin");

                that._createDlg = new sap.m.Dialog({
                    title: "Create New Training",
                    contentWidth: "560px",
                    draggable: true,
                    resizable: true,
                    content: [oContent],
                    beginButton: new sap.m.Button({
                        text: "Create",
                        type: "Emphasized",
                        icon: "sap-icon://save",
                        enabled: "{= !${/submitting} }",
                        press: function () {
                            var data = oDlgModel.getData();
                            if (!data.title || !data.title.trim()) {
                                oDlgModel.setProperty("/error", "Title is required");
                                return;
                            }
                            if (!data.url || !data.url.trim()) {
                                oDlgModel.setProperty("/error", "URL is required");
                                return;
                            }
                            oDlgModel.setProperty("/error", "");
                            oDlgModel.setProperty("/submitting", true);

                            var payload = {
                                Title: data.title.trim(),
                                Description: (data.description || "").trim(),
                                Role: (data.role || "").trim(),
                                SapModule: (data.sapModule || "").trim(),
                                Url: data.url.trim(),
                                SapHelpLink: (data.sapHelpLink || "").trim()
                            };

                            oModel.refreshSecurityToken(function () {
                                oModel.create("/Trainings", payload, {
                                    success: function () {
                                        that._createDlg.close();
                                        oDlgModel.setProperty("/submitting", false);
                                        MessageToast.show("Training created successfully");
                                        that.byId("smartTable").rebindTable(true);
                                        that._loadAnalytics();
                                    },
                                    error: function (err) {
                                        oDlgModel.setProperty("/submitting", false);
                                        var msg = "Create failed";
                                        try {
                                            var parsed = JSON.parse(err.responseText);
                                            msg = parsed.error.message.value || msg;
                                        } catch (e) {
                                            msg = (err && err.message) || msg;
                                        }
                                        oDlgModel.setProperty("/error", msg);
                                    }
                                });
                            }, function () {
                                oDlgModel.setProperty("/submitting", false);
                                oDlgModel.setProperty("/error", "Security token refresh failed");
                            });
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () { that._createDlg.close(); }
                    }),
                    afterClose: function () {
                        that._createDlg.destroy();
                        that._createDlg = null;
                    }
                });
                that._createDlg.setModel(oDlgModel);
                that._createDlg.open();
            });
        },

        /* ===== Admin CRUD: Delete Training ===== */
        onDeleteTraining: function () {
            var that = this;
            var oSmartTable = this.byId("smartTable");
            var oTable = oSmartTable.getTable();
            var iIndex = oTable.getSelectedIndex();
            if (iIndex < 0) {
                MessageToast.show("Please select a training to delete");
                return;
            }
            var oContext = oTable.getContextByIndex(iIndex);
            if (!oContext) { return; }
            var oTraining = oContext.getObject();

            MessageBox.confirm(
                "Delete training \"" + (oTraining.Title || "") + "\"?\n\nThis action cannot be undone.",
                {
                    title: "Confirm Delete",
                    emphasizedAction: MessageBox.Action.CANCEL,
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            var sPath = oContext.getPath();
                            var oModel = that.getOwnerComponent().getModel();
                            oModel.refreshSecurityToken(function () {
                                oModel.remove(sPath, {
                                    success: function () {
                                        MessageToast.show("Training deleted");
                                        oSmartTable.rebindTable(true);
                                        that._loadAnalytics();
                                    },
                                    error: function (err) {
                                        var msg = "Delete failed";
                                        try {
                                            var parsed = JSON.parse(err.responseText);
                                            msg = parsed.error.message.value || msg;
                                        } catch (e) {
                                            msg = (err && err.message) || msg;
                                        }
                                        MessageBox.error(msg);
                                    }
                                });
                            }, function () {
                                MessageBox.error("Security token refresh failed");
                            });
                        }
                    }
                }
            );
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
            var that = this;
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

            // Destroy previous dialog
            if (this._detailDlg) {
                this._detailDlg.destroy();
                this._detailDlg = null;
            }

            // Header: Title + metadata in a clean VBox layout (no overlap)
            var aHeaderItems = [
                new sap.m.Title({
                    text: oTraining.Title || "Untitled",
                    level: "H3",
                    wrapping: true
                }).addStyleClass("sapUiSmallMarginBottom")
            ];

            // Attribute chips in a wrapping row
            var aAttrs = [];
            if (oTraining.SapModule) {
                aAttrs.push(new sap.m.ObjectStatus({ title: "Module", text: oTraining.SapModule, state: "Information" }));
            }
            if (oTraining.Role) {
                aAttrs.push(new sap.m.ObjectStatus({ title: "Role", text: oTraining.Role, state: "None" }));
            }
            if (oTraining.LastUpdated) {
                var sDate = oTraining.LastUpdated;
                if (sDate instanceof Date) { sDate = sDate.toLocaleDateString(); }
                aAttrs.push(new sap.m.ObjectStatus({ title: "Updated", text: sDate + "", state: "None" }));
            }
            if (aAttrs.length > 0) {
                aHeaderItems.push(new sap.m.FlexBox({
                    wrap: "Wrap",
                    items: aAttrs
                }).addStyleClass("sapUiTinyMarginBottom detailAttrsRow"));
            }

            var aContent = [
                new sap.m.VBox({ items: aHeaderItems }).addStyleClass("sapUiSmallMargin")
            ];

            // Description section — use simple VBox with header, no Panel overflow issues
            if (oTraining.Description) {
                aContent.push(new sap.m.VBox({
                    items: [
                        new sap.m.Label({ text: "Description", design: "Bold" }).addStyleClass("sapUiSmallMarginBegin sapUiTinyMarginTop"),
                        new Text({ text: oTraining.Description, wrapping: true }).addStyleClass("sapUiSmallMargin")
                    ]
                }).addStyleClass("detailSection"));
            }

            // Links section — simple VBox layout, no Panel
            var aLinkRows = [];
            if (oTraining.Url) {
                aLinkRows.push(new sap.m.HBox({
                    alignItems: "Center",
                    items: [
                        new sap.ui.core.Icon({ src: "sap-icon://chain-link", size: "1.25rem", color: "#0070f2" }).addStyleClass("sapUiSmallMarginEnd"),
                        new Link({ text: "Open Training Link", href: oTraining.Url, target: "_blank" })
                    ]
                }).addStyleClass("sapUiTinyMargin"));
            }
            if (oTraining.SapHelpLink) {
                aLinkRows.push(new sap.m.HBox({
                    alignItems: "Center",
                    items: [
                        new sap.ui.core.Icon({ src: "sap-icon://sys-help", size: "1.25rem", color: "#0854a0" }).addStyleClass("sapUiSmallMarginEnd"),
                        new Link({ text: "Open SAP Help", href: oTraining.SapHelpLink, target: "_blank" })
                    ]
                }).addStyleClass("sapUiTinyMargin"));
            }
            if (aLinkRows.length > 0) {
                aContent.push(new sap.m.VBox({
                    items: [
                        new sap.m.Label({ text: "Resources", design: "Bold" }).addStyleClass("sapUiSmallMarginBegin sapUiTinyMarginTop")
                    ].concat(aLinkRows)
                }).addStyleClass("detailSection"));
            }

            this._detailDlg = new sap.m.Dialog({
                title: "Training Details",
                contentWidth: "480px",
                draggable: true,
                resizable: true,
                verticalScrolling: true,
                horizontalScrolling: false,
                stretch: sap.ui.Device.system.phone,
                content: aContent,
                endButton: new sap.m.Button({
                    text: "Close",
                    press: function () { that._detailDlg.close(); }
                }),
                afterClose: function () {
                    that._detailDlg.destroy();
                    that._detailDlg = null;
                }
            });
            this._detailDlg.addStyleClass("sapUiContentPadding");
            this._detailDlg.open();
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

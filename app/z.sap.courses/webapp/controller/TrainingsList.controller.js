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
    "sap/m/library",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "z/sap/courses/services/AnalyticsService"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Link, Text, Log, mLibrary, MessagePopover, MessageItem, AnalyticsService) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingsList", {

        onInit: function () {
            this._analyticsService = new AnalyticsService();

            // Analytics model for dashboard + charts
            var oAnalyticsModel = new JSONModel({
                totalTrainings: 0,
                assigned: 0,
                inProgress: 0,
                completed: 0,
                completionPercent: 0
            });
            this.getView().setModel(oAnalyticsModel, "analyticsModel");

            // Team analytics model (Manager/Admin only — BUG-4: moved from assignments page)
            var oTeamModel = new JSONModel({
                totalAssignments: 0,
                assigned: 0,
                inProgress: 0,
                completed: 0,
                completionPercent: 0,
                userBreakdown: []
            });
            this.getView().setModel(oTeamModel, "teamAnalytics");

            // Filter data model for Role/Module dropdowns + cross-filtering
            var oFilterModel = new JSONModel({
                roles: [{ key: "", text: "All" }],
                modules: [{ key: "", text: "All" }],
                allRoles: [{ key: "", text: "All" }],
                allModules: [{ key: "", text: "All" }],
                roleModuleMap: {},
                moduleRoleMap: {}
            });
            this.getView().setModel(oFilterModel, "filterData");

            this._loadAllData();

            // BUG-3 FIX: Re-load analytics when role is fetched to apply correct user filters
            var that = this;
            sap.ui.getCore().getEventBus().subscribe("sapCourses", "roleChanged", function () {
                that._loadAllData();
                // F1-FIX: Update SmartTable selection mode for new role
                that._updateTableSelectionMode();
            }, this);

            // F2: Wire Team Analytics card click handlers for drill-down
            var aTeamCards = [
                { id: "teamTotalBox",     filter: "" },
                { id: "teamAssignedBox",  filter: "Assigned" },
                { id: "teamCompletedBox", filter: "Completed" }
            ];
            aTeamCards.forEach(function (card) {
                var oCard = that.byId(card.id);
                if (oCard) {
                    oCard.addStyleClass("analyticsCardClickable");
                    oCard.attachBrowserEvent("click", function () {
                        that._openTeamDrillDown(card.filter);
                    });
                }
            });

        },

        /**
         * Consolidated data loader using AnalyticsService.
         * Training stats: single read with $inlinecount for total + module chart + filter dropdowns.
         * Assignment stats: 3 lightweight $top=0 $inlinecount calls (server-side counting).
         */
        _loadAllData: function () {
            var oModel = this.getOwnerComponent().getModel();
            var oAnalyticsModel = this.getView().getModel("analyticsModel");
            var oFilterModel = this.getView().getModel("filterData");
            var that = this;
            var sEntitySet = this.getOwnerComponent().getAssignmentEntitySet();

            // Set team analytics panel busy during load
            var oPanel = this.byId("teamAnalyticsPanel");
            if (oPanel) { oPanel.setBusy(true); }

            // Training stats: total count + module chart + filter dropdowns
            var pTrainings = this._analyticsService.getTrainingStats(oModel).then(function (oStats) {
                oAnalyticsModel.setProperty("/totalTrainings", oStats.totalTrainings);
                that._buildModuleChart(oStats.moduleDistribution);

                oFilterModel.setProperty("/roles", oStats.roles);
                oFilterModel.setProperty("/modules", oStats.modules);
                oFilterModel.setProperty("/allRoles", oStats.roles.slice(0));
                oFilterModel.setProperty("/allModules", oStats.modules.slice(0));
                oFilterModel.setProperty("/roleModuleMap", oStats.roleModuleMap);
                oFilterModel.setProperty("/moduleRoleMap", oStats.moduleRoleMap || {});
            }).catch(function () {
                oAnalyticsModel.setProperty("/totalTrainings", 0);
                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("loadFailed"));
            });

            // Training stats loaded — clear busy
            pTrainings.finally(function () {
                if (oPanel) { oPanel.setBusy(false); }
            });

            // Load team analytics on home page (Manager/Admin only)
            this._loadTeamAnalytics();
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
                    size: "L",
                    shrinkable: true,
                    width: "100%"
                });

                var colors = ["Good", "Neutral", "Critical", "Good", "Neutral", "Critical", "Good", "Neutral"];
                var iTotalModules = moduleArr.reduce(function (sum, m) { return sum + m.count; }, 0);
                var aTop = moduleArr.slice(0, 8); // FEAT-5: Show top 8 modules
                aTop.forEach(function (m, i) {
                    var iPct = iTotalModules > 0 ? Math.round((m.count / iTotalModules) * 100) : 0;
                    oChart.addData(new ComparisonMicroChartData({
                        title: m.label,
                        value: m.count,
                        color: colors[i % colors.length],
                        displayValue: m.count + " (" + iPct + "%)"
                    }));
                });

                oContainer.addItem(oChart);
            });
        },

        /* ================================================================== */
        /* TEAM ANALYTICS — Manager/Admin org-wide view (BUG-4: moved here)  */
        /* ================================================================== */

        _loadTeamAnalytics: function () {
            var sRole = this.getOwnerComponent()._role;
            if (sRole !== "Manager" && sRole !== "Admin") { return; }

            var oModel = this.getOwnerComponent().getModel();
            var oTeamModel = this.getView().getModel("teamAnalytics");
            var sEntitySet = this.getOwnerComponent().getAssignmentEntitySet();
            var that = this;

            var oPanel = this.byId("teamAnalyticsPanel");
            if (oPanel) { oPanel.setBusy(true); }

            // Manager: only see assignments where ManagerSort2 matches their username
            // (Sort2 field in SU01 User Maintenance stores the manager name)
            // Admin: see all assignments
            var aFilters = [];
            if (sRole === "Manager") {
                var sManagerId = this.getOwnerComponent().getCurrentUserId();
                if (sManagerId) {
                    aFilters.push(new Filter("ManagerSort2", FilterOperator.EQ, sManagerId));
                    Log.info("[TeamAnalytics] Filtering by ManagerSort2=" + sManagerId + " for Manager");
                }
            }

            oModel.read("/" + sEntitySet, {
                filters: aFilters,
                urlParameters: { "$inlinecount": "allpages" },
                success: function (oData) {
                    var aAll = oData.results || [];
                    var iTotal = oData.__count ? parseInt(oData.__count, 10) : aAll.length;
                    var iAssigned = 0, iInProgress = 0, iCompleted = 0;
                    var oUserMap = {};

                    aAll.forEach(function (a) {
                        if (a.Status === "Assigned") { iAssigned++; }
                        else if (a.Status === "In Progress") { iInProgress++; }
                        else if (a.Status === "Completed") { iCompleted++; }
                        var sUser = a.UserId || "UNKNOWN";
                        if (!oUserMap[sUser]) {
                            oUserMap[sUser] = { userId: sUser, userName: a.UserName || sUser, total: 0, completed: 0 };
                        }
                        oUserMap[sUser].total++;
                        if (a.Status === "Completed") { oUserMap[sUser].completed++; }
                    });

                    // Overdue: DueDate < today AND not Completed
                    var sToday = new Date().toISOString().slice(0, 10).replace(/-/g, "");
                    var iOverdue = 0;
                    aAll.forEach(function (a) {
                        if (a.Status !== "Completed" && a.DueDate) {
                            var sDue = "";
                            if (a.DueDate instanceof Date) {
                                sDue = a.DueDate.toISOString().slice(0, 10).replace(/-/g, "");
                            } else if (typeof a.DueDate === "string") {
                                sDue = a.DueDate.replace(/-/g, "").slice(0, 8);
                            }
                            if (sDue && sDue < sToday) { iOverdue++; }
                        }
                    });

                    var iPct = iTotal > 0 ? Math.round((iCompleted / iTotal) * 100) : 0;
                    oTeamModel.setProperty("/totalAssignments", iTotal);
                    oTeamModel.setProperty("/assigned", iAssigned);
                    oTeamModel.setProperty("/inProgress", iInProgress);
                    oTeamModel.setProperty("/completed", iCompleted);
                    oTeamModel.setProperty("/overdue", iOverdue);
                    oTeamModel.setProperty("/completionPercent", iPct);

                    var aUsers = Object.keys(oUserMap).map(function (k) { return oUserMap[k]; });
                    aUsers.sort(function (a, b) {
                        var pctA = a.total > 0 ? a.completed / a.total : 0;
                        var pctB = b.total > 0 ? b.completed / b.total : 0;
                        return pctB - pctA;
                    });
                    oTeamModel.setProperty("/userBreakdown", aUsers);
                    oTeamModel.setProperty("/allAssignments", aAll);
                    that._buildUserProgressList(aUsers);
                    if (oPanel) { oPanel.setBusy(false); }
                },
                error: function (err) {
                    Log.warning("[TeamAnalytics] Failed: " + (err && err.message || ""));
                    if (oPanel) { oPanel.setBusy(false); }
                }
            });
        },

        _buildUserProgressList: function (aUsers) {
            var oContainer = this.byId("teamUserListContainer");
            if (!oContainer) { return; }

            if (aUsers.length === 0) {
                oContainer.destroyItems();
                oContainer.addItem(new Text({ text: "No user assignments found" }));
                return;
            }

            var aTop = aUsers.slice(0, 10);
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            sap.ui.require([
                "sap/m/HBox", "sap/m/VBox", "sap/m/ProgressIndicator", "sap/m/ObjectStatus"
            ], function (HBox, VBox, ProgressIndicator, ObjectStatus) {
                oContainer.destroyItems();
                aTop.forEach(function (u) {
                    var iPct = u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0;
                    var sState = iPct >= 100 ? "Success" : iPct >= 50 ? "Warning" : "Error";

                    var oRow = new HBox({
                        alignItems: "Center",
                        justifyContent: "SpaceBetween",
                        width: "100%",
                        items: [
                            new VBox({
                                width: "30%",
                                items: [
                                    new Text({ text: u.userName || u.userId, wrapping: false }).addStyleClass("teamUserName"),
                                    new Text({ text: u.userId, wrapping: false }).addStyleClass("teamUserId")
                                ]
                            }),
                            new ProgressIndicator({
                                percentValue: iPct,
                                displayValue: u.completed + "/" + u.total + " (" + iPct + "%)",
                                state: sState,
                                width: "55%",
                                height: "2rem"
                            }),
                            new ObjectStatus({
                                text: iPct === 100 ? i18n.getText("done") : iPct + "%",
                                state: sState,
                                icon: iPct === 100 ? "sap-icon://accept" : ""
                            }).addStyleClass("teamUserStatus")
                        ]
                    }).addStyleClass("teamUserRow sapUiTinyMarginBottom");

                    oContainer.addItem(oRow);
                });
            });
        },

        // _loadFilterData removed: consolidated into _loadAllData (audit fix #8)

        /**
         * F1-FIX: Update SmartTable selection mode after async role change.
         * Manager/Admin get MultiToggle for bulk assign; User gets Single.
         */
        _updateTableSelectionMode: function () {
            var oSmartTable = this.byId("smartTable");
            if (!oSmartTable) { return; }
            var oTable = oSmartTable.getTable();
            if (!oTable || !oTable.setSelectionMode) { return; }
            var sRole = this.getOwnerComponent()._role || 'User';
            oTable.setSelectionMode(sRole === 'User' ? 'Single' : 'MultiToggle');
            Log.info("[SmartTable] Selection mode updated to " + (sRole === 'User' ? 'Single' : 'MultiToggle') + " for role " + sRole);
        },

        /* ================================================================== */
        /* TEAM ANALYTICS DRILL-DOWN — click analytics card to see details    */
        /* ================================================================== */

        /**
         * F2: Open drill-down dialog for Team Analytics.
         * @param {string} sStatusFilter - 'Assigned', 'Completed', or '' for all
         */
        _openTeamDrillDown: function (sStatusFilter) {
            var sRole = this.getOwnerComponent()._role;
            if (sRole !== "Manager" && sRole !== "Admin") { return; }

            var oTeamModel = this.getView().getModel("teamAnalytics");
            var aAll = oTeamModel.getProperty("/allAssignments") || [];
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            // Filter by status if specified
            var aFiltered = aAll;
            if (sStatusFilter) {
                aFiltered = aAll.filter(function (a) { return a.Status === sStatusFilter; });
            }

            // Build title
            var sTitle;
            if (sStatusFilter === "Assigned") {
                sTitle = i18n.getText("teamDrilldownPending");
            } else if (sStatusFilter === "Completed") {
                sTitle = i18n.getText("teamDrilldownCompleted");
            } else {
                sTitle = i18n.getText("teamDrilldownAll");
            }
            sTitle += " (" + aFiltered.length + ")";

            // Destroy previous
            if (this._teamDrillDownDlg) { this._teamDrillDownDlg.destroy(); this._teamDrillDownDlg = null; }

            // Create local model for filtered data
            var oDrillModel = new JSONModel({ assignments: aFiltered, dialogTitle: sTitle });
            oDrillModel.setSizeLimit(10000);
            this._drillDownModel = oDrillModel;

            var that = this;
            sap.ui.core.Fragment.load({
                name: "z.sap.courses.fragments.TeamAssignmentsDialog",
                controller: this
            }).then(function (oDialog) {
                that._teamDrillDownDlg = oDialog;
                oDialog.setModel(oDrillModel, "drillDown");
                oDialog.setModel(that.getView().getModel("i18n"), "i18n");
                oDialog.open();
            });
        },

        /**
         * F2: De-assign selected assignments from drill-down dialog.
         */
        onDeassignFromDrillDown: function () {
            var that = this;
            var oDialog = this._teamDrillDownDlg;
            if (!oDialog) { return; }

            var oTable = sap.ui.getCore().byId("teamDrillDownTable");
            if (!oTable) { return; }

            var aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectAssignmentFirst"));
                return;
            }

            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var iCount = aSelectedItems.length;

            // Collect assignment data from selected items
            var aToDelete = [];
            aSelectedItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("drillDown");
                if (oCtx) {
                    aToDelete.push(oCtx.getObject());
                }
            });

            MessageBox.confirm(i18n.getText("confirmDeassign", [iCount]), {
                title: i18n.getText("confirmDeassignTitle"),
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }

                    var oModel = that.getOwnerComponent().getModel();
                    var sEntitySet = that.getOwnerComponent().getAssignmentEntitySet();
                    var bWasBatch = oModel.bUseBatch;
                    oModel.setUseBatch(false);

                    var iSuccess = 0, iFailCount = 0;
                    var fnDeleteNext = function (idx) {
                        if (idx >= aToDelete.length) {
                            oModel.setUseBatch(bWasBatch);
                            if (iSuccess > 0) {
                                MessageToast.show(i18n.getText("deassignSuccess", [iSuccess]));
                                // Refresh team analytics
                                that._loadTeamAnalytics();
                                // Close dialog
                                if (that._teamDrillDownDlg) { that._teamDrillDownDlg.close(); }
                            } else {
                                MessageBox.error(i18n.getText("deassignFailed"));
                            }
                            return;
                        }

                        var oAssignment = aToDelete[idx];
                        var sKey = oAssignment.Id || oAssignment.ID;
                        if (!sKey) {
                            iFailCount++;
                            fnDeleteNext(idx + 1);
                            return;
                        }

                        // Build OData path using GUID key
                        var sPath = "/" + sEntitySet + "(guid'" + sKey + "')";
                        oModel.remove(sPath, {
                            success: function () {
                                iSuccess++;
                                fnDeleteNext(idx + 1);
                            },
                            error: function (err) {
                                iFailCount++;
                                Log.warning("[DeassignDrillDown] DELETE failed for " + sKey + ": " + (err && err.message || ""));
                                fnDeleteNext(idx + 1);
                            }
                        });
                    };

                    oModel.refreshSecurityToken(function () {
                        fnDeleteNext(0);
                    }, function () {
                        oModel.setUseBatch(bWasBatch);
                        MessageBox.error(i18n.getText("securityTokenFailed"));
                    });
                }
            });
        },

        /**
         * F2: Close the Team Assignments drill-down dialog.
         */
        onCloseDrillDown: function () {
            if (this._teamDrillDownDlg) {
                this._teamDrillDownDlg.close();
                this._teamDrillDownDlg.destroy();
                this._teamDrillDownDlg = null;
            }
        },

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
         * Cross-filtering: when Module changes, filter Role dropdown
         * to only show roles available for the selected module.
         */
        onModuleFilterChange: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            var sModule = oItem ? oItem.getKey() : "";
            var oFilterModel = this.getView().getModel("filterData");
            var moduleRoleMap = oFilterModel.getProperty("/moduleRoleMap") || {};
            var allRoles = oFilterModel.getProperty("/allRoles") || [];

            if (!sModule) {
                oFilterModel.setProperty("/roles", allRoles.slice(0));
            } else {
                var rolesForModule = moduleRoleMap[sModule] || {};
                var filtered = [{ key: "", text: "All" }];
                Object.keys(rolesForModule).sort().forEach(function (r) {
                    filtered.push({ key: r, text: r });
                });
                oFilterModel.setProperty("/roles", filtered);
            }
            var oRoleSelect = this.byId("filterRole");
            if (oRoleSelect) { oRoleSelect.setSelectedKey(""); }
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
                // Manager/Admin: MultiToggle for bulk assign; User: Single for view details
                var sRole = this.getOwnerComponent()._role || 'User';
                oTable.setSelectionMode(sRole === 'User' ? 'Single' : 'MultiToggle');
                oTable.setSelectionBehavior("RowSelector");
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
                            if (sUrl && /^https?:\/\//i.test(sUrl)) {
                                sap.m.URLHelper.redirect(sUrl, true);
                            } else if (sUrl) {
                                Log.warning("[Security] Blocked non-HTTP URL: " + sUrl);
                                MessageToast.show("Invalid URL protocol — only HTTP/HTTPS links are allowed");
                            }
                        }
                    }
                });
            }

            // FIX: Remove duplicate export-to-Excel buttons generated by SmartTable
            var oInternalToolbar = oSmartTable._oToolbar || oSmartTable.getAggregation("_toolbar");
            if (oInternalToolbar) {
                var aToolbarContent = oInternalToolbar.getContent();
                var bFoundExport = false;
                for (var ti = aToolbarContent.length - 1; ti >= 0; ti--) {
                    var oBtn = aToolbarContent[ti];
                    if (oBtn.getIcon && (oBtn.getIcon() === "sap-icon://excel-attachment" || oBtn.getIcon() === "sap-icon://download")) {
                        if (bFoundExport) {
                            oInternalToolbar.removeContent(oBtn);
                            oBtn.destroy();
                            Log.info("[SmartTable] Removed duplicate export button");
                        }
                        bFoundExport = true;
                    }
                }
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

            // ---- Step 4: Basic search box → Title Contains filter (ABAP does LIKE) ----
            var sSearchVal = "";
            if (oSmartFilterBar && oSmartFilterBar.getBasicSearchValue) {
                sSearchVal = (oSmartFilterBar.getBasicSearchValue() || "").trim();
            }
            if (sSearchVal) {
                mBindingParams.filters.push(new Filter("Title", FilterOperator.Contains, sSearchVal));
                Log.info("[Filter] Title Contains (from basic search): " + sSearchVal);
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

        /* ===== Admin CRUD: Create New Training (XML Fragment + VH Selects) ===== */
        onCreateTraining: function () {
            var that = this;
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

            this.loadFragment({
                name: "z.sap.courses.fragments.CreateTrainingDialog"
            }).then(function (oDialog) {
                that._createDlg = oDialog;
                oDialog.setModel(oDlgModel, "createModel");
                // Attach OData model for VH selects (RolesVH/ModulesVH entity sets)
                oDialog.setModel(that.getOwnerComponent().getModel());
                oDialog.setModel(that.getView().getModel("i18n"), "i18n");
                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                    that._createDlg = null;
                });
                oDialog.open();
            });
        },

        onCreateTrainingSave: function () {
            var that = this;
            var oDlgModel = this._createDlg.getModel("createModel");
            var oModel = this.getOwnerComponent().getModel();
            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var data = oDlgModel.getData();

            if (!data.title || !data.title.trim()) {
                oDlgModel.setProperty("/error", i18n.getText("titleRequired"));
                return;
            }
            if (!data.url || !data.url.trim()) {
                oDlgModel.setProperty("/error", i18n.getText("urlRequired"));
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
                        MessageToast.show(i18n.getText("trainingCreated"));
                        that.byId("smartTable").rebindTable(true);
                        that._loadAnalytics();
                    },
                    error: function (err) {
                        oDlgModel.setProperty("/submitting", false);
                        var msg = i18n.getText("createFailed");
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
                oDlgModel.setProperty("/error", i18n.getText("securityTokenFailed"));
            });
        },

        onCreateTrainingCancel: function () {
            if (this._createDlg) { this._createDlg.close(); }
        },

        /* ===== Admin CRUD: Delete Training (multi-select) ===== */
        onDeleteTraining: function () {
            var that = this;
            var oSmartTable = this.byId("smartTable");
            var oTable = oSmartTable.getTable();
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            // WF-7: Support multi-select delete
            var aIndices = oTable.getSelectedIndices();
            if (!aIndices || aIndices.length === 0) {
                MessageToast.show(i18n.getText("selectTrainingsToDelete"));
                return;
            }

            // Gather all selected contexts
            var aContexts = [];
            aIndices.forEach(function (iIdx) {
                var oCtx = oTable.getContextByIndex(iIdx);
                if (oCtx) { aContexts.push(oCtx); }
            });

            if (aContexts.length === 0) { return; }

            // Build confirmation message
            var sMsg;
            if (aContexts.length === 1) {
                var oTraining = aContexts[0].getObject();
                sMsg = "Delete training \"" + (oTraining.Title || "") + "\"?\n\nThis action cannot be undone.";
            } else {
                sMsg = i18n.getText("confirmBulkDeleteText", [aContexts.length]);
            }

            MessageBox.confirm(sMsg, {
                title: i18n.getText("confirmDeleteTitle"),
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var oModel = that.getOwnerComponent().getModel();
                        oModel.refreshSecurityToken(function () {
                            var iDone = 0, iFail = 0, iTotal = aContexts.length;
                            aContexts.forEach(function (oCtx) {
                                oModel.remove(oCtx.getPath(), {
                                    success: function () {
                                        iDone++;
                                        if (iDone + iFail === iTotal) {
                                            MessageToast.show(i18n.getText("bulkDeleteSuccess", [iDone]));
                                            oSmartTable.rebindTable(true);
                                            that._loadAnalytics();
                                        }
                                    },
                                    error: function (err) {
                                        iFail++;
                                        if (iDone + iFail === iTotal) {
                                            if (iDone > 0) {
                                                MessageToast.show(i18n.getText("bulkDeleteSuccess", [iDone]));
                                            } else {
                                                var msg = i18n.getText("deleteFailed");
                                                try {
                                                    var parsed = JSON.parse(err.responseText);
                                                    msg = parsed.error.message.value || msg;
                                                } catch (e) { /* keep default */ }
                                                MessageBox.error(msg);
                                            }
                                            oSmartTable.rebindTable(true);
                                            that._loadAnalytics();
                                        }
                                    }
                                });
                            });
                        }, function () {
                            MessageBox.error(i18n.getText("securityTokenFailed"));
                        });
                    }
                }
            });
        },

        onRefresh: function () {
            var oSmartTable = this.byId("smartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable(true);
            }
            this._loadAnalytics();
            MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("dataRefreshed"));
        },

        /* ===== Self-Enrollment: User enrolls themselves (PG-7) ===== */
        onEnrollMe: function () {
            var that = this;
            var oSmartTable = this.byId("smartTable");
            var oTable = oSmartTable.getTable();
            var iIndex = oTable.getSelectedIndex();
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            if (iIndex < 0) {
                MessageToast.show(i18n.getText("selectTrainingToEnroll"));
                return;
            }
            var oContext = oTable.getContextByIndex(iIndex);
            if (!oContext) { return; }
            var oTraining = oContext.getObject();

            var oComponent = this.getOwnerComponent();
            var sUserId = oComponent.getCurrentUserId();
            var sEntitySet = oComponent.getAssignmentEntitySet();
            var oModel = oComponent.getModel();

            // Build self-enrollment payload
            var oPayload = {
                TrainingId: oTraining.Id,
                Title: oTraining.Title,
                Role: oTraining.Role || "",
                SapModule: oTraining.SapModule || "",
                Url: oTraining.Url || "",
                Status: "Assigned",
                UserId: sUserId,
                UserName: sUserId,
                DueDate: null,
                AssignedBy: sUserId,
                AssignedByName: sUserId
            };

            oModel.refreshSecurityToken(function () {
                oModel.create("/" + sEntitySet, oPayload, {
                    success: function () {
                        MessageToast.show(i18n.getText("enrollSuccess"));
                    },
                    error: function (err) {
                        var msg = i18n.getText("createFailed");
                        try {
                            var parsed = JSON.parse(err.responseText);
                            msg = parsed.error.message.value || msg;
                        } catch (e) { /* keep default */ }
                        // Duplicate check returns business error
                        if (msg.indexOf("already assigned") > -1 || msg.indexOf("duplicate") > -1) {
                            MessageToast.show(i18n.getText("alreadyEnrolled"));
                        } else {
                            MessageBox.error(msg);
                        }
                    }
                });
            }, function () {
                MessageBox.error(i18n.getText("securityTokenFailed"));
            });
        },

        /* ===== UI-11: MessagePopover for global error display ===== */
        onMessagePopoverPress: function (oEvent) {
            if (!this._oMessagePopover) {
                this._oMessagePopover = new MessagePopover({
                    items: {
                        path: "message>/",
                        template: new MessageItem({
                            type: "{message>type}",
                            title: "{message>message}",
                            subtitle: "{message>additionalText}",
                            description: "{message>description}"
                        })
                    }
                });
                this.getView().addDependent(this._oMessagePopover);
            }
            this._oMessagePopover.toggle(oEvent.getSource());
        },

        onViewDetails: function () {
            var that = this;
            var oSmartTable = this.byId("smartTable");
            var oTable = oSmartTable.getTable();
            var iIndex = oTable.getSelectedIndex();
            var i18n = this.getView().getModel("i18n").getResourceBundle();
            if (iIndex < 0) {
                MessageToast.show(i18n.getText("selectTrainingFirst"));
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

            // Header: Modern card layout with icon + title + badges
            var aHeaderItems = [
                new sap.m.HBox({
                    alignItems: "Center",
                    items: [
                        new sap.ui.core.Icon({ src: "sap-icon://course-book", size: "2rem", color: "#0070f2" }).addStyleClass("sapUiSmallMarginEnd"),
                        new sap.m.Title({
                            text: oTraining.Title || "Untitled",
                            level: "H3",
                            wrapping: true
                        })
                    ]
                }).addStyleClass("sapUiSmallMarginBottom")
            ];

            // Attribute badges in a wrapping row
            var aAttrs = [];
            if (oTraining.SapModule) {
                aAttrs.push(new sap.m.GenericTag({
                    text: oTraining.SapModule,
                    design: "StatusIconHidden",
                    status: "Information"
                }));
            }
            if (oTraining.Role) {
                aAttrs.push(new sap.m.GenericTag({
                    text: oTraining.Role,
                    design: "StatusIconHidden",
                    status: "None"
                }));
            }
            if (oTraining.LastUpdated) {
                var sDate = oTraining.LastUpdated;
                if (sDate instanceof Date) { sDate = sDate.toLocaleDateString(); }
                aAttrs.push(new sap.m.GenericTag({
                    text: "Updated: " + sDate,
                    design: "StatusIconHidden",
                    status: "Success"
                }));
            }
            if (aAttrs.length > 0) {
                aHeaderItems.push(new sap.m.FlexBox({
                    wrap: "Wrap",
                    items: aAttrs
                }).addStyleClass("sapUiTinyMarginBottom detailAttrsRow"));
            }

            var aContent = [
                new sap.m.VBox({ items: aHeaderItems }).addStyleClass("detailHeaderCard")
            ];

            // Description section — modern card with subtle bg
            if (oTraining.Description) {
                aContent.push(new sap.m.VBox({
                    items: [
                        new sap.m.HBox({
                            alignItems: "Center",
                            items: [
                                new sap.ui.core.Icon({ src: "sap-icon://document-text", size: "1.125rem", color: "#556b82" }).addStyleClass("sapUiSmallMarginEnd"),
                                new sap.m.Label({ text: i18n.getText("descriptionLabel"), design: "Bold" })
                            ]
                        }),
                        new Text({ text: oTraining.Description, wrapping: true }).addStyleClass("sapUiSmallMarginTop")
                    ]
                }).addStyleClass("detailCard"));
            }

            // Links section — modern card with action buttons
            var aLinkRows = [];
            if (oTraining.Url) {
                aLinkRows.push(new sap.m.Button({
                    text: i18n.getText("openTrainingLink"),
                    icon: "sap-icon://chain-link",
                    type: "Transparent",
                    press: function () {
                        sap.m.URLHelper.redirect(oTraining.Url, true);
                    }
                }).addStyleClass("detailLinkBtn"));
            }
            if (oTraining.SapHelpLink) {
                aLinkRows.push(new sap.m.Button({
                    text: i18n.getText("openSapHelp"),
                    icon: "sap-icon://sys-help",
                    type: "Transparent",
                    press: function () {
                        sap.m.URLHelper.redirect(oTraining.SapHelpLink, true);
                    }
                }).addStyleClass("detailLinkBtn"));
            }
            if (aLinkRows.length > 0) {
                aContent.push(new sap.m.VBox({
                    items: [
                        new sap.m.HBox({
                            alignItems: "Center",
                            items: [
                                new sap.ui.core.Icon({ src: "sap-icon://action", size: "1.125rem", color: "#556b82" }).addStyleClass("sapUiSmallMarginEnd"),
                                new sap.m.Label({ text: i18n.getText("resourcesLabel"), design: "Bold" })
                            ]
                        }),
                        new sap.m.HBox({
                            wrap: "Wrap",
                            items: aLinkRows
                        }).addStyleClass("sapUiSmallMarginTop detailLinksRow")
                    ]
                }).addStyleClass("detailCard"));
            }

            // Training ID section — info card
            aContent.push(new sap.m.VBox({
                items: [
                    new sap.m.HBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://bar-code", size: "1.125rem", color: "#556b82" }).addStyleClass("sapUiSmallMarginEnd"),
                            new sap.m.Label({ text: "Training ID", design: "Bold" })
                        ]
                    }),
                    new Text({ text: oTraining.Id || "N/A" }).addStyleClass("sapUiSmallMarginTop detailIdText")
                ]
            }).addStyleClass("detailCard"));

            this._detailDlg = new sap.m.Dialog({
                title: i18n.getText("trainingDetails"),
                contentWidth: "520px",
                draggable: true,
                resizable: true,
                verticalScrolling: true,
                horizontalScrolling: false,
                stretch: sap.ui.Device.system.phone,
                content: aContent,
                endButton: new sap.m.Button({
                    text: i18n.getText("closeButton"),
                    type: "Emphasized",
                    press: function () { that._detailDlg.close(); }
                }),
                afterClose: function () {
                    that._detailDlg.destroy();
                    that._detailDlg = null;
                }
            });
            this._detailDlg.addStyleClass("sapUiContentPadding detailDialog");
            this._detailDlg.open();
        },

        onAssignTraining: function () {
            var oComponent = this.getOwnerComponent();
            if (!oComponent || !oComponent.openAssignDialog) { return; }

            // Collect selected trainings from SmartTable (multi-select)
            var oSmartTable = this.byId("smartTable");
            var oTable = oSmartTable ? oSmartTable.getTable() : null;
            var aSelectedTrainings = [];
            if (oTable && oTable.getSelectedIndices) {
                var aIndices = oTable.getSelectedIndices();
                aIndices.forEach(function (idx) {
                    var oCtx = oTable.getContextByIndex(idx);
                    if (oCtx) { aSelectedTrainings.push(oCtx.getObject()); }
                });
            }

            if (aSelectedTrainings.length === 0) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectTrainingFirst"));
                return;
            }

            oComponent.openAssignDialog(aSelectedTrainings);
        },

        onViewAssignments: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TrainingAssignmentsList");
        }
    });
});

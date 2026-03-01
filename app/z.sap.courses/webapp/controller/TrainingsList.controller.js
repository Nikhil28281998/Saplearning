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
    "z/sap/courses/services/AnalyticsService",
    "z/sap/courses/utils/formatter"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Link, Text, Log, mLibrary, MessagePopover, MessageItem, AnalyticsService, SharedFormatter) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingsList", {

        /**
         * D-2 FIX: Delegate to shared formatter (z/sap/courses/utils/formatter.js)
         */
        getModuleIcon: function (sSapModule) { return SharedFormatter.getModuleIcon(sSapModule); },
        getModuleIconColor: function (sSapModule) { return SharedFormatter.getModuleIconColor(sSapModule); },

        /**
         * 3-2 FIX: Delegate to shared formatter
         */
        formatCompletedRemaining: function (sPattern, iCompleted, iTotal) {
            return SharedFormatter.formatCompletedRemaining(sPattern, iCompleted, iTotal);
        },

        onInit: function () {
            this._analyticsService = new AnalyticsService();

            // View mode model for card/table toggle
            var oViewModeModel = new JSONModel({
                showCards: true,
                showTable: false,
                mode: "cards",
                cardCount: 0
            });
            this.getView().setModel(oViewModeModel, "viewMode");

            // Analytics model for dashboard + charts
            var oAnalyticsModel = new JSONModel({
                totalTrainings: 0,
                assigned: 0,
                inProgress: 0,
                completed: 0,
                completionPercent: 0,
                moduleDistribution: []
            });
            this.getView().setModel(oAnalyticsModel, "analyticsModel");

            // Team analytics model (Manager/Admin only — BUG-4: moved from assignments page)
            var oTeamModel = new JSONModel({
                totalAssignments: 0,
                assigned: 0,
                inProgress: 0,
                completed: 0,
                overdue: 0,
                completionPercent: 0,
                userBreakdown: [],
                pendingBadge: 0,          // C1: notification badge count (assigned + overdue)
                moduleAssignmentStats: [], // D3: module-level coverage stats
                allAssignments: []
            });
            this.getView().setModel(oTeamModel, "teamAnalytics");

            // Filter data model for Role/Topic/Module dropdowns + cross-filtering
            var oFilterModel = new JSONModel({
                roles: [{ key: "", text: "All" }],
                topics: [{ key: "", text: "All" }],
                modules: [{ key: "", text: "All" }],
                allRoles: [{ key: "", text: "All" }],
                allTopics: [{ key: "", text: "All" }],
                allModules: [{ key: "", text: "All" }],
                roleModuleMap: {},
                topicModuleMap: {},
                moduleTopicMap: {}
            });
            this.getView().setModel(oFilterModel, "filterData");

            // BUG-3 FIX: declare 'that' before any closure that references it
            var that = this;

            // MD-13: Debounce data loads to prevent triple-fire on init + roleChanged + userIdResolved
            this._loadDataDebounceTimer = null;
            this._debouncedLoadAllData = function () {
                if (that._loadDataDebounceTimer) { clearTimeout(that._loadDataDebounceTimer); }
                that._loadDataDebounceTimer = setTimeout(function () {
                    that._loadAllData();
                }, 300);
            };

            this._loadAllData();

            // Re-load analytics when role is fetched to apply correct user filters
            this._onRoleChanged = function () {
                that._debouncedLoadAllData();
                that._updateTableSelectionMode();
            };
            // FIX 7.4: Use component EventBus instead of deprecated sap.ui.getCore().getEventBus()
            oComponent.getEventBus().subscribe("sapCourses", "roleChanged", this._onRoleChanged, this);

            // Re-load data when userId is resolved from backend (async)
            this._onUserIdResolved = function () {
                that._debouncedLoadAllData();
            };
            oComponent.getEventBus().subscribe("sapCourses", "userIdResolved", this._onUserIdResolved, this);

            // F2: Wire Team Analytics card click handlers for drill-down
            this._aTeamCardIds = ["teamTotalBox", "teamAssignedBox", "teamInProgressBox", "teamOverdueBox", "teamCompletedBox"];
            var aTeamCards = [
                { id: "teamTotalBox",       filter: "" },
                { id: "teamAssignedBox",    filter: "Assigned" },
                { id: "teamInProgressBox",  filter: "In Progress" },
                { id: "teamOverdueBox",     filter: "Overdue" },
                { id: "teamCompletedBox",   filter: "Completed" }
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
         * D-1: Cleanup EventBus subscriptions and browser events on view destroy.
         */
        onExit: function () {
            // FIX 7.4: Use component EventBus instead of deprecated sap.ui.getCore()
            var oComponent = this.getOwnerComponent();
            if (oComponent) {
                oComponent.getEventBus().unsubscribe("sapCourses", "roleChanged", this._onRoleChanged, this);
                oComponent.getEventBus().unsubscribe("sapCourses", "userIdResolved", this._onUserIdResolved, this);
            }
            var that = this;
            if (this._aTeamCardIds) {
                this._aTeamCardIds.forEach(function (id) {
                    var oCard = that.byId(id);
                    if (oCard) { oCard.detachBrowserEvent("click"); }
                });
            }
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

            // M-6 FIX: Add skeleton class to team KPI cards during load
            this._setTeamCardSkeletons(true);

            // Training stats: total count + module chart + filter dropdowns
            var pTrainings = this._analyticsService.getTrainingStats(oModel).then(function (oStats) {
                oAnalyticsModel.setProperty("/totalTrainings", oStats.totalTrainings);
                that._buildModuleChart(oStats.moduleDistribution);

                oFilterModel.setProperty("/roles", oStats.roles);
                oFilterModel.setProperty("/topics", oStats.topics);
                oFilterModel.setProperty("/modules", oStats.modules);
                oFilterModel.setProperty("/allRoles", oStats.roles.slice(0));
                oFilterModel.setProperty("/allTopics", oStats.topics.slice(0));
                oFilterModel.setProperty("/allModules", oStats.modules.slice(0));
                oFilterModel.setProperty("/roleModuleMap", oStats.roleModuleMap);
                oFilterModel.setProperty("/topicModuleMap", oStats.topicModuleMap);
                oFilterModel.setProperty("/moduleTopicMap", oStats.moduleTopicMap || {});
            }).catch(function () {
                oAnalyticsModel.setProperty("/totalTrainings", 0);
                MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("loadFailed"));
            });

            // Training stats loaded — clear busy + skeletons, then bind card grid
            pTrainings.finally(function () {
                if (oPanel) { oPanel.setBusy(false); }
                that._setTeamCardSkeletons(false);
                // Initial card grid binding after data is available
                that._rebindCardGrid();
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
         * M-6 FIX: Toggle skeleton loading animation on team KPI cards.
         */
        _setTeamCardSkeletons: function (bShow) {
            var aCardIds = ["teamTotalBox", "teamAssignedBox", "teamInProgressBox", "teamOverdueBox", "teamCompletedBox"];
            var that = this;
            aCardIds.forEach(function (id) {
                var oCard = that.byId(id);
                if (oCard) {
                    if (bShow) { oCard.addStyleClass("analyticsCardSkeleton"); }
                    else { oCard.removeStyleClass("analyticsCardSkeleton"); }
                }
            });
        },

        /**
         * AN-2: Populate module distribution data for ProgressIndicator bars.
         * The view binds to analyticsModel>/moduleDistribution — declarative.
         */
        _buildModuleChart: function (moduleArr) {
            var oAnalyticsModel = this.getView().getModel("analyticsModel");
            if (!oAnalyticsModel) { return; }

            if (!moduleArr || moduleArr.length === 0) {
                oAnalyticsModel.setProperty("/moduleDistribution", []);
                return;
            }

            var aTop = moduleArr.slice(0, 5);
            var iMaxCount = aTop.length > 0 ? aTop[0].count : 1; // already sorted desc
            var iTotalModules = moduleArr.reduce(function (sum, m) { return sum + m.count; }, 0);

            var aChartData = aTop.map(function (m) {
                var iPct = iTotalModules > 0 ? Math.round((m.count / iTotalModules) * 100) : 0;
                var iBarPct = iMaxCount > 0 ? Math.round((m.count / iMaxCount) * 100) : 0;
                return {
                    label: m.label,
                    count: m.count,
                    percentOfMax: iBarPct,
                    displayValue: m.count + " (" + iPct + "%)"
                };
            });

            oAnalyticsModel.setProperty("/moduleDistribution", aChartData);
        },

        /* ================================================================== */
        /* TEAM ANALYTICS — Manager/Admin org-wide view (BUG-4: moved here)  */
        /* ================================================================== */

        _loadTeamAnalytics: function () {
            var sRole = this.getOwnerComponent()._role;
            if (sRole !== "Manager" && sRole !== "Admin") { return; }

            var oModel = this.getOwnerComponent().getModel();
            var oTeamModel = this.getView().getModel("teamAnalytics");
            var that = this;

            var oPanel = this.byId("teamAnalyticsPanel");
            if (oPanel) { oPanel.setBusy(true); }

            Log.info("[TeamAnalytics] Loading for role: " + sRole);

            // Check if getTeamAnalytics FunctionImport exists in $metadata
            // If not defined in SEGW, skip directly to client-side fallback
            var bHasFunctionImport = false;
            try {
                var oMeta = oModel.getServiceMetadata();
                if (oMeta && oMeta.dataServices && oMeta.dataServices.schema) {
                    for (var si = 0; si < oMeta.dataServices.schema.length; si++) {
                        var aContainers = oMeta.dataServices.schema[si].entityContainer || [];
                        for (var ci = 0; ci < aContainers.length; ci++) {
                            var aFuncImports = aContainers[ci].functionImport || [];
                            for (var fi = 0; fi < aFuncImports.length; fi++) {
                                if (aFuncImports[fi].name === "getTeamAnalytics") {
                                    bHasFunctionImport = true;
                                }
                            }
                        }
                    }
                }
            } catch (metaErr) {
                Log.info("[TeamAnalytics] Metadata check failed: " + metaErr.message);
            }

            if (!bHasFunctionImport) {
                Log.info("[TeamAnalytics] No getTeamAnalytics FunctionImport in metadata — using client-side fallback");
                that._loadTeamAnalyticsFallback();
                return;
            }

            // Server-side getTeamAnalytics FunctionImport exists — call it
            try {
                var bWasBatch = oModel.bUseBatch;
                oModel.setUseBatch(false);
                oModel.callFunction("/getTeamAnalytics", {
                    method: "GET",
                    success: function (oData) {
                        oModel.setUseBatch(bWasBatch);
                        var oResult = oData;
                        // Handle wrapped response: { getTeamAnalytics: { ... } }
                        if (oData && oData.getTeamAnalytics) { oResult = oData.getTeamAnalytics; }

                        // Handle both camelCase (CAP/CDS) and PascalCase (ABAP Gateway) property names
                        var _g = function (o, cc, pc) { return o[cc] !== undefined ? o[cc] : (o[pc] !== undefined ? o[pc] : 0); };
                        oTeamModel.setProperty("/totalAssignments", _g(oResult, "totalAssignments", "TotalAssignments"));
                        oTeamModel.setProperty("/assigned", _g(oResult, "assigned", "Assigned"));
                        oTeamModel.setProperty("/inProgress", _g(oResult, "inProgress", "InProgress"));
                        oTeamModel.setProperty("/completed", _g(oResult, "completed", "Completed"));
                        oTeamModel.setProperty("/overdue", _g(oResult, "overdue", "Overdue"));
                        oTeamModel.setProperty("/completionPercent", _g(oResult, "completionPercent", "CompletionPercent"));

                        // Normalize userBreakdown to camelCase (view binds to camelCase)
                        var aRawUsers = oResult.userBreakdown || oResult.UserBreakdown || [];
                        var aNormUsers = aRawUsers.map(function (u) {
                            return {
                                userId:    u.userId    || u.UserId    || "",
                                userName:  u.userName  || u.UserName  || "",
                                total:     u.total     !== undefined ? u.total     : (u.Total     || 0),
                                completed: u.completed !== undefined ? u.completed : (u.Completed || 0)
                            };
                        });
                        oTeamModel.setProperty("/userBreakdown", aNormUsers);

                        // C1: Pending badge
                        oTeamModel.setProperty("/pendingBadge",
                            _g(oResult, "assigned", "Assigned") + _g(oResult, "overdue", "Overdue"));

                        if (oPanel) { oPanel.setBusy(false); }

                        // FIX-1: Always load flat assignments for drill-down clicks
                        that._loadTeamAssignmentsForDrillDown();
                    },
                    error: function (err) {
                        oModel.setUseBatch(bWasBatch);
                        Log.warning("[TeamAnalytics] getTeamAnalytics failed, falling back to client-side: " + (err && err.message || ""));
                        // Fallback: load client-side (backward compat with older ABAP backends)
                        that._loadTeamAnalyticsFallback();
                    }
                });
            } catch (ex) {
                Log.warning("[TeamAnalytics] callFunction threw: " + ex.message + ", using fallback");
                that._loadTeamAnalyticsFallback();
            }
        },

        /**
         * FIX-1: Load flat assignment data for drill-down dialogs.
         * Server-side getTeamAnalytics returns aggregated counts only;
         * drill-down needs the individual assignment records.
         */
        /**
         * M-1 FIX: Recursive pagination — loads ALL assignments (no $top cap).
         * Fetches in pages of 500 until server returns fewer than requested.
         */
        _loadTeamAssignmentsForDrillDown: function () {
            var sRole = this.getOwnerComponent()._role;
            var oModel = this.getOwnerComponent().getModel();
            var oTeamModel = this.getView().getModel("teamAnalytics");
            var sEntitySet = this.getOwnerComponent().getAssignmentEntitySet();

            var aFilters = [];
            if (sRole === "Manager") {
                var sManagerId = this.getOwnerComponent().getCurrentUserId();
                if (sManagerId) {
                    aFilters.push(new Filter("ManagerSort2", FilterOperator.EQ, sManagerId));
                }
            }

            var iPageSize = 500;
            var aAll = [];

            var fnLoadPage = function (iSkip) {
                oModel.read("/" + sEntitySet, {
                    filters: aFilters,
                    urlParameters: { "$inlinecount": "allpages", "$top": String(iPageSize), "$skip": String(iSkip) },
                    success: function (oData) {
                        var aPage = oData.results || [];
                        aAll = aAll.concat(aPage);
                        if (aPage.length >= iPageSize) {
                            fnLoadPage(iSkip + iPageSize);
                        } else {
                            oTeamModel.setProperty("/allAssignments", aAll);
                            Log.info("[TeamAnalytics] Loaded " + aAll.length + " assignments for drill-down");
                        }
                    },
                    error: function (err) {
                        Log.warning("[TeamAnalytics] Failed to load flat assignments for drill-down: " + (err && err.message || ""));
                        oTeamModel.setProperty("/allAssignments", aAll);
                    }
                });
            };

            fnLoadPage(0);
        },

        /**
         * NEW-8: Fallback client-side team analytics (for backends without getTeamAnalytics).
         */
        _loadTeamAnalyticsFallback: function () {
            var sRole = this.getOwnerComponent()._role;
            var oModel = this.getOwnerComponent().getModel();
            var oTeamModel = this.getView().getModel("teamAnalytics");
            var sEntitySet = this.getOwnerComponent().getAssignmentEntitySet();
            var that = this;

            // Manage panel busy state independently for fallback
            var oPanel = this.byId("teamAnalyticsPanel");
            if (oPanel) { oPanel.setBusy(true); }

            Log.info("[TeamAnalytics] Fallback: reading " + sEntitySet + " for role=" + sRole);

            var aFilters = [];
            if (sRole === "Manager") {
                var sManagerId = this.getOwnerComponent().getCurrentUserId();
                if (sManagerId) {
                    aFilters.push(new Filter("ManagerSort2", FilterOperator.EQ, sManagerId));
                    Log.info("[TeamAnalytics] Fallback filter: ManagerSort2 EQ " + sManagerId);
                } else {
                    Log.warning("[TeamAnalytics] Fallback: Manager userId not resolved — cannot filter");
                    if (oPanel) { oPanel.setBusy(false); }
                    return;
                }
            }

            var iPageSize = 500;
            var aAllPages = [];

            var fnLoadFallbackPage = function (iSkip) {
                oModel.read("/" + sEntitySet, {
                    filters: aFilters,
                    urlParameters: { "$inlinecount": "allpages", "$top": String(iPageSize), "$skip": String(iSkip) },
                    success: function (oData) {
                        var aPage = oData.results || [];
                        aAllPages = aAllPages.concat(aPage);
                        if (aPage.length >= iPageSize) {
                            fnLoadFallbackPage(iSkip + iPageSize);
                            return;
                        }
                        // All pages loaded — aggregate
                        var aAll = aAllPages;
                        var iTotal = oData.__count ? parseInt(oData.__count, 10) : aAll.length;
                        var iAssigned = 0, iInProgress = 0, iCompleted = 0;
                        var oUserMap = {};

                        // Handle both PascalCase (ABAP/V2) and camelCase (CAP/V4) field names
                        aAll.forEach(function (a) {
                            var sStat = a.Status || a.status || "";
                            if (sStat === "Assigned") { iAssigned++; }
                            else if (sStat === "In Progress") { iInProgress++; }
                            else if (sStat === "Completed") { iCompleted++; }
                            var sUser = a.UserId || a.userId || "UNKNOWN";
                            var sName = a.UserName || a.userName || sUser;
                            if (!oUserMap[sUser]) {
                                oUserMap[sUser] = { userId: sUser, userName: sName, total: 0, completed: 0, inProgress: 0, overdue: 0 };
                            }
                            oUserMap[sUser].total++;
                            if (sStat === "Completed") { oUserMap[sUser].completed++; }
                            if (sStat === "In Progress") { oUserMap[sUser].inProgress++; }
                        });

                        var dNow = new Date();
                        var sToday = String(dNow.getFullYear()) + String(dNow.getMonth() + 1).padStart(2, '0') + String(dNow.getDate()).padStart(2, '0');
                        var iOverdue = 0;
                        var oModuleMap = {};  // module-level assignment stats

                        aAll.forEach(function (a) {
                            var sStat2 = a.Status || a.status || "";
                            var dDue = a.DueDate || a.dueDate;
                            var sModule = a.SapModule || a.sapModule || "Other";
                            var sUser2 = a.UserId || a.userId || "UNKNOWN";
                            var bOverdueItem = false;

                            if (sStat2 !== "Completed" && dDue) {
                                var sDue = "";
                                if (dDue instanceof Date) {
                                    sDue = String(dDue.getFullYear()) + String(dDue.getMonth() + 1).padStart(2, '0') + String(dDue.getDate()).padStart(2, '0');
                                } else if (typeof dDue === "string") {
                                    sDue = dDue.replace(/-/g, "").slice(0, 8);
                                }
                                if (sDue && sDue < sToday) {
                                    iOverdue++;
                                    bOverdueItem = true;
                                    if (oUserMap[sUser2]) { oUserMap[sUser2].overdue++; }
                                }
                            }

                            // Module-level stats
                            if (!oModuleMap[sModule]) {
                                oModuleMap[sModule] = { label: sModule, total: 0, completed: 0, inProgress: 0, overdue: 0 };
                            }
                            oModuleMap[sModule].total++;
                            if (sStat2 === "Completed") { oModuleMap[sModule].completed++; }
                            else if (sStat2 === "In Progress") { oModuleMap[sModule].inProgress++; }
                            if (bOverdueItem) { oModuleMap[sModule].overdue++; }
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

                        // Build module-level assignment stats (top 5 by total assignments)
                        var aModules = Object.keys(oModuleMap).map(function (k) { return oModuleMap[k]; });
                        aModules.sort(function (a, b) { return b.total - a.total; });
                        var aTopModules = aModules.slice(0, 5);
                        var iMaxModuleTotal = aTopModules.length > 0 ? aTopModules[0].total : 1;
                        aTopModules.forEach(function (m) {
                            m.completionPct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
                            m.barPct = iMaxModuleTotal > 0 ? Math.round((m.total / iMaxModuleTotal) * 100) : 0;
                            m.displayValue = m.completed + "/" + m.total + " (" + m.completionPct + "%)";
                        });
                        oTeamModel.setProperty("/moduleAssignmentStats", aTopModules);

                        // C1: Pending badge = assigned + overdue (not completed items needing attention)
                        oTeamModel.setProperty("/pendingBadge", iAssigned + iOverdue);

                        Log.info("[TeamAnalytics] Fallback loaded " + aAll.length + " assignments: " +
                            iAssigned + " assigned, " + iInProgress + " in progress, " +
                            iCompleted + " completed, " + iOverdue + " overdue");
                        if (oPanel) { oPanel.setBusy(false); }
                    },
                    error: function (err) {
                        var sErrDetail = "";
                        try {
                            if (err && err.responseText) {
                                var parsed = JSON.parse(err.responseText);
                                sErrDetail = (parsed.error && parsed.error.message && parsed.error.message.value) || "";
                            }
                        } catch (_) { /* ignore */ }
                        Log.warning("[TeamAnalytics] Fallback load failed: " + (err && err.message || "") + " " + sErrDetail);
                        var i18nFb = that.getView().getModel("i18n") && that.getView().getModel("i18n").getResourceBundle();
                        MessageToast.show(i18nFb ? i18nFb.getText("teamAnalyticsLoadFailed") : "Team analytics could not be loaded. Please refresh.");
                        if (oPanel) { oPanel.setBusy(false); }
                    }
                });
            };

            fnLoadFallbackPage(0);
        },

        // _loadFilterData removed: consolidated into _loadAllData (audit fix #8)
        // D-1: _buildUserProgressList removed — view binding via TeamUserRow.fragment.xml

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

            // Filter by status if specified (handle both PascalCase and camelCase)
            var aFiltered = aAll;
            if (sStatusFilter === "Overdue") {
                var dNow2 = new Date();
                var sToday = String(dNow2.getFullYear()) + String(dNow2.getMonth() + 1).padStart(2, '0') + String(dNow2.getDate()).padStart(2, '0');
                aFiltered = aAll.filter(function (a) {
                    var sStat = a.Status || a.status || "";
                    var dDue = a.DueDate || a.dueDate;
                    if (sStat === "Completed" || !dDue) { return false; }
                    var sDue = "";
                    if (dDue instanceof Date) {
                        sDue = String(dDue.getFullYear()) + String(dDue.getMonth() + 1).padStart(2, '0') + String(dDue.getDate()).padStart(2, '0');
                    } else if (typeof dDue === "string") {
                        sDue = dDue.replace(/-/g, "").slice(0, 8);
                    }
                    return sDue && sDue < sToday;
                });
            } else if (sStatusFilter) {
                aFiltered = aAll.filter(function (a) {
                    var sStat = a.Status || a.status || "";
                    return sStat === sStatusFilter;
                });
            }

            // Build title
            var sTitle;
            if (sStatusFilter === "Assigned") {
                sTitle = i18n.getText("teamDrilldownPending");
            } else if (sStatusFilter === "In Progress") {
                sTitle = i18n.getText("teamDrilldownInProgress");
            } else if (sStatusFilter === "Completed") {
                sTitle = i18n.getText("teamDrilldownCompleted");
            } else if (sStatusFilter === "Overdue") {
                sTitle = i18n.getText("teamOverdue");
            } else {
                sTitle = i18n.getText("teamDrilldownAll");
            }
            sTitle += " (" + aFiltered.length + ")";

            // FIX-1: Always destroy previous dialog + model completely
            if (this._teamDrillDownDlg) {
                this._teamDrillDownDlg.destroy();
                this._teamDrillDownDlg = null;
            }
            if (this._drillDownModel) {
                this._drillDownModel.destroy();
                this._drillDownModel = null;
            }

            // Create local model for filtered data
            var oDrillModel = new JSONModel({ assignments: aFiltered, dialogTitle: sTitle });
            oDrillModel.setSizeLimit(10000);
            this._drillDownModel = oDrillModel;

            // De-assign is only allowed for Team Total ("") and Team Pending ("Assigned")
            var bAllowDeassign = (!sStatusFilter || sStatusFilter === "Assigned");

            var that = this;
            // FIX-1: Use Fragment.load() with unique id each time instead of
            // this.loadFragment() which caches by name and returns destroyed instance
            sap.ui.core.Fragment.load({
                name: "z.sap.courses.fragments.TeamAssignmentsDialog",
                controller: this,
                id: this.getView().getId() + "--drillDown" + Date.now()
            }).then(function (oDialog) {
                that._teamDrillDownDlg = oDialog;
                oDialog.setModel(oDrillModel, "drillDown");
                oDialog.setModel(that.getView().getModel("i18n"), "i18n");

                // Hide de-assign button for In Progress / Overdue / Completed views
                var aButtons = oDialog.getBeginButton ? [oDialog.getBeginButton()] : [];
                aButtons.forEach(function (btn) {
                    if (btn) { btn.setVisible(bAllowDeassign); }
                });
                // Also disable multi-select when de-assign not allowed
                var aContent = oDialog.getContent();
                if (aContent && aContent[0] && aContent[0].setMode) {
                    aContent[0].setMode(bAllowDeassign ? "MultiSelect" : "None");
                }

                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                    that._teamDrillDownDlg = null;
                    if (that._drillDownModel) {
                        that._drillDownModel.destroy();
                        that._drillDownModel = null;
                    }
                });
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

            // Fragment is loaded with a dynamic id prefix (Date.now()),
            // so this.byId() cannot find the table. Get it from dialog content instead.
            var aContent = oDialog.getContent();
            var oTable = aContent && aContent.length > 0 ? aContent[0] : null;
            if (!oTable) { return; }

            var aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectAssignmentFirst"));
                return;
            }

            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var iCount = aSelectedItems.length;

            // Collect assignment data from selected items
            // BLOCK: Never allow deletion of completed assignments
            var aToDelete = [];
            var iSkippedCompleted = 0;
            aSelectedItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("drillDown");
                if (oCtx) {
                    var oObj = oCtx.getObject();
                    var sStat = oObj.Status || oObj.status || "";
                    if (sStat === "Completed") {
                        iSkippedCompleted++;
                    } else {
                        aToDelete.push(oObj);
                    }
                }
            });

            if (aToDelete.length === 0) {
                if (iSkippedCompleted > 0) {
                    MessageBox.warning(i18n.getText("cannotDeleteCompleted"));
                } else {
                    MessageToast.show(i18n.getText("selectAssignmentFirst"));
                }
                return;
            }
            if (iSkippedCompleted > 0) {
                MessageToast.show(iSkippedCompleted + " completed assignment(s) were skipped — completed courses cannot be removed.");
            }
            iCount = aToDelete.length;

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

                        // Build OData path — use string key (SEGW Edm.String)
                        // Also try guid format as fallback if string format fails
                        var sPath = "/" + sEntitySet + "('" + sKey + "')";
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

                    // FIX 8.2: Removed redundant refreshSecurityToken — OData V2 model handles CSRF tokens automatically
                    fnDeleteNext(0);
                }
            });
        },

        /**
         * F2: Close the Team Assignments drill-down dialog.
         */
        onCloseDrillDown: function () {
            if (this._teamDrillDownDlg) {
                this._teamDrillDownDlg.close();
            }
        },

        /**
         * Cross-filtering: when Role changes, filter Module dropdown.
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
         * Cross-filtering: when Topic changes, filter Module dropdown
         * to only show modules available for the selected topic.
         */
        onTopicFilterChange: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            var sTopic = oItem ? oItem.getKey() : "";
            var oFilterModel = this.getView().getModel("filterData");
            var topicModuleMap = oFilterModel.getProperty("/topicModuleMap") || {};
            var allModules = oFilterModel.getProperty("/allModules") || [];

            if (!sTopic) {
                oFilterModel.setProperty("/modules", allModules.slice(0));
            } else {
                var modulesForTopic = topicModuleMap[sTopic] || {};
                var filtered = [{ key: "", text: "All" }];
                Object.keys(modulesForTopic).sort().forEach(function (m) {
                    filtered.push({ key: m, text: m });
                });
                oFilterModel.setProperty("/modules", filtered);
            }
            var oModuleSelect = this.byId("filterModule");
            if (oModuleSelect) { oModuleSelect.setSelectedKey(""); }
        },

        /**
         * Cross-filtering: when Module changes, filter Topic dropdown
         * to only show topics available for the selected module.
         */
        onModuleFilterChange: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            var sModule = oItem ? oItem.getKey() : "";
            var oFilterModel = this.getView().getModel("filterData");
            var moduleTopicMap = oFilterModel.getProperty("/moduleTopicMap") || {};
            var allTopics = oFilterModel.getProperty("/allTopics") || [];

            if (!sModule) {
                oFilterModel.setProperty("/topics", allTopics.slice(0));
            } else {
                var topicsForModule = moduleTopicMap[sModule] || {};
                var filtered = [{ key: "", text: "All" }];
                Object.keys(topicsForModule).sort().forEach(function (r) {
                    filtered.push({ key: r, text: r });
                });
                oFilterModel.setProperty("/topics", filtered);
            }
            var oTopicSelect = this.byId("filterTopic");
            if (oTopicSelect) { oTopicSelect.setSelectedKey(""); }
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

                // Apply link templates + column menus + date formatting after data load
                // Re-apply link templates each time so annotation-generated links get target="_blank"
                oTable.attachRowsUpdated(function () {
                    that._enableColumnMenus(oTable);
                    that._applyLinkTemplates(oTable);
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
                                var i18nST = that.getView().getModel("i18n") && that.getView().getModel("i18n").getResourceBundle();
                                MessageToast.show(i18nST ? i18nST.getText("invalidUrlProtocol") : "Invalid URL protocol — only HTTP/HTTPS links are allowed");
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

                // Fix: Convert export split button to regular (single icon, no arrow)
                aToolbarContent = oInternalToolbar.getContent();
                aToolbarContent.forEach(function (oCtrl) {
                    if (oCtrl.getMetadata && oCtrl.getMetadata().getName() === "sap.m.MenuButton") {
                        if (typeof oCtrl.setButtonMode === "function") {
                            oCtrl.setButtonMode("Regular");
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
                if (sText === "Last Updated" || sText === "LastUpdated") { return "LastUpdated"; }
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
                // Skip if column already has a Link template with correct target
                var oTpl = oCol.getTemplate();
                if (oTpl && oTpl.getMetadata && oTpl.getMetadata().getName() === "sap.m.Link"
                    && oTpl.getTarget && oTpl.getTarget() === "_blank") {
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
         * SmartFilterBar auto-generates proper EQ filters for Topic, SapModule, LastUpdated
         * from UI.SelectionFields annotation. These pass through natively to SEGW.
         * 
         * We only intercept the Basic Search to convert it to a Title EQ filter
         * (SEGW doesn't support $search; ABAP does LIKE matching on Title).
         */
        onBeforeRebindTable: function (oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");
            var oSmartFilterBar = this.byId("smartFilterBar");

            // ---- Step 1: Remove any existing Role/Topic/SapModule filters ----
            // SmartFilterBar may generate malformed filters from sap.m.Select controls
            // (Select lacks getValue()). We strip them and re-inject clean EQ filters.
            var fnStripTopicModule = function (aFilters) {
                for (var i = aFilters.length - 1; i >= 0; i--) {
                    var oF = aFilters[i];
                    if (oF.aFilters) {
                        fnStripTopicModule(oF.aFilters);
                        if (oF.aFilters.length === 0) { aFilters.splice(i, 1); }
                    } else if (oF.sPath === "Role" || oF.sPath === "Topic" || oF.sPath === "SapModule") {
                        aFilters.splice(i, 1);
                    }
                }
            };
            fnStripTopicModule(mBindingParams.filters);

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
                if ((oFilter.sPath === "Topic" || oFilter.sPath === "SapModule") &&
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

            // MD-12: Only rebind card grid when cards view is active
            var oViewMode = this.getView().getModel("viewMode");
            if (oViewMode && !oViewMode.getProperty("/showCards")) { return; }

            // Keep card grid in sync with same filters
            this._rebindCardGrid();
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
                topic: "",
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
                oDialog.setModel(that.getView().getModel("filterData"), "filterData");
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
                Topic: (data.topic || "").trim(),
                SapModule: (data.sapModule || "").trim(),
                Url: data.url.trim(),
                SapHelpLink: (data.sapHelpLink || "").trim()
            };

            // Duplicate check: read existing trainings with same title
            var sTitleFilter = new Filter("Title", FilterOperator.EQ, payload.Title);
            oModel.read("/Trainings", {
                filters: [sTitleFilter],
                urlParameters: { "$top": "1" },
                success: function (oData) {
                    if (oData.results && oData.results.length > 0) {
                        oDlgModel.setProperty("/submitting", false);
                        oDlgModel.setProperty("/error", "A training with title '" + payload.Title + "' already exists. Please use a different title.");
                        return;
                    }
                    // No duplicate — proceed to create
                    // FIX 8.2: Removed redundant refreshSecurityToken
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
                },
                error: function () {
                    oDlgModel.setProperty("/submitting", false);
                    oDlgModel.setProperty("/error", "Could not check for duplicates. Please try again.");
                }
            });
        },

        onCreateTrainingCancel: function () {
            if (this._createDlg) { this._createDlg.close(); }
        },

        /* ===== U-1: Admin Inline Edit Training (via Dialog) ===== */
        onEditTraining: function () {
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
            if (this._editDlg) { this._editDlg.destroy(); this._editDlg = null; }

            this._editTrainingPath = oContext.getPath();
            var oDlgModel = new JSONModel({
                title: oTraining.Title || "",
                description: oTraining.Description || "",
                role: oTraining.Role || "",
                topic: oTraining.Topic || "",
                sapModule: oTraining.SapModule || "",
                url: oTraining.Url || "",
                sapHelpLink: oTraining.SapHelpLink || "",
                submitting: false,
                error: ""
            });

            this.loadFragment({
                name: "z.sap.courses.fragments.EditTrainingDialog"
            }).then(function (oDialog) {
                that._editDlg = oDialog;
                oDialog.setModel(oDlgModel, "editModel");
                oDialog.setModel(that.getView().getModel("i18n"), "i18n");
                oDialog.setModel(that.getView().getModel("filterData"), "filterData");
                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                    that._editDlg = null;
                    that._editTrainingPath = null;
                });
                oDialog.open();
            });
        },

        onEditTrainingSave: function () {
            var that = this;
            var oDlgModel = this._editDlg.getModel("editModel");
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
                Topic: (data.topic || "").trim(),
                SapModule: (data.sapModule || "").trim(),
                Url: data.url.trim(),
                SapHelpLink: (data.sapHelpLink || "").trim()
            };

            // FIX 8.2: Removed redundant refreshSecurityToken
                oModel.update(that._editTrainingPath, payload, {
                    success: function () {
                        that._editDlg.close();
                        oDlgModel.setProperty("/submitting", false);
                        MessageToast.show(i18n.getText("trainingUpdated"));
                        that.byId("smartTable").rebindTable(true);
                        that._loadAnalytics();
                    },
                    error: function (err) {
                        oDlgModel.setProperty("/submitting", false);
                        var msg = i18n.getText("updateFailed");
                        try {
                            var parsed = JSON.parse(err.responseText);
                            msg = parsed.error.message.value || msg;
                        } catch (e) {
                            msg = (err && err.message) || msg;
                        }
                        oDlgModel.setProperty("/error", msg);
                    }
                });
        },

        onEditTrainingCancel: function () {
            if (this._editDlg) { this._editDlg.close(); }
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
                        // FIX 8.2: Removed redundant refreshSecurityToken
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

            // D-8: Confirmation dialog before enrollment
            MessageBox.confirm(i18n.getText("confirmEnroll", [oTraining.Title]), {
                title: i18n.getText("confirmEnrollTitle"),
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }

                    var oComponent = that.getOwnerComponent();
                    var sUserId = oComponent.getCurrentUserId();
                    var sEntitySet = oComponent.getAssignmentEntitySet();
                    var oModel = oComponent.getModel();

                    // FIX 6.1: Slim payload — server denormalizes Title, Role, Topic, etc.
                    // FIX 3.1: Self-enrollment uses default due date (30 days from now)
                    var dDefaultDue = new Date();
                    dDefaultDue.setDate(dDefaultDue.getDate() + 30);
                    var oPayload = {
                        TrainingId: oTraining.Id || oTraining.ID,
                        Status: "Assigned",
                        UserId: sUserId,
                        DueDate: dDefaultDue.toISOString()
                    };

                    // FIX 8.2: Removed redundant refreshSecurityToken
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
                                if (msg.indexOf("already assigned") > -1 || msg.indexOf("duplicate") > -1) {
                                    MessageToast.show(i18n.getText("alreadyEnrolled"));
                                } else {
                                    MessageBox.error(msg);
                                }
                            }
                        });
                }
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

            // UI-1: Prepare detail model with pre-formatted fields
            var sLastUpdated = "";
            if (oTraining.LastUpdated) {
                sLastUpdated = oTraining.LastUpdated instanceof Date
                    ? "Updated: " + oTraining.LastUpdated.toLocaleDateString()
                    : "Updated: " + oTraining.LastUpdated;
            }
            var oDetailModel = new JSONModel({
                Title: oTraining.Title || "Untitled",
                SapModule: oTraining.SapModule || "",
                Role: oTraining.Role || "",
                Topic: oTraining.Topic || "",
                LastUpdatedText: sLastUpdated,
                Description: oTraining.Description || "",
                Url: oTraining.Url || "",
                SapHelpLink: oTraining.SapHelpLink || "",
                Id: oTraining.Id || "N/A"
            });

            this.loadFragment({
                name: "z.sap.courses.fragments.TrainingDetailDialog"
            }).then(function (oDialog) {
                that._detailDlg = oDialog;
                oDialog.setModel(oDetailModel, "detail");
                oDialog.setModel(that.getView().getModel("i18n"), "i18n");
                if (sap.ui.Device.system.phone) {
                    oDialog.setStretch(true);
                }
                oDialog.addStyleClass("sapUiContentPadding detailDialog");
                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                    that._detailDlg = null;
                });
                oDialog.open();
            });
        },

        onTrainingDetailClose: function () {
            if (this._detailDlg) { this._detailDlg.close(); }
        },

        onOpenTrainingUrl: function () {
            if (this._detailDlg) {
                var sUrl = this._detailDlg.getModel("detail").getProperty("/Url");
                if (sUrl) { sap.m.URLHelper.redirect(sUrl, true); }
            }
        },

        onOpenSapHelpUrl: function () {
            if (this._detailDlg) {
                var sUrl = this._detailDlg.getModel("detail").getProperty("/SapHelpLink");
                if (sUrl) { sap.m.URLHelper.redirect(sUrl, true); }
            }
        },

        /* ===== Card Grid View Handlers ===== */

        /**
         * Toggle between Card and Table view modes.
         */
        onViewModeChange: function (oEvent) {
            var sKey = oEvent.getParameter("key") || oEvent.getSource().getSelectedKey();
            var oViewMode = this.getView().getModel("viewMode");
            if (sKey === "cards") {
                oViewMode.setProperty("/showCards", true);
                oViewMode.setProperty("/showTable", false);
                oViewMode.setProperty("/mode", "cards");
                this._rebindCardGrid();
                // Exit full-screen if SmartTable was in full-screen
                var oSmartTable = this.byId("smartTable");
                if (oSmartTable && oSmartTable._oFullScreenUtil) {
                    try { oSmartTable._oFullScreenUtil.cleanUpFullScreen(); } catch (e) { /* ignore */ }
                }
            } else {
                oViewMode.setProperty("/showCards", false);
                oViewMode.setProperty("/showTable", true);
                oViewMode.setProperty("/mode", "table");
                // SmartTable will auto-rebind when made visible
                var oSmartTable = this.byId("smartTable");
                if (oSmartTable) { oSmartTable.rebindTable(); }
            }
        },

        /**
         * Rebind the card grid with current SmartFilterBar filters.
         * Reads filters the same way onBeforeRebindTable does.
         */
        _rebindCardGrid: function () {
            var oCardGrid = this.byId("cardGrid");
            if (!oCardGrid) { return; }

            var oSmartFilterBar = this.byId("smartFilterBar");
            var aFilters = [];

            // Read filter values from FilterGroupItems (same as onBeforeRebindTable Step 2)
            if (oSmartFilterBar && oSmartFilterBar.getFilterGroupItems) {
                var aFGItems = oSmartFilterBar.getFilterGroupItems();
                for (var g = 0; g < aFGItems.length; g++) {
                    var oFGI = aFGItems[g];
                    var sName = oFGI.getName ? oFGI.getName() : "";
                    var oControl = oFGI.getControl ? oFGI.getControl() : null;
                    if (oControl && typeof oControl.getSelectedKey === "function") {
                        var sKey = oControl.getSelectedKey();
                        if (sKey) {
                            aFilters.push(new Filter(sName, FilterOperator.EQ, sKey));
                        }
                    }
                }
            }

            // Basic search → Title Contains filter
            if (oSmartFilterBar && oSmartFilterBar.getBasicSearchValue) {
                var sSearch = (oSmartFilterBar.getBasicSearchValue() || "").trim();
                if (sSearch) {
                    aFilters.push(new Filter("Title", FilterOperator.Contains, sSearch));
                }
            }

            // Rebind card grid with current filters
            var oBinding = oCardGrid.getBinding("items");
            if (oBinding) {
                // Apply filters to existing binding
                oBinding.filter(aFilters);
                // Update card count after filter
                oBinding.attachEventOnce("dataReceived", this._onCardDataReceived.bind(this));
            } else {
                // Binding not yet ready (initial load) — try again shortly
                var that = this;
                setTimeout(function () {
                    var oB = oCardGrid.getBinding("items");
                    if (oB) {
                        oB.filter(aFilters);
                        oB.attachEventOnce("dataReceived", that._onCardDataReceived.bind(that));
                    }
                }, 500);
            }

            Log.info("[CardGrid] Rebound with " + aFilters.length + " filters");
        },

        /**
         * Update card count when card grid data is received.
         */
        _onCardDataReceived: function (oEvent) {
            var oViewMode = this.getView().getModel("viewMode");
            var oCardGrid = this.byId("cardGrid");
            if (oCardGrid) {
                var oBinding = oCardGrid.getBinding("items");
                var iCount = oBinding ? oBinding.getLength() : 0;
                oViewMode.setProperty("/cardCount", iCount);
            }
        },

        /**
         * Card press handler — toggle card selection (for multi-select operations like Assign).
         */
        onCardPress: function (oEvent) {
            // Default Active type handles selection; nothing extra needed for MultiSelect mode
        },

        /**
         * Card detail button press — open Training Detail Dialog.
         */
        onCardDetailPress: function (oEvent) {
            var oSource = oEvent.getSource();
            // Navigate up to the CustomListItem to get the binding context
            var oItem = oSource;
            while (oItem && !oItem.getBindingContext()) {
                oItem = oItem.getParent();
            }
            if (!oItem) { return; }
            var oCtx = oItem.getBindingContext();
            if (!oCtx) { return; }
            var oTraining = oCtx.getObject();
            // Reuse existing detail dialog logic
            this._openTrainingDetail(oTraining);
        },

        /**
         * Card open URL button press — open exercise URL in new tab.
         */
        onCardOpenUrl: function (oEvent) {
            var oSource = oEvent.getSource();
            var oItem = oSource;
            while (oItem && !oItem.getBindingContext()) {
                oItem = oItem.getParent();
            }
            if (!oItem) { return; }
            var oCtx = oItem.getBindingContext();
            if (!oCtx) { return; }
            var sUrl = oCtx.getProperty("Url");
            if (sUrl) {
                // HI-7: Validate URL protocol before redirect to prevent XSS
                if (/^https?:\/\//i.test(sUrl)) {
                    sap.m.URLHelper.redirect(sUrl, true);
                } else {
                    MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("invalidUrlProtocol") || "Invalid URL: only HTTP/HTTPS links are allowed.");
                }
            } else {
                MessageToast.show("No URL available for this exercise.");
            }
        },

        /**
         * Opens the training detail dialog for a training object.
         * Reused by both table row press and card detail press.
         */
        _openTrainingDetail: function (oTraining) {
            if (!oTraining) { return; }
            var that = this;

            // Destroy previous dialog
            if (this._detailDlg) {
                this._detailDlg.destroy();
                this._detailDlg = null;
            }

            // Format LastUpdated
            var sLastUpdated = "";
            if (oTraining.LastUpdated) {
                sLastUpdated = oTraining.LastUpdated instanceof Date
                    ? "Updated: " + oTraining.LastUpdated.toLocaleDateString()
                    : "Updated: " + oTraining.LastUpdated;
            }

            var oDetailModel = new JSONModel({
                Title: oTraining.Title || "Untitled",
                SapModule: oTraining.SapModule || "",
                Role: oTraining.Role || "",
                Topic: oTraining.Topic || "",
                LastUpdatedText: sLastUpdated,
                Description: oTraining.Description || "",
                Url: oTraining.Url || "",
                SapHelpLink: oTraining.SapHelpLink || "",
                Id: oTraining.Id || "N/A"
            });

            this.loadFragment({
                name: "z.sap.courses.fragments.TrainingDetailDialog"
            }).then(function (oDialog) {
                that._detailDlg = oDialog;
                oDialog.setModel(oDetailModel, "detail");
                oDialog.setModel(that.getView().getModel("i18n"), "i18n");
                if (sap.ui.Device.system.phone) {
                    oDialog.setStretch(true);
                }
                oDialog.addStyleClass("sapUiContentPadding detailDialog");
                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                    that._detailDlg = null;
                });
                oDialog.open();
            });
        },

        onAssignTraining: function () {
            var oComponent = this.getOwnerComponent();
            if (!oComponent || !oComponent.openAssignDialog) { return; }
            // Collect selected trainings from SmartTable OR card grid (multi-select)
            var aSelectedTrainings = [];
            var oViewMode = this.getView().getModel("viewMode");
            var sMode = oViewMode ? oViewMode.getProperty("/mode") : "table";

            if (sMode === "cards") {
                // Card grid selection
                var oCardGrid = this.byId("cardGrid");
                if (oCardGrid) {
                    var aSelectedItems = oCardGrid.getSelectedItems();
                    aSelectedItems.forEach(function (oItem) {
                        var oCtx = oItem.getBindingContext();
                        if (oCtx) { aSelectedTrainings.push(oCtx.getObject()); }
                    });
                }
            } else {
                // SmartTable selection
                var oSmartTable = this.byId("smartTable");
                var oTable = oSmartTable ? oSmartTable.getTable() : null;
                if (oTable && oTable.getSelectedIndices) {
                    var aIndices = oTable.getSelectedIndices();
                    aIndices.forEach(function (idx) {
                        var oCtx = oTable.getContextByIndex(idx);
                        if (oCtx) { aSelectedTrainings.push(oCtx.getObject()); }
                    });
                }
            }

            if (aSelectedTrainings.length === 0) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectTrainingFirst"));
                return;
            }

            oComponent.openAssignDialog(aSelectedTrainings);
        },

        // ============================================================
        // D4: Export Team Report to CSV
        // ============================================================

        onExportTeamReport: function () {
            var oTeamModel = this.getView().getModel("teamAnalytics");
            if (!oTeamModel) { MessageToast.show("No analytics data"); return; }

            var aAll = oTeamModel.getProperty("/allAssignments") || [];
            if (aAll.length === 0) { MessageToast.show("No assignment data to export"); return; }

            // Build CSV
            var aHeaders = ["UserId", "UserName", "Training", "Module", "Status", "Priority", "DueDate", "CompletionDate", "AssignedBy"];
            var aRows = [aHeaders.join(",")];

            aAll.forEach(function (a) {
                var row = [
                    (a.UserId || a.userId || ""),
                    '"' + (a.UserName || a.userName || "").replace(/"/g, '""') + '"',
                    '"' + (a.Title || a.title || "").replace(/"/g, '""') + '"',
                    '"' + (a.SapModule || a.sap_module || "").replace(/"/g, '""') + '"',
                    (a.Status || a.status || ""),
                    (a.Priority || a.priority || "Medium"),
                    (a.DueDate || a.dueDate ? new Date(a.DueDate || a.dueDate).toISOString().split("T")[0] : ""),
                    (a.CompletionDate || a.completionDate ? new Date(a.CompletionDate || a.completionDate).toISOString().split("T")[0] : ""),
                    (a.AssignedBy || a.assignedBy || "")
                ];
                aRows.push(row.join(","));
            });

            var sCSV = aRows.join("\n");
            var blob = new Blob(["\uFEFF" + sCSV], { type: "text/csv;charset=utf-8;" });
            var url = URL.createObjectURL(blob);
            var link = document.createElement("a");
            link.href = url;
            link.download = "TeamReport_" + new Date().toISOString().split("T")[0] + ".csv";
            link.click();
            URL.revokeObjectURL(url);
            MessageToast.show("Report exported");
        },

        // ============================================================
        // C6: Delegate Authority
        // ============================================================

        onDelegateAuthority: function () {
            var oComponent = this.getOwnerComponent();
            oComponent.openDelegateDialog();
        },

        onViewAssignments: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TrainingAssignmentsList");
        },

        /* ================================================================== */
        /* TUTORIAL DIALOG                                                     */
        /* ================================================================== */

        onOpenTutorial: function () {
            var sRole = this.getOwnerComponent()._role || "User";
            var oTutorialData = this._getTutorialContent(sRole, "catalog");
            var oTutorialModel = new JSONModel(oTutorialData);

            var that = this;
            sap.ui.core.Fragment.load({
                name: "z.sap.courses.fragments.TutorialDialog",
                controller: this,
                id: this.getView().getId() + "--tutorial" + Date.now()
            }).then(function (oDialog) {
                that._tutorialDialog = oDialog;
                oDialog.setModel(oTutorialModel, "tutorialData");
                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                    that._tutorialDialog = null;
                });
                oDialog.open();
            });
        },

        onCloseTutorial: function () {
            if (this._tutorialDialog) {
                this._tutorialDialog.close();
            }
        },

        _getTutorialContent: function (sRole, sPage) {
            var oContent = {
                selectedTab: "start",
                title: "SAP Learning Courses – Training Catalog Guide"
            };

            if (sRole === "Admin") {
                oContent.gettingStarted =
                    "<p><strong>As an Admin</strong>, you have full control over the training catalog and assignments.</p>" +
                    "<ol>" +
                    "<li><strong>Browse Trainings:</strong> Use the filter bar to search by title, module, role, or topic.</li>" +
                    "<li><strong>Create Training:</strong> Click the <em>Create</em> button in the table toolbar to add new courses.</li>" +
                    "<li><strong>Edit / Delete:</strong> Select a training row and use the toolbar actions.</li>" +
                    "<li><strong>Assign Trainings:</strong> Select one or more trainings and click <em>Assign</em> to assign them to users.</li>" +
                    "<li><strong>Team Analytics:</strong> Expand the analytics panel to see organization-wide completion metrics.</li>" +
                    "</ol>";
                oContent.features =
                    "<ul>" +
                    "<li><strong>Card / Table Toggle:</strong> Switch between card grid and table view using the toggle buttons.</li>" +
                    "<li><strong>Team Analytics Dashboard:</strong> View KPI cards (Total, Assigned, In Progress, Overdue, Completed) and drill down by clicking them.</li>" +
                    "<li><strong>Charts:</strong> Status distribution, top modules, and user progress charts.</li>" +
                    "<li><strong>Bulk Operations:</strong> Select multiple trainings for batch assign or delete.</li>" +
                    "<li><strong>Smart Filters:</strong> Cross-filtering by Role, Topic, and Module with dynamic suggestions.</li>" +
                    "</ul>";
                oContent.tips =
                    "<ul>" +
                    "<li>Click a KPI card in Team Analytics to drill down into that specific status group.</li>" +
                    "<li>Use the search bar for quick keyword lookups across training titles.</li>" +
                    "<li>Export table data to spreadsheet using the export button.</li>" +
                    "<li>Navigate to <em>My Assignments</em> to track your own learning progress.</li>" +
                    "</ul>";
            } else if (sRole === "Manager") {
                oContent.gettingStarted =
                    "<p><strong>As a Manager</strong>, you can browse the catalog, assign trainings to your team, and monitor progress.</p>" +
                    "<ol>" +
                    "<li><strong>Browse Trainings:</strong> Use the filter bar to find relevant courses by module, role, or topic.</li>" +
                    "<li><strong>Assign to Team:</strong> Select trainings and click <em>Assign</em> to delegate them to team members.</li>" +
                    "<li><strong>Team Analytics:</strong> Expand the analytics panel to monitor your team's completion rates.</li>" +
                    "<li><strong>Drill Down:</strong> Click any KPI card to see individual assignment details.</li>" +
                    "</ol>";
                oContent.features =
                    "<ul>" +
                    "<li><strong>Team Analytics Dashboard:</strong> 5 KPI cards with completion progress bar and charts.</li>" +
                    "<li><strong>Card / Table Toggle:</strong> Choose your preferred view for browsing trainings.</li>" +
                    "<li><strong>Smart Filters:</strong> Filter by Role, Topic, Module with auto-suggestions.</li>" +
                    "<li><strong>Assignment Management:</strong> Assign and track trainings for your direct reports.</li>" +
                    "</ul>";
                oContent.tips =
                    "<ul>" +
                    "<li>Keep an eye on the <em>Overdue</em> KPI card — these are tasks past their due date that need attention.</li>" +
                    "<li>Use the completion progress bar to track overall team performance at a glance.</li>" +
                    "<li>Click on user rows in the Team Members chart to see per-person details.</li>" +
                    "<li>Navigate to <em>My Assignments</em> to also manage your own learning tasks.</li>" +
                    "</ul>";
            } else {
                // User role
                oContent.gettingStarted =
                    "<p><strong>Welcome!</strong> This is the SAP Training Catalog where you can explore available courses.</p>" +
                    "<ol>" +
                    "<li><strong>Browse Trainings:</strong> Use the filter bar to search by title, module, role, or topic.</li>" +
                    "<li><strong>View Details:</strong> Click on any training card or row to see full details and links.</li>" +
                    "<li><strong>My Assignments:</strong> Click the <em>My Assignments</em> button (top right) to see your assigned tasks.</li>" +
                    "<li><strong>Switch Views:</strong> Toggle between card grid and table view using the view buttons.</li>" +
                    "</ol>";
                oContent.features =
                    "<ul>" +
                    "<li><strong>Card View:</strong> Visual card layout with key training information at a glance.</li>" +
                    "<li><strong>Table View:</strong> Detailed tabular view with sorting and column personalization.</li>" +
                    "<li><strong>Smart Filters:</strong> Filter by Role, Topic, and Module to find relevant courses quickly.</li>" +
                    "<li><strong>Training URLs:</strong> Direct links to SAP Courses resources.</li>" +
                    "</ul>";
                oContent.tips =
                    "<ul>" +
                    "<li>Use the search bar for quick keyword lookups.</li>" +
                    "<li>Check <em>My Assignments</em> regularly to stay on top of your learning tasks.</li>" +
                    "<li>Look for the due date warnings — complete overdue tasks first!</li>" +
                    "<li>Click training URLs to open SAP Courses content directly.</li>" +
                    "</ul>";
            }

            return oContent;
        }
    });
});

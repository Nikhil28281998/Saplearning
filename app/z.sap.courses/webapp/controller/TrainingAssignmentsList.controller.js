sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/base/Log",
    "sap/m/Link",
    "sap/m/Text",
    "sap/m/ObjectStatus",
    "z/sap/courses/utils/formatter"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Log, Link, Text, ObjectStatus, SharedFormatter) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingAssignmentsList", {

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

        /**
         * Card Status Formatters — FIX 5.2: Delegate to shared formatter.
         */
        formatCardStatus: function (sStatus, dDue) {
            return SharedFormatter.formatStatusText.call(SharedFormatter, sStatus, dDue);
        },

        formatCardStatusState: function (sStatus, dDue) {
            return SharedFormatter.formatStatusState(sStatus, dDue);
        },

        formatCardStatusIcon: function (sStatus, dDue) {
            return SharedFormatter.formatStatusIcon(sStatus, dDue);
        },

        // 3-1 FIX: Delegate to shared formatter
        formatPriorityState: function (sPriority) {
            return SharedFormatter.formatPriorityState(sPriority);
        },

        formatPriorityIcon: function (sPriority) {
            return SharedFormatter.formatPriorityIcon(sPriority);
        },

        onInit: function () {
            // Card/Table view mode toggle model
            // A3 FIX: Default to table view
            var oViewModeModel = new JSONModel({
                showCards: false,
                showTable: true,
                mode: "table",
                cardCount: 0
            });
            this.getView().setModel(oViewModeModel, "assignViewMode");

            // User's own progress model
            var oAnalyticsModel = new JSONModel({
                assigned: 0,
                inProgress: 0,
                completed: 0,
                overdue: 0,
                total: 0,
                completionPercent: 0,
                dueSoonCount: 0,
                badge: "",
                badgeIcon: "",
                badgeDescription: ""
            });
            this.getView().setModel(oAnalyticsModel, "assignAnalytics");

            // Dynamically set entity set name on SmartFilterBar + SmartTable + CardGrid
            var that = this;
            var oComponent = this.getOwnerComponent();
            var oModel = oComponent.getModel();
            if (oModel && oModel.metadataLoaded) {
                oModel.metadataLoaded().then(function () {
                    var sEntitySet = oComponent.getAssignmentEntitySet();
                    Log.info("[Assignments] Using entity set: " + sEntitySet);
                    var oSmartFilter = that.byId("assignSmartFilterBar");
                    var oSmartTable = that.byId("assignSmartTable");
                    if (oSmartFilter && sEntitySet !== "TrainingAssignments") {
                        oSmartFilter.setEntitySet(sEntitySet);
                    }
                    if (oSmartTable && sEntitySet !== "TrainingAssignments") {
                        oSmartTable.setEntitySet(sEntitySet);
                    }
                    // Also update card grid binding path if entity set differs
                    if (sEntitySet !== "TrainingAssignments") {
                        var oCardGrid = that.byId("assignCardGrid");
                        if (oCardGrid) {
                            var oBindingInfo = oCardGrid.getBindingInfo("items");
                            if (oBindingInfo) {
                                oBindingInfo.path = "/" + sEntitySet;
                                oCardGrid.bindAggregation("items", oBindingInfo);
                                Log.info("[Assignments] Card grid rebound to /" + sEntitySet);
                            }
                        }
                    }
                    that._loadAnalytics();
                });
            } else {
                this._loadAnalytics();
            }

            // Re-load data when role changes (async fetch may complete after initial load)
            // MD-13: Debounce to prevent triple-fire
            this._loadDebounceTimer = null;
            var fnDebouncedLoad = function () {
                if (that._loadDebounceTimer) { clearTimeout(that._loadDebounceTimer); }
                that._loadDebounceTimer = setTimeout(function () {
                    var oST = that.byId("assignSmartTable");
                    if (oST) { oST.rebindTable(true); }
                    that._loadAnalytics();
                }, 300);
            };
            this._onRoleChanged = function () {
                fnDebouncedLoad();
            };
            // FIX 7.4: Use component EventBus instead of deprecated sap.ui.getCore().getEventBus()
            oComponent.getEventBus().subscribe("sapCourses", "roleChanged", this._onRoleChanged, this);

            // Re-load data when userId is resolved from backend (async)
            this._onUserIdResolved = function () {
                fnDebouncedLoad();
            };
            oComponent.getEventBus().subscribe("sapCourses", "userIdResolved", this._onUserIdResolved, this);

            // Reload data every time user navigates to this page
            this._bIsActive = false;
            var oRouter = oComponent.getRouter();
            if (oRouter) {
                oRouter.getRoute("TrainingAssignmentsList").attachPatternMatched(function () {
                    that._bIsActive = true;
                    var oST = that.byId("assignSmartTable");
                    if (oST) { oST.rebindTable(true); }
                    that._loadAnalytics();
                    that._rebindAssignCardGrid();

                    // FEAT-2: Apply pending status filter from home page click-through
                    var sPending = oComponent._pendingAssignmentFilter;
                    if (sPending) {
                        oComponent._pendingAssignmentFilter = null;
                        setTimeout(function () { that._filterByStatus(sPending); }, 300);
                    }
                }, this);
                // Deactivate when navigating away from this route
                oRouter.attachRouteMatched(function (oEvent) {
                    var sRouteName = oEvent.getParameter("name");
                    if (sRouteName !== "TrainingAssignmentsList") {
                        that._bIsActive = false;
                    }
                }, this);
            }

            // FEAT-2: Analytics click-through — click card to filter table
            var aClickCards = [
                { id: "myTotalBox",       status: "" },
                { id: "myAssignedBox",    status: "Assigned" },
                { id: "myInProgressBox",  status: "In Progress" },
                { id: "myOverdueBox",     status: "Overdue" },
                { id: "myCompletedBox",   status: "Completed" }
            ];
            aClickCards.forEach(function (card) {
                var oCard = that.byId(card.id);
                if (oCard) {
                    oCard.addStyleClass("analyticsCardClickable");
                    oCard.attachBrowserEvent("click", function () {
                        that._filterByStatus(card.status);
                    });
                }
            });
        },

        /* ================================================================== */
        /* USER ANALYTICS – My own progress                                   */
        /* ================================================================== */

        _loadAnalytics: function () {
            var that = this;
            var oComponent = this.getOwnerComponent();
            var oModel = oComponent.getModel();
            var oAnalyticsModel = this.getView().getModel("assignAnalytics");
            var sEntitySet = oComponent.getAssignmentEntitySet();
            var sRole = oComponent._role || "User";
            var sUserId = oComponent.getCurrentUserId();

            var oPanel = this.byId("myProgressPanel");
            if (oPanel) { oPanel.setBusy(true); }

            // M-6 FIX: Add skeleton class to my progress KPI cards during load
            this._setMyCardSkeletons(true);

            // My Assignments: always filter by current user's UserId (all roles)
            var aFilters = [];
            aFilters.push(new Filter("UserId", FilterOperator.EQ, sUserId || "__NOUSER__"));

            // Single OData read — count statuses client-side for reliability
            oModel.read("/" + sEntitySet, {
                filters: aFilters,
                urlParameters: { "$inlinecount": "allpages" },
                success: function (oData) {
                    var aAll = oData.results || [];
                    var iAssigned = 0, iInProgress = 0, iCompleted = 0;
                    // Handle both PascalCase (ABAP/V2) and camelCase (CAP) field names
                    aAll.forEach(function (a) {
                        var sStat = a.Status || a.status || "";
                        if (sStat === "Assigned") { iAssigned++; }
                        else if (sStat === "In Progress") { iInProgress++; }
                        else if (sStat === "Completed") { iCompleted++; }
                    });

                    // Overdue: DueDate < today AND not Completed (strictly past due)
                    // Use local date for both sides of comparison
                    var dToday = new Date();
                    var sToday = String(dToday.getFullYear()) +
                        String(dToday.getMonth() + 1).padStart(2, '0') +
                        String(dToday.getDate()).padStart(2, '0');
                    var iOverdue = 0;
                    aAll.forEach(function (a) {
                        var sStat2 = a.Status || a.status || "";
                        var dDue = a.DueDate || a.dueDate;
                        if (sStat2 !== "Completed" && dDue) {
                            var sDue = "";
                            if (dDue instanceof Date) {
                                sDue = String(dDue.getFullYear()) +
                                    String(dDue.getMonth() + 1).padStart(2, '0') +
                                    String(dDue.getDate()).padStart(2, '0');
                            } else if (typeof dDue === "string") {
                                sDue = dDue.replace(/-/g, "").slice(0, 8);
                            }
                            if (sDue && sDue < sToday) { iOverdue++; }
                        }
                    });

                    var iTotal = iAssigned + iInProgress + iCompleted;
                    var iPct = iTotal > 0 ? Math.round((iCompleted / iTotal) * 100) : 0;

                    // U-3: Count assignments due within 3 days (not overdue, not completed)
                    var dNow3 = new Date();
                    var dIn3Days = new Date();
                    dIn3Days.setDate(dIn3Days.getDate() + 3);
                    var iDueSoon = 0;
                    aAll.forEach(function (a) {
                        var sStat3 = a.Status || a.status || "";
                        var dDue3 = a.DueDate || a.dueDate;
                        if (sStat3 !== "Completed" && dDue3) {
                            var dDueDate = (dDue3 instanceof Date) ? dDue3 : new Date(dDue3);
                            if (dDueDate > dNow3 && dDueDate <= dIn3Days) { iDueSoon++; }
                        }
                    });

                    oAnalyticsModel.setProperty("/assigned", iAssigned);
                    oAnalyticsModel.setProperty("/inProgress", iInProgress);
                    oAnalyticsModel.setProperty("/completed", iCompleted);
                    oAnalyticsModel.setProperty("/overdue", iOverdue);
                    oAnalyticsModel.setProperty("/total", iTotal);
                    oAnalyticsModel.setProperty("/completionPercent", iPct);
                    oAnalyticsModel.setProperty("/dueSoonCount", iDueSoon);
                    if (oPanel) { oPanel.setBusy(false); }
                    that._setMyCardSkeletons(false);

                    // Animate KPI numbers from 0 to target
                    that._animateNumbers(oAnalyticsModel, ["/assigned", "/inProgress", "/completed", "/overdue", "/completionPercent"]);
                },
                error: function (err) {
                    Log.warning("[AssignAnalytics] Failed to load: " + (err && err.message || ""));
                    if (oPanel) { oPanel.setBusy(false); }
                    that._setMyCardSkeletons(false);
                }
            });
        },

        /* ================================================================== */
        /* SMART TABLE INIT – Apply link templates + status column + actions   */
        /* ================================================================== */

        onSmartTableInit: function () {
            var oSmartTable = this.byId("assignSmartTable");
            var oTable = oSmartTable.getTable();
            var that = this;
            if (oTable) {
                oTable.setMode("MultiSelect");
                oTable.setAlternateRowColors(true);

                // BUG-6 FIX: Enable growing for ResponsiveTable (lazy scroll-to-load)
                if (typeof oTable.setGrowing === "function") {
                    oTable.setGrowing(true);
                    oTable.setGrowingScrollToLoad(true);
                    oTable.setGrowingThreshold(50);
                }

                if (!this._itemPressAttached) {
                    oTable.attachItemPress(this.onItemPress.bind(this));
                    this._itemPressAttached = true;
                }

                // BUG-7 FIX: Apply column templates on EVERY data update
                // (idempotent — skips cells already replaced)
                oTable.attachUpdateFinished(function () {
                    that._applyAssignmentColumnTemplates(oTable);
                });
            }

            // Fix: Convert export split button to regular (single icon, no arrow)
            var oInternalToolbar = oSmartTable._oToolbar || oSmartTable.getAggregation("_toolbar");
            if (oInternalToolbar) {
                var aToolbarContent = oInternalToolbar.getContent();
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
         * M-6 FIX: Toggle skeleton loading animation on my progress KPI cards.
         */
        _setMyCardSkeletons: function (bShow) {
            var aCardIds = ["myTotalBox", "myAssignedBox", "myInProgressBox", "myOverdueBox", "myCompletedBox"];
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
         * Animated count-up for KPI numbers. Smoothly increments from 0 to target.
         */
        _animateNumbers: function (oModel, aPaths, iDuration) {
            iDuration = iDuration || 600;
            var aTargets = aPaths.map(function (sPath) {
                return { path: sPath, target: oModel.getProperty(sPath) || 0 };
            });
            // Set all to 0
            aTargets.forEach(function (t) { oModel.setProperty(t.path, 0); });
            var iStart = performance.now();
            var fnStep = function (ts) {
                var fProgress = Math.min((ts - iStart) / iDuration, 1);
                // Ease-out cubic
                var fEase = 1 - Math.pow(1 - fProgress, 3);
                aTargets.forEach(function (t) {
                    oModel.setProperty(t.path, Math.round(t.target * fEase));
                });
                if (fProgress < 1) {
                    requestAnimationFrame(fnStep);
                }
            };
            requestAnimationFrame(fnStep);
        },

        /**
         * BUG-7 FIX: Apply Link + ObjectStatus cell templates using p13nData
         * for robust column detection, and OData bindings so controls survive
         * ColumnListItem context changes on sort/filter/growing.
         */
        _applyAssignmentColumnTemplates: function (oTable) {
            if (!oTable || !oTable.getColumns) { return; }
            var aCols = oTable.getColumns();
            var aItems = oTable.getItems();
            if (aItems.length === 0) { return; }

            // Detect column indices via p13nData customData (i18n-safe)
            var iUrlIdx = -1, iStatusIdx = -1, iDueDateIdx = -1;
            aCols.forEach(function (oCol, iIdx) {
                var aCustomData = oCol.getCustomData();
                for (var i = 0; i < aCustomData.length; i++) {
                    var oCD = aCustomData[i];
                    if (oCD.getKey && oCD.getKey() === "p13nData") {
                        try {
                            var oP13n = typeof oCD.getValue() === "string"
                                ? JSON.parse(oCD.getValue()) : oCD.getValue();
                            if (oP13n.columnKey === "Url" || oP13n.leadingProperty === "Url") {
                                iUrlIdx = iIdx;
                            }
                            if (oP13n.columnKey === "Status" || oP13n.leadingProperty === "Status") {
                                iStatusIdx = iIdx;
                            }
                            if (oP13n.columnKey === "DueDate" || oP13n.leadingProperty === "DueDate") {
                                iDueDateIdx = iIdx;
                            }
                        } catch (e) { /* ignore parse errors */ }
                    }
                }
                // Fallback: header text (for SmartTable without p13nData)
                var oHeader = oCol.getHeader();
                var sLabel = (oHeader && typeof oHeader.getText === "function") ? oHeader.getText() : "";
                if ((sLabel === "Url" || sLabel === "Training Link") && iUrlIdx < 0) { iUrlIdx = iIdx; }
                if (sLabel === "Status" && iStatusIdx < 0) { iStatusIdx = iIdx; }
                if ((sLabel === "DueDate" || sLabel === "Due Date") && iDueDateIdx < 0) { iDueDateIdx = iIdx; }
            });

            aItems.forEach(function (oItem) {
                if (!oItem.getCells) { return; }
                var aCells = oItem.getCells();

                // Url → Link with OData binding (survives context changes)
                if (iUrlIdx >= 0 && iUrlIdx < aCells.length) {
                    var oUrlCell = aCells[iUrlIdx];
                    // Replace if not a Link, or if Link lacks target="_blank"
                    if (oUrlCell.getMetadata().getName() !== "sap.m.Link" ||
                        (oUrlCell.getTarget && oUrlCell.getTarget() !== "_blank")) {
                        var oLink = new Link({
                            text: {
                                path: "Url",
                                formatter: function (sUrl) {
                                    return (sUrl && /^https?:\/\//i.test(sUrl)) ? i18n.getText("openTraining") : (sUrl || "");
                                }
                            },
                            href: "{Url}",
                            target: "_blank",
                            wrapping: false,
                            enabled: {
                                path: "Url",
                                formatter: function (sUrl) {
                                    return !!(sUrl && /^https?:\/\//i.test(sUrl));
                                }
                            }
                        }).addStyleClass("assignmentLink");
                        oItem.removeCell(oUrlCell);
                        oItem.insertCell(oLink, iUrlIdx);
                        oUrlCell.destroy();
                    }
                }

                // ADD-1: Status → ObjectStatus with overdue indicator — FIX 5.2: Use shared formatter
                if (iStatusIdx >= 0 && iStatusIdx < aCells.length) {
                    var oStatusCell = aCells[iStatusIdx];
                    if (oStatusCell.getMetadata().getName() !== "sap.m.ObjectStatus") {
                        var oStatusCtrl = new ObjectStatus({
                            text: {
                                parts: [{ path: "Status" }, { path: "DueDate" }],
                                formatter: function (sStatus, dDue) {
                                    return SharedFormatter.formatStatusText.call(SharedFormatter, sStatus, dDue);
                                }
                            },
                            state: {
                                parts: [{ path: "Status" }, { path: "DueDate" }],
                                formatter: function (sStatus, dDue) {
                                    return SharedFormatter.formatStatusState(sStatus, dDue);
                                }
                            },
                            icon: {
                                parts: [{ path: "Status" }, { path: "DueDate" }],
                                formatter: function (sStatus, dDue) {
                                    return SharedFormatter.formatStatusIcon(sStatus, dDue);
                                }
                            }
                        }).addStyleClass("assignmentStatusBadge");
                        oItem.removeCell(oStatusCell);
                        oItem.insertCell(oStatusCtrl, iStatusIdx);
                        oStatusCell.destroy();
                    }
                }

                // ADD-4: DueDate → ObjectStatus with color-coded warnings — FIX 5.2: Use shared formatter
                if (iDueDateIdx >= 0 && iDueDateIdx < aCells.length) {
                    var oDueDateCell = aCells[iDueDateIdx];
                    if (oDueDateCell.getMetadata().getName() !== "sap.m.ObjectStatus") {
                        var oDueDateCtrl = new ObjectStatus({
                            text: {
                                path: "DueDate",
                                formatter: function (dDate) {
                                    return SharedFormatter.formatDate(dDate) || i18n.getText("notSet");
                                }
                            },
                            state: {
                                parts: [{ path: "DueDate" }, { path: "Status" }],
                                formatter: function (dDate, sStatus) {
                                    return SharedFormatter.formatDueDateState(dDate, sStatus);
                                }
                            },
                            icon: {
                                parts: [{ path: "DueDate" }, { path: "Status" }],
                                formatter: function (dDate, sStatus) {
                                    if (sStatus === "Completed" || !dDate) { return ""; }
                                    var diff = Math.ceil((new Date(dDate) - new Date()) / 86400000);
                                    if (diff < 0) { return "sap-icon://alert"; }
                                    if (diff <= 7) { return "sap-icon://warning2"; }
                                    return "";
                                }
                            }
                        }).addStyleClass("assignmentDueDate");
                        oItem.removeCell(oDueDateCell);
                        oItem.insertCell(oDueDateCtrl, iDueDateIdx);
                        oDueDateCell.destroy();
                    }
                }
            });

            Log.info("[AssignLinks] Column templates applied (Url=" + iUrlIdx + ", Status=" + iStatusIdx + ", DueDate=" + iDueDateIdx + ")");
        },

        /* ===== Refresh ===== */
        onRefresh: function () {
            var oSmartTable = this.byId("assignSmartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable(true);
            }
            this._loadAnalytics();
            this._rebindAssignCardGrid();
            MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("dataRefreshed"));
        },

        /**
         * FEAT-2: Filter SmartTable by status via the SmartFilterBar Status Select.
         * Pass empty string to clear the status filter.
         */
        _filterByStatus: function (sStatus) {
            var oSelect = this.byId("filterAssignStatus");
            if (oSelect) {
                // For Overdue, set dropdown to "Overdue"; for others set normally
                oSelect.setSelectedKey(sStatus);
            }
            var oSmartFilterBar = this.byId("assignSmartFilterBar");
            if (oSmartFilterBar) {
                oSmartFilterBar.search();
            }
            // Also rebind card grid so cards view shows filtered results
            this._rebindAssignCardGrid();
        },

        /**
         * U-3: Filter to show assignments due within 3 days.
         * Uses Overdue status filter as closest match, or clears and manually filters.
         */
        onFilterDueSoon: function () {
            // Filter by "Assigned" to show non-completed items — user can see due dates
            this._filterByStatus("Assigned");
            MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("filteringDueSoon"));
        },

        /**
         * H31 FIX: SmartFilterBar search event handler.
         * Ensures both card grid and SmartTable refresh on search/Go.
         */
        onFilterBarSearch: function () {
            var oViewMode = this.getView().getModel("assignViewMode");
            if (oViewMode && oViewMode.getProperty("/showCards")) {
                this._rebindAssignCardGrid();
            }
            var oSmartTable = this.byId("assignSmartTable");
            if (oSmartTable && oSmartTable.rebindTable) {
                oSmartTable.rebindTable(true);
            }
        },

        /**
         * beforeRebindTable – handle SmartFilterBar filters for Assignments.
         */
        onBeforeRebindTable: function (oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");
            var oSmartFilterBar = this.byId("assignSmartFilterBar");

            // SEGW filter sanitizer
            var fnSanitize = function (oFilter) {
                if (oFilter.aFilters) {
                    for (var k = 0; k < oFilter.aFilters.length; k++) {
                        oFilter.aFilters[k] = fnSanitize(oFilter.aFilters[k]);
                    }
                    return oFilter;
                }
                if ((oFilter.sPath === "Role" || oFilter.sPath === "Topic" || oFilter.sPath === "SapModule") &&
                    oFilter.sOperator && oFilter.sOperator !== FilterOperator.EQ) {
                    return new Filter(oFilter.sPath, FilterOperator.EQ, oFilter.oValue1);
                }
                return oFilter;
            };
            for (var i = 0; i < mBindingParams.filters.length; i++) {
                mBindingParams.filters[i] = fnSanitize(mBindingParams.filters[i]);
            }

            // Strip auto-generated Status filters from SmartFilterBar
            // (we handle Status manually below to support "Overdue" pseudo-status)
            var fnStripStatus = function (aFilters) {
                return aFilters.filter(function (f) {
                    if (f.sPath === "Status") { return false; }
                    if (f.aFilters) {
                        f.aFilters = fnStripStatus(f.aFilters);
                        return f.aFilters.length > 0;
                    }
                    return true;
                });
            };
            mBindingParams.filters = fnStripStatus(mBindingParams.filters);

            // My Assignments: filter by current user's UserId when available
            var oComponent = this.getOwnerComponent();
            var sCurrentUserId = oComponent.getCurrentUserId();
            if (sCurrentUserId) {
                mBindingParams.filters.push(new Filter("UserId", FilterOperator.EQ, sCurrentUserId));
                Log.info("[AssignFilter] UserId filter: " + sCurrentUserId);
            } else {
                Log.warning("[AssignFilter] UserId not yet resolved — showing all assignments");
            }

            // Read Status filter from the custom FilterGroupItem Select
            var oStatusSelect = this.byId("filterAssignStatus");
            if (oStatusSelect) {
                var sStatusKey = oStatusSelect.getSelectedKey();
                if (sStatusKey && sStatusKey !== "Overdue") {
                    mBindingParams.filters.push(new Filter("Status", FilterOperator.EQ, sStatusKey));
                    Log.info("[AssignFilter] Status filter: " + sStatusKey);
                } else if (sStatusKey === "Overdue") {
                    // Overdue = (Assigned OR In Progress) AND DueDate <= end-of-today
                    // Wrap into single AND multi-filter for reliable OData V2 serialization
                    var oStatusFilter = new Filter({
                        filters: [
                            new Filter("Status", FilterOperator.EQ, "Assigned"),
                            new Filter("Status", FilterOperator.EQ, "In Progress")
                        ],
                        and: false  // OR
                    });
                    var dToday = new Date();
                    dToday.setHours(0, 0, 0, 0);
                    var oCombinedOverdue = new Filter({
                        filters: [
                            oStatusFilter,
                            new Filter("DueDate", FilterOperator.LT, dToday)
                        ],
                        and: true  // AND
                    });
                    mBindingParams.filters.push(oCombinedOverdue);
                    Log.info("[AssignFilter] Overdue filter: (Assigned OR In Progress) AND DueDate LT " + dToday.toISOString());
                }
            }

            // Basic search → Title Contains filter (ABAP does LIKE)
            var sSearchVal = "";
            if (oSmartFilterBar && oSmartFilterBar.getBasicSearchValue) {
                sSearchVal = (oSmartFilterBar.getBasicSearchValue() || "").trim();
            }
            if (sSearchVal) {
                mBindingParams.filters.push(new Filter("Title", FilterOperator.Contains, sSearchVal));
            }

            // Remove $search parameter
            if (mBindingParams.parameters && mBindingParams.parameters.custom) {
                delete mBindingParams.parameters.custom.search;
            }

            Log.info("[AssignFilter] Total filters: " + mBindingParams.filters.length);

            // Keep card grid in sync with same filters when cards view is active
            var oViewMode = this.getView().getModel("assignViewMode");
            if (oViewMode && oViewMode.getProperty("/showCards")) {
                this._rebindAssignCardGrid();
            }
        },

        /* ================================================================== */
        /* TUTORIAL DIALOG                                                     */
        /* ================================================================== */

        onOpenTutorial: function () {
            var sRole = this.getOwnerComponent()._role || "User";
            var oTutorialData = this._getTutorialContent(sRole);
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

        _getTutorialContent: function (sRole) {
            var oContent = {
                selectedTab: "start",
                title: "My Assignments Guide"
            };

            if (sRole === "Admin") {
                oContent.gettingStarted =
                    "<p><strong>As an Admin</strong>, this page shows your personal training assignments.</p>" +
                    "<ol>" +
                    "<li><strong>View Assignments:</strong> See all trainings assigned to you with status and due dates.</li>" +
                    "<li><strong>Start Training:</strong> Select an assignment and click <em>Start</em> to begin learning.</li>" +
                    "<li><strong>Mark Completed:</strong> When finished, select and click <em>Mark Completed</em>.</li>" +
                    "<li><strong>My Progress:</strong> Track your own completion rate in the progress panel above.</li>" +
                    "<li><strong>Back to Catalog:</strong> Use the back arrow (top left) to return to the Training Catalog.</li>" +
                    "</ol>";
                oContent.features =
                    "<ul>" +
                    "<li><strong>Progress Dashboard:</strong> 4 KPI cards showing Assigned, In Progress, Overdue, and Completed counts.</li>" +
                    "<li><strong>Completion Bar:</strong> Visual progress bar showing your overall completion percentage.</li>" +
                    "<li><strong>Due Date Warnings:</strong> Banner alerts when assignments are due within 3 days.</li>" +
                    "<li><strong>Card / Table Toggle:</strong> Switch views for your preferred layout.</li>" +
                    "<li><strong>Status Filter:</strong> Use the filter bar to quickly find assignments by status.</li>" +
                    "</ul>";
                oContent.tips =
                    "<ul>" +
                    "<li>Click a KPI card to filter the list by that status.</li>" +
                    "<li>Watch for the <em>Overdue</em> count — prioritize past-due assignments first.</li>" +
                    "<li>Use card actions (Start / Complete / Details / Open URL) for quick operations.</li>" +
                    "<li>Return to the catalog to browse and explore more available trainings.</li>" +
                    "</ul>";
            } else if (sRole === "Manager") {
                oContent.gettingStarted =
                    "<p><strong>As a Manager</strong>, this page tracks your personal learning assignments.</p>" +
                    "<ol>" +
                    "<li><strong>View Your Assignments:</strong> All trainings assigned to you appear here.</li>" +
                    "<li><strong>Start / Complete:</strong> Use the action buttons to update your training status.</li>" +
                    "<li><strong>Monitor Progress:</strong> Your personal KPIs are shown in the progress panel.</li>" +
                    "<li><strong>Back to Catalog:</strong> Use the back arrow to return to the catalog and manage team assignments.</li>" +
                    "</ol>";
                oContent.features =
                    "<ul>" +
                    "<li><strong>Personal Progress:</strong> 4 KPI cards showing your assignment status breakdown.</li>" +
                    "<li><strong>Due Date Alerts:</strong> Warning banners for assignments due within 3 days.</li>" +
                    "<li><strong>Quick Actions:</strong> Start training and mark completed directly from cards.</li>" +
                    "<li><strong>Filter by Status:</strong> Click KPI cards or use the status filter dropdown.</li>" +
                    "</ul>";
                oContent.tips =
                    "<ul>" +
                    "<li>Stay on track by completing assignments before their due date.</li>" +
                    "<li>Switch to the catalog page to view your team's analytics and assign new trainings.</li>" +
                    "<li>Use the <em>Overdue</em> filter to focus on past-due items that need immediate attention.</li>" +
                    "</ul>";
            } else {
                // User role
                oContent.gettingStarted =
                    "<p><strong>Welcome!</strong> This page shows all training assignments given to you.</p>" +
                    "<ol>" +
                    "<li><strong>View Assignments:</strong> See your pending, in-progress, and completed trainings.</li>" +
                    "<li><strong>Start Training:</strong> Select an assignment and click <em>Start</em> to begin.</li>" +
                    "<li><strong>Mark Completed:</strong> After finishing, select and click <em>Mark Completed</em>.</li>" +
                    "<li><strong>Track Progress:</strong> Check the progress panel for your completion rate.</li>" +
                    "<li><strong>Back to Catalog:</strong> Click the back arrow (top left) to explore more courses.</li>" +
                    "</ol>";
                oContent.features =
                    "<ul>" +
                    "<li><strong>Progress Dashboard:</strong> Assigned, In Progress, Overdue, and Completed at a glance.</li>" +
                    "<li><strong>Due Date Warning:</strong> Alerts appear when assignments are due soon.</li>" +
                    "<li><strong>Card / Table Views:</strong> Choose your preferred view mode.</li>" +
                    "<li><strong>Quick Actions:</strong> Start, complete, or view details right from the card buttons.</li>" +
                    "</ul>";
                oContent.tips =
                    "<ul>" +
                    "<li>Prioritize <em>Overdue</em> assignments — complete them before other tasks.</li>" +
                    "<li>Click a KPI card to instantly filter the list by that status.</li>" +
                    "<li>Open training URLs directly to access SAP Courses content.</li>" +
                    "<li>Check back regularly for newly assigned trainings.</li>" +
                    "</ul>";
            }

            return oContent;
        },

        /* ================================================================== */
        /* CARD/TABLE VIEW TOGGLE                                              */
        /* ================================================================== */

        /**
         * Toggle between Card and Table view modes for Assignments.
         */
        onAssignViewModeChange: function (oEvent) {
            var sKey = oEvent.getParameter("key") || oEvent.getSource().getSelectedKey();
            var oViewMode = this.getView().getModel("assignViewMode");
            var oSmartTable = this.byId("assignSmartTable");

            // H33 FIX: Always exit full-screen before switching views
            if (oSmartTable) {
                try {
                    if (typeof oSmartTable.setFullScreen === "function") {
                        oSmartTable.setFullScreen(false);
                    }
                } catch (_e) { /* ignore */ }
                try {
                    var oFullScreenBtn = oSmartTable._oFullScreenButton || oSmartTable.byId("btnFullScreen");
                    if (oFullScreenBtn && oSmartTable._bFullScreen) {
                        oFullScreenBtn.firePress();
                    }
                } catch (_e) { /* ignore */ }
            }

            if (sKey === "cards") {
                oViewMode.setProperty("/showCards", true);
                oViewMode.setProperty("/showTable", false);
                oViewMode.setProperty("/mode", "cards");
                this._rebindAssignCardGrid();
            } else {
                oViewMode.setProperty("/showCards", false);
                oViewMode.setProperty("/showTable", true);
                oViewMode.setProperty("/mode", "table");
                if (oSmartTable) { oSmartTable.rebindTable(true); }
            }
        },

        /**
         * Rebind the assignment card grid with current SmartFilterBar filters.
         */
        _rebindAssignCardGrid: function () {
            var oCardGrid = this.byId("assignCardGrid");
            if (!oCardGrid) { return; }

            var oSmartFilterBar = this.byId("assignSmartFilterBar");
            var oComponent = this.getOwnerComponent();
            var sCurrentUserId = oComponent.getCurrentUserId();
            var aFilters = [];

            // Filter by current user when userId is available
            if (sCurrentUserId) {
                aFilters.push(new Filter("UserId", FilterOperator.EQ, sCurrentUserId));
            }

            // Read filter values from FilterGroupItems
            if (oSmartFilterBar && oSmartFilterBar.getFilterGroupItems) {
                var aFGItems = oSmartFilterBar.getFilterGroupItems();
                for (var g = 0; g < aFGItems.length; g++) {
                    var oFGI = aFGItems[g];
                    var sName = oFGI.getName ? oFGI.getName() : "";
                    var oControl = oFGI.getControl ? oFGI.getControl() : null;
                    if (oControl && typeof oControl.getSelectedKey === "function") {
                        var sKey = oControl.getSelectedKey();
                        if (sKey && sKey !== "Overdue") {
                            aFilters.push(new Filter(sName, FilterOperator.EQ, sKey));
                        } else if (sKey === "Overdue") {
                            var oStatusFilter = new Filter({
                                filters: [
                                    new Filter("Status", FilterOperator.EQ, "Assigned"),
                                    new Filter("Status", FilterOperator.EQ, "In Progress")
                                ],
                                and: false
                            });
                            var dToday = new Date();
                            dToday.setHours(0, 0, 0, 0);
                            aFilters.push(new Filter({
                                filters: [oStatusFilter, new Filter("DueDate", FilterOperator.LT, dToday)],
                                and: true
                            }));
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

            var oBinding = oCardGrid.getBinding("items");
            if (oBinding) {
                oBinding.filter(aFilters);
                oBinding.attachEventOnce("dataReceived", this._onAssignCardDataReceived.bind(this));
            } else {
                // Binding may not exist yet — retry after short delay
                var that = this;
                setTimeout(function () {
                    var oB = oCardGrid.getBinding("items");
                    if (oB) {
                        oB.filter(aFilters);
                        oB.attachEventOnce("dataReceived", that._onAssignCardDataReceived.bind(that));
                    }
                }, 500);
            }

            Log.info("[AssignCardGrid] Rebound with " + aFilters.length + " filters");
        },

        /**
         * Update card count when assignment card grid data is received.
         */
        _onAssignCardDataReceived: function () {
            var oViewMode = this.getView().getModel("assignViewMode");
            var oCardGrid = this.byId("assignCardGrid");
            if (oCardGrid) {
                var oBinding = oCardGrid.getBinding("items");
                var iCount = oBinding ? oBinding.getLength() : 0;
                oViewMode.setProperty("/cardCount", iCount);
            }
        },

        /* ================================================================== */
        /* CARD EVENT HANDLERS                                                 */
        /* ================================================================== */

        /**
         * Card press handler — toggle selection for multi-select operations.
         */
        onAssignCardPress: function () {
            // Default Active type handles selection in MultiSelect mode
        },

        /**
         * Card Start Training button — set status to In Progress.
         */
        onStartTrainingCard: function () {
            var oCardGrid = this.byId("assignCardGrid");
            if (!oCardGrid) { return; }
            var aSelectedItems = oCardGrid.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectAssignmentFirst"));
                return;
            }

            var oComponent = this.getOwnerComponent();
            var sCurrentUserId = oComponent.getCurrentUserId();
            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var that = this;

            var aValidContexts = [];
            aSelectedItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext();
                if (!oCtx) { return; }
                var oData = oCtx.getObject();
                if (oData.Status !== "Assigned") { return; }
                if (sCurrentUserId && oData.UserId !== sCurrentUserId) { return; }
                aValidContexts.push(oCtx);
            });

            if (aValidContexts.length === 0) {
                MessageToast.show(i18n.getText("noValidStartAssignments"));
                return;
            }

            var sMsg = i18n.getText("startTrainingConfirm", [aValidContexts.length]);
            MessageBox.confirm(sMsg, {
                title: i18n.getText("confirmTitle"),
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }
                    var oModel = oComponent.getModel();
                    oModel.refreshSecurityToken(function () {
                        var iDone = 0, iFail = 0, iTotal = aValidContexts.length;
                        aValidContexts.forEach(function (oCtx) {
                            oModel.update(oCtx.getPath(), { Status: "In Progress" }, {
                                success: function () {
                                    iDone++;
                                    if (iDone + iFail === iTotal) {
                                        MessageToast.show(i18n.getText("startTrainingSuccess", [iDone]));
                                        that._rebindAssignCardGrid();
                                        that._loadAnalytics();
                                    }
                                },
                                error: function () {
                                    iFail++;
                                    if (iDone + iFail === iTotal) {
                                        if (iDone > 0) { MessageToast.show(i18n.getText("startTrainingSuccess", [iDone])); }
                                        else { MessageBox.error(i18n.getText("updateFailed")); }
                                        that._rebindAssignCardGrid();
                                        that._loadAnalytics();
                                    }
                                }
                            });
                        });
                    }, function () { MessageBox.error(i18n.getText("securityTokenFailed")); });
                }
            });
        },

        /**
         * Card Mark Completed button — mark selected cards as completed.
         */
        onMarkCompletedCard: function () {
            var oCardGrid = this.byId("assignCardGrid");
            if (!oCardGrid) { return; }
            var aSelectedItems = oCardGrid.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectAssignmentFirst"));
                return;
            }

            var oComponent = this.getOwnerComponent();
            var sRole = oComponent._role || "User";
            var sCurrentUserId = oComponent.getCurrentUserId();

            var aValidContexts = [];
            var iSkippedCompleted = 0, iSkippedOthers = 0;
            aSelectedItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext();
                if (!oCtx) { return; }
                var oData = oCtx.getObject();
                if (oData.Status === "Completed") { iSkippedCompleted++; return; }
                if (sRole === "User" && (!sCurrentUserId || oData.UserId !== sCurrentUserId)) { iSkippedOthers++; return; }
                aValidContexts.push(oCtx);
            });

            var i18n = this.getView().getModel("i18n").getResourceBundle();
            if (aValidContexts.length === 0) {
                if (iSkippedCompleted > 0) { MessageToast.show(i18n.getText("alreadyCompleted")); }
                else if (iSkippedOthers > 0) { MessageToast.show(i18n.getText("cannotCompleteOthers")); }
                else { MessageToast.show(i18n.getText("selectAssignmentFirst")); }
                return;
            }

            if (aValidContexts.length === 1) {
                this._markCompleted(aValidContexts[0]);
            } else {
                this._markCompletedBulk(aValidContexts);
            }
        },

        /**
         * Card inline Start button press — start training for single card item.
         */
        onAssignCardStart: function (oEvent) {
            var oItem = oEvent.getSource();
            while (oItem && !oItem.getBindingContext()) { oItem = oItem.getParent(); }
            if (!oItem) { return; }
            var oCtx = oItem.getBindingContext();
            if (!oCtx) { return; }
            var oData = oCtx.getObject();
            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var that = this;

            if (oData.Status !== "Assigned") {
                MessageToast.show(i18n.getText("noValidStartAssignments"));
                return;
            }

            MessageBox.confirm(i18n.getText("startTrainingConfirm", [1]), {
                title: i18n.getText("confirmTitle"),
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }
                    var oModel = that.getOwnerComponent().getModel();
                    oModel.refreshSecurityToken(function () {
                        oModel.update(oCtx.getPath(), { Status: "In Progress" }, {
                            success: function () {
                                MessageToast.show(i18n.getText("startTrainingSuccess", [1]));
                                that._rebindAssignCardGrid();
                                that._loadAnalytics();
                            },
                            error: function () { MessageBox.error(i18n.getText("updateFailed")); }
                        });
                    }, function () { MessageBox.error(i18n.getText("securityTokenFailed")); });
                }
            });
        },

        /**
         * Card inline Complete button press — mark single card item as completed.
         */
        onAssignCardComplete: function (oEvent) {
            var oItem = oEvent.getSource();
            while (oItem && !oItem.getBindingContext()) { oItem = oItem.getParent(); }
            if (!oItem) { return; }
            var oCtx = oItem.getBindingContext();
            if (!oCtx) { return; }
            this._markCompleted(oCtx);
        },

        /**
         * Card inline Detail button press — open assignment detail dialog.
         */
        onAssignCardDetail: function (oEvent) {
            var oItem = oEvent.getSource();
            while (oItem && !oItem.getBindingContext()) { oItem = oItem.getParent(); }
            if (!oItem) { return; }
            var oCtx = oItem.getBindingContext();
            if (!oCtx) { return; }
            // Simulate itemPress event for existing detail dialog handler
            this.onItemPress({ getParameter: function () { return null; }, getSource: function () { return oItem; } });
        },

        /**
         * Card inline Open URL button press — open training URL in new tab.
         */
        onAssignCardOpenUrl: function (oEvent) {
            var oItem = oEvent.getSource();
            while (oItem && !oItem.getBindingContext()) { oItem = oItem.getParent(); }
            if (!oItem) { return; }
            var oCtx = oItem.getBindingContext();
            if (!oCtx) { return; }
            var sUrl = oCtx.getProperty("Url");
            if (sUrl && /^https?:\/\//i.test(sUrl)) {
                sap.m.URLHelper.redirect(sUrl, true);
            } else {
                MessageToast.show("No URL available for this assignment.");
            }
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
            var aCards = ["myTotalBox", "myAssignedBox", "myInProgressBox", "myOverdueBox", "myCompletedBox"];
            var that = this;
            aCards.forEach(function (id) {
                var oCard = that.byId(id);
                if (oCard) { oCard.detachBrowserEvent("click"); }
            });
        },

        /* ================================================================== */
        /* START TRAINING – Set status to "In Progress"                       */
        /* ================================================================== */

        onStartTraining: function () {
            var oSmartTable = this.byId("assignSmartTable");
            var oTable = oSmartTable.getTable();
            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var that = this;

            var aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageToast.show(i18n.getText("selectAssignmentFirst"));
                return;
            }

            var oComponent = this.getOwnerComponent();
            var sCurrentUserId = oComponent.getCurrentUserId();

            // Filter to only "Assigned" status items belonging to current user
            var aValidContexts = [];
            aSelectedItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext();
                if (!oCtx) { return; }
                var oData = oCtx.getObject();
                if (oData.Status !== "Assigned") { return; }
                if (sCurrentUserId && oData.UserId !== sCurrentUserId) { return; }
                aValidContexts.push(oCtx);
            });

            if (aValidContexts.length === 0) {
                MessageToast.show(i18n.getText("noValidStartAssignments"));
                return;
            }

            var sMsg = i18n.getText("startTrainingConfirm", [aValidContexts.length]);
            MessageBox.confirm(sMsg, {
                title: i18n.getText("confirmTitle"),
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }
                    var oModel = oComponent.getModel();
                    // Temporarily disable batch to send individual MERGE requests
                    var bOldBatch = oModel.bUseBatch;
                    oModel.setUseBatch(false);
                    oModel.refreshSecurityToken(function () {
                        var iDone = 0, iFail = 0, iTotal = aValidContexts.length;
                        aValidContexts.forEach(function (oCtx) {
                            var sPath = oCtx.getPath();
                            oModel.update(sPath, { Status: "In Progress" }, {
                                merge: true,
                                success: function () {
                                    iDone++;
                                    if (iDone + iFail === iTotal) {
                                        oModel.setUseBatch(bOldBatch);
                                        MessageToast.show(i18n.getText("startTrainingSuccess", [iDone]));
                                        oSmartTable.rebindTable(true);
                                        that._loadAnalytics();
                                    }
                                },
                                error: function (oError) {
                                    iFail++;
                                    if (iDone + iFail === iTotal) {
                                        oModel.setUseBatch(bOldBatch);
                                        if (iDone > 0) {
                                            MessageToast.show(i18n.getText("startTrainingSuccess", [iDone]));
                                        } else {
                                            // H26 FIX: Show actual server error message
                                            var sMsg = i18n.getText("updateFailed");
                                            try {
                                                var parsed = JSON.parse(oError.responseText);
                                                sMsg = (parsed.error && parsed.error.message && (parsed.error.message.value || parsed.error.message)) || sMsg;
                                            } catch (_e) { /* ignore */ }
                                            MessageBox.error(sMsg);
                                        }
                                        oSmartTable.rebindTable(true);
                                        that._loadAnalytics();
                                    }
                                }
                            });
                        });
                    }, function () {
                        oModel.setUseBatch(bOldBatch);
                        MessageBox.error(i18n.getText("securityTokenFailed"));
                    });
                }
            });
        },

        /* ================================================================== */
        /* MARK COMPLETED – Toolbar button (acts on selected row)             */
        /* ================================================================== */

        onMarkCompletedBtn: function () {
            var oSmartTable = this.byId("assignSmartTable");
            var oTable = oSmartTable.getTable();
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            // ADD-3: Bulk operations — support multiple selection
            var aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageToast.show(i18n.getText("selectAssignmentFirst"));
                return;
            }

            // BUG-2 FIX: End users can only complete their own assignments
            var oComponent = this.getOwnerComponent();
            var sRole = oComponent._role || "User";
            var sCurrentUserId = oComponent.getCurrentUserId();

            // Validate selected items
            var aValidContexts = [];
            var iSkippedCompleted = 0, iSkippedOthers = 0;
            aSelectedItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext();
                if (!oCtx) { return; }
                var oData = oCtx.getObject();
                if (oData.Status === "Completed") { iSkippedCompleted++; return; }
                if (sRole === "User" && (!sCurrentUserId || oData.UserId !== sCurrentUserId)) { iSkippedOthers++; return; }
                aValidContexts.push(oCtx);
            });

            if (aValidContexts.length === 0) {
                if (iSkippedCompleted > 0) { MessageToast.show(i18n.getText("alreadyCompleted")); }
                else if (iSkippedOthers > 0) { MessageToast.show(i18n.getText("cannotCompleteOthers")); }
                else { MessageToast.show(i18n.getText("selectAssignmentFirst")); }
                return;
            }

            // Single or bulk complete
            if (aValidContexts.length === 1) {
                this._markCompleted(aValidContexts[0]);
            } else {
                this._markCompletedBulk(aValidContexts);
            }
        },

        /* ===== Item Press – Detail dialog via XML Fragment (UI-1) ===== */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) { return; }
            var oAssignment = oContext.getObject();
            var that = this;

            // Store context reference for Mark Completed action
            this._detailContext = oContext;

            // Destroy previous dialog
            if (this._detailDlg) { this._detailDlg.destroy(); this._detailDlg = null; }

            // Compute display values for detail model — FIX 5.1/4.1: Use shared formatter + i18n
            var sStatusState = SharedFormatter.formatStatusState(oAssignment.Status, oAssignment.DueDate);
            var sStatusIcon = SharedFormatter.formatStatusIcon(oAssignment.Status, oAssignment.DueDate);
            var sDueDate = SharedFormatter.formatDate(oAssignment.DueDate) || i18n.getText("notSet");
            var sCompDate = oAssignment.CompletionDate ? SharedFormatter.formatDate(oAssignment.CompletionDate) : "\u2014";

            var oDetailModel = new JSONModel({
                Title: oAssignment.Title || "Untitled",
                Status: oAssignment.Status,
                StatusState: sStatusState,
                StatusIcon: sStatusIcon,
                SapModule: oAssignment.SapModule || "",
                Role: oAssignment.Role || "",
                Topic: oAssignment.Topic || "",
                UserDisplayText: (oAssignment.UserName || "") + " (" + (oAssignment.UserId || "") + ")",
                DueDateText: sDueDate,
                CompletionDateText: sCompDate,
                Url: oAssignment.Url || "",
                showMarkCompleted: oAssignment.Status !== "Completed",
                staleWarning: false
            });

            this.loadFragment({
                name: "z.sap.courses.fragments.AssignmentDetailDialog"
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
                    that._detailContext = null;
                });
                oDialog.open();

                // PG-4: Async stale data check — compare assignment snapshot with current training title
                if (oAssignment.TrainingId) {
                    var oModel = that.getOwnerComponent().getModel();
                    oModel.read("/Trainings('" + encodeURIComponent(oAssignment.TrainingId) + "')", {
                        success: function (oTraining) {
                            if (oTraining && oTraining.Title && oAssignment.Title &&
                                oTraining.Title !== oAssignment.Title && that._detailDlg) {
                                oDetailModel.setProperty("/staleWarning", true);
                            }
                        },
                        error: function () { /* silently ignore — just skip stale check */ }
                    });
                }
            });
        },

        onAssignmentDetailClose: function () {
            if (this._detailDlg) { this._detailDlg.close(); }
        },

        onOpenAssignmentUrl: function () {
            if (this._detailDlg) {
                var sUrl = this._detailDlg.getModel("detail").getProperty("/Url");
                if (sUrl) { sap.m.URLHelper.redirect(sUrl, true); }
            }
        },

        onAssignmentDetailComplete: function () {
            if (this._detailDlg && this._detailContext) {
                this._detailDlg.close();
                this._markCompleted(this._detailContext);
            }
        },

        /* ================================================================== */
        /* MARK COMPLETED – Core logic with confirmation + bound action     */
        /* FIX 1.1: Use server-side markCompleted bound action instead of   */
        /* oModel.update() to ensure recurring logic, auth checks, etc.     */
        /* ================================================================== */

        _markCompleted: function (oContext) {
            var that = this;
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            // BUG-2 FIX: Belt-and-suspenders ownership check (covers all code paths)
            var oComponent = this.getOwnerComponent();
            var sRole = oComponent._role || "User";
            var sCurrentUserId = oComponent.getCurrentUserId();
            var oAssignment = oContext.getObject();
            if (sRole === "User" && (!sCurrentUserId || oAssignment.UserId !== sCurrentUserId)) {
                MessageToast.show(i18n.getText("cannotCompleteOthers"));
                return;
            }

            // CR-6 FIX: Replicate server-side status guard
            if (oAssignment.Status === "Completed") {
                MessageToast.show(i18n.getText("alreadyCompleted") || "Assignment is already completed.");
                return;
            }

            MessageBox.confirm(i18n.getText("confirmText"), {
                title: i18n.getText("confirmTitle"),
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }

                    var oModel = that.getView().getModel();
                    var oSmartTable = that.byId("assignSmartTable");
                    if (oSmartTable) { oSmartTable.setBusy(true); }

                    // FIX 1.1: Call markCompleted as OData V2 Function Import (POST)
                    // ABAP SEGW defines markCompleted as a function import with parameter Id
                    var sEntitySet = oComponent.getAssignmentEntitySet ? oComponent.getAssignmentEntitySet() : 'TrainingAssignments';
                    var sId = oAssignment.ID || oAssignment.Id;
                    var sServiceUrl = oModel.sServiceUrl || '';
                    var sActionUrl = sServiceUrl + "/markCompleted?Id='" + sId + "'";

                    jQuery.ajax({
                        url: sActionUrl,
                        method: "POST",
                        contentType: "application/json",
                        data: JSON.stringify({}),
                        headers: oModel.getHeaders(),
                        success: function () {
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            MessageToast.show(i18n.getText("markedCompleted"));
                            oModel.refresh(true);
                            that._filterByStatus("Completed");
                            that._loadAnalytics();
                        },
                        error: function (xhr) {
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            var msg = i18n.getText("updateFailed");
                            try {
                                var parsed = JSON.parse(xhr.responseText);
                                msg = (parsed.error && parsed.error.message && (parsed.error.message.value || parsed.error.message)) || msg;
                            } catch (e) {
                                msg = (xhr && xhr.statusText) || msg;
                            }
                            MessageBox.error(msg);
                        }
                    });
                }
            });
        },

        /**
         * ADD-3: Bulk mark completed — FIX 1.1: Call bound action for each assignment
         * Uses sequential AJAX calls to server-side markCompleted action.
         */
        _markCompletedBulk: function (aContexts) {
            var that = this;
            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var iCount = aContexts.length;

            MessageBox.confirm(i18n.getText("confirmBulkComplete", [iCount]), {
                title: i18n.getText("confirmTitle"),
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }

                    var oModel = that.getView().getModel();
                    var oComponent = that.getOwnerComponent();
                    var sEntitySet = oComponent.getAssignmentEntitySet ? oComponent.getAssignmentEntitySet() : 'TrainingAssignments';
                    var sServiceUrl = oModel.sServiceUrl || '';
                    var oSmartTable = that.byId("assignSmartTable");
                    if (oSmartTable) { oSmartTable.setBusy(true); }

                    // Build array of function import call promises
                    var aPromises = aContexts.map(function (oCtx) {
                        var oData = oCtx.getObject();
                        var sId = oData.ID || oData.Id;
                        // Use function import URL: markCompleted?Id='uuid'
                        var sActionUrl = sServiceUrl + "/markCompleted?Id='" + sId + "'";
                        return new Promise(function (resolve, reject) {
                            jQuery.ajax({
                                url: sActionUrl,
                                method: "POST",
                                contentType: "application/json",
                                data: JSON.stringify({}),
                                headers: oModel.getHeaders(),
                                success: function () { resolve(); },
                                error: function (xhr) { reject(xhr); }
                            });
                        });
                    });

                    Promise.all(aPromises)
                        .then(function () {
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            oModel.refresh(true);
                            MessageToast.show(i18n.getText("bulkCompleteSuccess", [iCount]));
                            that._filterByStatus("Completed");
                            that._loadAnalytics();
                        })
                        .catch(function (xhr) {
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            oModel.refresh(true);
                            var msg = i18n.getText("updateFailed");
                            try {
                                var parsed = JSON.parse(xhr.responseText);
                                msg = (parsed.error && parsed.error.message && (parsed.error.message.value || parsed.error.message)) || msg;
                            } catch (e) { msg = (xhr && xhr.statusText) || msg; }
                            MessageBox.error(msg);
                        });
                }
            });
        },

        // ============================================================
        // C2: Reassign Assignment
        // ============================================================

        onReassign: function () {
            var oComponent = this.getOwnerComponent();
            if (!oComponent || !oComponent.openReassignDialog) return;

            var oTable = this.byId("assignSmartTable");
            var oInnerTable = oTable ? oTable.getTable() : null;
            if (!oInnerTable) return;

            var aSelected = oInnerTable.getSelectedItems ? oInnerTable.getSelectedItems() : [];
            if (aSelected.length === 0) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectAssignmentFirst"));
                return;
            }

            // Single reassign only
            var oCtx = aSelected[0].getBindingContext();
            if (!oCtx) return;
            var oData = oCtx.getObject();
            if (oData.Status === "Completed") {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("alreadyCompleted"));
                return;
            }

            oComponent.openReassignDialog(
                oData.ID || oData.Id,
                oData.UserId || oData.userId,
                oData.Title || oData.title
            );
        },

        // ============================================================
        // D2: Send Reminder Email
        // ============================================================

        onSendReminder: function () {
            var oComponent = this.getOwnerComponent();
            if (!oComponent || !oComponent.sendReminder) return;

            var oTable = this.byId("assignSmartTable");
            var oInnerTable = oTable ? oTable.getTable() : null;
            if (!oInnerTable) return;

            var aSelected = oInnerTable.getSelectedItems ? oInnerTable.getSelectedItems() : [];
            if (aSelected.length === 0) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectAssignmentFirst"));
                return;
            }

            var oCtx = aSelected[0].getBindingContext();
            if (!oCtx) return;
            var oData = oCtx.getObject();
            oComponent.sendReminder(
                oData.UserEmail || oData.userEmail || '',
                oData.UserName || oData.userName || oData.UserId || '',
                oData.Title || oData.title || ''
            );
        }
    });
});

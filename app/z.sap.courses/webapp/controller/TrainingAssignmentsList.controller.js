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
    "sap/ui/core/routing/History"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Log, Link, Text, ObjectStatus, History) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingAssignmentsList", {

        /**
         * Formatter: Return SAP icon based on the SAP module of the course.
         */
        getModuleIcon: function (sSapModule) {
            if (!sSapModule) { return "sap-icon://course-book"; }
            var s = sSapModule.toLowerCase();
            if (s.indexOf("fi-gl") >= 0 || s.indexOf("general ledger") >= 0) { return "sap-icon://waiver"; }
            if (s.indexOf("fi-ap") >= 0 || s.indexOf("accounts payable") >= 0) { return "sap-icon://money-bills"; }
            if (s.indexOf("fi-ar") >= 0 || s.indexOf("accounts receivable") >= 0) { return "sap-icon://wallet"; }
            if (s.indexOf("fi-aa") >= 0 || s.indexOf("asset accounting") >= 0) { return "sap-icon://building"; }
            if (s.indexOf("fi-lc") >= 0 || s.indexOf("consolidation") >= 0) { return "sap-icon://combine"; }
            if (s.indexOf("mm-pur") >= 0 || s.indexOf("procurement") >= 0) { return "sap-icon://cart"; }
            if (s.indexOf("mm-im") >= 0 || s.indexOf("inventory management") >= 0) { return "sap-icon://inventory"; }
            if (s.indexOf("sd-bil") >= 0 || (s.indexOf("billing") >= 0 && s.indexOf("sd") >= 0)) { return "sap-icon://sales-document"; }
            if (s.indexOf("sd-ret") >= 0 || (s.indexOf("returns") >= 0 && s.indexOf("sd") >= 0)) { return "sap-icon://undo"; }
            if (s.indexOf("sd") >= 0 || s.indexOf("sales") >= 0) { return "sap-icon://sales-order"; }
            if (s.indexOf("pp") >= 0 || s.indexOf("production") >= 0) { return "sap-icon://factory"; }
            if (s.indexOf("wm") >= 0 || s.indexOf("warehouse") >= 0) { return "sap-icon://inventory"; }
            if (s.indexOf("le-shp") >= 0 || s.indexOf("shipping") >= 0 || s.indexOf("logistics") >= 0) { return "sap-icon://shipping-status"; }
            if (s.indexOf("tr") >= 0 || s.indexOf("treasury") >= 0) { return "sap-icon://loan"; }
            if (s.indexOf("co-pa") >= 0 || s.indexOf("profitability") >= 0) { return "sap-icon://bar-chart"; }
            if (s.indexOf("co") >= 0 || s.indexOf("controlling") >= 0) { return "sap-icon://monitor-payments"; }
            if (s.indexOf("hcm") >= 0 || s.indexOf("human capital") >= 0) { return "sap-icon://group"; }
            if (s.indexOf("qm") >= 0 || s.indexOf("quality") >= 0) { return "sap-icon://quality-issue"; }
            if (s.indexOf("basis") >= 0 || s.indexOf("configuration") >= 0) { return "sap-icon://settings"; }
            if (s.indexOf("mdg") >= 0 || s.indexOf("master data") >= 0) { return "sap-icon://database"; }
            if (s.indexOf("pm") >= 0 || s.indexOf("plant maintenance") >= 0 || s.indexOf("maintenance") >= 0) { return "sap-icon://wrench"; }
            if (s.indexOf("cross") >= 0) { return "sap-icon://connected"; }
            if (s.indexOf("general") >= 0) { return "sap-icon://world"; }
            return "sap-icon://course-book";
        },

        /**
         * Formatter: Return icon color based on SAP module category.
         */
        getModuleIconColor: function (sSapModule) {
            if (!sSapModule) { return "#0854a0"; }
            var s = sSapModule.toLowerCase();
            if (s.indexOf("fi") >= 0 || s.indexOf("finance") >= 0) { return "#0854a0"; }
            if (s.indexOf("sd") >= 0 || s.indexOf("sales") >= 0 || s.indexOf("billing") >= 0) { return "#e76500"; }
            if (s.indexOf("mm") >= 0 || s.indexOf("procurement") >= 0 || s.indexOf("inventory") >= 0) { return "#945200"; }
            if (s.indexOf("pp") >= 0 || s.indexOf("production") >= 0) { return "#1a6b3c"; }
            if (s.indexOf("wm") >= 0 || s.indexOf("warehouse") >= 0 || s.indexOf("le") >= 0 || s.indexOf("shipping") >= 0 || s.indexOf("logistics") >= 0) { return "#354a5f"; }
            if (s.indexOf("tr") >= 0 || s.indexOf("treasury") >= 0) { return "#6c32a9"; }
            if (s.indexOf("co") >= 0 || s.indexOf("controlling") >= 0) { return "#d32a2a"; }
            if (s.indexOf("hcm") >= 0 || s.indexOf("human") >= 0) { return "#107e3e"; }
            if (s.indexOf("qm") >= 0 || s.indexOf("quality") >= 0) { return "#0a6ed1"; }
            if (s.indexOf("basis") >= 0 || s.indexOf("config") >= 0) { return "#556b82"; }
            if (s.indexOf("mdg") >= 0 || s.indexOf("master data") >= 0) { return "#0070f2"; }
            if (s.indexOf("pm") >= 0 || s.indexOf("maintenance") >= 0) { return "#945200"; }
            if (s.indexOf("cross") >= 0) { return "#354a5f"; }
            if (s.indexOf("general") >= 0) { return "#556b82"; }
            return "#0854a0";
        },

        /**
         * Formatter: "Completed: X  |  Remaining: Y"
         */
        formatCompletedRemaining: function (sPattern, iCompleted, iTotal) {
            if (sPattern && typeof iCompleted === "number" && typeof iTotal === "number") {
                return sPattern.replace("{0}", iCompleted).replace("{1}", (iTotal - iCompleted));
            }
            return "";
        },

        /**
         * Card Status Formatters — consistent overdue detection across card & table views.
         */
        formatCardStatus: function (sStatus, dDue) {
            var dNow = new Date(); dNow.setHours(0, 0, 0, 0);
            var bOverdue = sStatus !== "Completed" && dDue && new Date(dDue) < dNow;
            return bOverdue ? sStatus + " (Overdue)" : (sStatus || "");
        },

        formatCardStatusState: function (sStatus, dDue) {
            var dNow = new Date(); dNow.setHours(0, 0, 0, 0);
            var bOverdue = sStatus !== "Completed" && dDue && new Date(dDue) < dNow;
            if (bOverdue) { return "Error"; }
            return sStatus === "Completed" ? "Success" :
                   sStatus === "In Progress" ? "Information" : "Warning";
        },

        formatCardStatusIcon: function (sStatus, dDue) {
            var dNow = new Date(); dNow.setHours(0, 0, 0, 0);
            var bOverdue = sStatus !== "Completed" && dDue && new Date(dDue) < dNow;
            if (bOverdue) { return "sap-icon://alert"; }
            return sStatus === "Completed" ? "sap-icon://accept" :
                   sStatus === "In Progress" ? "sap-icon://activity-2" : "sap-icon://pending";
        },

        // C3: Priority badge formatters
        formatPriorityState: function (sPriority) {
            if (sPriority === "High") return "Error";
            if (sPriority === "Low") return "Success";
            return "Warning"; // Medium or default
        },

        formatPriorityIcon: function (sPriority) {
            if (sPriority === "High") return "sap-icon://warning";
            if (sPriority === "Low") return "sap-icon://sys-enter-2";
            return "sap-icon://hint";
        },

        onInit: function () {
            // Card/Table view mode toggle model
            var oViewModeModel = new JSONModel({
                showCards: true,
                showTable: false,
                mode: "cards",
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
            sap.ui.getCore().getEventBus().subscribe("sapCourses", "roleChanged", this._onRoleChanged, this);

            // Re-load data when userId is resolved from backend (async)
            this._onUserIdResolved = function () {
                fnDebouncedLoad();
            };
            sap.ui.getCore().getEventBus().subscribe("sapCourses", "userIdResolved", this._onUserIdResolved, this);

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
            var aCardIds = ["myTotalBox", "myAssignedBox", "myInProgressBox", "myCompletedBox"];
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
                                    return (sUrl && /^https?:\/\//i.test(sUrl)) ? "Open Training" : (sUrl || "");
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

                // ADD-1: Status → ObjectStatus with overdue indicator
                if (iStatusIdx >= 0 && iStatusIdx < aCells.length) {
                    var oStatusCell = aCells[iStatusIdx];
                    if (oStatusCell.getMetadata().getName() !== "sap.m.ObjectStatus") {
                        var oStatusCtrl = new ObjectStatus({
                            text: {
                                parts: [{ path: "Status" }, { path: "DueDate" }],
                                formatter: function (sStatus, dDue) {
                                    // Overdue = due date strictly before today, and not Completed
                                    var dNow = new Date(); dNow.setHours(0, 0, 0, 0);
                                    var bOverdue = sStatus !== "Completed" && dDue && new Date(dDue) < dNow;
                                    return bOverdue ? sStatus + " (Overdue)" : sStatus;
                                }
                            },
                            state: {
                                parts: [{ path: "Status" }, { path: "DueDate" }],
                                formatter: function (sStatus, dDue) {
                                    var dNow = new Date(); dNow.setHours(0, 0, 0, 0);
                                    var bOverdue = sStatus !== "Completed" && dDue && new Date(dDue) < dNow;
                                    if (bOverdue) { return "Error"; }
                                    return sStatus === "Completed" ? "Success" :
                                           sStatus === "In Progress" ? "Information" : "Warning";
                                }
                            },
                            icon: {
                                parts: [{ path: "Status" }, { path: "DueDate" }],
                                formatter: function (sStatus, dDue) {
                                    var dNow = new Date(); dNow.setHours(0, 0, 0, 0);
                                    var bOverdue = sStatus !== "Completed" && dDue && new Date(dDue) < dNow;
                                    if (bOverdue) { return "sap-icon://alert"; }
                                    return sStatus === "Completed" ? "sap-icon://accept" :
                                           sStatus === "In Progress" ? "sap-icon://activity-2" : "sap-icon://pending";
                                }
                            }
                        }).addStyleClass("assignmentStatusBadge");
                        oItem.removeCell(oStatusCell);
                        oItem.insertCell(oStatusCtrl, iStatusIdx);
                        oStatusCell.destroy();
                    }
                }

                // ADD-4: DueDate → ObjectStatus with color-coded warnings
                if (iDueDateIdx >= 0 && iDueDateIdx < aCells.length) {
                    var oDueDateCell = aCells[iDueDateIdx];
                    if (oDueDateCell.getMetadata().getName() !== "sap.m.ObjectStatus") {
                        var oDueDateCtrl = new ObjectStatus({
                            text: {
                                path: "DueDate",
                                formatter: function (dDate) {
                                    return dDate ? new Date(dDate).toLocaleDateString() : "Not set";
                                }
                            },
                            state: {
                                parts: [{ path: "DueDate" }, { path: "Status" }],
                                formatter: function (dDate, sStatus) {
                                    if (sStatus === "Completed" || !dDate) { return "None"; }
                                    var diff = Math.ceil((new Date(dDate) - new Date()) / 86400000);
                                    if (diff < 0) { return "Error"; }
                                    if (diff <= 7) { return "Warning"; }
                                    return "Success";
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

            // My Assignments: always filter by current user's UserId (all roles)
            var oComponent = this.getOwnerComponent();
            var sCurrentUserId = oComponent.getCurrentUserId();
            var sFilterId = sCurrentUserId || "__NOUSER__";
            mBindingParams.filters.push(new Filter("UserId", FilterOperator.EQ, sFilterId));
            Log.info("[AssignFilter] UserId filter: " + sFilterId);

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

        /* ===== Nav Back – use browser history for reliable back navigation ===== */
        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("TrainingsList", {}, true);
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
                title: "SAP Learning Courses – My Assignments Guide"
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
            if (sKey === "cards") {
                oViewMode.setProperty("/showCards", true);
                oViewMode.setProperty("/showTable", false);
                oViewMode.setProperty("/mode", "cards");
                this._rebindAssignCardGrid();
                // Exit full-screen if SmartTable was in full-screen
                var oSmartTable = this.byId("assignSmartTable");
                if (oSmartTable && oSmartTable._oFullScreenUtil) {
                    try { oSmartTable._oFullScreenUtil.cleanUpFullScreen(); } catch (e) { /* ignore */ }
                }
            } else {
                oViewMode.setProperty("/showCards", false);
                oViewMode.setProperty("/showTable", true);
                oViewMode.setProperty("/mode", "table");
                var oSmartTable = this.byId("assignSmartTable");
                if (oSmartTable) { oSmartTable.rebindTable(); }
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

            // Always filter by current user
            aFilters.push(new Filter("UserId", FilterOperator.EQ, sCurrentUserId || "__NOUSER__"));

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
            sap.ui.getCore().getEventBus().unsubscribe("sapCourses", "roleChanged", this._onRoleChanged, this);
            sap.ui.getCore().getEventBus().unsubscribe("sapCourses", "userIdResolved", this._onUserIdResolved, this);
            var aCards = ["myTotalBox", "myAssignedBox", "myInProgressBox", "myCompletedBox"];
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
                    oModel.refreshSecurityToken(function () {
                        var iDone = 0, iFail = 0, iTotal = aValidContexts.length;
                        aValidContexts.forEach(function (oCtx) {
                            var sPath = oCtx.getPath();
                            oModel.update(sPath, { Status: "In Progress" }, {
                                success: function () {
                                    iDone++;
                                    if (iDone + iFail === iTotal) {
                                        MessageToast.show(i18n.getText("startTrainingSuccess", [iDone]));
                                        oSmartTable.rebindTable(true);
                                        that._loadAnalytics();
                                    }
                                },
                                error: function () {
                                    iFail++;
                                    if (iDone + iFail === iTotal) {
                                        if (iDone > 0) {
                                            MessageToast.show(i18n.getText("startTrainingSuccess", [iDone]));
                                        } else {
                                            MessageBox.error(i18n.getText("updateFailed"));
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

            // Compute display values for detail model
            var sStatusState = oAssignment.Status === "Completed" ? "Success" :
                               oAssignment.Status === "In Progress" ? "Information" : "Warning";
            var sStatusIcon = oAssignment.Status === "Completed" ? "sap-icon://accept" :
                              oAssignment.Status === "In Progress" ? "sap-icon://activity-2" : "sap-icon://pending";
            var sDueDate = oAssignment.DueDate ? new Date(oAssignment.DueDate).toLocaleDateString() : "Not set";
            var sCompDate = oAssignment.CompletionDate ? new Date(oAssignment.CompletionDate).toLocaleDateString() : "\u2014";

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
        /* MARK COMPLETED – Core logic with confirmation + OData update        */
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

            // CR-6 FIX: Replicate server-side status guard (since OData V2 doesn't support bound actions)
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
                            // FEAT-3: Show completed assignments after marking
                            that._filterByStatus("Completed");
                            that._loadAnalytics();
                        },
                        error: function (err) {
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            var msg = i18n.getText("updateFailed");
                            try {
                                var parsed = JSON.parse(err.responseText);
                                msg = (parsed.error && parsed.error.message && parsed.error.message.value) || msg;
                            } catch (e) {
                                msg = (err && err.message) || msg;
                            }
                            MessageBox.error(msg);
                        }
                    });
                }
            });
        },

        /**
         * ADD-3: Bulk mark completed — update multiple assignments in batch.
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
                    var oSmartTable = that.byId("assignSmartTable");
                    if (oSmartTable) { oSmartTable.setBusy(true); }

                    // M-2 FIX: Save original deferred groups and restore after completion
                    var aOriginalDeferred = oModel.getDeferredGroups() || [];
                    var aNewDeferred = aOriginalDeferred.indexOf("bulkComplete") >= 0
                        ? aOriginalDeferred
                        : aOriginalDeferred.concat(["bulkComplete"]);
                    oModel.setDeferredGroups(aNewDeferred);

                    var dNow = new Date();
                    aContexts.forEach(function (oCtx) {
                        oModel.update(oCtx.getPath(), {
                            Status: "Completed",
                            CompletionDate: dNow
                        }, { groupId: "bulkComplete" });
                    });

                    oModel.submitChanges({
                        groupId: "bulkComplete",
                        success: function () {
                            oModel.setDeferredGroups(aOriginalDeferred);
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            MessageToast.show(i18n.getText("bulkCompleteSuccess", [iCount]));
                            that._filterByStatus("Completed");
                            that._loadAnalytics();
                        },
                        error: function (err) {
                            oModel.setDeferredGroups(aOriginalDeferred);
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            var msg = i18n.getText("updateFailed");
                            try {
                                var parsed = JSON.parse(err.responseText);
                                msg = (parsed.error && parsed.error.message && parsed.error.message.value) || msg;
                            } catch (e) { msg = (err && err.message) || msg; }
                            MessageBox.error(msg);
                        }
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

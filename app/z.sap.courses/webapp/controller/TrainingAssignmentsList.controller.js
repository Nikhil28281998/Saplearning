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
    "sap/m/HBox",
    "sap/m/VBox",
    "sap/m/ProgressIndicator",
    "z/sap/courses/services/AnalyticsService"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Log, Link, Text, ObjectStatus, HBox, VBox, ProgressIndicator, AnalyticsService) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingAssignmentsList", {

        onInit: function () {
            this._analyticsService = new AnalyticsService();

            // User's own progress model
            var oAnalyticsModel = new JSONModel({
                assigned: 0,
                inProgress: 0,
                completed: 0,
                completionPercent: 0
            });
            this.getView().setModel(oAnalyticsModel, "assignAnalytics");

            // Manager team analytics model
            var oTeamModel = new JSONModel({
                totalAssignments: 0,
                assigned: 0,
                inProgress: 0,
                completed: 0,
                completionPercent: 0,
                userBreakdown: []
            });
            this.getView().setModel(oTeamModel, "teamAnalytics");

            // BUG-4: Team analytics moved to home page (TrainingsList).
            // This model is kept for backward compatibility with view bindings
            // but _loadTeamAnalytics is no longer called from this controller.

            // Dynamically set entity set name on SmartFilterBar + SmartTable
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
                    that._loadAnalytics();
                });
            } else {
                this._loadAnalytics();
            }

            // Re-load data when role changes (async fetch may complete after initial load)
            sap.ui.getCore().getEventBus().subscribe("sapCourses", "roleChanged", function () {
                var oST = that.byId("assignSmartTable");
                if (oST) { oST.rebindTable(true); }
                that._loadAnalytics();
            }, this);

            // Reload data every time user navigates to this page
            var oRouter = oComponent.getRouter();
            if (oRouter) {
                oRouter.getRoute("TrainingAssignmentsList").attachPatternMatched(function () {
                    var oST = that.byId("assignSmartTable");
                    if (oST) { oST.rebindTable(true); }
                    that._loadAnalytics();

                    // FEAT-2: Apply pending status filter from home page click-through
                    var sPending = oComponent._pendingAssignmentFilter;
                    if (sPending) {
                        oComponent._pendingAssignmentFilter = null;
                        setTimeout(function () { that._filterByStatus(sPending); }, 300);
                    }
                }, this);
            }

            // FEAT-2: Analytics click-through — click card to filter table
            var aClickCards = [
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
            // Click progress radial to clear status filter
            var oProgressCard = this.byId("myProgressBox");
            if (oProgressCard) {
                oProgressCard.addStyleClass("analyticsCardClickable");
                oProgressCard.attachBrowserEvent("click", function () {
                    that._filterByStatus("");
                });
            }
        },

        /* ================================================================== */
        /* USER ANALYTICS – My own progress                                   */
        /* ================================================================== */

        _loadAnalytics: function () {
            var oComponent = this.getOwnerComponent();
            var oModel = oComponent.getModel();
            var oAnalyticsModel = this.getView().getModel("assignAnalytics");
            var sEntitySet = oComponent.getAssignmentEntitySet();
            var sUserId = oComponent.getCurrentUserId();

            var oPanel = this.byId("myProgressPanel");
            if (oPanel) { oPanel.setBusy(true); }

            // BUG-1 FIX: My Progress always shows current user's own stats
            var aUserFilters = [];
            if (sUserId) {
                aUserFilters.push(new Filter("UserId", FilterOperator.EQ, sUserId));
            }

            this._analyticsService.getAssignmentStats(oModel, sEntitySet, aUserFilters).then(function (oStats) {
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

        /* ================================================================== */
        /* TEAM ANALYTICS – Manager/Admin org-wide view                       */
        /* Shows all assignments across all users with per-user breakdown     */
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

            // Load ALL assignments (manager has full READ access)
            oModel.read("/" + sEntitySet, {
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

                        // Per-user breakdown
                        var sUser = a.UserId || "UNKNOWN";
                        if (!oUserMap[sUser]) {
                            oUserMap[sUser] = {
                                userId: sUser,
                                userName: a.UserName || sUser,
                                total: 0,
                                completed: 0
                            };
                        }
                        oUserMap[sUser].total++;
                        if (a.Status === "Completed") { oUserMap[sUser].completed++; }
                    });

                    var iPct = iTotal > 0 ? Math.round((iCompleted / iTotal) * 100) : 0;

                    oTeamModel.setProperty("/totalAssignments", iTotal);
                    oTeamModel.setProperty("/assigned", iAssigned);
                    oTeamModel.setProperty("/inProgress", iInProgress);
                    oTeamModel.setProperty("/completed", iCompleted);
                    oTeamModel.setProperty("/completionPercent", iPct);

                    // Build per-user breakdown array
                    var aUsers = Object.keys(oUserMap).map(function (k) { return oUserMap[k]; });
                    aUsers.sort(function (a, b) {
                        var pctA = a.total > 0 ? a.completed / a.total : 0;
                        var pctB = b.total > 0 ? b.completed / b.total : 0;
                        return pctB - pctA;
                    });
                    oTeamModel.setProperty("/userBreakdown", aUsers);
                    that._buildUserProgressList(aUsers);

                    if (oPanel) { oPanel.setBusy(false); }
                },
                error: function (err) {
                    Log.warning("[TeamAnalytics] Failed to load: " + (err && err.message || ""));
                    if (oPanel) { oPanel.setBusy(false); }
                }
            });
        },

        /**
         * Build per-user progress list in the Team Analytics chart area.
         * Shows each user's name, completion bar, and count.
         */
        _buildUserProgressList: function (aUsers) {
            var oContainer = this.byId("teamUserListContainer");
            if (!oContainer) { return; }
            oContainer.destroyItems();

            if (aUsers.length === 0) {
                oContainer.addItem(new Text({ text: "No user assignments found" }));
                return;
            }

            // Show top 10 users by completion
            var aTop = aUsers.slice(0, 10);
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            aTop.forEach(function (u) {
                var iPct = u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0;
                var sState = iPct >= 100 ? "Success" : iPct >= 50 ? "Warning" : "Error";

                var oRow = new HBox({
                    alignItems: "Center",
                    justifyContent: "SpaceBetween",
                    width: "100%",
                    items: [
                        new VBox({
                            width: "35%",
                            items: [
                                new Text({
                                    text: u.userName || u.userId,
                                    wrapping: false
                                }).addStyleClass("teamUserName"),
                                new Text({
                                    text: u.userId,
                                    wrapping: false
                                }).addStyleClass("teamUserId")
                            ]
                        }),
                        new ProgressIndicator({
                            percentValue: iPct,
                            displayValue: u.completed + "/" + u.total + " (" + iPct + "%)",
                            state: sState,
                            width: "55%",
                            height: "1.25rem"
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
        },

        /* ================================================================== */
        /* SMART TABLE INIT – Apply link templates + status column + actions   */
        /* ================================================================== */

        onSmartTableInit: function () {
            var oSmartTable = this.byId("assignSmartTable");
            var oTable = oSmartTable.getTable();
            var that = this;
            if (oTable) {
                oTable.setMode("SingleSelectMaster");
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
            var iUrlIdx = -1, iStatusIdx = -1;
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
                        } catch (e) { /* ignore parse errors */ }
                    }
                }
                // Fallback: header text (for SmartTable without p13nData)
                if (iUrlIdx < 0 || iStatusIdx < 0) {
                    var oHeader = oCol.getHeader();
                    var sLabel = (oHeader && typeof oHeader.getText === "function") ? oHeader.getText() : "";
                    if ((sLabel === "Url" || sLabel === "Training Link") && iUrlIdx < 0) { iUrlIdx = iIdx; }
                    if (sLabel === "Status" && iStatusIdx < 0) { iStatusIdx = iIdx; }
                }
            });

            aItems.forEach(function (oItem) {
                if (!oItem.getCells) { return; }
                var aCells = oItem.getCells();

                // Url → Link with OData binding (survives context changes)
                if (iUrlIdx >= 0 && iUrlIdx < aCells.length) {
                    var oUrlCell = aCells[iUrlIdx];
                    if (oUrlCell.getMetadata().getName() !== "sap.m.Link") {
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

                // Status → ObjectStatus with OData binding
                if (iStatusIdx >= 0 && iStatusIdx < aCells.length) {
                    var oStatusCell = aCells[iStatusIdx];
                    if (oStatusCell.getMetadata().getName() !== "sap.m.ObjectStatus") {
                        var oStatusCtrl = new ObjectStatus({
                            text: "{Status}",
                            state: {
                                path: "Status",
                                formatter: function (s) {
                                    return s === "Completed" ? "Success" :
                                           s === "In Progress" ? "Information" : "Warning";
                                }
                            },
                            icon: {
                                path: "Status",
                                formatter: function (s) {
                                    return s === "Completed" ? "sap-icon://accept" :
                                           s === "In Progress" ? "sap-icon://activity-2" : "sap-icon://pending";
                                }
                            }
                        }).addStyleClass("assignmentStatusBadge");
                        oItem.removeCell(oStatusCell);
                        oItem.insertCell(oStatusCtrl, iStatusIdx);
                        oStatusCell.destroy();
                    }
                }
            });

            Log.info("[AssignLinks] Column templates applied (Url=" + iUrlIdx + ", Status=" + iStatusIdx + ")");
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
         * FEAT-2: Filter SmartTable by status via the SmartFilterBar Status Select.
         * Pass empty string to clear the status filter.
         */
        _filterByStatus: function (sStatus) {
            var oSelect = this.byId("filterAssignStatus");
            if (oSelect) {
                oSelect.setSelectedKey(sStatus);
            }
            var oSmartFilterBar = this.byId("assignSmartFilterBar");
            if (oSmartFilterBar) {
                oSmartFilterBar.search();
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
                if ((oFilter.sPath === "Role" || oFilter.sPath === "SapModule" || oFilter.sPath === "Status") &&
                    oFilter.sOperator && oFilter.sOperator !== FilterOperator.EQ) {
                    return new Filter(oFilter.sPath, FilterOperator.EQ, oFilter.oValue1);
                }
                return oFilter;
            };
            for (var i = 0; i < mBindingParams.filters.length; i++) {
                mBindingParams.filters[i] = fnSanitize(mBindingParams.filters[i]);
            }

            // BUG-1 FIX: End users only see their own assignments
            var oComponent = this.getOwnerComponent();
            var sRole = oComponent._role || "User";
            var sCurrentUserId = oComponent.getCurrentUserId();
            if (sRole === "User" && sCurrentUserId) {
                mBindingParams.filters.push(new Filter("UserId", FilterOperator.EQ, sCurrentUserId));
                Log.info("[AssignFilter] UserId filter for end user: " + sCurrentUserId);
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

        /* ===== Nav Back ===== */
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("TrainingsList", {}, true);
        },

        /* ================================================================== */
        /* MARK COMPLETED – Toolbar button (acts on selected row)             */
        /* ================================================================== */

        onMarkCompletedBtn: function () {
            var oSmartTable = this.byId("assignSmartTable");
            var oTable = oSmartTable.getTable();
            var oSelectedItem = oTable.getSelectedItem();
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            if (!oSelectedItem) {
                MessageToast.show(i18n.getText("selectAssignmentFirst"));
                return;
            }
            var oContext = oSelectedItem.getBindingContext();
            if (!oContext) { return; }
            var oAssignment = oContext.getObject();

            if (oAssignment.Status === "Completed") {
                MessageToast.show(i18n.getText("alreadyCompleted"));
                return;
            }

            // BUG-2 FIX: End users can only complete their own assignments
            var oComponent = this.getOwnerComponent();
            var sRole = oComponent._role || "User";
            var sCurrentUserId = oComponent.getCurrentUserId();
            if (sRole === "User" && sCurrentUserId && oAssignment.UserId !== sCurrentUserId) {
                MessageToast.show(i18n.getText("cannotCompleteOthers"));
                return;
            }

            this._markCompleted(oContext);
        },

        /* ===== Item Press – Detail dialog with actions ===== */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) { return; }
            var oAssignment = oContext.getObject();
            var that = this;
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            // Build detail content with modern card layout
            if (this._detailDlg) { this._detailDlg.destroy(); this._detailDlg = null; }

            var aContent = [];

            // Header card with training title + status badge
            var sStatusState = oAssignment.Status === "Completed" ? "Success" :
                               oAssignment.Status === "In Progress" ? "Information" : "Warning";
            var sStatusIcon = oAssignment.Status === "Completed" ? "sap-icon://accept" :
                              oAssignment.Status === "In Progress" ? "sap-icon://activity-2" : "sap-icon://pending";

            aContent.push(new sap.m.VBox({
                items: [
                    new sap.m.HBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://course-book", size: "2rem", color: "#0070f2" }).addStyleClass("sapUiSmallMarginEnd"),
                            new sap.m.Title({ text: oAssignment.Title || "Untitled", level: "H3", wrapping: true })
                        ]
                    }).addStyleClass("sapUiSmallMarginBottom"),
                    new sap.m.HBox({
                        wrap: "Wrap",
                        items: [
                            new ObjectStatus({ text: oAssignment.Status, state: sStatusState, icon: sStatusIcon }).addStyleClass("sapUiSmallMarginEnd"),
                            oAssignment.SapModule ? new sap.m.GenericTag({ text: oAssignment.SapModule, design: "StatusIconHidden", status: "Information" }).addStyleClass("sapUiSmallMarginEnd") : new Text({ text: "" }),
                            oAssignment.Role ? new sap.m.GenericTag({ text: oAssignment.Role, design: "StatusIconHidden", status: "None" }) : new Text({ text: "" })
                        ]
                    })
                ]
            }).addStyleClass("detailHeaderCard"));

            // User info card
            aContent.push(new sap.m.VBox({
                items: [
                    new sap.m.HBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://person-placeholder", size: "1.125rem", color: "#556b82" }).addStyleClass("sapUiSmallMarginEnd"),
                            new sap.m.Label({ text: i18n.getText("userLabel"), design: "Bold" })
                        ]
                    }),
                    new Text({ text: (oAssignment.UserName || "") + " (" + (oAssignment.UserId || "") + ")" }).addStyleClass("sapUiSmallMarginTop")
                ]
            }).addStyleClass("detailCard"));

            // Dates card
            var sDueDate = oAssignment.DueDate ? new Date(oAssignment.DueDate).toLocaleDateString() : "Not set";
            var sCompDate = oAssignment.CompletionDate ? new Date(oAssignment.CompletionDate).toLocaleDateString() : "—";
            aContent.push(new sap.m.VBox({
                items: [
                    new sap.m.HBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://calendar", size: "1.125rem", color: "#556b82" }).addStyleClass("sapUiSmallMarginEnd"),
                            new sap.m.Label({ text: i18n.getText("schedule"), design: "Bold" })
                        ]
                    }),
                    new sap.m.HBox({
                        justifyContent: "SpaceBetween",
                        width: "100%",
                        items: [
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({ text: i18n.getText("dueDateLabel") }),
                                    new Text({ text: sDueDate })
                                ]
                            }),
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({ text: i18n.getText("completionDateLabel") }),
                                    new Text({ text: sCompDate })
                                ]
                            })
                        ]
                    }).addStyleClass("sapUiSmallMarginTop")
                ]
            }).addStyleClass("detailCard"));

            // Action buttons card
            var aActions = [];
            if (oAssignment.Url) {
                aActions.push(new sap.m.Button({
                    text: i18n.getText("openTrainingLink"),
                    icon: "sap-icon://chain-link",
                    type: "Transparent",
                    press: function () { sap.m.URLHelper.redirect(oAssignment.Url, true); }
                }).addStyleClass("detailLinkBtn"));
            }
            if (oAssignment.Status !== "Completed") {
                aActions.push(new sap.m.Button({
                    text: i18n.getText("markCompleted"),
                    icon: "sap-icon://complete",
                    type: "Emphasized",
                    press: function () {
                        that._detailDlg.close();
                        that._markCompleted(oContext);
                    }
                }).addStyleClass("detailLinkBtn"));
            }
            if (aActions.length > 0) {
                aContent.push(new sap.m.VBox({
                    items: [
                        new sap.m.HBox({
                            alignItems: "Center",
                            items: [
                                new sap.ui.core.Icon({ src: "sap-icon://action", size: "1.125rem", color: "#556b82" }).addStyleClass("sapUiSmallMarginEnd"),
                                new sap.m.Label({ text: i18n.getText("resourcesLabel"), design: "Bold" })
                            ]
                        }),
                        new sap.m.HBox({ wrap: "Wrap", items: aActions }).addStyleClass("sapUiSmallMarginTop detailLinksRow")
                    ]
                }).addStyleClass("detailCard"));
            }

            this._detailDlg = new sap.m.Dialog({
                title: i18n.getText("assignmentDetails"),
                contentWidth: "520px",
                draggable: true,
                resizable: true,
                verticalScrolling: true,
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
            if (sRole === "User" && sCurrentUserId && oAssignment.UserId !== sCurrentUserId) {
                MessageToast.show(i18n.getText("cannotCompleteOthers"));
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
        }
    });
});

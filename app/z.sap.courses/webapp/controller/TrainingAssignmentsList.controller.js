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
                    that._loadTeamAnalytics();
                });
            } else {
                this._loadAnalytics();
                this._loadTeamAnalytics();
            }

            // Re-load data when role changes (async fetch may complete after initial load)
            sap.ui.getCore().getEventBus().subscribe("sapCourses", "roleChanged", function () {
                var oST = that.byId("assignSmartTable");
                if (oST) { oST.rebindTable(true); }
                that._loadAnalytics();
                that._loadTeamAnalytics();
            }, this);

            // Reload data every time user navigates to this page
            var oRouter = oComponent.getRouter();
            if (oRouter) {
                oRouter.getRoute("TrainingAssignmentsList").attachPatternMatched(function () {
                    var oST = that.byId("assignSmartTable");
                    if (oST) { oST.rebindTable(true); }
                    that._loadAnalytics();
                    that._loadTeamAnalytics();
                }, this);
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
                if (!this._itemPressAttached) {
                    oTable.attachItemPress(this.onItemPress.bind(this));
                    this._itemPressAttached = true;
                }

                // Apply link templates and status formatting after first data load
                this._linksApplied = false;
                oTable.attachUpdateFinished(function () {
                    if (!that._linksApplied) {
                        that._applyAssignmentColumnTemplates(oTable);
                        that._linksApplied = true;
                    }
                });
            }
        },

        /**
         * Apply clickable Link template to the Url column and
         * ObjectStatus template to the Status column in ResponsiveTable.
         */
        _applyAssignmentColumnTemplates: function (oTable) {
            if (!oTable || !oTable.getColumns) { return; }
            var aCols = oTable.getColumns();
            var aItems = oTable.getItems();

            // Detect column positions by reading the cell content from the first data row
            if (aItems.length === 0) { return; }
            var oFirstItem = aItems[0];
            if (!oFirstItem || !oFirstItem.getCells) { return; }
            var aCells = oFirstItem.getCells();

            aCols.forEach(function (oCol, iIdx) {
                var oHeader = oCol.getHeader();
                var sLabel = (oHeader && typeof oHeader.getText === "function") ? oHeader.getText() : "";

                if (sLabel === "Url" || sLabel === "Training Link") {
                    // Replace all Url cells with Link controls
                    aItems.forEach(function (oItem) {
                        if (!oItem.getCells) { return; }
                        var cells = oItem.getCells();
                        if (iIdx < cells.length) {
                            var oCtx = oItem.getBindingContext();
                            var sUrl = oCtx ? oCtx.getProperty("Url") : "";
                            if (sUrl && /^https?:\/\//i.test(sUrl)) {
                                var oLink = new Link({
                                    text: "Open Training",
                                    href: sUrl,
                                    target: "_blank",
                                    wrapping: false
                                }).addStyleClass("assignmentLink");
                                oItem.removeCell(cells[iIdx]);
                                oItem.insertCell(oLink, iIdx);
                            }
                        }
                    });
                    Log.info("[AssignLinks] Applied Link cells on Url column");
                }

                if (sLabel === "Status") {
                    // Replace Status cells with ObjectStatus (colored badge)
                    aItems.forEach(function (oItem) {
                        if (!oItem.getCells) { return; }
                        var cells = oItem.getCells();
                        if (iIdx < cells.length) {
                            var oCtx = oItem.getBindingContext();
                            var sStatus = oCtx ? oCtx.getProperty("Status") : "";
                            var sState = sStatus === "Completed" ? "Success" :
                                         sStatus === "In Progress" ? "Information" : "Warning";
                            var sIcon = sStatus === "Completed" ? "sap-icon://accept" :
                                        sStatus === "In Progress" ? "sap-icon://activity-2" : "sap-icon://pending";
                            var oStatusControl = new ObjectStatus({
                                text: sStatus,
                                state: sState,
                                icon: sIcon
                            }).addStyleClass("assignmentStatusBadge");
                            oItem.removeCell(cells[iIdx]);
                            oItem.insertCell(oStatusControl, iIdx);
                        }
                    });
                    Log.info("[AssignLinks] Applied ObjectStatus cells on Status column");
                }
            });
        },

        /* ===== Refresh ===== */
        onRefresh: function () {
            var oSmartTable = this.byId("assignSmartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable(true);
            }
            this._linksApplied = false; // reset so templates re-apply
            this._loadAnalytics();
            this._loadTeamAnalytics();
            MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("dataRefreshed"));
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

            // Allow link templates to re-apply on next data load
            this._linksApplied = false;

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
                            that._linksApplied = false;
                            that.onRefresh();
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

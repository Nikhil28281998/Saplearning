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
    "sap/m/ObjectStatus"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Log, Link, Text, ObjectStatus) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingAssignmentsList", {

        onInit: function () {
            // User's own progress model
            var oAnalyticsModel = new JSONModel({
                assigned: 0,
                inProgress: 0,
                completed: 0,
                completionPercent: 0
            });
            this.getView().setModel(oAnalyticsModel, "assignAnalytics");

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
            var oComponent = this.getOwnerComponent();
            var oModel = oComponent.getModel();
            var oAnalyticsModel = this.getView().getModel("assignAnalytics");
            var sEntitySet = oComponent.getAssignmentEntitySet();
            var sRole = oComponent._role || "User";
            var sUserId = oComponent.getCurrentUserId();

            var oPanel = this.byId("myProgressPanel");
            if (oPanel) { oPanel.setBusy(true); }

            // FIX: Always filter by current user's UserId regardless of role.
            // "My Progress" shows only trainings assigned TO the current user.
            var aFilters = [];
            aFilters.push(new Filter("UserId", FilterOperator.EQ, sUserId || "__NOUSER__"));

            // Single OData read — count statuses client-side for reliability
            oModel.read("/" + sEntitySet, {
                filters: aFilters,
                urlParameters: { "$inlinecount": "allpages" },
                success: function (oData) {
                    var aAll = oData.results || [];
                    var iAssigned = 0, iInProgress = 0, iCompleted = 0;
                    aAll.forEach(function (a) {
                        if (a.Status === "Assigned") { iAssigned++; }
                        else if (a.Status === "In Progress") { iInProgress++; }
                        else if (a.Status === "Completed") { iCompleted++; }
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

                    var iTotal = iAssigned + iInProgress + iCompleted;
                    var iPct = iTotal > 0 ? Math.round((iCompleted / iTotal) * 100) : 0;
                    oAnalyticsModel.setProperty("/assigned", iAssigned);
                    oAnalyticsModel.setProperty("/inProgress", iInProgress);
                    oAnalyticsModel.setProperty("/completed", iCompleted);
                    oAnalyticsModel.setProperty("/overdue", iOverdue);
                    oAnalyticsModel.setProperty("/completionPercent", iPct);
                    if (oPanel) { oPanel.setBusy(false); }
                },
                error: function (err) {
                    Log.warning("[AssignAnalytics] Failed to load: " + (err && err.message || ""));
                    if (oPanel) { oPanel.setBusy(false); }
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

                // ADD-1: Status → ObjectStatus with overdue indicator
                if (iStatusIdx >= 0 && iStatusIdx < aCells.length) {
                    var oStatusCell = aCells[iStatusIdx];
                    if (oStatusCell.getMetadata().getName() !== "sap.m.ObjectStatus") {
                        var oStatusCtrl = new ObjectStatus({
                            text: {
                                parts: [{ path: "Status" }, { path: "DueDate" }],
                                formatter: function (sStatus, dDue) {
                                    var bOverdue = sStatus !== "Completed" && dDue && new Date(dDue) < new Date();
                                    return bOverdue ? sStatus + " (Overdue)" : sStatus;
                                }
                            },
                            state: {
                                parts: [{ path: "Status" }, { path: "DueDate" }],
                                formatter: function (sStatus, dDue) {
                                    var bOverdue = sStatus !== "Completed" && dDue && new Date(dDue) < new Date();
                                    if (bOverdue) { return "Error"; }
                                    return sStatus === "Completed" ? "Success" :
                                           sStatus === "In Progress" ? "Information" : "Warning";
                                }
                            },
                            icon: {
                                parts: [{ path: "Status" }, { path: "DueDate" }],
                                formatter: function (sStatus, dDue) {
                                    var bOverdue = sStatus !== "Completed" && dDue && new Date(dDue) < new Date();
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
            MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("dataRefreshed"));
        },

        /**
         * FEAT-2: Filter SmartTable by status via the SmartFilterBar Status Select.
         * Pass empty string to clear the status filter.
         */
        _filterByStatus: function (sStatus) {
            // Store Overdue flag for onBeforeRebindTable (not a real OData status)
            this._overdueFilter = (sStatus === "Overdue");

            var oSelect = this.byId("filterAssignStatus");
            if (oSelect) {
                // For Overdue, set dropdown to "Overdue"; for others set normally
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

            // FIX: "My Assignments" always shows trainings assigned TO the current user,
            // regardless of role. Team-level view is on catalog page (Team Analytics).
            var oComponent = this.getOwnerComponent();
            var sCurrentUserId = oComponent.getCurrentUserId();
            var sFilterId = sCurrentUserId || "__NOUSER__";
            mBindingParams.filters.push(new Filter("UserId", FilterOperator.EQ, sFilterId));
            Log.info("[AssignFilter] UserId filter (all roles): " + sFilterId);

            // Read Status filter from the custom FilterGroupItem Select
            var oStatusSelect = this.byId("filterAssignStatus");
            if (oStatusSelect) {
                var sStatusKey = oStatusSelect.getSelectedKey();
                if (sStatusKey && sStatusKey !== "Overdue") {
                    mBindingParams.filters.push(new Filter("Status", FilterOperator.EQ, sStatusKey));
                    Log.info("[AssignFilter] Status filter: " + sStatusKey);
                } else if (sStatusKey === "Overdue") {
                    // Overdue = not Completed + DueDate < today
                    // Exclude Completed records; client-side DueDate filter applied in dataReceived
                    mBindingParams.filters.push(new Filter("Status", FilterOperator.NE, "Completed"));
                    this._overdueFilter = true;
                    Log.info("[AssignFilter] Overdue filter active (Status NE Completed + client DueDate check)");
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
        },

        /* ===== Nav Back – explicit route navigation ===== */
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("TrainingsList", {}, true);
        },

        /* ================================================================== */
        /* F3: DE-ASSIGN – Remove selected assignments (Manager/Admin)        */
        /* ================================================================== */

        onDeassignBtn: function () {
            var that = this;
            var oSmartTable = this.byId("assignSmartTable");
            var oTable = oSmartTable.getTable();
            var i18n = this.getView().getModel("i18n").getResourceBundle();

            var aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageToast.show(i18n.getText("selectAssignmentFirst"));
                return;
            }

            // Collect contexts for deletion
            var oComponent = this.getOwnerComponent();
            var sRole = oComponent._role || "User";
            var sCurrentUserId = oComponent.getCurrentUserId();
            var aToDelete = [];

            aSelectedItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext();
                if (!oCtx) { return; }
                var oData = oCtx.getObject();
                // Manager can only de-assign their team (ManagerSort2 check is server-side)
                aToDelete.push({ context: oCtx, data: oData });
            });

            if (aToDelete.length === 0) {
                MessageToast.show(i18n.getText("selectAssignmentFirst"));
                return;
            }

            var iCount = aToDelete.length;
            MessageBox.confirm(i18n.getText("confirmDeassign", [iCount]), {
                title: i18n.getText("confirmDeassignTitle"),
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }

                    var oModel = that.getView().getModel();
                    var bWasBatch = oModel.bUseBatch;
                    oModel.setUseBatch(false);
                    if (oSmartTable) { oSmartTable.setBusy(true); }

                    var iSuccess = 0, iFailCount = 0;
                    var fnDeleteNext = function (idx) {
                        if (idx >= aToDelete.length) {
                            oModel.setUseBatch(bWasBatch);
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            if (iSuccess > 0) {
                                MessageToast.show(i18n.getText("deassignSuccess", [iSuccess]));
                                oSmartTable.rebindTable(true);
                                that._loadAnalytics();
                            } else {
                                MessageBox.error(i18n.getText("deassignFailed"));
                            }
                            return;
                        }

                        var sPath = aToDelete[idx].context.getPath();
                        oModel.remove(sPath, {
                            success: function () {
                                iSuccess++;
                                fnDeleteNext(idx + 1);
                            },
                            error: function (err) {
                                iFailCount++;
                                Log.warning("[Deassign] DELETE failed: " + (err && err.message || ""));
                                fnDeleteNext(idx + 1);
                            }
                        });
                    };

                    oModel.refreshSecurityToken(function () {
                        fnDeleteNext(0);
                    }, function () {
                        oModel.setUseBatch(bWasBatch);
                        if (oSmartTable) { oSmartTable.setBusy(false); }
                        MessageBox.error(i18n.getText("securityTokenFailed"));
                    });
                }
            });
        },

        /* ===== FEAT-4: Role Switcher ===== */
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

                    // Use batch mode: defer updates, then submitChanges
                    oModel.setDeferredGroups(["bulkComplete"]);
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
                            if (oSmartTable) { oSmartTable.setBusy(false); }
                            MessageToast.show(i18n.getText("bulkCompleteSuccess", [iCount]));
                            that._filterByStatus("Completed");
                            that._loadAnalytics();
                        },
                        error: function (err) {
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
        }
    });
});

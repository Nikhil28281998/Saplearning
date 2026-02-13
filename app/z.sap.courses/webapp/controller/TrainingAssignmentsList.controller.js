sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/ViewSettingsDialog",
    "sap/m/ViewSettingsItem"
], function (Controller, JSONModel, Filter, FilterOperator, Sorter, MessageToast, MessageBox, ViewSettingsDialog, ViewSettingsItem) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.TrainingAssignmentsList", {

        onInit: function () {
            // Assignments filter model
            var oFilterModel = new JSONModel({
                countAll: 0,
                countAssigned: 0,
                countInProgress: 0,
                countCompleted: 0,
                countOverdue: 0
            });
            this.getView().setModel(oFilterModel, "assignFilterModel");

            this._activeStatusFilter = "All";
            this._activeSearchQuery = "";

            // Listen for table data
            var that = this;
            var oTable = this.byId("assignmentsTable");
            oTable.addEventDelegate({
                onAfterRendering: function () {
                    var oBinding = oTable.getBinding("items");
                    if (oBinding && !that._dataAttached) {
                        oBinding.attachDataReceived(that._onDataReceived.bind(that));
                        that._dataAttached = true;
                        that._onDataReceived();
                    }
                }
            });
        },

        _onDataReceived: function () {
            var oTable = this.byId("assignmentsTable");
            var oBinding = oTable.getBinding("items");
            if (!oBinding) { return; }

            var aContexts = oBinding.getContexts(0, 9999);
            var oModel = this.getView().getModel("assignFilterModel");
            var counts = { All: 0, Assigned: 0, "In Progress": 0, Completed: 0, Overdue: 0 };
            var now = new Date();

            aContexts.forEach(function (ctx) {
                var obj = ctx.getObject();
                counts.All++;
                var status = obj.Status || "";
                if (counts[status] !== undefined) { counts[status]++; }
                // Check overdue
                if (obj.DueDate && status !== "Completed") {
                    var due = new Date(obj.DueDate);
                    if (due < now) { counts.Overdue++; }
                }
            });

            oModel.setProperty("/countAll", counts.All);
            oModel.setProperty("/countAssigned", counts.Assigned);
            oModel.setProperty("/countInProgress", counts["In Progress"]);
            oModel.setProperty("/countCompleted", counts.Completed);
            oModel.setProperty("/countOverdue", counts.Overdue);
        },

        /* ===== Search ===== */
        onSearch: function (oEvent) {
            this._activeSearchQuery = oEvent.getParameter("query") || "";
            this._applyFilters();
        },

        onSearchLive: function (oEvent) {
            this._activeSearchQuery = oEvent.getParameter("newValue") || "";
            this._applyFilters();
        },

        /* ===== Status Tab Filter ===== */
        onStatusFilterSelect: function (oEvent) {
            this._activeStatusFilter = oEvent.getParameter("key");
            this._applyFilters();
        },

        /* ===== Apply Filters ===== */
        _applyFilters: function () {
            var aFilters = [];

            // Search
            if (this._activeSearchQuery) {
                var sQuery = this._activeSearchQuery;
                aFilters.push(new Filter({
                    filters: [
                        new Filter("Title", FilterOperator.Contains, sQuery),
                        new Filter("UserId", FilterOperator.Contains, sQuery),
                        new Filter("UserName", FilterOperator.Contains, sQuery),
                        new Filter("SapModule", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            // Status tab
            if (this._activeStatusFilter && this._activeStatusFilter !== "All") {
                if (this._activeStatusFilter === "Overdue") {
                    // Overdue = due date in past + not completed
                    aFilters.push(new Filter("DueDate", FilterOperator.LT, new Date()));
                    aFilters.push(new Filter("Status", FilterOperator.NE, "Completed"));
                } else {
                    aFilters.push(new Filter("Status", FilterOperator.EQ, this._activeStatusFilter));
                }
            }

            var oTable = this.byId("assignmentsTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(aFilters.length > 0 ? new Filter({ filters: aFilters, and: true }) : []);
            }

            // Info toolbar
            var iActive = (this._activeSearchQuery ? 1 : 0) +
                (this._activeStatusFilter !== "All" ? 1 : 0);
            var oInfoToolbar = this.byId("assignInfoToolbar");
            var oInfoLabel = this.byId("assignInfoLabel");
            if (iActive > 0) {
                oInfoToolbar.setVisible(true);
                oInfoLabel.setText("Filtered by " + iActive + " criteria");
            } else {
                oInfoToolbar.setVisible(false);
            }
        },

        /* ===== Sort Dialog ===== */
        onSort: function () {
            if (!this._sortDialog) {
                this._sortDialog = new ViewSettingsDialog({
                    title: "Sort",
                    sortItems: [
                        new ViewSettingsItem({ text: "Due Date", key: "DueDate", selected: true }),
                        new ViewSettingsItem({ text: "Title", key: "Title" }),
                        new ViewSettingsItem({ text: "Status", key: "Status" }),
                        new ViewSettingsItem({ text: "User", key: "UserId" })
                    ],
                    confirm: function (oEvent) {
                        var oSortItem = oEvent.getParameter("sortItem");
                        var bDescending = oEvent.getParameter("sortDescending");
                        var oTable = this.byId("assignmentsTable");
                        var oBinding = oTable.getBinding("items");
                        if (oBinding && oSortItem) {
                            oBinding.sort(new Sorter(oSortItem.getKey(), bDescending));
                        }
                    }.bind(this)
                });
            }
            this._sortDialog.open();
        },

        /* ===== Group Dialog ===== */
        onGroup: function () {
            if (!this._groupDialog) {
                this._groupDialog = new ViewSettingsDialog({
                    title: "Group",
                    groupItems: [
                        new ViewSettingsItem({ text: "None", key: "" }),
                        new ViewSettingsItem({ text: "Status", key: "Status" }),
                        new ViewSettingsItem({ text: "User", key: "UserId" })
                    ],
                    confirm: function (oEvent) {
                        var oGroupItem = oEvent.getParameter("groupItem");
                        var bDescending = oEvent.getParameter("groupDescending");
                        var oTable = this.byId("assignmentsTable");
                        var oBinding = oTable.getBinding("items");
                        if (oBinding) {
                            if (oGroupItem && oGroupItem.getKey()) {
                                oBinding.sort(new Sorter(oGroupItem.getKey(), bDescending, true));
                            } else {
                                oBinding.sort(new Sorter("DueDate", false));
                            }
                        }
                    }.bind(this)
                });
            }
            this._groupDialog.open();
        },

        /* ===== Refresh ===== */
        onRefresh: function () {
            var oModel = this.getView().getModel();
            oModel.refresh(true);
            MessageToast.show("Data refreshed");
        },

        /* ===== Nav Back ===== */
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TrainingsList");
        },

        /* ===== Item Press ===== */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) { return; }
            var oAssignment = oContext.getObject();

            MessageBox.information(
                "Training: " + oAssignment.Title + "\n" +
                "User: " + oAssignment.UserId + " - " + (oAssignment.UserName || "") + "\n" +
                "Status: " + oAssignment.Status + "\n" +
                "Module: " + (oAssignment.SapModule || ""),
                { title: "Assignment Details" }
            );
        },

        /* ===== Cleanup ===== */
        onExit: function () {
            if (this._sortDialog) { this._sortDialog.destroy(); }
            if (this._groupDialog) { this._groupDialog.destroy(); }
        }
    });
});

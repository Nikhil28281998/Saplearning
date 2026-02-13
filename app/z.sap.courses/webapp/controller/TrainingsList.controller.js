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

    return Controller.extend("z.sap.courses.controller.TrainingsList", {

        onInit: function () {
            // Filter model for counts and filter options
            var oFilterModel = new JSONModel({
                countAll: 0,
                countDeveloper: 0,
                countAdmin: 0,
                countManager: 0,
                countUser: 0,
                modules: [],
                roles: []
            });
            this.getView().setModel(oFilterModel, "filterModel");

            // Internal state
            this._activeRoleFilter = "All";
            this._activeSearchQuery = "";
            this._activeModuleFilters = [];
            this._activeRoleFilters = [];

            // Listen for table data loaded
            var that = this;
            var oTable = this.byId("trainingsTable");
            oTable.addEventDelegate({
                onAfterRendering: function () {
                    var oBinding = oTable.getBinding("items");
                    if (oBinding && !that._dataReceivedAttached) {
                        oBinding.attachDataReceived(that._onDataReceived.bind(that));
                        that._dataReceivedAttached = true;
                        // Also compute immediately if data already loaded
                        that._onDataReceived();
                    }
                }
            });
        },

        _onDataReceived: function () {
            var oTable = this.byId("trainingsTable");
            var oBinding = oTable.getBinding("items");
            if (!oBinding) { return; }

            var aContexts = oBinding.getContexts(0, 9999);
            var oModel = this.getView().getModel("filterModel");
            var counts = { All: 0, DEVELOPER: 0, ADMIN: 0, MANAGER: 0, USER: 0 };
            var moduleSet = {};
            var roleSet = {};

            aContexts.forEach(function (ctx) {
                var obj = ctx.getObject();
                counts.All++;
                var sRole = (obj.Role || "").toUpperCase();
                if (counts[sRole] !== undefined) { counts[sRole]++; }
                if (obj.SapModule) { moduleSet[obj.SapModule] = true; }
                if (obj.Role) { roleSet[obj.Role] = true; }
            });

            oModel.setProperty("/countAll", counts.All);
            oModel.setProperty("/countDeveloper", counts.DEVELOPER);
            oModel.setProperty("/countAdmin", counts.ADMIN);
            oModel.setProperty("/countManager", counts.MANAGER);
            oModel.setProperty("/countUser", counts.USER);

            oModel.setProperty("/modules",
                Object.keys(moduleSet).sort().map(function (m) { return { key: m, text: m }; })
            );
            oModel.setProperty("/roles",
                Object.keys(roleSet).sort().map(function (r) { return { key: r, text: r }; })
            );
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

        /* ===== IconTabBar Role Filter ===== */
        onFilterSelect: function (oEvent) {
            this._activeRoleFilter = oEvent.getParameter("key");
            this._applyFilters();
        },

        /* ===== Advanced Filters (MultiComboBox) ===== */
        onFilterChange: function () {
            var aModuleKeys = this.byId("moduleFilter").getSelectedKeys();
            var aRoleKeys = this.byId("roleFilter").getSelectedKeys();
            this._activeModuleFilters = aModuleKeys;
            this._activeRoleFilters = aRoleKeys;
            this._applyFilters();
        },

        /* ===== Toggle Filter Panel ===== */
        onToggleFilter: function (oEvent) {
            var oPanel = this.byId("filterPanel");
            oPanel.setExpanded(oEvent.getParameter("pressed"));
        },

        /* ===== Apply All Filters ===== */
        _applyFilters: function () {
            var aFilters = [];

            // Search filter (across Title, Description, SapModule)
            if (this._activeSearchQuery) {
                var sQuery = this._activeSearchQuery;
                aFilters.push(new Filter({
                    filters: [
                        new Filter("Title", FilterOperator.Contains, sQuery),
                        new Filter("Description", FilterOperator.Contains, sQuery),
                        new Filter("SapModule", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            // IconTabBar role filter
            if (this._activeRoleFilter && this._activeRoleFilter !== "All") {
                aFilters.push(new Filter("Role", FilterOperator.EQ, this._activeRoleFilter));
            }

            // Advanced module filter
            if (this._activeModuleFilters.length > 0) {
                var aModuleFilters = this._activeModuleFilters.map(function (m) {
                    return new Filter("SapModule", FilterOperator.EQ, m);
                });
                aFilters.push(new Filter({ filters: aModuleFilters, and: false }));
            }

            // Advanced role filter (overrides tab if set)
            if (this._activeRoleFilters.length > 0) {
                var aRoleFilters = this._activeRoleFilters.map(function (r) {
                    return new Filter("Role", FilterOperator.EQ, r);
                });
                aFilters.push(new Filter({ filters: aRoleFilters, and: false }));
            }

            // Apply to table binding
            var oTable = this.byId("trainingsTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(aFilters.length > 0 ? new Filter({ filters: aFilters, and: true }) : []);
            }

            // Update info toolbar
            var iActiveCount = (this._activeSearchQuery ? 1 : 0) +
                (this._activeRoleFilter !== "All" ? 1 : 0) +
                (this._activeModuleFilters.length > 0 ? 1 : 0) +
                (this._activeRoleFilters.length > 0 ? 1 : 0);

            var oInfoToolbar = this.byId("infoToolbar");
            var oInfoLabel = this.byId("infoFilterLabel");
            if (iActiveCount > 0) {
                oInfoToolbar.setVisible(true);
                oInfoLabel.setText("Filtered by " + iActiveCount + " criteria");
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
                        new ViewSettingsItem({ text: "Title", key: "Title", selected: true }),
                        new ViewSettingsItem({ text: "Role", key: "Role" }),
                        new ViewSettingsItem({ text: "Module", key: "SapModule" }),
                        new ViewSettingsItem({ text: "Last Updated", key: "LastUpdated" })
                    ],
                    confirm: function (oEvent) {
                        var oSortItem = oEvent.getParameter("sortItem");
                        var bDescending = oEvent.getParameter("sortDescending");
                        var oTable = this.byId("trainingsTable");
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
                        new ViewSettingsItem({ text: "Role", key: "Role" }),
                        new ViewSettingsItem({ text: "Module", key: "SapModule" })
                    ],
                    confirm: function (oEvent) {
                        var oGroupItem = oEvent.getParameter("groupItem");
                        var bDescending = oEvent.getParameter("groupDescending");
                        var oTable = this.byId("trainingsTable");
                        var oBinding = oTable.getBinding("items");
                        if (oBinding) {
                            if (oGroupItem && oGroupItem.getKey()) {
                                oBinding.sort(new Sorter(oGroupItem.getKey(), bDescending, true));
                            } else {
                                oBinding.sort(new Sorter("Title", false));
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

        /* ===== Item Press (Detail) ===== */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (!oContext) { return; }
            var oTraining = oContext.getObject();

            MessageBox.information(
                "Training: " + oTraining.Title + "\n" +
                "Module: " + oTraining.SapModule + "\n" +
                "Role: " + oTraining.Role + "\n\n" +
                "Description: " + oTraining.Description,
                {
                    title: "Training Details",
                    actions: [MessageBox.Action.CLOSE],
                    onClose: function () {
                        if (oTraining.Url) {
                            MessageBox.confirm(
                                "Would you like to open the training material?",
                                {
                                    onClose: function (sAction) {
                                        if (sAction === MessageBox.Action.OK) {
                                            window.open(oTraining.Url, "_blank");
                                        }
                                    }
                                }
                            );
                        }
                    }
                }
            );
        },

        /* ===== Navigation ===== */
        onAssignTraining: function () {
            var oComponent = this.getOwnerComponent();
            if (oComponent && oComponent.openAssignDialog) {
                oComponent.openAssignDialog();
            }
        },

        onViewAssignments: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TrainingAssignmentsList");
        },

        /* ===== Cleanup ===== */
        onExit: function () {
            if (this._sortDialog) { this._sortDialog.destroy(); }
            if (this._groupDialog) { this._groupDialog.destroy(); }
        }
    });
});

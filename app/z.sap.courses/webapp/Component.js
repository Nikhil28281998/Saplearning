sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ui/Device",
    "sap/m/MessageToast",
    "z/sap/courses/services/UserContext"
], function (UIComponent, Fragment, JSONModel, Log, Device, MessageToast, UserContext) {
    "use strict";

    return UIComponent.extend("z.sap.courses.Component", {
        metadata: { manifest: "json" },

        init: function () {
            Log.info('Component initialization started - OData V2 Compatible');

            UIComponent.prototype.init.apply(this, arguments);

            // Initialize router
            this.getRouter().initialize();

            // Detect entity set names from OData $metadata (handles SEGW naming variations)
            this._assignmentEntitySet = 'TrainingAssignments'; // default

            // Create a stable "user" JSONModel once — _applyRoleUI reuses it via setProperty
            this._userModel = new JSONModel({ role: 'User', userId: '' });
            this.setModel(this._userModel, "user");

            // Detect current SAP username for data filtering (BUG-1 fix)
            this._fetchUserId();

            // Initialize UserContext service (S/4 authorization adapter) - non-blocking
            try {
                this._userContext = new UserContext();
                this._diagnosticsInit();

                // Wait for OData metadata, then detect entity sets, fetch role, verify health
                var oModel = this.getModel();
                if (oModel && oModel.metadataLoaded) {
                    oModel.metadataLoaded().then(function () {
                        this._detectEntitySets();
                        this._fetchRole();
                    }.bind(this));
                } else {
                    // Fallback if model not yet available
                    this._detectEntitySets();
                    this._fetchRole();
                }
            } catch (e) {
                Log.error('UserContext initialization failed: ' + e.message);
                this._role = 'User';
            }

            Log.info('Component initialization completed');
        },

        _diagnosticsInit: function () {
            try {
                // Store named references for cleanup
                this._fnGlobalError = function (e) {
                    Log.error('Global Error: ' + (e && e.message), e && e.error);
                };
                this._fnUnhandledRejection = function (e) {
                    var msg = (e && e.reason && e.reason.message) || 'Unhandled rejection';
                    Log.error('Unhandled Promise Rejection: ' + msg, e && e.reason);
                };
                window.addEventListener('error', this._fnGlobalError);
                window.addEventListener('unhandledrejection', this._fnUnhandledRejection);

                var r = this.getRouter();
                this._routeStarted = false;
                if (r && r.attachRouteMatched) {
                    this._fnRouteMatched = function (o) {
                        try {
                            var name = o.getParameter && o.getParameter('name');
                            Log.info('Route matched: ' + name);
                            this._routeStarted = true;
                        } catch (_) { /* noop */ }
                    }.bind(this);
                    r.attachRouteMatched(this._fnRouteMatched);
                }
            } catch (_) { /* noop */ }
        },

        getContentDensityClass: function () {
            if (!this._sContentDensityClass) {
                if (!Device.support.touch) {
                    this._sContentDensityClass = "sapUiSizeCompact";
                } else {
                    this._sContentDensityClass = "sapUiSizeCozy";
                }
            }
            return this._sContentDensityClass;
        },

        /**
         * Detect entity set names from OData $metadata document.
         * Called after metadataLoaded() resolves — metadata is guaranteed available.
         */
        _detectEntitySets: function () {
            var that = this;
            var oModel = this.getModel();
            if (!oModel) { return; }

            try {
                var oMeta = oModel.getServiceMetadata();
                if (!oMeta) { return; }
                var aSchemas = oMeta.dataServices.schema || [];
                for (var si = 0; si < aSchemas.length; si++) {
                    var aContainers = aSchemas[si].entityContainer || [];
                    for (var ci = 0; ci < aContainers.length; ci++) {
                        var aSets = aContainers[ci].entitySet || [];
                        var aNames = [];
                        for (var ei = 0; ei < aSets.length; ei++) {
                            aNames.push(aSets[ei].name);
                            if (aSets[ei].entityType &&
                                aSets[ei].entityType.indexOf('TrainingAssignment') >= 0) {
                                that._assignmentEntitySet = aSets[ei].name;
                            }
                        }
                        Log.info('OData entity sets detected: ' + aNames.join(', '));
                    }
                }
                Log.info('Assignment entity set resolved to: ' + that._assignmentEntitySet);
            } catch (e) {
                Log.warning('Entity set detection failed: ' + e.message);
            }
        },

        /**
         * Get the resolved entity set name for TrainingAssignment.
         */
        getAssignmentEntitySet: function () {
            return this._assignmentEntitySet || 'TrainingAssignments';
        },

        /**
         * Get the current SAP username for data filtering.
         */
        getCurrentUserId: function () {
            return this._userModel.getProperty("/userId") || "";
        },

        /**
         * Detect the current SAP username (sy-uname equivalent).
         * Production: reads from FLP UserInfo service.
         * Dev: URL param ?sap-user=XXX, localStorage, or default 'DEVUSER'.
         */
        _fetchUserId: function () {
            // 1. Try FLP UserInfo service (production S/4HANA)
            try {
                if (sap.ushell && sap.ushell.Container) {
                    var oUser = sap.ushell.Container.getUser();
                    if (oUser) {
                        var sId = oUser.getId();
                        if (sId) {
                            this._userModel.setProperty("/userId", sId.toUpperCase());
                            Log.info("User ID from FLP UserInfo: " + sId.toUpperCase());
                            return;
                        }
                    }
                }
            } catch (e) {
                Log.info("FLP UserInfo not available: " + e.message);
            }

            // 2. Dev mode: URL param or localStorage
            var isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isDev) {
                try {
                    var href = window.location.href || '';
                    var m = href.match(/[?&]sap-user=([^&]+)/);
                    if (m && m[1]) {
                        var sUser = decodeURIComponent(m[1]).toUpperCase();
                        this._userModel.setProperty("/userId", sUser);
                        try { localStorage.setItem('saplc-user', sUser); } catch (_) {}
                        Log.info("User ID from URL param: " + sUser);
                        return;
                    }
                } catch (_) { /* ignore */ }
                try {
                    var ls = localStorage.getItem('saplc-user');
                    if (ls) {
                        this._userModel.setProperty("/userId", ls.toUpperCase());
                        Log.info("User ID from localStorage: " + ls);
                        return;
                    }
                } catch (_) { /* ignore */ }
                this._userModel.setProperty("/userId", "DEVUSER");
                Log.info("User ID defaulted to DEVUSER (dev mode)");
            }
        },

        /**
         * Switch user role dynamically (Admin/Manager/User).
         * Reuses existing JSONModel via setProperty — no new model created.
         */
        switchRole: function (sRole) {
            this._role = sRole;
            this._applyRoleUI();
            Log.info('Role switched to: ' + sRole);
        },

        /**
         * Fetch user role from S/4 via UserContext service
         */
        _fetchRole: function () {
            var that = this;
            var isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            // Development: allow URL/localStorage override for testing
            if (isDev) {
                try {
                    var href = window.location && window.location.href || '';
                    var hash = window.location && window.location.hash || '';
                    var m = href.match(/[?&](saplc-role|sap-role)=([^&]+)/) || hash.match(/[?&](saplc-role|sap-role)=([^&]+)/);
                    if (m && m[1]) {
                        var v = decodeURIComponent(m[2] || m[1]);
                        if (/^(Admin|Manager|User)$/i.test(v)) {
                            var norm = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
                            that._role = norm;
                            try { localStorage.setItem('saplc-role', norm); } catch (_) {}
                            that._applyRoleUI();
                            return;
                        }
                    }
                } catch (_) { /* ignore */ }
                try {
                    var ls = localStorage.getItem('saplc-role');
                    if (ls) { that._role = ls; that._applyRoleUI(); return; }
                } catch (_) { /* ignore */ }
            }

            // Production: Use OData model callFunction for getCurrentRole
            // This is the standard SAP Fiori approach — uses the model's CSRF token,
            // authentication, and service URL from manifest.json automatically.
            var oModel = this.getModel();
            if (oModel && oModel.callFunction) {
                var bWasBatch = oModel.bUseBatch;
                oModel.setUseBatch(false); // bypass batch for this call
                oModel.callFunction("/getCurrentRole", {
                    method: "GET",
                    success: function (oData) {
                        oModel.setUseBatch(bWasBatch);
                        var sRole = "User";
                        // Handle both OData V2 response formats:
                        //   Format A: { getCurrentRole: { Role: "Admin" } }
                        //   Format B: { Role: "Admin" }
                        if (oData) {
                            if (oData.getCurrentRole && oData.getCurrentRole.Role) {
                                sRole = oData.getCurrentRole.Role;
                            } else if (oData.Role) {
                                sRole = oData.Role;
                            }
                        }
                        that._role = sRole;
                        that._applyRoleUI();
                        Log.info('Role fetched via callFunction: ' + sRole);
                    },
                    error: function (oError) {
                        oModel.setUseBatch(bWasBatch);
                        var errMsg = '';
                        try {
                            if (oError && oError.responseText) {
                                var parsed = JSON.parse(oError.responseText);
                                errMsg = (parsed.error && parsed.error.message && parsed.error.message.value) || '';
                            }
                        } catch (e) { /* ignore */ }
                        Log.error('getCurrentRole failed: ' + (errMsg || (oError && oError.message) || 'HTTP 500') +
                            '. Fix: 1) SEGW needs ComplexType "CurrentRole" with property "Role", ' +
                            '2) SEGW needs FunctionImport "getCurrentRole" (GET, returns CurrentRole), ' +
                            '3) Regenerate MPC, 4) Reactivate EXECUTE_ACTION in DPC_EXT. ' +
                            'See abap/SEGW_FUNCTION_IMPORTS.abap for step-by-step guide.');
                        that._role = 'User';
                        that._applyRoleUI();
                    }
                });
            } else {
                // Fallback: use UserContext raw fetch (older UI5 versions)
                this._userContext.getCurrentRole()
                    .then(function (role) {
                        that._role = role;
                        that._applyRoleUI();
                        Log.info('Role fetched from UserContext: ' + role);
                    })
                    .catch(function (error) {
                        Log.warning('getCurrentRole failed (fetch): ' + (error && error.message || error));
                        that._role = 'User';
                        that._applyRoleUI();
                    });
            }
        },

        /**
         * Reuse existing "user" JSONModel — only update via setProperty, never recreate.
         */
        _applyRoleUI: function () {
            var sRole = this._role || 'User';
            Log.info('User role applied: ' + sRole);
            this._userModel.setProperty("/role", sRole);
            // Notify active controllers to refresh data with correct role-based filters
            sap.ui.getCore().getEventBus().publish("sapCourses", "roleChanged", { role: sRole });
        },

        // Navigate to TrainingAssignments
        openTrainingAssignmentsAndCreate: function () {
            var r = this.getRouter();
            if (r && r.navTo) {
                r.navTo('TrainingAssignmentsList');
            }
        },

        // Navigate to TrainingAssignments LR
        navigateToTraining: function () {
            var r = this.getRouter();
            if (r && r.navTo) {
                r.navTo('TrainingAssignmentsList');
            }
        },

        // ====================================================================
        // Assign Training Dialog — loaded from XML fragment
        // ====================================================================

        /**
         * Open the Assign Training dialog. Loads data first, then loads fragment.
         */
        openAssignDialog: function () {
            var that = this;
            // Destroy previous instance for fresh data
            if (this._assignDlg) { this._assignDlg.destroy(); this._assignDlg = null; }
            var oModel = this.getModel();

            var loadList = function (path, params) {
                return new Promise(function (resolve, reject) {
                    oModel.read(path, {
                        urlParameters: params || {},
                        success: function (data) { resolve(data.results || []); },
                        error: reject
                    });
                });
            };

            // Load trainings and users in parallel
            // For Manager role: filter UserSet by Sort2 = current user ID
            // (Sort2 = User entity property mapped from ADRP.SORT2 in SU01)
            var pTrainings = loadList('/Trainings');
            var sUserId = that.getCurrentUserId();
            var sRole = that._role;
            var aUserFilters = [];
            if (sRole === 'Manager' && sUserId) {
                aUserFilters.push(new sap.ui.model.Filter("Sort2", sap.ui.model.FilterOperator.EQ, sUserId));
            }
            var pUsers = new Promise(function (resolve, reject) {
                oModel.read('/UserSet', {
                    filters: aUserFilters,
                    success: function (data) { resolve(data.results || []); },
                    error: reject
                });
            }).catch(function () {
                Log.warning('[AssignDlg] UserSet entity set not available – manual entry only');
                return []; // Graceful fallback if User entity not yet created in SEGW
            });

            Promise.all([pTrainings, pUsers]).then(function (results) {
                that._openAssignFragment(results[0] || [], results[1] || []);
            }).catch(function () {
                MessageToast.show('Failed to load data for assignment');
            });
        },

        /**
         * Build the assignModel and load the AssignDialog fragment.
         */
        _openAssignFragment: function (trainings, users) {
            var that = this;

            // Build filter data
            var roleSet = {};
            var moduleSet = {};
            trainings.forEach(function (t) {
                if (t.Role) { roleSet[t.Role] = true; }
                if (t.SapModule) { moduleSet[t.SapModule] = true; }
            });

            this._assignModel = new JSONModel({
                trainings: trainings,
                filteredTrainings: trainings,
                users: users || [],
                roles: [{ key: '', text: 'All Roles' }].concat(
                    Object.keys(roleSet).sort().map(function (r) { return { key: r, text: r }; })
                ),
                modules: [{ key: '', text: 'All Modules' }].concat(
                    Object.keys(moduleSet).sort().map(function (m) { return { key: m, text: m }; })
                ),
                selectedRoleFilter: "",
                selectedModuleFilter: "",
                selectedTrainingId: trainings[0] && trainings[0].Id || '',
                selectedUserKeys: [],
                dueDate: null,
                submitting: false,
                error: ''
            });
            this._assignModel.setSizeLimit(10000);

            Fragment.load({
                name: "z.sap.courses.fragments.AssignDialog",
                controller: this
            }).then(function (oDialog) {
                that._assignDlg = oDialog;
                that._assignDlg.setModel(that._assignModel, "assignModel");
                that._assignDlg.addStyleClass("assignTrainingDialog");
                that._assignDlg.open();
            });
        },

        // --- Fragment event handlers ---

        /**
         * Cross-filter: filter trainings by role, update available modules.
         */
        onAssignRoleFilterChange: function () {
            this._filterAssignTrainings('role');
        },

        /**
         * Cross-filter: filter trainings by module, update available roles.
         */
        onAssignModuleFilterChange: function () {
            this._filterAssignTrainings('module');
        },

        _filterAssignTrainings: function (source) {
            var oModel = this._assignModel;
            if (!oModel) { return; }
            var data = oModel.getData();
            var selRole = data.selectedRoleFilter;
            var selModule = data.selectedModuleFilter;

            var filtered = data.trainings.filter(function (t) {
                var roleMatch = !selRole || t.Role === selRole;
                var moduleMatch = !selModule || t.SapModule === selModule;
                return roleMatch && moduleMatch;
            });
            oModel.setProperty('/filteredTrainings', filtered);

            if (source === 'role') {
                var mSet = {};
                data.trainings.forEach(function (t) {
                    if (t.SapModule && (!selRole || t.Role === selRole)) {
                        mSet[t.SapModule] = true;
                    }
                });
                var newModules = [{ key: '', text: 'All Modules' }].concat(
                    Object.keys(mSet).sort().map(function (m) { return { key: m, text: m }; })
                );
                oModel.setProperty('/modules', newModules);
                if (selModule && !mSet[selModule]) {
                    oModel.setProperty('/selectedModuleFilter', '');
                }
            }

            if (source === 'module') {
                var rSet = {};
                data.trainings.forEach(function (t) {
                    if (t.Role && (!selModule || t.SapModule === selModule)) {
                        rSet[t.Role] = true;
                    }
                });
                var newRoles = [{ key: '', text: 'All Roles' }].concat(
                    Object.keys(rSet).sort().map(function (r) { return { key: r, text: r }; })
                );
                oModel.setProperty('/roles', newRoles);
                if (selRole && !rSet[selRole]) {
                    oModel.setProperty('/selectedRoleFilter', '');
                }
            }

            if (filtered.length > 0 && !filtered.some(function (f) { return f.Id === data.selectedTrainingId; })) {
                oModel.setProperty('/selectedTrainingId', filtered[0].Id);
            }
        },

        /**
         * Multi-user selection changed — update selectedUserKeys in model.
         */
        onAssignUserSelectionChange: function (oEvent) {
            var oMCB = oEvent.getSource();
            var aKeys = oMCB.getSelectedKeys();
            this._assignModel.setProperty("/selectedUserKeys", aKeys);
            Log.info('[AssignDlg] Selected users: ' + aKeys.join(', '));
        },

        /**
         * Submit handler for Assign Training dialog — supports bulk assignment.
         * Creates one assignment per selected user for the chosen training.
         */
        onAssignSubmit: function () {
            var that = this;
            var oAssignModel = this._assignModel;
            if (!oAssignModel) { return; }
            var data = oAssignModel.getData();
            var tr = (data.filteredTrainings || []).find(function (t) { return t.Id === data.selectedTrainingId; });

            if (!tr) {
                oAssignModel.setProperty('/error', 'Please select a training');
                return;
            }
            var aSelectedKeys = data.selectedUserKeys || [];
            if (aSelectedKeys.length === 0) {
                oAssignModel.setProperty('/error', 'Please select at least one team member');
                return;
            }
            oAssignModel.setProperty('/error', '');

            // Build due date as UTC Date object
            var dueDateValue = null;
            try {
                if (data.dueDate) {
                    var year, month, day;
                    if (data.dueDate instanceof Date) {
                        year = data.dueDate.getFullYear();
                        month = data.dueDate.getMonth();
                        day = data.dueDate.getDate();
                    } else if (typeof data.dueDate === 'string' && data.dueDate.length >= 10) {
                        var dateParts = data.dueDate.substring(0, 10).split('-');
                        if (dateParts.length === 3) {
                            year = parseInt(dateParts[0], 10);
                            month = parseInt(dateParts[1], 10) - 1;
                            day = parseInt(dateParts[2], 10);
                        }
                    }
                    if (year && !isNaN(year)) {
                        dueDateValue = new Date(Date.UTC(year, month, day, 0, 0, 0));
                        if (isNaN(dueDateValue.getTime())) { dueDateValue = null; }
                    }
                }
            } catch (dateErr) {
                Log.warning('[AssignDlg] Date parse error: ' + dateErr.message);
                dueDateValue = null;
            }

            // Look up user details from loaded list
            var aUsers = data.users || [];
            var mUserMap = {};
            aUsers.forEach(function (u) { mUserMap[(u.UserId || '').toUpperCase()] = u; });

            oAssignModel.setProperty('/submitting', true);

            var sEntitySet = this._assignmentEntitySet || 'TrainingAssignments';
            var oModel = this.getModel();

            // Bypass $batch for clearer error messages
            var bWasBatch = oModel.bUseBatch;
            oModel.setUseBatch(false);

            // Create one assignment per selected user sequentially
            var iSuccess = 0, iFailCount = 0, aErrors = [];
            var fnCreateNext = function (idx) {
                if (idx >= aSelectedKeys.length) {
                    // All done
                    oModel.setUseBatch(bWasBatch);
                    oAssignModel.setProperty('/submitting', false);
                    if (iSuccess > 0) {
                        if (that._assignDlg) { that._assignDlg.close(); }
                        oModel.refresh(true);
                        that.navigateToTraining();
                        MessageToast.show(iSuccess + ' assignment(s) created successfully' +
                            (iFailCount > 0 ? ' (' + iFailCount + ' failed)' : ''));
                    } else {
                        oAssignModel.setProperty('/error', 'All assignments failed: ' + aErrors.join('; '));
                    }
                    return;
                }

                var sKey = aSelectedKeys[idx].toUpperCase();
                var oUser = mUserMap[sKey] || {};
                var payload = {
                    TrainingId: tr.Id || '',
                    Title: tr.Title || '',
                    Role: tr.Role || '',
                    SapModule: tr.SapModule || '',
                    Url: tr.Url || '',
                    Status: 'Assigned',
                    UserId: sKey,
                    UserName: ((oUser.FirstName || '') + ' ' + (oUser.LastName || '')).trim() || sKey,
                    UserEmail: oUser.Email || ''
                };
                if (dueDateValue !== null) { payload.DueDate = dueDateValue; }

                oModel.create('/' + sEntitySet, payload, {
                    success: function () {
                        iSuccess++;
                        fnCreateNext(idx + 1);
                    },
                    error: function (err) {
                        iFailCount++;
                        var msg = sKey + ': create failed';
                        try {
                            var parsed = JSON.parse(err.responseText);
                            msg = sKey + ': ' + ((parsed.error && parsed.error.message && parsed.error.message.value) || 'failed');
                        } catch (e) { /* ignore */ }
                        aErrors.push(msg);
                        fnCreateNext(idx + 1);
                    }
                });
            };

            oModel.refreshSecurityToken(function () {
                fnCreateNext(0);
            }, function () {
                oModel.setUseBatch(bWasBatch);
                oAssignModel.setProperty('/submitting', false);
                oAssignModel.setProperty('/error', 'Security token refresh failed. Please reload the app.');
            });
        },

        /**
         * Cancel handler for Assign Training dialog.
         */
        onAssignCancel: function () {
            if (this._assignDlg) {
                this._assignDlg.close();
            }
        },

        destroy: function () {
            // Remove window event listeners (fix memory leaks)
            if (this._fnGlobalError) {
                window.removeEventListener('error', this._fnGlobalError);
                this._fnGlobalError = null;
            }
            if (this._fnUnhandledRejection) {
                window.removeEventListener('unhandledrejection', this._fnUnhandledRejection);
                this._fnUnhandledRejection = null;
            }

            // Detach router handler
            if (this._fnRouteMatched) {
                var r = this.getRouter();
                if (r && r.detachRouteMatched) {
                    r.detachRouteMatched(this._fnRouteMatched);
                }
                this._fnRouteMatched = null;
            }

            // Destroy UserContext service
            if (this._userContext && this._userContext.destroy) {
                this._userContext.destroy();
                this._userContext = null;
            }

            // Clean up dialogs
            if (this._assignDlg) {
                this._assignDlg.destroy();
                this._assignDlg = null;
            }

            UIComponent.prototype.destroy.apply(this, arguments);
        }
    });
});

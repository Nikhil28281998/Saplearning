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
            this._userModel = new JSONModel({ role: 'User' });
            this.setModel(this._userModel, "user");

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

            // Production: Use S/4 UserContext service for PFCG role-based authorization
            this._userContext.getCurrentRole()
                .then(function (role) {
                    that._role = role;
                    that._applyRoleUI();
                    Log.info('Role fetched from UserContext: ' + role);
                })
                .catch(function (error) {
                    Log.warning('Failed to fetch role from S/4 UserContext: ' + (error && error.message || error));
                    that._role = 'User';
                    that._applyRoleUI();
                });
        },

        /**
         * Reuse existing "user" JSONModel — only update via setProperty, never recreate.
         */
        _applyRoleUI: function () {
            var sRole = this._role || 'User';
            Log.info('User role applied: ' + sRole);
            this._userModel.setProperty("/role", sRole);
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
            var pTrainings = loadList('/Trainings');
            var pUsers = loadList('/UserSet').catch(function () {
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
                userId: '',
                firstName: '',
                lastName: '',
                userEmail: '',
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
         * User suggestion selected — auto-fill Full Name and Email fields.
         */
        onAssignUserSelected: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }
            var oModel = this._assignModel;
            if (!oModel) { return; }
            var sKey = oItem.getKey();
            oModel.setProperty("/userId", sKey);

            // Look up user in loaded list to auto-fill name & email
            var users = oModel.getProperty("/users") || [];
            var found = users.filter(function (u) {
                return (u.UserId || '').toUpperCase() === (sKey || '').toUpperCase();
            })[0];
            if (found) {
                oModel.setProperty('/firstName', found.FirstName || '');
                oModel.setProperty('/lastName', found.LastName || '');
                oModel.setProperty('/userEmail', found.Email || '');
                Log.info('[AssignDlg] User selected: ' + sKey + ' → ' + (found.FirstName || '') + ' ' + (found.LastName || ''));
            }
        },

        /**
         * Submit handler for Assign Training dialog.
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
            if (!data.userId || data.userId.trim() === '') {
                oAssignModel.setProperty('/error', 'User ID (SYUNAME) is required');
                return;
            }
            var userIdUpper = data.userId.toUpperCase();
            if (!/^[A-Z0-9_]{1,12}$/.test(userIdUpper)) {
                oAssignModel.setProperty('/error', 'Invalid User ID format');
                return;
            }
            oAssignModel.setProperty('/error', '');

            // Build due date as UTC Date object — SEGW maps DATS to Edm.DateTime
            // SAPUI5 ODataModel V2 serializes Date objects as /Date(timestamp)/
            var dueDateValue = null;
            try {
                if (data.dueDate) {
                    var year, month, day;
                    if (data.dueDate instanceof Date) {
                        year = data.dueDate.getFullYear();
                        month = data.dueDate.getMonth(); // 0-based
                        day = data.dueDate.getDate();
                    } else if (typeof data.dueDate === 'string' && data.dueDate.length >= 10) {
                        var dateParts = data.dueDate.substring(0, 10).split('-');
                        if (dateParts.length === 3) {
                            year = parseInt(dateParts[0], 10);
                            month = parseInt(dateParts[1], 10) - 1; // 0-based
                            day = parseInt(dateParts[2], 10);
                        }
                    }
                    if (year && !isNaN(year)) {
                        // Always send as JS Date in UTC — ODataModel V2 serializes to /Date(ts)/
                        dueDateValue = new Date(Date.UTC(year, month, day, 0, 0, 0));
                        if (isNaN(dueDateValue.getTime())) {
                            dueDateValue = null;
                            Log.warning('[AssignDlg] Invalid due date value: ' + data.dueDate);
                        } else {
                            Log.info('[AssignDlg] DueDate UTC: ' + dueDateValue.toISOString());
                        }
                    }
                }
            } catch (dateErr) {
                Log.warning('[AssignDlg] Date parse error: ' + dateErr.message);
                dueDateValue = null;
            }

            var payload = {
                TrainingId: tr.Id || '',
                Title: tr.Title || '',
                Role: tr.Role || '',
                SapModule: tr.SapModule || '',
                Url: tr.Url || '',
                Status: 'Assigned',
                UserId: userIdUpper,
                UserName: ((data.firstName || '') + ' ' + (data.lastName || '')).trim() || userIdUpper,
                UserEmail: data.userEmail || ''
            };
            if (dueDateValue !== null) {
                payload.DueDate = dueDateValue;
            }

            oAssignModel.setProperty('/submitting', true);

            var sEntitySet = this._assignmentEntitySet || 'TrainingAssignments';
            var oModel = this.getModel();
            Log.info('Creating assignment via /' + sEntitySet + ' payload: ' + JSON.stringify(payload));

            // Bypass $batch — send direct POST for clearer error messages
            var bWasBatch = oModel.bUseBatch;
            oModel.setUseBatch(false);

            oModel.refreshSecurityToken(function () {
                oModel.create('/' + sEntitySet, payload, {
                    success: function () {
                        oModel.setUseBatch(bWasBatch); // restore batch mode
                        oAssignModel.setProperty('/submitting', false);
                        oAssignModel.setProperty('/error', '');
                        // Close dialog BEFORE navigating (fix #6)
                        if (that._assignDlg) { that._assignDlg.close(); }
                        that.navigateToTraining();
                        MessageToast.show('Training assigned successfully');
                    },
                    error: function (err) {
                        oModel.setUseBatch(bWasBatch); // restore batch mode
                        oAssignModel.setProperty('/submitting', false);
                        var msg = 'Create failed';
                        try {
                            if (err && err.responseText) {
                                var parsed = JSON.parse(err.responseText);
                                msg = (parsed.error && parsed.error.message && parsed.error.message.value) || msg;
                            } else if (err && err.message) {
                                msg = err.message;
                            }
                        } catch (e) {
                            // responseText might be XML
                            try {
                                var xmlMatch = err.responseText && err.responseText.match(/<message[^>]*>([^<]+)<\/message>/i);
                                if (xmlMatch) { msg = xmlMatch[1]; }
                            } catch (e2) { /* ignore */ }
                            if (msg === 'Create failed') {
                                msg = (err && err.message) || 'Create failed (status ' + (err && err.statusCode) + ')';
                            }
                        }
                        oAssignModel.setProperty('/error', msg);
                        Log.error('Assignment create failed: ' + msg + ' | Full response: ' + (err && err.responseText));
                    }
                });
            }, function (tokenErr) {
                oModel.setUseBatch(bWasBatch); // restore batch mode
                oAssignModel.setProperty('/submitting', false);
                oAssignModel.setProperty('/error', 'Security token refresh failed. Please reload the app.');
                Log.error('CSRF token refresh failed: ' + tokenErr);
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

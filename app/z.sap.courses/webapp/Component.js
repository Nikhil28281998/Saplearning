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

            loadList('/Trainings').then(function (trainings) {
                trainings = trainings || [];
                loadList('/Users', { "$top": "9999" }).then(function (users) {
                    users = users || [];
                    that._openAssignFragment(trainings, users);
                }).catch(function () {
                    that._openAssignFragment(trainings, []);
                });
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
                users: users,
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
         * User ComboBox dropdown selection — auto-fill name/email fields.
         */
        onAssignUserSelectionChange: function (oEvent) {
            var oModel = this._assignModel;
            if (!oModel) { return; }
            var oItem = oEvent.getParameter("selectedItem");
            oModel.setProperty("/firstName", "");
            oModel.setProperty("/lastName", "");
            oModel.setProperty("/userEmail", "");
            if (oItem) {
                var sUserId = oItem.getKey();
                oModel.setProperty("/userId", sUserId || "");
                this._lookupAssignUser(sUserId);
            } else {
                oModel.setProperty("/userId", "");
            }
        },

        /**
         * User ComboBox manual typing — auto-fill from loaded users list.
         */
        onAssignUserChange: function (oEvent) {
            var oSource = oEvent.getSource();
            if (oSource.getSelectedItem()) { return; }
            var oModel = this._assignModel;
            if (!oModel) { return; }
            var val = oEvent.getParameter("value") || "";
            var upper = val.toUpperCase().trim();
            oModel.setProperty("/userId", upper);
            oModel.setProperty("/firstName", "");
            oModel.setProperty("/lastName", "");
            oModel.setProperty("/userEmail", "");
            this._lookupAssignUser(upper);
        },

        /**
         * Look up user by ID and auto-fill name/email fields.
         * Uses dynamic property discovery for email (ABAP entity variants).
         */
        _lookupAssignUser: function (val) {
            if (!val) { return; }
            var oModel = this._assignModel;
            if (!oModel) { return; }
            var upper = val.toUpperCase().trim();
            var allUsers = oModel.getProperty('/users') || [];
            var found = allUsers.filter(function (u) {
                return (u.UserId || '').toUpperCase().trim() === upper;
            })[0];

            if (found) {
                oModel.setProperty('/firstName', found.FirstName || found.Firstname || found.FIRSTNAME || found.First_Name || '');
                oModel.setProperty('/lastName', found.LastName || found.Lastname || found.LASTNAME || found.Last_Name || '');

                var email = found.Email || found.EmailAddress || found.SmtpAddr ||
                    found.UserEmail || found.Smtp_Addr || found.emailAddress ||
                    found.EMAIL || found.SmtpAddress || '';

                if (!email) {
                    var props = Object.keys(found);
                    for (var i = 0; i < props.length; i++) {
                        var pName = props[i].toLowerCase();
                        if ((pName.indexOf('mail') >= 0 || pName.indexOf('smtp') >= 0) && found[props[i]]) {
                            email = found[props[i]];
                            Log.info('[AssignDlg] Email found via dynamic scan: ' + props[i] + ' = ' + email);
                            break;
                        }
                    }
                }
                oModel.setProperty('/userEmail', email);
                Log.info('[AssignDlg] User found: ' + upper);
            } else {
                Log.warning('[AssignDlg] User NOT found for: ' + upper + ', Total users loaded: ' + allUsers.length);
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

            // Build due date as JS Date object (OData V2 needs Date, not ISO string)
            var dueDate = null;
            try {
                if (data.dueDate) {
                    dueDate = new Date(data.dueDate + 'T00:00:00');
                }
            } catch (e) { /* ignore */ }

            var fullName = ((data.firstName || '') + ' ' + (data.lastName || '')).trim();

            var payload = {
                TrainingId: tr.Id || '',
                Title: tr.Title || '',
                Role: tr.Role || '',
                SapModule: tr.SapModule || '',
                Url: tr.Url || '',
                Status: 'Assigned',
                UserId: userIdUpper,
                UserName: fullName || userIdUpper,
                UserEmail: data.userEmail || ''
            };
            if (dueDate) {
                payload.DueDate = dueDate;
            }

            oAssignModel.setProperty('/submitting', true);

            var sEntitySet = this._assignmentEntitySet || 'TrainingAssignments';
            var oModel = this.getModel();
            Log.info('Creating assignment via /' + sEntitySet + ' payload: ' + JSON.stringify(payload));

            oModel.refreshSecurityToken(function () {
                oModel.create('/' + sEntitySet, payload, {
                    success: function () {
                        oAssignModel.setProperty('/submitting', false);
                        oAssignModel.setProperty('/error', '');
                        // Close dialog BEFORE navigating (fix #6)
                        if (that._assignDlg) { that._assignDlg.close(); }
                        that.navigateToTraining();
                        MessageToast.show('Training assigned successfully');
                    },
                    error: function (err) {
                        oAssignModel.setProperty('/submitting', false);
                        var msg = 'Create failed';
                        try {
                            if (err && err.responseText) {
                                var parsed = JSON.parse(err.responseText);
                                msg = parsed.error.message.value || msg;
                            } else if (err && err.message) {
                                msg = err.message;
                            }
                        } catch (e) {
                            msg = (err && err.message) || msg;
                        }
                        oAssignModel.setProperty('/error', msg);
                        Log.error('Assignment create failed: ' + msg);
                    }
                });
            }, function (tokenErr) {
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

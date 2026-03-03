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
            this._userEntitySet = 'UserSet'; // default (SEGW: Entity Type 'User' → Entity Set 'UserSet')
            this._userManagerProperty = null; // auto-detected from $metadata

            // Create a stable "user" JSONModel once — _applyRoleUI reuses it via setProperty
            this._userModel = new JSONModel({
                role: 'User',
                userId: ''
            });
            this.setModel(this._userModel, "user");

            // Detect current SAP username for data filtering (BUG-1 fix)
            this._fetchUserId();

            // Initialize UserContext service (S/4 authorization adapter) - non-blocking
            try {
                this._userContext = new UserContext({ model: this.getModel() });
                this._diagnosticsInit();

                // Wait for OData metadata, then detect entity sets, fetch role + userId
                var oModel = this.getModel();
                if (oModel && oModel.metadataLoaded) {
                    oModel.metadataLoaded().then(function () {
                        this._detectEntitySets();
                        this._fetchRole();
                        this._fetchUserIdFromBackend();
                    }.bind(this));
                } else {
                    // Fallback if model not yet available
                    this._detectEntitySets();
                    this._fetchRole();
                    this._fetchUserIdFromBackend();
                }

                // UI-11: Register OData model with MessageManager for global error collection
                this._initMessageHandling();
            } catch (e) {
                Log.error('UserContext initialization failed: ' + e.message);
                this._role = 'User';
            }

            Log.info('Component initialization completed');
        },

        /**
         * UI-11: Initialize sap.ui.core.message.MessageManager for OData error collection.
         * Registers the OData model's message processor so that backend errors are
         * automatically captured and available for MessagePopover consumption.
         */
        _initMessageHandling: function () {
            // FIX 7.4: Use sap.ui.require for MessageManager (forward-compatible with UI5 2.x)
            var Messaging = sap.ui.require("sap/ui/core/Messaging");
            var oMessageManager = Messaging || sap.ui.getCore().getMessageManager();
            var oModel = this.getModel();
            if (oModel) {
                oMessageManager.registerMessageProcessor(oModel);
            }
            // Expose message model on the component for views to bind to
            this.setModel(oMessageManager.getMessageModel(), "message");
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
                var sUserEntityTypeName = '';
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
                            // Detect User entity set (SEGW may name it 'UserSet' or 'Users')
                            if (aSets[ei].entityType &&
                                aSets[ei].entityType.indexOf('.User') >= 0 &&
                                aSets[ei].entityType.indexOf('.UserContext') < 0) {
                                that._userEntitySet = aSets[ei].name;
                                sUserEntityTypeName = aSets[ei].entityType;
                            }
                        }
                        Log.info('OData entity sets detected: ' + aNames.join(', '));
                    }

                    // Detect the manager property name on the User entity type
                    // SEGW property could be: sort2, Sort2, Manager, ManagerId, MANAGER, etc.
                    if (sUserEntityTypeName) {
                        var sShortType = sUserEntityTypeName;
                        if (sShortType.indexOf('.') >= 0) {
                            sShortType = sShortType.substring(sShortType.lastIndexOf('.') + 1);
                        }
                        var aEntityTypes = aSchemas[si].entityType || [];
                        for (var ti = 0; ti < aEntityTypes.length; ti++) {
                            if (aEntityTypes[ti].name === sShortType) {
                                var aProps = aEntityTypes[ti].property || [];
                                // Search for known manager property names (case-insensitive match)
                                var aPossibleNames = ['sort2', 'Sort2', 'SORT2', 'Manager', 'manager', 'MANAGER', 'ManagerId', 'managerId'];
                                for (var pi = 0; pi < aProps.length; pi++) {
                                    var sPropName = aProps[pi].name;
                                    if (aPossibleNames.indexOf(sPropName) >= 0) {
                                        that._userManagerProperty = sPropName;
                                        Log.info('User manager property detected from $metadata: ' + sPropName);
                                        break;
                                    }
                                }
                                // If no exact match found, try case-insensitive search
                                if (!that._userManagerProperty) {
                                    for (var pi2 = 0; pi2 < aProps.length; pi2++) {
                                        var sLower = aProps[pi2].name.toLowerCase();
                                        if (sLower === 'sort2' || sLower === 'manager' || sLower === 'managerid') {
                                            that._userManagerProperty = aProps[pi2].name;
                                            Log.info('User manager property detected (case-insensitive): ' + aProps[pi2].name);
                                            break;
                                        }
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
                Log.info('Assignment entity set resolved to: ' + that._assignmentEntitySet);
                Log.info('User entity set resolved to: ' + that._userEntitySet);
                Log.info('User manager property resolved to: ' + (that._userManagerProperty || '(not found - will show all users)'));
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
                Log.info("User ID defaulted to DEVUSER (dev mode, will be updated from backend getCurrentUser)");
            }
        },

        /**
         * Fetch userId from backend getCurrentUser function.
         * This resolves the correct sapUsername from the authenticated session
         * regardless of environment (BAS, localhost, FLP).
         */
        _fetchUserIdFromBackend: function () {
            var that = this;
            var oModel = this.getModel();
            if (!oModel || !oModel.callFunction) { return; }

            var bWasBatch = oModel.bUseBatch;
            oModel.setUseBatch(false);
            oModel.callFunction("/getCurrentUser", {
                method: "GET",
                success: function (oData) {
                    oModel.setUseBatch(bWasBatch);
                    var sUserId = "";
                    if (oData) {
                        if (oData.getCurrentUser && typeof oData.getCurrentUser === "object") {
                            sUserId = oData.getCurrentUser.value || oData.getCurrentUser.Value || "";
                        } else if (typeof oData.getCurrentUser === "string") {
                            sUserId = oData.getCurrentUser;
                        } else if (oData.value) {
                            sUserId = oData.value;
                        } else if (typeof oData === "string") {
                            sUserId = oData;
                        }
                    }
                    if (sUserId) {
                        sUserId = sUserId.toUpperCase();
                        that._userModel.setProperty("/userId", sUserId);
                        Log.info("User ID from backend getCurrentUser: " + sUserId);
                        // Refresh any data that was loaded with the old userId
                        that.getEventBus().publish("sapCourses", "userIdResolved", { userId: sUserId });
                    }
                },
                error: function (err) {
                    oModel.setUseBatch(bWasBatch);
                    Log.warning("getCurrentUser failed: " + (err && err.message || "") +
                        ". Using fallback userId: " + that._userModel.getProperty("/userId"));
                }
            });
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
                    if (ls) {
                        that._role = ls;
                        that._applyRoleUI();
                        return;
                    }
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
                        // Handle OData V2 response formats:
                        //   Format A: { getCurrentRole: { Role: "Admin" } }
                        //   Format B: { Role: "Admin" }
                        //   Format C (CAP): { getCurrentRole: "Admin" } (plain string)
                        if (oData) {
                            if (typeof oData.getCurrentRole === 'string') {
                                sRole = oData.getCurrentRole;
                            } else if (oData.getCurrentRole && oData.getCurrentRole.Role) {
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
            var sPrevRole = this._userModel.getProperty('/role');
            Log.info('User role applied: ' + sRole);
            this._userModel.setProperty("/role", sRole);
            // Only publish roleChanged if the role actually changed — prevents
            // redundant refreshes that cause navigation flicker/redirect loops
            if (sRole !== sPrevRole) {
                this.getEventBus().publish("sapCourses", "roleChanged", { role: sRole });
            }

            // All roles land on TrainingsList (default route) — no redirect needed.
            // Users can navigate to My Assignments via the "My Assignments" button.
        },

        // Navigate to TrainingAssignments (kept for potential future deep-link use)
        navigateToAssignments: function () {
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
         * Enhanced: A1 duplicate preview, A2 relevance, A3 wizard, A6 smart date,
         * B1 workload, B2 select all, B3 search
         * @param {Array} [aPreSelectedTrainings] - Trainings pre-selected from SmartTable
         */
        openAssignDialog: function (aPreSelectedTrainings) {
            var that = this;
            if (this._assignDlg) { this._assignDlg.destroy(); this._assignDlg = null; }
            var oModel = this.getModel();

            var sUserId = that.getCurrentUserId();
            var sRole = that._role;
            var aUserFilters = [];
            if (sRole === 'Manager' && sUserId) {
                var sManagerProp = that._userManagerProperty || 'Sort2';
                aUserFilters.push(new sap.ui.model.Filter(sManagerProp, sap.ui.model.FilterOperator.EQ, sUserId));
            }

            var sUserEntitySet = that._userEntitySet || 'UserSet';
            var pUsers = new Promise(function (resolve, reject) {
                oModel.read('/' + sUserEntitySet, {
                    filters: aUserFilters,
                    success: function (data) { resolve(data.results || []); },
                    error: function (err) {
                        Log.warning('[AssignDlg] Failed to read UserSet: ' + (err && err.message || ''));
                        reject(err);
                    }
                });
            }).catch(function () {
                Log.warning('[AssignDlg] Users entity not available');
                return [];
            });

            // B1: Load workload data (current assignment counts per user)
            var sAssignEntitySet = that._assignmentEntitySet || 'TrainingAssignments';
            var aWorkloadFilters = [];
            if (sRole === 'Manager' && sUserId) {
                aWorkloadFilters.push(new sap.ui.model.Filter('ManagerSort2', sap.ui.model.FilterOperator.EQ, sUserId));
            }
            var pWorkload = new Promise(function (resolve, reject) {
                oModel.read('/' + sAssignEntitySet, {
                    filters: aWorkloadFilters,
                    urlParameters: { "$select": "UserId,Status,DueDate" },
                    success: function (data) { resolve(data.results || []); },
                    error: function () { resolve([]); }
                });
            });

            Promise.all([pUsers, pWorkload]).then(function (aResults) {
                var users = aResults[0] || [];
                var workloadData = aResults[1] || [];

                // Client-side filter fallback: if backend didn't filter by manager,
                // apply the filter locally using the manager property
                if (sRole === 'Manager' && sUserId && aUserFilters.length > 0) {
                    var sManagerProp = that._userManagerProperty || 'Sort2';
                    var sUpper = sUserId.toUpperCase();
                    var filtered = users.filter(function (u) {
                        var val = (u[sManagerProp] || '').toUpperCase();
                        return val === sUpper;
                    });
                    // Only apply client filter if it actually reduces the list
                    // (means backend ignored the filter)
                    if (filtered.length > 0 && filtered.length < users.length) {
                        Log.info('[AssignDlg] Client-side filter applied: ' + users.length + ' → ' + filtered.length + ' users (by ' + sManagerProp + '=' + sUserId + ')');
                        users = filtered;
                    } else if (filtered.length === 0 && users.length > 20) {
                        // Sort2 is empty for all users — backend data issue
                        Log.warning('[AssignDlg] Manager filter field "' + sManagerProp + '" is empty for all users. Backend UserSet needs ' + sManagerProp + ' populated with manager IDs. Showing all ' + users.length + ' users as fallback.');
                    }
                }

                that._openAssignFragment(aPreSelectedTrainings || [], users, workloadData);
            }).catch(function () {
                var i18n = that.getModel("i18n").getResourceBundle();
                MessageToast.show(i18n.getText("failedLoadAssignment"));
            });
        },

        /**
         * Formatter for the "Selected Trainings (N)" panel header in AssignDialog.
         */
        formatSelectedTrainingsHeader: function (sPattern, aTrainings) {
            var iCount = Array.isArray(aTrainings) ? aTrainings.length : 0;
            if (sPattern) {
                return sPattern.replace("{0}", iCount);
            }
            return "Selected Trainings (" + iCount + ")";
        },

        /**
         * Build the assignModel and load the AssignDialog fragment.
         * Enhanced: wizard steps, workload enrichment, duplicate preview, relevance
         */
        _openAssignFragment: function (trainings, users, workloadData) {
            var that = this;

            // B1: Build workload map per user
            var mWorkload = {};
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            (workloadData || []).forEach(function (a) {
                var uid = (a.UserId || a.userId || '').toUpperCase();
                if (!mWorkload[uid]) { mWorkload[uid] = { total: 0, completed: 0, overdue: 0 }; }
                mWorkload[uid].total++;
                var st = a.Status || a.status || '';
                if (st === 'Completed') { mWorkload[uid].completed++; }
                if (st !== 'Completed' && a.DueDate) {
                    var due = new Date(a.DueDate);
                    if (due < today) { mWorkload[uid].overdue++; }
                }
            });

            // A2: Determine training roles for relevance matching
            var aTrainingRoles = [];
            trainings.forEach(function (tr) {
                var r = (tr.Role || '').toLowerCase();
                if (r) { aTrainingRoles.push(r); }
            });

            // Enrich user data with workload + relevance
            users.forEach(function (u) {
                var uid = (u.UserId || '').toUpperCase();
                var wl = mWorkload[uid] || { total: 0, completed: 0, overdue: 0 };
                u.workloadTotal = wl.total;
                u.workloadCompleted = wl.completed;
                u.workloadOverdue = wl.overdue;
                u.duplicateCount = 0; // will be updated after duplicate check

                // A2: Role relevance
                var userRole = (u.Role || '').toLowerCase();
                u.roleRelevance = aTrainingRoles.some(function (r) {
                    return r.indexOf(userRole) >= 0 || userRole.indexOf(r) >= 0;
                }) ? 'match' : 'none';
            });

            // Sort: relevant first, then by workload (least loaded first)
            users.sort(function (a, b) {
                if (a.roleRelevance === 'match' && b.roleRelevance !== 'match') return -1;
                if (b.roleRelevance === 'match' && a.roleRelevance !== 'match') return 1;
                return a.workloadTotal - b.workloadTotal;
            });

            // Initialize training duplicate counts
            trainings.forEach(function (tr) { tr.duplicateCount = 0; });

            // H16 FIX: Default due date to 2 weeks from today
            var oDefaultDue = new Date();
            oDefaultDue.setDate(oDefaultDue.getDate() + 14);
            var sDefaultDue = oDefaultDue.getFullYear() + '-' +
                String(oDefaultDue.getMonth() + 1).padStart(2, '0') + '-' +
                String(oDefaultDue.getDate()).padStart(2, '0');

            this._assignModel = new JSONModel({
                trainings: trainings,
                users: users,
                filteredUsers: users.slice(), // B3: filtered copy for search
                selectedUserKeys: [],
                selectedUsersDetail: [],
                dueDate: sDefaultDue,
                priority: 'Medium',
                notes: '',
                sequence: '',
                recurring: false,
                recurringInterval: 'monthly',
                maxRecurrences: 0,
                submitting: false,
                error: '',
                wizardStep: 1,
                duplicateWarning: '',
                _workloadData: workloadData || []
            });
            this._assignModel.setSizeLimit(10000);

            Fragment.load({
                name: "z.sap.courses.fragments.AssignDialog",
                controller: this
            }).then(function (oDialog) {
                that._assignDlg = oDialog;
                that._assignDlg.setModel(that._assignModel, "assignModel");
                that._assignDlg.setModel(that.getModel("i18n"), "i18n");
                that._assignDlg.setModel(that._userModel, "user");
                that._assignDlg.addStyleClass("assignTrainingDialog");
                if (sap.ui.Device.system.phone) { oDialog.setStretch(true); }
                that._assignDlg.attachAfterClose(function () {
                    that._assignDlg.destroy();
                    that._assignDlg = null;
                });
                that._assignDlg.open();
            }).catch(function (err) {
                Log.error('Failed to load AssignDialog: ' + (err && err.message || err));
                var i18nFallback = that.getModel("i18n") && that.getModel("i18n").getResourceBundle();
                MessageToast.show(i18nFallback ? i18nFallback.getText("failedOpenAssignDialog") : 'Failed to open assignment dialog');
            });
        },

        // --- Wizard Navigation (A3) ---

        onAssignNext: function () {
            var oModel = this._assignModel;
            if (!oModel) return;
            var iStep = oModel.getProperty("/wizardStep");
            var i18n = this.getModel("i18n").getResourceBundle();

            if (iStep === 1) {
                // Validate step 1
                var aTrainings = oModel.getProperty("/trainings");
                if (!aTrainings || aTrainings.length === 0) {
                    oModel.setProperty("/error", i18n.getText("noTrainingsSelected") || "No trainings selected.");
                    return;
                }
                // FIX 3.1: Due date is mandatory — no assignment without due date
                var sDueDate = oModel.getProperty("/dueDate");
                if (!sDueDate) {
                    oModel.setProperty("/error", i18n.getText("dueDateRequired") || "Due date is required. No assignment can be created without a due date.");
                    return;
                }
                oModel.setProperty("/error", "");
                oModel.setProperty("/wizardStep", 2);
            } else if (iStep === 2) {
                // Validate step 2
                var aKeys = oModel.getProperty("/selectedUserKeys") || [];
                if (aKeys.length === 0) {
                    oModel.setProperty("/error", i18n.getText("selectTeamMember") || "Select at least one team member");
                    return;
                }
                oModel.setProperty("/error", "");

                // Build selectedUsersDetail for summary step
                var aUsers = oModel.getProperty("/users") || [];
                var mUsers = {};
                aUsers.forEach(function (u) { mUsers[(u.UserId || '').toUpperCase()] = u; });
                var aDetail = aKeys.map(function (k) { return mUsers[k.toUpperCase()] || { UserId: k }; });
                oModel.setProperty("/selectedUsersDetail", aDetail);

                // A1: Run duplicate check before showing summary
                this._checkDuplicatesForSummary();

                oModel.setProperty("/wizardStep", 3);
            } else if (iStep === 3) {
                // Submit
                this.onAssignSubmit();
            }
        },

        onAssignBack: function () {
            var oModel = this._assignModel;
            if (!oModel) return;
            var iStep = oModel.getProperty("/wizardStep");
            if (iStep > 1) {
                oModel.setProperty("/error", "");
                oModel.setProperty("/wizardStep", iStep - 1);
            }
        },

        // A1: Check duplicates via backend
        _checkDuplicatesForSummary: function () {
            var oModel = this._assignModel;
            var oOData = this.getModel();
            var aKeys = oModel.getProperty("/selectedUserKeys") || [];
            var aTrainings = oModel.getProperty("/trainings") || [];
            var aTrainingIds = aTrainings.map(function (t) { return t.Id || t.ID || ''; });

            // Reset duplicate counts
            aTrainings.forEach(function (t) { t.duplicateCount = 0; });
            var aUsers = oModel.getProperty("/users") || [];
            aUsers.forEach(function (u) { u.duplicateCount = 0; });

            // Build workload-based duplicate map (check from already loaded workload data)
            var aWorkload = oModel.getProperty("/_workloadData") || [];
            var mDupes = {};
            aWorkload.forEach(function (a) {
                var uid = (a.UserId || a.userId || '').toUpperCase();
                var tid = a.TrainingId || a.trainingId || '';
                var st = a.Status || a.status || '';
                if (st !== 'Completed') {
                    mDupes[uid + '|' + tid] = true;
                }
            });

            var iDupeCount = 0;
            var mUserDupe = {};
            var mTrainDupe = {};
            aKeys.forEach(function (uid) {
                aTrainingIds.forEach(function (tid) {
                    if (mDupes[uid.toUpperCase() + '|' + tid]) {
                        iDupeCount++;
                        mUserDupe[uid.toUpperCase()] = (mUserDupe[uid.toUpperCase()] || 0) + 1;
                        mTrainDupe[tid] = (mTrainDupe[tid] || 0) + 1;
                    }
                });
            });

            // Update per-user and per-training duplicate counts
            aUsers.forEach(function (u) {
                u.duplicateCount = mUserDupe[(u.UserId || '').toUpperCase()] || 0;
            });
            aTrainings.forEach(function (t) {
                var tid = t.Id || t.ID || '';
                t.duplicateCount = mTrainDupe[tid] || 0;
            });
            oModel.setProperty("/trainings", aTrainings);
            oModel.setProperty("/users", aUsers);

            if (iDupeCount > 0) {
                oModel.setProperty("/duplicateWarning",
                    iDupeCount + " duplicate(s) detected — these will be automatically skipped.");
            } else {
                oModel.setProperty("/duplicateWarning", "");
            }

            // Refresh selectedUsersDetail with updated dupe counts
            var aDetail = oModel.getProperty("/selectedUsersDetail") || [];
            aDetail.forEach(function (d) {
                d.duplicateCount = mUserDupe[(d.UserId || '').toUpperCase()] || 0;
            });
            oModel.setProperty("/selectedUsersDetail", aDetail);
        },

        // B3: Filter users by search term
        onAssignUserSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();
            var aUsers = this._assignModel.getProperty("/users") || [];
            if (!sQuery) {
                this._assignModel.setProperty("/filteredUsers", aUsers.slice());
            } else {
                this._assignModel.setProperty("/filteredUsers", aUsers.filter(function (u) {
                    var s = ((u.UserId || '') + ' ' + (u.FirstName || '') + ' ' + (u.LastName || '') + ' ' + (u.Role || '')).toLowerCase();
                    return s.indexOf(sQuery) >= 0;
                }));
            }
        },

        // B2: Select all visible users
        onAssignSelectAllUsers: function () {
            var aFiltered = this._assignModel.getProperty("/filteredUsers") || [];
            var aKeys = aFiltered.map(function (u) { return u.UserId; });
            this._assignModel.setProperty("/selectedUserKeys", aKeys);
            // Update list selection
            this._syncUserListSelection();
        },

        // B2: Deselect all
        onAssignDeselectAllUsers: function () {
            this._assignModel.setProperty("/selectedUserKeys", []);
            this._syncUserListSelection();
        },

        // Sync List multi-select state with model
        _syncUserListSelection: function () {
            if (!this._assignDlg) return;
            var oList = sap.ui.core.Fragment.byId(this._assignDlg.getId(), "assignUserList");
            if (!oList) {
                // Fallback: find by walking dialog content
                try {
                    var aContent = this._assignDlg.getContent();
                    if (aContent && aContent[0]) {
                        var aItems = aContent[0].getItems ? aContent[0].getItems() : [];
                        for (var i = 0; i < aItems.length; i++) {
                            if (aItems[i].getItems) {
                                var aInner = aItems[i].getItems();
                                for (var j = 0; j < aInner.length; j++) {
                                    if (aInner[j].getMetadata && aInner[j].getMetadata().getName() === 'sap.m.List' &&
                                        aInner[j].getMode && aInner[j].getMode() === 'MultiSelect') {
                                        oList = aInner[j];
                                        break;
                                    }
                                }
                            }
                            if (oList) break;
                        }
                    }
                } catch (_) { /* noop */ }
            }

            if (oList && oList.getItems) {
                var aKeys = this._assignModel.getProperty("/selectedUserKeys") || [];
                var mKeys = {};
                aKeys.forEach(function (k) { mKeys[k.toUpperCase()] = true; });
                oList.getItems().forEach(function (oItem) {
                    var oCtx = oItem.getBindingContext("assignModel");
                    if (oCtx) {
                        var uid = (oCtx.getProperty("UserId") || '').toUpperCase();
                        oItem.setSelected(!!mKeys[uid]);
                    }
                });
            }
        },

        // List multi-select change handler
        onAssignUserListSelectionChange: function (oEvent) {
            var oList = oEvent.getSource();
            var aSelected = oList.getSelectedItems();
            var aKeys = aSelected.map(function (oItem) {
                var oCtx = oItem.getBindingContext("assignModel");
                return oCtx ? oCtx.getProperty("UserId") : '';
            }).filter(Boolean);
            this._assignModel.setProperty("/selectedUserKeys", aKeys);
        },

        /**
         * Submit handler — E1 slim payload, A4 batch, A5 result dialog.
         * Creates assignments sequentially (batch disabled for clear error messages).
         * Skips duplicates automatically (A1).
         */
        onAssignSubmit: function () {
            var that = this;
            var oAssignModel = this._assignModel;
            if (!oAssignModel) return;
            var data = oAssignModel.getData();
            var aTrainings = data.trainings || [];
            var aSelectedKeys = data.selectedUserKeys || [];
            var i18nBundle = this.getModel("i18n").getResourceBundle();

            if (aTrainings.length === 0) {
                oAssignModel.setProperty('/error', i18nBundle.getText("noTrainingsSelected") || 'No trainings selected.');
                return;
            }
            if (aSelectedKeys.length === 0) {
                oAssignModel.setProperty('/error', i18nBundle.getText("selectTeamMember") || 'Please select at least one team member');
                return;
            }
            oAssignModel.setProperty('/error', '');

            // Build due date as UTC
            var dueDateValue = null;
            try {
                if (data.dueDate) {
                    var year, month, day;
                    if (data.dueDate instanceof Date) {
                        year = data.dueDate.getFullYear(); month = data.dueDate.getMonth(); day = data.dueDate.getDate();
                    } else if (typeof data.dueDate === 'string' && data.dueDate.length >= 10) {
                        var dateParts = data.dueDate.substring(0, 10).split('-');
                        if (dateParts.length === 3) {
                            year = parseInt(dateParts[0], 10); month = parseInt(dateParts[1], 10) - 1; day = parseInt(dateParts[2], 10);
                        }
                    }
                    if (year && !isNaN(year)) {
                        dueDateValue = new Date(Date.UTC(year, month, day, 0, 0, 0));
                        if (isNaN(dueDateValue.getTime())) dueDateValue = null;
                    }
                }
            } catch (_) { dueDateValue = null; }

            // Build duplicate map for skipping
            var aWorkload = data._workloadData || [];
            var mDupes = {};
            aWorkload.forEach(function (a) {
                var uid = (a.UserId || a.userId || '').toUpperCase();
                var tid = a.TrainingId || a.trainingId || '';
                var st = a.Status || a.status || '';
                if (st !== 'Completed') { mDupes[uid + '|' + tid] = true; }
            });

            oAssignModel.setProperty('/submitting', true);

            var sEntitySet = this._assignmentEntitySet || 'TrainingAssignments';
            var oModel = this.getModel();
            var bWasBatch = oModel.bUseBatch;
            oModel.setUseBatch(false);

            // Build flat list of all combinations
            var aCombinations = [];
            aTrainings.forEach(function (tr) {
                aSelectedKeys.forEach(function (sKey) {
                    aCombinations.push({ training: tr, userKey: sKey.toUpperCase() });
                });
            });

            var aResults = [];
            var iSuccess = 0, iFail = 0, iSkip = 0;

            var fnCreateNext = function (idx) {
                if (idx >= aCombinations.length) {
                    oModel.setUseBatch(bWasBatch);
                    oAssignModel.setProperty('/submitting', false);
                    // Close assign dialog
                    if (that._assignDlg) { that._assignDlg.close(); }
                    oModel.refresh(true);
                    // Notify controllers to refresh analytics after new assignments
                    that.getEventBus().publish("sapCourses", "assignmentsChanged", { successCount: iSuccess });
                    // A5: Show result dialog
                    that._showAssignResult(aResults, iSuccess, iFail, iSkip);
                    return;
                }

                var combo = aCombinations[idx];
                var tr = combo.training;
                var sKey = combo.userKey;
                var tid = tr.Id || tr.ID || '';

                // A1: Skip known duplicates
                if (mDupes[sKey + '|' + tid]) {
                    iSkip++;
                    aResults.push({
                        userId: sKey,
                        trainingTitle: tr.Title || '?',
                        success: false,
                        skipped: true,
                        message: 'Skipped — already assigned'
                    });
                    fnCreateNext(idx + 1);
                    return;
                }

                // E1: Slim payload — only send properties that exist in the backend entity
                // TrainingAssignment entity has: TrainingId, UserId, Status, DueDate, Id
                // Properties like Priority, Notes, Sequence, Recurring are UI-only (not in SEGW model)
                var payload = {
                    TrainingId: tid,
                    UserId: sKey,
                    Status: 'Assigned'
                };
                if (dueDateValue !== null) { payload.DueDate = dueDateValue; }
                // Note: Priority, Notes, Sequence, Recurring fields are stored in UI only
                // The backend TrainingAssignment entity does not have these properties

                oModel.create('/' + sEntitySet, payload, {
                    success: function () {
                        iSuccess++;
                        aResults.push({
                            userId: sKey,
                            trainingTitle: tr.Title || '?',
                            success: true,
                            skipped: false,
                            message: ''
                        });
                        fnCreateNext(idx + 1);
                    },
                    error: function (err) {
                        iFail++;
                        var msg = 'Create failed';
                        try {
                            var parsed = JSON.parse(err.responseText);
                            msg = (parsed.error && parsed.error.message && parsed.error.message.value) || 'failed';
                        } catch (_) { /* ignore */ }
                        aResults.push({
                            userId: sKey,
                            trainingTitle: tr.Title || '?',
                            success: false,
                            skipped: false,
                            message: msg
                        });
                        fnCreateNext(idx + 1);
                    }
                });
            };

            oModel.refreshSecurityToken(function () {
                fnCreateNext(0);
            }, function () {
                oModel.setUseBatch(bWasBatch);
                oAssignModel.setProperty('/submitting', false);
                oAssignModel.setProperty('/error', i18nBundle.getText("securityTokenFailed") || 'Security token refresh failed.');
            });
        },

        /**
         * A5: Show assignment result dialog with per-row success/fail/skip status
         */
        _showAssignResult: function (aResults, iSuccess, iFail, iSkip) {
            var that = this;
            var oResultModel = new JSONModel({
                results: aResults,
                successCount: iSuccess,
                failCount: iFail,
                skipCount: iSkip
            });

            Fragment.load({
                name: "z.sap.courses.fragments.AssignResultDialog",
                controller: this
            }).then(function (oDialog) {
                that._resultDlg = oDialog;
                oDialog.setModel(oResultModel, "resultModel");
                oDialog.setModel(that.getModel("i18n"), "i18n");
                oDialog.attachAfterClose(function () { oDialog.destroy(); that._resultDlg = null; });
                oDialog.open();
            });
        },

        onAssignResultClose: function () {
            if (this._resultDlg) { this._resultDlg.close(); }
        },

        /**
         * Cancel handler for Assign Training dialog.
         */
        onAssignCancel: function () {
            if (this._assignDlg) {
                this._assignDlg.close();
            }
        },

        // D2: Send reminder (pre-filled mailto)
        sendReminder: function (sUserEmail, sUserName, sTrainingTitle) {
            if (!sUserEmail) {
                var i18nEmail = this.getModel("i18n") && this.getModel("i18n").getResourceBundle();
                MessageToast.show(i18nEmail ? i18nEmail.getText("noEmailAvailable") : 'No email address available');
                return;
            }
            var subject = encodeURIComponent('Reminder: Training Assignment — ' + sTrainingTitle);
            var body = encodeURIComponent(
                'Hi ' + (sUserName || '') + ',\n\n' +
                'This is a friendly reminder about your pending training assignment:\n\n' +
                'Training: ' + sTrainingTitle + '\n\n' +
                'Please complete it at your earliest convenience.\n\n' +
                'Best regards'
            );
            window.open('mailto:' + sUserEmail + '?subject=' + subject + '&body=' + body, '_self');
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
            if (this._resultDlg) {
                this._resultDlg.destroy();
                this._resultDlg = null;
            }
            UIComponent.prototype.destroy.apply(this, arguments);
        }
    });
});

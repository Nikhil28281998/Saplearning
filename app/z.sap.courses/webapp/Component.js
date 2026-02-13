sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/TextArea",
    "sap/m/Bar",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ui/Device",
    "sap/m/MessageToast",
    "z/sap/courses/services/UserContext"
], function (UIComponent, ODataModel, Button, Dialog, List, StandardListItem, TextArea, Bar, JSONModel, Log, Device, MessageToast, UserContext) {
    "use strict";

    return UIComponent.extend("z.sap.courses.Component", {
        metadata: { manifest: "json" },

        init: function () {
            // Log initialization start for debugging blank page issues
            Log.info('Component initialization started - OData V2 Compatible');
            
            UIComponent.prototype.init.apply(this, arguments);
            
            // Initialize router
            this.getRouter().initialize();
            
            // Detect entity set names from OData $metadata (handles SEGW naming variations)
            this._assignmentEntitySet = 'TrainingAssignments'; // default
            this._detectEntitySets();
            
            // Initialize UserContext service (S/4 authorization adapter) - non-blocking
            try {
                this._userContext = new UserContext();
                this._diagnosticsInit();
                // Fetch role asynchronously without blocking component init
                setTimeout(function() {
                    this._fetchRole();
                    this._startupHealthCheck();
                }.bind(this), 100);
            } catch(e) {
                Log.error('UserContext initialization failed: ' + e.message);
                // Default role if service fails
                this._role = 'User';
            }
            
            Log.info('Component initialization completed');
        },

        _diagnosticsInit: function(){
            try{
                // Global error logging
                window.addEventListener('error', function(e){
                    Log.error('Global Error: ' + (e && e.message), e && e.error);
                });
                window.addEventListener('unhandledrejection', function(e){
                    var msg = (e && e.reason && e.reason.message) || 'Unhandled rejection';
                    Log.error('Unhandled Promise Rejection: ' + msg, e && e.reason);
                });
                var r = this.getRouter();
                this._routeStarted = false;
                if (r && r.attachRouteMatched){
                    r.attachRouteMatched(function(o){
                        try{
                            var name = o.getParameter && o.getParameter('name');
                            Log.info('Route matched: ' + name);
                            this._routeStarted = true;
                        }catch(_){/*noop*/}
                    }.bind(this));
                }
            }catch(_){/*noop*/}
        },

        getContentDensityClass: function() {
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
         * Handles SEGW naming variations (TrainingAssignment, TrainingAssignments,
         * TrainingAssignmentSet, etc.)
         */
        _detectEntitySets: function() {
            var that = this;
            var oModel = this.getModel();
            if (!oModel) { return; }

            var fnResolve = function() {
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
            };

            // Try immediately (metadata may already be loaded)
            if (oModel.getServiceMetadata()) {
                fnResolve();
            } else if (oModel.attachMetadataLoaded) {
                oModel.attachMetadataLoaded(fnResolve);
            }
        },

        /**
         * Get the resolved entity set name for TrainingAssignment.
         * Can be called from controllers: this.getOwnerComponent().getAssignmentEntitySet()
         */
        getAssignmentEntitySet: function() {
            return this._assignmentEntitySet || 'TrainingAssignments';
        },

        /**
         * Switch user role dynamically (Admin/Manager/User).
         * Updates the user JSON model — all view bindings auto-refresh.
         */
        switchRole: function(sRole) {
            this._role = sRole;
            var oModel = this.getModel("user");
            if (oModel) {
                oModel.setProperty("/role", sRole);
            } else {
                this._applyRoleUI();
            }
            Log.info('Role switched to: ' + sRole);
        },

        /**
         * Fetch user role from S/4 via UserContext service
         * Replaces email-based role lookup with PFCG-based authorization
         */
        _fetchRole: function(){
            var that = this;
            var isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            // Development: allow URL/localStorage override for testing
            if (isDev) {
                try{
                    var href = window.location && window.location.href || '';
                    var hash = window.location && window.location.hash || '';
                    var m = href.match(/[?&](saplc-role|sap-role)=([^&]+)/) || hash.match(/[?&](saplc-role|sap-role)=([^&]+)/);
                    if (m && m[1]){
                        var v = decodeURIComponent(m[2] || m[1]);
                        if (/^(Admin|Manager|User)$/i.test(v)){
                            var norm = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
                            that._role = norm;
                            try{ localStorage.setItem('saplc-role', norm); }catch(_){}
                            that._applyRoleUI();
                            return;
                        }
                    }
                }catch(_){ /* ignore */ }
                try{
                    var ls = localStorage.getItem('saplc-role');
                    if (ls) { that._role = ls; that._applyRoleUI(); return; }
                }catch(_){ /* ignore */ }
            }
            
            // TEMPORARY FIX: Hardcode Admin role until Z_COURSES_USERCTX_SRV is implemented
            // TODO: Remove this when backend service is ready (returns proper PFCG roles)
            that._role = 'Admin';  // HARDCODED - Change to 'Manager' or 'User' for testing
            that._applyRoleUI();
            Log.info('Role hardcoded to Admin - waiting for Z_COURSES_USERCTX_SRV implementation');
            return;
            
            // Original code (will be re-enabled when backend service is ready):
            // Production: Use S/4 UserContext service for PFCG role-based authorization
            // NOTE: This is for UX purposes only - backend enforces actual authorization
            // this._userContext.getCurrentRole()
            //     .then(function(role){
            //         that._role = role;
            //         that._applyRoleUI();
            //     })
            //     .catch(function(error){ 
            //         Log.warning('Failed to fetch role from S/4 UserContext (non-critical): ' + error);
            //         // Default to read-only user role
            //         that._role = 'User'; 
            //         that._applyRoleUI(); 
            //     });
        },

        _applyRoleUI: function(){
            // Role-based UI adjustments - for OData V2 standard UI5 app
            // Role is stored in this._role
            Log.info('User role applied: ' + this._role);
            
            // Create JSON model for role binding in views
            var roleModel = new JSONModel({
                role: this._role || 'User'
            });
            this.setModel(roleModel, "user");
            
            // Also set on root view if available
            var rootView = this.getRootControl();
            if (rootView) {
                rootView.setModel(roleModel, "user");
            }
        },

        _startupHealthCheck: function(){
            var that = this;
            var ok = true;
            
            // Determine service path based on environment
            var isS4Hana = window.location.hostname !== 'localhost' && 
                          window.location.hostname !== '127.0.0.1';
            
            // FIXED: Updated service name to match manifest.json (ZCOURSES_SRV)
            // FIXED: Updated entity set to match manifest.json (Trainings)
            var metadataPath = isS4Hana ? 
                '/sap/opu/odata/sap/ZCOURSES_SRV/$metadata' : 
                '/service/SAPLearningService/$metadata';
            var dataPath = isS4Hana ? 
                '/sap/opu/odata/sap/ZCOURSES_SRV/Trainings?$top=1' : 
                '/service/SAPLearningService/Trainings?$top=1';
            
            // Check OData service availability - non-blocking
            setTimeout(function() {
                var checks = [
                    fetch(metadataPath).then(function(r){ ok = ok && r.ok; }).catch(function(){ ok=false; }),
                    fetch(dataPath).then(function(r){ ok = ok && r.ok; }).catch(function(){ ok=false; })
                ];
                Promise.all(checks).then(function(){
                    if (!ok){
                        Log.warning('OData service health check failed - service may not be fully available');
                    } else {
                        Log.info('OData service health check passed');
                    }
                }).catch(function(err){
                    Log.warning('Health check error (non-critical): ' + err.message);
                });
            }, 500);
        },

        // Navigate to TrainingAssignments
        openTrainingAssignmentsAndCreate: function(){
            var r = this.getRouter();
            if (r && r.navTo) {
                r.navTo('TrainingAssignmentsList');
            }
        },

        // Navigate to TrainingAssignments LR
        navigateToTraining: function(){
            var r = this.getRouter();
            if (r && r.navTo) {
                r.navTo('TrainingAssignmentsList');
            }
        },

        // Guided Assign Training dialog (Manager/Admin)
        openAssignDialog: function(){
            var that = this;
            // Always recreate for fresh data
            if (this._assignDlg) { this._assignDlg.destroy(); this._assignDlg = null; }
            var oModel = this.getModel();
            var loadList = function(path, params){
                return new Promise(function(resolve, reject){
                    oModel.read(path, {
                        urlParameters: params || {},
                        success: function(data) {
                            resolve(data.results || []);
                        },
                        error: reject
                    });
                });
            };

            loadList('/Trainings').then(function(trainings){
                trainings = trainings || [];

                // Load ALL users (bypass default paging limit)
                loadList('/Users', { "$top": "9999" }).then(function(users) {
                    users = users || [];
                    _buildDialog(trainings, users);
                }).catch(function() {
                    _buildDialog(trainings, []);
                });
            }).catch(function(err){
                MessageToast.show('Failed to load data for assignment');
            });

            var _buildDialog = function(trainings, users) {

                // Extract unique roles and modules for filter dropdowns
                var roleSet = {};
                var moduleSet = {};
                trainings.forEach(function(t) {
                    if (t.Role) { roleSet[t.Role] = true; }
                    if (t.SapModule) { moduleSet[t.SapModule] = true; }
                });

                var dlgModel = new JSONModel({
                    trainings: trainings,
                    filteredTrainings: trainings,
                    users: users,
                    roles: [{ key: '', text: 'All Roles' }].concat(
                        Object.keys(roleSet).sort().map(function(r) { return { key: r, text: r }; })
                    ),
                    modules: [{ key: '', text: 'All Modules' }].concat(
                        Object.keys(moduleSet).sort().map(function(m) { return { key: m, text: m }; })
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
                dlgModel.setSizeLimit(10000);

                // Filter training list + cross-filter between Role and Module
                var filterTrainings = function(source) {
                    var data = dlgModel.getData();
                    var selRole = data.selectedRoleFilter;
                    var selModule = data.selectedModuleFilter;

                    var filtered = data.trainings.filter(function(t) {
                        var roleMatch = !selRole || t.Role === selRole;
                        var moduleMatch = !selModule || t.SapModule === selModule;
                        return roleMatch && moduleMatch;
                    });
                    dlgModel.setProperty('/filteredTrainings', filtered);

                    if (source === 'role') {
                        var mSet = {};
                        data.trainings.forEach(function(t) {
                            if (t.SapModule && (!selRole || t.Role === selRole)) {
                                mSet[t.SapModule] = true;
                            }
                        });
                        var newModules = [{ key: '', text: 'All Modules' }].concat(
                            Object.keys(mSet).sort().map(function(m) { return { key: m, text: m }; })
                        );
                        dlgModel.setProperty('/modules', newModules);
                        if (selModule && !mSet[selModule]) {
                            dlgModel.setProperty('/selectedModuleFilter', '');
                        }
                    }

                    if (source === 'module') {
                        var rSet = {};
                        data.trainings.forEach(function(t) {
                            if (t.Role && (!selModule || t.SapModule === selModule)) {
                                rSet[t.Role] = true;
                            }
                        });
                        var newRoles = [{ key: '', text: 'All Roles' }].concat(
                            Object.keys(rSet).sort().map(function(r) { return { key: r, text: r }; })
                        );
                        dlgModel.setProperty('/roles', newRoles);
                        if (selRole && !rSet[selRole]) {
                            dlgModel.setProperty('/selectedRoleFilter', '');
                        }
                    }

                    if (filtered.length > 0 && !filtered.some(function(f) { return f.Id === data.selectedTrainingId; })) {
                        dlgModel.setProperty('/selectedTrainingId', filtered[0].Id);
                    }
                };

                // Helper: look up user by typed ID and auto-fill fields
                var lookupUserById = function(val) {
                    if (!val) { return; }
                    var upper = val.toUpperCase();
                    var allUsers = dlgModel.getProperty('/users') || [];
                    var found = allUsers.filter(function(u) {
                        return u.UserId === upper;
                    })[0];
                    if (found) {
                        dlgModel.setProperty('/firstName', found.FirstName || '');
                        dlgModel.setProperty('/lastName', found.LastName || '');
                        dlgModel.setProperty('/userEmail', found.Email || '');
                    }
                };

                // --- Build controls ---
                var roleFilterSelect = new sap.m.Select({
                    width: '100%',
                    items: {
                        path: '/roles',
                        template: new sap.ui.core.ListItem({ key: '{key}', text: '{text}' })
                    },
                    selectedKey: '{/selectedRoleFilter}',
                    change: function() { filterTrainings('role'); }
                });

                var moduleFilterSelect = new sap.m.Select({
                    width: '100%',
                    items: {
                        path: '/modules',
                        template: new sap.ui.core.ListItem({ key: '{key}', text: '{text}' })
                    },
                    selectedKey: '{/selectedModuleFilter}',
                    change: function() { filterTrainings('module'); }
                });

                var trainingSelect = new sap.m.Select({
                    width: '100%',
                    items: {
                        path: '/filteredTrainings',
                        template: new sap.ui.core.ListItem({
                            key: '{Id}',
                            text: '{Title}',
                            additionalText: '{Role} | {SapModule}'
                        })
                    },
                    selectedKey: '{/selectedTrainingId}',
                    showSecondaryValues: true
                });

                // User ComboBox — supports type-ahead for ALL users
                var userSelect = new sap.m.ComboBox({
                    width: '100%',
                    placeholder: 'Type or select a user...',
                    showSecondaryValues: true,
                    filterSecondaryValues: true,
                    selectedKey: '{/userId}',
                    items: {
                        path: '/users',
                        template: new sap.ui.core.ListItem({
                            key: '{UserId}',
                            text: '{UserId}',
                            additionalText: '{FirstName} {LastName}'
                        })
                    },
                    selectionChange: function(oEvent) {
                        var oItem = oEvent.getParameter("selectedItem");
                        // Always clear fields first to prevent stale data
                        dlgModel.setProperty("/firstName", "");
                        dlgModel.setProperty("/lastName", "");
                        dlgModel.setProperty("/userEmail", "");
                        if (oItem) {
                            var sUserId = oItem.getKey();
                            dlgModel.setProperty("/userId", sUserId || "");
                            lookupUserById(sUserId);
                        } else {
                            dlgModel.setProperty("/userId", "");
                        }
                    },
                    change: function(oEvent) {
                        var val = oEvent.getParameter("value") || "";
                        var upper = val.toUpperCase();
                        dlgModel.setProperty("/userId", upper);
                        // Auto-fill from loaded users when user types manually
                        lookupUserById(upper);
                    }
                });

                var firstNameInput = new sap.m.Input({
                    width: '100%',
                    placeholder: 'Auto-filled',
                    value: '{/firstName}',
                    editable: false
                });
                var lastNameInput = new sap.m.Input({
                    width: '100%',
                    placeholder: 'Auto-filled',
                    value: '{/lastName}',
                    editable: false
                });
                var userEmailInput = new sap.m.Input({
                    width: '100%',
                    placeholder: 'Auto-filled',
                    value: '{/userEmail}',
                    editable: false,
                    type: 'Email'
                });
                var datePicker = new sap.m.DatePicker({
                    width: '100%',
                    valueFormat: 'yyyy-MM-dd',
                    displayFormat: 'long',
                    value: '{/dueDate}',
                    placeholder: 'Select due date'
                });

                // Build form with spacious layout using SimpleForm
                sap.ui.require(["sap/ui/layout/form/SimpleForm"], function(SimpleForm) {

                    var form = new SimpleForm({
                        editable: true,
                        layout: "ResponsiveGridLayout",
                        labelSpanXL: 4, labelSpanL: 4, labelSpanM: 4, labelSpanS: 12,
                        emptySpanXL: 0, emptySpanL: 0, emptySpanM: 0,
                        columnsXL: 1, columnsL: 1, columnsM: 1,
                        adjustLabelSpan: false,
                        content: [
                            // Section 1: Filter Training
                            new sap.ui.core.Title({ text: "Filter Training" }),
                            new sap.m.Label({ text: "Role" }),
                            roleFilterSelect,
                            new sap.m.Label({ text: "Module" }),
                            moduleFilterSelect,

                            // Section 2: Select Training
                            new sap.ui.core.Title({ text: "Select Training" }),
                            new sap.m.Label({ text: "Training", required: true }),
                            trainingSelect,

                            // Section 3: Assign To
                            new sap.ui.core.Title({ text: "Assign To" }),
                            new sap.m.Label({ text: "User ID", required: true }),
                            userSelect,
                            new sap.m.Label({ text: "First Name" }),
                            firstNameInput,
                            new sap.m.Label({ text: "Last Name" }),
                            lastNameInput,
                            new sap.m.Label({ text: "Email" }),
                            userEmailInput,

                            // Section 4: Schedule
                            new sap.ui.core.Title({ text: "Schedule" }),
                            new sap.m.Label({ text: "Due Date" }),
                            datePicker
                        ]
                    });

                    // Error strip below the form
                    var errorStrip = new sap.m.MessageStrip({
                        text: '{/error}',
                        visible: '{= !!${/error} }',
                        type: 'Error',
                        showIcon: true
                    });
                    errorStrip.addStyleClass("sapUiSmallMarginTop");

                    var dialogContent = new sap.m.VBox({
                        items: [form, errorStrip]
                    });
                    dialogContent.addStyleClass("sapUiSmallMargin");

                    var onSubmit = function(){
                        var data = dlgModel.getData();
                        var tr = (data.filteredTrainings || []).find(function(t){ return t.Id === data.selectedTrainingId; });

                        if (!tr) {
                            dlgModel.setProperty('/error', 'Please select a training');
                            return;
                        }
                        if (!data.userId || data.userId.trim() === '') {
                            dlgModel.setProperty('/error', 'User ID (SYUNAME) is required');
                            return;
                        }
                        var userIdUpper = data.userId.toUpperCase();
                        if (!/^[A-Z0-9_]{1,12}$/.test(userIdUpper)) {
                            dlgModel.setProperty('/error', 'Invalid User ID format');
                            return;
                        }
                        dlgModel.setProperty('/error', '');

                        // Build due date as JS Date object (OData V2 needs Date, not ISO string)
                        var dueDate = null;
                        try {
                            if (data.dueDate) {
                                dueDate = new Date(data.dueDate + 'T00:00:00');
                            }
                        } catch(e) { /* ignore */ }

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
                        // Only include DueDate if set (avoid sending null to ABAP)
                        if (dueDate) {
                            payload.DueDate = dueDate;
                        }

                        dlgModel.setProperty('/submitting', true);

                        // Use entity set name detected from $metadata (handles SEGW naming)
                        var sEntitySet = that._assignmentEntitySet || 'TrainingAssignments';
                        Log.info('Creating assignment via /' + sEntitySet + ' payload: ' + JSON.stringify(payload));

                        // Ensure CSRF token is fetched first
                        oModel.refreshSecurityToken(function() {
                            oModel.create('/' + sEntitySet, payload, {
                                success: function() {
                                    that.navigateToTraining();
                                    that._assignDlg.close();
                                    dlgModel.setProperty('/submitting', false);
                                    dlgModel.setProperty('/error', '');
                                    MessageToast.show('Training assigned successfully');
                                },
                                error: function(err) {
                                    dlgModel.setProperty('/submitting', false);
                                    var msg = 'Create failed';
                                    try {
                                        if (err && err.responseText) {
                                            var parsed = JSON.parse(err.responseText);
                                            msg = parsed.error.message.value || msg;
                                        } else if (err && err.message) {
                                            msg = err.message;
                                        }
                                    } catch(e) {
                                        msg = (err && err.message) || msg;
                                    }
                                    dlgModel.setProperty('/error', msg);
                                    Log.error('Assignment create failed: ' + msg);
                                }
                            });
                        }, function(tokenErr) {
                            dlgModel.setProperty('/submitting', false);
                            dlgModel.setProperty('/error', 'Security token refresh failed. Please reload the app.');
                            Log.error('CSRF token refresh failed: ' + tokenErr);
                        });
                    };

                    that._assignDlg = new Dialog({
                        title: 'Assign Training',
                        contentWidth: '620px',
                        contentHeight: 'auto',
                        verticalScrolling: true,
                        draggable: true,
                        resizable: true,
                        content: [dialogContent],
                        beginButton: new Button({
                            text: 'Assign',
                            type: 'Emphasized',
                            icon: 'sap-icon://accept',
                            enabled: '{= !${/submitting} }',
                            press: onSubmit
                        }),
                        endButton: new Button({
                            text: 'Cancel',
                            press: function(){ that._assignDlg.close(); }
                        })
                    });
                    that._assignDlg.addStyleClass("assignTrainingDialog");
                    that._assignDlg.setModel(dlgModel);
                    that._assignDlg.open();
                }); // end sap.ui.require SimpleForm
            };  // end _buildDialog
        },

        destroy: function() {
            if (this._assignDlg) {
                this._assignDlg.destroy();
                this._assignDlg = null;
            }
            UIComponent.prototype.destroy.apply(this, arguments);        }
    });
});

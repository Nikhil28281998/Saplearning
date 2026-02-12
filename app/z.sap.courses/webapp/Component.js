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
            if (this._assignDlg) { this._assignDlg.open(); return; }
            var oModel = this.getModel();
            var loadList = function(path){
                return new Promise(function(resolve, reject){
                    oModel.read(path, {
                        success: function(data) {
                            resolve(data.results || []);
                        },
                        error: reject
                    });
                });
            };

            // Load trainings only - user ID entered manually (SYUNAME from USR21)
            // SAP Expert Team: No Users entity - use standard SAP tables via PFCG
            loadList('/Trainings').then(function(trainings){
                trainings = trainings || [];

                var dlgModel = new JSONModel({
                    trainings: trainings,
                    selectedTrainingId: trainings[0] && trainings[0].Id || '',
                    userId: '',  // Direct SYUNAME input
                    userName: '',  // Optional display name
                    userEmail: '',  // Optional email
                    dueDate: null,
                    submitting: false,
                    error: ''
                });

                var trainingSelect = new sap.m.Select({
                    width: '100%',
                    items: {
                        path: '/trainings',
                        template: new sap.ui.core.ListItem({ key: '{Id}', text: '{Title}' })
                    },
                    selectedKey: '{/selectedTrainingId}'
                });
                
                // Direct userId input (SYUNAME format) - SAP Expert Team
                var userIdInput = new sap.m.Input({
                    width: '100%',
                    placeholder: 'Enter SAP Username (SYUNAME)',
                    value: '{/userId}',
                    required: true,
                    maxLength: 12,
                    description: 'Uppercase alphanumeric, max 12 chars'
                });
                var userNameInput = new sap.m.Input({
                    width: '100%',
                    placeholder: 'Full Name (optional)',
                    value: '{/userName}'
                });
                var userEmailInput = new sap.m.Input({
                    width: '100%',
                    placeholder: 'Email (optional)',
                    value: '{/userEmail}',
                    type: 'Email'
                });
                var datePicker = new sap.m.DatePicker({
                    width: '100%',
                    valueFormat: 'yyyy-MM-dd',
                    displayFormat: 'long',
                    value: '{/dueDate}'
                });

                var form = new sap.m.VBox({
                    width: '100%',
                    items: [
                        new sap.m.Label({ text: 'Training', required: true }),
                        trainingSelect,
                        new sap.m.Label({ text: 'User ID (SYUNAME)', required: true }),
                        userIdInput,
                        new sap.m.Label({ text: 'User Name' }),
                        userNameInput,
                        new sap.m.Label({ text: 'User Email' }),
                        userEmailInput,
                        new sap.m.Label({ text: 'Due Date' }),
                        datePicker,
                        new sap.m.Text({ text: '{/error}', visible: '{= !!${/error} }', design: 'Negative' })
                    ]
                });

                var onSubmit = function(){
                    var data = dlgModel.getData();
                    var tr = (data.trainings || []).find(function(t){ return t.Id === data.selectedTrainingId; });
                    
                    // Validate inputs - SAP Expert Team
                    if (!tr) { 
                        dlgModel.setProperty('/error', 'Please select a training'); 
                        return; 
                    }
                    if (!data.userId || data.userId.trim() === '') {
                        dlgModel.setProperty('/error', 'User ID (SYUNAME) is required');
                        return;
                    }
                    // Validate SYUNAME format
                    var userIdUpper = data.userId.toUpperCase();
                    if (!/^[A-Z0-9]{1,12}$/.test(userIdUpper)) {
                        dlgModel.setProperty('/error', 'Invalid User ID format. Must be uppercase alphanumeric, max 12 chars');
                        return;
                    }
                    
                    var dueIso = null;
                    try{
                        if (data.dueDate) {
                            dueIso = new Date(data.dueDate + 'T00:00:00').toISOString();
                        }
                    }catch(e){ /* ignore */ }
                    
                    var payload = {
                        TrainingId: tr.Id,
                        Title: tr.Title,
                        Role: tr.Role,
                        SapModule: tr.SapModule,
                        Url: tr.Url,
                        DueDate: dueIso,
                        Status: 'Assigned',
                        UserId: userIdUpper,
                        UserName: data.userName || '',
                        UserEmail: data.userEmail || ''
                    };
                    dlgModel.setProperty('/submitting', true);

                    // OData V2 create
                    oModel.create('/TrainingAssignments', payload, {
                        success: function() {
                            that.navigateToTraining();
                            that._assignDlg.close();
                            dlgModel.setProperty('/submitting', false);
                            MessageToast.show('Training assigned successfully');
                        },
                        error: function(err) {
                            dlgModel.setProperty('/submitting', false);
                            var msg = (err && err.message) || 'Create failed';
                            dlgModel.setProperty('/error', msg);
                        }
                    });
                };

                that._assignDlg = new Dialog({
                    title: 'Assign Training',
                    contentWidth: '480px',
                    contentHeight: 'auto',
                    content: [form],
                    buttons: [
                        new Button({ text: 'Cancel', press: function(){ that._assignDlg.close(); } }),
                        new Button({ text: 'Assign', type: 'Emphasized',
                            enabled: '{= !${/submitting} }',
                            press: onSubmit
                        })
                    ]
                });
                that._assignDlg.setModel(dlgModel);
                that._assignDlg.open();
            }).catch(function(err){
                MessageToast.show('Failed to load data for assignment');
            });        },

        destroy: function() {
            if (this._assignDlg) {
                this._assignDlg.destroy();
                this._assignDlg = null;
            }
            UIComponent.prototype.destroy.apply(this, arguments);        }
    });
});

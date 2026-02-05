sap.ui.define([
    "sap/fe/core/AppComponent",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/TextArea",
    "sap/m/Bar",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "z/sap/courses/services/UserContext"
], function (AppComponent, Button, Dialog, List, StandardListItem, TextArea, Bar, JSONModel, Log, UserContext) {
    "use strict";

    return AppComponent.extend("z.sap.courses.Component", {
        metadata: { manifest: "json" },

        init: function () {
            AppComponent.prototype.init.apply(this, arguments);
            var that = this;
            
            // Initialize UserContext service (S/4 authorization adapter)
            this._userContext = new UserContext();
            
            sap.ui.getCore().attachInit(function(){
                that._diagnosticsInit();
                that._fetchRole();
                that._initAI();
                that._startupHealthCheck();
                that._ensureInitialRoute();
            });
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

        _ensureInitialRoute: function(){
            try{
                var r = this.getRouter();
                if (r && r.initialize) { r.initialize(); }
                setTimeout(function(){
                    try{
                        if (!this._routeStarted && r && r.navTo){
                            Log.info('Fallback initial navigation to TrainingsList');
                            r.navTo('TrainingsList');
                        }
                    }catch(_){/*noop*/}
                }.bind(this), 2000);
            }catch(_){/*noop*/}
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
            
            // Production: Use S/4 UserContext service for PFCG role-based authorization
            // NOTE: This is for UX purposes only - backend enforces actual authorization
            this._userContext.getCurrentRole()
                .then(function(role){
                    that._role = role;
                    that._applyRoleUI();
                })
                .catch(function(error){ 
                    Log.error('Failed to fetch role from S/4 UserContext: ' + error);
                    // Default to read-only user role
                    that._role = 'User'; 
                    that._applyRoleUI(); 
                });
        },

        _applyRoleUI: function(){
            var that = this;
            // hide Create on TrainingAssignments LR for non-managers
            var tryHide = function(){
                var comp = sap.ui.getCore().byId('TrainingAssignmentsList');
                var view = comp && comp.getRootControl && comp.getRootControl();
                var toolbars = view && view.findAggregatedObjects(true, function(o){ return o && o.getMetadata && o.getMetadata().getName() === 'sap.m.OverflowToolbar'; });
                if (toolbars && toolbars.length){
                    toolbars.forEach(function(tb){
                        var items = tb.getContent && tb.getContent();
                        (items || []).forEach(function(it){
                            if (it.getText && it.getText() === 'Create' && that._role === 'User'){
                                it.setVisible(false);
                            }
                        });
                    });
                    return true;
                }
                return false;
            };
            var attempts = 0;
            var timer = setInterval(function(){
                attempts++;
                if (tryHide() || attempts > 10){ clearInterval(timer); }
            }, 500);
        },

        _initAI: function(){
            var that = this;
            this._ai = null;
            this._aiBtn = new Button({
                icon: "sap-icon://ai",
                type: "Emphasized",
                tooltip: "AI Assistant",
                press: function(){ that._openAI(); }
            });
            this._aiBtn.addStyleClass("aiFab");
            this._aiBtn.placeAt(sap.ui.getCore().getStaticAreaRef());

            // Header extension provides Training Assignments and Assign; no floating training button
        },

        _startupHealthCheck: function(){
            var that = this;
            var ok = true;
            
            // Determine service path based on environment
            var isS4Hana = window.location.hostname !== 'localhost' && 
                          window.location.hostname !== '127.0.0.1';
            var metadataPath = isS4Hana ? 
                '/sap/opu/odata/sap/Z_COURSES_MAIN_SRV/$metadata' : 
                '/service/SAPLearningService/$metadata';
            var dataPath = isS4Hana ? 
                '/sap/opu/odata/sap/Z_COURSES_MAIN_SRV/TrainingsSet?$top=1' : 
                '/service/SAPLearningService/Trainings?$top=1';
            
            // Check OData service availability
            var checks = [
                fetch(metadataPath).then(function(r){ ok = ok && r.ok; }).catch(function(){ ok=false; }),
                fetch(dataPath).then(function(r){ ok = ok && r.ok; }).catch(function(){ ok=false; })
            ];
            Promise.all(checks).then(function(){
                if (!ok){
                    try{
                        var serviceType = isS4Hana ? 'S/4 ABAP OData service' : 'CAP service';
                        var dlg = new Dialog({ 
                            title: 'Startup Issue', 
                            content: [ new sap.m.Text({ 
                                text: serviceType + ' not reachable. Please check system configuration.' 
                            }) ], 
                            buttons: [ new Button({ text: 'Close', press: function(){ dlg.close(); } }) ] 
                        });
                        dlg.open();
                    }catch(_){/*noop*/}
                }
            });
        },

        _buildAIDialog: function(){
            var that = this;
            var oList = new List({
                items: {
                    path: '/chat/messages',
                    template: new StandardListItem({ title: '{role}', description: '{content}' })
                }
            });
            var oInput = new TextArea({ rows: 3, width: '100%', placeholder: 'Ask the assistant...' });
            this._ai = new Dialog({
                title: 'AI Assistant',
                resizable: true,
                draggable: true,
                contentWidth: '520px',
                contentHeight: '70vh',
                content: [oList, oInput],
                buttons: [
                    new Button({ text: 'Close', press: function(){ that._ai.close(); } }),
                    new Button({ text: 'Send', type: 'Emphasized', press: function(){
                        var s = oInput.getValue();
                        if (!s) { return; }
                        oInput.setValue('');
                        that._pushMsg('user', s);
                        that._callAI(s);
                    }})
                ]
            });
            this._ai.addStyleClass('aiDialog');
            this._ai.setModel(new JSONModel({ chat: { messages: [] }}));
            this._ai.attachAfterOpen(function(){ /* CSS handles placement */ });
        },

        _openAI: function(){
            if(!this._ai){ this._buildAIDialog(); }
            this._ai.open();
        },

        _pushMsg: function(role, content){
            var m = this._ai.getModel();
            var a = m.getProperty('/chat/messages');
            a.push({ role: role, content: content });
            m.updateBindings(true);
        },

        _callAI: async function(prompt){
            var that = this;
            // Preferred: use xs-app.json /api route via destination with xsuaa + CSRF
            try{
                var sModulePrefix = this.getManifestEntry && this.getManifestEntry('/sap.app/id');
                if (!sModulePrefix){ var m = this.getManifestEntry && this.getManifestEntry('sap.app'); sModulePrefix = m && m.id || ''; }
                var apiUrl = sModulePrefix + '/api/chat/completions?api-version=2024-06-01';
                var token = await this._fetchCsrfToken(apiUrl);
                var res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-Token': token || '',
                        'Content-Type': 'application/json',
                        'AI-Resource-Group': 'default'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: 'You are a helpful assistant.' },
                            { role: 'user', content: prompt }
                        ]
                    })
                });
                if (!res.ok) throw new Error('API call failed');
                var data = await res.json();
                var text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
                that._pushMsg('assistant', text || '(No content returned)');
                return;
            }catch(e){ /* fall back to existing /ai path */ }

            // Fallback: use /ai destination path (Azure/OpenAI style)
            var body = JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] });
            fetch('/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body })
            .then(function(r){ if(!r.ok) throw r; return r.json(); })
            .then(function(data){
                var text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
                that._pushMsg('assistant', text || '(No content returned)');
            })
            .catch(function(){
                fetch('/ai/chat/completions?api-version=2024-06-01', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body })
                .then(function(r){ return r.json(); })
                .then(function(data){
                    var text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
                    that._pushMsg('assistant', text || '(No content returned)');
                })
                .catch(function(){ that._pushMsg('assistant', 'AI call failed'); });
            });
        },

        _fetchCsrfToken: async function(url){
            try{
                var r = await fetch(url, { method: 'GET', headers: { 'X-CSRF-Token': 'Fetch' }, credentials: 'same-origin' });
                return r.headers && (r.headers.get('x-csrf-token') || r.headers.get('X-CSRF-Token')) || '';
            }catch(_){ return ''; }
        },

        // Navigate then trigger Create on TrainingAssignments LR (manager only)
        openTrainingAssignmentsAndCreate: function(){
            var that = this;
            var r = this.getRouter();
            if (r && r.navTo) r.navTo('TrainingAssignmentsList');
            var tries = 0;
            var timer = setInterval(function(){
                tries++;
                var comp = sap.ui.getCore().byId('TrainingAssignmentsList');
                var view = comp && comp.getRootControl && comp.getRootControl();
                var tbars = view && view.findAggregatedObjects(true, function(o){ return o && o.getMetadata && o.getMetadata().getName() === 'sap.m.OverflowToolbar'; });
                var fired = false;
                if (tbars && tbars.length){
                    tbars.forEach(function(tb){
                        var items = tb.getContent && tb.getContent();
                        var createBtn = (items || []).find(function(it){ return it.getText && it.getText() === 'Create'; });
                        if (createBtn && that._role === 'Manager'){ createBtn.firePress(); fired = true; }
                    });
                }
                if (fired || tries > 10){ clearInterval(timer); }
            }, 500);
        },

        // optional: navigate to TrainingAssignments LR
        navigateToTraining: function(){
            var r = this.getRouter();
            if (r && r.navTo) r.navTo('TrainingAssignmentsList');
        },

        // Guided Assign Training dialog (Manager/Admin)
        openAssignDialog: function(){
            var that = this;
            if (this._assignDlg) { this._assignDlg.open(); return; }
            var oModel = this.getModel();
            var loadList = function(path){
                return new Promise(function(resolve, reject){
                    try{
                        var b = oModel.bindList(path);
                        b.requestContexts(0, Infinity).then(function(ctxs){
                            resolve(ctxs.map(function(c){ return c.getObject(); }));
                        }).catch(reject);
                    }catch(e){ reject(e); }
                });
            };

            Promise.all([
                loadList('/Trainings'),
                loadList('/Users')
            ]).then(function(results){
                var trainings = results[0] || [];
                var users = results[1] || [];

                var dlgModel = new JSONModel({
                    trainings: trainings,
                    users: users,
                    selectedTrainingId: trainings[0] && trainings[0].ID || '',
                    selectedUserId: users[0] && users[0].ID || '',
                    dueDate: null,
                    submitting: false,
                    error: ''
                });

                var trainingSelect = new sap.m.Select({
                    width: '100%',
                    items: {
                        path: '/trainings',
                        template: new sap.ui.core.ListItem({ key: '{ID}', text: '{title}' })
                    },
                    selectedKey: '{/selectedTrainingId}'
                });
                var userSelect = new sap.m.Select({
                    width: '100%',
                    items: {
                        path: '/users',
                        template: new sap.ui.core.ListItem({ key: '{ID}', text: '{name}' })
                    },
                    selectedKey: '{/selectedUserId}'
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
                        new sap.m.Label({ text: 'Training' }),
                        trainingSelect,
                        new sap.m.Label({ text: 'User' }),
                        userSelect,
                        new sap.m.Label({ text: 'Due Date' }),
                        datePicker,
                        new sap.m.Text({ text: '{/error}', visible: '{= !!${/error} }', design: 'Negative' })
                    ]
                });

                var onSubmit = function(){
                    var data = dlgModel.getData();
                    var tr = (data.trainings || []).find(function(t){ return t.ID === data.selectedTrainingId; });
                    var usr = (data.users || []).find(function(u){ return u.ID === data.selectedUserId; });
                    if (!tr || !usr) { dlgModel.setProperty('/error', 'Please select training and user'); return; }
                    var dueIso = null;
                    try{
                        if (data.dueDate) {
                            // interpret yyyy-MM-dd as local date at 00:00
                            dueIso = new Date(data.dueDate + 'T00:00:00').toISOString();
                        }
                    }catch(e){ /* ignore */ }
                    var payload = {
                        title: tr.title,
                        role: tr.role,
                        module: tr.module,
                        url: tr.url,
                        dueDate: dueIso,
                        status: 'Assigned',
                        userId: usr.ID
                    };
                    dlgModel.setProperty('/submitting', true);

                    // OData V4 create via list binding
                    var lb = oModel.bindList('/TrainingAssignments');
                    var ctx = lb.create(payload);
                    ctx.created().then(function(){
                        that.navigateToTraining();
                        that._assignDlg.close();
                        dlgModel.setProperty('/submitting', false);
                    }).catch(function(err){
                        dlgModel.setProperty('/submitting', false);
                        dlgModel.setProperty('/error', (err && err.message) || 'Create failed');
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
                sap.m.MessageToast.show('Failed to load data for assignment');
            });
        }
    });
});
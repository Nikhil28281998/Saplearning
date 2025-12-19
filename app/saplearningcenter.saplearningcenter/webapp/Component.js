sap.ui.define([
    "sap/fe/core/AppComponent",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/TextArea",
    "sap/m/Bar",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log"
], function (AppComponent, Button, Dialog, List, StandardListItem, TextArea, Bar, JSONModel, Log) {
    "use strict";

    return AppComponent.extend("saplearningcenter.saplearningcenter.Component", {
        metadata: { manifest: "json" },

        init: function () {
            AppComponent.prototype.init.apply(this, arguments);
            var that = this;
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
                            Log.info('Fallback initial navigation to Entity1List');
                            r.navTo('Entity1List');
                        }
                    }catch(_){/*noop*/}
                }.bind(this), 2000);
            }catch(_){/*noop*/}
        },

        _fetchRole: function(){
            var that = this;
            // URL override: ?saplc-role=Admin|Manager|User (works in hash or query)
            try{
                var href = window.location && window.location.href || '';
                var hash = window.location && window.location.hash || '';
                var m = href.match(/[?&]saplc-role=([^&]+)/) || hash.match(/[?&]saplc-role=([^&]+)/);
                if (m && m[1]){
                    var v = decodeURIComponent(m[1]);
                    if (/^(Admin|Manager|User)$/i.test(v)){
                        var norm = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
                        that._role = norm;
                        try{ localStorage.setItem('saplc-role', norm); }catch(_){}
                        that._applyRoleUI();
                        return;
                    }
                }
            }catch(_){ /* ignore */ }
            // Local preview override via localStorage
            try{
                var ls = localStorage.getItem('saplc-role');
                if (ls) { that._role = ls; that._applyRoleUI(); return; }
            }catch(_){ /* ignore */ }
                        // OData functions require parentheses even with no params
                        fetch('/service/SaplearningcenterService/getCurrentRole()')
                            .then(function(r){ return r.json(); })
                            .then(function(data){
                                    var val = (data && (data.value || data)) || 'Admin';
                                    that._role = typeof val === 'string' ? val : 'Admin';
                                    that._applyRoleUI();
                            })
                            .catch(function(){ that._role = 'Admin'; that._applyRoleUI(); });
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
            var checks = [
                fetch('/service/SaplearningcenterService/$metadata').then(function(r){ ok = ok && r.ok; }).catch(function(){ ok=false; }),
                fetch('/service/SaplearningcenterService/Entity1?$top=1').then(function(r){ ok = ok && r.ok; }).catch(function(){ ok=false; })
            ];
            Promise.all(checks).then(function(){
                if (!ok){
                    try{
                        var dlg = new Dialog({ title: 'Startup Issue', content: [ new sap.m.Text({ text: 'Service not reachable. Please check destinations or handlers.' }) ], buttons: [ new Button({ text: 'Close', press: function(){ dlg.close(); } }) ] });
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

        _callAI: function(prompt){
            var that = this;
            var body = JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] });
            // Try destination base '/ai' first; if it fails, fall back to explicit relative path
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
                loadList('/Entity1'),
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
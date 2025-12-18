sap.ui.define([
    "sap/fe/core/AppComponent",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/TextArea",
    "sap/m/Bar",
    "sap/ui/model/json/JSONModel"
], function (AppComponent, Button, Dialog, List, StandardListItem, TextArea, Bar, JSONModel) {
    "use strict";

    return AppComponent.extend("saplearningcenter.saplearningcenter.Component", {
        metadata: { manifest: "json" },

        init: function () {
            AppComponent.prototype.init.apply(this, arguments);
            var that = this;
            sap.ui.getCore().attachInit(function(){
                that._fetchRole();
                that._initAI();
            });
        },

        _fetchRole: function(){
            var that = this;
            fetch('/service/SaplearningcenterService/getCurrentRole')
              .then(function(r){ return r.text ? r.text() : r.json(); })
              .then(function(role){
                  that._role = (typeof role === 'string') ? role : (role && role.value) || 'Manager';
                  that._applyRoleUI();
              })
              .catch(function(){ that._role = 'Manager'; that._applyRoleUI(); });
        },

        _applyRoleUI: function(){
            var that = this;
            // hide Create on TrainingAssignments LR for non-managers
            var tryHide = function(){
                var comp = sap.ui.getCore().byId('TrainingAssignmentsList');
                var view = comp && comp.getRootControl && comp.getRootControl();
                var toolbars = view && view.findAggregatedObjects(true, function(o){ return o.getMetadata && o.getMetadata().getName() === 'sap.m.OverflowToolbar'; });
                if (toolbars && toolbars.length){
                    toolbars.forEach(function(tb){
                        var items = tb.getContent && tb.getContent();
                        (items || []).forEach(function(it){
                            if (it.getText && it.getText() === 'Create' && that._role !== 'Manager'){
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
                if (tryHide() || attempts > 20){ clearInterval(timer); }
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
                var tbars = view && view.findAggregatedObjects(true, function(o){ return o.getMetadata && o.getMetadata().getName() === 'sap.m.OverflowToolbar'; });
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
        }
                    var text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
                    that._pushMsg('assistant', text || '(No content returned)');
                })
                .catch(function(){ that._pushMsg('assistant', 'AI call failed'); });
            });
        },

        // optional: navigate to TrainingAssignments LR
        navigateToTraining: function(){
            var r = this.getRouter();
            if (r && r.navTo) r.navTo('TrainingAssignmentsList');
        }
    });
});
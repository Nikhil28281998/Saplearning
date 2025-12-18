sap.ui.define(
    [
        'sap/fe/core/PageController',
        'sap/m/Dialog',
        'sap/m/Button',
        'sap/m/Bar',
        'sap/m/Title',
        'sap/m/List',
        'sap/m/StandardListItem',
        'sap/m/TextArea'
    ],
    function(PageController, Dialog, Button, Bar, Title, List, StandardListItem, TextArea) {
        'use strict';

        return PageController.extend('saplearningcenter.saplearningcenter.ext.main.Main', {
            onInit: function(){
                this._oAI = null;
            },

            onOpenAI: function(){
                if (!this._oAI){
                    var oList = new List({
                        items: {
                            path: '/chat/messages',
                            template: new StandardListItem({ title: '{role}', description: '{content}' })
                        }
                    });
                    var oInput = new TextArea({ rows: 3, width: '100%', placeholder: 'Ask the assistant...' });
                    this._oAI = new Dialog({
                        title: 'AI Assistant',
                        contentWidth: '28rem',
                        contentHeight: '70vh',
                        resizable: true,
                        draggable: true,
                        content: [oList, oInput],
                        beginButton: new Button({ text: 'Send', type: 'Emphasized', press: function(){
                            var s = oInput.getValue();
                            oInput.setValue('');
                            this._pushMsg('user', s);
                            this._callAI(s);
                        }.bind(this) }),
                        endButton: new Button({ text: 'Close', press: function(){ this._oAI.close(); }.bind(this) }),
                        customHeader: new Bar({ contentMiddle: [ new Title({ text: 'AI Assistant' }) ] })
                    });
                    this._oAI.setModel(new sap.ui.model.json.JSONModel({ chat: { messages: [] }}));
                    this.getView().addDependent(this._oAI);
                }
                this._oAI.open();
            },

            _pushMsg: function(role, content){
                var m = this._oAI.getModel();
                var a = m.getProperty('/chat/messages');
                a.push({ role: role, content: content });
                m.updateBindings(true);
            },

            _callAI: function(prompt){
                var that = this;
                fetch('/ai/chat/completions?api-version=2024-06-01', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
                }).then(function(r){ return r.json(); })
                .then(function(data){
                    var text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
                    that._pushMsg('assistant', text || '(No content returned)');
                }).catch(function(){ that._pushMsg('assistant', 'AI call failed'); });
            }
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf saplearningcenter.saplearningcenter.ext.main.Main
             */
            //  onInit: function () {
            //      PageController.prototype.onInit.apply(this, arguments); // needs to be called to properly initialize the page controller
            //  },

            /**
             * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
             * (NOT before the first rendering! onInit() is used for that one!).
             * @memberOf saplearningcenter.saplearningcenter.ext.main.Main
             */
            //  onBeforeRendering: function() {
            //
            //  },

            /**
             * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
             * This hook is the same one that SAPUI5 controls get after being rendered.
             * @memberOf saplearningcenter.saplearningcenter.ext.main.Main
             */
            //  onAfterRendering: function() {
            //
            //  },

            /**
             * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
             * @memberOf saplearningcenter.saplearningcenter.ext.main.Main
             */
            //  onExit: function() {
            //
            //  }
        });
    }
);

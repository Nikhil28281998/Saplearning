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
                this._aiSize = { w: 480, h: 70 }; // px, vh
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
                        resizable: true,
                        draggable: true,
                        contentWidth: this._aiSize.w + 'px',
                        contentHeight: this._aiSize.h + 'vh',
                        content: [oList, oInput],
                        buttons: [
                            new Button({ text: 'Close',   press: function(){ this._oAI.close(); }.bind(this) }),
                            new Button({ text: 'Send', type: 'Emphasized', press: function(){
                                var s = oInput.getValue();
                                oInput.setValue('');
                                this._pushMsg('user', s);
                                this._callAI(s);
                            }.bind(this) })
                        ]
                    });
                    this._oAI.setModel(new sap.ui.model.json.JSONModel({ chat: { messages: [] }}));
                    this.getView().addDependent(this._oAI);
                }
                this._oAI.attachAfterOpen(function(){
                    var r = this._oAI.getDomRef();
                    if (r){
                        r.style.position = 'fixed';
                        r.style.right = '24px';
                        r.style.bottom = '24px';
                    }
                }.bind(this));
                this._oAI.open();
            },

            _resizeAI: function(dw, dh){
                this._aiSize.w = Math.max(320, Math.min(960, this._aiSize.w + dw));
                this._aiSize.h = Math.max(30,  Math.min(90,  this._aiSize.h + dh));
                this._oAI.setContentWidth(this._aiSize.w + 'px');
                this._oAI.setContentHeight(this._aiSize.h + 'vh');
            },

            _pushMsg: function(role, content){
                var m = this._oAI.getModel();
                var a = m.getProperty('/chat/messages');
                a.push({ role: role, content: content });
                m.updateBindings(true);
            },

            _callAI: function(prompt){
                var that = this;
                // Ensure destination is used; backend maps '/ai' to 'ai-destination'.
                // If your destination requires a base path, configure it in ui5.yaml; keep client call relative here.
                // Call destination base only. Destination has Relative Path '/chat/completions?api-version=2024-06-01'.
                fetch('/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // Adjust 'model' to your destination's deployment name if required
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: prompt }]
                    })
                }).then(function(r){ return r.json(); })
                .then(function(data){
                    var text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
                    that._pushMsg('assistant', text || '(No content returned)');
                }).catch(function(e){ that._pushMsg('assistant', 'AI call failed'); });
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

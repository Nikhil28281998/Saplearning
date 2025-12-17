sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/Dialog",
  "sap/m/Bar",
  "sap/m/Button",
  "sap/m/Title",
  "sap/m/List",
  "sap/m/StandardListItem",
  "sap/m/TextArea",
  "ulhn/app/util/api"
], function (Controller, Dialog, Bar, Button, Title, List, StandardListItem, TextArea, api) {
  "use strict";

  return Controller.extend("ulhn.app.controller.App", {
    onInit: function () {
      this._oChatDialog = null;
      this._initMeta();
    },

    onNavSearch: function () {
      this.getOwnerComponent().getRouter().navTo("search");
    },

    onNavTraining: function () {
      this.getOwnerComponent().getRouter().navTo("training");
    },

    onNavDashboard: function(){
      this.getOwnerComponent().getRouter().navTo("dashboard");
    },

    onOpenChat: function () {
      if (!this._oChatDialog) {
        var oList = new List({
          items: {
            path: "/chat/messages",
            template: new StandardListItem({
              title: "{role}",
              description: "{content}"
            })
          }
        });

        var oInput = new TextArea({
          value: "",
          rows: 3,
          width: "100%",
          placeholder: "Ask the assistant..."
        });

        this._chatFullscreen = false;
        this._oChatDialog = new Dialog({
          title: "AI Assistant",
          contentWidth: "30rem",
          contentHeight: "70vh",
          draggable: true,
          resizable: true,
          content: [oList, oInput],
          beginButton: new Button({
            text: "Send",
            type: "Emphasized",
            press: function () {
              var sText = oInput.getValue();
              oInput.setValue("");
              this._pushMessage("user", sText);
              this._callAI(sText);
            }.bind(this)
          }),
          endButton: new Button({ text: "Close", press: function(){ this._oChatDialog.close(); }.bind(this) }),
          customHeader: new Bar({
            contentMiddle: [ new Title({ text: "AI Assistant" }) ],
            contentRight: [ new Button({ text: "Full Screen", press: this._toggleChatFullscreen.bind(this) }) ]
          })
        });

        // Simple in-memory model
        var oModel = new sap.ui.model.json.JSONModel({ chat: { messages: [] } });
        this._oChatDialog.setModel(oModel);
        this.getView().addDependent(this._oChatDialog);
      }
      this._oChatDialog.open();
    },

    _pushMessage: function (role, content) {
      var oModel = this._oChatDialog.getModel();
      var a = oModel.getProperty("/chat/messages");
      a.push({ role: role, content: content });
      oModel.updateBindings(true);
    },

    _callAI: function (prompt) {
      var that = this;
      api.postJson("/ai/chat/completions?api-version=2024-06-01", { messages: [ { role: "user", content: prompt } ] })
        .then(function(data){
          var text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
          if (!text) { text = "(No content returned)"; }
          that._pushMessage("assistant", text);
        })
        .catch(function(err){
          that._pushMessage("assistant", "AI call failed. Please try again.");
          try { console.error("AI error", err); } catch(e){}
        });
    },

    _toggleChatFullscreen: function(){
      this._chatFullscreen = !this._chatFullscreen;
      if (this._chatFullscreen){
        this._oChatDialog.setContentWidth("85vw");
        this._oChatDialog.setContentHeight("85vh");
      } else {
        this._oChatDialog.setContentWidth("30rem");
        this._oChatDialog.setContentHeight("70vh");
      }
    },

    _initMeta: function(){
      // Load roles/modules/processes for header filters
      var oMeta = new sap.ui.model.json.JSONModel({ roles: [], modules: [], processes: [] });
      this.getView().setModel(oMeta, "meta");

      Promise.all([
        fetch("/api/filters/roles").then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; }),
        fetch("/api/filters/modules").then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; }),
        fetch("/api/filters/processes").then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; })
      ]).then(function(res){
        var roles = Array.isArray(res[0]) ? res[0] : ["FI","MM","SD"]; // stub fallback
        var modules = Array.isArray(res[1]) ? res[1] : ["FI","MM","SD"]; // stub
        var processes = Array.isArray(res[2]) ? res[2] : ["Order-to-Cash","Procure-to-Pay"]; // stub
        oMeta.setData({ roles: roles, modules: modules, processes: processes });
      });
    }
  });
});

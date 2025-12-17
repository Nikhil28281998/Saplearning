sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("ulhn.app.controller.Training", {
    onInit: function(){
      this.getView().setModel(new JSONModel({ assignments: [] }));
      var oTable = this.byId("trainingTable");
      oTable.setModel(this.getView().getModel());
      oTable.bindItems({ path: "/assignments", template: oTable.getItems()[0].clone() });
      this.onRefresh();
    },

    onRefresh: function(){
      var that = this;
      fetch("/api/training")
        .then(function(r){ return r.ok ? r.json() : Promise.reject(r); })
        .then(function(data){
          var arr = Array.isArray(data) ? data : (Array.isArray(data.assignments) ? data.assignments : []);
          that.getView().getModel().setProperty("/assignments", arr);
        })
        .catch(function(){
          // stub fallback
          var a = [
            { id: 101, title: "Intro to FI", role: "FI", module: "FI", url: "https://learning.sap.com", dueDate: new Date(), status: "Assigned", completedAt: null },
            { id: 102, title: "MM Basics", role: "MM", module: "MM", url: "https://learning.sap.com", dueDate: new Date(), status: "Assigned", completedAt: null }
          ];
          that.getView().getModel().setProperty("/assignments", a);
        });
    },

    onMarkCompleted: function(oEvent){
      var ctx = oEvent.getSource().getBindingContext();
      var id = ctx.getProperty("id");
      var that = this;
      fetch("/api/training/" + encodeURIComponent(id) + "/complete", { method: "POST" })
        .then(function(r){ if (!r.ok) throw r; return r.json().catch(function(){ return {}; }); })
        .then(function(){
          that._setCompleted(ctx);
          MessageToast.show("Marked as completed");
        })
        .catch(function(){
          // fallback: local update
          that._setCompleted(ctx);
          MessageToast.show("Marked as completed (local)");
        });
    },

    _setCompleted: function(ctx){
      var m = this.getView().getModel();
      ctx.getModel().setProperty(ctx.getPath() + "/status", "Completed");
      ctx.getModel().setProperty(ctx.getPath() + "/completedAt", new Date());
      m.updateBindings(true);
    }
  });
});

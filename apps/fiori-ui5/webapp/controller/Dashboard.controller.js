sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function(Controller, JSONModel){
  "use strict";

  return Controller.extend("ulhn.app.controller.Dashboard", {
    onInit: function(){
      // Ensure meta model is available for tiles
      var oMeta = this.getView().getModel("meta");
      if (!oMeta) {
        this.getView().setModel(new JSONModel({ modules: [] }), "meta");
      }
    },

    onModuleTilePress: function(oEvent){
      var sModule = oEvent.getSource().getBindingContext("meta").getObject();
      // Store preset filters at component level, then navigate to search
      var oPreset = new JSONModel({ role: "", module: sModule });
      this.getOwnerComponent().setModel(oPreset, "preset");
      this.getOwnerComponent().getRouter().navTo("search");
    },

    onGoSearch: function(){
      this.getOwnerComponent().getRouter().navTo("search");
    },

    onGoTraining: function(){
      this.getOwnerComponent().getRouter().navTo("training");
    }
  });
});

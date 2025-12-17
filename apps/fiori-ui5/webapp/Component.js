sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("ulhn.app.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      // Device model placeholder
      var oDeviceModel = new JSONModel({});
      this.setModel(oDeviceModel, "device");

      // init router
      this.getRouter().initialize();
    }
  });
});

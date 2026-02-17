sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/base/Log"
], function (Controller, Log) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.App", {
        onInit: function () {
            this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

            // FLP Shell full-width override:
            // When running inside Fiori Launchpad, the FLP Shell controls the app container width.
            // sap.ushell.Container.getRenderer() allows setting appWidthLimited=false on the FLP Shell.
            // This is the official SAP API for making FLP apps full-screen width.
            try {
                if (sap.ushell && sap.ushell.Container) {
                    var oRenderer = sap.ushell.Container.getRenderer("fiori2");
                    if (oRenderer) {
                        oRenderer.setHeaderVisibility(true, false);
                        // setAppWidthLimited(false) tells FLP Shell to use 100% width
                        if (oRenderer.setAppWidthLimited) {
                            oRenderer.setAppWidthLimited(false);
                            Log.info("FLP Shell: appWidthLimited set to false — full screen width");
                        }
                    }
                }
            } catch (e) {
                // Not running in FLP — standalone mode, no action needed
                Log.info("Not running inside FLP Shell: " + e.message);
            }
        }
    });
});

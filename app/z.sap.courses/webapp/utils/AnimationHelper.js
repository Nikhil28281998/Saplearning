/**
 * AnimationHelper — shared animation utilities.
 * Extracted from TrainingsList / TrainingAssignmentsList controllers (M-1 audit fix).
 */
sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Animated count-up for KPI numbers. Smoothly increments from 0 to target.
         *
         * @param {sap.ui.model.json.JSONModel} oModel - The JSON model holding the numeric properties
         * @param {string[]} aPaths - Array of model property paths to animate
         * @param {number} [iDuration=600] - Animation duration in milliseconds
         */
        animateNumbers: function (oModel, aPaths, iDuration) {
            iDuration = iDuration || 600;
            var aTargets = aPaths.map(function (sPath) {
                return { path: sPath, target: oModel.getProperty(sPath) || 0 };
            });
            // Set all to 0
            aTargets.forEach(function (t) { oModel.setProperty(t.path, 0); });
            var iStart = performance.now();
            var fnStep = function (ts) {
                var fProgress = Math.min((ts - iStart) / iDuration, 1);
                // Ease-out cubic
                var fEase = 1 - Math.pow(1 - fProgress, 3);
                aTargets.forEach(function (t) {
                    oModel.setProperty(t.path, Math.round(t.target * fEase));
                });
                if (fProgress < 1) {
                    requestAnimationFrame(fnStep);
                }
            };
            requestAnimationFrame(fnStep);
        }
    };
});

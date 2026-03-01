/**
 * Shared formatters for SAP Learning Courses application.
 * D-2 FIX: Extracted from TrainingsList.controller.js and TrainingAssignmentsList.controller.js
 * to eliminate code duplication.
 */
sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Return SAP icon based on the SAP module of the course.
         * Maps 23 real module values from the training catalog.
         */
        getModuleIcon: function (sSapModule) {
            if (!sSapModule) { return "sap-icon://course-book"; }
            var s = sSapModule.toLowerCase();
            if (s.indexOf("fi-gl") >= 0 || s.indexOf("general ledger") >= 0) { return "sap-icon://waiver"; }
            if (s.indexOf("fi-ap") >= 0 || s.indexOf("accounts payable") >= 0) { return "sap-icon://money-bills"; }
            if (s.indexOf("fi-ar") >= 0 || s.indexOf("accounts receivable") >= 0) { return "sap-icon://wallet"; }
            if (s.indexOf("fi-aa") >= 0 || s.indexOf("asset accounting") >= 0) { return "sap-icon://building"; }
            if (s.indexOf("fi-lc") >= 0 || s.indexOf("consolidation") >= 0) { return "sap-icon://combine"; }
            if (s.indexOf("mm-pur") >= 0 || s.indexOf("procurement") >= 0) { return "sap-icon://cart"; }
            if (s.indexOf("mm-im") >= 0 || s.indexOf("inventory management") >= 0) { return "sap-icon://inventory"; }
            if (s.indexOf("sd-bil") >= 0 || (s.indexOf("billing") >= 0 && s.indexOf("sd") >= 0)) { return "sap-icon://sales-document"; }
            if (s.indexOf("sd-ret") >= 0 || (s.indexOf("returns") >= 0 && s.indexOf("sd") >= 0)) { return "sap-icon://undo"; }
            if (s.indexOf("sd") >= 0 || s.indexOf("sales") >= 0) { return "sap-icon://sales-order"; }
            if (s.indexOf("pp") >= 0 || s.indexOf("production") >= 0) { return "sap-icon://factory"; }
            if (s.indexOf("wm") >= 0 || s.indexOf("warehouse") >= 0) { return "sap-icon://inventory"; }
            if (s.indexOf("le-shp") >= 0 || s.indexOf("shipping") >= 0 || s.indexOf("logistics") >= 0) { return "sap-icon://shipping-status"; }
            if (s.indexOf("tr") >= 0 || s.indexOf("treasury") >= 0) { return "sap-icon://loan"; }
            if (s.indexOf("co-pa") >= 0 || s.indexOf("profitability") >= 0) { return "sap-icon://bar-chart"; }
            if (s.indexOf("co") >= 0 || s.indexOf("controlling") >= 0) { return "sap-icon://monitor-payments"; }
            if (s.indexOf("hcm") >= 0 || s.indexOf("human capital") >= 0) { return "sap-icon://group"; }
            if (s.indexOf("qm") >= 0 || s.indexOf("quality") >= 0) { return "sap-icon://quality-issue"; }
            if (s.indexOf("basis") >= 0 || s.indexOf("configuration") >= 0) { return "sap-icon://settings"; }
            if (s.indexOf("mdg") >= 0 || s.indexOf("master data") >= 0) { return "sap-icon://database"; }
            if (s.indexOf("pm") >= 0 || s.indexOf("plant maintenance") >= 0 || s.indexOf("maintenance") >= 0) { return "sap-icon://wrench"; }
            if (s.indexOf("cross") >= 0) { return "sap-icon://connected"; }
            if (s.indexOf("general") >= 0) { return "sap-icon://world"; }
            return "sap-icon://course-book";
        },

        /**
         * Return icon color based on SAP module category.
         */
        getModuleIconColor: function (sSapModule) {
            if (!sSapModule) { return "#0854a0"; }
            var s = sSapModule.toLowerCase();
            if (s.indexOf("fi") >= 0 || s.indexOf("finance") >= 0) { return "#0854a0"; }
            if (s.indexOf("sd") >= 0 || s.indexOf("sales") >= 0 || s.indexOf("billing") >= 0) { return "#e76500"; }
            if (s.indexOf("mm") >= 0 || s.indexOf("procurement") >= 0 || s.indexOf("inventory") >= 0) { return "#945200"; }
            if (s.indexOf("pp") >= 0 || s.indexOf("production") >= 0) { return "#1a6b3c"; }
            if (s.indexOf("wm") >= 0 || s.indexOf("warehouse") >= 0 || s.indexOf("le") >= 0 || s.indexOf("shipping") >= 0 || s.indexOf("logistics") >= 0) { return "#354a5f"; }
            if (s.indexOf("tr") >= 0 || s.indexOf("treasury") >= 0) { return "#6c32a9"; }
            if (s.indexOf("co") >= 0 || s.indexOf("controlling") >= 0) { return "#d32a2a"; }
            if (s.indexOf("hcm") >= 0 || s.indexOf("human") >= 0) { return "#107e3e"; }
            if (s.indexOf("qm") >= 0 || s.indexOf("quality") >= 0) { return "#0a6ed1"; }
            if (s.indexOf("basis") >= 0 || s.indexOf("config") >= 0) { return "#556b82"; }
            if (s.indexOf("mdg") >= 0 || s.indexOf("master data") >= 0) { return "#0070f2"; }
            if (s.indexOf("pm") >= 0 || s.indexOf("maintenance") >= 0) { return "#945200"; }
            if (s.indexOf("cross") >= 0) { return "#354a5f"; }
            if (s.indexOf("general") >= 0) { return "#556b82"; }
            return "#0854a0";
        },

        /**
         * Format priority state for ObjectStatus
         */
        formatPriorityState: function (sPriority) {
            switch (sPriority) {
                case "High": return "Error";
                case "Medium": return "Warning";
                case "Low": return "Success";
                default: return "None";
            }
        },

        /**
         * Format priority icon
         */
        formatPriorityIcon: function (sPriority) {
            switch (sPriority) {
                case "High": return "sap-icon://warning";
                case "Medium": return "sap-icon://hint";
                case "Low": return "sap-icon://sys-enter-2";
                default: return "";
            }
        },

        /**
         * 3-2 FIX: Shared "Completed: X | Remaining: Y" formatter
         */
        formatCompletedRemaining: function (sPattern, iCompleted, iTotal) {
            if (sPattern && typeof iCompleted === "number" && typeof iTotal === "number") {
                return sPattern.replace("{0}", iCompleted).replace("{1}", (iTotal - iCompleted));
            }
            return "";
        }
    };
});

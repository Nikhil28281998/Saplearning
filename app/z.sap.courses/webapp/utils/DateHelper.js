sap.ui.define([], function () {
    "use strict";

    /**
     * D-9: Shared date utility — centralizes overdue check logic.
     * Replaces 4+ inline copies across controllers.
     */
    return {
        /**
         * Check if an assignment is overdue (DueDate < today AND not Completed).
         * @param {Date|string} dDueDate - The due date
         * @param {string} sStatus - The assignment status
         * @returns {boolean} true if overdue
         */
        isOverdue: function (dDueDate, sStatus) {
            if (sStatus === "Completed") { return false; }
            if (!dDueDate) { return false; }
            var d = (dDueDate instanceof Date) ? dDueDate : new Date(dDueDate);
            if (isNaN(d.getTime())) { return false; }
            var sToday = new Date().toISOString().substring(0, 10);
            var sDue = d.toISOString().substring(0, 10);
            return sDue < sToday;
        },

        /**
         * Format a date for display.
         * @param {Date|string} dDate - The date to format
         * @returns {string} Formatted date string or "Not set"
         */
        formatDate: function (dDate) {
            if (!dDate) { return "Not set"; }
            var d = (dDate instanceof Date) ? dDate : new Date(dDate);
            if (isNaN(d.getTime())) { return "Not set"; }
            return d.toLocaleDateString();
        }
    };
});

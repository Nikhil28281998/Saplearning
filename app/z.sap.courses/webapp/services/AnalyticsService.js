sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/base/Log"
], function (BaseObject, Filter, FilterOperator, Log) {
    "use strict";

    /**
     * AnalyticsService – lightweight OData analytics using $inlinecount + $filter.
     *
     * Instead of loading ALL assignments client-side and counting in JS,
     * sends 3 server-side filtered requests with $top=0&$inlinecount=allpages
     * so only the count is returned — no entity payloads transferred.
     */
    return BaseObject.extend("z.sap.courses.services.AnalyticsService", {

        /**
         * Get assignment status counts using 3 lightweight filtered OData calls.
         * Each request sends $top=0&$inlinecount=allpages so only __count is returned.
         *
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData V2 model
         * @param {string} sEntitySet - Entity set name (e.g. "TrainingAssignments")
         * @returns {Promise<{assigned: number, inProgress: number, completed: number, completionPercent: number}>}
         */
        getAssignmentStats: function (oModel, sEntitySet) {
            var aStatuses = [
                { key: "assigned", value: "Assigned" },
                { key: "inProgress", value: "In Progress" },
                { key: "completed", value: "Completed" }
            ];

            var aPromises = aStatuses.map(function (oStatus) {
                return new Promise(function (resolve) {
                    oModel.read("/" + sEntitySet, {
                        filters: [new Filter("Status", FilterOperator.EQ, oStatus.value)],
                        urlParameters: {
                            "$top": "0",
                            "$inlinecount": "allpages"
                        },
                        success: function (oData) {
                            var iCount = oData.__count ? parseInt(oData.__count, 10) : 0;
                            resolve({ key: oStatus.key, count: iCount });
                        },
                        error: function (err) {
                            Log.warning("[AnalyticsService] Failed to count " + oStatus.value + ": " + (err && err.message || ""));
                            resolve({ key: oStatus.key, count: 0 });
                        }
                    });
                });
            });

            return Promise.all(aPromises).then(function (aResults) {
                var oStats = {};
                aResults.forEach(function (r) { oStats[r.key] = r.count; });
                var iTotal = oStats.assigned + oStats.inProgress + oStats.completed;
                oStats.completionPercent = iTotal > 0 ? Math.round((oStats.completed / iTotal) * 100) : 0;
                return oStats;
            });
        },

        /**
         * Get training catalog stats: total count + module distribution for chart.
         * Uses $inlinecount for the total, reads entities only for module/role aggregation.
         *
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData V2 model
         * @returns {Promise<{totalTrainings: number, moduleDistribution: Array, roles: Array, modules: Array, roleModuleMap: Object}>}
         */
        getTrainingStats: function (oModel) {
            return new Promise(function (resolve, reject) {
                oModel.read("/Trainings", {
                    urlParameters: {
                        "$inlinecount": "allpages"
                    },
                    success: function (oData) {
                        var aResults = oData.results || [];
                        var iTotal = oData.__count ? parseInt(oData.__count, 10) : aResults.length;

                        // Module distribution for chart
                        var oModuleMap = {};
                        var oRoleSet = {};
                        var oModuleSet = {};
                        var oRoleModuleMap = {};
                        var oModuleRoleMap = {};

                        aResults.forEach(function (t) {
                            if (t.SapModule) {
                                oModuleMap[t.SapModule] = (oModuleMap[t.SapModule] || 0) + 1;
                                oModuleSet[t.SapModule] = true;
                                if (!oModuleRoleMap[t.SapModule]) { oModuleRoleMap[t.SapModule] = {}; }
                                if (t.Role) { oModuleRoleMap[t.SapModule][t.Role] = true; }
                            }
                            if (t.Role) {
                                oRoleSet[t.Role] = true;
                                if (!oRoleModuleMap[t.Role]) { oRoleModuleMap[t.Role] = {}; }
                                if (t.SapModule) { oRoleModuleMap[t.Role][t.SapModule] = true; }
                            }
                        });

                        var aModuleDist = Object.keys(oModuleMap).map(function (m) {
                            return { label: m, count: oModuleMap[m] };
                        }).sort(function (a, b) { return b.count - a.count; }).slice(0, 5);

                        var aRoles = [{ key: "", text: "All" }];
                        Object.keys(oRoleSet).sort().forEach(function (r) {
                            aRoles.push({ key: r, text: r });
                        });

                        var aModules = [{ key: "", text: "All" }];
                        Object.keys(oModuleSet).sort().forEach(function (m) {
                            aModules.push({ key: m, text: m });
                        });

                        resolve({
                            totalTrainings: iTotal,
                            moduleDistribution: aModuleDist,
                            roles: aRoles,
                            modules: aModules,
                            roleModuleMap: oRoleModuleMap,
                            moduleRoleMap: oModuleRoleMap
                        });
                    },
                    error: function (err) {
                        Log.error("[AnalyticsService] Failed to load trainings: " + (err && err.message || ""));
                        reject(err);
                    }
                });
            });
        }
    });
});

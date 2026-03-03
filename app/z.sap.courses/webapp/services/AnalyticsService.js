sap.ui.define([
    "sap/ui/base/Object",
    "sap/base/Log"
], function (BaseObject, Log) {
    "use strict";

    /**
     * AnalyticsService – lightweight OData analytics using $inlinecount + $filter.
     *
     * Instead of loading ALL assignments client-side and counting in JS,
     * sends 3 server-side filtered requests with $top=0&$inlinecount=allpages
     * so only the count is returned — no entity payloads transferred.
     *
     * M-3 FIX: Uses paged reads for module aggregation to handle large catalogs.
     */
    return BaseObject.extend("z.sap.courses.services.AnalyticsService", {

        /**
         * Get training catalog stats: total count + module distribution for chart.
         * M-3 FIX: Uses $select to minimize payload and paged reads for large catalogs.
         *
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData V2 model
         * @returns {Promise<{totalTrainings: number, moduleDistribution: Array, roles: Array, modules: Array, roleModuleMap: Object}>}
         */
        getTrainingStats: function (oModel) {
            return new Promise(function (resolve, reject) {
                var iPageSize = 500;
                var aAllResults = [];

                var fnLoadPage = function (iSkip) {
                    oModel.read("/Trainings", {
                        urlParameters: {
                            "$inlinecount": "allpages",
                            "$select": "Role,Topic,SapModule,Title",
                            "$top": String(iPageSize),
                            "$skip": String(iSkip)
                        },
                        success: function (oData) {
                            var aPage = oData.results || [];
                            aAllResults = aAllResults.concat(aPage);
                            var iTotal = oData.__count ? parseInt(oData.__count, 10) : aAllResults.length;

                            if (aPage.length >= iPageSize) {
                                fnLoadPage(iSkip + iPageSize);
                                return;
                            }

                            // All pages loaded — aggregate
                            var aResults = aAllResults;

                        // Module distribution for chart
                        var oModuleMap = {};
                        var oRoleSet = {};
                        var oTopicSet = {};
                        var oModuleSet = {};
                        var oRoleModuleMap = {};
                        var oTopicModuleMap = {};
                        var oModuleTopicMap = {};

                        aResults.forEach(function (t) {
                            if (t.SapModule) {
                                oModuleMap[t.SapModule] = (oModuleMap[t.SapModule] || 0) + 1;
                                oModuleSet[t.SapModule] = true;
                                if (!oModuleTopicMap[t.SapModule]) { oModuleTopicMap[t.SapModule] = {}; }
                                if (t.Topic) { oModuleTopicMap[t.SapModule][t.Topic] = true; }
                            }
                            if (t.Role) {
                                oRoleSet[t.Role] = true;
                                if (!oRoleModuleMap[t.Role]) { oRoleModuleMap[t.Role] = {}; }
                                if (t.SapModule) { oRoleModuleMap[t.Role][t.SapModule] = true; }
                            }
                            if (t.Topic) {
                                oTopicSet[t.Topic] = true;
                                if (!oTopicModuleMap[t.Topic]) { oTopicModuleMap[t.Topic] = {}; }
                                if (t.SapModule) { oTopicModuleMap[t.Topic][t.SapModule] = true; }
                            }
                        });

                        var aModuleDist = Object.keys(oModuleMap).map(function (m) {
                            return { label: m, count: oModuleMap[m] };
                        }).sort(function (a, b) { return b.count - a.count; });

                        var aRoles = [{ key: "", text: "All" }];
                        Object.keys(oRoleSet).sort().forEach(function (r) {
                            aRoles.push({ key: r, text: r });
                        });

                        var aTopics = [{ key: "", text: "All" }];
                        Object.keys(oTopicSet).sort().forEach(function (t) {
                            aTopics.push({ key: t, text: t });
                        });

                        var aModules = [{ key: "", text: "All" }];
                        Object.keys(oModuleSet).sort().forEach(function (m) {
                            aModules.push({ key: m, text: m });
                        });

                        resolve({
                            totalTrainings: iTotal,
                            moduleDistribution: aModuleDist,
                            roles: aRoles,
                            topics: aTopics,
                            modules: aModules,
                            roleModuleMap: oRoleModuleMap,
                            topicModuleMap: oTopicModuleMap,
                            moduleTopicMap: oModuleTopicMap
                        });
                        },
                        error: function (err) {
                            Log.error("[AnalyticsService] Failed to load trainings: " + (err && err.message || ""));
                            reject(err);
                        }
                    });
                };

                fnLoadPage(0);
            });
        }
    });
});

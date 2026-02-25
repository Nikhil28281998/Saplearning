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
     */
    return BaseObject.extend("z.sap.courses.services.AnalyticsService", {

        // PG-5: getAssignmentStats removed — was dead code (no controller called it).
        // Assignment counts are now computed inline in each controller's _loadAnalytics.

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
                        "$inlinecount": "allpages",
                        "$select": "Topic,SapModule,Title"
                    },
                    success: function (oData) {
                        var aResults = oData.results || [];
                        var iTotal = oData.__count ? parseInt(oData.__count, 10) : aResults.length;

                        // Module distribution for chart
                        var oModuleMap = {};
                        var oTopicSet = {};
                        var oModuleSet = {};
                        var oTopicModuleMap = {};
                        var oModuleTopicMap = {};

                        aResults.forEach(function (t) {
                            if (t.SapModule) {
                                oModuleMap[t.SapModule] = (oModuleMap[t.SapModule] || 0) + 1;
                                oModuleSet[t.SapModule] = true;
                                if (!oModuleTopicMap[t.SapModule]) { oModuleTopicMap[t.SapModule] = {}; }
                                if (t.Topic) { oModuleTopicMap[t.SapModule][t.Topic] = true; }
                            }
                            if (t.Topic) {
                                oTopicSet[t.Topic] = true;
                                if (!oTopicModuleMap[t.Topic]) { oTopicModuleMap[t.Topic] = {}; }
                                if (t.SapModule) { oTopicModuleMap[t.Topic][t.SapModule] = true; }
                            }
                        });

                        var aModuleDist = Object.keys(oModuleMap).map(function (m) {
                            return { label: m, count: oModuleMap[m] };
                        }).sort(function (a, b) { return b.count - a.count; }).slice(0, 5);

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
                            topics: aTopics,
                            modules: aModules,
                            topicModuleMap: oTopicModuleMap,
                            moduleTopicMap: oModuleTopicMap
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

/*global QUnit, sinon*/
sap.ui.define([
	"z/sap/courses/services/AnalyticsService",
	"sap/ui/model/odata/v2/ODataModel"
], function (AnalyticsService, ODataModel) {
	"use strict";

	/**
	 * Creates a stub ODataModel whose read() calls resolve with the given fn.
	 * @param {Function} fnReadImpl - function(sPath, mParams) that calls mParams.success/error
	 * @returns {object} Sinon stub object with read method
	 */
	function createModelStub(fnReadImpl) {
		return { read: sinon.stub().callsFake(fnReadImpl) };
	}

	// =====================================================================
	QUnit.module("AnalyticsService – getAssignmentStats", {
		beforeEach: function () {
			this.oSvc = new AnalyticsService();
		},
		afterEach: function () {
			this.oSvc.destroy();
		}
	});
	// =====================================================================

	QUnit.test("Should return counts for each status", function (assert) {
		var oModel = createModelStub(function (sPath, mParams) {
			var sFilter = mParams.filters[0].sValue || mParams.filters[0].oValue1;
			var iCount = sFilter === "Assigned" ? 5 : sFilter === "In Progress" ? 3 : 2;
			mParams.success({ __count: String(iCount), results: [] });
		});

		return this.oSvc.getAssignmentStats(oModel, "TrainingAssignments").then(function (oStats) {
			assert.strictEqual(oStats.assigned, 5, "Assigned count");
			assert.strictEqual(oStats.inProgress, 3, "In Progress count");
			assert.strictEqual(oStats.completed, 2, "Completed count");
			assert.strictEqual(oStats.completionPercent, 20, "Completion % = 2/10 = 20");
		});
	});

	QUnit.test("Should use $top=0 and $inlinecount=allpages", function (assert) {
		var oModel = createModelStub(function (sPath, mParams) {
			assert.strictEqual(mParams.urlParameters["$top"], "0", "$top=0 sent");
			assert.strictEqual(mParams.urlParameters["$inlinecount"], "allpages", "$inlinecount sent");
			mParams.success({ __count: "0", results: [] });
		});

		return this.oSvc.getAssignmentStats(oModel, "TrainingAssignments");
	});

	QUnit.test("Should make exactly 3 OData calls", function (assert) {
		var oModel = createModelStub(function (_sPath, mParams) {
			mParams.success({ __count: "1", results: [] });
		});

		return this.oSvc.getAssignmentStats(oModel, "TrainingAssignments").then(function () {
			assert.strictEqual(oModel.read.callCount, 3, "3 filtered calls");
		});
	});

	QUnit.test("Should calculate 0% when all counts are zero", function (assert) {
		var oModel = createModelStub(function (_sPath, mParams) {
			mParams.success({ __count: "0", results: [] });
		});

		return this.oSvc.getAssignmentStats(oModel, "TrainingAssignments").then(function (oStats) {
			assert.strictEqual(oStats.completionPercent, 0, "0% on empty dataset");
		});
	});

	// =====================================================================
	QUnit.module("AnalyticsService – Error Handling", {
		beforeEach: function () {
			this.oSvc = new AnalyticsService();
		},
		afterEach: function () {
			this.oSvc.destroy();
		}
	});
	// =====================================================================

	QUnit.test("getAssignmentStats should degrade to 0 on OData error", function (assert) {
		var oModel = createModelStub(function (_sPath, mParams) {
			mParams.error({ message: "Service unavailable" });
		});

		return this.oSvc.getAssignmentStats(oModel, "TrainingAssignments").then(function (oStats) {
			assert.strictEqual(oStats.assigned, 0, "Assigned falls to 0");
			assert.strictEqual(oStats.inProgress, 0, "In Progress falls to 0");
			assert.strictEqual(oStats.completed, 0, "Completed falls to 0");
			assert.strictEqual(oStats.completionPercent, 0, "Percent falls to 0");
		});
	});

	QUnit.test("getTrainingStats should reject on OData error", function (assert) {
		var oModel = createModelStub(function (_sPath, mParams) {
			mParams.error({ message: "Network failure" });
		});

		return this.oSvc.getTrainingStats(oModel).then(
			function () { assert.notOk(true, "Should not resolve"); },
			function (err) { assert.ok(err, "Rejected with error"); }
		);
	});

	// =====================================================================
	QUnit.module("AnalyticsService – getTrainingStats", {
		beforeEach: function () {
			this.oSvc = new AnalyticsService();
		},
		afterEach: function () {
			this.oSvc.destroy();
		}
	});
	// =====================================================================

	QUnit.test("Should return total count and module distribution", function (assert) {
		var oModel = createModelStub(function (_sPath, mParams) {
			mParams.success({
				__count: "4",
				results: [
					{ Topic: "Development", SapModule: "ABAP" },
					{ Topic: "Development", SapModule: "ABAP" },
					{ Topic: "Basis", SapModule: "BASIS" },
					{ Topic: "Finance", SapModule: "FICO" }
				]
			});
		});

		return this.oSvc.getTrainingStats(oModel).then(function (oStats) {
			assert.strictEqual(oStats.totalTrainings, 4, "Total count from __count");
			assert.ok(oStats.moduleDistribution.length > 0, "Module distribution populated");
			assert.strictEqual(oStats.moduleDistribution[0].label, "ABAP", "Top module is ABAP (count 2)");
			assert.strictEqual(oStats.moduleDistribution[0].count, 2, "ABAP count is 2");
		});
	});

	QUnit.test("Should build topic and module dropdown lists", function (assert) {
		var oModel = createModelStub(function (_sPath, mParams) {
			mParams.success({
				__count: "2",
				results: [
					{ Topic: "Development", SapModule: "ABAP" },
					{ Topic: "Finance", SapModule: "BASIS" }
				]
			});
		});

		return this.oSvc.getTrainingStats(oModel).then(function (oStats) {
			// First item is always "All"
			assert.strictEqual(oStats.topics[0].key, "", "'All' entry first in topics");
			assert.ok(oStats.topics.length >= 3, "At least 'All' + 2 topics");
			assert.strictEqual(oStats.modules[0].key, "", "'All' entry first in modules");
		});
	});

	QUnit.test("Should build topicModuleMap for dependent filtering", function (assert) {
		var oModel = createModelStub(function (_sPath, mParams) {
			mParams.success({
				__count: "2",
				results: [
					{ Topic: "Development", SapModule: "ABAP" },
					{ Topic: "Development", SapModule: "CDS" }
				]
			});
		});

		return this.oSvc.getTrainingStats(oModel).then(function (oStats) {
			assert.ok(oStats.topicModuleMap.Development, "Development key in topicModuleMap");
			assert.ok(oStats.topicModuleMap.Development.ABAP, "ABAP mapped under Development");
			assert.ok(oStats.topicModuleMap.Development.CDS, "CDS mapped under Development");
		});
	});
});

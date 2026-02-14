/*global QUnit*/
sap.ui.define([
	"sap/ui/test/opaQunit",
	"sap/ui/test/Opa5"
], function (opaTest, Opa5) {
	"use strict";

	QUnit.module("TrainingAssignmentsList Journey");

	opaTest("Should see the TrainingAssignmentsList page", function (Given, When, Then) {
		// Arrangement - start at assignments hash
		Given.iStartMyUIComponent({
			componentName: "z.sap.courses",
			hash: "assignments",
			async: true
		});

		// Assertions
		Then.onTheTrainingAssignmentsListPage.iShouldSeeThePage();
	});

	opaTest("Should see the assignments SmartTable", function (Given, When, Then) {
		Then.onTheTrainingAssignmentsListPage.iShouldSeeTheSmartTable();
	});

	opaTest("Should see the assignments SmartFilterBar", function (Given, When, Then) {
		Then.onTheTrainingAssignmentsListPage.iShouldSeeTheSmartFilterBar();
	});

	opaTest("Should see the My Progress panel", function (Given, When, Then) {
		Then.onTheTrainingAssignmentsListPage.iShouldSeeTheProgressPanel();
	});

	opaTest("Should navigate back to catalog", function (Given, When, Then) {
		// Action
		When.onTheTrainingAssignmentsListPage.iPressBackToCatalog();

		// Assertion
		Then.onTheTrainingsListPage.iShouldSeeThePage();

		// Cleanup
		Then.iTeardownMyApp();
	});
});

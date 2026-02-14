/*global QUnit*/
sap.ui.define([
	"sap/ui/test/opaQunit",
	"sap/ui/test/Opa5"
], function (opaTest, Opa5) {
	"use strict";

	QUnit.module("TrainingsList Journey");

	opaTest("Should see the TrainingsList page on startup", function (Given, When, Then) {
		// Arrangement
		Given.iStartMyUIComponent({
			componentName: "z.sap.courses",
			async: true
		});

		// Assertions
		Then.onTheTrainingsListPage.iShouldSeeThePage();
	});

	opaTest("Should see the SmartTable", function (Given, When, Then) {
		Then.onTheTrainingsListPage.iShouldSeeTheSmartTable();
	});

	opaTest("Should see the SmartFilterBar", function (Given, When, Then) {
		Then.onTheTrainingsListPage.iShouldSeeTheSmartFilterBar();
	});

	opaTest("Should see the analytics panel", function (Given, When, Then) {
		Then.onTheTrainingsListPage.iShouldSeeTheAnalyticsPanel();
	});

	opaTest("Should see the role switcher", function (Given, When, Then) {
		Then.onTheTrainingsListPage.iShouldSeeTheRoleSwitcher();
	});

	opaTest("Should navigate to assignments when clicking 'My Assignments'", function (Given, When, Then) {
		// Action
		When.onTheTrainingsListPage.iPressTheMyAssignmentsButton();

		// Assertion
		Then.onTheTrainingAssignmentsListPage.iShouldSeeThePage();

		// Cleanup
		Then.iTeardownMyApp();
	});
});

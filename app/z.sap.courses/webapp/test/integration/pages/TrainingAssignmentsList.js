sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"sap/ui/test/actions/Press"
], function (Opa5, PropertyStrictEquals, Press) {
	"use strict";

	Opa5.createPageObjects({
		onTheTrainingAssignmentsListPage: {
			viewName: "TrainingAssignmentsList",

			actions: {
				iPressBackToCatalog: function () {
					return this.waitFor({
						id: "backToCatalogBtn",
						actions: new Press(),
						errorMessage: "'Back to Catalog' button not found"
					});
				},

				iPressTheGoButton: function () {
					return this.waitFor({
						controlType: "sap.m.Button",
						matchers: new PropertyStrictEquals({ name: "text", value: "Go" }),
						actions: new Press(),
						errorMessage: "Go button not found on SmartFilterBar"
					});
				}
			},

			assertions: {
				iShouldSeeThePage: function () {
					return this.waitFor({
						id: "assignmentsListPage",
						success: function () {
							Opa5.assert.ok(true, "TrainingAssignmentsList page is displayed");
						},
						errorMessage: "TrainingAssignmentsList page not found"
					});
				},

				iShouldSeeTheSmartTable: function () {
					return this.waitFor({
						id: "assignSmartTable",
						success: function () {
							Opa5.assert.ok(true, "Assignments SmartTable is rendered");
						},
						errorMessage: "Assignments SmartTable not found"
					});
				},

				iShouldSeeTheSmartFilterBar: function () {
					return this.waitFor({
						id: "assignSmartFilterBar",
						success: function () {
							Opa5.assert.ok(true, "Assignments SmartFilterBar is rendered");
						},
						errorMessage: "Assignments SmartFilterBar not found"
					});
				},

				iShouldSeeTheProgressPanel: function () {
					return this.waitFor({
						id: "myProgressPanel",
						success: function () {
							Opa5.assert.ok(true, "My Progress panel is rendered");
						},
						errorMessage: "My Progress panel not found"
					});
				}
			}
		}
	});
});

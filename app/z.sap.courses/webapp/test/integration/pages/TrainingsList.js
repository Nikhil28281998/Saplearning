sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"sap/ui/test/actions/Press"
], function (Opa5, AggregationFilled, PropertyStrictEquals, Press) {
	"use strict";

	Opa5.createPageObjects({
		onTheTrainingsListPage: {
			viewName: "TrainingsList",

			actions: {
				iPressTheMyAssignmentsButton: function () {
					return this.waitFor({
						id: "myAssignmentsBtn",
						actions: new Press(),
						errorMessage: "'My Assignments' button not found"
					});
				},

				iPressTheGoButton: function () {
					return this.waitFor({
						controlType: "sap.m.Button",
						matchers: new PropertyStrictEquals({ name: "text", value: "Go" }),
						actions: new Press(),
						errorMessage: "Go button not found on SmartFilterBar"
					});
				},

				iPressRefresh: function () {
					return this.waitFor({
						id: "refreshButton",
						actions: new Press(),
						errorMessage: "Refresh button not found"
					});
				}
			},

			assertions: {
				iShouldSeeThePage: function () {
					return this.waitFor({
						id: "trainingsListPage",
						success: function () {
							Opa5.assert.ok(true, "TrainingsList page is displayed");
						},
						errorMessage: "TrainingsList page not found"
					});
				},

				iShouldSeeTheSmartTable: function () {
					return this.waitFor({
						id: "smartTable",
						success: function () {
							Opa5.assert.ok(true, "SmartTable is rendered");
						},
						errorMessage: "SmartTable not found"
					});
				},

				iShouldSeeTheSmartFilterBar: function () {
					return this.waitFor({
						id: "smartFilterBar",
						success: function () {
							Opa5.assert.ok(true, "SmartFilterBar is rendered");
						},
						errorMessage: "SmartFilterBar not found"
					});
				},

				iShouldSeeTheAnalyticsPanel: function () {
					return this.waitFor({
						id: "analyticsPanel",
						success: function () {
							Opa5.assert.ok(true, "Analytics panel is rendered");
						},
						errorMessage: "Analytics panel not found"
					});
				},

				iShouldSeeTheRoleSwitcher: function () {
					return this.waitFor({
						id: "roleSwitcher",
						success: function () {
							Opa5.assert.ok(true, "Role switcher is rendered");
						},
						errorMessage: "Role switcher not found"
					});
				}
			}
		}
	});
});

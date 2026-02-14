sap.ui.define([
	"sap/ui/test/Opa5",
	"test/integration/pages/TrainingsList",
	"test/integration/pages/TrainingAssignmentsList",
	"test/integration/TrainingsListJourney",
	"test/integration/TrainingAssignmentsListJourney"
], function (Opa5) {
	"use strict";

	Opa5.extendConfig({
		viewNamespace: "z.sap.courses.view.",
		autoWait: true,
		timeout: 30,
		asyncPolling: true
	});
});

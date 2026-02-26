using { SAPLearningService as S } from '../../srv/service.cds';

// Selection fields for FilterBar
annotate S.Trainings with @UI.SelectionFields: [ role, topic, sap_module, title ];

// List columns (hide ID, keep links clickable)
annotate S.Trainings with @UI.LineItem: [
	{ $Type: 'UI.DataFieldWithUrl', Value: title, Url: url, Label: 'Title' },
	{ $Type: 'UI.DataField',        Value: role,                    Label: 'Role' },
	{ $Type: 'UI.DataField',        Value: topic,                   Label: 'Topic' },
	{ $Type: 'UI.DataField',        Value: sap_module,              Label: 'Module' },
	{ $Type: 'UI.DataField',        Value: description,             Label: 'Description' },
	{ $Type: 'UI.DataField',        Value: lastUpdated,             Label: 'Last Updated' },
	{ $Type: 'UI.DataFieldWithUrl', Value: sapHelpLink, Url: sapHelpLink, Label: 'SAP Help' },
	// Global navigation buttons on the Trainings ListReport toolbar
	{ $Type: 'UI.DataFieldForIntentBasedNavigation', Label: 'My Assignments', SemanticObject: 'ZLearningMyTrainings', Action: 'display', RequiresContext: false },
	{ $Type: 'UI.DataFieldForIntentBasedNavigation', Label: 'User Management', SemanticObject: 'ZLearningUsers', Action: 'display', RequiresContext: false }
];

// Enable Delete on Trainings (Admin only - enforced by backend)
annotate S.Trainings with @Capabilities.DeleteRestrictions: { Deletable: true };

// Object Page: header + sections
annotate S.Trainings with @UI.HeaderInfo: {
	Title:       { $Type: 'UI.DataField', Value: title, Label: 'Training Text' },
	Description: { $Type: 'UI.DataField', Value: sap_module }
};

annotate S.Trainings with @UI.Facets: [
	{ $Type: 'UI.ReferenceFacet', Label: 'Details', Target: '@UI.FieldGroup#Main' }
];

annotate S.Trainings with @UI.FieldGroup #Main: {
	Data: [
		{ $Type: 'UI.DataField', Value: title,        Label: 'Title' },
		{ $Type: 'UI.DataField', Value: role,         Label: 'Role' },
		{ $Type: 'UI.DataField', Value: topic,        Label: 'Topic' },
		{ $Type: 'UI.DataField', Value: description,  Label: 'Description' },
		{ $Type: 'UI.DataField', Value: sap_module,   Label: 'Module' },
		{ $Type: 'UI.DataField', Value: lastUpdated,  Label: 'Last Updated' },
		{ $Type: 'UI.DataFieldWithUrl', Value: title, Url: url,         Label: 'Primary Link' },
		{ $Type: 'UI.DataFieldWithUrl', Value: sapHelpLink, Url: sapHelpLink, Label: 'SAP Help' }
	]
};

// Value help: Role (distinct), Topic (distinct) and Module (dependent on Topic)
annotate S.Trainings with {
	role @Common.ValueList: {
		$Type: 'Common.ValueListType',
		CollectionPath: 'RolesVH',
		Parameters: [
			{ $Type: 'Common.ValueListParameterOut', LocalDataProperty: role, ValueListProperty: 'role' }
		]
	};

	topic @Common.ValueList: {
		$Type: 'Common.ValueListType',
		CollectionPath: 'TopicsVH',
		Parameters: [
			{ $Type: 'Common.ValueListParameterOut', LocalDataProperty: topic, ValueListProperty: 'topic' }
		]
	};

	sap_module @Common.ValueList: {
		$Type: 'Common.ValueListType',
		CollectionPath: 'ModulesVH',
		Parameters: [
			{ $Type: 'Common.ValueListParameterIn',  LocalDataProperty: topic,      ValueListProperty: 'topic' },
			{ $Type: 'Common.ValueListParameterOut', LocalDataProperty: sap_module, ValueListProperty: 'sap_module' }
		]
	};
};

// TrainingAssignments list configuration and action
annotate S.TrainingAssignments with @UI.SelectionFields: [ role, topic, sap_module, status, dueDate ];

annotate S.TrainingAssignments with @UI.LineItem: [
		{ $Type: 'UI.DataField', Value: title,      Label: 'Title' },
		{ $Type: 'UI.DataField', Value: role,       Label: 'Role' },
		{ $Type: 'UI.DataField', Value: topic,      Label: 'Topic' },
		{ $Type: 'UI.DataField', Value: sap_module, Label: 'Module' },
		{ $Type: 'UI.DataField', Value: userId,     Label: 'User' },
		{ $Type: 'UI.DataField', Value: dueDate,    Label: 'Due Date' },
		{ $Type: 'UI.DataField', Value: status,     Label: 'Status' },
		{ $Type: 'UI.DataField', Value: completionDate, Label: 'Completed At' },
	{ $Type: 'UI.DataFieldForAction', Action: 'SAPLearningService.markCompleted', Label: 'Mark Completed',		Confirmation: { $Type: 'UI.ConfirmationDialogType', Title: 'Confirm', Text: 'Mark this assignment as completed?' } }
];
annotate S.TrainingAssignments with @UI.HeaderInfo: {
	Title:       { $Type: 'UI.DataField', Value: title },
	Description: { $Type: 'UI.DataField', Value: status }
};

annotate S.TrainingAssignments with @UI.Facets: [
	{ $Type: 'UI.ReferenceFacet', Label: 'Details', Target: '@UI.FieldGroup#Main' }
];

annotate S.TrainingAssignments with @UI.FieldGroup #Main: {
	Data: [
		{ $Type: 'UI.DataField', Value: title,      Label: 'Title' },
		{ $Type: 'UI.DataField', Value: role,       Label: 'Role' },
		{ $Type: 'UI.DataField', Value: topic,      Label: 'Topic' },
		{ $Type: 'UI.DataField', Value: sap_module, Label: 'Module' },
		{ $Type: 'UI.DataField', Value: userId,     Label: 'User' },
		{ $Type: 'UI.DataField', Value: dueDate,    Label: 'Due Date' },
		{ $Type: 'UI.DataField', Value: status,     Label: 'Status' },
		{ $Type: 'UI.DataField', Value: completionDate, Label: 'Completed At' }
	]
};

// Default view variants: ensure columns Topic, Module, Status visible and sorted
annotate S.TrainingAssignments with @UI.PresentationVariant: {
	SortOrder: [ { Property: 'status', Descending: false } ],
	RequestAtLeast: [ 'role', 'topic', 'sap_module', 'status' ],
	Visualizations: [ '@UI.LineItem' ]
};

annotate S.TrainingAssignments with @UI.SelectionVariant: {
	SelectOptions: [
		{ PropertyName: 'role' },
		{ PropertyName: 'topic' },
		{ PropertyName: 'sap_module' },
		{ PropertyName: 'status' }
	]
};

// Make 'Mark Completed' available only when status != 'Completed'
annotate S.TrainingAssignments with actions {
	markCompleted @Core.OperationAvailable: { $edmJson: { $If: [ { $Ne: [ { $Path: 'status' }, 'Completed' ] }, true, false ] } };
};

// Enable create/update; disable delete for compliance
annotate S.TrainingAssignments with @Capabilities.InsertRestrictions: { Insertable: true };
annotate S.TrainingAssignments with @Capabilities.UpdateRestrictions: { Updatable: true };
annotate S.TrainingAssignments with @Capabilities.DeleteRestrictions: { Deletable: false };

// ============================================================================
// CLEAN CORE COMPLIANCE: No custom Users entity
// User management handled via standard SAP tables (USR21, ADRP, ADR6)
// Authorization via PFCG roles (Z_COURSES_ADMIN, Z_COURSES_MANAGER, Z_COURSES_USER)
// Team: Dr. Hans Mueller (Architect), Priya Sharma (Developer), Thomas Weber (Consultant)
// ============================================================================


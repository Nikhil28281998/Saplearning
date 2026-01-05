using { SkillForgeService as S } from '../../srv/service.cds';

// Selection fields for FilterBar
annotate S.Trainings with @UI.SelectionFields: [ role, module, title ];

// List columns (hide ID, keep links clickable)
annotate S.Trainings with @UI.LineItem: [
	{ $Type: 'UI.DataFieldWithUrl', Value: title, Url: url, Label: 'Title' },
	{ $Type: 'UI.DataField',        Value: description,             Label: 'Description' },
	{ $Type: 'UI.DataField',        Value: lastUpdated,             Label: 'Last Updated' },
	{ $Type: 'UI.DataField',        Value: module,                  Label: 'Module' },
	{ $Type: 'UI.DataField',        Value: role,                    Label: 'Role' },
	{ $Type: 'UI.DataFieldWithUrl', Value: 'Open SAP Help', Url: sapHelpLink, Label: 'SAP Help' },
	// Global navigation buttons on the Trainings ListReport toolbar
	{ $Type: 'UI.DataFieldForIntentBasedNavigation', Label: 'My Assignments', SemanticObject: 'SkillForgeMyTrainings', Action: 'display', RequiresContext: false },
	{ $Type: 'UI.DataFieldForIntentBasedNavigation', Label: 'User Management', SemanticObject: 'SkillForgeUsers', Action: 'display', RequiresContext: false }
];

// Disable Delete on Trainings
annotate S.Trainings with @Capabilities.DeleteRestrictions: { Deletable: false };

// Object Page: header + sections
annotate S.Trainings with @UI.HeaderInfo: {
	Title:       { $Type: 'UI.DataField', Value: title, Label: 'Training Text' },
	Description: { $Type: 'UI.DataField', Value: module }
};

annotate S.Trainings with @UI.Facets: [
	{ $Type: 'UI.ReferenceFacet', Label: 'Details', Target: '@UI.FieldGroup#Main' }
];

annotate S.Trainings with @UI.FieldGroup #Main: {
	Data: [
		{ $Type: 'UI.DataField', Value: title,        Label: 'Title' },
		{ $Type: 'UI.DataField', Value: description,  Label: 'Description' },
		{ $Type: 'UI.DataField', Value: role,         Label: 'Role' },
		{ $Type: 'UI.DataField', Value: module,       Label: 'Module' },
		{ $Type: 'UI.DataField', Value: lastUpdated,  Label: 'Last Updated' },
		{ $Type: 'UI.DataFieldWithUrl', Value: title, Url: url,         Label: 'Primary Link' },
		{ $Type: 'UI.DataFieldWithUrl', Value: 'Open SAP Help', Url: sapHelpLink, Label: 'SAP Help' }
	]
};

// Value help: Role (distinct) and Module (dependent on Role)
annotate S.Trainings with {
	role @Common.ValueList: {
		$Type: 'Common.ValueListType',
		CollectionPath: 'RolesVH',
		Parameters: [
			{ $Type: 'Common.ValueListParameterOut', LocalDataProperty: role, ValueListProperty: 'role' }
		]
	};

	module @Common.ValueList: {
		$Type: 'Common.ValueListType',
		CollectionPath: 'ModulesVH',
		Parameters: [
			{ $Type: 'Common.ValueListParameterIn',  LocalDataProperty: role,   ValueListProperty: 'role' },
			{ $Type: 'Common.ValueListParameterOut', LocalDataProperty: module, ValueListProperty: 'module' }
		]
	};
};

// TrainingAssignments list configuration and action
annotate S.TrainingAssignments with @UI.SelectionFields: [ role, module, status, dueDate ];

annotate S.TrainingAssignments with @UI.LineItem: [
		{ $Type: 'UI.DataField', Value: title,      Label: 'Title' },
		{ $Type: 'UI.DataField', Value: role,       Label: 'Role' },
		{ $Type: 'UI.DataField', Value: module,     Label: 'Module' },
		{ $Type: 'UI.DataField', Value: userId,     Label: 'User' },
		{ $Type: 'UI.DataField', Value: dueDate,    Label: 'Due Date' },
		{ $Type: 'UI.DataField', Value: status,     Label: 'Status' },
		{ $Type: 'UI.DataField', Value: completionDate, Label: 'Completed At' },
	{ $Type: 'UI.DataFieldForAction', Action: 'SkillForgeService.markCompleted', Label: 'Mark Completed',

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
		{ $Type: 'UI.DataField', Value: module,     Label: 'Module' },
		{ $Type: 'UI.DataField', Value: userId,     Label: 'User' },
		{ $Type: 'UI.DataField', Value: dueDate,    Label: 'Due Date' },
		{ $Type: 'UI.DataField', Value: status,     Label: 'Status' },
		{ $Type: 'UI.DataField', Value: completionDate, Label: 'Completed At' },
		{ $Type: 'UI.DataFieldForAction', Action: 'SkillForgeService.markCompleted', Label: 'Mark Completed',
		  Confirmation: { $Type: 'UI.ConfirmationDialogType', Title: 'Confirm', Text: 'Mark this assignment as completed?' } }
	]
};

// Default view variants: ensure columns Role, Module, Status visible and sorted
annotate S.TrainingAssignments with @UI.PresentationVariant: {
	SortOrder: [ { Property: 'status', Descending: false } ],
	RequestAtLeast: [ 'role', 'module', 'status' ],
	Visualizations: [ { $Type: 'UI.VisualizationSet', Visualizations: [ { $AnnotationPath: '@UI.LineItem' } ] } ]
};

annotate S.TrainingAssignments with @UI.SelectionVariant: {
	SelectOptions: [
		{ PropertyName: 'role' },
		{ PropertyName: 'module' },
		{ PropertyName: 'status' }
	]
};

// Make 'Mark Completed' available only when status != 'Completed'
annotate S.TrainingAssignments with actions {
	markCompleted @Core.OperationAvailable: { $If: [ { $Ne: [ { $Path: 'status' }, 'Completed' ] }, true, false ] };
};

// Enable create/update; disable delete for compliance
annotate S.TrainingAssignments with @Capabilities.InsertRestrictions: { Insertable: true };
annotate S.TrainingAssignments with @Capabilities.UpdateRestrictions: { Updatable: true };
annotate S.TrainingAssignments with @Capabilities.DeleteRestrictions: { Deletable: false };

// Users management (Admin)
annotate S.Users with @UI.SelectionFields: [ name, email, managerId ];
annotate S.Users with @UI.LineItem: [
	{ $Type: 'UI.DataField', Value: ID,        Label: 'ID' },
	{ $Type: 'UI.DataField', Value: name,      Label: 'Name' },
	{ $Type: 'UI.DataField', Value: email,     Label: 'Email' },
	{ $Type: 'UI.DataField', Value: managerId, Label: 'Manager ID' }
];
annotate S.Users with @Capabilities.InsertRestrictions: { Insertable: true };
annotate S.Users with @Capabilities.UpdateRestrictions: { Updatable: true };
annotate S.Users with @Capabilities.DeleteRestrictions: { Deletable: true };

// Value help for assigning users in TrainingAssignments
annotate S.TrainingAssignments with {
	userId @Common.ValueList: {
		$Type: 'Common.ValueListType',
		CollectionPath: 'Users',
		Parameters: [
			{ $Type: 'Common.ValueListParameterOut', LocalDataProperty: userId, ValueListProperty: 'ID' },
			{ $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
		]
	}
};


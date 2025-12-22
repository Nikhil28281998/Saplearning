using { SaplearningcenterService as S } from '../../srv/service.cds';

// Selection fields for FilterBar
annotate S.Trainings with @UI.SelectionFields: [ role, module, title ];

// List columns (hide ID, keep links clickable)
annotate S.Trainings with @UI.LineItem: [
	{ $Type: 'UI.DataFieldWithUrl', Value: title, Url: url, Label: '{{titleLabel}}' },
	{ $Type: 'UI.DataField',        Value: description,             Label: '{{descriptionLabel}}' },
	{ $Type: 'UI.DataField',        Value: lastUpdated,             Label: '{{lastUpdatedLabel}}' },
	{ $Type: 'UI.DataField',        Value: module,                  Label: '{{moduleLabel}}' },
	{ $Type: 'UI.DataField',        Value: role,                    Label: '{{roleLabel}}' },
	{ $Type: 'UI.DataFieldWithUrl', Value: 'Open SAP Help', Url: sapHelpLink, Label: '{{sapHelpLabel}}' }
];

// Disable Delete on Trainings
annotate S.Trainings with @Capabilities.DeleteRestrictions: { Deletable: false };

// Object Page: header + sections
annotate S.Trainings with @UI.HeaderInfo: {
	Title:       { $Type: 'UI.DataField', Value: title, Label: '{{trainingText}}' },
	Description: { $Type: 'UI.DataField', Value: module }
};

annotate S.Trainings with @UI.Facets: [
	{ $Type: 'UI.ReferenceFacet', Label: '{{detailsFacetLabel}}', Target: '@UI.FieldGroup#Main' }
];

annotate S.Trainings with @UI.FieldGroup #Main: {
	Data: [
		{ $Type: 'UI.DataField', Value: title,        Label: '{{titleLabel}}' },
		{ $Type: 'UI.DataField', Value: description,  Label: '{{descriptionLabel}}' },
		{ $Type: 'UI.DataField', Value: role,         Label: '{{roleLabel}}' },
		{ $Type: 'UI.DataField', Value: module,       Label: '{{moduleLabel}}' },
		{ $Type: 'UI.DataField', Value: lastUpdated,  Label: '{{lastUpdatedLabel}}' },
		{ $Type: 'UI.DataFieldWithUrl', Value: title, Url: url,         Label: '{{primaryLinkLabel}}' },
		{ $Type: 'UI.DataFieldWithUrl', Value: 'Open SAP Help', Url: sapHelpLink, Label: '{{sapHelpLabel}}' }
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
		{ $Type: 'UI.DataField', Value: title,      Label: '{{titleLabel}}' },
		{ $Type: 'UI.DataField', Value: role,       Label: '{{roleLabel}}' },
		{ $Type: 'UI.DataField', Value: module,     Label: '{{moduleLabel}}' },
		{ $Type: 'UI.DataField', Value: userId,     Label: '{{userLabel}}' },
		{ $Type: 'UI.DataField', Value: dueDate,    Label: '{{dueDateLabel}}' },
		{ $Type: 'UI.DataField', Value: status,     Label: '{{trainingStatus}}' },
		{ $Type: 'UI.DataField', Value: completionDate, Label: '{{completionDateLabel}}' },
		{ $Type: 'UI.DataFieldForAction', Action: 'SaplearningcenterService.markCompleted', Label: '{{markCompleted}}',
			Confirmation: { $Type: 'UI.ConfirmationDialogType', Title: '{{confirmTitle}}', Text: '{{confirmText}}' } }
];

annotate S.TrainingAssignments with @UI.HeaderInfo: {
	Title:       { $Type: 'UI.DataField', Value: title },
	Description: { $Type: 'UI.DataField', Value: status }
};

annotate S.TrainingAssignments with @UI.Facets: [
	{ $Type: 'UI.ReferenceFacet', Label: '{{detailsFacetLabel}}', Target: '@UI.FieldGroup#Main' }
];

annotate S.TrainingAssignments with @UI.FieldGroup #Main: {
	Data: [
		{ $Type: 'UI.DataField', Value: title,      Label: '{{titleLabel}}' },
		{ $Type: 'UI.DataField', Value: role,       Label: '{{roleLabel}}' },
		{ $Type: 'UI.DataField', Value: module,     Label: '{{moduleLabel}}' },
		{ $Type: 'UI.DataField', Value: userId,     Label: '{{userLabel}}' },
		{ $Type: 'UI.DataField', Value: dueDate,    Label: '{{dueDateLabel}}' },
		{ $Type: 'UI.DataField', Value: status,     Label: '{{trainingStatus}}' },
		{ $Type: 'UI.DataField', Value: completionDate, Label: '{{completionDateLabel}}' },
		{ $Type: 'UI.DataFieldForAction', Action: 'SaplearningcenterService.markCompleted', Label: '{{markCompleted}}',
		  Confirmation: { $Type: 'UI.ConfirmationDialogType', Title: '{{confirmTitle}}', Text: '{{confirmText}}' } }
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
	{ $Type: 'UI.DataField', Value: ID,        Label: '{{idLabel}}' },
	{ $Type: 'UI.DataField', Value: name,      Label: '{{nameLabel}}' },
	{ $Type: 'UI.DataField', Value: email,     Label: '{{emailLabel}}' },
	{ $Type: 'UI.DataField', Value: managerId, Label: '{{managerIdLabel}}' }
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


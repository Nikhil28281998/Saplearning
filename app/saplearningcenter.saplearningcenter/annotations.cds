using { SaplearningcenterService as S } from '../../srv/service.cds';

// Selection fields for FilterBar
annotate S.Entity1 with @UI.SelectionFields: [ role, module, title ];

// List columns (hide ID, keep links clickable)
annotate S.Entity1 with @UI.LineItem: [
	{ $Type: 'UI.DataFieldWithUrl', Value: title, Url: url, Label: 'Title' },
	{ $Type: 'UI.DataField',        Value: description,             Label: 'Description' },
	{ $Type: 'UI.DataField',        Value: lastUpdated,             Label: 'Last Updated' },
	{ $Type: 'UI.DataField',        Value: module,                  Label: 'Module' },
	{ $Type: 'UI.DataField',        Value: role,                    Label: 'Role' },
	{ $Type: 'UI.DataFieldWithUrl', Value: 'Open SAP Help', Url: sapHelpLink, Label: 'SAP Help' }
];

// Disable Delete on Entity1
annotate S.Entity1 with @Capabilities.DeleteRestrictions: { Deletable: false };

// Object Page: header + sections
annotate S.Entity1 with @UI.HeaderInfo: {
	Title:       { $Type: 'UI.DataField', Value: title },
	Description: { $Type: 'UI.DataField', Value: module }
};

annotate S.Entity1 with @UI.Facets: [
	{ $Type: 'UI.ReferenceFacet', Label: 'Details', Target: '@UI.FieldGroup#Main' }
];

annotate S.Entity1 with @UI.FieldGroup #Main: {
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
annotate S.Entity1 with {
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
	{ $Type: 'UI.DataField', Value: dueDate,    Label: 'Due Date' },
	{ $Type: 'UI.DataField', Value: status,     Label: 'Status' },
	{ $Type: 'UI.DataField', Value: completedAt, Label: 'Completed At' },
	{ $Type: 'UI.DataFieldForAction', Action: 'SaplearningcenterService.markCompleted', Label: 'Mark Completed' }
];

using SaplearningcenterService as service from '../../srv/service';
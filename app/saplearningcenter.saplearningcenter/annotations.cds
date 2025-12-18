using Common from '@sap-ux/vocabularies/Common';
using UI from '@sap-ux/vocabularies/UI';

using { SaplearningcenterService as S } from '../../srv/service';

annotate S.Entity1 with @UI: {
	SelectionFields: [ role, module, title ],
	LineItem: [
		{ $Type: 'UI.DataFieldWithUrl', Value: title, Url: url, Label: 'title' },
		{ $Type: 'UI.DataField', Value: description, Label: 'description' },
		{ $Type: 'UI.DataField', Value: ID, Label: 'ID' },
		{ $Type: 'UI.DataField', Value: lastUpdated, Label: 'lastUpdated' },
		{ $Type: 'UI.DataField', Value: module, Label: 'module' },
		{ $Type: 'UI.DataField', Value: role, Label: 'role' },
		{ $Type: 'UI.DataFieldWithUrl', Value: 'Open', Url: sapHelpLink, Label: 'sapHelpLink' }
	]
};

using SaplearningcenterService as service from '../../srv/service';
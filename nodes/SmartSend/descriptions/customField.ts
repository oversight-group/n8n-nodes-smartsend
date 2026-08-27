import type { INodeProperties } from 'n8n-workflow';
import { phoneNumberField } from './shared';

const ALL_OPS = ['set', 'setMany'];

/**
 * The field-identification properties, reused inside the setMany
 * fixedCollection where displayOptions on resource/operation do not apply.
 */
const fieldRowValues: INodeProperties[] = [
	{
		displayName: 'Field Source',
		name: 'fieldSource',
		type: 'options',
		default: 'list',
		description:
			'How to identify the custom field. Definitions are sourced from a list because SmartSend exposes them per list.',
		options: [
			{ name: 'By Name', value: 'name' },
			{ name: 'From List', value: 'list' },
		],
	},
	{
		displayName: 'List Name or ID',
		name: 'fieldListId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getLists' },
		default: '',
		description:
			'List to source field definitions from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { fieldSource: ['list'] } },
	},
	{
		displayName: 'Field Name or ID',
		name: 'fieldId',
		type: 'options',
		// Both forms are listed so the dropdown re-fetches when the List selection
		// changes in either shape: the bare name matches the top-level parameter in
		// "Set Value", the "&" form the sibling inside the "Set Multiple Values"
		// collection. Whichever does not apply simply resolves to nothing.
		typeOptions: {
			loadOptionsMethod: 'getCustomFields',
			loadOptionsDependsOn: ['fieldListId', '&fieldListId'],
		},
		default: '',
		description:
			'Custom field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { fieldSource: ['list'] } },
	},
	{
		displayName: 'Field Name',
		name: 'fieldName',
		type: 'string',
		default: '',
		description: 'Name of the custom field to set',
		displayOptions: { show: { fieldSource: ['name'] } },
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		description: 'Value to set. Leave empty to clear the field.',
	},
];

export const customFieldDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'set',
		displayOptions: { show: { resource: ['customField'] } },
		options: [
			{
				name: 'Set Multiple Values',
				value: 'setMany',
				action: 'Set multiple custom field values',
				description: 'Set several custom fields on a conversation in one call',
			},
			{
				name: 'Set Value',
				value: 'set',
				action: 'Set a custom field value',
				description: 'Set one custom field on a conversation',
			},
		],
	},

	phoneNumberField('customField', ALL_OPS),

	...fieldRowValues.map((property) => ({
		...property,
		displayOptions: {
			show: {
				...(property.displayOptions?.show ?? {}),
				resource: ['customField'],
				operation: ['set'],
			},
		},
	})),

	{
		displayName: 'Fields',
		name: 'fieldsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Field',
		default: {},
		description: 'Custom field updates to apply',
		displayOptions: { show: { resource: ['customField'], operation: ['setMany'] } },
		options: [{ displayName: 'Field', name: 'field', values: fieldRowValues }],
	},
];

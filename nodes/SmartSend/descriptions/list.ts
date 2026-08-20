import type { INodeProperties } from 'n8n-workflow';
import { actorFields, additionalFields, phoneNumberField } from './shared';

const ALL_OPS = ['addToConversation', 'clearFromConversation', 'addRecipient', 'removeRecipient'];

export const listDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'addToConversation',
		displayOptions: { show: { resource: ['list'] } },
		options: [
			{
				name: 'Add Recipient',
				value: 'addRecipient',
				action: 'Add a recipient to a list',
				description: 'Add a phone number to a distribution list',
			},
			{
				name: 'Add to Conversation',
				value: 'addToConversation',
				action: 'Add a list to a conversation',
				description: 'Attach a list to the conversation',
			},
			{
				name: 'Clear All From Conversation',
				value: 'clearFromConversation',
				action: 'Clear all lists from a conversation',
				description: 'Remove every list from the conversation',
			},
			{
				name: 'Remove Recipient',
				value: 'removeRecipient',
				action: 'Remove a recipient from a list',
				description: 'Remove a phone number from a distribution list',
			},
		],
	},

	{
		displayName: 'List Name or ID',
		name: 'listId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getLists' },
		required: true,
		default: '',
		description:
			'Distribution list. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['list'],
				operation: ['addToConversation', 'addRecipient', 'removeRecipient'],
			},
		},
	},

	phoneNumberField('list', ALL_OPS),

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Display name to store with the recipient',
		displayOptions: { show: { resource: ['list'], operation: ['addRecipient'] } },
	},

	{
		displayName: 'Custom Fields',
		name: 'customFieldsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Custom Field',
		default: {},
		description: 'Custom field values to store with the recipient',
		displayOptions: { show: { resource: ['list'], operation: ['addRecipient'] } },
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the custom field',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to store',
					},
				],
			},
		],
	},

	additionalFields('list', ['addToConversation', 'clearFromConversation'], actorFields),
];

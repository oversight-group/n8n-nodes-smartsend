import type { INodeProperties } from 'n8n-workflow';
import { actorFields, additionalFields, phoneNumberField } from './shared';

const ALL_OPS = ['add', 'remove', 'clear'];

export const tagDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'add',
		displayOptions: { show: { resource: ['tag'] } },
		options: [
			{
				name: 'Add to Conversation',
				value: 'add',
				action: 'Add a tag to a conversation',
				description: 'Attach a tag to the conversation',
			},
			{
				name: 'Clear All From Conversation',
				value: 'clear',
				action: 'Clear all tags from a conversation',
				description: 'Remove every tag from the conversation',
			},
			{
				name: 'Remove From Conversation',
				value: 'remove',
				action: 'Remove a tag from a conversation',
				description: 'Detach a specific tag from the conversation',
			},
		],
	},

	phoneNumberField('tag', ALL_OPS),

	{
		displayName: 'Tag Name or ID',
		name: 'tagId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getTags' },
		required: true,
		default: '',
		description:
			'Tag to apply. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['tag'], operation: ['add', 'remove'] } },
	},

	additionalFields('tag', ALL_OPS, actorFields),
];

import type { INodeProperties } from 'n8n-workflow';
import { actorFields, additionalFields, phoneNumberField } from './shared';

const ALL_OPS = ['resolve', 'updateDisplayName', 'assignUser', 'createNote', 'setFlag'];

export const conversationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'resolve',
		displayOptions: { show: { resource: ['conversation'] } },
		options: [
			{
				name: 'Assign User',
				value: 'assignUser',
				action: 'Assign a user to a conversation',
				description: 'Assign an agent to the conversation',
			},
			{
				name: 'Create Note',
				value: 'createNote',
				action: 'Create a note on a conversation',
				description: 'Attach an internal note to the conversation',
			},
			{
				name: 'Resolve or Create',
				value: 'resolve',
				action: 'Resolve or create a conversation',
				description: 'Look up the conversation by phone number, creating it when absent',
			},
			{
				name: 'Set Flag',
				value: 'setFlag',
				action: 'Set the colored flag on a conversation',
				description: 'Set or clear the coloured flag',
			},
			{
				name: 'Update Display Name',
				value: 'updateDisplayName',
				action: 'Update the display name on a conversation',
				description: 'Override the contact display name',
			},
		],
	},

	phoneNumberField('conversation', ALL_OPS),

	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		default: '',
		description: 'Custom display name. Leave empty to reset back to the WhatsApp profile name.',
		displayOptions: { show: { resource: ['conversation'], operation: ['updateDisplayName'] } },
	},

	{
		displayName: 'User Name or ID',
		name: 'userId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getUsers' },
		required: true,
		default: '',
		description:
			'Agent to assign. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['conversation'], operation: ['assignUser'] } },
	},

	{
		displayName: 'Replace Existing',
		name: 'replaceExisting',
		type: 'boolean',
		default: true,
		description:
			'Whether to unassign every other user before assigning the target user, rather than adding alongside them',
		displayOptions: { show: { resource: ['conversation'], operation: ['assignUser'] } },
	},

	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'Body of the note',
		displayOptions: { show: { resource: ['conversation'], operation: ['createNote'] } },
	},

	{
		displayName: 'Color Name or ID',
		name: 'color',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getFlagColors' },
		default: 'red',
		description:
			'Flag colour to set, or None to clear it. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['conversation'], operation: ['setFlag'] } },
	},

	additionalFields('conversation', ['assignUser'], actorFields),
	additionalFields('conversation', ['createNote'], [
		{
			displayName: 'Agent Name',
			name: 'agentName',
			type: 'string',
			default: '',
			description: 'Name attributed as the note author',
		},
	]),
];

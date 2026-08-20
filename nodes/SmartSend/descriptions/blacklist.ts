import type { INodeProperties } from 'n8n-workflow';
import { additionalFields, phoneNumberField } from './shared';

export const blacklistDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'add',
		displayOptions: { show: { resource: ['blacklist'] } },
		options: [
			{
				name: 'Add Number',
				value: 'add',
				action: 'Add a number to the blacklist',
				description: 'Block a phone number from receiving messages',
			},
			{
				name: 'Remove Number',
				value: 'remove',
				action: 'Remove a number from the blacklist',
				description: 'Unblock a previously blacklisted phone number',
			},
		],
	},

	phoneNumberField('blacklist', ['add', 'remove']),

	additionalFields('blacklist', ['add'], [
		{
			displayName: 'Added By',
			name: 'addedBy',
			type: 'string',
			default: '',
			description: 'ID of the person or system adding the number',
		},
		{
			displayName: 'Added By Name',
			name: 'addedByName',
			type: 'string',
			default: '',
			description: 'Name of the person or system adding the number',
		},
		{
			displayName: 'Reason',
			name: 'reason',
			type: 'string',
			default: '',
			description: 'Why the number is being blacklisted',
		},
	]),
];

import type { INodeProperties } from 'n8n-workflow';
import { additionalFields } from './shared';

export const notificationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'sendPush',
		displayOptions: { show: { resource: ['notification'] } },
		options: [
			{
				name: 'Send Push',
				value: 'sendPush',
				action: 'Send a push notification',
				description: 'Send a push notification to mobile app users',
			},
		],
	},

	{
		displayName: 'Recipient Type',
		name: 'recipientType',
		type: 'options',
		required: true,
		default: 'user',
		description: 'How to resolve which users receive the notification',
		displayOptions: { show: { resource: ['notification'], operation: ['sendPush'] } },
		options: [
			{ name: 'Organization', value: 'organization' },
			{ name: 'Phone Number', value: 'phone' },
			{ name: 'User', value: 'user' },
		],
	},

	{
		displayName: 'User Name or ID',
		name: 'userId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getUsers' },
		default: '',
		description:
			'User to notify. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ['notification'], operation: ['sendPush'], recipientType: ['user'] },
		},
	},

	{
		displayName: 'Phone Number',
		name: 'phoneNumber',
		type: 'string',
		default: '',
		placeholder: '+972500000000',
		description: 'Phone number whose associated app users are notified',
		displayOptions: {
			show: { resource: ['notification'], operation: ['sendPush'], recipientType: ['phone'] },
		},
	},

	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Notification title, capped at 200 characters',
		displayOptions: { show: { resource: ['notification'], operation: ['sendPush'] } },
	},

	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'Notification body, capped at 1000 characters',
		displayOptions: { show: { resource: ['notification'], operation: ['sendPush'] } },
	},

	additionalFields('notification', ['sendPush'], [
		{
			displayName: 'Respect Preferences',
			name: 'respectPreferences',
			type: 'boolean',
			default: true,
			description:
				'Whether to apply each recipient’s notification preferences, such as active hours and assigned-only filters',
		},
		{
			displayName: 'Sound',
			name: 'sound',
			type: 'options',
			default: 'default',
			description: 'Sound to play on the device',
			options: [
				{ name: 'Cash', value: 'cash' },
				{ name: 'Default', value: 'default' },
			],
		},
	]),
];

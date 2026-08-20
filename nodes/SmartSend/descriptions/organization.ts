import type { INodeProperties } from 'n8n-workflow';

export const organizationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'validate',
		displayOptions: { show: { resource: ['organization'] } },
		options: [
			{
				name: 'Validate',
				value: 'validate',
				action: 'Validate the organization credentials',
				description:
					'Confirm the organization token resolves and report whether WhatsApp is connected',
			},
		],
	},
];

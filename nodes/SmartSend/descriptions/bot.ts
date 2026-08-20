import type { INodeProperties } from 'n8n-workflow';
import { additionalFields, phoneNumberField } from './shared';

export const botDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'triggerFlow',
		displayOptions: { show: { resource: ['bot'] } },
		options: [
			{
				name: 'Trigger Flow',
				value: 'triggerFlow',
				action: 'Trigger a bot flow',
				description: 'Start a bot flow for a phone number',
			},
		],
	},

	phoneNumberField('bot', ['triggerFlow']),

	{
		displayName: 'Bot Name or ID',
		name: 'botId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getBots' },
		required: true,
		default: '',
		description:
			'Bot flow to trigger. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['bot'], operation: ['triggerFlow'] } },
	},

	{
		displayName: 'Template Parameters',
		name: 'botTemplateFields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		typeOptions: {
			loadOptionsDependsOn: ['botId'],
			resourceMapper: {
				resourceMapperMethod: 'getBotTemplateFields',
				mode: 'add',
				fieldWords: { singular: 'parameter', plural: 'parameters' },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
		displayOptions: { show: { resource: ['bot'], operation: ['triggerFlow'] } },
	},

	additionalFields('bot', ['triggerFlow'], [
		{
			displayName: 'Button Text',
			name: 'buttonText',
			type: 'string',
			default: '',
			description: 'Text of the button that starts the flow',
		},
	]),
];

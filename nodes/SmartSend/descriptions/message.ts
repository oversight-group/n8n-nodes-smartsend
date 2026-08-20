import type { INodeProperties } from 'n8n-workflow';
import { additionalFields, avoidBlacklistField, phoneNumberField, sentByFields } from './shared';

const TEMPLATE_OPS = ['sendTemplate', 'sendTemplateWithFile'];

export const messageDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'sendText',
		displayOptions: { show: { resource: ['message'] } },
		options: [
			{
				name: 'Send Template',
				value: 'sendTemplate',
				action: 'Send a template message',
				description: 'Send an approved WhatsApp template',
			},
			{
				name: 'Send Template With File',
				value: 'sendTemplateWithFile',
				action: 'Send a template message with a file',
				description: 'Send an approved template with a base64 document attached',
			},
			{
				name: 'Send Text',
				value: 'sendText',
				action: 'Send a text message',
				description: 'Send a free-text WhatsApp message',
			},
		],
	},

	phoneNumberField('message', ['sendText', ...TEMPLATE_OPS]),

	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		description: 'Text body to send',
		displayOptions: { show: { resource: ['message'], operation: ['sendText'] } },
	},

	{
		displayName: 'Template Name or ID',
		name: 'templateName',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getTemplates' },
		required: true,
		default: '',
		description:
			'Approved WhatsApp template. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['message'], operation: TEMPLATE_OPS } },
	},

	{
		displayName: 'Language Code',
		name: 'languageCode',
		type: 'string',
		default: 'he',
		description:
			'Template language code. Disambiguates templates that exist in several languages.',
		displayOptions: { show: { resource: ['message'], operation: TEMPLATE_OPS } },
	},

	{
		displayName: 'Template Parameters',
		name: 'templateFields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['templateName', 'languageCode'],
			resourceMapper: {
				resourceMapperMethod: 'getTemplateFields',
				mode: 'add',
				fieldWords: { singular: 'parameter', plural: 'parameters' },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
		displayOptions: { show: { resource: ['message'], operation: TEMPLATE_OPS } },
	},

	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the input binary field containing the file to attach',
		displayOptions: { show: { resource: ['message'], operation: ['sendTemplateWithFile'] } },
	},

	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		description:
			'Override the attached file name, including extension. Defaults to the binary field’s own file name.',
		displayOptions: { show: { resource: ['message'], operation: ['sendTemplateWithFile'] } },
	},

	additionalFields('message', ['sendText', 'sendTemplate'], [...sentByFields, avoidBlacklistField]),
	additionalFields('message', ['sendTemplateWithFile'], [...sentByFields]),
];

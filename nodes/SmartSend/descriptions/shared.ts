import type { INodeProperties } from 'n8n-workflow';

export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	default: 'message',
	options: [
		{ name: 'Blacklist', value: 'blacklist' },
		{ name: 'Bot', value: 'bot' },
		{ name: 'Conversation', value: 'conversation' },
		{ name: 'Custom Field', value: 'customField' },
		{ name: 'List', value: 'list' },
		{ name: 'Message', value: 'message' },
		{ name: 'Notification', value: 'notification' },
		{ name: 'Organization', value: 'organization' },
		{ name: 'Tag', value: 'tag' },
	],
};

/** Builds the phone-number field, which nearly every operation needs. */
export function phoneNumberField(resource: string, operations: string[]): INodeProperties {
	return {
		displayName: 'Phone Number',
		name: 'phoneNumber',
		type: 'string',
		required: true,
		default: '',
		placeholder: '+972500000000',
		description:
			'Recipient phone number in any format (972…, 05…, +972…). Smart Send normalises it server-side.',
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}

/** Builds an Additional Fields collection scoped to the given operations. */
export function additionalFields(
	resource: string,
	operations: string[],
	options: INodeProperties[],
): INodeProperties {
	return {
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options,
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}

export const sentByFields: INodeProperties[] = [
	{
		displayName: 'Sent By User ID',
		name: 'sentByUserId',
		type: 'string',
		default: '',
		description: 'Attribution for the send. Defaults to "api" when omitted.',
	},
	{
		displayName: 'Sent By User Name',
		name: 'sentByUserName',
		type: 'string',
		default: '',
		description: 'Attribution for the send. Defaults to "API" when omitted.',
	},
];

export const actorFields: INodeProperties[] = [
	{
		displayName: 'Actor ID',
		name: 'actorId',
		type: 'string',
		default: '',
		description: 'ID of whoever performed the change',
	},
	{
		displayName: 'Actor Name',
		name: 'actorName',
		type: 'string',
		default: '',
		description: 'Name of whoever performed the change',
	},
];

export const avoidBlacklistField: INodeProperties = {
	displayName: 'Avoid Blacklist',
	name: 'avoidBlacklist',
	type: 'boolean',
	default: false,
	description:
		'Whether to skip the send silently when the number is blacklisted, returning skipped=true instead of sending',
};

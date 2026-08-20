import type { IDataObject } from 'n8n-workflow';
import { flattenTemplateParams } from './templates';

export type OperationParams = Record<string, unknown>;

export interface OperationDefinition {
	endpoint: string;
	method: 'GET' | 'POST';
	required: string[];
	buildBody?: (params: OperationParams) => IDataObject;
	buildQuery?: (params: OperationParams) => IDataObject;
}

/**
 * Drops only `undefined`. Empty strings and null are preserved because the API
 * uses them to clear values: display name resets to the profile name, custom
 * fields clear, flags clear.
 */
export function compact(input: Record<string, unknown>): IDataObject {
	const output: IDataObject = {};
	for (const [key, value] of Object.entries(input)) {
		if (value !== undefined) output[key] = value as IDataObject[string];
	}
	return output;
}

/**
 * The API's 400 response carries no field-level detail, so required fields are
 * checked here to produce an error that actually names the problem.
 */
export function findMissingRequired(params: OperationParams, required: string[]): string[] {
	return required.filter((key) => {
		const value = params[key];
		return value === undefined || value === null || value === '';
	});
}

function additional(params: OperationParams): IDataObject {
	const extra = params.additionalFields;
	return typeof extra === 'object' && extra !== null ? (extra as IDataObject) : {};
}

function mappedValues(params: OperationParams, name: string): Record<string, unknown> {
	const mapper = params[name] as { value?: Record<string, unknown> } | undefined;
	return mapper?.value ?? {};
}

function templatePayload(params: OperationParams): IDataObject {
	const parts = flattenTemplateParams(mappedValues(params, 'templateFields'));
	return compact({
		parameters: parts.parameters,
		urlButtonParams: parts.urlButtonParams,
		headerMediaUrl: parts.headerMediaUrl,
	});
}

/**
 * Converts an n8n fixedCollection of {name, value} rows into a plain map.
 * Returns undefined when empty so the key is omitted from the payload entirely.
 */
function keyValueMap(params: OperationParams, name: string): IDataObject | undefined {
	const container = params[name] as
		| { field?: Array<{ name?: string; value?: unknown }> }
		| undefined;
	const rows = container?.field ?? [];

	const map: IDataObject = {};
	for (const row of rows) {
		if (row.name !== undefined && row.name !== '') map[row.name] = row.value as IDataObject[string];
	}

	return Object.keys(map).length > 0 ? map : undefined;
}

export const OPERATIONS: Record<string, OperationDefinition> = {
	'message:sendText': {
		endpoint: '/messages/send-text',
		method: 'POST',
		required: ['phoneNumber', 'message'],
		buildBody: (p) =>
			compact({
				phoneNumber: p.phoneNumber,
				message: p.message,
				...additional(p),
			}),
	},

	'message:sendTemplate': {
		endpoint: '/messages/send-template',
		method: 'POST',
		required: ['phoneNumber', 'templateName'],
		buildBody: (p) =>
			compact({
				phoneNumber: p.phoneNumber,
				templateName: p.templateName,
				languageCode: p.languageCode,
				...templatePayload(p),
				...additional(p),
			}),
	},

	'message:sendTemplateWithFile': {
		endpoint: '/messages/send-template-base64',
		method: 'POST',
		required: ['phoneNumber', 'templateName', 'fileData', 'fileName'],
		buildBody: (p) =>
			compact({
				phoneNumber: p.phoneNumber,
				templateName: p.templateName,
				languageCode: p.languageCode,
				fileData: p.fileData,
				fileName: p.fileName,
				...templatePayload(p),
				...additional(p),
			}),
	},

	'conversation:resolve': {
		endpoint: '/conversations/resolve',
		method: 'POST',
		required: ['phoneNumber'],
		buildBody: (p) => compact({ phoneNumber: p.phoneNumber }),
	},

	// displayName is deliberately NOT required: an empty value is the documented
	// way to reset the conversation back to the WhatsApp profile name.
	'conversation:updateDisplayName': {
		endpoint: '/conversations/display-name',
		method: 'POST',
		required: ['phoneNumber'],
		buildBody: (p) => compact({ phoneNumber: p.phoneNumber, displayName: p.displayName }),
	},

	'conversation:assignUser': {
		endpoint: '/conversations/assign',
		method: 'POST',
		required: ['phoneNumber', 'userId'],
		buildBody: (p) =>
			compact({
				phoneNumber: p.phoneNumber,
				userId: p.userId,
				replaceExisting: p.replaceExisting,
				...additional(p),
			}),
	},

	'conversation:createNote': {
		endpoint: '/conversations/notes',
		method: 'POST',
		required: ['phoneNumber', 'content'],
		buildBody: (p) =>
			compact({ phoneNumber: p.phoneNumber, content: p.content, ...additional(p) }),
	},

	'conversation:setFlag': {
		endpoint: '/conversations/flag',
		method: 'POST',
		required: ['phoneNumber'],
		buildBody: (p) => compact({ phoneNumber: p.phoneNumber, color: p.color }),
	},

	'tag:add': {
		endpoint: '/conversations/tags/add',
		method: 'POST',
		required: ['phoneNumber', 'tagId'],
		buildBody: (p) => compact({ phoneNumber: p.phoneNumber, tagId: p.tagId, ...additional(p) }),
	},

	'tag:remove': {
		endpoint: '/conversations/tags/remove',
		method: 'POST',
		required: ['phoneNumber', 'tagId'],
		buildBody: (p) => compact({ phoneNumber: p.phoneNumber, tagId: p.tagId, ...additional(p) }),
	},

	'tag:clear': {
		endpoint: '/conversations/tags/clear',
		method: 'POST',
		required: ['phoneNumber'],
		buildBody: (p) => compact({ phoneNumber: p.phoneNumber, ...additional(p) }),
	},

	'list:addToConversation': {
		endpoint: '/conversations/lists/add',
		method: 'POST',
		required: ['phoneNumber', 'listId'],
		buildBody: (p) => compact({ phoneNumber: p.phoneNumber, listId: p.listId, ...additional(p) }),
	},

	'list:clearFromConversation': {
		endpoint: '/conversations/lists/clear',
		method: 'POST',
		required: ['phoneNumber'],
		buildBody: (p) => compact({ phoneNumber: p.phoneNumber, ...additional(p) }),
	},

	'list:addRecipient': {
		endpoint: '/lists/add-recipient',
		method: 'POST',
		required: ['listId', 'phoneNumber'],
		buildBody: (p) =>
			compact({
				listId: p.listId,
				phoneNumber: p.phoneNumber,
				name: p.name,
				customFields: keyValueMap(p, 'customFieldsUi'),
			}),
	},

	'list:removeRecipient': {
		endpoint: '/lists/remove-recipient',
		method: 'POST',
		required: ['listId', 'phoneNumber'],
		buildBody: (p) => compact({ listId: p.listId, phoneNumber: p.phoneNumber }),
	},
};

export function getOperation(resource: string, operation: string): OperationDefinition {
	const key = `${resource}:${operation}`;
	const definition = OPERATIONS[key];
	if (definition === undefined) {
		throw new Error(`Unsupported Smart Send operation: ${key}`);
	}
	return definition;
}

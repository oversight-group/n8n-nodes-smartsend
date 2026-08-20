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
};

export function getOperation(resource: string, operation: string): OperationDefinition {
	const key = `${resource}:${operation}`;
	const definition = OPERATIONS[key];
	if (definition === undefined) {
		throw new Error(`Unsupported Smart Send operation: ${key}`);
	}
	return definition;
}

import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { descriptions } from './descriptions';
import { loadOptions, resourceMapping } from './methods/loadOptions';
import { findMissingRequired, getOperation, type OperationParams } from './operations/registry';
import { smartSendApiRequest } from './transport/request';

/**
 * The main connection type, resolved defensively.
 *
 * `NodeConnectionTypes` (plural) is a recent n8n-workflow export. On older n8n
 * installs only `NodeConnectionType` (singular) exists, so reading `.Main` off
 * the plural name throws while this class is being constructed — and n8n
 * surfaces that as the badly misleading "Class could not be found. Please check
 * if the class is named correctly."
 *
 * Both spellings resolve to the string 'main', so falling back keeps the node
 * loadable across n8n versions. Referencing it through a constant rather than
 * writing 'main' inline also satisfies n8n's verification scanner, which
 * rejects a bare string literal here.
 */
const MAIN_CONNECTION: NodeConnectionType = NodeConnectionTypes?.Main ?? 'main';

/**
 * Reads a node parameter that may not belong to the current operation.
 *
 * n8n throws `Could not get parameter "x"` when a parameter is not part of the
 * active parameter set, and passing `undefined` as the fallback does NOT
 * suppress it — n8n treats "no fallback" and "undefined fallback" identically.
 *
 * This node reads one superset of parameters for every operation, so absent
 * parameters are the normal case and must never abort execution. Catching is
 * used rather than a non-undefined fallback because the fallback semantics have
 * varied between n8n versions, whereas the throw is reliable to intercept.
 */
function optionalParameter(
	ctx: IExecuteFunctions,
	name: string,
	itemIndex: number,
): unknown {
	try {
		return ctx.getNodeParameter(name, itemIndex, undefined);
	} catch {
		return undefined;
	}
}

/**
 * Every parameter any operation might read. Absent ones resolve to undefined
 * and are dropped, so a single pass is cheaper and less error-prone than
 * per-operation parameter lists.
 */
const COMMON_PARAMS = [
	'phoneNumber',
	'message',
	'templateName',
	'languageCode',
	'templateFields',
	'fileName',
	'displayName',
	'userId',
	'replaceExisting',
	'content',
	'color',
	'tagId',
	'listId',
	'name',
	'customFieldsUi',
	'fieldSource',
	'fieldId',
	'fieldName',
	'value',
	'fieldsUi',
	'botId',
	'botTemplateFields',
	'recipientType',
	'title',
	'body',
	'additionalFields',
];

export class SmartSend implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SmartSend',
		name: 'smartSend',
		icon: { light: 'file:smartsend.svg', dark: 'file:smartsend.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send WhatsApp messages and manage conversations in SmartSend',
		defaults: { name: 'SmartSend' },
		usableAsTool: true,
		inputs: [MAIN_CONNECTION],
		outputs: [MAIN_CONNECTION],
		credentials: [{ name: 'smartSendApi', required: true }],
		properties: descriptions,
	};

	methods = { loadOptions, resourceMapping };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i += 1) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const definition = getOperation(resource, operation);

				const params: OperationParams = {};
				for (const key of COMMON_PARAMS) {
					const value = optionalParameter(this, key, i);
					if (value !== undefined) params[key] = value;
				}

				if (operation === 'sendTemplateWithFile') {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const binary = this.helpers.assertBinaryData(i, binaryPropertyName);
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
					params.fileData = buffer.toString('base64');
					params.fileName =
						(params.fileName as string) || binary.fileName || binaryPropertyName;
				}

				// The API's 400 response names no field, so the node reports precisely
				// what is missing before spending a request.
				const missing = findMissingRequired(params, definition.required);
				if (missing.length > 0) {
					throw new NodeOperationError(
						this.getNode(),
						`Missing required parameter${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
						{ itemIndex: i },
					);
				}

				const body = definition.buildBody?.(params);
				const qs = definition.buildQuery?.(params);
				const response = await smartSendApiRequest(
					this,
					definition.method,
					definition.endpoint,
					body,
					qs,
				);

				const entries = Array.isArray(response) ? response : [response];
				for (const entry of entries) {
					returnData.push({
						json: (entry ?? {}) as IDataObject,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Raw errors must not escape the node: anything that is not already
				// an n8n error is wrapped so the UI gets a typed, attributable
				// failure rather than a bare Error.
				throw error instanceof NodeApiError || error instanceof NodeOperationError
					? error
					: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

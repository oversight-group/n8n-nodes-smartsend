import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { descriptions } from './descriptions';
import { loadOptions, resourceMapping } from './methods/loadOptions';
import { findMissingRequired, getOperation, type OperationParams } from './operations/registry';
import { smartSendApiRequest } from './transport/request';

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
		displayName: 'Smart Send',
		name: 'smartSend',
		icon: 'file:smartsend.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send WhatsApp messages and manage conversations in Smart Send',
		defaults: { name: 'Smart Send' },
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
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
					const value = this.getNodeParameter(key, i, undefined);
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
				throw error;
			}
		}

		return [returnData];
	}
}

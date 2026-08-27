import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { smartSendApiRequest } from '../transport/request';

interface DropdownItem {
	id?: unknown;
	value?: unknown;
}

interface TemplateFieldItem {
	name?: unknown;
	label?: unknown;
}

/**
 * Every RPC dropdown returns `[{ id, value }]` where id is the key and value is
 * the label. Non-arrays and empty arrays are normal results for this API, never
 * errors, so this never throws.
 */
export function mapDropdownItems(data: unknown): INodePropertyOptions[] {
	if (!Array.isArray(data)) return [];

	return (data as DropdownItem[])
		.filter((item) => item?.id !== undefined && item.id !== null && item.id !== '')
		.map((item) => ({
			name: String(item.value ?? item.id),
			value: String(item.id),
		}));
}

/**
 * Both /rpc/template-params and /rpc/bot-template-params return a flat
 * `[{ name, label }]` list. Field ids are kept verbatim so the flatteners can
 * parse them back into the API payload.
 */
export function mapTemplateFields(data: unknown): ResourceMapperFields {
	if (!Array.isArray(data)) return { fields: [] };

	const fields: ResourceMapperField[] = (data as TemplateFieldItem[])
		.filter((item) => typeof item?.name === 'string' && item.name !== '')
		.map((item) => ({
			id: item.name as string,
			displayName: String(item.label ?? item.name),
			required: false,
			defaultMatch: false,
			canBeUsedToMatch: false,
			display: true,
			type: 'string',
		}));

	return { fields };
}

async function dropdown(
	ctx: ILoadOptionsFunctions,
	path: string,
	qs?: IDataObject,
): Promise<INodePropertyOptions[]> {
	const data = await smartSendApiRequest(ctx, 'GET', path, undefined, qs);
	return mapDropdownItems(data);
}

export const loadOptions = {
	async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return dropdown(this, '/rpc/tags');
	},

	async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return dropdown(this, '/rpc/lists');
	},

	async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return dropdown(this, '/rpc/users');
	},

	async getBots(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return dropdown(this, '/rpc/bots');
	},

	async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return dropdown(this, '/rpc/templates');
	},

	async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// The List picker that scopes this dropdown appears in two different
		// shapes: a top-level parameter for "Set Value", and an entry inside the
		// fieldsUi fixedCollection for "Set Multiple Values".
		//
		// n8n resolves a bare name as an ABSOLUTE path from the node's parameters,
		// and a "&"-prefixed name relative to the current collection item. So the
		// two shapes need opposite forms and only one ever resolves:
		//
		//   Set Value     'fieldListId'  -> fieldListId                       ✓
		//                 '&fieldListId' -> .fieldListId                      undefined
		//   Set Multiple  'fieldListId'  -> fieldListId                       undefined
		//                 '&fieldListId' -> fieldsUi.field[0].fieldListId     ✓
		//
		// Reading only the bare name left the multi-field dropdown permanently
		// empty, whatever the workspace contained. Neither lookup throws when it
		// misses, so trying both covers each shape from one method.
		const listId = (this.getCurrentNodeParameter('&fieldListId') ??
			this.getCurrentNodeParameter('fieldListId')) as string | undefined;

		if (listId === undefined || listId === '') return [];
		return dropdown(this, '/rpc/custom-fields', { listId });
	},

	async getFlagColors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const colors = await dropdown(this, '/rpc/flag-colors');
		// The RPC returns red/orange/green only. "none" is the documented way to
		// clear a flag but is never returned, so it is added synthetically.
		return [...colors, { name: 'None (Clear Flag)', value: 'none' }];
	},
};

export const resourceMapping = {
	async getTemplateFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
		// In load-options context getNodeParameter takes no itemIndex.
		const templateName = this.getNodeParameter('templateName', '') as string;
		if (templateName === undefined || templateName === '') return { fields: [] };

		const languageCode = this.getNodeParameter('languageCode', '') as string;
		const qs: IDataObject = { templateName };
		if (languageCode !== '') qs.languageCode = languageCode;

		return mapTemplateFields(
			await smartSendApiRequest(this, 'GET', '/rpc/template-params', undefined, qs),
		);
	},

	async getBotTemplateFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
		const botId = this.getNodeParameter('botId', '') as string;
		if (botId === undefined || botId === '') return { fields: [] };

		return mapTemplateFields(
			await smartSendApiRequest(this, 'GET', '/rpc/bot-template-params', undefined, { botId }),
		);
	},
};

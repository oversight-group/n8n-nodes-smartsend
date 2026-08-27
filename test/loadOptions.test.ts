import { loadOptions, mapDropdownItems, mapTemplateFields } from '../nodes/SmartSend/methods/loadOptions';

describe('mapDropdownItems', () => {
	it('maps the verified {id,value} contract to n8n {name,value}', () => {
		expect(mapDropdownItems([{ id: 'cart_24', value: 'cart_24 (he)' }])).toEqual([
			{ name: 'cart_24 (he)', value: 'cart_24' },
		]);
	});

	it('returns an empty array for empty data, which is normal for this API', () => {
		expect(mapDropdownItems([])).toEqual([]);
	});

	it('returns an empty array rather than throwing for a non-array', () => {
		expect(mapDropdownItems(null)).toEqual([]);
		expect(mapDropdownItems({ nope: true })).toEqual([]);
		expect(mapDropdownItems(undefined)).toEqual([]);
	});

	it('falls back to the id as the label when value is missing', () => {
		expect(mapDropdownItems([{ id: 'red' }])).toEqual([{ name: 'red', value: 'red' }]);
	});

	it('skips items without an id', () => {
		expect(mapDropdownItems([{ value: 'orphan' }, { id: 'ok', value: 'Ok' }])).toEqual([
			{ name: 'Ok', value: 'ok' },
		]);
	});

	it('handles the live bot payload with a Hebrew label', () => {
		expect(mapDropdownItems([{ id: 'bot-uuid-1', value: 'תהליך חדש' }])).toEqual([
			{ name: 'תהליך חדש', value: 'bot-uuid-1' },
		]);
	});
});

describe('mapTemplateFields', () => {
	it('maps the live cart_24 params to resourceMapper fields', () => {
		const result = mapTemplateFields([
			{ name: 'tp__1', label: 'Parameter 1' },
			{ name: 'tp__url_btn0', label: 'Button #1 URL Value' },
		]);
		expect(result.fields).toEqual([
			{
				id: 'tp__1',
				displayName: 'Parameter 1',
				required: false,
				defaultMatch: false,
				canBeUsedToMatch: false,
				display: true,
				type: 'string',
			},
			{
				id: 'tp__url_btn0',
				displayName: 'Button #1 URL Value',
				required: false,
				defaultMatch: false,
				canBeUsedToMatch: false,
				display: true,
				type: 'string',
			},
		]);
	});

	it('returns no fields for empty data, which the API returns for unknown templates', () => {
		expect(mapTemplateFields([]).fields).toEqual([]);
	});

	it('returns no fields rather than throwing for a non-array', () => {
		expect(mapTemplateFields(null).fields).toEqual([]);
	});

	it('falls back to the name as the label when label is missing', () => {
		expect(mapTemplateFields([{ name: 'tp__1' }]).fields[0].displayName).toBe('tp__1');
	});

	it('skips entries without a name', () => {
		expect(mapTemplateFields([{ label: 'orphan' }]).fields).toEqual([]);
	});

	it('maps the live bot field names unchanged, so the flattener can split them', () => {
		expect(
			mapTemplateFields([{ name: 'tp__cart_24__url_btn0', label: 'cart_24 - Button #1 URL Value' }])
				.fields[0].id,
		).toBe('tp__cart_24__url_btn0');
	});
});

/**
 * Resolves a parameter path the way lodash `get` does for n8n's
 * getCurrentNodeParameter. Empty segments are deliberately NOT filtered out:
 * n8n turns a top-level "&name" into ".name", and lodash yields undefined for
 * that. A fake that quietly resolved it anyway would hide the exact bug these
 * tests exist to catch.
 */
function getByPath(obj: unknown, path: string): unknown {
	return path
		.replace(/\[(\d+)\]/g, '.$1')
		.split('.')
		.reduce<unknown>(
			(o, key) => (o === null || o === undefined ? undefined : (o as Record<string, unknown>)[key]),
			obj,
		);
}

/** Mirrors n8n's LoadOptionsContext.getCurrentNodeParameter, "&" handling included. */
function loadOptionsContext(nodeParameters: unknown, thisPath: string) {
	const requests: Array<{ url: string; qs?: Record<string, unknown> }> = [];

	const ctx = {
		getCurrentNodeParameter: (parameterPath: string) => {
			let resolved = parameterPath;
			if (parameterPath.charAt(0) === '&') {
				resolved = `${thisPath.split('.').slice(1, -1).join('.')}.${parameterPath.slice(1)}`;
			}
			return getByPath(nodeParameters, resolved);
		},
		getCredentials: async () => ({ organizationToken: 't', baseUrl: 'https://example.test' }),
		getNode: () => ({ name: 'SmartSend' }),
		helpers: {
			httpRequestWithAuthentication: async (_c: string, options: Record<string, unknown>) => {
				requests.push({
					url: options.url as string,
					qs: options.qs as Record<string, unknown>,
				});
				return { success: true, data: [{ id: 'f1', value: 'City' }] };
			},
		},
	};

	return { ctx, requests };
}

describe('getCustomFields resolves the List picker in both UI shapes', () => {
	const SET_VALUE = {
		resource: 'customField',
		operation: 'set',
		fieldSource: 'list',
		fieldListId: 'LIST-123',
	};

	const SET_MANY = {
		resource: 'customField',
		operation: 'setMany',
		fieldsUi: { field: [{ fieldSource: 'list', fieldListId: 'LIST-123' }] },
	};

	it('finds the list for Set Value, where it is a top-level parameter', async () => {
		const { ctx, requests } = loadOptionsContext(SET_VALUE, 'parameters.fieldId');

		const options = await loadOptions.getCustomFields.call(ctx as never);

		expect(requests).toHaveLength(1);
		expect(requests[0].qs).toEqual({ listId: 'LIST-123' });
		expect(options).toEqual([{ name: 'City', value: 'f1' }]);
	});

	it('finds the list for Set Multiple Values, where it sits inside the collection', async () => {
		// Regression: reading only the bare 'fieldListId' resolved to undefined
		// here, so this dropdown was empty no matter what the workspace held.
		const { ctx, requests } = loadOptionsContext(
			SET_MANY,
			'parameters.fieldsUi.field[0].fieldId',
		);

		const options = await loadOptions.getCustomFields.call(ctx as never);

		expect(requests).toHaveLength(1);
		expect(requests[0].qs).toEqual({ listId: 'LIST-123' });
		expect(options).toEqual([{ name: 'City', value: 'f1' }]);
	});

	it('spends no request when no list is chosen yet', async () => {
		const { ctx, requests } = loadOptionsContext(
			{ resource: 'customField', operation: 'set', fieldSource: 'list' },
			'parameters.fieldId',
		);

		expect(await loadOptions.getCustomFields.call(ctx as never)).toEqual([]);
		expect(requests).toHaveLength(0);
	});

	it('returns nothing rather than throwing when the workspace list has no fields', async () => {
		// What the live API actually does: 200 with an empty array.
		const { ctx } = loadOptionsContext(SET_VALUE, 'parameters.fieldId');
		ctx.helpers.httpRequestWithAuthentication = async () => ({ success: true, data: [] });

		expect(await loadOptions.getCustomFields.call(ctx as never)).toEqual([]);
	});
});

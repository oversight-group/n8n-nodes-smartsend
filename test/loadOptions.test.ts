import { mapDropdownItems, mapTemplateFields } from '../nodes/SmartSend/methods/loadOptions';

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

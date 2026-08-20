import { getOperation, OPERATIONS } from '../nodes/SmartSend/operations/registry';

describe('customField:set', () => {
	const op = getOperation('customField', 'set');

	it('targets the single-field endpoint', () => {
		expect(op.endpoint).toBe('/conversations/set-custom-field');
		expect(op.required).toEqual(['phoneNumber']);
	});

	it('sends fieldId when sourcing from a list', () => {
		expect(op.buildBody!({ phoneNumber: '1', fieldSource: 'list', fieldId: 'f1', value: 'v' })).toEqual(
			{ phoneNumber: '1', fieldId: 'f1', value: 'v' },
		);
	});

	it('sends fieldName when identifying by name', () => {
		expect(
			op.buildBody!({ phoneNumber: '1', fieldSource: 'name', fieldName: 'city', value: 'v' }),
		).toEqual({ phoneNumber: '1', fieldName: 'city', value: 'v' });
	});

	it('preserves an empty value, which clears the field', () => {
		expect(
			op.buildBody!({ phoneNumber: '1', fieldSource: 'name', fieldName: 'city', value: '' }),
		).toEqual({ phoneNumber: '1', fieldName: 'city', value: '' });
	});
});

describe('customField:setMany', () => {
	const op = getOperation('customField', 'setMany');

	it('targets the multi-field endpoint', () => {
		expect(op.endpoint).toBe('/conversations/set-custom-fields');
	});

	it('builds a fields array mixing both identification modes', () => {
		expect(
			op.buildBody!({
				phoneNumber: '1',
				fieldsUi: {
					field: [
						{ fieldSource: 'list', fieldId: 'f1', value: 'a' },
						{ fieldSource: 'name', fieldName: 'city', value: 'b' },
					],
				},
			}),
		).toEqual({
			phoneNumber: '1',
			fields: [
				{ fieldId: 'f1', value: 'a' },
				{ fieldName: 'city', value: 'b' },
			],
		});
	});

	it('produces an empty fields array when nothing is configured', () => {
		expect(op.buildBody!({ phoneNumber: '1' })).toEqual({ phoneNumber: '1', fields: [] });
	});
});

describe('bot:triggerFlow', () => {
	const op = getOperation('bot', 'triggerFlow');

	it('targets the flows endpoint', () => {
		expect(op.endpoint).toBe('/flows/send');
		expect(op.required).toEqual(['phoneNumber', 'botId']);
	});

	it('reproduces the verified live payload including the flat passthrough', () => {
		expect(
			op.buildBody!({
				phoneNumber: '1',
				botId: 'b1',
				botTemplateFields: {
					value: {
						tp__cart_24__1: 'bot-p1',
						tp__cart_24__2: 'bot-p2',
						tp__cart_24__url_btn0: 'botbtn123',
					},
				},
			}),
		).toEqual({
			phoneNumber: '1',
			botId: 'b1',
			templateParams: { cart_24: ['bot-p1', 'bot-p2'] },
			tp__cart_24__url_btn0: 'botbtn123',
		});
	});

	it('omits templateParams when no fields are mapped', () => {
		expect(op.buildBody!({ phoneNumber: '1', botId: 'b1' })).toEqual({
			phoneNumber: '1',
			botId: 'b1',
		});
	});

	it('carries the optional button text', () => {
		expect(
			op.buildBody!({ phoneNumber: '1', botId: 'b1', additionalFields: { buttonText: 'Go' } }),
		).toEqual({ phoneNumber: '1', botId: 'b1', buttonText: 'Go' });
	});
});

describe('blacklist operations', () => {
	it('add carries the optional reason and attribution', () => {
		const op = getOperation('blacklist', 'add');
		expect(op.endpoint).toBe('/blacklist/add');
		expect(
			op.buildBody!({
				phoneNumber: '1',
				additionalFields: { reason: 'spam', addedBy: 'u', addedByName: 'Ann' },
			}),
		).toEqual({ phoneNumber: '1', reason: 'spam', addedBy: 'u', addedByName: 'Ann' });
	});

	it('remove posts only the phone number', () => {
		const op = getOperation('blacklist', 'remove');
		expect(op.endpoint).toBe('/blacklist/remove');
		expect(op.buildBody!({ phoneNumber: '1' })).toEqual({ phoneNumber: '1' });
	});
});

describe('notification:sendPush', () => {
	const op = getOperation('notification', 'sendPush');

	it('targets the push endpoint', () => {
		expect(op.endpoint).toBe('/notifications/push');
		expect(op.required).toEqual(['recipientType', 'title', 'body']);
	});

	it('includes userId for the user recipient type', () => {
		expect(op.buildBody!({ recipientType: 'user', userId: 'u1', title: 'T', body: 'B' })).toEqual({
			recipientType: 'user',
			userId: 'u1',
			title: 'T',
			body: 'B',
		});
	});

	it('includes phoneNumber for the phone recipient type', () => {
		expect(op.buildBody!({ recipientType: 'phone', phoneNumber: '1', title: 'T', body: 'B' })).toEqual(
			{ recipientType: 'phone', phoneNumber: '1', title: 'T', body: 'B' },
		);
	});

	it('sends neither for the organization recipient type', () => {
		expect(op.buildBody!({ recipientType: 'organization', title: 'T', body: 'B' })).toEqual({
			recipientType: 'organization',
			title: 'T',
			body: 'B',
		});
	});

	it('drops a stale userId when the recipient type is not user', () => {
		expect(
			op.buildBody!({ recipientType: 'organization', userId: 'leftover', title: 'T', body: 'B' }),
		).toEqual({ recipientType: 'organization', title: 'T', body: 'B' });
	});

	it('carries sound and respectPreferences', () => {
		expect(
			op.buildBody!({
				recipientType: 'organization',
				title: 'T',
				body: 'B',
				additionalFields: { sound: 'cash', respectPreferences: false },
			}),
		).toEqual({
			recipientType: 'organization',
			title: 'T',
			body: 'B',
			sound: 'cash',
			respectPreferences: false,
		});
	});
});

describe('organization:validate', () => {
	const op = getOperation('organization', 'validate');

	it('is a GET with no body', () => {
		expect(op.endpoint).toBe('/validate');
		expect(op.method).toBe('GET');
		expect(op.required).toEqual([]);
		expect(op.buildBody).toBeUndefined();
	});
});

describe('registry completeness', () => {
	it('holds exactly the 22 operations the spec defines', () => {
		expect(Object.keys(OPERATIONS)).toHaveLength(22);
	});

	it('gives every operation an endpoint, a method and a required list', () => {
		for (const [key, op] of Object.entries(OPERATIONS)) {
			expect(op.endpoint.startsWith('/')).toBe(true);
			expect(['GET', 'POST']).toContain(op.method);
			expect(Array.isArray(op.required)).toBe(true);
			expect(key).toMatch(/^[a-z][A-Za-z]*:[a-z][A-Za-z]*$/);
		}
	});

	it('gives every POST operation a body builder', () => {
		for (const op of Object.values(OPERATIONS)) {
			if (op.method === 'POST') expect(typeof op.buildBody).toBe('function');
		}
	});
});

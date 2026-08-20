import {
	compact,
	findMissingRequired,
	getOperation,
} from '../nodes/SmartSend/operations/registry';

describe('compact', () => {
	it('drops undefined values', () => {
		expect(compact({ a: 1, b: undefined })).toEqual({ a: 1 });
	});

	it('keeps empty strings, which clear fields', () => {
		expect(compact({ a: '' })).toEqual({ a: '' });
	});

	it('keeps null, which clears fields', () => {
		expect(compact({ a: null })).toEqual({ a: null });
	});

	it('keeps false', () => {
		expect(compact({ a: false })).toEqual({ a: false });
	});
});

describe('findMissingRequired', () => {
	it('reports nothing when all required params are present', () => {
		expect(findMissingRequired({ phoneNumber: '1', message: 'x' }, ['phoneNumber', 'message'])).toEqual(
			[],
		);
	});

	it('reports missing keys', () => {
		expect(findMissingRequired({ phoneNumber: '1' }, ['phoneNumber', 'message'])).toEqual(['message']);
	});

	it('treats an empty string as missing', () => {
		expect(findMissingRequired({ phoneNumber: '' }, ['phoneNumber'])).toEqual(['phoneNumber']);
	});

	it('treats undefined as missing', () => {
		expect(findMissingRequired({ phoneNumber: undefined }, ['phoneNumber'])).toEqual(['phoneNumber']);
	});
});

describe('getOperation', () => {
	it('throws a helpful error for an unknown key', () => {
		expect(() => getOperation('nope', 'alsoNope')).toThrow('nope:alsoNope');
	});
});

describe('message:sendText', () => {
	const op = getOperation('message', 'sendText');

	it('targets the send-text endpoint', () => {
		expect(op.endpoint).toBe('/messages/send-text');
		expect(op.method).toBe('POST');
	});

	it('requires a phone number and a message', () => {
		expect(op.required).toEqual(['phoneNumber', 'message']);
	});

	it('builds a minimal body', () => {
		expect(op.buildBody!({ phoneNumber: '+972500000000', message: 'hi' })).toEqual({
			phoneNumber: '+972500000000',
			message: 'hi',
		});
	});

	it('includes additional fields when supplied', () => {
		expect(
			op.buildBody!({
				phoneNumber: '1',
				message: 'hi',
				additionalFields: { sentByUserId: 'u1', sentByUserName: 'Ann', avoidBlacklist: true },
			}),
		).toEqual({
			phoneNumber: '1',
			message: 'hi',
			sentByUserId: 'u1',
			sentByUserName: 'Ann',
			avoidBlacklist: true,
		});
	});
});

describe('message:sendTemplate', () => {
	const op = getOperation('message', 'sendTemplate');

	it('targets the send-template endpoint', () => {
		expect(op.endpoint).toBe('/messages/send-template');
	});

	it('requires a phone number and template name', () => {
		expect(op.required).toEqual(['phoneNumber', 'templateName']);
	});

	it('flattens the resourceMapper values into the documented payload', () => {
		expect(
			op.buildBody!({
				phoneNumber: '1',
				templateName: 'cart_24',
				languageCode: 'he',
				templateFields: { value: { tp__1: 'Rotem', tp__2: 'https://x', tp__url_btn0: 'abc' } },
			}),
		).toEqual({
			phoneNumber: '1',
			templateName: 'cart_24',
			languageCode: 'he',
			parameters: ['Rotem', 'https://x'],
			urlButtonParams: [{ buttonIndex: 0, value: 'abc' }],
		});
	});

	it('omits template payload keys when no fields are mapped', () => {
		expect(op.buildBody!({ phoneNumber: '1', templateName: 'cart_24', languageCode: 'he' })).toEqual({
			phoneNumber: '1',
			templateName: 'cart_24',
			languageCode: 'he',
		});
	});
});

describe('message:sendTemplateWithFile', () => {
	const op = getOperation('message', 'sendTemplateWithFile');

	it('targets the base64 endpoint', () => {
		expect(op.endpoint).toBe('/messages/send-template-base64');
	});

	it('requires the file fields', () => {
		expect(op.required).toEqual(['phoneNumber', 'templateName', 'fileData', 'fileName']);
	});

	it('carries the file through and flattens parameters', () => {
		expect(
			op.buildBody!({
				phoneNumber: '1',
				templateName: 'cart_24',
				languageCode: 'he',
				fileData: 'BASE64',
				fileName: 'proposal.pdf',
				templateFields: { value: { tp__1: 'a' } },
			}),
		).toEqual({
			phoneNumber: '1',
			templateName: 'cart_24',
			languageCode: 'he',
			fileData: 'BASE64',
			fileName: 'proposal.pdf',
			parameters: ['a'],
		});
	});
});

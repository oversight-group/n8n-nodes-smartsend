import { SmartSend } from '../nodes/SmartSend/SmartSend.node';

/**
 * Drives the real execute() against a fake IExecuteFunctions. This covers the
 * loop itself — parameter collection, client-side validation, response
 * normalisation, pairedItem tagging and continueOnFail — which the
 * description-only tests do not touch.
 */
interface HarnessOptions {
	params: Record<string, unknown>;
	itemCount?: number;
	continueOnFail?: boolean;
	response?: unknown;
	requestError?: Error;
	binary?: { fileName?: string; buffer?: Buffer };
}

function harness(options: HarnessOptions) {
	const calls: Array<{ method: string; url: string; body?: unknown; qs?: unknown }> = [];
	const itemCount = options.itemCount ?? 1;

	const ctx = {
		getInputData: () => new Array(itemCount).fill({ json: {} }),
		getNodeParameter: (name: string, _i: number, fallback?: unknown) =>
			name in options.params ? options.params[name] : fallback,
		getNode: () => ({ name: 'Smart Send', type: 'smartSend' }),
		getCredentials: async () => ({
			organizationId: 'token',
			baseUrl: 'https://example.test',
		}),
		continueOnFail: () => options.continueOnFail === true,
		helpers: {
			httpRequestWithAuthentication: async (_cred: string, opts: Record<string, unknown>) => {
				calls.push({
					method: opts.method as string,
					url: opts.url as string,
					body: opts.body,
					qs: opts.qs,
				});
				if (options.requestError !== undefined) throw options.requestError;
				return options.response ?? { success: true, data: { ok: true } };
			},
			assertBinaryData: () => ({ fileName: options.binary?.fileName }),
			getBinaryDataBuffer: async () => options.binary?.buffer ?? Buffer.from('hello'),
		},
	};

	// The fake supplies exactly the surface execute() touches.
	const run = () => new SmartSend().execute.call(ctx as never);
	return { run, calls };
}

describe('execute: happy path', () => {
	it('posts the built body to the right endpoint and unwraps data', async () => {
		const { run, calls } = harness({
			params: { resource: 'message', operation: 'sendText', phoneNumber: '+972500000000', message: 'hi' },
			response: { success: true, data: { message: { id: 'm1' } } },
		});

		const result = await run();

		expect(calls).toHaveLength(1);
		expect(calls[0].method).toBe('POST');
		expect(calls[0].url).toBe('https://example.test/integrations/make/messages/send-text');
		expect(calls[0].body).toEqual({ phoneNumber: '+972500000000', message: 'hi' });
		expect(result[0][0].json).toEqual({ message: { id: 'm1' } });
	});

	it('tags output with pairedItem', async () => {
		const { run } = harness({
			params: { resource: 'blacklist', operation: 'remove', phoneNumber: '1' },
		});
		const result = await run();
		expect(result[0][0].pairedItem).toEqual({ item: 0 });
	});

	it('processes every input item', async () => {
		const { run, calls } = harness({
			params: { resource: 'blacklist', operation: 'remove', phoneNumber: '1' },
			itemCount: 3,
		});
		const result = await run();
		expect(calls).toHaveLength(3);
		expect(result[0]).toHaveLength(3);
		expect(result[0].map((r) => r.pairedItem)).toEqual([{ item: 0 }, { item: 1 }, { item: 2 }]);
	});

	it('spreads an array response into one item per entry', async () => {
		const { run } = harness({
			params: { resource: 'organization', operation: 'validate' },
			response: { success: true, data: [{ a: 1 }, { a: 2 }] },
		});
		const result = await run();
		expect(result[0]).toHaveLength(2);
		expect(result[0].map((r) => r.json)).toEqual([{ a: 1 }, { a: 2 }]);
	});

	it('issues a GET with no body for validate', async () => {
		const { run, calls } = harness({ params: { resource: 'organization', operation: 'validate' } });
		await run();
		expect(calls[0].method).toBe('GET');
		expect(calls[0].body).toBeUndefined();
		expect(calls[0].url).toBe('https://example.test/integrations/make/validate');
	});

	it('flattens template parameters into the live-verified payload', async () => {
		const { run, calls } = harness({
			params: {
				resource: 'message',
				operation: 'sendTemplate',
				phoneNumber: '1',
				templateName: 'cart_24',
				languageCode: 'he',
				templateFields: { value: { tp__1: 'a', tp__2: 'b', tp__url_btn0: 'abc' } },
			},
		});
		await run();
		expect(calls[0].body).toEqual({
			phoneNumber: '1',
			templateName: 'cart_24',
			languageCode: 'he',
			parameters: ['a', 'b'],
			urlButtonParams: [{ buttonIndex: 0, value: 'abc' }],
		});
	});
});

describe('execute: client-side validation', () => {
	it('names the missing field instead of letting the API say "validation failed"', async () => {
		const { run, calls } = harness({
			params: { resource: 'message', operation: 'sendText', phoneNumber: '' },
		});
		await expect(run()).rejects.toThrow('Missing required parameters: phoneNumber, message');
		expect(calls).toHaveLength(0);
	});

	it('uses the singular form for one missing field', async () => {
		const { run } = harness({
			params: { resource: 'message', operation: 'sendText', phoneNumber: '1' },
		});
		await expect(run()).rejects.toThrow('Missing required parameter: message');
	});

	it('spends no request when validation fails', async () => {
		const { run, calls } = harness({
			params: { resource: 'bot', operation: 'triggerFlow', phoneNumber: '1' },
		});
		await expect(run()).rejects.toThrow('botId');
		expect(calls).toHaveLength(0);
	});
});

describe('execute: error handling', () => {
	it('throws on a 200 response carrying success:false', async () => {
		const { run } = harness({
			params: { resource: 'blacklist', operation: 'remove', phoneNumber: '1' },
			response: { success: false, message: 'validation failed' },
		});
		await expect(run()).rejects.toThrow(/validation failed/);
	});

	it('collects the error per item when continueOnFail is set', async () => {
		const { run } = harness({
			params: { resource: 'message', operation: 'sendText', phoneNumber: '' },
			continueOnFail: true,
			itemCount: 2,
		});
		const result = await run();
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json.error).toContain('phoneNumber');
		expect(result[0][0].pairedItem).toEqual({ item: 0 });
		expect(result[0][1].pairedItem).toEqual({ item: 1 });
	});

	it('keeps going past a failing request when continueOnFail is set', async () => {
		const { run } = harness({
			params: { resource: 'blacklist', operation: 'remove', phoneNumber: '1' },
			requestError: new Error('network down'),
			continueOnFail: true,
		});
		const result = await run();
		expect(result[0][0].json.error).toBe('network down');
	});
});

describe('execute: binary file handling', () => {
	it('base64-encodes the binary field and derives the file name from metadata', async () => {
		const { run, calls } = harness({
			params: {
				resource: 'message',
				operation: 'sendTemplateWithFile',
				phoneNumber: '1',
				templateName: 'cart_24',
				binaryPropertyName: 'data',
			},
			binary: { fileName: 'proposal.pdf', buffer: Buffer.from('PDFDATA') },
		});
		await run();
		expect(calls[0].body).toMatchObject({
			fileData: Buffer.from('PDFDATA').toString('base64'),
			fileName: 'proposal.pdf',
		});
	});

	it('prefers an explicitly supplied file name over the binary metadata', async () => {
		const { run, calls } = harness({
			params: {
				resource: 'message',
				operation: 'sendTemplateWithFile',
				phoneNumber: '1',
				templateName: 'cart_24',
				binaryPropertyName: 'data',
				fileName: 'override.pdf',
			},
			binary: { fileName: 'ignored.pdf', buffer: Buffer.from('X') },
		});
		await run();
		expect((calls[0].body as Record<string, unknown>).fileName).toBe('override.pdf');
	});
});

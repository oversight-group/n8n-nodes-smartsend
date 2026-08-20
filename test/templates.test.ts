import {
	flattenBotTemplateParams,
	flattenTemplateParams,
	splitBotFieldName,
} from '../nodes/SmartSend/operations/templates';

describe('flattenTemplateParams', () => {
	it('maps numbered fields into a positional parameters array', () => {
		expect(flattenTemplateParams({ tp__1: 'a', tp__2: 'b' }).parameters).toEqual(['a', 'b']);
	});

	it('orders by index regardless of key order', () => {
		expect(flattenTemplateParams({ tp__3: 'c', tp__1: 'a', tp__2: 'b' }).parameters).toEqual([
			'a',
			'b',
			'c',
		]);
	});

	it('fills gaps with empty strings so positional substitution stays aligned', () => {
		expect(flattenTemplateParams({ tp__1: 'a', tp__3: 'c' }).parameters).toEqual(['a', '', 'c']);
	});

	it('maps url_btn fields to urlButtonParams with a 0-based buttonIndex', () => {
		expect(flattenTemplateParams({ tp__url_btn0: 'x' }).urlButtonParams).toEqual([
			{ buttonIndex: 0, value: 'x' },
		]);
	});

	it('supports multiple url buttons ordered by index', () => {
		expect(flattenTemplateParams({ tp__url_btn2: 'z', tp__url_btn0: 'x' }).urlButtonParams).toEqual([
			{ buttonIndex: 0, value: 'x' },
			{ buttonIndex: 2, value: 'z' },
		]);
	});

	it('omits empty url button values so Meta falls back to the example URL', () => {
		expect(flattenTemplateParams({ tp__url_btn0: '' }).urlButtonParams).toBeUndefined();
	});

	it('maps the header media field', () => {
		expect(flattenTemplateParams({ tp__header_media_url: 'https://x/y.png' }).headerMediaUrl).toBe(
			'https://x/y.png',
		);
	});

	it('omits parameters entirely when none are supplied', () => {
		expect(flattenTemplateParams({ tp__header_media_url: 'u' }).parameters).toBeUndefined();
	});

	it('ignores unrecognised keys', () => {
		expect(flattenTemplateParams({ notATemplateField: 'x' })).toEqual({});
	});

	it('stringifies non-string values', () => {
		expect(flattenTemplateParams({ tp__1: 42 }).parameters).toEqual(['42']);
	});

	it('treats the live cart_24 field set correctly', () => {
		expect(
			flattenTemplateParams({ tp__1: 'Rotem', tp__2: 'https://x', tp__url_btn0: 'abc' }),
		).toEqual({
			parameters: ['Rotem', 'https://x'],
			urlButtonParams: [{ buttonIndex: 0, value: 'abc' }],
		});
	});
});

describe('splitBotFieldName', () => {
	it('splits a simple template name and index', () => {
		expect(splitBotFieldName('tp__cart_24__1')).toEqual({ templateName: 'cart_24', key: '1' });
	});

	it('splits on the LAST separator so template names containing __ survive', () => {
		expect(splitBotFieldName('tp__my__tpl__2')).toEqual({ templateName: 'my__tpl', key: '2' });
	});

	it('splits a url_btn key', () => {
		expect(splitBotFieldName('tp__cart_24__url_btn0')).toEqual({
			templateName: 'cart_24',
			key: 'url_btn0',
		});
	});

	it('splits a header_media_url key, whose single underscores do not confuse the split', () => {
		expect(splitBotFieldName('tp__cart_24__header_media_url')).toEqual({
			templateName: 'cart_24',
			key: 'header_media_url',
		});
	});

	it('returns undefined for a name without the tp__ prefix', () => {
		expect(splitBotFieldName('cart_24__1')).toBeUndefined();
	});

	it('returns undefined when there is no second separator', () => {
		expect(splitBotFieldName('tp__1')).toBeUndefined();
	});
});

describe('flattenBotTemplateParams', () => {
	it('groups numbered params by template name', () => {
		expect(flattenBotTemplateParams({ tp__cart_24__1: 'a', tp__cart_24__2: 'b' })).toEqual({
			templateParams: { cart_24: ['a', 'b'] },
			passthrough: {},
		});
	});

	it('keeps separate templates separate', () => {
		expect(
			flattenBotTemplateParams({ tp__cart_24__1: 'a', tp__cart_48__1: 'b' }).templateParams,
		).toEqual({ cart_24: ['a'], cart_48: ['b'] });
	});

	it('fills gaps with empty strings', () => {
		expect(
			flattenBotTemplateParams({ tp__cart_24__1: 'a', tp__cart_24__3: 'c' }).templateParams,
		).toEqual({ cart_24: ['a', '', 'c'] });
	});

	it('passes url_btn fields through under their original flat key', () => {
		expect(flattenBotTemplateParams({ tp__cart_24__url_btn0: 'botbtn123' }).passthrough).toEqual({
			tp__cart_24__url_btn0: 'botbtn123',
		});
	});

	it('omits empty passthrough values', () => {
		expect(flattenBotTemplateParams({ tp__cart_24__url_btn0: '' }).passthrough).toEqual({});
	});

	it('handles a template name containing __ in both destinations', () => {
		expect(flattenBotTemplateParams({ tp__my__tpl__1: 'a', tp__my__tpl__url_btn0: 'b' })).toEqual({
			templateParams: { my__tpl: ['a'] },
			passthrough: { tp__my__tpl__url_btn0: 'b' },
		});
	});

	it('reproduces the verified live payload', () => {
		expect(
			flattenBotTemplateParams({
				tp__cart_24__1: 'bot-p1',
				tp__cart_24__2: 'bot-p2',
				tp__cart_24__url_btn0: 'botbtn123',
			}),
		).toEqual({
			templateParams: { cart_24: ['bot-p1', 'bot-p2'] },
			passthrough: { tp__cart_24__url_btn0: 'botbtn123' },
		});
	});
});

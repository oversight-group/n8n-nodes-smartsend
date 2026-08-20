import {
	describeApiError,
	isEnvelopeFailure,
	unwrapEnvelope,
} from '../nodes/SmartSend/transport/request';

describe('unwrapEnvelope', () => {
	it('returns data when present', () => {
		expect(unwrapEnvelope({ success: true, message: 'ok', data: [{ id: 'a' }] })).toEqual([
			{ id: 'a' },
		]);
	});

	it('returns an empty array unchanged', () => {
		expect(unwrapEnvelope({ success: true, data: [] })).toEqual([]);
	});

	it('returns the whole body when there is no data key', () => {
		expect(unwrapEnvelope({ success: true, message: 'ok' })).toEqual({
			success: true,
			message: 'ok',
		});
	});

	it('passes through non-objects', () => {
		expect(unwrapEnvelope('plain')).toBe('plain');
	});
});

describe('isEnvelopeFailure', () => {
	it('detects success:false even on a 200 response', () => {
		expect(isEnvelopeFailure({ success: false, message: 'validation failed' })).toBe(true);
	});

	it('treats success:true as fine', () => {
		expect(isEnvelopeFailure({ success: true, data: [] })).toBe(false);
	});

	it('treats a missing success key as fine', () => {
		expect(isEnvelopeFailure({ data: [] })).toBe(false);
	});
});

describe('describeApiError', () => {
	it('includes code and requestId for the 401 shape', () => {
		const msg = describeApiError(
			{
				ok: false,
				success: false,
				code: 'unauthorized',
				message: 'unknown organization',
				requestId: 'abc123',
			},
			'fallback',
		);
		expect(msg).toContain('unknown organization');
		expect(msg).toContain('unauthorized');
		expect(msg).toContain('abc123');
	});

	it('handles the bare 400 shape that has no code or requestId', () => {
		const msg = describeApiError({ success: false, message: 'validation failed' }, 'fallback');
		expect(msg).toContain('validation failed');
		expect(msg).not.toContain('undefined');
	});

	it('falls back when the body carries no message', () => {
		expect(describeApiError({}, 'fallback')).toBe('fallback');
	});

	it('falls back for a non-object body', () => {
		expect(describeApiError(null, 'fallback')).toBe('fallback');
	});
});

import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const API_PREFIX = '/integrations/make';

const DEFAULT_BASE_URL = 'https://smartsend-server.otherwise.co.il';

function asRecord(body: unknown): IDataObject | undefined {
	return typeof body === 'object' && body !== null && !Array.isArray(body)
		? (body as IDataObject)
		: undefined;
}

/**
 * The API can return HTTP 200 with `success: false`, so status alone is not a
 * sufficient check.
 */
export function isEnvelopeFailure(body: unknown): boolean {
	return asRecord(body)?.success === false;
}

export function unwrapEnvelope(body: unknown): unknown {
	const record = asRecord(body);
	if (record === undefined) return body;
	return 'data' in record ? record.data : record;
}

/**
 * Normalises the API's two inconsistent error shapes: 401 and 404 carry `code`
 * and `requestId`, whereas 400 carries only `message`.
 */
export function describeApiError(body: unknown, fallback: string): string {
	const record = asRecord(body);
	if (record === undefined) return fallback;

	const message = typeof record.message === 'string' ? record.message : undefined;
	if (message === undefined) return fallback;

	const detail: string[] = [];
	if (typeof record.code === 'string') detail.push(record.code);
	if (typeof record.requestId === 'string') detail.push(`request ${record.requestId}`);

	return detail.length > 0 ? `${message} (${detail.join(', ')})` : message;
}

export async function smartSendApiRequest(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<unknown> {
	const credentials = await ctx.getCredentials('smartSendApi');
	const configured = (credentials.baseUrl as string) || DEFAULT_BASE_URL;
	const baseUrl = configured.replace(/\/+$/, '');

	let response: unknown;
	try {
		response = await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'smartSendApi', {
			method,
			url: `${baseUrl}${API_PREFIX}${path}`,
			body,
			qs,
			json: true,
		});
	} catch (error) {
		const responseBody = (error as { response?: { body?: unknown } }).response?.body;
		const description = describeApiError(responseBody, (error as Error).message);
		throw new NodeApiError(ctx.getNode(), error as never, { message: description });
	}

	if (isEnvelopeFailure(response)) {
		const description = describeApiError(response, 'SmartSend rejected the request');
		throw new NodeApiError(ctx.getNode(), response as never, { message: description });
	}

	return unwrapEnvelope(response);
}

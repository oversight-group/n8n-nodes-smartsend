/**
 * Drives the node's REAL loadOptions, resourceMapping and execute code against
 * the live Smart Send API through a minimal fake n8n context.
 *
 * This verifies what the node UI would actually render — every dropdown and
 * every dynamic template field — without needing an n8n instance.
 *
 * Read-only: no WhatsApp message is sent. Run with:
 *   npm run verify:live
 */
import { loadOptions, resourceMapping } from '../dist/nodes/SmartSend/methods/loadOptions';
import { SmartSend } from '../dist/nodes/SmartSend/SmartSend.node';

const BASE = process.env.SMARTSEND_BASE ?? 'https://smartsend-server.otherwise.co.il';
const TOKEN = process.env.SMARTSEND_ORG_ID;

let requestCount = 0;

/** Performs the request the way n8n's authenticated helper would. */
async function httpRequestWithAuthentication(_credentialType: string, options: any) {
	requestCount += 1;
	const url = new URL(options.url);
	for (const [key, value] of Object.entries(options.qs ?? {})) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}

	const response = await fetch(url.toString(), {
		method: options.method ?? 'GET',
		headers: {
			'x-organization-id': TOKEN as string,
			...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
		},
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});

	const body = await response.json();
	if (!response.ok) {
		const error: any = new Error(body?.message ?? `HTTP ${response.status}`);
		error.response = { body };
		throw error;
	}
	return body;
}

/** Builds a fake context exposing only the surface the node touches. */
function context(params: Record<string, unknown> = {}) {
	return {
		getCredentials: async () => ({ organizationId: TOKEN, baseUrl: BASE }),
		getNode: () => ({ name: 'Smart Send', type: 'smartSend' }),
		getNodeParameter: (name: string, ...rest: unknown[]) => {
			if (name in params) return params[name];
			// Load-options context passes the fallback as the 2nd argument;
			// execute context passes itemIndex then fallback.
			return typeof rest[0] === 'number' ? rest[1] : rest[0];
		},
		getCurrentNodeParameter: (name: string) => params[name],
		getInputData: () => [{ json: {} }],
		continueOnFail: () => false,
		helpers: { httpRequestWithAuthentication },
	};
}

function line(label: string, value: string): void {
	console.log(`  ${label.padEnd(34)} ${value}`);
}

async function main(): Promise<void> {
	if (!TOKEN) {
		console.error('SMARTSEND_ORG_ID is not set. Copy .env.example to .env and fill it in.');
		process.exit(1);
	}

	const problems: string[] = [];

	console.log('\n== Credential / connection ==');
	const validate = await new SmartSend().execute.call(
		context({ resource: 'organization', operation: 'validate' }) as never,
	);
	const org = validate[0][0].json as any;
	line('organizationName', String(org.organizationName));
	line('whatsappConnected', String(org.whatsappConnected));
	if (org.whatsappConnected !== true) problems.push('WhatsApp is not connected');

	console.log('\n== Dropdowns (what each picker will show) ==');
	const dropdowns: Array<[string, keyof typeof loadOptions]> = [
		['Templates', 'getTemplates'],
		['Bots', 'getBots'],
		['Tags', 'getTags'],
		['Lists', 'getLists'],
		['Users', 'getUsers'],
		['Flag colours', 'getFlagColors'],
	];

	let lists: Array<{ name: string; value: string }> = [];
	for (const [label, method] of dropdowns) {
		const fn = loadOptions[method] as () => Promise<Array<{ name: string; value: string }>>;
		const items = await fn.call(context() as never);
		if (method === 'getLists') lists = items;
		const shown = items.length > 0 ? items.map((i) => i.name).join(', ') : '(empty)';
		line(`${label} [${items.length}]`, shown);

		for (const item of items) {
			if (item.name === '' || item.value === '') {
				problems.push(`${label}: produced an option with a blank name or value`);
			}
		}
	}

	// Flag colours must always offer the synthetic clear option.
	const colours = await loadOptions.getFlagColors.call(context() as never);
	if (!colours.some((c) => c.value === 'none')) {
		problems.push('flag colours are missing the synthetic "none" clear option');
	}

	console.log('\n== Custom fields (list-scoped) ==');
	if (lists.length === 0) {
		line('skipped', 'workspace has no lists');
	} else {
		const withoutList = await loadOptions.getCustomFields.call(context() as never);
		line('no list selected', withoutList.length === 0 ? '(empty, as expected)' : 'UNEXPECTED DATA');
		if (withoutList.length !== 0) problems.push('custom fields returned data with no list selected');

		for (const list of lists) {
			const fields = await loadOptions.getCustomFields.call(
				context({ fieldListId: list.value }) as never,
			);
			const shown = fields.length > 0 ? fields.map((f) => f.name).join(', ') : '(none defined)';
			line(`list "${list.name}" [${fields.length}]`, shown);
		}
	}

	console.log('\n== Dynamic template fields (per template) ==');
	const templates = await loadOptions.getTemplates.call(context() as never);
	for (const template of templates) {
		const schema = await resourceMapping.getTemplateFields.call(
			context({ templateName: template.value, languageCode: 'he' }) as never,
		);
		line(`${template.value} [${schema.fields.length}]`, schema.fields.map((f) => f.id).join(', '));
		if (schema.fields.length === 0) problems.push(`${template.value}: rendered no template fields`);
	}

	console.log('\n== Dynamic bot flow fields (per bot) ==');
	const bots = await loadOptions.getBots.call(context() as never);
	for (const bot of bots) {
		const schema = await resourceMapping.getBotTemplateFields.call(
			context({ botId: bot.value }) as never,
		);
		line(`${bot.name} [${schema.fields.length}]`, schema.fields.map((f) => f.id).join(', '));
		if (schema.fields.length === 0) problems.push(`${bot.name}: rendered no bot template fields`);
	}

	console.log('\n== Client-side validation (no request spent) ==');
	const before = requestCount;
	try {
		await new SmartSend().execute.call(
			context({ resource: 'message', operation: 'sendText', phoneNumber: '' }) as never,
		);
		problems.push('a send with no phone number was not rejected locally');
	} catch (error) {
		line('error message', (error as Error).message);
		if (requestCount !== before) problems.push('validation failure still issued an HTTP request');
		else line('requests spent', '0 (correct)');
	}

	console.log(`\n${requestCount} live requests made, 0 messages sent.`);
	if (problems.length > 0) {
		console.error(`\n${problems.length} problem(s):`);
		for (const problem of problems) console.error(`  - ${problem}`);
		process.exit(1);
	}
	console.log('All live UI-behaviour checks passed.\n');
}

void main();

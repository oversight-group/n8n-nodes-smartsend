/**
 * Drives the node's REAL loadOptions, resourceMapping and execute code against
 * the live Smart Send API through a minimal fake n8n context.
 *
 * This verifies what the node UI would actually render — every dropdown and
 * every dynamic template field — without needing an n8n instance.
 *
 * Read-only: no WhatsApp message is sent. Run with:
 *   npm run verify:live
 *
 * Plain ESM rather than TypeScript so that n8n's verification scanner, which
 * lints every .ts and .js file in the attested source repo with console and
 * process access forbidden, does not treat dev tooling as shipped node code.
 */
import { loadOptions, resourceMapping } from '../dist/nodes/SmartSend/methods/loadOptions.js';
import { SmartSend } from '../dist/nodes/SmartSend/SmartSend.node.js';

const BASE = process.env.SMARTSEND_BASE ?? 'https://smartsend-server.otherwise.co.il';
const TOKEN = process.env.SMARTSEND_ORG_ID;

let requestCount = 0;

/** Performs the request the way n8n's authenticated helper would. */
async function httpRequestWithAuthentication(_credentialType, options) {
	requestCount += 1;
	const url = new URL(options.url);
	for (const [key, value] of Object.entries(options.qs ?? {})) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}

	const response = await fetch(url.toString(), {
		method: options.method ?? 'GET',
		headers: {
			'x-organization-id': TOKEN,
			...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
		},
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});

	const body = await response.json();
	if (!response.ok) {
		const error = new Error(body?.message ?? `HTTP ${response.status}`);
		error.response = { body };
		throw error;
	}
	return body;
}

/** Builds a fake context exposing only the surface the node touches. */
function context(params = {}) {
	return {
		getCredentials: async () => ({ organizationId: TOKEN, baseUrl: BASE }),
		getNode: () => ({ name: 'Smart Send', type: 'smartSend' }),
		getNodeParameter: (name, ...rest) => {
			if (name in params) return params[name];
			// Load-options context passes the fallback as the 2nd argument;
			// execute context passes itemIndex first, then the fallback.
			return typeof rest[0] === 'number' ? rest[1] : rest[0];
		},
		getCurrentNodeParameter: (name) => params[name],
		getInputData: () => [{ json: {} }],
		continueOnFail: () => false,
		helpers: { httpRequestWithAuthentication },
	};
}

function line(label, value) {
	console.log(`  ${label.padEnd(34)} ${value}`);
}

async function main() {
	if (!TOKEN) {
		console.error('SMARTSEND_ORG_ID is not set. Copy .env.example to .env and fill it in.');
		process.exit(1);
	}

	const problems = [];

	console.log('\n== Credential / connection ==');
	const validate = await new SmartSend().execute.call(
		context({ resource: 'organization', operation: 'validate' }),
	);
	const org = validate[0][0].json;
	line('organizationName', String(org.organizationName));
	line('whatsappConnected', String(org.whatsappConnected));
	if (org.whatsappConnected !== true) problems.push('WhatsApp is not connected');

	console.log('\n== Dropdowns (what each picker will show) ==');
	const dropdowns = [
		['Templates', 'getTemplates'],
		['Bots', 'getBots'],
		['Tags', 'getTags'],
		['Lists', 'getLists'],
		['Users', 'getUsers'],
		['Flag colours', 'getFlagColors'],
	];

	let lists = [];
	for (const [label, method] of dropdowns) {
		const items = await loadOptions[method].call(context());
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
	const colours = await loadOptions.getFlagColors.call(context());
	if (!colours.some((c) => c.value === 'none')) {
		problems.push('flag colours are missing the synthetic "none" clear option');
	}

	console.log('\n== Custom fields (list-scoped) ==');
	if (lists.length === 0) {
		line('skipped', 'workspace has no lists');
	} else {
		const withoutList = await loadOptions.getCustomFields.call(context());
		line('no list selected', withoutList.length === 0 ? '(empty, as expected)' : 'UNEXPECTED DATA');
		if (withoutList.length !== 0) problems.push('custom fields returned data with no list selected');

		for (const list of lists) {
			const fields = await loadOptions.getCustomFields.call(context({ fieldListId: list.value }));
			const shown = fields.length > 0 ? fields.map((f) => f.name).join(', ') : '(none defined)';
			line(`list "${list.name}" [${fields.length}]`, shown);
		}
	}

	console.log('\n== Dynamic template fields (per template) ==');
	const templates = await loadOptions.getTemplates.call(context());
	for (const template of templates) {
		const schema = await resourceMapping.getTemplateFields.call(
			context({ templateName: template.value, languageCode: 'he' }),
		);
		line(`${template.value} [${schema.fields.length}]`, schema.fields.map((f) => f.id).join(', '));
		if (schema.fields.length === 0) problems.push(`${template.value}: rendered no template fields`);
	}

	console.log('\n== Dynamic bot flow fields (per bot) ==');
	const bots = await loadOptions.getBots.call(context());
	for (const bot of bots) {
		const schema = await resourceMapping.getBotTemplateFields.call(context({ botId: bot.value }));
		line(`${bot.name} [${schema.fields.length}]`, schema.fields.map((f) => f.id).join(', '));
		if (schema.fields.length === 0) problems.push(`${bot.name}: rendered no bot template fields`);
	}

	console.log('\n== Client-side validation (no request spent) ==');
	const before = requestCount;
	try {
		await new SmartSend().execute.call(
			context({ resource: 'message', operation: 'sendText', phoneNumber: '' }),
		);
		problems.push('a send with no phone number was not rejected locally');
	} catch (error) {
		line('error message', error.message);
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

await main();

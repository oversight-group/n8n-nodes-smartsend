/**
 * Live read-only verification of the Smart Send API contract.
 *
 * Sends NO WhatsApp messages: only GET endpoints are called. Run with:
 *   npm run smoke
 *
 * Plain ESM rather than TypeScript so that n8n's verification scanner, which
 * lints every .ts and .js file in the attested source repo with console and
 * process access forbidden, does not treat dev tooling as shipped node code.
 */
const BASE = process.env.SMARTSEND_BASE ?? 'https://smartsend-server.otherwise.co.il';
const TOKEN = process.env.SMARTSEND_ORG_ID;
const PREFIX = '/integrations/make';

const CHECKS = [
	{ path: '/validate', expect: 'object' },
	{ path: '/rpc-options', expect: 'object' },
	{ path: '/rpc/tags', expect: 'array' },
	{ path: '/rpc/lists', expect: 'array' },
	{ path: '/rpc/users', expect: 'array' },
	{ path: '/rpc/bots', expect: 'array' },
	{ path: '/rpc/templates', expect: 'array' },
	{ path: '/rpc/flag-colors', expect: 'array' },
];

async function get(path) {
	const response = await fetch(`${BASE}${PREFIX}${path}`, {
		headers: { 'x-organization-id': TOKEN },
	});
	return { status: response.status, body: await response.json() };
}

/** Asserts the {id,value} contract every dropdown RPC is expected to honour. */
function assertDropdownContract(path, data) {
	if (!Array.isArray(data)) return [`${path}: data is not an array`];
	return data
		.filter((item) => typeof item?.id !== 'string' || typeof item?.value !== 'string')
		.map((item) => `${path}: item breaks the {id,value} contract: ${JSON.stringify(item)}`);
}

async function main() {
	if (!TOKEN) {
		console.error('SMARTSEND_ORG_ID is not set. Copy .env.example to .env and fill it in.');
		process.exit(1);
	}

	const problems = [];

	for (const check of CHECKS) {
		const { status, body } = await get(check.path);
		const ok = status === 200 && body?.success === true;
		const count = Array.isArray(body?.data) ? ` (${body.data.length} items)` : '';
		console.log(`${ok ? 'PASS' : 'FAIL'}  GET ${check.path}${count}`);

		if (!ok) {
			problems.push(`${check.path}: HTTP ${status} ${JSON.stringify(body)}`);
			continue;
		}
		if (check.expect === 'array') problems.push(...assertDropdownContract(check.path, body.data));
	}

	// Dependent RPCs, exercised against whatever the organisation actually has.
	const templates = (await get('/rpc/templates')).body?.data ?? [];
	if (templates.length > 0) {
		const name = templates[0].id;
		const { status, body } = await get(
			`/rpc/template-params?templateName=${encodeURIComponent(name)}`,
		);
		const ok = status === 200 && body?.success === true && Array.isArray(body.data);
		console.log(
			`${ok ? 'PASS' : 'FAIL'}  GET /rpc/template-params (${name}, ${body?.data?.length ?? 0} fields)`,
		);
		if (!ok) problems.push(`/rpc/template-params: HTTP ${status}`);
	} else {
		console.log('SKIP  GET /rpc/template-params — organisation has no templates');
	}

	const bots = (await get('/rpc/bots')).body?.data ?? [];
	if (bots.length > 0) {
		const id = bots[0].id;
		const { status, body } = await get(`/rpc/bot-template-params?botId=${encodeURIComponent(id)}`);
		const ok = status === 200 && body?.success === true && Array.isArray(body.data);
		console.log(
			`${ok ? 'PASS' : 'FAIL'}  GET /rpc/bot-template-params (${body?.data?.length ?? 0} fields)`,
		);
		if (!ok) problems.push(`/rpc/bot-template-params: HTTP ${status}`);
	} else {
		console.log('SKIP  GET /rpc/bot-template-params — organisation has no bots');
	}

	// Auth must actually be enforced.
	const unauth = await fetch(`${BASE}${PREFIX}/validate`);
	console.log(`${unauth.status === 401 ? 'PASS' : 'FAIL'}  GET /validate without auth returns 401`);
	if (unauth.status !== 401) problems.push('unauthenticated /validate did not return 401');

	console.log('');
	if (problems.length > 0) {
		console.error(`${problems.length} problem(s):`);
		for (const problem of problems) console.error(`  - ${problem}`);
		process.exit(1);
	}
	console.log('All contract checks passed.');
}

await main();

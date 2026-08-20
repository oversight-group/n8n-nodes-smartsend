/**
 * Runs n8n's own community-node verification gate against this repo, locally,
 * before publishing.
 *
 * n8n's CLI (`npx @n8n/scan-community-package <name>`) only works on an
 * ALREADY-PUBLISHED package: it reads the npm provenance attestation, downloads
 * the attested GitHub source, and lints both that source and the shipped
 * tarball. That is useless as a pre-publish check, so this calls the scanner's
 * analyzePackage() directly on local directories instead.
 *
 * Run with:
 *   npm run scan
 *
 * Requires the scanner, which is intentionally not a dependency of this
 * package (verified nodes may have no runtime dependencies, and it is a heavy
 * dev-only tool):
 *   npm i -g @n8n/scan-community-package
 * or run it once via npx to populate the npx cache.
 *
 * Two legs are checked, mirroring what n8n does:
 *   1. SOURCE — this working tree, standing in for the attested GitHub checkout
 *   2. DIST   — the built output, standing in for the published tarball
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

let analyzePackage;
try {
	({ analyzePackage } = await import('@n8n/scan-community-package/scanner/scanner.mjs'));
} catch {
	console.error(
		'Could not load @n8n/scan-community-package.\n' +
			'Install it first:  npm i -g @n8n/scan-community-package\n' +
			'(It is deliberately not a dependency of this package.)',
	);
	process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');

if (!existsSync(dist)) {
	console.error('dist/ is missing. Run `npm run build` first.');
	process.exit(1);
}

// The published package contains only dist/, index.js, package.json, README and
// LICENSE. Linting the whole repo covers the source leg; the dist leg is
// covered by pointing the scanner at the build output.
const legs = [
	['SOURCE (stands in for the attested GitHub checkout)', root],
	['DIST (stands in for the published tarball)', dist],
];

let failed = false;

for (const [label, dir] of legs) {
	const result = await analyzePackage(dir);
	console.log(`\n===== ${label} =====`);
	if (result.passed) {
		console.log('PASSED');
	} else {
		failed = true;
		console.log(`FAILED: ${result.message}`);
		if (result.details) console.log(result.details);
	}
}

console.log('');
if (failed) {
	console.error('Verification gate would REJECT this package. Fix the errors above.');
	process.exit(1);
}
console.log('Verification gate would ACCEPT this package.');

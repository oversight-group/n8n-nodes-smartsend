# Publishing `n8n-nodes-smartsend` to npm

A step-by-step guide to publishing this package and getting it verified by n8n so it becomes
installable from the n8n Community Nodes UI — and on n8n Cloud.

## Why the pipeline looks the way it does

**Since 1 May 2026, n8n will not verify a node that was published from a local machine.** Verified
community nodes must be published by GitHub Actions with an npm **provenance attestation** — a
cryptographic statement tying the published tarball to a specific public repository and commit.
n8n's scanner reads that attestation, downloads the attested source from GitHub, and lints *both*
the source and the shipped tarball.

That has three consequences:

1. The code must live in a **public GitHub repository**.
2. Publishing happens by **creating a GitHub Release**, never `npm publish` from your laptop.
3. The **whole repository** must pass n8n's lint gate — not just the shipped files. This is why the
   dev scripts in `scripts/` are plain `.mjs` rather than TypeScript: the gate lints every `.ts` and
   `.js` file in the repo with `console` and `process` forbidden, and it ignores inline
   eslint-disable comments.

## Current state

| Requirement | Status |
|---|---|
| Package name starts with `n8n-nodes-` | ✅ `n8n-nodes-smartsend` |
| Name available on npm | ✅ unregistered as of 2026-08-20 |
| Keyword `n8n-community-node-package` | ✅ |
| **Zero runtime dependencies** | ✅ `dependencies: {}` |
| MIT licence | ✅ |
| TypeScript, strict | ✅ |
| One third-party service per package | ✅ Smart Send only |
| No env-var or filesystem access in shipped code | ✅ verified |
| English-only node interface | ✅ |
| README with auth + usage | ✅ |
| Distinct light/dark icons | ✅ node and credential |
| Passes n8n's verification scan | ✅ both legs — run `npm run scan` |
| GitHub Actions provenance workflow | ✅ `.github/workflows/publish.yml` |
| `repository` / `homepage` / `bugs` fields | ❌ **you must set these** — step 1 |
| Public GitHub repo | ❌ **you must create it** — step 1 |

---

## Step 1 — Create the GitHub repository

The repo must be **public**, and the `repository` URL in `package.json` must match it.

```bash
gh repo create <your-account>/n8n-nodes-smartsend --public --source=. --remote=origin --push
```

Then add the three metadata fields to `package.json`, replacing `<your-account>`:

```json
  "homepage": "https://github.com/<your-account>/n8n-nodes-smartsend#readme",
  "bugs": { "url": "https://github.com/<your-account>/n8n-nodes-smartsend/issues" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<your-account>/n8n-nodes-smartsend.git"
  },
```

Verify and commit:

```bash
npm run scan
git add package.json && git commit -m "chore: add repository metadata" && git push
```

## Step 2 — Create an npm account and a publish token

1. Sign up at [npmjs.com](https://www.npmjs.com/signup) if you do not have an account.
2. **Enable two-factor authentication** (Account → Two-Factor Authentication). Required for
   publishing, and npm's automation tokens depend on it.
3. Create a token: **Access Tokens → Generate New Token → Granular Access Token**.
   - Expiry: whatever your policy allows
   - Packages and scopes: **Read and write**
   - Select package: `n8n-nodes-smartsend` (or "all packages" for the very first publish, since the
     package does not exist yet)
4. Copy the token. You will not see it again.

## Step 3 — Add the token to GitHub

In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

- Name: `NPM_TOKEN`
- Value: the token from step 2

> **Alternative worth considering:** npm supports *trusted publishing* via OIDC, which removes the
> long-lived token entirely — you register the GitHub repo and workflow on the npm package settings
> page and drop the `NODE_AUTH_TOKEN` env line from the workflow. Fewer secrets to leak. The token
> route below is the more widely documented one, so start there if you want the shortest path.

## Step 4 — Publish

Publishing is triggered by a GitHub Release, not by a local command.

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes "First release."
```

The workflow then runs `npm ci --ignore-scripts`, `build`, `test`, `lint`, and
`npm publish --provenance --access public`.

Watch it:

```bash
gh run watch
```

Then confirm the provenance attestation exists — this is what n8n checks:

```bash
npm view n8n-nodes-smartsend
curl -s https://registry.npmjs.org/-/npm/v1/attestations/n8n-nodes-smartsend@0.1.0 | head -c 400
```

The npm package page should show a **"Provenance"** section naming your repo and commit. If it does
not, verification will be rejected — check that the workflow has `id-token: write` permission.

## Step 5 — Install it in n8n

Once published, any self-hosted n8n can install it by name:

**Settings → Community Nodes → Install** → `n8n-nodes-smartsend`

If your instance refuses unverified packages, set:

```bash
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
```

The second one's default is changing to `false` in a future n8n version, so set it explicitly rather
than relying on today's behaviour.

## Step 6 — Submit for verification

Verification is what makes the node installable on **n8n Cloud** and listed in n8n's directory.

1. Re-run the gate one final time: `npm run scan` — both legs must pass.
2. Confirm the published package has a provenance attestation (step 4).
3. Go to the [n8n Creator Portal](https://creators.n8n.io/nodes), sign up or log in, and submit the
   package for verification.

Then wait for n8n's review.

---

## Things to know before you publish

**Publishing is effectively permanent.** You cannot republish the same version number. Unpublishing
is only possible within 72 hours and is discouraged; after that the version is immutable. Get
`npm run scan` green *before* releasing, not after.

**Your email becomes public.** `package.json` currently declares
`"author": { "email": "rotem@oversight.co.il" }`, and that is published in the package metadata and
visible on npm forever. Remove the email, or substitute a role address, if you would rather not have
it scraped.

**n8n can decline.** The docs state n8n reserves discretion to reject nodes that compete with its
paid or enterprise features. A WhatsApp integration for a third-party service is not in that
category, but the discretion exists.

**One known deviation from n8n's advice.** n8n strongly suggests scaffolding new nodes with their
`n8n-node` CLI tool. This package was built by hand instead. It passes the automated gate — which is
what the scan enforces — but a human reviewer could still comment on structure. If that becomes a
sticking point, the fix is mechanical: scaffold a fresh package with the CLI and move
`nodes/SmartSend/` and `credentials/` across.

**Two non-blocking warnings remain**, visible if you inspect the scan output closely:

- `require-homepage` — resolved by step 1.
- `credential-unnecessary-password` — the gate's heuristic thinks a field named `organizationId`
  is not a secret, so it questions `password: true`. It *is* a secret (it is the auth token), so
  keeping `password: true` is correct and the warning is a false positive. Renaming the field to
  something like `organizationToken` would silence it and arguably reads better given how easily
  the token is confused with the short workspace code — but it is a breaking change for anyone who
  has already saved the credential, so it is only free to do *before* the first publish.

## Version bumps later

```bash
npm version patch      # or minor / major
git push --follow-tags
gh release create v<new-version> --generate-notes
```

Each release triggers the same provenance-attested publish.

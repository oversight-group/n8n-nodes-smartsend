# Publishing `n8n-nodes-smartsend` to npm

A step-by-step guide to publishing this package so it is installable on self-hosted n8n.

## Read this first: the licence decision rules out verification

This package is licensed **GPL-3.0-or-later**. n8n's verified-community-node programme
**requires MIT**. This is not soft guidance — it is a hard failure in n8n's own automated gate:

```
package.json  error  Update the `license` key to MIT in package.json
                     n8n-nodes-base/community-package-json-license-not-default
```

(Reproduce it any time with `npm run scan`.)

### What that means in practice

| | GPL-3.0-or-later (current) | MIT |
|---|---|---|
| Publish to npm | ✅ | ✅ |
| Install on **self-hosted** n8n | ✅ | ✅ |
| Submit for n8n verification | ❌ rejected | ✅ eligible |
| Available on **n8n Cloud** | ❌ | ✅ once verified |
| Listed in n8n's node directory | ❌ | ✅ once verified |

The requirement is very unlikely to be waived. Community nodes are loaded into the n8n process and
redistributed by n8n Cloud, so a strong copyleft licence would create obligations for n8n itself.
That is almost certainly why MIT is mandated rather than merely preferred.

**If Cloud availability matters, the licence has to be MIT.** If it does not — you self-host, or you
distribute internally — GPL-3.0 costs you nothing that you are actually using, and everything below
still works. Steps 1 through 5 apply either way; only step 6 (verification) is closed off.

`npm run lint` deliberately suppresses the licence rule so the CI publish job is not blocked by a
settled decision. `npm run scan` still reports it, because that command answers a different
question — "would n8n verify this?" — and the honest answer is no.

## Why the pipeline looks the way it does

**Since 1 May 2026, n8n will not verify a node that was published from a local machine.** Verified
nodes must be published by GitHub Actions with an npm **provenance attestation** — a cryptographic
statement tying the tarball to a specific public repository and commit.

Provenance is worth keeping even without verification: it is a supply-chain guarantee for anyone
installing the package, and it shows as a "Provenance" badge on the npm page. The workflow in
`.github/workflows/publish.yml` already does this.

It also explains a structural choice: the gate lints the **whole repository**, not just shipped
files, with `console` and `process` forbidden, and it ignores inline eslint-disable comments. That is
why the dev scripts in `scripts/` are plain `.mjs` rather than TypeScript.

## Current state

| Requirement | Status |
|---|---|
| Package name starts with `n8n-nodes-` | ✅ `n8n-nodes-smartsend` |
| Name available on npm | ✅ unregistered as of 2026-08-20 |
| Keyword `n8n-community-node-package` | ✅ |
| **Zero runtime dependencies** | ✅ `dependencies: {}` |
| Licence | ⚠️ GPL-3.0-or-later — blocks verification by design |
| TypeScript, strict | ✅ |
| One third-party service per package | ✅ Smart Send only |
| No env-var or filesystem access in shipped code | ✅ verified |
| English-only node interface | ✅ |
| README with auth + usage | ✅ |
| Distinct light/dark icons | ✅ node and credential |
| `repository` / `homepage` / `bugs` | ✅ `oversight-group/n8n-nodes-smartsend` |
| GitHub Actions provenance workflow | ✅ `.github/workflows/publish.yml` |
| Passes n8n verification scan | ❌ licence only — everything else passes |
| Public GitHub repo | ❌ **you must create it** — step 1 |
| npm account + `NPM_TOKEN` secret | ❌ **you must create these** — steps 2–3 |

---

## Step 1 — Create the GitHub repository

Provenance requires a **public** repo whose URL matches `repository` in `package.json` (already set
to `oversight-group/n8n-nodes-smartsend`). The git remote is already configured:

```bash
git remote -v   # origin  git@github.com:oversight-group/n8n-nodes-smartsend.git
```

Create the repo under the org and push:

```bash
gh repo create oversight-group/n8n-nodes-smartsend --public --source=. --push
```

If the repo already exists, just push:

```bash
git push -u origin master
```

> Provenance will fail on a **private** repo. If the repo must stay private, drop `--provenance` from
> the workflow — you lose the attestation badge but publishing still works.

## Step 2 — Create an npm account and a publish token

1. Sign up at [npmjs.com](https://www.npmjs.com/signup) if needed. For an org package, consider an
   npm **organisation** so ownership is not tied to one person's account.
2. **Enable two-factor authentication** (Account → Two-Factor Authentication).
3. Create a token: **Access Tokens → Generate New Token → Granular Access Token**
   - Permissions: **Read and write**
   - Scope: "All packages" for the first publish (the package does not exist yet), then narrow it to
     `n8n-nodes-smartsend` afterwards
4. Copy the token — it is shown once.

## Step 3 — Add the token to GitHub

Repo **Settings → Secrets and variables → Actions → New repository secret**

- Name: `NPM_TOKEN`
- Value: the token from step 2

> **Better alternative:** npm supports *trusted publishing* via OIDC, which removes the long-lived
> token entirely. You register the repo and workflow on the npm package settings page and delete the
> `NODE_AUTH_TOKEN` line from the workflow. Fewer secrets to leak, but it needs the package to exist
> first — so it is a good step-two after the initial publish.

## Step 4 — Publish

Publishing is triggered by a GitHub Release, never by a local command.

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes "First release."
```

The workflow runs `npm ci --ignore-scripts`, `build`, `test`, `lint`, then
`npm publish --provenance --access public`.

Watch it and confirm the result:

```bash
gh run watch
npm view n8n-nodes-smartsend
curl -s https://registry.npmjs.org/-/npm/v1/attestations/n8n-nodes-smartsend@0.1.0 | head -c 400
```

The npm page should show a **Provenance** section naming the repo and commit. If it does not, check
the workflow has `id-token: write` permission.

## Step 5 — Install it in n8n

**Settings → Community Nodes → Install** → `n8n-nodes-smartsend`

Unverified packages need these on the instance:

```bash
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
```

The second one's default is changing to `false` in a future n8n version, so set it explicitly.

Because this package is not verified, this is the **only** install route — the n8n Cloud
community-node catalogue will not offer it.

## Step 6 — Verification (closed off by the GPL licence)

Not available while the licence is GPL-3.0-or-later. If you later decide Cloud availability is worth
more than copyleft, the switch is small:

1. Set `"license": "MIT"` in `package.json`.
2. Replace `LICENSE` with the MIT text.
3. Remove the `community-package-json-license-not-default` override from `.eslintrc.js`.
4. `npm run scan` — should pass both legs.
5. Publish a new version, then submit at the [n8n Creator Portal](https://creators.n8n.io/nodes).

Relicensing away from GPL requires the agreement of every copyright holder, so it is easiest to
decide before accepting outside contributions.

---

## Things to know before you publish

**Publishing is effectively permanent.** You cannot republish a version number. Unpublishing is
possible only within 72 hours and is discouraged.

**Your email becomes public.** `package.json` declares `"author": { "email": "rotem@oversight.co.il" }`
and that is published to npm metadata permanently. Substitute a role address if you would rather not
have it scraped.

**GPL-3.0 source headers.** The GPL recommends, though does not require, a short licence header at
the top of each source file. Worth adding if you want the licence to travel with copied code.

**A remaining non-blocking warning.** The scan warns that a field named `organizationId` does not
look like a secret, so it questions `password: true`. It *is* a secret — it is the auth token — so
`password: true` is correct and the warning is a false positive. Renaming the field to
`organizationToken` would silence it and read better, given how easily the token is confused with
the short workspace code, but it breaks any already-saved credential. Free to do only before the
first publish.

## Version bumps later

```bash
npm version patch      # or minor / major
git push --follow-tags
gh release create v<new-version> --generate-notes
```

Each release triggers the same provenance-attested publish.

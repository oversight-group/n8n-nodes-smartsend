# n8n-nodes-smartsend

An [n8n](https://n8n.io) community node for [Smart Send](https://docs.smartsend.co.il) V2 — WhatsApp
automation from your n8n workflows.

- **22 operations** across 9 resources: messages, conversations, tags, lists, custom fields, bot
  flows, blacklist, push notifications
- **Real dropdowns**, not hand-typed IDs. Templates, bots, tags, lists, users, flag colours and
  custom fields are all loaded live from your Smart Send workspace
- **Dynamic template variables.** Pick an approved WhatsApp template and the node renders one
  labelled input per variable, including dynamic URL-button values and header media
- **Precise errors.** Smart Send's API returns a bare `validation failed` with no field name, so
  this node validates required fields locally and tells you exactly which one is missing
- **Usable as an AI Agent tool**

## Installation

In n8n, go to **Settings → Community Nodes → Install** and enter:

```
n8n-nodes-smartsend
```

For a manual install into a self-hosted instance:

```bash
cd ~/.n8n/nodes && npm install n8n-nodes-smartsend
```

## Credentials

Create a **Smart Send API** credential with two fields:

| Field | Value |
|---|---|
| Organization Token | Your Smart Send integration token |
| Base URL | Leave as-is unless developing locally |

> **⚠️ Use the token, not the short workspace code.**
>
> Smart Send shows you two values. The short one (something like `a1b2c3d4`) is **not** what this
> credential wants — supplying it fails with `unknown organization`. Use the long token (a
> 25-character value). Click **Test** on the credential; a success also confirms your WhatsApp
> connection is live.

## Operations

| Resource | Operations |
|---|---|
| **Message** | Send Text · Send Template · Send Template with File |
| **Conversation** | Resolve or Create · Update Display Name · Assign User · Create Note · Set Flag |
| **Tag** | Add to Conversation · Remove from Conversation · Clear All from Conversation |
| **List** | Add to Conversation · Clear All from Conversation · Add Recipient · Remove Recipient |
| **Custom Field** | Set Value · Set Multiple Values |
| **Bot** | Trigger Flow |
| **Blacklist** | Add Number · Remove Number |
| **Notification** | Send Push |
| **Organization** | Validate |

Phone numbers are accepted in any format (`972…`, `05…`, `+972…`) — Smart Send normalises them
server-side, so no formatting is required on your end.

### Template parameters

Select a template and the node calls Smart Send's template-parameters endpoint to render a labelled
field per variable:

| What you see | Where it goes |
|---|---|
| Parameter 1, Parameter 2, … | `{{1}}`, `{{2}}` in the template body |
| Button #1 URL Value | The `{{1}}` inside a dynamic URL button |
| Header media URL | Overrides the template's default header image or document |

Leaving a URL-button value empty makes the button fall back to Meta's example URL rather than
resolving to a broken link.

**Limitation:** the field list is fetched using the *selected* template name. If you compute the
template name at runtime with an expression, the node cannot know which fields to render and the
parameter area stays empty. Everything else works normally.

### Send Template with File

Point **Input Binary Field** at a binary property on the incoming item (default `data`). The node
base64-encodes it and derives the file name from the binary metadata unless you override it.

## Known Smart Send API quirks

These are properties of the upstream API, documented here so the behaviour isn't mistaken for a bug
in this node.

- **Empty dropdowns are normal.** The RPC endpoints return `success: true` with an empty array
  rather than an error. An empty Tags, Lists or Users dropdown means your workspace has none yet.
- **Validation errors carry no detail.** A rejected request returns only
  `{"success": false, "message": "validation failed"}` — no field name, no error code. This node
  therefore checks required fields before sending so you get a useful message.
- **Custom fields are sourced per list.** The API exposes custom-field definitions only per list,
  while the set-value endpoints take a bare field ID. The node offers a **Field Source** choice:
  pick *From List* to browse definitions, or *By Name* to name the field directly.
- **`success: false` can arrive with HTTP 200.** The node checks the envelope, not just the status.

## Development

```bash
npm install --ignore-scripts
npm run build
npm test
```

`--ignore-scripts` matters: `n8n-workflow` pulls in `isolated-vm`, a native module that needs Visual
Studio build tools on Windows. Only its TypeScript types are needed here, so skipping the native
build is safe.

`npm test` never touches the network. To verify the live API contract against a real workspace, copy
`.env.example` to `.env`, fill in your token, and run:

```bash
npm run smoke        # asserts the API contract: envelopes, {id,value}, auth enforcement
npm run verify:live  # drives the node's own dropdown and template-field code
```

Both hit read-only endpoints only and send no WhatsApp messages. `verify:live` is the more useful
of the two while developing — it prints exactly what every dropdown and every dynamic template
field will render in the UI, so you can check the node's behaviour without clicking through n8n.

### Testing in a real n8n

```bash
npm run build
mkdir -p ~/.n8n/nodes && cd ~/.n8n/nodes && npm install /path/to/this/repo
docker run -it --rm -p 5678:5678 -v "$HOME/.n8n:/home/node/.n8n" docker.n8n.io/n8nio/n8n
```

Then open http://localhost:5678.

## Publishing

See [docs/PUBLISHING.md](docs/PUBLISHING.md) for the full route to npm and n8n verification.
Run `npm run scan` to check the package against n8n's real verification gate before releasing.

## License

[GPL-3.0-or-later](LICENSE)

Note: n8n's verified-community-node programme requires an MIT licence, so this package can be
published to npm and installed on self-hosted n8n, but is not eligible for verification or for
n8n Cloud. See [docs/PUBLISHING.md](docs/PUBLISHING.md).

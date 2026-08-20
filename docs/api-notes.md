# Smart Send V2 API — verified notes and node design

**Date:** 2026-08-20
**Status:** implemented
**Package:** `n8n-nodes-smartsend`

## 1. Goal

Ship a working, publishable n8n community node package that exposes the Smart Send V2
public HTTP API (the "Make.com integration" API) as first-class n8n operations, with real
dropdowns sourced from Smart Send's RPC endpoints and dynamically rendered WhatsApp
template variables.

Success criteria:

1. `npm run build` produces a package installable into n8n as a community node.
2. Every one of the 21 documented POST actions is reachable from the node UI.
3. Selecting a WhatsApp template renders one labelled input per template variable.
4. Dropdowns for tags, lists, users, bots, templates, flag colours and custom fields are
   populated from the live API rather than typed by hand.
5. Unit tests cover every request-body builder and both template flatteners.
6. Live smoke test against a real organisation passes for all read-only endpoints.

## 2. Verified API facts

All facts in this section were confirmed against the live production API on 2026-08-20,
not merely read from the documentation.

### 2.1 Base URL and authentication

- Production base: `https://smartsend-server.otherwise.co.il`
- Local development base: `http://localhost:3091`
- Path prefix: `/integrations/make`
- Auth: a single header, `x-organization-id`.

**Important discrepancy.** Smart Send's UI presents two values: a short workspace code
(e.g. `a1b2c3d4`) and a longer token (a 25-character cuid). The value `x-organization-id`
requires is **the token**, not the short code. Passing the short code returns
`401 unknown organization`. No bearer token or other header is needed.

The internal organisation UUID returned by `/validate` is a third, different value and is
informational only.

Consequence for the credential UI: the field must be labelled to make clear that the token
is wanted, with hint text naming the failure mode.

### 2.2 Success envelope

```json
{ "success": true, "message": "...", "data": "..." }
```

`data` is an array for RPC endpoints, an object for `/validate`, and varies for actions.
The transport layer unwraps `data` and returns it as the node's JSON output.

### 2.3 Error envelopes — inconsistent, must handle both shapes

| Status | Body |
|---|---|
| 401 | `{"ok":false,"success":false,"code":"unauthorized","message":"unknown organization","requestId":"..."}` |
| 404 | `{"ok":false,"success":false,"code":"not_found","message":"route not found","requestId":"..."}` |
| 400 | `{"success":false,"message":"validation failed"}` |

The 400 shape carries **no `code`, no `requestId`, and no field-level detail**. The server
will not say which field was wrong.

**This drives a core requirement:** the node validates required fields client-side and
raises its own precise, field-naming errors before issuing the request. Relying on server
validation would leave users with an undiagnosable "validation failed".

### 2.4 RPC endpoints never fail on bad input

`/rpc/custom-fields` with a bogus `listId`, with no `listId` at all, and
`/rpc/template-params` with a non-existent template name all return
`200 {"success":true,"data":[]}`.

**Consequence:** `loadOptions` must treat an empty array as a normal, expected result and
never throw. An empty dropdown is valid state.

### 2.5 Dropdown item contract

Every one of the nine RPC dropdown endpoints returns `data: [{ id, value }]` where `id` is
the machine key and `value` is the human-readable label. The n8n mapping is therefore
uniformly:

```ts
{ name: item.value, value: item.id }
```

Verified examples: `{"id":"cart_24","value":"cart_24 (he)"}`,
`{"id":"bot-uuid","value":"תהליך חדש"}`, `{"id":"red","value":"red"}`.

Flag colours returned live are `red`, `orange`, `green`. The documented enum also allows
`none` to clear the flag; `none` is **not** returned by the RPC and must be added by the
node as a synthetic "Clear flag" choice.

### 2.6 Template parameter RPCs — both return the same flat shape

`/rpc/template-params?templateName=X[&languageCode=he]` returns `[{ name, label }]`:

```json
[ {"name":"tp__1","label":"Parameter 1"},
  {"name":"tp__2","label":"Parameter 2"},
  {"name":"tp__url_btn0","label":"Button #1 URL Value"} ]
```

`/rpc/bot-template-params?botId=X` returns **the same flat `{name,label}` shape**, with the
template name embedded in the field name:

```json
[ {"name":"tp__cart_24__1","label":"cart_24 - Parameter 1"},
  {"name":"tp__cart_24__url_btn0","label":"cart_24 - Button #1 URL Value"} ]
```

The OpenAPI specification documents a different, nested shape
(`{templateName, language, paramCount, params:[{index,hint}]}`) for `bot-template-params`.
**The specification is wrong.** Implement against the flat shape observed live.

### 2.7 Action response shapes (verified by live send)

The OpenAPI spec documents no response bodies for the action endpoints. Observed live:

| Endpoint | `data` shape |
|---|---|
| `/messages/send-text` | `{ conversation: {...}, message: {...} }` — full records, ~30 fields each |
| `/messages/send-template` | `{ conversation: {...}, message: {...} }`; `message.metadata` echoes the resolved `components`, `parameters`, `languageCode`, `templateName` |
| `/flows/send` | `{ conversationId, botId, flowTriggered }` |

Phone numbers are normalised server-side: `+972500000000` is stored and echoed as
`972500000000`. The node passes user input through unchanged and lets the server normalise,
so no client-side phone parsing is needed.

`message.status` comes back as `sent`, and `sentByUserId`/`sentByUserName` default to
`api`/`API` when not supplied.

### 2.8 URL button semantics (verified)

`cart_24` has two buttons: index 0 has a URL containing `{{1}}`, index 1 is static. The
`/rpc/template-params` response exposed only `tp__url_btn0`. This confirms two things:

1. The RPC surfaces only buttons whose URL contains a `{{1}}` placeholder.
2. `buttonIndex` is the button's position in the template's **full** buttons array, so the
   `tp__url_btn<N>` → `{ buttonIndex: N }` mapping in §6.1 is correct as written.

A live send with `parameters: ["n8n-test-p1","n8n-test-p2"]` substituted correctly into
`{{1}}` and `{{2}}`, confirming the documented `parameters` array is the right payload for
`/messages/send-template`.

## 3. Package structure

```
n8n-nodes-smartsend/
├── package.json                 # n8n.credentials + n8n.nodes manifest
├── tsconfig.json
├── gulpfile.js                  # icon copy to dist (n8n starter convention)
├── .eslintrc.js                 # eslint-plugin-n8n-nodes-base, community ruleset
├── .gitignore                   # includes .env
├── LICENSE                      # MIT
├── README.md
├── credentials/
│   └── SmartSendApi.credentials.ts
├── nodes/SmartSend/
│   ├── SmartSend.node.ts        # description assembly + execute loop
│   ├── SmartSend.node.json      # codex metadata (docs links, categories)
│   ├── smartsend.svg            # node icon
│   ├── transport/request.ts     # auth, envelope unwrap, error mapping
│   ├── operations/registry.ts   # resource:operation -> { endpoint, buildBody, required }
│   ├── operations/templates.ts  # flattenTemplateParams / flattenBotTemplateParams
│   ├── descriptions/            # one file per resource
│   │   ├── message.ts  conversation.ts  tag.ts  list.ts
│   │   └── customField.ts  bot.ts  blacklist.ts  notification.ts  organization.ts
│   └── methods/loadOptions.ts   # dropdown loaders + resourceMapper schemas
├── test/                        # jest unit tests
└── scripts/smoke.ts             # live read-only verification against real org
```

### 3.1 Why an operation registry

`operations/registry.ts` maps each `resource:operation` to a plain object:

```ts
{ endpoint: '/messages/send-text',
  required: ['phoneNumber', 'message'],
  buildBody: (p: Params) => ({ /* ... */ }) }
```

`buildBody` is a **pure function** taking plain objects and returning plain objects. It
never touches `IExecuteFunctions`. This is the single most important structural decision in
the package: it gives the brevity of n8n's declarative routing style while keeping every
operation unit-testable with no n8n runtime, no HTTP, and no mocking beyond plain data. The
node's `execute` becomes a thin loop that reads parameters, calls `buildBody`, and posts
the result.

## 4. Credential design

`SmartSendApi.credentials.ts`

| Field | Type | Notes |
|---|---|---|
| `organizationToken` | string, `password: true` | The **token**, not the short workspace code. Hint text states this explicitly. |
| `baseUrl` | string | Defaults to the production URL; overridable for `localhost:3091`. |

- `authenticate`: generic auth injecting the `x-organization-id` header.
- `test`: `GET {{baseUrl}}/integrations/make/validate` — gives a real "Connection tested
  successfully" that also confirms the organisation resolves and WhatsApp is connected.

## 5. Resources and operations

Nine resources, 22 operations (21 documented POST actions plus `Organization: Validate`).

Fields appearing across many operations (`actorId`, `actorName`, `sentByUserId`,
`sentByUserName`, `avoidBlacklist`) are grouped into an **Additional Fields** collection to
keep the UI clean, rather than shown inline.

### Message

| Operation | Endpoint | Required | Optional |
|---|---|---|---|
| Send Text | `/messages/send-text` | `phoneNumber`, `message` | `sentByUserId`, `sentByUserName`, `avoidBlacklist` |
| Send Template | `/messages/send-template` | `phoneNumber`, `templateName` | `languageCode`, dynamic params, `headerMediaUrl`, `urlButtonParams`, `sentByUserId`, `sentByUserName`, `avoidBlacklist` |
| Send Template with File | `/messages/send-template-base64` | `phoneNumber`, `templateName`, `fileData`, `fileName` | `languageCode`, dynamic params, `sentByUserId`, `sentByUserName` |

`Send Template with File` takes its file from an n8n **binary property** by name and
base64-encodes it into `fileData`, deriving `fileName` from the binary metadata unless
overridden. This is the idiomatic n8n pattern and avoids asking users to base64 by hand.

### Conversation

| Operation | Endpoint | Required |
|---|---|---|
| Resolve or Create | `/conversations/resolve` | `phoneNumber` |
| Update Display Name | `/conversations/display-name` | `phoneNumber`, `displayName` |
| Assign User | `/conversations/assign` | `phoneNumber`, `userId` (dropdown) |
| Create Note | `/conversations/notes` | `phoneNumber`, `content` |
| Set Flag | `/conversations/flag` | `phoneNumber`, `color` (dropdown + synthetic "none") |

`Assign User` exposes `replaceExisting` (default `true`) in Additional Fields.
`Create Note` exposes `agentName`.

### Tag

| Operation | Endpoint | Required |
|---|---|---|
| Add to Conversation | `/conversations/tags/add` | `phoneNumber`, `tagId` (dropdown) |
| Remove from Conversation | `/conversations/tags/remove` | `phoneNumber`, `tagId` (dropdown) |
| Clear All from Conversation | `/conversations/tags/clear` | `phoneNumber` |

### List

| Operation | Endpoint | Required |
|---|---|---|
| Add to Conversation | `/conversations/lists/add` | `phoneNumber`, `listId` (dropdown) |
| Clear All from Conversation | `/conversations/lists/clear` | `phoneNumber` |
| Add Recipient | `/lists/add-recipient` | `listId` (dropdown), `phoneNumber` |
| Remove Recipient | `/lists/remove-recipient` | `listId` (dropdown), `phoneNumber` |

`Add Recipient` also accepts `name` and a `customFields` key/value collection.

### Custom Field

| Operation | Endpoint | Required |
|---|---|---|
| Set Value | `/conversations/set-custom-field` | `phoneNumber`, field identifier, `value` |
| Set Multiple Values | `/conversations/set-custom-fields` | `phoneNumber`, `fields[]` |

**The custom-field wrinkle.** `/rpc/custom-fields` requires a `listId` to return anything,
but the action endpoints accept only `fieldId` or `fieldName` — there is no list in the
payload. The node therefore offers a **Field Source** choice:

- *From List* — a List dropdown (used only to source definitions) plus a dependent Field
  dropdown; sends `fieldId`.
- *By Name* — a plain string; sends `fieldName`.

`Set Multiple Values` uses a fixedCollection of the same choice, repeated. Passing an empty
value clears the field, per the API docs.

### Bot, Blacklist, Notification, Organization

| Resource | Operation | Endpoint | Required |
|---|---|---|---|
| Bot | Trigger Flow | `/flows/send` | `phoneNumber`, `botId` (dropdown) |
| Blacklist | Add Number | `/blacklist/add` | `phoneNumber` |
| Blacklist | Remove Number | `/blacklist/remove` | `phoneNumber` |
| Notification | Send Push | `/notifications/push` | `recipientType`, `title`, `body` |
| Organization | Validate | `GET /validate` | — |

`Send Push` branches on `recipientType` via `displayOptions`: `user` shows a Users
dropdown, `phone` shows a phone field, `organization` shows neither. Optional `sound`
(`default`/`cash`) and `respectPreferences` (default `true`).

`Add Number` (blacklist) also accepts `reason`, `addedBy`, `addedByName`.

`Trigger Flow` exposes `buttonText` and dynamic bot template parameters (§6.2).

## 6. Dynamic template parameters

Implemented with n8n's `resourceMapper` parameter type — the same mechanism Google Sheets
uses to render one input per column. The mapper's schema method calls the relevant RPC and
returns one field per returned `{name,label}` pair.

### 6.1 Single template — `flattenTemplateParams`

Field names come from `/rpc/template-params`. Reassembly rules:

| Field name | Destination |
|---|---|
| `tp__<N>` | `parameters[N-1]` |
| `tp__url_btn<N>` | `urlButtonParams[] += { buttonIndex: N, value }` |
| `tp__header_media_url` | `headerMediaUrl` |

`parameters` is emitted as a dense array ordered by `N`; gaps are filled with empty strings
so positional substitution stays aligned. Empty or unset `url_btn` values are omitted
entirely so the template falls back to Meta's example URL, per the API docs.

### 6.2 Bot flow — `flattenBotTemplateParams`

Field names come from `/rpc/bot-template-params` and embed the template name.

**Parsing rule:** strip the leading `tp__`, then split on the **last** `__`. The remainder
is the template name; the tail is the parameter key. Splitting from the right is required
because WhatsApp template names legally contain underscores and may contain `__`, so
left-to-right parsing is ambiguous. `tp__my__tpl__2` correctly yields template `my__tpl`,
parameter `2`.

| Field name | Destination |
|---|---|
| `tp__<tpl>__<N>` | `templateParams[tpl][N-1]` |
| `tp__<tpl>__url_btn<N>` | passed through as a flat top-level key of the same name |

**On the URL-button passthrough.** The documented `/flows/send` body has only
`templateParams` (an object of string arrays) and no place for URL-button values, yet the
RPC offers `url_btn` fields for bots. The flat field names exist precisely because Make.com
posts them flat and the server unflattens them, so sending them flat alongside the
documented `templateParams` is the most likely-correct interpretation and is harmless if
the server ignores unknown keys. This is a deliberate, documented assumption and is listed
in §9 as requiring live confirmation.

### 6.3 Known limitation — computed template names

Because the field list is fetched from the RPC using the selected template name, workflows
that compute the template name at runtime via an expression cannot render the dynamic field
list; the mapper will show no fields. All other functionality is unaffected. A raw
positional-parameter fallback was considered and deliberately excluded from this scope.
Adding it later is a contained change (a boolean toggle plus one alternative field).

## 7. Transport and error handling

`transport/request.ts` exposes one helper:

```ts
smartSendApiRequest(ctx, method, path, body?, qs?)
```

Behaviour:

1. Reads `baseUrl` and credentials via `httpRequestWithAuthentication('smartSendApi', ...)`.
2. On a 2xx response with `success !== false`, returns `data` (or the whole body when
   `data` is absent).
3. On a 2xx response with `success === false`, throws `NodeApiError` — the API can return
   `200` with `success:false`, so status alone is not a sufficient check.
4. On a non-2xx response, normalises both error shapes (§2.3) into a `NodeApiError`
   carrying `message`, plus `code`/`requestId` when present.
5. Client-side required-field validation runs **before** the request, using the registry's
   `required` list, raising `NodeOperationError` naming the missing field.

The `execute` loop iterates input items, tags every output and every error with
`pairedItem`, and honours `continueOnFail()` by emitting `{ json: { error } }` for the
failing item instead of aborting the run.

`usableAsTool: true` is set so the node can be attached directly to an n8n AI Agent.

## 8. Testing strategy

| Layer | Scope | Network |
|---|---|---|
| Unit (jest + ts-jest) | Every `buildBody`; both flatteners incl. the `my__tpl__2` right-split case, dense-array gap filling, and `url_btn` omission; dropdown mapper; envelope unwrap; both error shapes; client-side validation | None |
| Live smoke (`scripts/smoke.ts`) | `/validate` plus all nine RPC endpoints against the real organisation; asserts the `{id,value}` contract and tolerates empty arrays | Read-only |
| Manual, real n8n | n8n in Docker with the built package mounted into the custom-nodes folder; click through every operation, confirm dropdowns populate and template fields render | Read-only |
| Live send | One text message, one `cart_24` template send with 2 params + URL button, one bot flow trigger, to an operator-nominated test number | **Writes** |

The live send layer is the only one that transmits WhatsApp messages. It is gated on
explicit operator approval and a nominated number, is never part of `npm test`, and exists
to resolve the §6.2 assumption and prove the template payload shape.

Credentials live in a gitignored `.env`. No organisation token is committed or hardcoded.

## 9. Open items

1. ~~**Bot flow URL-button payload**~~ (§6.2) — **CLOSED, confirmed working.** A live
   `/flows/send` carrying both the documented `templateParams` object and a flat
   `tp__cart_24__url_btn0: "botbtn123"` key returned `200 { flowTriggered: true }`, and
   visual inspection of the delivered message confirmed the "המשך רכישה" button resolved to
   `https://example.com/botbtn123` rather than the template's `sample` example
   value. The server therefore both accepts **and applies** flat `tp__` keys on
   `/flows/send`. The §6.2 passthrough is no longer an assumption — it is verified
   behaviour, and bot flows with dynamic URL buttons are fully drivable from n8n.
2. **Custom-field item shape** — still open, now narrowed.
   **Not closable via the API:** all 32 endpoints were reviewed and there is no create-list
   and no define-custom-field endpoint; every list endpoint operates on an existing list and
   every custom-field endpoint sets values on a conversation.
   A list (`(test list)`) has since appeared in the workspace, which **does** confirm the Lists
   dropdown against real data — a UUID `id` with a display `value`, matching the shared
   contract. That list has no custom fields defined, so `/rpc/custom-fields` still returns
   `[]` and the custom-field *item* labels remain unverified. Defining a single custom field
   on that list in the Smart Send UI would close this.
3. **Template `languageCode` disambiguation** — the templates RPC returns labels like
   `cart_24 (he)` but `id` is the bare name. Where an organisation has one template name in
   several languages the dropdown will show duplicate-looking entries. The node exposes an
   optional `languageCode` field to disambiguate; whether the RPC ever returns true
   duplicates could not be confirmed with only three single-language templates available.

## 10. Out of scope

- **Trigger node.** The API documents no webhook or polling endpoint, so inbound "message
  received starts a workflow" is not buildable. Would require a Smart Send server-side
  webhook that does not currently exist.
- Internal Smart Send dashboard APIs; only the public Make.com integration surface is
  wrapped.
- Publishing to npm. The package is built to the public community-node standard (lint
  ruleset, LICENSE, README, icon, codex metadata) so publishing remains a single later
  step, but the release itself is a separate decision.

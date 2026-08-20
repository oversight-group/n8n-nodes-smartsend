# Manual Verification Record

**Date:** 2026-08-20
**Package version:** 0.1.2
**Workspace:** a live production workspace (WhatsApp connected)
**n8n:** official Docker image, custom node installed into `~/.n8n/nodes` from a packed tarball

## Automated gates

| Gate | Command | Result |
|---|---|---|
| Unit tests (no network) | `npm test` | **PASS** — 136 tests, 9 suites |
| TypeScript | `npx tsc --noEmit` | **PASS** |
| n8n community lint ruleset | `npm run lint` | **PASS** |
| Build + manifest resolution | `npm run build` | **PASS** — both manifest paths resolve |
| Live API contract (read-only) | `npm run smoke` | **PASS** — 11/11 checks |
| Live UI behaviour (read-only) | `npm run verify:live` | **PASS** — 15 requests, 0 messages sent |

## n8n registration

Confirmed from the container log, with no errors:

```
debug | Loaded all credentials and nodes from n8n-nodes-smartsend {"credentials":1,"nodes":1}
```

**Install gotcha worth recording:** `npm install /path/to/repo` into `~/.n8n/nodes` creates a
*symlink* to the host path. Inside the n8n container that symlink dangles
(`-> /mnt/host/c/...`), so n8n silently loads nothing. Installing from a packed tarball
(`npm pack` then `npm install ./n8n-nodes-smartsend-0.1.0.tgz`) places real files and n8n
picks the package up.

## Verified by `npm run verify:live`

This drives the node's real `loadOptions`, `resourceMapping` and `execute` code against the live
API through a minimal fake n8n context, so it verifies exactly what the UI renders.

| # | Check | Result |
|---|---|---|
| 1 | Credential resolves; connection reports WhatsApp state | PASS — `whatsappConnected: true` |
| 2 | Templates dropdown | PASS — `cart_24 (he)`, `cart_48 (he)`, `cart_coupon (he)` |
| 3 | Bots dropdown | PASS — `תהליך חדש` |
| 4 | Lists dropdown | PASS — `(test list)` |
| 5 | Tags dropdown empty, not erroring | PASS — workspace has no tags |
| 6 | Users dropdown empty, not erroring | PASS — workspace has no users |
| 7 | Flag colours include the synthetic clear option | PASS — red, orange, green, None (Clear Flag) |
| 8 | Custom fields empty with no list selected | PASS |
| 9 | Custom fields scoped to a chosen list | PASS — list `(test list)` has no fields defined |
| 10 | `cart_24` renders its fields | PASS — `tp__1`, `tp__2`, `tp__url_btn0` |
| 11 | `cart_48` renders its fields | PASS — `tp__1`, `tp__2`, `tp__url_btn0` |
| 12 | `cart_coupon` renders a third parameter | PASS — `tp__1`, `tp__2`, `tp__3`, `tp__url_btn0` |
| 13 | Bot flow renders prefixed fields | PASS — `tp__cart_24__1`, `tp__cart_24__2`, `tp__cart_24__url_btn0` |
| 14 | `Organization: Validate` executes end to end | PASS |
| 15 | Missing-required error names the field | PASS — "Missing required parameters: phoneNumber, message" |
| 16 | Validation spends no HTTP request | PASS — 0 requests |

## Verified by live send (earlier, during design)

Three real WhatsApp messages to an operator-nominated test number:

| # | Check | Result |
|---|---|---|
| 17 | Send Text delivers | PASS — returns `{ conversation, message }`; `status: sent` |
| 18 | Send Template substitutes parameters | PASS — `cart_24` with 2 params rendered into `{{1}}`/`{{2}}` |
| 19 | Bot flow triggers | PASS — `{ flowTriggered: true }` |
| 20 | Dynamic URL button value is applied | PASS — button resolved to `…/botbtn123`, not the template's `sample` |

## Outstanding — requires operator action

| # | Item | Why it is blocked |
|---|---|---|
| A | Click-through of the node in the n8n UI | n8n requires owner-account setup (email + password) before the UI unlocks. Creating accounts and entering passwords is out of scope for the agent, so this step is left to the operator. Everything the UI would display has been verified programmatically above. |
| B | Custom-field option labels | The workspace list `(test list)` has no custom fields defined, and the public API has no endpoint to create one. Adding a single custom field to that list in the SmartSend UI would let check #9 return real data and confirm the label mapping. |
| C | Attach the node to an AI Agent as a tool | `usableAsTool: true` is set and unit-tested, but the drag-and-drop confirmation needs the UI, so it is gated behind item A. |

## Operator instructions for item A

```bash
docker start n8n-smartsend-test   # already created, or see README to recreate
```

Open http://localhost:5678, complete the owner setup, then:

1. Add a **SmartSend API** credential and paste the long integration token. Click **Test** —
   expect "Connection tested successfully". For contrast, paste the short workspace code and Test
   again; expect a failure naming "unknown organization".
2. Add the **SmartSend** node. Confirm the icon renders and the Resource dropdown lists all nine
   resources.
3. Set Resource → Message, Operation → Send Template, pick `cart_coupon`, and confirm four labelled
   parameter inputs appear.
4. Set Resource → Bot, pick `תהליך חדש`, and confirm three prefixed parameter inputs appear.
5. Set Resource → Notification and switch Recipient Type between User / Phone Number / Organization,
   confirming the dependent field swaps correctly.

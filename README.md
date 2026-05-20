# Template Server

Selects the correct DocuSign envelope JSON for an onboarding submission using declarative rules in `data/registry.json`.

## Setup

```bash
cd template-server
npm install
```

## Run

```bash
npm start
# or with auto-reload:
npm run dev
```

Default port: **3100** (`PORT` env overrides).

## API

### `GET /health`

Returns `{ "ok": true, "version": 1 }`.

### `GET /registry`

Returns the loaded registry (rules + payload metadata, not full envelopes).

### `POST /match`

**Body:** webhook payload with `formData`, or `formData` fields at the root.

```json
{
  "formData": {
    "zendesk_office_id": "23308433036311",
    "agentType": "New",
    "loi": "No"
  }
}
```

**Success (200):**

```json
{
  "matched": true,
  "ruleId": "standard-new-anaheim",
  "payloadKey": "standard_nhpw_new_agent_no_loi",
  "templateId": "9f5d0e4f-5d8a-4ca5-9362-03c40f4f96ab",
  "match": { ... },
  "ctx": { ... },
  "envelope": { ... }
}
```

**No match (404):** `{ "matched": false, "error": "...", "ctx": { ... } }`

**Ambiguous (409):** two or more rules matched (should not happen if registry is valid).

## curl examples (Anaheim Hills)

**New agent, no LOI:**

```bash
curl -s -X POST http://localhost:3100/match \
  -H "Content-Type: application/json" \
  -d '{"formData":{"zendesk_office_id":"23308433036311","agentType":"New","loi":"No"}}' \
  | jq '{matched, ruleId, payloadKey, templateId}'
```

**Seasoned agent, with LOI:**

```bash
curl -s -X POST http://localhost:3100/match \
  -H "Content-Type: application/json" \
  -d '{"formData":{"zendesk_office_id":"23308433036311","agentType":"Seasoned","loi":"Yes"}}' \
  | jq '{matched, ruleId, payloadKey, templateId}'
```

## n8n integration

1. **Webhook** receives form submission (`formData`, `requestData`, `files`).
2. **HTTP Request** → `POST http://<host>:3100/match` with the webhook JSON body.
3. **Code** (merge for DocuSign expressions):

```javascript
const webhook = $('Webhook').first().json;
const match = $input.first().json;
return [{
  json: {
    ...webhook,
    payloadKey: match.payloadKey,
    templateId: match.templateId,
    ruleId: match.ruleId,
    envelope: match.envelope,
  },
}];
```

4. **DocuSign** node uses `envelope` fields. Expressions like `{{ $json.formData.legalName }}` still resolve because the merged item keeps original `formData`.

## Adding templates

1. Add envelope JSON under `data/templates/`.
2. Add `payloads.<key>` in `data/registry.json`.
3. Add a `rules[]` row with `match` (only `allowedMatchFields` keys).
4. Restart server (validation runs on startup).

Many offices can share one rule via `zendesk_office_id: ["id1", "id2", ...]`.

## Tests

```bash
npm test
```

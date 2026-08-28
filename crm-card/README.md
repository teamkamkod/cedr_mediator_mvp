# CEDR Mediator Calendar — HubSpot CRM Card

App card displayed on the **Mediator custom object** record in HubSpot.
Shows the mediator's availability for the current week with week navigation.

## Prerequisites

- HubSpot CLI: `npm install -g @hubspot/cli`
- Access to CEDR's HubSpot portal
- Supabase project URL and service role key

## Setup

### 1. Authenticate HubSpot CLI

```bash
hs auth
# Select CEDR's portal when prompted
```

### 2. Find the Mediator custom object name

```bash
# GET request to find fullyQualifiedName
curl -H "Authorization: Bearer <PRIVATE_APP_TOKEN>" \
  "https://api.hubapi.com/crm/v3/schemas"
```

Look for the mediator object → grab `fullyQualifiedName` (e.g. `p123456_Mediator`) → remove the HubID → use `p_Mediator`.

Update `src/app/extensions/mediator-calendar.json` if the name differs:
```json
"objectTypes": [{ "name": "p_YourObjectName" }]
```

### 3. Add secrets to HubSpot

In the HubSpot private app settings, add these secrets:

| Secret name | Value |
|---|---|
| `SUPABASE_URL` | `https://kvmvgezohrrrutkxhzit.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `<service_role_key from Supabase dashboard>` |
| `MAKE_REQUEST_UPDATE_WEBHOOK` | `<Make webhook URL>` (optional for MVP) |

Or via CLI:
```bash
hs secret add SUPABASE_URL
hs secret add SUPABASE_SERVICE_ROLE_KEY
hs secret add MAKE_REQUEST_UPDATE_WEBHOOK
```

### 4. Deploy

```bash
cd crm-card
hs project upload
```

### 5. Add the card to the Mediator record layout

In HubSpot: **Settings → Objects → [Mediator object] → Record customization → Add card**
→ Select "CEDR Mediator Calendar"

## Linking mediators

For the card to work, each Supabase user must have `hubspot_mediator_object_id` populated
with the HubSpot record ID of their mediator object record.

Update via Supabase SQL editor:
```sql
UPDATE users
SET hubspot_mediator_object_id = '<hs_record_id>'
WHERE email = 'mediator@example.com';
```

Or automate via Make.com when a new mediator is created in HubSpot.

## Development (local testing)

```bash
cd crm-card
hs project dev
```

This opens a local dev server. You can test the card in a real HubSpot record.

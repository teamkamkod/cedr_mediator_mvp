# CEDR Mediator Calendar — HubSpot CRM Card

App card on the **Mediator custom object** (`p_mediators`) in HubSpot.
Shows mediator availability (week view) pulled live from Supabase.

## What's already done

- ✅ Object type set: `p_mediators` (fullyQualifiedName: `p5956807_mediators`)
- ✅ James Anderson linked: `hubspot_mediator_object_id = 447896233207`
- ✅ Sarah Collins linked:  `hubspot_mediator_object_id = 447895513329`
- ✅ Make webhook URL hardcoded in the card

## Deploy checklist

### 1. Install HubSpot CLI (if not already)

```bash
npm install -g @hubspot/cli
```

### 2. Authenticate

```bash
hs auth
# Select CEDR's portal (or your dev portal)
```

### 3. Add Supabase secrets

```bash
hs secret add SUPABASE_URL
# → paste: https://kvmvgezohrrrutkxhzit.supabase.co

hs secret add SUPABASE_SERVICE_ROLE_KEY
# → paste: the service_role key from:
#   Supabase dashboard → Project Settings → API → service_role (long eyJ... key)
```

### 4. Upload the project

```bash
cd crm-card
hs project upload
```

### 5. Add the card to the Mediator record layout

HubSpot → **Settings → Objects → Mediators → Record customization**
→ **Add card** → select **"CEDR Mediator Calendar"**

### 6. Test

Open any mediator record in HubSpot → the card should appear showing
the current week's availability grid.

## Local dev

```bash
cd crm-card
hs project dev
# Opens local dev server — test in a real HubSpot record
```

## Linking new mediators

When a new mediator is created in the portal, update Supabase:

```sql
UPDATE public.users
SET hubspot_mediator_object_id = '<hs_record_id>'
WHERE email = 'mediator@example.com';
```

The `hs_record_id` is the mediator custom object record ID in HubSpot
(visible in the URL when viewing the record: `.../objects/p5956807_mediators/<id>`).

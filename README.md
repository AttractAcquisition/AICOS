# AICOS

AICOS is the front end for the Attract Acquisition operating system.

## Consoles
- Distribution Console
- Delivery Console
- Admin Console
- Knowledge Console

## Client Dashboard
- Separate client-only dashboard at `/portal`

## Backend mapping
This front end is mapped to the AICOS Supabase schema.

Core tables and views:
- `prospects`
- `clients`
- `sprints`
- `distribution_metrics`
- `delivery_metrics`
- `distribution_progress`
- `delivery_progress`
- `tasks`
- `portal_tasks`
- `portal_messages`
- `portal_documents`
- `sops`
- `templates`
- `assets`
- `financial_snapshots`
- `ledger_entries`
- `knowledge_documents`
- `knowledge_chunks`
- `knowledge_queries`
- `approval_logs`
- `exception_logs`
- `integration_events`
- `ops_manager_status`

Compatibility views also exist for the transition layer:
- `proof_sprints`
- `sprint_daily_log`
- `monthly_revenue`
- `ledger`
- `distro_metrics`
- `app_files`
- `aa_documents`
- `aa_chunks`
- `aa_queries`
- `client_deliverables`

## Environment
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Google Workspace OAuth (edge-function env)
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=https://app.attractacq.com/oauth/callback`
- `GOOGLE_OAUTH_STATE_SECRET`
- `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`

Routes:
- `/oauth/google/start`
- `/oauth/callback`

## Local run
```bash
npm install
npm run dev
```

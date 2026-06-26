# Security

## Authentication

- Supabase Auth with email/password
- Session persisted securely via AsyncStorage
- Tokens auto-refreshed

## Database

- Row Level Security on all private tables
- Users can only read/write their own data
- Service role only used in Edge Functions

## AI Credentials

- LLM API keys stored only in Supabase Edge Function secrets
- Client never sees API keys
- Deterministic fallback works without API key

## Video Privacy

- Private by default
- RLS-protected storage
- No training without consent
- User can delete videos and revoke coach access

## Safety

- Pain flags block progression
- Expert skills require verification
- No diagnosis, no guaranteed results

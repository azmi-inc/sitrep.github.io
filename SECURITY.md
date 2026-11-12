# Security model — SITREP Safe

## Data scope
SITREP Safe displays aggregated public-interest information from fixed, documented public feeds. It does not collect personal account data, private messages, session cookies, CCTV, individual location trails, aircraft positions, or vessel positions.

## Network controls
- Upstream URLs are hard-coded constants, not user input.
- HTTP redirects are rejected.
- Requests have a short timeout.
- No generic URL proxy, article bypass, or user-controlled fetch endpoint exists.
- RSS links are restricted to HTTPS links on the ANTARA host allowlist before display.

## HTTP controls
- GET and HEAD only; all other methods return 405.
- Same-origin browser requests; no permissive CORS.
- CSP, frame denial, nosniff, referrer policy, and restrictive permissions policy are set.
- Static file paths are normalized and constrained to the public directory.
- No secrets are sent to the browser.

## Deployment
- Default bind is 127.0.0.1.
- Set HOST=0.0.0.0 only when intentionally deploying behind a managed HTTPS reverse proxy.
- Keep environment files out of Git.
- Never expose Supabase service-role/secret keys to browser code.
- The supplied Supabase migration uses a private schema and grants no table access to anon/authenticated roles.

## Operations
- This is not an emergency-response service. Verify critical information with the source agency.
- Public-feed outages fall back to clearly labelled demo data; demo values must never be presented as live observations.
- Do not add individual surveillance, credential replay, or bypass features.

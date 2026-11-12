# SITREP Safe — Indonesia Public Information Dashboard

A separate, safety-scoped implementation inspired by the interface and operational layout of [azmihafizhar/sitrep-osint](https://github.com/azmihafizhar/sitrep-osint). The upstream repository is unchanged.

## Scope

SITREP Safe is for public-interest situational awareness:
- Official public earthquake information from BMKG
- Curated public news headlines through RSS
- Source freshness and service health
- A responsive dark dashboard for desktop and mobile
- A prepared private Supabase schema migration for future persistence

Explicitly excluded: CCTV monitoring, individual tracking, aircraft/vessel tracking, private-account collection, session-cookie scraping, paywall/bot-wall bypass, and collection of personal data.

## Architecture

- Node.js 24+, native HTTP server (no runtime dependencies)
- Vanilla HTML/CSS/JavaScript frontend
- Fixed upstream URLs only; redirects are rejected
- No user-supplied URL fetch/proxy endpoint
- Local demo data when public sources are unavailable
- Optional Supabase migration under `supabase/migrations/`; it has **not** been applied to any project

## Run locally

```bash
cp .env.example .env
npm test
npm start
```

Open http://127.0.0.1:8787.

For a public deployment, set `HOST=0.0.0.0`. The dashboard exposes read-only public information only. Do not add write endpoints or privileged keys to the browser.

## Supabase

The existing connected projects inspected during setup are unrelated applications (`ngobrol` and `hadirkita`), so neither is linked to SITREP. The migration is a reviewed starting point only. Before applying it, select or create a dedicated SITREP Supabase project, inspect the migration, and configure a server-side secret through the deployment provider. Never put a Supabase service-role/secret key in a `NEXT_PUBLIC_*` or browser variable.

## Upstream reference

- Reference repository: https://github.com/azmihafizhar/sitrep-osint
- Reference security policy: https://github.com/azmihafizhar/sitrep-osint/blob/main/SECURITY.md
- This repository is a separate implementation; it does not modify or claim to be the upstream project.

## License

This implementation is released under the MIT License. See [LICENSE](LICENSE).

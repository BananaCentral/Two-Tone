# Account and Player Data Setup

This project uses Better Auth for Google OAuth and PostgreSQL for account and profile data. The game is served as static files; Vercel Functions under `/api` provide the authenticated server routes.

## Required configuration

Configure these values in local development and Vercel Production. Keep secrets server-only; do not prefix them with `NEXT_PUBLIC_`.
Use `.env.example` as the local variable-name template; put actual values in an ignored `.env.local` file or Vercel's encrypted environment-variable settings.

Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Connect a PostgreSQL database (Neon is the Vercel Marketplace option), then configure a Google OAuth web client. The OAuth consent screen must allow the intended player audience.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string from the connected database |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 bytes |
| `BETTER_AUTH_URL` | Canonical application origin, such as `https://<production-domain>` |
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret from Google Cloud |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated approved app origins when they differ from the canonical origin |

Register the Google OAuth redirect URI as `<BETTER_AUTH_URL>/api/auth/callback/google`. Add the local development redirect URI separately for local testing. Do not use preview URLs as permanent production callback origins.

The current Vercel project protects its built-in `vercel.app` domains with Vercel Authentication. Before public Google sign-in can complete, either connect a custom domain and use it as `BETTER_AUTH_URL`, or disable deployment protection for the public production domain. Google must redirect to an origin players can reach without first passing Vercel Authentication.

## Database migration

Run the Better Auth schema migration against the configured database:

```sh
npm run auth:migrate
```

This applies Better Auth's PostgreSQL schema using the matching CLI and configuration in `lib/auth.js`.

The authenticated profile endpoint creates `two_tone_player_profiles` and action-receipt tables on first use. Better Auth's migration creates the authentication tables. The profile identity key comes only from the verified session. New accounts start in Regular Mode with Soul and zero coins.

The database must be available to the deployment before enabling the account gate. Do not deploy the account gate while the variables or Better Auth schema are missing; the game will correctly stop at the sign-in screen when the account service is unavailable.

## Current scope

- `GET /api/auth/*` and `POST /api/auth/*` are handled by Better Auth, including Google sign-in and session management.
- `GET /api/player/profile` requires an authenticated session and returns that user's server profile.
- There is no endpoint that accepts arbitrary client profile replacement. Store draws, daily claims, item use, ascension, rune/celestial upgrades and equipment, team selection, and battle vitals use validated server commands.
- The browser keeps an account-scoped cache for presentation, but account actions and progression changes are committed to PostgreSQL. The player API only accepts named, validated actions; it has no whole-profile write operation.
- Google sign-in creates an account on first use. Account deletion is available in Settings and cascades to the player profile and action receipts.

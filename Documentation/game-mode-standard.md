# Game Mode Standard

## Regular Mode

- Regular Mode is the only mode currently available to players.
- A new account starts with Soul, 0 coins, and the standard starting profile.
- The server loads the account profile after Google sign-in and validates every progress-changing action.
- Players cannot grant themselves currency, select unowned characters, or import/export progress through save files.

## Developer Access

- Dev Mode is disabled for all accounts until server-side developer roles are configured.
- A URL parameter, browser setting, or modified local storage cannot authorize developer access.
- Once enabled, developer authorization must be checked on the server for every developer-only operation. Test profiles and grants must remain isolated from Regular Mode.

See the [Account and Player Data Standard](account-and-player-data-standard.md) for identity, persistence, and access rules.

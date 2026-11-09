# Project agent notes

- The website is a SvelteKit app under `website`; see `website/README.md` for setup and arcade rollout constraints.
- Use `npm run check` in `website` for Svelte and TypeScript diagnostics. Static environment imports need the variables used in `src/lib/server/s3.ts`, `src/lib/server/ai.ts`, and `src/lib/stores/websocket.ts` even for a local check.
- Ranked entry and Mines/Tower settlement synchronize on the PostgreSQL user row. Wallet generation changes and Redis token claims must preserve that ordering; see the ranked-entry notes in `website/README.md`.
- Validate settlement races and migrations against disposable PostgreSQL and Redis instances before deployment. Redis and PostgreSQL settlement are not a single atomic operation.

# Fietslog – notities voor ontwikkelaars

- Stack: TanStack Start (React 19) + Tailwind 4, gebouwd met Vite en Nitro (`node-server`).
- Ritten staan server-side in `DATA_DIR/rides.json` via `/api/rides`; inloggen via `/api/auth/*` (zie `src/lib/auth-server.ts`). Geen database.
- `src/routeTree.gen.ts` is automatisch gegenereerd: niet met de hand aanpassen.
- Nieuwe afhankelijkheden: pas `bun.lock` mee aan (`bun install`), want de Dockerfile gebruikt `--frozen-lockfile`.

# VolunTrack frontend

React 19 · TypeScript · Vite · Tailwind 4 · React Router 7 · TanStack Query · Zustand · MSW.

## Run
```bash
npm install
npm run dev        # real Laravel API at http://localhost:8000/api
npm run dev:live   # real API on Render
npm run dev:mock   # full offline backend (demos, E2E) — demo accounts, password "password"
```

Everything talks to the real API by default (`VITE_MOCK_MODE=off`). Endpoints Laravel hasn't built yet
(see `docs/PENDING_BACKEND_CONTRACTS.md`) answer with a route 404; the UI detects that and shows a calm
"Coming soon" state, or rebuilds the data from endpoints that do exist (event detail, live roster,
coordinator dashboard, org overview, registration). Nothing needs changing in the frontend when the backend ships them.

## Deploy to Vercel
1. New Project → import the repo → **Root Directory: `frontend`** (framework, build and output come from `vercel.json`).
2. Environment variables (Production + Preview):
   - `VITE_API_URL` = `https://volunteer-management-system-4vvg.onrender.com/api`
   - `VITE_MOCK_MODE` = `off`
   - `VITE_SHOW_DEMO_ACCOUNTS` = `false` (set `true` on Preview for demos)
   - `VITE_APP_URL` = your Vercel domain, e.g. `https://voluntrack.vercel.app` (used in certificate share links)
3. Deploy. SPA routing, long-term asset caching and security headers are configured in `vercel.json`.
4. Backend: Laravel CORS already allows all origins (`config/cors.php`). To lock it down, set `allowed_origins` to the Vercel domain.

A fully offline demo deployment is also possible: set `VITE_MOCK_MODE=all` on a Preview environment.

## Test
```bash
npm test           # unit + contract + page-flow tests (Vitest, RTL, MSW)
npm run e2e        # Playwright journeys + axe accessibility (mock backend)
```

## Structure
- `src/app` — providers, router, guards, workspace shell
- `src/pages` — route screens (landing, auth, volunteer `/v`, coordinator `/c`, org admin `/o`, platform `/p`)
- `src/features` — domain API modules + hooks + feature components
- `src/shared` — design system (`ui`), http client, lib, types
- `src/mocks` — MSW: `implemented/` mirrors Laravel, `pending/` = endpoints the backend hasn't built yet

Backend work still needed is specified in `docs/PENDING_BACKEND_CONTRACTS.md`. When an endpoint ships, delete its handler in `src/mocks/handlers/pending/`.

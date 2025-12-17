# SAP Knowledge Center (UI5, BAS-ready)

Production-ready Fiori-styled UI5 app for SAP Business Application Studio. Includes ShellBar + SideNavigation, Search page (filters + results), Training assignments page, and an AI panel wired to SAP AI Core via destination.

## Run locally (UI5 Tooling)

```powershell
Push-Location apps\\fiori-ui5
pnpm install
pnpm start
# Open http://localhost:8080/index.html
Pop-Location
```

If you use npm:
```powershell
Push-Location apps\\fiori-ui5
npm install
npm run start
Pop-Location
```

## Import into SAP Business Application Studio (BAS)
- Create a new BAS dev space (Full Stack Cloud Application recommended).
- Clone this repository in BAS or upload the `apps/fiori-ui5` folder.
- Run: `npm install` then `npm run start`.
- Use the BAS preview to open `index.html`.

## Destinations and approuter
- `xs-app.json` defines routes:
  - `/api/*` -> destination `ULHN_API` (your Nest backend)
  - `/ai/*` -> destination `ai-destination` (SAP AI Core / AI Launchpad)
- Configure these destinations in your BTP subaccount / space and bind them to your HTML5 app/Approuter.

For local BAS runs, `ui5.yaml` uses `fiori-tools-proxy` to forward:
- `/api/*` → destination `ULHN_API`
- `/ai/*` → destination `ai-destination`
Ensure these destinations exist in your BAS dev space.

## Structure
- `webapp/index.html`: Bootstrap OpenUI5 Horizon theme.
- `webapp/Component.js`: UIComponent with router.
- `webapp/view/App.view.xml`: ShellBar + SideNavigation + `sap.m.App` router target.
- `webapp/view/Dashboard.view.xml` + `controller`: Tiles for Modules (from meta model) and quick actions; pressing a tile presets Search filters.
- `webapp/view/Search.view.xml` + `controller`: Filters (Role + Module), Go/Reset, Export, Results table with required columns (id,url,role,title,module,description,lastUpdated,sapHelpLink).
- `webapp/view/Training.view.xml` + `controller`: Training assignments with Mark Completed action.
- Chat: ShellBar action opens an AI dialog with message list + input, wired to `/ai/chat/completions?api-version=2024-06-01` with full-screen toggle.

## Next steps (wiring)
- Replace stubbed search in `Search.controller.js::_search` with `/api/search` call via destination.
- Replace AI stub in `App.controller.js::_callAI` with `/aicore/...` inference call.
- Add Favorites/Notes persistence via `/api` endpoints.
- Add additional pages (Modules/Processes/Roles) and tiles if required.

## Required Backend Endpoints (Citizen Dev Friendly)

- `GET /api/filters/roles` → `["FI","MM","SD", ...]`
- `GET /api/filters/modules` → `["FI","MM","SD", ...]`
- `GET /api/search?role=&module=&query=&tags=&dateFrom=&dateTo=` → Either:
  - `[{ id, url, role, title, module, description, lastUpdated, sapHelpLink }]`
  - or `{ results: [ ...same objects... ] }`
- `GET /api/training` → `[{ id, title, role, module, url, dueDate, status, completedAt }]`
- `POST /api/training/:id/complete` → `{ success: true }`

Notes:
- `lastUpdated`, `dueDate`, `completedAt` can be ISO date strings (e.g. `2024-01-31T12:00:00Z`).
- If you’re reading from Excel (HelpTopic 1.xlsx), mapping columns to these fields is sufficient; you can serve JSON without a database.

## Notes
- Theme: `sap_horizon` (light/dark supported).
- Device types: Desktop-first; tablet supported; phone disabled in manifest.
- You can switch to SAPUI5 CDN in `index.html` if needed by your landscape.
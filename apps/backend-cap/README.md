# Backend (CAP) - SAP Knowledge Center

Minimal CAP service providing endpoints for the UI5 app.

## Entities
- Resources: `id, url, role, title, module, description, lastUpdated, sapHelpLink`
- TrainingAssignments: `id, title, role, module, url, dueDate, status, completedAt`

## Endpoints (REST)
- `GET /api/filters/roles` → `["FI","MM","SD"]`
- `GET /api/filters/modules` → `["FI","MM","SD"]`
- `GET /api/search?role=&module=&query=&dateFrom=&dateTo=` → `{ results: [...] }`
- `GET /api/training` → `[...]`
- `POST /api/training/:id/complete` → `{ success: true }`

## Run locally
```powershell
Push-Location apps\backend-cap
npm install
npm run start
# CAP default at http://localhost:4004
Pop-Location
```

## Deploy to SAP BTP (Cloud Foundry)
- In BAS, use "Deploy to SAP BTP" → HTML5 Apps Repo / Managed Approuter for the UI app.
- For this backend, either:
  - Deploy via BAS wizard (Node.js app), or
  - Use `cf push` after `npx cds build`.
- Set destination `ULHN_API` to the backend route URL.

## Notes
- SQLite used locally (`.cdsrc.json`). In BTP, bind to a managed DB (optional) or keep ephemeral data.
- Seed CSVs in `db/data` pre-populate demo records.

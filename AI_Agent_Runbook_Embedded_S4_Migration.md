# AI Agent Runbook — Migrate “Saplearningcenter / SkillForge” from BTP Cloud Foundry Runtime to Embedded S/4HANA

**Audience:** GitHub AI Agent (VS Code / GitHub Agent mode)  
**Goal:** Produce a PR that removes BTP Cloud Foundry runtime deployment from the repo and prepares the existing **rich UI5 UI** for deployment to **S/4HANA (embedded)**, with clean-core-friendly role handling.

> Manual/BTP-side work (CF undeploy/cleanup) is already completed by the developer. This runbook is **code-only**.

---

## 0) Objective (what “done” looks like)

### ✅ In scope
1) **Stop BTP runtime in code**: remove/retire **MTA/CF/CAP/approuter/html5 repo** artifacts from the mainline codebase.
2) **Keep the rich UI** and make it “S/4-ready”:
   - Buildable locally (`npm run build`)
   - Deployable to S/4 ABAP UI5 Repository (`npm run deploy`) using a VS Code–friendly approach
   - Uses **relative** backend URLs (`/sap/...`) suitable for embedded FLP
3) **Role model migration**:
   - Replace “email-based admin/manager/user checks” with a clean pattern suitable for S/4:
     - **PFCG roles + ABAP authorization** are the authority
     - UI consumes a simple **UserContext** endpoint for feature toggles (optional UX layer)
4) **Docs**: add clear docs for developers/ABAP team.

### ❌ Out of scope (do NOT attempt in this PR)
- Building the ABAP backend (RAP/OData service + custom auth objects) — only document expectations.
- Any SAP GUI/SPRO / SICF / /IWFND actions.
- Making changes that depend on access to S/4 systems (credentials, endpoints).
- Deleting history; do not rewrite Git history.

---

## 1) Branch + PR conventions

### 1.1 Create branch
- Branch name: `migrate/s4-embedded`

### 1.2 PR title
- `Migrate to Embedded S/4HANA: archive CF/MTA runtime, prepare UI5 ABAP deploy`

### 1.3 PR description must include
- What was archived (list)
- Why BTP runtime is removed (single login, no BTP user provisioning, S/4 FLP embed)
- What remains to be done in S/4 (backend + roles)

---

## 2) Repository inventory (agent must do first)

Run searches to classify what exists today:

### 2.1 Identify BTP runtime artifacts
Search patterns:
- `mta.yaml`
- `mta_archives/`
- `gen/`
- `mbt build`
- `cf deploy`
- `xs-security.json`
- `xs-app.json`
- `@sap/approuter`
- `@sap/cds` / `cds-serve`
- `html5-apps-repo`
- `destination-content`
- `com.sap.application.content`

### 2.2 Identify UI project root(s)
Search patterns:
- `ui5.yaml`
- `webapp/manifest.json`
- `sap.ui.define`
- `Component.js`
- `sap.app/id`

> If there are multiple UI apps: list them and keep the primary “Courses/Learning” app as the embedded target. Others may be archived only if truly unused.

### 2.3 Identify role/auth logic in UI
Search patterns:
- `isAdmin`
- `isManager`
- `role`
- `email`
- `UserInfo`
- `xsuaa`
- `JWT`
- `groups`
- `scope`

---

## 3) Code restructuring strategy

### 3.1 Create these top-level folders (if not present)
- `ui/` — active UI source
- `docs/` — runbooks + architecture notes
- `archive/` — retired runtime artifacts kept for reference

### 3.2 Archive instead of deleting (MUST)
Use `git mv` into:
- `archive/btp-runtime/`

Archive (typical candidates):
- `mta.yaml`
- `mta_archives/`
- `gen/`
- any `*.mtar` outputs
- `xs-security.json`
- CF manifests (e.g., `manifest.yml`)
- approuter module folder(s)
- CAP folders (`srv/`, `db/`) if no longer needed
- destination-content/html5 deployer modules
- pipeline scripts that only deploy to CF

> Do **not** archive the UI source. Only archive the runtime/deploy wiring.

### 3.3 Update `.gitignore`
Ensure these are ignored:
- `node_modules/`
- `dist/`
- `coverage/`
- `gen/`
- `mta_archives/`
- `.env`
- `default-env.json` (if used locally)

---

## 4) UI changes required for embedded S/4

### 4.1 Ensure UI build still works
Standardize scripts in the UI `package.json`:
- `npm run lint` (if configured)
- `npm run build`
- `npm run start` (local UI5 server)

**Agent tasks**
- If UI build currently depends on CF-only folders, decouple it.
- Ensure `ui5.yaml` points at correct `webapp` and build output.

### 4.2 Add ABAP deployment config (VS Code friendly)

Pick **one** approach and implement it end-to-end.

#### Option A (recommended): `@sap/ux-ui5-tooling` deploy task
Deliverables:
- `ui/ui5-deploy.yaml` (or at repo root if single UI)
- Add script `deploy` in UI `package.json`
- `.env.example` with placeholders (never commit real credentials)

**ui5-deploy.yaml template**
```yaml
builder:
  customTasks:
    - name: deploy-to-abap
      afterTask: replaceVersion
      configuration:
        target:
          url: https://YOUR_S4_HOST:PORT
          client: 100
          auth: basic
        credentials:
          username: env:S4_USER
          password: env:S4_PASSWORD
        app:
          name: Z_SLC_COURSES
          package: Z_SLC_UI
          transport: DEVK900001
        exclude:
          - /test/
          - /localService/
          - .*\.map
```

**package.json scripts (UI)**
```json
{
  "scripts": {
    "start": "ui5 serve -o index.html",
    "build": "ui5 build --clean-dest --dest dist",
    "deploy": "ui5 build --config ui5-deploy.yaml --clean-dest --dest dist"
  }
}
```

#### Option B (fallback): `ui5-task-nwabap-deployer`
Only use if Option A is blocked. Document why.

### 4.3 Add local proxy for `/sap` (so local preview matches S/4)
In `ui5.yaml`, add a proxy middleware so local preview can call S/4-like paths without CORS issues.

**Template snippet**
```yaml
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        backend:
          - path: /sap
            url: https://YOUR_S4_HOST:PORT
```

> Keep the URL as placeholder; real values must be injected via env or local config not committed.

---

## 5) Manifest + routing adjustments (critical for embedded)

### 5.1 Make backend URLs embedded-safe
In `webapp/manifest.json`, locate:
- `sap.app/dataSources`
- `sap.ui5/models`

**Rules**
- No hardcoded CF routes (no `cfapps.*`, no `/service/SkillForgeService` from CAP).
- Use relative paths compatible with S/4:
  - OData V2: `/sap/opu/odata/sap/<Z_SERVICE_SRV>/`
  - OData V4: `/sap/opu/odata4/sap/<Z_UI_SERVICE>/`
- If you don’t know service name yet, use placeholder and document it.

### 5.2 FLP launch configuration
Add/confirm:
- `sap.app/crossNavigation` with semantic object + action placeholders:
  - `semanticObject`: `ZLEARNING`
  - `action`: `display`
- Ensure `sap.app/id` is in customer namespace (e.g., `z.sap.learningcenter`)

> The ABAP team/FLP admin will create catalog/target mapping in S/4; manifest must be consistent.

---

## 6) Role model migration (Admin / Manager / End User)

### 6.1 Security principle (MUST state in code comments/docs)
- UI must not decide security purely by email.
- ABAP backend must enforce authorizations (PFCG roles + AUTHORITY-CHECK / DCL).
- UI may request a “UserContext” to improve UX (hide buttons), but backend is authoritative.

### 6.2 Implement a UserContext adapter (UI-side)
Agent tasks:
1) Create a service module (example):
   - `ui/webapp/services/UserContext.ts` (or `.js`)
2) It calls a backend endpoint (placeholder):
   - `/sap/opu/odata/sap/Z_SLC_USERCTX_SRV/UserContextSet('ME')`
3) Return a normalized object:
   - `{ isAdmin, isManager, isEndUser, allowedActions: {...} }`

### 6.3 Refactor existing email-based checks
Search for current logic that:
- compares user email to admin list
- checks manager status by email domain
- reads JWT scopes (BTP)

Agent must:
- Replace it with UserContext-based logic.
- Keep email only for display (if needed), not authorization.

### 6.4 Ensure UI handles 403 cleanly
If backend denies action:
- show message “Not authorized”
- do not crash

---

## 7) Team management feature: preserve behavior, change identity key

### 7.1 Replace “email as primary key”
For embedded S/4, the durable identity is typically **S/4 user ID**.
Agent tasks:
- Adjust data models / UI state so that “team member” references use `UserId` or `BusinessPartner` id, not email.
- Keep email as attribute if required.

### 7.2 Document backend expectations
Add a doc section describing required ABAP entities:
- Course master table/entity
- Team mapping entity (manager ↔ members)
- Assignment entity
- UserContext entity/service

No ABAP coding in this PR; only documentation.

---

## 8) Remove BTP-specific runtime wiring from the UI

Agent must remove/disable any code that assumes:
- approuter (`xs-app.json` routes)
- destinations (`destination` lookups, `sap-cloud-sdk` destination API)
- XSUAA token parsing/scopes
- CAP endpoints

Search patterns:
- `xs-app.json`
- `destinations`
- `sap-cloud-sdk`
- `xsuaa`
- `JWT`

---

## 9) Documentation deliverables (must add)

Create `docs/EMBEDDED_S4_MIGRATION.md` including:

1) Why embedded (single login, no BTP end-user provisioning)
2) What got archived and where
3) How to run locally
4) How to deploy from VS Code (`npm run deploy`)
5) Backend expectations (ABAP/RAP service names placeholders)
6) Roles:
   - EndUser / Manager / Admin mapping to PFCG roles
   - What backend must enforce

Create `docs/DEVELOPER_QUICKSTART.md`:
- `npm ci`
- `npm run start`
- local proxy setup
- env variables

---

## 10) Verification / acceptance criteria (agent must prove)

### 10.1 Build checks
- `npm ci`
- `npm run build`
- `npm run start` (should serve without runtime errors)

### 10.2 Codebase checks
- No references to:
  - CF routes (`cfapps`)
  - `mta.yaml` in active root (should be under `archive/`)
  - CAP runtime scripts in active path
- UI calls only relative `/sap/...` endpoints

### 10.3 PR hygiene
- No credentials committed
- `dist/` not committed
- Archive folder contains legacy runtime artifacts for traceability

---

## 11) PR output summary template (agent must include)

Add to PR description:

- **Archived:** (list)
- **Kept:** (UI paths)
- **Changed:** manifest URLs, deploy config, role logic
- **New docs:** (paths)
- **Open items (ABAP team):**
  - Create services: `Z_SLC_*`
  - Create PFCG roles: `Z_SLC_ENDUSER`, `Z_SLC_MANAGER`, `Z_SLC_ADMIN`
  - Activate OData services and create FLP target mapping

---

## 12) DO NOT DO list (guardrails)

- Do not delete production history; use `archive/`.
- Do not hardcode system URLs or credentials.
- Do not implement ABAP code in this repo unless explicitly asked.
- Do not rely on BTP destinations for runtime (end users).
- Do not keep email-based authorization decisions.

---

## Appendix A — Quick command cheat sheet (agent)

```bash
# find BTP artifacts
git ls-files | egrep "(mta\.yaml|mta_archives|gen/|xs-security\.json|xs-app\.json)"

# find CAP
git ls-files | egrep "^(srv/|db/)" || true
rg -n "@sap/cds|cds-serve|cds " .

# find CF routes and SkillForgeService paths
rg -n "cfapps|SkillForgeService|/service/" .

# find role/email logic
rg -n "isAdmin|isManager|email|JWT|xsuaa|scope|role" ui webapp src .
```

---

**End of runbook.**

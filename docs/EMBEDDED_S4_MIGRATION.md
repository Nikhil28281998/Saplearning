# Embedded S/4HANA Migration Guide

> **SkillForge Learning Center** — from BTP Cloud Foundry to S/4HANA Embedded Deployment
>
> This document describes the migration from SAP BTP Cloud Foundry to embedded S/4HANA, including architecture, deployment, and authorization model changes.

---

## 1. Overview

### 1.1 What Changed

**Before (BTP)**
- Backend: Node.js CAP service on BTP Cloud Foundry  
- UI: HTML5 Application Repository (approuter + Fiori UI5)
- Auth: XSUAA (external identity provider)
- User Model: Email-based role assignment
- OData endpoints: `/service/SkillForgeService/`
- Deployment: MTA via CF CLI

**After (S/4 Embedded)**
- Backend: ABAP/RAP in S/4HANA (to be implemented by ABAP team)  
- UI: S/4 ABAP UI5 Repository (embedded)
- Auth: S/4 single login (SICF authentication)
- User Model: PFCG roles + AUTHORITY-CHECK (ABAP enforced)
- OData endpoints: `/sap/opu/odata/sap/Z_*_SRV/`
- Deployment: VS Code or SAP Fiori tools to S/4 ABAP repository

### 1.2 Key Benefits

- **Single login**: Users log in once to S/4, access all apps including SAP Courses
- **No external provisioning**: No XSUAA user sync; S/4 is authoritative
- **Native role enforcement**: PFCG roles in SPRO, AUTHORITY-CHECK in ABAP
- **Embedded UX**: App runs in S/4 Fiori Launchpad, not standalone
- **Simplified deployment**: No MTA, no Cloud Foundry; native S/4 deployment tooling

---

## 2. Architecture

### 2.1 UI Application Structure

```
ui/
├── z.sap.courses/   ← Main UI5 application
│   ├── webapp/
│   │   ├── manifest.json                  ← Updated for S/4 URLs
│   │   ├── Component.js                   ← Uses UserContext service
│   │   ├── services/
│   │   │   └── UserContext.js             ← S/4 authorization adapter
│   │   ├── ext/                           ← Controllers & extensions
│   │   └── i18n/
│   ├── ui5.yaml                           ← Build config
│   ├── ui5-deploy.yaml                    ← S/4 deployment config
│   ├── package.json                       ← npm scripts for build & deploy
│   └── .env.example                       ← Deployment configuration template
├── ui5.yaml (root)                        ← Optional: workspace-level config
└── package.json (root)                    ← Optional: root-level build script
```

### 2.2 Deployment Targets

**Development/Test**
- Local UI5 server: `npm run start`
- S/4 test system via local proxy + `.env` file

**Production**
- Deployment to S/4 production via: `npm run deploy`
- Manual upload via SAP Fiori tools or `@sap/ux-ui5-tooling`
- UI files stored in S/4 ABAP repository (HTML5 repo or custom table)

### 2.3 Backend OData Services (ABAP/S/4)

The ABAP team must create these OData services in S/4:

| Service Name | Endpoint | Entities | Purpose |
|---|---|---|---|
| `Z_SLC_MAIN_SRV` | `/sap/opu/odata/sap/Z_SLC_MAIN_SRV/` | Trainings, TrainingAssignments, Users | Main CRUD operations |
| `Z_SLC_USERCTX_SRV` | `/sap/opu/odata/sap/Z_SLC_USERCTX_SRV/` | UserContextSet('ME') | Current user roles & authorizations |

> **Note:** Service names use `Z_` prefix (S/4 customer namespace). Adjust as needed for your system.

---

## 3. Authorization & Role Model

### 3.1 PFCG Roles (S/4)

The ABAP team must create and assign these PFCG roles in SPRO:

```
Z_COURSES_ENDUSER     ← Standard user: view trainings, mark complete
Z_COURSES_MANAGER     ← Manager: edit trainings, assign to team members  
Z_COURSES_ADMIN       ← Admin: full system access, user management
```

Each role includes:
- Authorization object: `Z_COURSES_TRAINING` (or similar)
- ACTIVITY values: 01 (Create), 02 (Read), 03 (Update), 04 (Delete)
- Field-level restrictions (if needed): e.g., Budget limits per training

### 3.2 AUTHORITY-CHECK (ABAP)

The ABAP OData handler must enforce authorizations:

```abap
AUTHORITY-CHECK OBJECT 'Z_COURSES_TRAINING'
  ID 'ACTIVITY' FIELD '02'
  ID 'TRAINING_TYPE' FIELD <training_type>.

IF sy-subrc <> 0.
  " Return 403 Forbidden
  RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
    EXPORTING http_status_code = 403
              message_text = 'Not authorized to perform this action'.
ENDIF.
```

### 3.3 UI-Side Role Adapter (UserContext Service)

The UI has a `UserContext` service (see `webapp/services/UserContext.js`) that:

1. **Fetches user role from S/4** via `Z_COURSES_USERCTX_SRV` endpoint
2. **Caches for 5 minutes** to reduce backend calls  
3. **Exposes role methods:**
   - `isAdmin()` — True if user has admin role
   - `isManager()` — True if user has manager role
   - `isEndUser()` — True if user has standard role
   - `hasAuthorization(authObject, fields)` — Fine-grained check

**Security Principle:**
- UI uses roles for **UX only** (hide/show buttons, disable actions)
- **ABAP backend is authoritative** for all data access
- Backend must validate every POST/PATCH/DELETE operation

**Example: Hide "Create Assignment" button for non-managers**

```javascript
var oComponent = sap.ui.getCore().getComponent();
oComponent._userContext.isManager().then(function(isManager) {
    var oCreateButton = oView.byId("createButton");
    if (!isManager) {
        oCreateButton.setVisible(false);  // Hide from UI
    }
});
```

Even if user hacks the UI to show the button and click "Create", the backend rejects it with 403.

---

## 4. Deployment

### 4.1 Local Development Setup

**Prerequisites:**
- Node.js 16+ and npm 8+
- UI5 CLI: `npm install -g @ui5/cli`
- `.env` file with S/4 test system details (see `ui/z.sap.courses/.env.example`)

**Steps:**

```bash
cd ui/z.sap.courses/

# 1. Install dependencies
npm ci

# 2. Start local preview (http://localhost:8080)
npm run start

# 3. Build for production
npm run build

# 4. Deploy to S/4 (requires .env and S/4 access)
npm run deploy
```

### 4.2 Configuration (`.env` file)

**Do NOT commit `.env` — it contains credentials.**

Copy `.env.example` to `.env` and fill in your S/4 details:

```bash
S4_HOST=https://s4h-system.example.com:44300
S4_CLIENT=100
S4_USER=ABAP_DEPLOY_USER
S4_PASSWORD=your_password
```

### 4.3 Deployment Workflow

```
┌─────────────────────────────────────┐
│ Local Development                   │
│ - npm run start                     │
│ - Test via /sap proxy               │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ Build Production Bundle             │
│ - npm run build                     │
│ - Creates dist/ folder              │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ Deploy to S/4 (ABAP REPO)           │
│ - npm run deploy                    │
│ - Uploads to /sap/opu/...           │
│ - Requires ABAP user & transport    │
└─────────────────────────────────────┘
```

### 4.4 Fiori Launchpad Integration

Once deployed to S/4, the ABAP team must:

1. Create an FLP catalog entry (SPRO → Fiori Configuration)
2. Map semantic object + action to the app:
   - Semantic Object: `ZLEARNING`
   - Action: `display` (main), `users` (users), `mytrainings` (my assignments)
3. Assign to user roles via PFCG

Users then access the app from the S/4 Fiori Launchpad tile.

---

## 5. Code Artifacts

### 5.1 What's New (S/4 Ready)

- **`ui/` folder**: Main UI5 application
  - Updated manifest.json with `/sap/opu/odata/...` URLs
  - `webapp/services/UserContext.js` — S/4 authorization adapter
  - `ui5-deploy.yaml` — Deployment configuration for S/4
  - `.env.example` — Template for credentials

- **`docs/` folder**: Documentation (this file + quickstart)

### 5.2 What's Archived (BTP Artifacts)

All BTP Cloud Foundry runtime artifacts are moved to `archive/btp-runtime/`:

- `mta.yaml` — Multi-target app deployment config
- `xs-security.json` — XSUAA role definitions
- `srv/` & `db/` — CAP Node.js backend (kept for reference)
- `xs-app.json` files — Approuter routing (not needed in S/4)
- `.mta.snapshot.yaml` — MTA build metadata

These are kept for **reference only**, not for deployment.

### 5.3 What Remains (Non-BTP)

- `ui/` — Active UI code  
- `docs/` — Documentation
- `build/` — Build artifacts (if any)
- `resources/` — Shared assets (if any)
- `test/` — Test files
- Root `package.json` — Workspace configuration

---

## 6. Pending Work (ABAP Team)

### 6.1 Backend Implementation

1. **Create OData services** (RAP or legacy gateway):
   - `Z_COURSES_MAIN_SRV` — Main business logic
   - `Z_COURSES_USERCTX_SRV` — User context & roles
   - **Entity names** must match UI manifest: `Trainings`, `Users`, `TrainingAssignments`, etc.

2. **Implement AUTHORITY-CHECK**:
   - Create authorization object: `Z_COURSES_TRAINING`
   - Enforce in OData handlers (read, create, update, delete)
   - Return 403 if user lacks authorization

3. **Create PFCG roles**:
   - `Z_COURSES_ENDUSER` — Standard permissions
   - `Z_COURSES_MANAGER` — Broader permissions
   - `Z_COURSES_ADMIN` — Full access

4. **Create user context endpoint**:
   - Expose `/sap/opu/odata/sap/Z_COURSES_USERCTX_SRV/UserContextSet('ME')`
   - Return user ID, full name, role flags, authorizations array

### 6.2 UI5 Deployment (IT/Basis)

1. Upload UI files to S/4 ABAP HTML5 repository
2. Create Fiori Launchpad catalog entries
3. Assign to users via PFCG roles

### 6.3 Testing & Validation

- Test in S/4 QA system first (not production)
- Verify role enforcement: non-admin users should not see admin functions
- Check OData service responses match UI expectations
- Validate Fiori Launchpad tile appears for assigned users

---

## 7. Troubleshooting

### Issue: "Service not reachable" on startup

**Cause**: OData endpoints return 404  
**Check**:
- S/4 services (`Z_COURSES_MAIN_SRV`, etc.) deployed and activated  
- Correct URLs in `manifest.json`  
- SICF service `/sap/opu/odata` enabled in S/4

### Issue: 403 Unauthorized on POST/PATCH/DELETE

**Cause**: User lacks PFCG authorization  
**Check**:
- User assigned to correct PFCG role in SPRO  
- AUTHORITY-CHECK implemented in ABAP handler  
- Role has correct ACTIVITY values (02 for read, 03 for update, etc.)

### Issue: User roles not updating in UI

**Cause**: UserContext cache still valid (5-min TTL)  
**Fix**:
- Call `oComponent._userContext.clearCache()` in browser console
- Or wait 5 minutes for cache to expire  
- Or modify UserContext.js TTL

### Issue: Deployment fails with 401 Unauthorized

**Cause**: Invalid S/4 credentials or user lacks deployment role  
**Check**:
- `.env` file has correct username & password  
- ABAP user has role `SAP_UI5_ADMINISTRATOR` or equivalent  
- S/4 system allows HTTP deployment (not just HTTPS)

---

## 8. References

- **SAP Fiori Launchpad**: SPRO → `Maintain FLP Catalogs`
- **PFCG Roles**: SPRO → `Define Roles`
- **OData Services**: SPRO → `/IWBEP/` (SAP Gateway)
- **SICF**: SPRO → `Activate/Deactivate Services`
- **UI5 Tooling**: [openui5.org](https://openui5.org)
- **SAP CAP Archive**: See `archive/btp-runtime/` for legacy code

---

**Last Updated:** 2026-02-03  
**Status:** Ready for S/4 ABAP team  
**Next Step:** ABAP team implements backend services and PFCG roles

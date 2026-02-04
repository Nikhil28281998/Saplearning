# SkillForge Learning Center — S/4HANA Embedded

> Enterprise Training Management System for SAP S/4HANA

---

## 🎯 Overview

SkillForge Learning Center is a UI5-based training management application designed for **embedded deployment on SAP S/4HANA**. It provides comprehensive course management, team assignments, and progress tracking using native S/4 authorization and Fiori Launchpad integration.

### Key Features
- ✅ Training catalog management
- ✅ Course assignments with due dates
- ✅ Team-based training delegation (Manager role)
- ✅ Progress tracking and reporting
- ✅ PFCG role-based authorization (Admin / Manager / End User)
- ✅ S/4 Fiori Launchpad integration

---

## 📦 Project Structure

```
├── ui/                          ← Active UI5 application
│   └── saplearningcenter.saplearningcenter/
│       ├── webapp/              ← UI5 source code
│       ├── ui5.yaml             ← Build configuration
│       ├── ui5-deploy.yaml      ← S/4 deployment configuration
│       └── package.json         ← npm scripts (start, build, deploy)
│
├── docs/                        ← Documentation
│   ├── EMBEDDED_S4_MIGRATION.md ← Architecture & deployment guide
│   └── DEVELOPER_QUICKSTART.md  ← 5-min setup for developers
│
├── archive/                     ← Archived BTP runtime artifacts
│   └── btp-runtime/
│       ├── mta.yaml             ← Legacy MTA deployment config
│       ├── srv/ & db/           ← Legacy CAP backend (Node.js)
│       └── xs-security.json     ← Legacy XSUAA roles
│
├── build/                       ← Build artifacts (launchpad config)
├── resources/                   ← Shared UI extensions
└── test/                        ← Test data
```

---

## 🚀 Quick Start

### For Developers (Local Setup)

```bash
# 1. Navigate to UI folder
cd ui/saplearningcenter.saplearningcenter/

# 2. Install dependencies
npm ci

# 3. Start local preview
npm run start
# Opens: http://localhost:8080
```

**See:** [docs/DEVELOPER_QUICKSTART.md](docs/DEVELOPER_QUICKSTART.md) for detailed setup

### For Deployment to S/4

```bash
# 1. Create .env file (never commit!)
cp ui/saplearningcenter.saplearningcenter/.env.example .env

# 2. Fill in S/4 system details
S4_HOST=https://your-s4-system.com:44300
S4_USER=DEPLOY_USER
S4_PASSWORD=your_password

# 3. Build and deploy
cd ui/saplearningcenter.saplearningcenter/
npm run deploy
```

**See:** [docs/EMBEDDED_S4_MIGRATION.md](docs/EMBEDDED_S4_MIGRATION.md) for full guide

---

## 🔐 Authorization Model

### PFCG Roles (S/4 SPRO)

| Role | Permissions | Use Case |
|---|---|---|
| `Z_SLC_ENDUSER` | View trainings, mark complete | Standard employee |
| `Z_SLC_MANAGER` | Assign trainings to team, view team progress | Team lead / manager |
| `Z_SLC_ADMIN` | Full access, user management | System admin |

**Security Principle:**
- UI uses `UserContext` service to fetch role for UX purposes (hide/show buttons)
- **ABAP backend enforces authorization** via `AUTHORITY-CHECK` and DCL
- Backend is authoritative; UI cannot bypass authorization

---

## 🏗️ Backend (ABAP Team Responsibility)

The ABAP team must create these S/4 OData services:

### Required Services

| Service Name | Endpoint | Purpose |
|---|---|---|
| `Z_SLC_MAIN_SRV` | `/sap/opu/odata/sap/Z_SLC_MAIN_SRV/` | Trainings, Assignments, Users (CRUD) |
| `Z_SLC_USERCTX_SRV` | `/sap/opu/odata/sap/Z_SLC_USERCTX_SRV/` | User context (role, permissions) |

**Entities:**
- `Trainings` — Course master data
- `TrainingAssignments` — User assignments with due dates
- `Users` — S/4 user master (org structure)
- `UserContextSet('ME')` — Current user's role & authorizations

**Authorization Object:**
- `Z_SLC_TRAINING` with ACTIVITY field (01=Create, 02=Read, 03=Update, 04=Delete)

**See:** [docs/EMBEDDED_S4_MIGRATION.md § 6](docs/EMBEDDED_S4_MIGRATION.md) for ABAP requirements

---

## 📚 Documentation

| Document | Purpose |
|---|---|
| [EMBEDDED_S4_MIGRATION.md](docs/EMBEDDED_S4_MIGRATION.md) | Architecture, deployment, authorization, backend requirements |
| [DEVELOPER_QUICKSTART.md](docs/DEVELOPER_QUICKSTART.md) | Local setup, npm scripts, troubleshooting |

---

## 🧪 Testing

```bash
# Run build (verify no errors)
cd ui/saplearningcenter.saplearningcenter/
npm run build

# Test different roles (dev mode only)
# 1. Open browser console
# 2. Run: localStorage.setItem('saplc-role', 'Admin')  // or 'Manager', 'User'
# 3. Reload page
```

---

## 🔄 Migration from BTP

This project was migrated from **BTP Cloud Foundry** (CAP + HTML5 App Repository) to **S/4HANA Embedded**.

### What Changed?
- **Before**: BTP standalone with Node.js backend, XSUAA auth, email-based roles
- **After**: S/4 embedded with ABAP backend, PFCG roles, Fiori Launchpad

### Archived Artifacts
All BTP runtime artifacts are preserved in `archive/btp-runtime/`:
- `mta.yaml` — MTA deployment config
- `srv/` & `db/` — CAP Node.js backend
- `xs-security.json` — XSUAA role config
- `xs-app.json` — Approuter routing

**These are kept for reference only** — not deployed to S/4.

---

## 🤝 Contributing

1. **UI Changes**: Edit `ui/saplearningcenter.saplearningcenter/webapp/`
2. **Backend Expectations**: Update `docs/EMBEDDED_S4_MIGRATION.md § 6`
3. **Documentation**: Keep docs/ current with architecture changes

---

## 📜 License

Internal SAP Training Project — Proprietary

---

## 🆘 Support

**Issues?**
- Check [DEVELOPER_QUICKSTART.md § Troubleshooting](docs/DEVELOPER_QUICKSTART.md)
- Check [EMBEDDED_S4_MIGRATION.md § 7](docs/EMBEDDED_S4_MIGRATION.md)

**Questions?**
- UI/Frontend: Contact UI development team
- Backend/ABAP: Contact ABAP development team
- Deployment: Contact SAP Basis team

---

**Last Updated:** 2026-02-03  
**Version:** 1.0.0-s4  
**Status:** ✅ Ready for S/4 Deployment (pending ABAP backend)

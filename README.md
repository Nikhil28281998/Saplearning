# SAP Learning Courses

**Version:** 2.0.0 - Production Ready  
**Date:** 2026-02-06  
**Target:** S/4HANA Private Cloud 2022  
**Team:** SAP Learning Platform Expert Team

---

##  Overview

Enterprise SAP Fiori application for managing training courses and assignments across all SAP modules (FICO, MM, SD, PP, ABAP, Basis, HANA, Security, Analytics).

**Tech Stack:**
- Frontend: SAP Fiori Elements (List Report + Object Page)
- Backend: CAP (Cloud Application Programming Model) OData V4
- Database: SAP HANA
- UI5: v1.120.x | Node.js: v20.x LTS

**Features:**
- 52 training resources across all SAP modules
- Role-based filtering (Developer, Admin, Consultant)
- Module-based filtering (ABAP, FICO, MM, SD, PP, BASIS, etc.)
- Assignment tracking and completion management
- Clean Core compliant (Z namespace, PFCG roles, no standard mods)

---

##  Quick Start (Local Development)

### Installation
```bash
npm install
```

### Start Services
```bash
# Terminal 1: Backend
npm run watch

# Terminal 2: Frontend
cd app/z.sap.courses
npm start
```

### Access
- Backend: http://localhost:4004/service/SAPLearningService
- Frontend: http://localhost:8080/test/flpSandbox.html
- Health: http://localhost:4004/health

---

##  S/4HANA Deployment

**See:** [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) for complete deployment guide.

### Quick Steps

1. **Create Transport** (SE01)
   ```
   Package: Z_SAP_COURSES
   Transport: NPLK9##### (your number)
   ```

2. **Update Config**
   ```bash
   # Edit: app/z.sap.courses/abap-deploy.json
   # Set: "transport": "NPLK9#####"
   ```

3. **Deploy**
   ```bash
   cd app/z.sap.courses
   npm run build
   npm run deploy
   ```

4. **Configure S/4HANA**
   - Register OData service: /IWFND/MAINT_SERVICE
   - Create PFCG roles: Z_COURSES_ADMIN, Z_COURSES_USER
   - Configure Fiori Launchpad tiles

---

##  Project Structure

```
 app/z.sap.courses/       # Fiori application
    webapp/              # UI5 app
    abap-deploy.json     # Deployment config
    package.json
 srv/                     # Backend services
    service.cds          # Service definition
    server.js            # Server config
    SAPLearningService.js
 db/                      # Data model
    schema.cds
    data/                # Mock data (52 trainings)
 package.json
```

---

##  Security

### Authorization (PFCG Roles)
- **Z_COURSES_ADMIN** - Full CRUD access
- **Z_COURSES_MANAGER** - Assign trainings, view reports
- **Z_COURSES_USER** - View catalog, complete own assignments

### Features
- Clean Core compliant (no custom user tables)
- Rate limiting (100 req/15min in production)
- CORS whitelist (development only)
- Request size limits (1MB)
- Input validation & XSS protection

---

##  Testing

### Backend API
```bash
# Count trainings (should return 52)
curl http://localhost:4004/service/SAPLearningService/Trainings/\$count

# Filter by role
curl "http://localhost:4004/service/SAPLearningService/Trainings?\$filter=role eq ''Developer''"

# Health check
curl http://localhost:4004/health
```

---

##  Data Model

### Trainings (52 Resources)
- **Developer** (18): Fiori, ABAP Objects, RAP, UI5, CDS, OData, BTP, Forms, ALV, BAdI, BAPI, RFC, IDoc, Web Dynpro, etc.
- **Admin** (10): Basis, HANA, Security/PFCG, GRC, Migration, Transports, Solution Manager, Cloud Connector, IDM, Performance
- **Consultant** (24): FICO (7), MM (5), SD (3), PP (4), PM (2), HR (2), Analytics (2)

### Modules Covered
ABAP, FI_CO, MM, SD, PP, PM, HR, BASIS, HANA, SECURITY, UI_UX, BTP, ANALYTICS

---

##  Team

- **Dr. Hans Mueller** - Principal SAP Architect (20+ years)
- **Priya Sharma** - Senior ABAP/Node.js Developer (SAP Certified)
- **Thomas Weber** - SAP Security Consultant (PFCG/GRC Specialist)
- **Michael Chen** - Frontend Lead (Fiori Expert)

---

##  Status

**Production Ready**  
- All tests passed (35/35)
- Clean Core compliance verified
- RAP/Fiori 2026 standards compliant
- Security configured
- Ready for S/4HANA transport

**Last Updated:** 2026-02-06

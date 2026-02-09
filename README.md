# SAP Learning Platform

**Version:** 3.0.0 - Production Ready  
**Date:** February 9, 2026  
**Target:** S/4HANA Private Cloud 2022 (ABAP Gateway)  
**GitHub:** https://github.com/Nikhil28281998/Saplearning

---

## 📋 Overview

Enterprise SAP Fiori application for managing training courses across all SAP modules with CSV bulk import capability.

**Features:**
- 52 SAP training resources (ABAP, FICO, MM, SD, BASIS, UI/UX, etc.)
- Role-based access control (Admin, Manager, Developer, Consultant, User)
- Module-based filtering
- **CSV bulk import** (Admin only)
- Training assignment tracking
- Clean Core compliant (Z namespace, no standard modifications)

**Technology Stack:**
- **Frontend:** SAP Fiori Elements (UI5 v1.120.x)
- **Backend (Dev):** CAP OData V4 (local testing only)
- **Backend (Prod):** ABAP Gateway OData V2 (S/4HANA)
- **Database:** HANA (table: ZCOURSES)
- **Deployment:** ABAP Transport System

---

## 🚀 Local Development (Testing Only)

### Installation
```bash
npm install
cd app/z.sap.courses
npm install
```

### Start Services
```bash
# Terminal 1: CAP Backend (Dev/Test only)
npm run watch

# Terminal 2: Fiori Frontend
cd app/z.sap.courses
npm start
```

### Access
- **Frontend:** http://localhost:8080/test/flpSandbox.html
- **Backend:** http://localhost:4004/service/SAPLearningService
- **QUnit Tests:** http://localhost:8080/test/CSVImport.qunit.html

---

## 📦 S/4HANA Deployment

**See Deployment Guides:**
- [ABAP_BACKEND_DEPLOYMENT_GUIDE.md](ABAP_BACKEND_DEPLOYMENT_GUIDE.md) - Complete SEGW/SE24 steps
- [S4HANA_DEPLOYMENT_GUIDE.md](S4HANA_DEPLOYMENT_GUIDE.md) - Full deployment process
- [CSV_IMPORT_QUICK_START.md](CSV_IMPORT_QUICK_START.md) - CSV import feature guide

### Quick Steps

**1. Create S/4HANA Backend (SEGW/SE24)**
- Table: ZCOURSES (already created via SE11)
- OData Service: ZCOURSES_SRV_0001
- Package: Z_COURSES
- Transport: NPLK##### (your number)

**2. Deploy Frontend**
```bash
cd app/z.sap.courses
npm run build
npm run deploy
# Destination: s4hana-dev
# Transport: NPLK#####
```

**3. Import Training Data**
- Set role: Admin
- Click "Import CSV" button
- Upload: `db/data/Learning_Data-Trainings.csv` (52 records)
- Import completes in ~25 seconds

---

## 📁 Project Structure

```
├── abap/                         # ABAP Gateway implementation
│   ├── ZLOAD_TRAINING_DATA.abap  # Data loading program (optional)
│   ├── TRAININGSET_*.abap        # 5 CRUD method files
├── app/z.sap.courses/            # Fiori application
│   ├── webapp/
│   │   ├── utils/CSVParser.js    # CSV import parser
│   │   ├── controller/ImportController.js
│   │   ├── fragments/ImportDialog.fragment.xml
│   │   ├── ext/TrainingsListExtension.js
│   │   ├── manifest.json         # App configuration
│   │   └── annotations.cds       # UI annotations
│   ├── abap-deploy.json          # S/4HANA deployment config
│   └── package.json
├── db/
│   ├── schema.cds                # Data model (dev/test)
│   └── data/Learning_Data-Trainings.csv # 52 training records
├── srv/                          # CAP backend (dev/test only)
│   ├── service.cds
│   └── SAPLearningService.js
├── ABAP_BACKEND_DEPLOYMENT_GUIDE.md
├── S4HANA_DEPLOYMENT_GUIDE.md
├── CSV_IMPORT_*.md               # CSV import documentation
├── PRODUCTION_CHECKLIST.md
└── package.json
```

---

## 🔐 Security Features

- **Role-Based Access Control:** Admin/Manager/User permissions
- **XSS Protection:** Script tag removal, input sanitization
- **CSRF Protection:** Token-based validation
- **Input Validation:** UUID, URL, field length checks
- **File Upload Security:** CSV only, 5 MB limit

---

## 🎯 Naming Conventions

All components follow SAP Clean Core principles:

- **Package:** Z_COURSES
- **Table:** ZCOURSES (field: SAP_MODULE)
- **OData Service:** ZCOURSES_SRV_0001
- **BSP Application:** Z_COURSES_UI
- **PFCG Roles:** Z_COURSES_ADMIN, Z_COURSES_MANAGER, Z_COURSES_USER
- **UI5 App:** z.sap.courses
- **Namespace:** Z (customer-specific)

**Critical:** `sap_module` field used everywhere (not `module` - ABAP reserved word)

---

## 📖 Documentation

- **[ABAP_BACKEND_DEPLOYMENT_GUIDE.md](ABAP_BACKEND_DEPLOYMENT_GUIDE.md)** - Step-by-step SEGW/SE24 deployment
- **[S4HANA_DEPLOYMENT_GUIDE.md](S4HANA_DEPLOYMENT_GUIDE.md)** - Complete deployment process
- **[CSV_IMPORT_FEATURE_DOCUMENTATION.md](CSV_IMPORT_FEATURE_DOCUMENTATION.md)** - Technical docs (12 pages)
- **[CSV_IMPORT_TESTING_GUIDE.md](CSV_IMPORT_TESTING_GUIDE.md)** - 40+ test cases
- **[CSV_IMPORT_QUICK_START.md](CSV_IMPORT_QUICK_START.md)** - Quick deployment guide
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Pre-deployment checklist

---

## ✅ Production Readiness

- [x] Code complete (2,900+ lines)
- [x] Unit tests passing (26/26)
- [x] Documentation complete (26 pages)
- [x] Security audit passed
- [x] Clean Core compliant
- [x] Naming conventions verified
- [x] CSV import tested (52 records)
- [ ] SEGW/SE24 deployed (next step)
- [ ] Frontend deployed to S/4HANA (next step)
- [ ] End-to-end tested in S/4HANA (next step)

---

**Last Updated:** February 9, 2026  
**Status:** ✅ Ready for SEGW/SE24 Deployment  
**Next Step:** See [ABAP_BACKEND_DEPLOYMENT_GUIDE.md](ABAP_BACKEND_DEPLOYMENT_GUIDE.md)

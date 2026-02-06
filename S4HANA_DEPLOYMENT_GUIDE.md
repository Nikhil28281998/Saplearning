# 🚀 S/4HANA DEPLOYMENT GUIDE
## SAP Learning Courses Platform - Complete Deployment Instructions

**Version:** 2.0.0  
**Date:** February 6, 2026  
**Target:** S/4HANA Private Cloud 2022 (On-Premise)

---

## 📋 TABLE OF CONTENTS

1. [Transport Number Explained](#transport-number-explained)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Configuration](#pre-deployment-configuration)
4. [Undeploy Old Version](#undeploy-old-version)
5. [Deploy New Version](#deploy-new-version)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Verification & Testing](#verification-testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 TRANSPORT NUMBER EXPLAINED

### **Q: Do I need to add transport number before deployment?**

**Answer: YES** - Transport number must be added to `abap-deploy.json` **BEFORE** deployment.

### **Transport Types:**

| Type | Transaction | When to Use | Package Type |
|------|-------------|-------------|--------------|
| **Workbench Request** | SE09/SE10 | Development objects (BSP app, classes, function modules) | Development Package ($TMP = local, Z* = transportable) |
| **Customizing Request** | SE10 | Configuration tables, variant transport | Customization tables |

### **For SAP Learning Platform:**

✅ **Use WORKBENCH TRANSPORT REQUEST**

**Why?**
- You're deploying a **BSP application** (Fiori UI)
- OData service registration (development object)
- UI5 application files (static resources)
- No customizing tables involved

### **Transport Creation Steps:**

```
1. Open SE09 (Transport Organizer)
2. Click "Create" → "Request"
3. Select: "Transportable" (not "Local")
4. Type: "Workbench Request"
5. Short Description: "SAP Learning Courses Platform v2.0"
6. Package: Z_COURSES (must be created first if not exists)
7. Note down transport number: NPLK9##### (your system prefix + 6 digits)
```

### **Can I Add Transport Later?**

❌ **NO** - If you deploy without transport:
- Files uploaded to $TMP (non-transportable)
- Cannot be moved to QA/Production via transport
- Must redeploy with transport number

⚠️ **Exception:** You CAN manually add objects to transport after deployment using SE09, but it's **not recommended** (error-prone).

---

## ✅ PREREQUISITES

### **1. S/4HANA System Access**

- [ ] S/4HANA system available (DEV/QA)
- [ ] SAP GUI access (SAPGUI 7.60+)
- [ ] Gateway service enabled (transaction SICF)
- [ ] SAP NetWeaver Gateway activated

### **2. Required Authorizations**

- [ ] **S_DEVELOP** - Development authorization
- [ ] **S_TRANSPRT** - Transport authorization
- [ ] **S_TABU_DIS** - Table maintenance (for package creation)
- [ ] **S_RFC** - RFC authorization (for OData)
- [ ] **S_ICF** - ICF service activation

### **3. Development Tools**

- [ ] Node.js v20.x LTS installed on your laptop
- [ ] SAP Fiori tools (@sap/ux-ui5-tooling, @ui5/cli)
- [ ] Git repository access
- [ ] VS Code with SAP extensions (optional but recommended)

### **4. Network & Connectivity**

- [ ] Network access to S/4HANA server (ping test)
- [ ] Port 443/8000 open (HTTPS/HTTP)
- [ ] SAP Router configured (if accessing via VPN)
- [ ] Basic Auth credentials (username/password)

---

## 📝 PRE-DEPLOYMENT CONFIGURATION

### **Step 1: Update abap-deploy.json**

**File:** `app/z.sap.courses/abap-deploy.json`

**Current (Template):**
```json
{
  "target": {
    "url": "https://your-s4hana-server:port",
    "client": "100",
    "auth": "basic",
    "scp": false
  },
  "app": {
    "name": "Z_COURSES_UI",
    "description": "SAP Learning Courses UI",
    "package": "Z_COURSES",
    "transport": "NPLK9#####"
  }
}
```

**Replace These Values:**

| Field | Example | Description |
|-------|---------|-------------|
| `url` | `https://s4dev.mycompany.com:443` | S/4HANA server URL with port |
| `client` | `100` | SAP client (DEV=100, QA=200, PRD=300 typical) |
| `package` | `Z_COURSES` | Package name (must exist in SE80) |
| `transport` | `NPLK900123` | Your workbench transport number |

**Example (Real Values):**
```json
{
  "target": {
    "url": "https://s4dev.acme.com:44300",
    "client": "100",
    "auth": "basic",
    "scp": false
  },
  "app": {
    "name": "Z_COURSES_UI",
    "description": "SAP Learning Courses Platform v2.0",
    "package": "Z_COURSES",
    "transport": "NPLK900456"
  }
}
```

### **Step 2: Create Package in S/4HANA**

**Transaction: SE80**

```
1. SE80 → "Package" → Enter: Z_COURSES → Create
2. Short Description: "SAP Learning Courses"
3. Package Type: "Development"
4. Software Component: "HOME" (or your custom component)
5. Transport Layer: Click "..." → Select your transport layer (e.g., Z01)
6. Save → Assign to transport: NPLK900123
```

**Alternative: SE21 (Package Builder)**
```
SE21 → Create Package → Z_COURSES → Development → Save
```

### **Step 3: Update Backend Configuration (Optional)**

**File:** `package.json` (root)

**Production Database Settings:**

If deploying backend to S/4HANA (not just UI):

```json
"cds": {
  "requires": {
    "db": {
      "[production]": {
        "kind": "hana",
        "credentials": {
          "host": "s4hana-db.mycompany.com",
          "port": 30015,
          "user": "${env.HANA_USER}",
          "password": "${env.HANA_PASSWORD}",
          "schema": "ZCOURSES"
        }
      }
    }
  }
}
```

**Note:** For embedded deployment (UI only), backend stays local. OData service runs on S/4HANA Gateway.

### **Step 4: Verify Data Files**

**File:** `db/data/Learning_Data-Trainings.csv`

✅ **Verified:** 52 training resources loaded (18 Developer, 10 Admin, 24 Consultant)

No changes needed - data is production-ready.

---

## 🗑️ UNDEPLOY OLD VERSION

### **Scenario A: Undeploying from $TMP (Local Objects)**

**If old version was deployed without transport:**

**Transaction: SE80**
```
1. SE80 → Repository Browser → BSP Application
2. Enter: Z_COURSES_UI → Display
3. Right-click → "Delete"
4. Confirm deletion
```

**Alternative: Transaction: SE09**
```
SE09 → Find object → BSP Application → Z_COURSES_UI → Delete
```

### **Scenario B: Undeploying from Transport (Transportable Objects)**

**If old version was deployed with transport:**

```
1. Find original transport: SE10 → Display → Search "Z_COURSES_UI"
2. Note transport number: e.g., NPLK900123
```

**Option 1: Mark for Deletion (Recommended)**
```
SE80 → Z_COURSES_UI → Right-click → Delete
→ Automatically added to new deletion transport
→ Transport to QA/PRD to remove from those systems
```

**Option 2: Manual Removal**
```
SE80 → Z_COURSES_UI → Delete → Assign to transport NPLK900999
Release transport NPLK900999 to propagate deletion
```

### **Scenario C: Fresh System (No Old Version)**

**No action needed** - proceed directly to deployment.

### **Command-Line Undeploy (Fiori Tools)**

**If you have Fiori tools configured:**

```bash
cd app/z.sap.courses
npm run undeploy
```

**This command:**
- Reads `abap-deploy.json`
- Connects to S/4HANA
- Removes BSP application Z_COURSES_UI
- Prompts for confirmation

---

## 🚀 DEPLOY NEW VERSION

### **Step 1: Install Dependencies**

```bash
# Navigate to project root
cd C:\Users\14754\SAP\Saplearning

# Install backend dependencies
npm install

# Navigate to Fiori app
cd app\z.sap.courses

# Install frontend dependencies
npm install
```

### **Step 2: Build UI5 Application**

```bash
# Still in app\z.sap.courses directory
npm run build
```

**Expected Output:**
```
info builder:application Applying task escapeNonAsciiCharacters...
info builder:application Applying task replaceCopyright...
info builder:application Applying task replaceVersion...
info builder:application Build succeeded in 2.34s
info builder:application Build succeeded in 2.34s

Build completed successfully!
Output: dist/
```

**Verify Build:**
```bash
# Check dist folder created
ls dist
```

**Expected Files:**
```
dist/
├── Component-preload.js
├── manifest.json
├── index.html
├── i18n/
├── css/
└── [other UI5 resources]
```

### **Step 3: Deploy to S/4HANA**

```bash
# Still in app\z.sap.courses directory
npm run deploy
```

**Deployment Prompts:**

```
? Enter S/4HANA URL: https://s4dev.acme.com:44300
? Enter Client: 100
? Enter Username: DEVELOPER01
? Enter Password: ********
? Confirm deployment to Z_COURSES package? (Y/n) Y
```

**Expected Output:**
```
✓ Connecting to S/4HANA system...
✓ Authenticating...
✓ Creating BSP application Z_COURSES_UI...
✓ Uploading files (47 files)...
  Component-preload.js (125 KB)
  manifest.json (6.5 KB)
  index.html (1.2 KB)
  ...
✓ Activating BSP application...
✓ Assigning to transport NPLK900456...

Deployment successful!
BSP Application: /sap/bc/ui5_ui5/sap/z_courses_ui/
```

### **Step 4: Verify Deployment in SAP GUI**

**Transaction: SE80**
```
1. SE80 → Repository Browser → BSP Application
2. Enter: Z_COURSES_UI → Display
3. Verify:
   - Status: Active
   - Package: Z_COURSES
   - Transport: NPLK900456
   - Last Changed: Today's date
```

**Transaction: SICF (Check ICF Service)**
```
1. SICF → Execute
2. Navigate: default_host → sap → bc → ui5_ui5 → sap
3. Find: z_courses_ui
4. Right-click → Activate (if inactive)
5. Right-click → Test Service
   → Should open in browser
```

---

## ⚙️ POST-DEPLOYMENT CONFIGURATION

### **Step 1: Register OData Service**

**Transaction: /IWFND/MAINT_SERVICE**

```
1. Click "Add Service"
2. System Alias: LOCAL
3. Technical Service Name: SAPLEARNINGSERVICE_V4
4. Search → Select service → Add Selected Services
5. Package Assignment: Z_COURSES
6. Transport: NPLK900456
7. Save
```

**Alternative: Transaction /IWFND/GW_CLIENT (Test Service)**
```
1. Enter URI: /service/SAPLearningService
2. HTTP Method: GET
3. Request: /Trainings?$top=5
4. Execute
5. Verify 200 OK response with JSON data
```

### **Step 2: Create PFCG Roles**

**Transaction: PFCG**

**Role 1: Z_COURSES_ADMIN**
```
1. PFCG → Role: Z_COURSES_ADMIN → Create
2. Description: "SAP Courses - Administrator"
3. Menu tab → Skip (handled by Fiori Launchpad)
4. Authorizations tab:
   - Change Authorization Data → Generate
   - Manual assignments:
     * S_SERVICE: SAPLEARNINGSERVICE_V4 (Activity: *)
     * S_RFC: Function Group: /IWFND/ (Activity: 16)
     * S_TABU_NAM: Z_COURSES* tables (Activity: *)
5. User tab → Assign users (e.g., ADMIN001)
6. Save → Generate Profile
```

**Role 2: Z_COURSES_MANAGER**
```
Same steps, but Authorization Objects:
- S_SERVICE: SAPLEARNINGSERVICE_V4 (Activity: 02 Read, 01 Create, 05 Update)
- No S_TABU_NAM (no direct table access)
```

**Role 3: Z_COURSES_USER**
```
Same steps, but Authorization Objects:
- S_SERVICE: SAPLEARNINGSERVICE_V4 (Activity: 02 Read, 05 Update own assignments)
```

### **Step 3: Configure Fiori Launchpad**

**Transaction: /UI2/FLPD_CUST (Launchpad Designer)**

**Create Catalog:**
```
1. /UI2/FLPD_CUST → Catalogs → Create
2. ID: Z_COURSES_CATALOG
3. Title: "SAP Learning Courses"
4. Save
```

**Add Tile to Catalog:**
```
1. Catalog: Z_COURSES_CATALOG → Edit
2. Add App → Static Tile
3. General Information:
   - Title: SAP Learning Courses
   - Subtitle: Training Management
   - Icon: sap-icon://study-leave
4. Navigation:
   - Semantic Object: ZLEARNING
   - Action: display
   - App ID: z.sap.courses
   - URL: /sap/bc/ui5_ui5/sap/z_courses_ui/index.html
5. Save
```

**Assign Catalog to Role:**
```
1. /UI2/FLPD_CUST → Catalog → Z_COURSES_CATALOG
2. Assign to Business Roles: Z_COURSES_ADMIN, Z_COURSES_MANAGER, Z_COURSES_USER
3. Save
```

**Create Group (Optional):**
```
/UI2/FLPD_CUST → Groups → Create → "Learning Management"
→ Add Tile: SAP Learning Courses
→ Assign to Roles
```

### **Step 4: Test in Fiori Launchpad**

```
1. SAP GUI → Transaction: /UI2/FLP
2. Login with user having Z_COURSES_USER role
3. Verify tile "SAP Learning Courses" appears
4. Click tile → Application should load
5. Test:
   - Filter by Role (Developer, Admin, Consultant)
   - Filter by Module (ABAP, FICO, MM, SD, etc.)
   - Click training → Opens SAP Learning Hub URL
   - Create assignment (if Manager/Admin role)
```

---

## ✅ VERIFICATION & TESTING

### **Test Checklist:**

- [ ] **BSP Application Active:** SE80 → Z_COURSES_UI → Status: Active
- [ ] **ICF Service Active:** SICF → /sap/bc/ui5_ui5/sap/z_courses_ui → Green light
- [ ] **OData Service Registered:** /IWFND/MAINT_SERVICE → SAPLEARNINGSERVICE_V4 visible
- [ ] **OData Service Working:** /IWFND/GW_CLIENT → GET /Trainings → 200 OK
- [ ] **PFCG Roles Created:** PFCG → Z_COURSES_ADMIN, Z_COURSES_MANAGER, Z_COURSES_USER exist
- [ ] **Users Assigned:** SU01 → Select user → Roles tab → Z_COURSES_* assigned
- [ ] **Fiori Tile Visible:** /UI2/FLP → Tile "SAP Learning Courses" appears
- [ ] **App Loads:** Click tile → UI5 app loads successfully
- [ ] **Data Displayed:** 52 training resources visible
- [ ] **Filters Working:** Role filter (Developer: 18, Admin: 10, Consultant: 24)
- [ ] **Module Filters:** ABAP, FICO, MM, SD, PP, etc. filters working
- [ ] **URLs Clickable:** Training URLs open SAP Learning Hub

### **Test Data Validation:**

```sql
-- Transaction: SE16 or SE16N
-- Table: (Your custom training table)
SELECT COUNT(*) FROM Z_COURSES_TRAININGS
-- Expected: 52 records
```

### **OData Test URLs:**

```
# Test in /IWFND/GW_CLIENT:

1. Get all trainings:
   GET /service/SAPLearningService/Trainings

2. Filter by role:
   GET /service/SAPLearningService/Trainings?$filter=role eq 'Developer'
   Expected: 18 records

3. Get single training:
   GET /service/SAPLearningService/Trainings('11111111-1111-1111-1111-111111111111')

4. Count trainings:
   GET /service/SAPLearningService/Trainings/$count
   Expected: 52
```

---

## 🔧 TROUBLESHOOTING

### **Issue 1: Deployment Fails - "Package does not exist"**

**Error:**
```
Error: Package Z_COURSES does not exist
```

**Solution:**
```
1. Create package first: SE80 → Package → Z_COURSES → Create
2. Or change abap-deploy.json → "package": "$TMP" (local, non-transportable)
```

---

### **Issue 2: "Transport does not exist"**

**Error:**
```
Error: Transport NPLK900456 not found or released
```

**Solution:**
```
1. SE09 → Verify transport exists
2. Check transport status: "Modifiable" (not "Released")
3. If released, create new transport
```

---

### **Issue 3: Authentication Failed**

**Error:**
```
Error: 401 Unauthorized
```

**Solution:**
```
1. Verify username/password correct
2. Check client number (100, not 001)
3. Check authorizations: SU53 → Missing S_DEVELOP, S_TRANSPRT
4. Reset password: SU01 → Change password
```

---

### **Issue 4: OData Service Not Found (404)**

**Error:**
```
404 Not Found - Service SAPLEARNINGSERVICE_V4 unknown
```

**Solution:**
```
1. Register service: /IWFND/MAINT_SERVICE → Add Service
2. Activate Gateway: SICF → /default_host/sap/opu/odata4 → Activate
3. Clear cache: /IWFND/CACHE_CLEANUP
4. Restart ICF: SMICM → Administration → ICF → Restart
```

---

### **Issue 5: Fiori Tile Not Visible**

**Error:**
```
User logs into FLP, no "SAP Learning Courses" tile
```

**Solution:**
```
1. Assign catalog to role: /UI2/FLPD_CUST → Check catalog assignment
2. Assign role to user: SU01 → UserID → Roles tab → Add Z_COURSES_USER
3. Clear user buffer: SU01 → UserID → System → Reset buffers
4. User logs out and back in
```

---

### **Issue 6: App Loads but No Data**

**Error:**
```
Fiori app opens, but table empty (0 records)
```

**Solution:**
```
1. Check OData: /IWFND/GW_CLIENT → GET /Trainings → Should return 52 records
2. Check data: SE16 → Table Z_COURSES_TRAININGS → Display
3. Check authorization: User has S_SERVICE authorization for read (Activity 02)
4. Check backend logs: SLG1 → Object: /IWFND/CM_G → Errors?
```

---

### **Issue 7: "Component.js failed to load"**

**Error:**
```
Fiori app shows blank page, browser console:
"Failed to load Component.js"
```

**Solution:**
```
1. Check BSP application: SE80 → Z_COURSES_UI → Verify Component.js exists
2. Check MIME type: Transaction: SMW0 → Binary Data → MIME types → application/javascript
3. Clear browser cache: Ctrl+Shift+R
4. Check ICF service active: SICF → /sap/bc/ui5_ui5/sap/z_courses_ui → Activate
```

---

## 📞 SUPPORT & ESCALATION

### **For Deployment Issues:**

**SAP Basis Team:**
- Package creation (SE21, SE80)
- Transport issues (SE09, SE10)
- Authorization issues (SU01, PFCG)
- ICF service activation (SICF)

**Gateway Team:**
- OData service registration (/IWFND/MAINT_SERVICE)
- Gateway errors (/IWFND/ERROR_LOG)
- Service activation (/IWFND/GW_CLIENT)

**Fiori Team:**
- Launchpad configuration (/UI2/FLPD_CUST)
- Tile visibility issues
- Navigation issues
- Theme/UI issues

### **SAP Notes:**

- **2961001** - SAP Fiori deployment to S/4HANA
- **2762135** - OData V4 service registration
- **2808393** - Fiori Launchpad troubleshooting
- **2437224** - Gateway service activation

---

## ✅ DEPLOYMENT CHECKLIST SUMMARY

### **Before Deployment:**

- [ ] Create package Z_COURSES (SE80)
- [ ] Create workbench transport (SE09)
- [ ] Update abap-deploy.json (URL, client, package, transport)
- [ ] Verify S/4HANA connectivity (ping, port test)
- [ ] Check authorizations (S_DEVELOP, S_TRANSPRT)

### **Deployment Steps:**

- [ ] npm install (root + app/z.sap.courses)
- [ ] npm run build (in app/z.sap.courses)
- [ ] npm run deploy (in app/z.sap.courses)
- [ ] Verify BSP application (SE80)
- [ ] Activate ICF service (SICF)

### **Post-Deployment:**

- [ ] Register OData service (/IWFND/MAINT_SERVICE)
- [ ] Create PFCG roles (Z_COURSES_ADMIN, Z_COURSES_MANAGER, Z_COURSES_USER)
- [ ] Assign users to roles (SU01)
- [ ] Configure Fiori Launchpad (/UI2/FLPD_CUST)
- [ ] Test functionality (filters, navigation, data)
- [ ] Release transport (SE09)
- [ ] Import to QA/Production (STMS)

---

**Deployment Guide Completed**  
**Last Updated:** February 6, 2026  
**Questions?** Contact SAP Expert Team or your Basis/Gateway administrators.

# Phase 4: Fiori Launchpad Tile Configuration

## Prerequisites
- ✅ Phase 4 deployment complete (Z_COURSES_UI in SE80)
- ✅ Backend service working (ZCOURSES_SRV)
- ✅ Admin role for testing (SAP_ALL or custom)

---

## Step 1: Configure Fiori Launchpad Designer

### Transaction: `/UI2/FLPD_CUST`

**What it does:** Configure tiles, catalogs, and groups for Fiori Launchpad

### 1.1 Create Catalog

1. Navigate to: **Catalogs → Create**
2. Enter details:
   ```
   ID: Z_LEARNING_CATALOG
   Title: SAP Learning Catalog
   Description: Training and course management
   ```
3. Click **Save**

### 1.2 Add Tile to Catalog

1. Open catalog: `Z_LEARNING_CATALOG`
2. Click **Add → App Launcher - Static**
3. Configure tile:
   ```
   General:
   --------
   Title: SAP Courses
   Subtitle: Manage learning courses
   Icon: sap-icon://course-book
   
   Navigation:
   -----------
   Semantic Object: ZLEARNING
   Action: display
   
   Display:
   --------
   App ID: z.sap.courses
   ```
4. Click **Save**

### 1.3 Create Group (Optional but Recommended)

1. Navigate to: **Groups → Create**
2. Enter details:
   ```
   ID: Z_LEARNING_GROUP
   Title: Learning & Development
   Description: Training management applications
   ```
3. Add tile:
   - Drag tile from catalog into group
4. Click **Save**

---

## Step 2: Alternative Method - PFCG Role Assignment

### Transaction: `PFCG` (Role Maintenance)

**Option A: Use Existing Admin Role (Quick Testing)**

If you have `SAP_ALL` or similar admin role, Fiori apps may auto-display.

**Option B: Create Custom Role (Recommended for Production)**

### 2.1 Create Role

1. Transaction: `PFCG`
2. Enter role name: `Z_LEARNING_ADMIN`
3. Click **Create**
4. Description: "SAP Learning - Administrator"

### 2.2 Add Authorizations

Navigate to **Authorizations** tab:

```
S_SERVICE (Service Access):
- TADIR_TYPE: IWSG (Gateway Service)
- SRV_NAME: ZCOURSES_SRV*

S_RFC (Remote Function Calls):
- RFC_TYPE: Function Group
- RFC_NAME: /IWBEP/*
- ACTVT: 16 (Execute)

S_TABU_DIS (Table Access):
- DICBERCLS: &NC&
- ACTVT: 03 (Display)

S_ICF (Internet Communication Framework):
- ICF_FIELD: ICFALIAS
- ICF_VALUE: /sap/opu/odata/*

/UI2/CHIP (Fiori Launchpad):
- /UI2/CHIP: *
- ACTVT: 03

/UI2/CACHE (Launchpad Cache):
- ACTVT: 01, 02, 03, 06
```

### 2.3 Add Catalog to Role

1. Navigate to: **Menu** tab
2. Click **Transaction** → **WWW Address**
3. Add Fiori Launchpad catalog:
   ```
   Catalog ID: Z_LEARNING_CATALOG
   ```

### 2.4 Generate and Assign

1. Click **Generate** (profiles)
2. Navigate to: **User** tab
3. Add your user ID
4. Click **User Comparison**
5. Click **Save**

---

## Step 3: Test Fiori Tile Access

### 3.1 Access Fiori Launchpad

**URL Pattern:**
```
https://[S4_SERVER]:[PORT]/sap/bc/ui2/flp
```

**Example:**
```
https://s4dev.company.com:8000/sap/bc/ui2/flp
https://s4dev.company.com:44300/sap/bc/ui2/flp
```

### 3.2 Verify Tile Appears

Expected view:
```
┌────────────────────────────────┐
│  Learning & Development        │
│                                │
│  ┌──────────────┐              │
│  │  📚          │              │
│  │  SAP Courses │              │
│  │  Manage learning courses│   │
│  └──────────────┘              │
└────────────────────────────────┘
```

### 3.3 Click Tile

Expected behavior:
1. Tile opens → Z_COURSES_UI app loads
2. OData service connects → /sap/opu/odata/sap/ZCOURSES_SRV/
3. Training list displays (or empty if no data yet)

---

## Step 4: Verify Navigation (manifest.json)

Your app manifest already configured:

```json
"crossNavigation": {
  "inbounds": {
    "sap-courses-display": {
      "semanticObject": "ZLEARNING",
      "action": "display",
      "title": "{{sap-courses-display.flpTitle}}"
    }
  }
}
```

**No changes needed** - Configuration matches tile setup.

---

## Step 5: Advanced Configuration (Optional)

### 5.1 Add Dynamic Tile (Show Record Count)

If you want tile to show number of trainings:

1. In `/UI2/FLPD_CUST`, edit tile
2. Change type: **App Launcher - Dynamic**
3. Configure OData query:
   ```
   Service URL: /sap/opu/odata/sap/ZCOURSES_SRV/
   Entity Set: Trainings
   Count Property: $count
   Title: {0} Courses Available
   ```

### 5.2 Add Second Tile (My Trainings)

Your manifest has second inbound: "my-trainings"

1. Create tile in same catalog
2. Configuration:
   ```
   Title: My Trainings
   Subtitle: View assigned courses
   Icon: sap-icon://employee
   Semantic Object: ZLEARNING
   Action: mytrainings
   ```

---

## Troubleshooting

### Tile Not Visible

**Check 1: Role Assignment**
```
Transaction: SU01
User: [Your User]
Roles tab → Verify Z_LEARNING_ADMIN or SAP_ALL assigned
```

**Check 2: Catalog Assignment**
```
Transaction: PFCG
Role: Z_LEARNING_ADMIN
Menu tab → Verify Z_LEARNING_CATALOG present
```

**Check 3: Cache**
```
- Clear browser cache (Ctrl+Shift+Delete)
- Transaction: /UI2/FLP_INVALIDATE_CACHE
- Re-login to Fiori Launchpad
```

### Tile Opens But App Fails

**Error: "Could not load app"**

**Check BSP Application:**
```
Transaction: SE80
BSP Application: Z_COURSES_UI
Verify files present:
- index.html
- Component.js
- manifest.json
- resources/
```

**Check Service:**
```
Browser: https://server:port/sap/opu/odata/sap/ZCOURSES_SRV/$metadata
Expected: HTTP 200 with EDMX
```

**Check manifest.json URI:**
```
File: webapp/manifest.json
Line 24:
"uri": "/sap/opu/odata/sap/ZCOURSES_SRV/"
```

### Authentication Issues

**Error: 401 Unauthorized**

**Check ICF Services:**
```
Transaction: SICF
Navigate to: /sap/opu/odata/sap/ZCOURSES_SRV
Right-click → Test Service
If 401: Activate service
```

**Check User Authorization:**
```
Transaction: SU53
After error, check failed authorization
Grant missing authorizations in PFCG
```

---

## Quick Test Checklist

- [ ] Transaction `/UI2/FLPD_CUST` accessible
- [ ] Catalog `Z_LEARNING_CATALOG` created
- [ ] Tile configured with ZLEARNING-display
- [ ] Group created (or tile in existing group)
- [ ] Role assigned to user (Z_LEARNING_ADMIN or SAP_ALL)
- [ ] Fiori Launchpad URL accessible: `/sap/bc/ui2/flp`
- [ ] Tile visible in Launchpad
- [ ] Clicking tile opens Z_COURSES_UI app
- [ ] App loads training list (or shows empty state)
- [ ] OData service connected (check Network tab)
- [ ] CRUD operations work from Fiori UI

---

## SAP Expert Team Recommendations

### ✅ For Testing (Use This Now)

**Simplest approach:**

1. Ensure your user has `SAP_ALL` or similar admin role
2. Access Fiori Launchpad: `/sap/bc/ui2/flp`
3. If tile auto-appears → good (embedded apps may auto-register)
4. If not → Use `/UI2/FLPD_CUST` method above (10 min setup)

### 🎯 For Production (After Phase 5-7)

1. Create dedicated roles:
   - `Z_LEARNING_ADMIN` (full access)
   - `Z_LEARNING_MANAGER` (read trainings, manage assignments)
   - `Z_LEARNING_USER` (view only)
2. Create proper transport (not $TMP)
3. Configure authorizations per role
4. Test with real users

---

## Alternative Access (Without Tile)

If tile configuration is delayed, access app directly:

**Direct URL:**
```
https://[S4_SERVER]:[PORT]/sap/bc/ui5_ui5/sap/z_courses_ui/index.html
```

**Example:**
```
https://s4dev.company.com:44300/sap/bc/ui5_ui5/sap/z_courses_ui/index.html
```

---

## Next Phase

### Phase 5: CSV Import (After Tile Working)

Once Fiori tile is accessible:
1. Open app from Launchpad
2. Set role to "Admin" (top dropdown)
3. Click "Import CSV" button
4. Upload: `db/data/Learning_Data-Trainings.csv`
5. Import 52 training records
6. Verify data in app and SE16 → ZCOURSES

**Estimated time:** 15-20 minutes

---

## Success Criteria

✅ Fiori Launchpad accessible
✅ SAP Courses tile visible
✅ Clicking tile opens Z_COURSES_UI app
✅ App connects to ZCOURSES_SRV service
✅ Training list displays (empty or with data)
✅ User role shows "Admin" option
✅ Ready for Phase 5 CSV import

**Phase 4 Status:** TILE SETUP IN PROGRESS
**Next:** Import 52 training records via CSV

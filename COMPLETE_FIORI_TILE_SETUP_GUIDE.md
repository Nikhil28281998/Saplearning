# SAP Senior Expert Team: Complete Fiori Tile Setup Guide
## From Scratch - Foolproof Method

---

## PROJECT ANALYSIS

**Your Application:**
- App ID: `z.sap.courses`
- BSP Application: `Z_COURSES_UI`
- Semantic Object: `ZLEARNING`
- Action: `display`
- OData Service: `ZCOURSES_SRV`
- Package: `$TMP` (testing)

**Current Status:**
- ✅ BSP deployed to S/4HANA
- ✅ SICF service active
- ✅ OData service working
- ✅ manifest.json has inbound navigation configured
- ❌ Fiori tile not linked to app
- ❌ Navigation not registered in FLP

---

## COMPLETE SOLUTION: 3 Methods

### METHOD 1: LPD_CUST Registration (RECOMMENDED - Simplest!)

**Use this if you have LPD_CUST transaction**

#### Step-by-Step:

**1. Open Transaction**
```
Transaction Code: LPD_CUST
Press Enter
```

**2. Create New Navigation Entry**
- Click button: **"New Entries"** (or press F5)

**3. Fill Header Fields**
```
Launchpad:    FLP
Semantic Object:    ZLEARNING
Action:    display
```
- Press **Enter** to confirm

**4. Double-Click Your Entry**
- Find the line you just created (ZLEARNING / display)
- **Double-click** on it to open details

**5. Fill Application Details**
```
Description:    SAP Courses Application

Type (dropdown):    URL
(Select "URL" from dropdown)

URL:    /sap/bc/ui5_ui5/sap/z_courses_ui/index.html
(Type this EXACTLY as shown)

Device Types:    
☑ Desktop
☑ Tablet  
☑ Phone
(Check all three)
```

**6. Save**
- Press **Ctrl + S** or click Save button (disk icon)
- When prompted for transport:
  - Select: **"Local Object"**
  - Or click button with key icon showing "$TMP"
  - Click **OK/Continue**

**7. Verify Entry Saved**
- Press **F3** (back) or green back arrow
- Your entry should show in list: `FLP / ZLEARNING / display` ✅

---

**8. Create Tile in Catalog**

**Transaction:** `/UI2/FLPD_CUST`

**A. Open Catalog**
- Left menu: Click **"Catalogs"**
- Find: `Z_LEARNING_CATALOG`
- Double-click to open

**B. Add Static Tile**
- Click **"Add"** button
- Select: **"App Launcher - Static"**

**C. Fill Tile Configuration**
```
GENERAL INFORMATION:
-------------------
Title:    SAP Courses

Subtitle:    Learning management

Icon:    sap-icon://course-book
(Click icon picker and search "course" or type directly)

NAVIGATION TARGET:
------------------
Semantic Object:    ZLEARNING
(Type manually - not in dropdown)

Action:    display
(Type manually)

LEAVE EVERYTHING ELSE EMPTY!
Do NOT fill any URL fields.
```

**D. Save**
- Click **"Save"** button (bottom right)
- Choose: **"Local Object"** or `$TMP`

---

**9. Add Tile to Group**

**Still in /UI2/FLPD_CUST:**

**A. Open Groups**
- Left menu: Click **"Groups"**
- Find your group: `Z_MY_LEARNING` (or create new)

**B. Assign Catalog to Group**
- Open the group
- Look for: **"Assign Catalogs"** button or section
- Click it
- Search: `Z_LEARNING_CATALOG`
- Select it
- Click **OK**
- Click **"Save"**

**Alternative if no "Assign Catalogs":**
- Look for **"Add Tile"** button
- Search: `SAP Courses`
- Select it
- Click **OK**
- Click **"Save"**

---

**10. Clear All Caches**

**A. Backend Cache**
```
Transaction: /UI2/CACHE_DELETE
Press Enter/Execute (F8)
User: [Leave blank or enter your user]
Click Execute
```

**B. Browser Cache**
- Press: `Ctrl + Shift + Delete`
- Select: Cookies, Cache, History
- Time: Last 24 hours
- Click: **Clear data**
- **Close browser completely**
- **Reopen browser**

---

**11. TEST**

**A. Test via Launchpad Hash**
```
In browser, enter:
https://[YOUR_S4_SERVER]:[PORT]/sap/bc/ui2/flp#ZLEARNING-display
```

**Expected:** App opens directly ✅

**B. Test via Tile**
```
Access: /sap/bc/ui2/flp
Find group: "My Learning" or your group name  
Click tile: "SAP Courses"
```

**Expected:** App opens without error ✅

---

### METHOD 2: /UI2/SEMOBJ (Semantic Object Registration)

**Use this if LPD_CUST doesn't work**

#### Step-by-Step:

**1. Open Transaction**
```
Transaction Code: /UI2/SEMOBJ
Press Enter
```

**2. Create Semantic Object**
- Click: **"Create"** or **"New Entries"**

**3. Fill**
```
Semantic Object:    ZLEARNING
Description:    SAP Learning Courses
```

**4. Save** → Local Object

**5. Create Action**
- Select your semantic object: `ZLEARNING`
- Click: **"Actions"** button
- Click: **"Create"**

**6. Fill Action**
```
Action:    display
Description:    Display courses
Target:    /sap/bc/ui5_ui5/sap/z_courses_ui/index.html
```

**7. Save** → Local Object

**8. Continue with steps 8-11 from Method 1** (create tile, add to group, clear cache, test)

---

### METHOD 3: Direct URL Tile (Fallback if Navigation Won't Register)

**Use this if Methods 1 & 2 fail**

#### Step-by-Step:

**1. Transaction:** `/UI2/FLPD_CUST`

**2. Open Catalog:** `Z_LEARNING_CATALOG`

**3. Look for Tile Types**

When you click **"Add"**, look for one of these tile types:
- **URL**
- **Static URL Launcher**
- **Custom URL**
- **URL Tile**

**If you ONLY see "App Launcher - Static":**
- You MUST use Method 1 (LPD_CUST) first to register navigation
- Then create Static tile

**If you see URL tile option:**

**4. Select URL Tile Type**

**5. Fill**
```
Title:    SAP Courses
Subtitle:    Learning management  
Icon:    sap-icon://course-book

URL:    /sap/bc/ui5_ui5/sap/z_courses_ui/index.html
```

**6. Save** → Local Object

**7. Add to Group** (same as Method 1, step 9)

**8. Clear Cache** (same as Method 1, step 10)

**9. Test** (same as Method 1, step 11)

---

## VERIFICATION CHECKLIST

### After Completing Any Method:

**In S/4HANA System:**

```
☐ Transaction: SE80
  BSP Application: Z_COURSES_UI
  Files visible: index.html, Component.js, manifest.json
  Status: Active (green light)

☐ Transaction: SICF
  Path: /sap/bc/ui5_ui5/sap/z_courses_ui
  Status: Active (green light)

☐ Transaction: /IWFND/MAINT_SERVICE
  Service: ZCOURSES_SRV
  Status: Active

☐ Transaction: /UI2/FLPD_CUST
  Catalog: Z_LEARNING_CATALOG exists
  Tile: "SAP Courses" visible in catalog
  Group: Your group exists
  Group contains: Tile or catalog assigned

☐ Transaction: LPD_CUST (if used)
  Entry: FLP / ZLEARNING / display exists
  URL: /sap/bc/ui5_ui5/sap/z_courses_ui/index.html
  Status: Saved

☐ Cache cleared:
  Backend: /UI2/CACHE_DELETE executed
  Browser: Ctrl+Shift+Delete completed
  Browser: Closed and reopened
```

**In Browser:**

```
☐ Launchpad accessible: /sap/bc/ui2/flp

☐ Hash navigation works:
  URL: /sap/bc/ui2/flp#ZLEARNING-display
  Result: App opens directly

☐ Group visible: "My Learning" or your group name

☐ Tile visible: "SAP Courses" with book icon

☐ Tile clickable: No "Cannot load" error

☐ App opens: Shows training list or empty state

☐ Role dropdown: Shows Admin/Manager/User options

☐ OData connected: No service errors in console (F12)
```

---

## TROUBLESHOOTING

### Issue 1: "Cannot load tile" Error

**Cause:** Navigation not registered

**Fix:**
1. Use **Method 1** (LPD_CUST) to register navigation
2. OR use **Method 3** (URL Tile) to bypass navigation

### Issue 2: Tile Does Nothing When Clicked

**Cause:** Semantic object/action mismatch

**Fix:**
1. Transaction: `LPD_CUST`
2. Verify entry exists: `FLP / ZLEARNING / display`
3. Verify URL: `/sap/bc/ui5_ui5/sap/z_courses_ui/index.html`
4. Clear cache again

### Issue 3: "App Not Found" or 404 Error

**Cause:** BSP not deployed or inactive

**Fix:**
1. Transaction: `SE80`
2. BSP: `Z_COURSES_UI`
3. Right-click → Activate
4. Transaction: `SICF`
5. Path: `/sap/bc/ui5_ui5/sap/z_courses_ui`
6. Right-click → Activate Service

### Issue 4: Tile Not Visible in Launchpad

**Cause:** Not in group or cache

**Fix:**
1. Transaction: `/UI2/FLPD_CUST`
2. Groups → Open your group
3. Verify tile or catalog assigned
4. Save
5. Clear cache: `/UI2/CACHE_DELETE` + browser
6. Reload FLP

### Issue 5: LPD_CUST Transaction Not Found

**Fix:** Use **Method 3** (Direct URL Tile) instead

### Issue 6: URL Field Not Visible in Tile Configuration

**Cause:** Using Static tile (requires navigation registration)

**Fix:**
1. First: Use **Method 1** to register in LPD_CUST
2. Then: Create Static tile with ZLEARNING-display
3. OR: Look for "URL" tile type option

---

## QUICK REFERENCE: Transaction Codes

| Transaction | Purpose |
|-------------|---------|
| `LPD_CUST` | Register semantic object navigation |
| `/UI2/FLPD_CUST` | Create tiles, catalogs, groups |
| `/UI2/SEMOBJ` | Alternative semantic object registration |
| `/UI2/CACHE_DELETE` | Clear backend cache |
| `/UI2/FLP_INVALIDATE_CACHE` | Alternative cache clear |
| `SE80` | Verify BSP application |
| `SICF` | Activate ICF services |
| `/IWFND/MAINT_SERVICE` | Check OData service |
| `/sap/bc/ui2/flp` | Access Fiori Launchpad |
| `/sap/bc/ui2/flp#ZLEARNING-display` | Direct app navigation |

---

## RECOMMENDED APPROACH FOR YOUR SITUATION

Based on your current struggle, use this sequence:

### Phase 1: Register Navigation (5 minutes)

**Transaction:** `LPD_CUST`

1. New Entries
2. FLP / ZLEARNING / display
3. Type: URL
4. URL: `/sap/bc/ui5_ui5/sap/z_courses_ui/index.html`
5. Save → Local Object

### Phase 2: Test Navigation (1 minute)

**In browser:**
```
https://[SERVER]:[PORT]/sap/bc/ui2/flp#ZLEARNING-display
```

**If app opens:** Navigation registered correctly! ✅  
**If 404/error:** Check BSP activation in SE80

### Phase 3: Create Tile (3 minutes)

**Transaction:** `/UI2/FLPD_CUST`

1. Catalog: Z_LEARNING_CATALOG
2. Add → App Launcher - Static
3. Title: SAP Courses, Icon: sap-icon://course-book
4. Semantic Object: ZLEARNING, Action: display
5. Save → Local Object

### Phase 4: Add to Group (2 minutes)

1. Groups → Z_MY_LEARNING
2. Assign Catalogs → Z_LEARNING_CATALOG
3. Save

### Phase 5: Clear Cache (2 minutes)

1. `/UI2/CACHE_DELETE` → Execute
2. Browser: Ctrl+Shift+Delete
3. Close and reopen browser

### Phase 6: Test Tile (1 minute)

1. Access: `/sap/bc/ui2/flp`
2. Find group
3. Click tile
4. App opens! ✅

**Total time: 15 minutes**

---

## SUCCESS CRITERIA

**Tile working correctly when:**

✅ Tile visible in Launchpad group  
✅ Clicking tile opens app (not error)  
✅ App shows training list  
✅ Role dropdown works (Admin/Manager/User)  
✅ Can navigate in app  
✅ OData service connected  
✅ No console errors (F12 → Console)  

**When all checked:** Phase 4 complete! Move to Phase 5 (CSV import) 🚀

---

## NEXT STEPS AFTER TILE WORKS

### Phase 5: CSV Import (15-20 minutes)

1. **Open app** via tile
2. **Role:** Select "Admin" (dropdown)
3. **Click:** "Import CSV" button
4. **Upload:** `c:\Users\14754\SAP\Saplearning\db\data\Learning_Data-Trainings.csv`
5. **Preview:** 52 records
6. **Import:** Execute
7. **Verify:** Records visible in list

### Phase 6: End-to-End Testing (45-60 minutes)

- Test all CRUD operations
- Test role-based access
- Test filters and search
- Test navigation
- Test OData operations

### Phase 7: Production Preparation (30-45 minutes)

- Create production transport
- Create proper roles (Z_LEARNING_ADMIN, etc.)
- Performance optimization
- Security review
- Documentation

---

## EMERGENCY FALLBACK

**If tile STILL won't work after all methods:**

**Skip tile for now!** Use direct URL for Phase 5-6 testing:

**Bookmark this URL:**
```
https://[YOUR_SERVER]:[PORT]/sap/bc/ui5_ui5/sap/z_courses_ui/index.html
```

**Proceed to CSV import and testing**

**Create proper tile in Phase 7** with fresh transport and production setup

**This is acceptable for development/testing!** ✅

---

## START HERE

**Right now, do this:**

1. **Open:** Transaction `LPD_CUST`
2. **If it exists:** Follow Method 1 above
3. **If not found:** Take screenshot and report back
4. **Report:** What transactions are available to you

**We'll get your tile working!** 💪

# Fiori Tile Not Showing - Quick Fix

## Problem
Tile created in catalog but not visible in Fiori Launchpad

## Solution: 3 Steps (5 minutes)

---

### Step 1: Add Tile to Group

**Transaction:** `/UI2/FLPD_CUST`

#### Option A: Create New Group

1. Click **Groups** (left menu)
2. Click **Create**
3. Enter:
   ```
   ID: Z_MY_APPS
   Title: My Applications
   Description: Personal test apps
   ```
4. Click **Save** (choose Local Object/$TMP)
5. **Drag tile from catalog** (Z_LEARNING_CATALOG) into the group
6. Click **Save** again

#### Option B: Add to Existing Group

1. Click **Groups** (left menu)
2. Find existing group (e.g., "SAP_BASIS" or "ZTEST")
3. Click to open
4. **Drag tile** from left panel into group
5. Click **Save**

**IMPORTANT:** Tiles in catalogs alone won't show - they MUST be in a group!

---

### Step 2: Assign Group to Your Role (If using SAP_ALL, skip to Step 3)

**Transaction:** `PFCG`

1. Enter role: `SAP_ALL` (or your role)
2. Click **Display** or **Change**
3. Go to **Menu** tab
4. Right-click → **Insert → Launchpad Group**
5. Enter: `Z_MY_APPS`
6. Click **Save**
7. Click **User Comparison** (if change mode)

**With SAP_ALL:** Group should be auto-visible, but cache may need clearing

---

### Step 3: Clear Fiori Launchpad Cache

#### Method 1: Backend Cache (REQUIRED)

**Transaction:** `/UI2/CACHE_DELETE`

1. Select:
   ```
   ☑ User-Dependent Cache
   User: [Your User ID]
   ```
2. Click **Execute** (F8)
3. Confirm deletion

**OR use:** `/UI2/FLP_INVALIDATE_CACHE`

#### Method 2: Browser Cache (REQUIRED)

1. **In browser:** Press `Ctrl + Shift + Delete`
2. Select:
   ```
   ☑ Cached images and files
   ☑ Cookies and site data
   Time range: Last hour
   ```
3. Click **Clear data**

#### Method 3: Hard Reload

1. Close browser completely
2. Reopen browser
3. Access FLP: `/sap/bc/ui2/flp`
4. Press `Ctrl + F5` (hard reload)

---

### Step 4: Verify Tile Appears

**Access Launchpad:**
```
https://[SERVER]:[PORT]/sap/bc/ui2/flp
```

**Expected:**
- See group: "My Applications" (or your group name)
- See tile: "SAP Courses" with book icon
- Click tile → App opens ✅

---

## If Still Not Visible

### Check 1: Verify Tile in Group

**Transaction:** `/UI2/FLPD_CUST`

1. Click **Groups**
2. Open your group (Z_MY_APPS)
3. Verify "SAP Courses" tile is present
4. If not: Drag tile from catalog panel

### Check 2: Verify Group Assignment

**For SAP_ALL users:**
- All groups should be visible by default
- If not, may be FLP configuration issue

**For custom roles:**
```
Transaction: PFCG
Role: [Your Role]
Menu tab → Verify group assigned
```

### Check 3: Check User Settings

**In Fiori Launchpad:**
1. Click **User** icon (top right)
2. Click **Settings**
3. Go to **Display** tab
4. Verify group is not hidden
5. Reset to default if needed

### Check 4: Verify BSP Application Active

**Transaction:** `SE80`

1. BSP Application: `Z_COURSES_UI`
2. Right-click → **Activate**
3. Confirm all files active

### Check 5: Verify Service Registration

**Transaction:** `/IWFND/MAINT_SERVICE`

1. Find: `ZCOURSES_SRV`
2. Verify: Status = Active
3. If inactive: Activate service

---

## Alternative: Use Direct URL (Bypass Tile)

**If tile still won't show, access directly:**

```
https://[SERVER]:[PORT]/sap/bc/ui5_ui5/sap/z_courses_ui/index.html
```

**Or via Launchpad hash:**
```
https://[SERVER]:[PORT]/sap/bc/ui2/flp#ZLEARNING-display
```

**Bookmark this** and proceed to Phase 5 testing!

---

## Common Issues

### Issue: "Tile appears but clicking does nothing"

**Fix:** Check manifest.json inbound configuration

```
Transaction: SE80
BSP Application: Z_COURSES_UI
File: webapp/manifest.json

Verify crossNavigation section has:
"semanticObject": "ZLEARNING",
"action": "display"
```

### Issue: "Tile shows but app gives 404"

**Fix:** Verify BSP deployed and active

```
Transaction: SE80
BSP Application: Z_COURSES_UI
Check files present:
- index.html
- Component.js
- manifest.json

If missing: Re-deploy from npm run deploy
```

### Issue: "Multiple tiles with same name"

**Fix:** Delete duplicates

```
Transaction: /UI2/FLPD_CUST
Catalog → Find duplicate tiles
Delete extras (keep one)
Clear cache
```

---

## Success Checklist

After completing steps above:

- [ ] Tile added to group (Z_MY_APPS or similar)
- [ ] Group saved in /UI2/FLPD_CUST
- [ ] Backend cache cleared (/UI2/CACHE_DELETE)
- [ ] Browser cache cleared (Ctrl+Shift+Delete)
- [ ] Launchpad accessed (/sap/bc/ui2/flp)
- [ ] Group visible with "SAP Courses" tile
- [ ] Clicking tile opens Z_COURSES_UI app
- [ ] App connects to ZCOURSES_SRV
- [ ] Training list loads (empty or with data)

**All checked?** ✅ Ready for Phase 5 CSV import!

---

## Quick Command Reference

| Task | Transaction | Action |
|------|-------------|--------|
| Add tile to group | /UI2/FLPD_CUST | Groups → Create/Edit |
| Clear user cache | /UI2/CACHE_DELETE | Delete user-dependent cache |
| Clear FLP cache | /UI2/FLP_INVALIDATE_CACHE | Invalidate all caches |
| Check BSP app | SE80 | BSP Application → Z_COURSES_UI |
| Check service | /IWFND/MAINT_SERVICE | Find ZCOURSES_SRV |
| Verify role | PFCG | Menu tab → Check groups |

---

## What to Do Right Now

### IMMEDIATE (2 minutes):

1. **Transaction:** `/UI2/FLPD_CUST`
2. **Click:** Groups → Create
3. **Enter:** ID: `Z_MY_APPS`, Title: `My Applications`
4. **Drag** tile "SAP Courses" into group
5. **Save** (Local Object)

### THEN (1 minute):

1. **Transaction:** `/UI2/CACHE_DELETE`
2. **Select:** User-dependent cache, your user
3. **Execute** (F8)

### FINALLY (30 seconds):

1. **Browser:** Ctrl+Shift+Delete → Clear cache
2. **Access:** `/sap/bc/ui2/flp`
3. **Look for:** "My Applications" group
4. **Click:** "SAP Courses" tile

**Tile should appear and work!** ✅

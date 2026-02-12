# 🚨 BSP APPLICATION DISAPPEARING AFTER LOGOUT - FIX GUIDE

**Issue:** BSP application uploaded via SE38/UI5_REPOSITORY_LOAD disappears after logout  
**Root Cause:** Objects uploaded to $TMP (temporary package) without transport  
**Status:** CRITICAL - Data loss issue

---

## ✅ CORRECT UPLOAD PROCEDURE

### **Before Upload - Verify Settings**

**1. Check Package Exists**

Transaction: **SE80**

```
1. SE80 → Repository Browser
2. Select: "Package"
3. Enter: Z_COURSES
4. If not found:
   → Right-click → Create Package
   → Package: Z_COURSES
   → Short Description: "SAP Learning Courses Platform"
   → Application Component: (any)
   → Software Component: HOME
   → Package Type: ☑ Development Package (transportable)
   → Transport Layer: Select your system's layer (e.g., ZDS4)
   → Save
```

**2. Check Transport Exists**

Transaction: **SE09** or **SE10**

```
1. SE09 (Transport Organizer)
2. Create → Workbench Request
3. Short Description: "SAP Learning Courses Platform v2.0"
4. Owner: [Your username]
5. Save → Note transport number: DS4K905210 (yours)
```

---

### **CORRECT Upload Steps**

#### **Method 1: Using /UI5/UI5_REPOSITORY_LOAD_HTTP (Recommended)**

Transaction: **/UI5/UI5_REPOSITORY_LOAD_HTTP**

```
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: File Selection                                      │
│  ─────────────────────────────────────────────────────────   │
│  File: [Browse...] → Select: Z_COURSES_UI.zip               │
│        C:\Users\14754\SAP\Saplearning\app\z.sap.courses\dist\Z_COURSES_UI.zip
│                                                               │
│  STEP 2: Repository Upload Details                           │
│  ─────────────────────────────────────────────────────────   │
│  BSP Application:  [ Z_COURSES_UI           ]  ⚠️ Exact name│
│  Description:      [ SAP Learning Courses UI ]               │
│                                                               │
│  STEP 3: Package & Transport (CRITICAL!)                     │
│  ─────────────────────────────────────────────────────────   │
│  Package:          [ Z_COURSES              ]  ⚠️ NOT $TMP  │
│  Transport:        [ DS4K905210             ]  ⚠️ REQUIRED  │
│                                                               │
│  STEP 4: Upload Options                                      │
│  ─────────────────────────────────────────────────────────   │
│  ☑ Replace Existing Application       ← Check this          │
│  ☑ Calculate Application Index         ← Check this         │
│  ☐ Test Upload (Local Object)          ← NEVER check this   │
│  ☐ Delta Upload                         ← Uncheck           │
│                                                               │
│  [Execute]                                                    │
└──────────────────────────────────────────────────────────────┘
```

**CRITICAL WARNINGS:**

| Field | ✅ Correct | ❌ Wrong (Causes Disappearing) |
|-------|-----------|--------------------------------|
| **Package** | Z_COURSES | $TMP or blank |
| **Transport** | DS4K905210 | Blank or empty |
| **Test Upload** | ☐ Unchecked | ☑ Checked |
| **Replace Existing** | ☑ Checked | ☐ Unchecked (creates duplicate) |
| **Calculate Index** | ☑ Checked | ☐ Unchecked (app not findable) |

---

#### **Method 2: Using BAS Deployment (Alternative)**

**Prerequisites:**
1. Destination configured in BAS
2. Cloud Connector running
3. S/4HANA reachable

**Command:**
```powershell
cd C:\Users\14754\SAP\Saplearning\app\z.sap.courses
npm run deploy
```

**Configuration File: abap-deploy.json**
```json
{
  "app": {
    "name": "Z_COURSES_UI",
    "package": "Z_COURSES",        ⚠️ NOT $TMP
    "transport": "DS4K905210"      ⚠️ MUST be filled
  }
}
```

**BAS deploys directly to package with transport - no risk of $TMP**

---

## 🔍 TROUBLESHOOTING AFTER UPLOAD

### **Verify Upload Success**

**1. Check BSP Application Exists in SE80**

Transaction: **SE80**

```
1. SE80 → Repository Browser
2. Select: "BSP Application"  
3. Enter: Z_COURSES_UI
4. Press Enter

✅ Expected: Application opens, shows files
   → Package should show: Z_COURSES (not $TMP)
   
❌ If shows $TMP:
   → Right-click application → Change Object Directory Entry
   → Package: Z_COURSES
   → Transport: DS4K905210
   → Save
```

**2. Check Files in Transport**

Transaction: **SE09** or **SE10**

```
1. SE09 → Display
2. Enter your username
3. Find transport: DS4K905210
4. Expand → Tasks → Objects
5. Look for:
   ✅ R3TR WAPA Z_COURSES_UI    (BSP Application)
   ✅ R3TR SICF /default_host/... (ICF Service)
   
❌ If NOT listed:
   → Upload went to $TMP (lost after logout)
   → Re-upload with correct package/transport
```

**3. Verify BSP Application Index**

Transaction: **/UI5/APP_INDEX**

```
1. /UI5/APP_INDEX (SAPUI5 ABAP Repository)
2. Search: Z_COURSES_UI
3. Expected: Shows component z.sap.courses

❌ If not found:
   → /UI5/APP_INDEX_CALCULATE
   → BSP Application: Z_COURSES_UI
   → Execute
```

**4. Check SICF Service Active**

Transaction: **SICF**

```
1. SICF (HTTP Service Hierarchy)
2. Navigate: default_host → sap → bc → ui5_ui5 → sap → z_courses_ui
3. Right-click → Activate Service
4. Test Service (F8)
   ✅ Expected: Opens Fiori app in browser
```

**5. Test Direct URL Access**

Browser:
```
https://vhbrbws1wd01.hec.bridgebio.com:44380/sap/bc/ui5_ui5/sap/z_courses_ui/index.html

✅ Expected: App loads
❌ 404 Error: BSP application not uploaded properly
❌ 403 Error: SICF service not activated
```

---

## 🔄 RE-UPLOAD CHECKLIST (If Objects Lost)

### **Scenario: "Nothing Found" After Logout**

**Step 1: Confirm Objects Lost**
```
SE80 → BSP Application → Z_COURSES_UI
→ If "Does not exist": Objects in $TMP, lost after logout
```

**Step 2: Re-upload with CORRECT Settings**

**Option A: Manual Upload**

```
1. Transaction: /UI5/UI5_REPOSITORY_LOAD_HTTP
2. File: C:\Users\14754\SAP\Saplearning\app\z.sap.courses\dist\Z_COURSES_UI.zip
3. BSP Application: Z_COURSES_UI
4. Description: SAP Learning Courses UI
5. Package: Z_COURSES              ⚠️ NOT BLANK, NOT $TMP
6. Transport: DS4K905210            ⚠️ MUST FILL THIS
7. ☑ Replace Existing Application
8. ☑ Calculate Application Index
9. ☐ Test Upload (Local Object)    ⚠️ NEVER CHECK THIS
10. Execute
```

**Step 3: Verify Upload Succeeded**

```
SE09 → Display → Your username
→ Transport DS4K905210
→ Expand → Check Z_COURSES_UI exists under Objects
→ Package column should show: Z_COURSES (not $TMP)
```

**Step 4: Activate Everything**

```
1. SE80 → Z_COURSES_UI → Right-click → Activate
2. SICF → Activate service path
3. /UI5/APP_INDEX_CALCULATE → Z_COURSES_UI
```

**Step 5: Test Persistence**

```
1. SM04 → End your session (logout)
2. Login again
3. SE80 → BSP Application → Z_COURSES_UI
   ✅ Should exist and open successfully
4. /UI5/APP_INDEX → Search Z_COURSES_UI
   ✅ Should be listed
```

---

## 🚨 COMMON MISTAKES & FIXES

### **Mistake 1: Package = $TMP**

**Symptom:**
```
Upload successful → Logout → Login → "Object does not exist"
```

**Fix:**
```
Don't use $TMP for production/transportable objects
Always use: Z_COURSES
Re-upload with correct package
```

### **Mistake 2: Transport Field Empty**

**Symptom:**
```
Upload shows success
SE09 → Transport DS4K905210 → No BSP application listed
Objects exist but not transportable
```

**Fix:**
```
1. SE80 → Z_COURSES_UI → Right-click
2. Change Object Directory Entry
3. Package: Z_COURSES
4. Transport: DS4K905210
5. Save
```

### **Mistake 3: "Test Upload" Checked**

**Symptom:**
```
Upload successful but objects marked as local
Cannot transport to QA/Production
May disappear after system refresh
```

**Fix:**
```
Re-upload with "Test Upload" UNCHECKED
```

### **Mistake 4: Client Mismatch**

**Symptom:**
```
Uploaded in Client 400
Login to Client 100 → "Nothing found"
```

**Fix:**
```
Check current client: System → Status → Client
Always use same client (usually 400 for DEV)
```

### **Mistake 5: Package Z_COURSES Doesn't Exist**

**Symptom:**
```
Upload fails: "Package Z_COURSES does not exist"
```

**Fix:**
```
1. SE80 → Create Package
2. Package: Z_COURSES
3. Application Component: (any)
4. Software Component: HOME
5. Package Type: Development Package
6. Save to transport
```

---

## 📊 DECISION TREE

```
BSP Application Disappears After Logout?
│
├─ SE80 → Z_COURSES_UI → Found in $TMP
│  └─ FIX: Change package to Z_COURSES, add to transport DS4K905210
│
├─ SE80 → Z_COURSES_UI → "Does not exist"
│  └─ FIX: Re-upload with Package=Z_COURSES, Transport=DS4K905210
│
├─ SE09 → DS4K905210 → No Z_COURSES_UI listed
│  └─ FIX: Objects uploaded without transport, re-upload
│
├─ Different client (uploaded in 400, checking in 100)
│  └─ FIX: Login to correct client
│
└─ /UI5/APP_INDEX → Z_COURSES_UI not found
   └─ FIX: /UI5/APP_INDEX_CALCULATE → Z_COURSES_UI → Execute
```

---

## ✅ FINAL VERIFICATION SCRIPT

**Run these transactions in order after re-upload:**

```
1. SE09 (Transport)
   → Display → Your username
   → Find DS4K905210
   → Expand → Verify Z_COURSES_UI exists
   → Package column = Z_COURSES ✅

2. SE80 (BSP Application)
   → BSP Application → Z_COURSES_UI
   → Should open successfully
   → Right-click → Display Object Directory Entry
   → Package = Z_COURSES ✅
   → Original System = Your system ID ✅

3. /UI5/APP_INDEX (SAPUI5 Repository)
   → Search: Z_COURSES_UI
   → Component: z.sap.courses ✅

4. SICF (HTTP Service)
   → default_host/sap/bc/ui5_ui5/sap/z_courses_ui
   → Status = Active (green) ✅

5. SM04 (User Session)
   → End your session (logout)
   → Login again
   → Repeat steps 1-4
   → All should still exist ✅
```

---

## 🎯 SUMMARY

**Root Cause of Disappearing:**
- Objects uploaded to **$TMP** (temporary package)
- No **transport number** entered
- "**Test Upload**" checkbox selected
- Wrong **client** after re-login

**Permanent Fix:**
- Always use **Package: Z_COURSES**
- Always enter **Transport: DS4K905210**
- Never check "**Test Upload**"
- Always check "**Replace Existing**" and "**Calculate Index**"

**Verification:**
- SE09 → Transport should list Z_COURSES_UI
- SE80 → Should show package Z_COURSES (not $TMP)
- Objects should persist after logout/login

---

**Upload with these settings and your BSP application will be permanent!**

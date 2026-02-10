# 🚀 Deployment & Blank Page Fix Guide

**Date:** February 10, 2026  
**Status:** ✅ FIXED - Ready for BTP Deployment  
**Commit:** acc7e48

---

## 🔧 Issues Fixed

### 1. ❌ **Wrong Deployment Configuration**
**Problem:** Direct URL used instead of BTP destination
```yaml
# WRONG (was causing proxytype error):
target:
  url: https://vhbrbds4ci.hec.bridgebio.com:44300
  credentials:
    username: env:ABAP_USERNAME
    password: env:ABAP_PASSWORD
```

**✅ Fixed:**
```yaml
# CORRECT (BTP destination):
target:
  destination: S4_ABAP_DEV
```

**Location:** [ui5-deploy.yaml](app/z.sap.courses/ui5-deploy.yaml)

---

### 2. ❌ **Broken Backend Routing (Blank Page Root Cause)**
**Problem:** xs-app.json using `localDir` which doesn't work when deployed
```json
// WRONG:
{
  "source": "^/sap/opu/odata/sap/(.*)$",
  "target": "/sap/opu/odata/sap/$1",
  "localDir": ".",  // ❌ This breaks deployment
  "authenticationType": "none"
}
```

**✅ Fixed:**
```json
// CORRECT:
{
  "source": "^/sap/opu/odata/(.*)$",
  "target": "/sap/opu/odata/$1",
  "destination": "S4_ABAP_DEV",  // ✅ Uses BTP destination
  "authenticationType": "xsuaa",
  "csrfProtection": false
}
```

**Location:** [xs-app.json](app/z.sap.courses/xs-app.json)

---

### 3. ✅ **Enhanced Diagnostics**
**Added logging to troubleshoot blank page:**
- Component initialization logging
- Global error handlers in index.html
- Console logging at bootstrap stages

**What you'll see in F12 Console:**
```
[BOOTSTRAP] Starting UI5 application initialization...
[BOOTSTRAP] HTML body loaded, waiting for Component initialization...
Component initialization started
Route matched: TrainingsList
Component initialization completed
```

**If blank page persists, check console for:**
- `[INIT ERROR]` - Component loading failed
- `[PROMISE REJECTION]` - OData connection failed
- `404` errors - Resources not loading

---

## 🚀 Deployment Steps (SAP BAS)

### Step 1: Ensure BTP Destination Exists
In SAP BTP Cockpit → Connectivity → Destinations:
- **Name:** `S4_ABAP_DEV`
- **Type:** `HTTP`
- **URL:** `https://vhbrbds4ci.hec.bridgebio.com:44300`
- **Proxy Type:** `Internet`
- **Authentication:** `BasicAuthentication`
- **User:** Your S/4HANA username
- **Password:** Your S/4HANA password

**Additional Properties:**
```
sap-client = 100
WebIDEEnabled = true
WebIDEUsage = odata_abap
WebIDESystem = S4_ABAP_DEV
```

### Step 2: Deploy from SAP BAS
```bash
cd app/z.sap.courses
npm run deploy
```

**Expected Output:**
```
✓ Build succeeded
✓ Archive created: Z_COURSES_UI.zip
✓ Deploying to package Z_COURSES
✓ Transport: DS4K905210
✓ Deployment successful
```

### Step 3: Calculate App Index (SAP GUI)
```abap
SE38 → /UI5/APP_INDEX_CALCULATE
Package: Z_COURSES
```

### Step 4: Test Deployed App
**URL:** `https://vhbrbds4ci.hec.bridgebio.com:44300/sap/bc/ui5_ui5/sap/z_courses_ui/index.html`

**Or via Fiori Launchpad:**
Navigate to tile configured with:
- Semantic Object: `ZLEARNING`
- Action: `display`

---

## 🐛 Troubleshooting Blank Page

### Check 1: F12 Console Logs
Open browser DevTools (F12) → Console tab

**✅ Good (should see):**
```
[BOOTSTRAP] Starting UI5 application initialization...
Component initialization started
Component initialization completed
Route matched: TrainingsList
```

**❌ Bad (errors):**
```
[INIT ERROR] Failed to load component
404: Component.js not found
CORS error: No 'Access-Control-Allow-Origin'
```

### Check 2: Network Tab
F12 → Network tab → Reload page (Ctrl+R)

**✅ All should be 200 OK:**
- `index.html` → 200
- `Component.js` → 200  
- `manifest.json` → 200
- `sap-ui-core.js` → 200
- `/sap/opu/odata/sap/ZCOURSES_SRV/$metadata` → 200

**❌ If 404 errors:**
- Resources not found → Check `/UI5/APP_INDEX_CALCULATE` was run
- OData 404 → Backend service ZCOURSES_SRV not activated

**❌ If 401/403 errors:**
- Authentication issue → Check BTP destination credentials
- Authorization issue → Check PFCG roles assigned to your user

### Check 3: OData Service Test
Direct browser access:
```
https://vhbrbds4ci.hec.bridgebio.com:44300/sap/opu/odata/sap/ZCOURSES_SRV/$metadata
```

**✅ Should show XML:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0">
  <edmx:DataServices>
    <Schema Namespace="ZCOURSES_SRV">
      <EntityType Name="Training">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Guid"/>
        <Property Name="title" Type="Edm.String"/>
        ...
```

**❌ If error:**
- 401/403 → Not logged in / No authorization
- 404 → Service not registered in SEGW/SICF
- 500 → Backend ABAP error (check ST22)

### Check 4: Fiori Launchpad Configuration
If tile opens in **new tab instead of in-place:**

**Issue:** App is not configured as FLP-integrated

**Fix in PFCG/SICF:**
1. Open transaction `/UI5/THEME_DESIGNER` or `/UI5/THEME_TOOL`
2. Check app is registered with semantic object
3. Verify tile configuration has `openInPlace: true`

**Or check app registration:**
```
/UI5/UI5_REPOSITORY_LOAD_HTTP
Application Name: Z_COURSES_UI
Check "Launchpad Integration" is enabled
```

---

## 📋 Quick Verification Checklist

Before deployment:
- [ ] Build succeeds: `npm run build`
- [ ] No linting errors: `npm run lint` (if configured)
- [ ] Local test works: `npm start` → http://localhost:8080

After deployment:
- [ ] `/UI5/APP_INDEX_CALCULATE` run successfully
- [ ] Direct URL loads (may show blank if not in FLP)
- [ ] F12 Console shows initialization logs
- [ ] Network tab shows all resources 200 OK
- [ ] OData metadata accessible
- [ ] Fiori tile opens app in-place (not new tab)

---

## 🎯 Key Takeaways

1. **Always use BTP destination** - Never hardcode URLs in deployment config
2. **xs-app.json must use destination routing** - `localDir` only works locally
3. **Blank page = routing failure** - Check F12 Console and Network tab first
4. **Semantic object controls FLP behavior** - Ensure proper tile configuration
5. **Log everything during deployment issues** - We added comprehensive logging

---

## 🔗 Related Files

- [ui5-deploy.yaml](app/z.sap.courses/ui5-deploy.yaml) - BTP deployment config
- [xs-app.json](app/z.sap.courses/xs-app.json) - Backend routing rules
- [manifest.json](app/z.sap.courses/webapp/manifest.json) - App descriptor with crossNavigation
- [Component.js](app/z.sap.courses/webapp/Component.js) - Enhanced initialization logging
- [index.html](app/z.sap.courses/webapp/index.html) - Bootstrap with error handlers

---

## 📞 Need Help?

**Blank page persists after deployment:**
1. Open F12 Console → Screenshot and share
2. Open F12 Network tab → Screenshot failed requests
3. Check SAP GUI → ST22 for ABAP dumps
4. Check SAP GUI → SLG1 for application logs

**Deployment fails:**
1. Verify BTP destination exists and is configured
2. Check SAP BAS has proper authentication
3. Verify transport DS4K905210 is not locked
4. Check package Z_COURSES has proper authorizations

---

**All fixes committed:** acc7e48  
**Ready to deploy from SAP BAS** ✅

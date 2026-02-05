# Quick Troubleshooting Guide

## 🚀 Quick Start

### Start Backend
```powershell
cd c:\Users\14754\SAP\Saplearning
npm run watch
```
**Expected:** `[cds] - server listening on http://localhost:4004`

### Start Frontend
```powershell
cd c:\Users\14754\SAP\Saplearning\app\z.sap.courses
npm start
```
**Expected:** `Server started, use Ctrl+C to stop...`

### Open Application
- URL: http://localhost:8080/index.html
- Check browser console for errors

---

## ❌ Common Issues & Solutions

### Issue 1: "S/4 OData service not reachable"
**Symptom:** Error in browser console  
**Cause:** UI trying to call ABAP service instead of local CAP  
**Solution:** ✅ FIXED - UserContext.js now returns mock data

**Verify Fix:**
```powershell
# Search for any remaining hardcoded paths
cd c:\Users\14754\SAP\Saplearning
grep -r "Z_SLC_MAIN_SRV\|Z_SLC_USERCTX_SRV" app/z.sap.courses/webapp/ --include="*.js"
```
Should return: No results (only comments OK)

---

### Issue 2: 403 Forbidden / Auth Errors
**Symptom:** 403 errors in browser network tab  
**Cause:** Authentication enabled but no valid credentials  
**Solution:** ✅ FIXED - Auth set to "dummy" in package.json

**Verify:**
```powershell
# Check package.json
cat c:\Users\14754\SAP\Saplearning\package.json | Select-String '"auth"'
```
Should show: `"auth": "dummy"`

---

### Issue 3: Backend Not Starting
**Symptom:** `cds watch` fails or crashes  
**Possible Causes:**

#### A. Port 4004 already in use
```powershell
# Find process using port 4004
netstat -ano | findstr :4004

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

#### B. Missing dependencies
```powershell
cd c:\Users\14754\SAP\Saplearning
npm install
```

#### C. Database locked
```powershell
# Delete SQLite temp files
Remove-Item *.db, *.sqlite -ErrorAction SilentlyContinue
```

---

### Issue 4: Frontend Not Starting
**Symptom:** `npm start` fails in app/z.sap.courses  
**Possible Causes:**

#### A. Port 8080 already in use
```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

#### B. Missing dependencies
```powershell
cd c:\Users\14754\SAP\Saplearning\app\z.sap.courses
npm install
```

---

### Issue 5: Old Service References / Cached Files
**Symptom:** UI shows old service names or 404 errors  
**Solution:** Clear all caches

```powershell
# Delete built files
cd c:\Users\14754\SAP\Saplearning
Remove-Item -Recurse -Force app/z.sap.courses/dist*, ui/z.sap.courses/dist* -ErrorAction SilentlyContinue

# Clear browser cache
# In browser: Ctrl+Shift+Delete → Clear cache
# Or: Hard refresh with Ctrl+F5
```

---

### Issue 6: UI Loads But No Data
**Symptom:** UI loads but entity lists are empty  
**Cause:** Backend database empty  
**Solution:** Populate test data

```powershell
# Option 1: Use CSV files (if you have test data)
cd c:\Users\14754\SAP\Saplearning
# Add CSV files to db/data/ folder
npm run watch

# Option 2: Use REST API to create data
# See API.md for examples
```

---

### Issue 7: Proxy Not Working
**Symptom:** Network errors, requests not reaching backend  
**Cause:** Proxy middleware not loaded or misconfigured  

**Check ui5.yaml:**
```yaml
backend:
  - path: /service
    url: http://localhost:4004
    destination: null  # Must be null for local dev
```

**Restart frontend after changes:**
```powershell
cd c:\Users\14754\SAP\Saplearning\app\z.sap.courses
# Ctrl+C to stop
npm start
```

---

### Issue 8: "Cannot find module '@sap/cds'"
**Symptom:** Backend fails to start  
**Cause:** Dependencies not installed  
**Solution:**

```powershell
cd c:\Users\14754\SAP\Saplearning
npm install
```

If persists, try:
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

### Issue 9: CORS Errors
**Symptom:** "Blocked by CORS policy" in browser console  
**Cause:** CORS not enabled or misconfigured  
**Solution:** ✅ FIXED - CORS enabled in srv/server.js

**Verify:**
```powershell
cat c:\Users\14754\SAP\Saplearning\srv\server.js | Select-String "cors"
```
Should show: `app.use(cors());`

---

### Issue 10: Changes Not Reflected
**Symptom:** Code changes don't appear in running app  
**Solutions:**

#### Backend changes:
- CDS watch should auto-reload
- If not, restart: Ctrl+C → `npm run watch`

#### Frontend changes:
- UI5 serve should auto-reload with livereload
- If not, hard refresh: Ctrl+F5
- Check ui5.yaml has livereload middleware

#### Component.js / manifest.json changes:
- Always hard refresh (Ctrl+F5)
- Or clear browser cache completely

---

## 🔍 Diagnostic Commands

### Check Backend Health
```powershell
# Test service metadata
Invoke-WebRequest http://localhost:4004/service/SAPLearningService/$metadata

# Test entity set
Invoke-WebRequest http://localhost:4004/service/SAPLearningService/Trainings
```

### Check Frontend Proxy
```powershell
# Test proxied request (from frontend perspective)
# Open browser DevTools → Network tab
# Navigate to: http://localhost:8080/service/SAPLearningService/$metadata
# Should show: Status 200, Content-Type: application/xml
```

### Verify File Changes
```powershell
# Show recent git changes
git status
git diff

# Show last commit
git log -1 --stat
```

### Check Ports
```powershell
# List all listening ports
netstat -an | findstr LISTENING | findstr "4004\|8080"
```

---

## 📊 Health Check Checklist

Run through this checklist if experiencing issues:

- [ ] Backend running on port 4004
- [ ] Frontend running on port 8080
- [ ] No dist/ folders exist (if stale, delete them)
- [ ] package.json has `"auth": "dummy"`
- [ ] srv/server.js has CORS enabled
- [ ] app/z.sap.courses/ui5.yaml has correct proxy config
- [ ] app/z.sap.courses/webapp/manifest.json has `/service/SAPLearningService/`
- [ ] No hardcoded `/sap/opu/odata/sap/Z_*` paths in webapp/**/*.js
- [ ] Browser console shows no red errors
- [ ] Network tab shows requests to `/service/SAPLearningService/`

---

## 🆘 Emergency Reset

If all else fails, complete reset:

```powershell
# Stop all running processes
# Ctrl+C in all terminals

# Clean everything
cd c:\Users\14754\SAP\Saplearning
Remove-Item -Recurse -Force node_modules, package-lock.json, *.db, *.sqlite, app/z.sap.courses/dist*, app/z.sap.courses/node_modules, app/z.sap.courses/package-lock.json

# Reinstall
npm install
cd app\z.sap.courses
npm install
cd ..\..

# Restart
npm run watch

# In new terminal:
cd app\z.sap.courses
npm start

# Clear browser cache completely (Ctrl+Shift+Delete)
# Hard refresh (Ctrl+F5)
```

---

## 📞 Getting Help

### Check Documentation
- [LOCAL_TESTING_FIXES.md](LOCAL_TESTING_FIXES.md) - Recent fixes
- [PROACTIVE_ISSUE_ANALYSIS.md](PROACTIVE_ISSUE_ANALYSIS.md) - Complete analysis
- [BAS_QUICKSTART.md](BAS_QUICKSTART.md) - SAP BAS setup
- [DEPLOYMENT_GUIDE_S4HANA.md](DEPLOYMENT_GUIDE_S4HANA.md) - S4HANA deployment

### Check Logs
```powershell
# Backend logs (CDS output)
# Check the terminal running `npm run watch`

# Frontend logs (UI5 output)
# Check the terminal running `npm start`

# Browser logs
# Open DevTools (F12) → Console tab
```

### Verify Configuration
```powershell
# Show all key config files
Get-Content package.json, srv/service.cds, app/z.sap.courses/ui5.yaml, app/z.sap.courses/webapp/manifest.json
```

---

**Last Updated:** $(Get-Date)  
**Version:** 1.0  
**Status:** ✅ All known issues resolved

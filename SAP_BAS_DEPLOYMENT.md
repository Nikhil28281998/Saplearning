# SAP BAS Deployment - Quick Reference

## ⚠️ CRITICAL: All deployment happens in SAP Business Application Studio (BAS)

**Do NOT deploy from local Windows/WSL** - it won't work!

---

## 🔄 Deployment Workflow

```
SAP BAS → Code Changes → Git Push → Git Pull in BAS → MBT Build → CF Deploy
```

---

## 📝 Step-by-Step Commands (Copy-Paste in SAP BAS Terminal)

### 1. Sync from GitHub
```bash
cd /home/user/projects/Saplearningcenter
git pull origin main
```

### 2. Verify UI Files Exist
```bash
ls -la app/saplearningcenter.saplearningcenter/dist/
```
**Expected**: You should see `Component-preload.js`, `manifest.json`, `index.html`, etc.

**If dist/ folder is missing**:
```bash
cd app/saplearningcenter.saplearningcenter
npm install
npm run build:cf
cd ../..
```

### 3. Clean Previous Build
```bash
rm -rf mta_archives gen
```

### 4. Build MTA
```bash
mbt build
```
**Wait for**: `[INFO] The MTA archive generated at: mta_archives/skillforge-training-platform_1.0.0.mtar`

### 5. Deploy to Cloud Foundry
```bash
cf deploy mta_archives/*.mtar -f
```
**Wait for**: `Application "skillforge-approuter" started and available at https://...`

### 6. Test Application
Open in browser (hard refresh with Ctrl+Shift+R):
```
https://bridgebio-pharma-inc--sap-build-work-zone-zsdt2mzd-buil5883134b.cfapps.us10.hana.ondemand.com
```

---

## 🐛 Quick Troubleshooting

### Blank Page After Login?

**Check 1**: UI files in deployed approuter
```bash
cf ssh skillforge-approuter
ls -la saplearningcenter.saplearningcenter/webapp/
exit
```
If empty, the build didn't copy UI files. Solution:
1. Make sure dist/ exists locally: `ls app/saplearningcenter.saplearningcenter/dist/`
2. Rebuild: `rm -rf mta_archives gen && mbt build`
3. Redeploy: `cf deploy mta_archives/*.mtar -f`

**Check 2**: Browser console errors
- Open DevTools (F12)
- Look for 404 errors on Component.js, manifest.json
- If 404s exist, UI files are missing (see Check 1)

### Authentication Issues?

```bash
# Check if user has role collection
cf env skillforge-approuter
```

Assign role in BTP Cockpit:
1. Go to Security → Role Collections
2. Find `SkillForge_Admin_build_work_zone`
3. Click → Edit → Add your user email

### Backend Not Responding?

```bash
# Check backend app status
cf app skillforge-srv

# View logs
cf logs skillforge-srv --recent
```

---

## 📦 What Gets Deployed?

1. **skillforge-approuter** (Entry point)
   - Contains: xs-app.json, package.json, UI files in webapp/
   - Size: ~15-20 MB
   
2. **skillforge-srv** (Backend service)
   - Contains: CAP service handlers, OData definitions
   - Size: ~10-15 MB
   
3. **skillforge-db-deployer** (Database)
   - One-time HDI container deployment
   - Stops after deployment (normal behavior)

---

## 🔑 Important Notes

- **Never build locally on Windows** - dist/ folder won't be compatible
- **Always pull from GitHub first** - ensures latest UI files
- **UI changes require full redeploy** - not just approuter restart
- **Check dist/ exists before building MTA** - critical for UI to work
- **Hard refresh after deploy** - Ctrl+Shift+R to clear browser cache

---

## 📞 If Still Stuck

1. Check application logs in BTP Cockpit
2. Review DEPLOYMENT_GUIDE.md for detailed troubleshooting
3. Verify UI files exist: `ls app/saplearningcenter.saplearningcenter/dist/`
4. Confirm GitHub has latest: Visit https://github.com/Nikhil28281998/Saplearning/tree/main/app/saplearningcenter.saplearningcenter/dist

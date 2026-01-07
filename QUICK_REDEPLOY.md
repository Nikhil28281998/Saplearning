# Quick Redeploy Instructions

## Issue Fixed:
UI was getting 404 errors because resource roots in index.html used relative path `./` instead of absolute path.

## What Changed:
**File**: `app/saplearningcenter.saplearningcenter/webapp/index.html`
- Changed: `"saplearningcenter.saplearningcenter": "./"`
- To: `"saplearningcenter.saplearningcenter": "/saplearningcenter.saplearningcenter/webapp/"`

## Rebuild and Redeploy:

From the same terminal where you ran before:
```bash
cd /home/user/projects/Saplearningcenter
mbt build
cf deploy mta_archives/*.mtar -f
```

**Expected**: 
- Build completes in ~18 seconds
- Deploy completes in ~3-5 minutes
- UI loads correctly at root URL

## After Deployment:
Clear browser cache and reload:
- Press **Ctrl+Shift+R** (hard refresh)
- Or open in incognito/private window

Then access: `https://bridgebio-pharma-inc--sap-build-work-zone-zsdt2mzd-buil5883134b.cfapps.us10.hana.ondemand.com/`

Files will now load from correct paths like:
- `/saplearningcenter.saplearningcenter/webapp/manifest.json` ✅
- `/saplearningcenter.saplearningcenter/webapp/Component.js` ✅

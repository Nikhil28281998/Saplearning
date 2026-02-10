# Deployment Notes - Important Guidelines

## ⚠️ Critical Deployment Rules

### 1. DO NOT Deploy Locally from VS Code
- Destination-based authentication (`S4_ABAP_DEV`) only works in **SAP BAS**
- Local VS Code deployment will fail with:
  - "Property target-url is missing" OR
  - "deployment failed no dist folder found"
- **Reason:** Destination authentication requires SAP BAS environment
- Always deploy from SAP Business Application Studio

### 2. NO Target URL Required
- `ui5-deploy.yaml` uses **destination** (not URL)
- SAP BAS handles authentication automatically via destination
- Target URL was removed from config (commit: 35138ee)

### 3. Local Build Works, Local Deploy Doesn't

**✅ Works Locally (VS Code):**
```bash
npm run build  # Creates dist/ folder with all files
```

**❌ Fails Locally (VS Code):**
```bash
npm run deploy  # ERROR: Requires SAP BAS destination auth
```

### 4. Deployment Process (SAP BAS Only)

```bash
# In SAP BAS terminal:
git pull origin main
cd app/z.sap.courses
npm install
npm run deploy  # ✅ WORKS with destination auth
```

### 5. Configuration Summary

```yaml
Package:     Z_COURSES
Transport:   DS4K905210
App Name:    Z_COURSES_UI
Destination: S4_ABAP_DEV (SAP BAS only)
Client:      400
```

### 6. Manual Alternative (If SAP BAS Unavailable)

Use the pre-built ZIP file:
1. Run `npm run build` locally (creates `dist/Z_COURSES_UI.zip`)
2. Upload via transaction: `/UI5/UI5_REPOSITORY_LOAD_HTTP`
3. Manually enter package/transport: Z_COURSES / DS4K905210

---

**Last Updated:** February 10, 2026  
**Recent Changes:**
- Removed target URL from ui5-deploy.yaml (commit 35138ee)
- Added dir: dist config to deploy-to-abap task (commit 44528bf)  
**Reason:** Destination-based deployment is correct approach for SAP BAS

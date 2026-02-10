# Deployment Notes - Important Guidelines

## ⚠️ Critical Deployment Rules

### 1. DO NOT Deploy Locally from VS Code
- Destination-based authentication (`S4_ABAP_DEV`) only works in **SAP BAS**
- Local VS Code deployment will fail with "Property target-url is missing"
- Always deploy from SAP Business Application Studio

### 2. NO Target URL Required
- `ui5-deploy.yaml` uses **destination** (not URL)
- SAP BAS handles authentication automatically via destination
- Target URL was removed from config (commit: 35138ee)

### 3. Deployment Process (SAP BAS Only)

```bash
# In SAP BAS terminal:
cd app/z.sap.courses
npm install
npm run deploy
```

### 4. Configuration Summary

```yaml
Package:     Z_COURSES
Transport:   DS4K905210
App Name:    Z_COURSES_UI
Destination: S4_ABAP_DEV (SAP BAS only)
Client:      400
```

### 5. Build vs Deploy

- **`npm run build`** - Creates dist/ folder with built files (works locally)
- **`npm run deploy`** - Builds + uploads to S/4HANA (SAP BAS only)

### 6. Manual Alternative (If SAP BAS Unavailable)

Use the pre-built ZIP file:
1. Run `npm run build` locally (creates dist/Z_COURSES_UI.zip)
2. Upload via transaction: `/UI5/UI5_REPOSITORY_LOAD_HTTP`
3. Manually enter package/transport: Z_COURSES / DS4K905210

---

**Last Updated:** February 10, 2026  
**Changed:** Removed target URL from ui5-deploy.yaml (commit 35138ee)  
**Reason:** Destination-based deployment is correct approach for SAP BAS

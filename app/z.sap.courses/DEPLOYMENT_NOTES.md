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

### 3. Understanding the [dotenv] Message

When you see:
```
[dotenv@17.2.3] injecting env (0) from .env
```

This is **NOT an error** - it's informational. The deploy-to-abap task reads environment variables from .env file (found 0 variables, which is normal).

### 4. Local Build Works, Local Deploy Doesn't

**✅ Works Locally (VS Code):**
```bash
npm run build  # Creates dist/ folder + Z_COURSES_UI.zip (70KB)
```

**❌ Fails Locally (VS Code):**
```bash
npm run deploy  # ERROR: Requires SAP BAS destination auth
```

### 5. Manual Upload - EASIEST Option

Since npm run build now creates the ZIP file, you can manually upload:

**Steps:**
1. Run `npm run build` locally
2. ZIP created: `dist/Z_COURSES_UI.zip`  
3. Open SAP GUI + log in
4. Transaction: `/UI5/UI5_REPOSITORY_LOAD_HTTP`
5. Click "Upload" button
6. Select: `C:\Users\14754\SAP\Saplearning\app\z.sap.courses\dist\Z_COURSES_UI.zip`
7. Enter Package: `Z_COURSES`
8. Enter Transport: `DS4K905210`
9. Click "Upload" - Done! ✅

### 6. SAP BAS Deployment Process

```bash
# In SAP BAS terminal:
git pull origin main
cd app/z.sap.courses
npm install
npm run deploy  # ✅ WORKS with destination auth
```

### 7. Configuration Summary

```yaml
Package:     Z_COURSES
Transport:   DS4K905210
App Name:    Z_COURSES_UI
Destination: S4_ABAP_DEV (SAP BAS only)
Client:      400
```

---

**Last Updated:** February 10, 2026  
**Recent Changes:**
- Removed target URL from ui5-deploy.yaml (commit 35138ee)
- Added dir: dist config to deploy-to-abap task (commit 44528bf)
- Added zipper task to ui5.yaml for local ZIP creation (commit 4c20de3)  
**Reason:** Enable local build to create ZIP for manual upload while maintaining SAP BAS destination-based deployment

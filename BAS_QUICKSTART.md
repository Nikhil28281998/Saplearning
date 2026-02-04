# SAP BAS Quick Start

## After Moving Project to SAP BAS

### 1. Open Terminal in SAP BAS

### 2. Install Dependencies (NO GLOBAL INSTALLS)
```bash
cd Saplearning
npm install
cd ui/z.sap.courses
npm install
cd ../..
```

### 3. Configure Environment
```bash
cp .env.template .env
# Edit .env with your S4HANA credentials
```

### 4. Test Connectivity
```bash
# Test if you can reach S4HANA
curl -u USERNAME:PASSWORD "https://your-s4hana-host:port/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection?\$top=1"
```

### 5. Build and Deploy
```bash
cd ui/z.sap.courses
npm run build
npm run deploy
```

---

## Common Errors & Quick Fixes

| Error | Quick Fix |
|-------|-----------|
| `fiori@* not found` | Already fixed ✅ - removed from package.json |
| `CDS version 7.9 incompatible` | Already fixed ✅ - updated to version 8 |
| `specVersion 4.0 not supported` | Already fixed ✅ - changed to 3.1 |
| `Certificate error` | Add to .env: `NODE_TLS_REJECT_UNAUTHORIZED=0` (dev only) |
| `401 Unauthorized` | Check username/password in .env |
| `Transport not found` | Leave empty in prompt - system will create one |

---

## No VSCode Installations Needed

All tools are pre-installed in SAP BAS:
- ✅ SAP Fiori Tools
- ✅ @ui5/cli
- ✅ Node.js & npm
- ✅ Git

Just run `npm install` at project level!

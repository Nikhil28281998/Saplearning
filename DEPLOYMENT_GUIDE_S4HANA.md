# S4HANA On-Premise Deployment Guide

## ⚠️ CRITICAL FIXES APPLIED

### Issues Fixed:
1. ✅ **CDS Version Incompatibility**: Updated from 7.9 to version 8.x (backward compatible)
2. ✅ **Fiori Registry Error**: Removed `fiori@*` dependency, using proper SAP Fiori tools
3. ✅ **UI5 CLI Version**: Downgraded from v4 to v3 (compatible with S4HANA on-premise)
4. ✅ **Deployment Configuration**: Fixed ui5-deploy.yaml for ABAP deployment
5. ✅ **SAP BAS Compatibility**: Project is now ready for SAP Business Application Studio

---

## Prerequisites

### On SAP BAS (Business Application Studio):
- ✅ Full-Stack Cloud Application Dev Space
- ✅ SAP Fiori Tools Extension Pack (pre-installed in BAS)
- ✅ Access to S4HANA on-premise system

### On S4HANA ABAP System:
- ✅ SAP Gateway Foundation (IW_BEP, IW_FND)
- ✅ SAP UI5 ABAP Repository (UI_INFRA)
- ✅ Custom package (Z* or Y*) or use $TMP for testing
- ✅ Transport request (or authority to create one)
- ✅ User with deployment authority (S_DEVELOP, S_TRANSPRT)

---

## Step 1: Move Project to SAP BAS

### Option A: Git Clone (Recommended)
```bash
# In SAP BAS Terminal
git clone <your-repo-url>
cd Saplearning
```

### Option B: Upload Manually
1. In SAP BAS: File → Import Project → From File System
2. Upload the entire `Saplearning` folder
3. Extract and open in workspace

---

## Step 2: Install Dependencies in SAP BAS

```bash
# Navigate to project root
cd Saplearning

# Install root dependencies - NO GLOBAL INSTALLS NEEDED
npm install

# Install UI dependencies
cd ui/z.sap.courses
npm install

# Return to root
cd ../..
```

**⚠️ IMPORTANT**: Do NOT run `npm install -g` commands in SAP BAS. All tools are pre-installed.

---

## Step 3: Configure S4HANA Connection

### Create .env file
```bash
# In Saplearning root directory
cp .env.template .env
```

### Edit .env with your S4HANA details:
```bash
FIORI_TOOLS_ABAP_DEPLOY_URL=https://s4hana-dev.yourcompany.com:44300
FIORI_TOOLS_ABAP_DEPLOY_CLIENT=100
FIORI_TOOLS_ABAP_DEPLOY_AUTH=basic
FIORI_TOOLS_ABAP_DEPLOY_USER=YOURUSER
FIORI_TOOLS_ABAP_DEPLOY_PASSWORD=YourPassword123
FIORI_TOOLS_ABAP_DEPLOY_TRANSPORT=S4DK900001
FIORI_TOOLS_ABAP_DEPLOY_PACKAGE=ZTMP
```

**⚠️ Security Note**: Never commit .env file to Git!

---

## Step 4: Test Connectivity

### Test S4HANA Connection
```bash
# In SAP BAS Terminal
curl -u YOURUSER:PASSWORD "https://s4hana-host:port/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection?$top=1"
```

✅ **Expected**: XML response with service catalog
❌ **Error Cases**:
- **SSL Certificate Error**: Add `--insecure` flag OR configure trusted certificates
- **401 Unauthorized**: Check username/password
- **Connection Refused**: Check firewall/VPN, verify host and port
- **Timeout**: Network connectivity issue - contact SAP Basis team

---

## Step 5: Build the UI5 App

```bash
# Navigate to UI app folder
cd ui/z.sap.courses

# Build for deployment
npm run build
```

✅ **Expected Output**: `dist/` folder created with optimized files

**⚠️ Potential Issues**:

### Issue: "Cannot find module '@sap/ux-ui5-tooling'"
**Fix**: 
```bash
npm install @sap/ux-ui5-tooling @ui5/cli ui5-task-zipper --save-dev
```

### Issue: "ui5-task-zipper not found"
**Fix**:
```bash
npm install ui5-task-zipper@3.1.3 --save-dev
```

### Issue: Build fails with "specVersion 4.0 not supported"
**Fix**: Already fixed in ui5-deploy.yaml (changed to 3.1)

---

## Step 6: Deploy to S4HANA ABAP

### Method 1: Using Fiori Tools (Recommended in BAS)

```bash
# In ui/z.sap.courses directory
npm run deploy
```

**During deployment, you'll be prompted for**:
- ABAP System URL
- Client
- Username
- Password
- Package (use ZTMP or your custom Z*/Y* package)
- Transport Request (press Enter to create new one)

### Method 2: Using abap-deploy.json (Pre-configured)

Create `ui/z.sap.courses/abap-deploy.json`:
```json
{
  "target": {
    "url": "https://s4hana-host:port",
    "client": "100",
    "auth": "basic"
  },
  "app": {
    "name": "Z_COURSES_UI",
    "description": "SAP Learning Courses UI",
    "package": "ZTMP",
    "transport": ""
  },
  "excludePattern": [
    "node_modules/",
    "test/",
    ".env",
    "*.md"
  ]
}
```

Then deploy:
```bash
npx fiori deploy --config abap-deploy.json
```

### Method 3: Manual ZIP Upload

```bash
# Build and create ZIP
npm run build
cd dist
zip -r ../Z_COURSES_UI.zip *
cd ..

# Upload via SAP GUI:
# Transaction: /UI5/UI5_REPOSITORY_LOAD
# OR Web IDE: Use "Deploy to ABAP Repository"
```

---

## Step 7: Register App in Fiori Launchpad

### Via Transaction: /UI5/UI5_REPOSITORY_LOAD_HTTP
1. Import the application
2. BSP Application Name: `Z_COURSES_UI`
3. BSP Description: `SAP Learning Courses UI`
4. Package: `ZTMP`
5. Workbench Request: `<Your Transport>`

### Via Transaction: /N/UI2/FLPD_CUST (Launchpad Designer)
1. Create Catalog: `Z_SAP_LEARNING`
2. Create Group: `Z_SAP_TRAINING`
3. Create Tile:
   - Title: "SAP Courses"
   - Semantic Object: `ZSAPCourses`
   - Action: `display`
   - Target Mapping: Points to BSP App `Z_COURSES_UI`

### Via Transaction: LPD_CUST (Launchpad Configuration)
1. Create Launchpad Role
2. Assign Catalog and Groups
3. Assign to Users

---

## Connectivity Issues & Solutions

### Issue 1: Certificate Trust Error
**Symptom**: `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or `CERT_HAS_EXPIRED`

**Solution A - For Development Only**:
```bash
# In .env file
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Solution B - Proper Fix**:
1. Export S4HANA SSL Certificate
2. In SAP BAS: Add to trusted certificates
3. Or contact SAP Basis to use proper CA-signed certificates

### Issue 2: CORS (Cross-Origin Resource Sharing) Error
**Symptom**: Browser console shows CORS policy error

**Solution**:
1. ABAP System: Activate ICF service `/sap/bc/ui5_ui5/`
2. Check service is active in Transaction SICF
3. Add allowed origins in ABAP system (Transaction SICF)

### Issue 3: 401 Unauthorized
**Symptom**: "HTTP 401 - Unauthorized"

**Solution**:
- Verify credentials in .env file
- Check user has SAP_UI5_DEPLOY authorization
- Verify client parameter is correct
- Try in SAP GUI first to ensure account is not locked

### Issue 4: 503 Service Unavailable
**Symptom**: "503 Service Unavailable"

**Solution**:
- Check ICF services are active (Transaction SICF)
- Verify `/sap/public/bc` and `/sap/bc/ui5_ui5` are active
- Check system is not in maintenance mode
- Contact SAP Basis team

### Issue 5: Network Timeout
**Symptom**: Request times out after 60 seconds

**Solution**:
- Check VPN connection (if required)
- Verify firewall allows port 44300 (or your HTTPS port)
- Check SAP Cloud Connector (if using)
- Test with `ping` or `telnet` to S4HANA host

### Issue 6: Transport Request Issues
**Symptom**: Cannot create or find transport request

**Solution**:
- Create transport manually in SE09 or SE10
- Use existing transport: `FIORI_TOOLS_ABAP_DEPLOY_TRANSPORT=S4DK900123`
- Check user has S_TRANSPRT authorization
- Use $TMP package for quick testing (no transport needed)

---

## Testing the Deployment

### 1. Test via Direct URL
```
https://s4hana-host:port/sap/bc/ui5_ui5/sap/z_courses_ui/index.html
```

### 2. Test via Fiori Launchpad
```
https://s4hana-host:port/sap/bc/ui2/flp
```

### 3. Test OData Service Connection
```
https://s4hana-host:port/sap/opu/odata/sap/YOUR_SERVICE_SRV/$metadata
```

---

## Future Scope & Enhancements

### ✅ Implemented
- CDS version compatibility fix
- UI5 tooling configuration
- ABAP deployment setup
- Environment-based configuration

### 🔄 Recommended Next Steps
1. **CI/CD Pipeline**: Set up automated deployment
2. **Multi-tenancy**: Support multiple S4HANA systems
3. **Monitoring**: Add application insights and logging
4. **Security**: Implement OAuth 2.0 instead of basic auth
5. **Performance**: Add CDN for UI5 resources
6. **Testing**: Unit tests and E2E tests in SAP BAS

### 🚀 Advanced Features
1. **SAP Cloud Connector**: For secure on-premise connectivity
2. **Destination Service**: Abstract system connections
3. **XSUAA**: Enterprise-grade authentication
4. **S4HANA Cloud Integration**: Hybrid deployment support

---

## Troubleshooting Checklist

Before reaching out for support, verify:

- [ ] SAP BAS Dev Space is running
- [ ] All npm dependencies installed (`npm install`)
- [ ] .env file configured with correct values
- [ ] VPN connected (if required)
- [ ] S4HANA system is reachable (`curl` test)
- [ ] ICF services are active in S4HANA
- [ ] User has deployment authorizations
- [ ] Transport request is valid and modifiable
- [ ] Package exists in S4HANA (ZTMP or Z*/Y*)
- [ ] UI5 build completes without errors
- [ ] Certificate trust configured (if self-signed)

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Build UI5 app
cd ui/z.sap.courses && npm run build

# Deploy to S4HANA
npm run deploy

# Test locally in BAS
npm start

# Create deployment archive
npm run deploy:undeploy:backup

# Check installed UI5 CLI version
npx ui5 --version

# Validate ui5.yaml syntax
npx ui5 validate
```

---

## Support Contacts

- **SAP BAS Issues**: SAP Support Portal → Business Application Studio
- **S4HANA Connectivity**: Contact your SAP Basis Team
- **Fiori Deployment**: SAP Support Portal → UI Technologies → SAP Fiori
- **Authorization Issues**: Contact your Security Team

---

## Additional Resources

- [SAP Fiori Tools Documentation](https://help.sap.com/docs/SAP_FIORI_tools)
- [UI5 Tooling](https://sap.github.io/ui5-tooling/)
- [Deploying to ABAP Repository](https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/607014e278d941fda4440f92f4a324a6.html)
- [SAP Business Application Studio](https://help.sap.com/docs/SAP%20Business%20Application%20Studio)

---

**Document Version**: 2.0  
**Last Updated**: February 2026  
**Status**: ✅ Ready for SAP BAS Deployment

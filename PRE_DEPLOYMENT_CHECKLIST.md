# 🎯 PRE-DEPLOYMENT CHECKLIST

**Complete this checklist before deploying to S4HANA**

---

## PART 1: SAP BAS Setup ✅

### [ ] 1.1 Project in SAP BAS
- [ ] Project uploaded/cloned to SAP BAS
- [ ] Dev Space type: "Full-Stack Cloud Application"
- [ ] Dev Space is RUNNING

### [ ] 1.2 Dependencies Installed
```bash
# In Saplearning directory
npm install
cd ui/z.sap.courses
npm install
```
- [ ] Root `npm install` completed successfully
- [ ] UI `npm install` completed successfully
- [ ] No critical errors in npm output

### [ ] 1.3 Environment Configuration
```bash
cp .env.template .env
# Edit .env with your values
```
- [ ] .env file created
- [ ] FIORI_TOOLS_ABAP_DEPLOY_URL filled
- [ ] FIORI_TOOLS_ABAP_DEPLOY_CLIENT filled
- [ ] FIORI_TOOLS_ABAP_DEPLOY_USER filled
- [ ] FIORI_TOOLS_ABAP_DEPLOY_PASSWORD filled
- [ ] FIORI_TOOLS_ABAP_DEPLOY_PACKAGE filled (use ZTMP for testing)

---

## PART 2: Connectivity Test 🔌

### [ ] 2.1 Network Access
```bash
# Test 1: Can you ping the host?
ping your-s4hana-host

# Test 2: Is the port open?
telnet your-s4hana-host 44300
```
- [ ] Ping successful (or VPN connected)
- [ ] Port accessible
- [ ] VPN connected (if required)

### [ ] 2.2 S4HANA System Access
```bash
# Test OData catalog access
curl -u USERNAME:PASSWORD "https://your-s4hana-host:port/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection?\$top=1"
```
- [ ] Returns XML response (not error)
- [ ] No "401 Unauthorized" error
- [ ] No "Certificate" errors (or acceptable for dev)

### [ ] 2.3 SAP GUI Test (Optional but Recommended)
- [ ] Can login via SAP GUI
- [ ] User account not locked
- [ ] Password not expired

---

## PART 3: S4HANA System Readiness 🖥️

### [ ] 3.1 ICF Services Active (Check in SICF)
Ask SAP Basis team to verify:
- [ ] `/sap/public/bc` - Active
- [ ] `/sap/bc/ui5_ui5` - Active
- [ ] `/sap/opu/odata` - Active
- [ ] `/sap/bc/webdynpro/sap` - Active

### [ ] 3.2 Required Components Installed
Ask SAP Basis team to verify:
- [ ] SAP UI5 Infrastructure (UI_INFRA)
- [ ] SAP Gateway Foundation (IW_BEP, IW_FND)
- [ ] System is SAP S/4HANA (not older ECC)

### [ ] 3.3 User Authorizations
Check in SU01 or ask Security team:
- [ ] S_DEVELOP - Development authorization
- [ ] S_TRANSPRT - Transport authorization
- [ ] S_RFC - RFC execution
- [ ] SAP_UI5_DEPLOY or equivalent

### [ ] 3.4 Package and Transport
- [ ] Package ZTMP exists (or use $TMP for testing)
- [ ] Can create transport request (or have existing one)
- [ ] Transport is modifiable (not released)

---

## PART 4: Build Test 🏗️

### [ ] 4.1 Build Execution
```bash
cd ui/z.sap.courses
npm run build
```
- [ ] Build completes without errors
- [ ] `dist/` folder created
- [ ] Files present in `dist/` folder

### [ ] 4.2 Build Output Verification
Check that `dist/` contains:
- [ ] manifest.json
- [ ] Component.js
- [ ] index.html
- [ ] All view files
- [ ] i18n folder

---

## PART 5: Pre-Deployment Verification ✅

### [ ] 5.1 Configuration Files Present
- [ ] `ui5-deploy.yaml` exists
- [ ] `xs-app.json` exists
- [ ] `abap-deploy.json` exists
- [ ] `package.json` has deploy script

### [ ] 5.2 Deployment Command Test
```bash
cd ui/z.sap.courses
npm run deploy -- --help
```
- [ ] Deploy command recognized
- [ ] No "command not found" errors
- [ ] Fiori tools available

---

## PART 6: Deploy! 🚀

### [ ] 6.1 Execute Deployment
```bash
cd ui/z.sap.courses
npm run deploy
```

**What to expect**:
1. System prompts for connection details (or reads from .env)
2. Authenticates to S4HANA
3. Creates/uploads BSP application
4. Assigns to transport (or creates new one)
5. Shows success message

### [ ] 6.2 Verify Deployment
- [ ] Deployment completed without errors
- [ ] BSP Application name shown: `Z_COURSES_UI`
- [ ] Transport number shown (save this!)
- [ ] No "401", "403", or "500" errors

---

## PART 7: Post-Deployment Verification 🧪

### [ ] 7.1 BSP Application in System
```
Transaction: SE80
Object Type: BSP Application
Name: Z_COURSES_UI
```
- [ ] BSP Application visible in SE80
- [ ] All files uploaded correctly
- [ ] manifest.json present
- [ ] Component.js present

### [ ] 7.2 Direct URL Access Test
```
https://your-s4hana-host:port/sap/bc/ui5_ui5/sap/z_courses_ui/index.html
```
- [ ] URL accessible
- [ ] No "404 Not Found"
- [ ] Application loads (even if shows login or error)

### [ ] 7.3 Fiori Launchpad Configuration (Optional)
```
Transaction: /UI2/FLPD_CUST or LPD_CUST
```
- [ ] Catalog created
- [ ] Tile added to catalog
- [ ] Group assigned
- [ ] Target mapping configured
- [ ] Tile visible in Launchpad

---

## TROUBLESHOOTING QUICK REFERENCE 🔧

| Issue | Check This |
|-------|-----------|
| 401 Unauthorized | Username/password in .env correct? |
| 403 Forbidden | User has deployment authorizations? |
| 503 Service Unavailable | ICF services active in SICF? |
| Certificate Error | Add NODE_TLS_REJECT_UNAUTHORIZED=0 to .env |
| Transport Error | Create transport manually in SE10 |
| Connection Timeout | VPN connected? Firewall allows port? |
| Package Not Found | Use $TMP or create package in SE80 |

---

## IF DEPLOYMENT FAILS ❌

### Step 1: Capture Error Details
- [ ] Screenshot error message
- [ ] Copy full error text from terminal
- [ ] Note HTTP status code (401, 403, 500, etc.)

### Step 2: Check Common Issues
1. **401 Error** → Fix credentials in .env
2. **Certificate Error** → Add SSL workaround to .env
3. **Transport Error** → Create transport manually in SE10
4. **Network Error** → Check VPN and firewall
5. **Package Error** → Change to $TMP in .env

### Step 3: Review Documentation
- [ ] Read DEPLOYMENT_GUIDE_S4HANA.md - Connectivity Issues section
- [ ] Check FIXES_SUMMARY.md - Troubleshooting section
- [ ] Review error in context of your specific situation

### Step 4: Escalate if Needed
- **Network Issues** → Network/VPN Team
- **System Access** → SAP Basis Team
- **Authorizations** → SAP Security Team
- **Code Issues** → Development Team

---

## SUCCESS! 🎉

### If all checks pass:
✅ **Your application is deployed!**

### Next Steps:
1. Test the application thoroughly
2. Configure Fiori Launchpad tiles
3. Assign to users
4. Transport to QA system
5. Schedule production deployment

---

## CHECKLIST STATUS

**Date Started**: ________________  
**Completed By**: ________________  
**Deployment Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete  
**BSP Application**: Z_COURSES_UI  
**Transport Number**: ________________  
**Deployment URL**: ________________________________________

---

**Document**: Pre-Deployment Checklist  
**Version**: 1.0  
**Last Updated**: February 2026

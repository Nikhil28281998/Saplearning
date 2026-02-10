# CRITICAL: Root Cause Found - Index.html Issue

## The Problem: Wrong UI5 Loading Method

**File**: `webapp/index.html`
**Issue**: Loading UI5 from public CDN (`https://ui5.sap.com/1.136.9/`)

```html
src="https://ui5.sap.com/1.136.9/resources/sap-ui-core.js"
```

**Why This is FATAL for S/4HANA**:
1. When deployed to S/4HANA BSP, the app MUST use the **local S/4HANA UI5 resources**
2. CDN UI5 (version 1.136) != S/4HANA UI5 (likely 1.120 or older)
3. Fiori Elements V2 templates (`sap.suite.ui.generic.template`) may not exist on public CDN
4. Result: **Template components fail to load → Blank page**

## The Fix

Replace `index.html` with S/4HANA-compatible version that:
1. Uses RELATIVE paths (loads from `/sap/bc/ui5_ui5/ui2/` on S/4HANA)
2. Removes CDN reference entirely
3. Uses Component Container approach (required for Smart Templates)

---

## SAMPLE DATA - POST Request

### Add 2 Test Records to ZCOURSES Table

**Method 1: Gateway Client (/IWFND/GW_CLIENT)**

URL: `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings`
Method: `POST`
Content-Type: `application/json`

**Record 1**:
```json
{
  "Id": "TEST-001",
  "Url": "https://learning.sap.com/abap-basics",
  "Role": "Developer",
  "Title": "ABAP Programming Basics",
  "SapModule": "ABAP",
  "Description": "Introduction to ABAP programming language for S/4HANA",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/abap"
}
```

**Record 2**:
```json
{
  "Id": "TEST-002",
  "Url": "https://learning.sap.com/fiori-overview",
  "Role": "Developer",
  "Title": "SAP Fiori Development Overview",
  "SapModule": "FIORI",
  "Description": "Learn how to build SAP Fiori apps with UI5 framework",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/fiori"
}
```

---

### Method 2: Direct SQL (SE16N or SE11)

Transaction: **SE16N**
Table: **ZCOURSES**

**Record 1**:
```
MANDT: 800 (your client number)
ID: TEST-001
URL: https://learning.sap.com/abap-basics
ROLE: Developer
TITLE: ABAP Programming Basics
SAP_MODULE: ABAP
DESCRIPTION: Introduction to ABAP programming language for S/4HANA
LAST_UPDATED: 20260209
SAP_HELP_LINK: https://help.sap.com/abap
```

**Record 2**:
```
MANDT: 800
ID: TEST-002
URL: https://learning.sap.com/fiori-overview
ROLE: Developer
TITLE: SAP Fiori Development Overview
SAP_MODULE: FIORI
DESCRIPTION: Learn how to build SAP Fiori apps with UI5 framework
LAST_UPDATED: 20260209
SAP_HELP_LINK: https://help.sap.com/fiori
```

---

## Next Steps

1. **Fix index.html** (Critical - I will do this now)
2. **Add sample data** (Use Gateway Client - easier than SQL)
3. **Redeploy**
4. **Clear cache**
5. **Test**

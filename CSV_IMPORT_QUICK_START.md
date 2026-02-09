# CSV Import Feature - Quick Start Guide

## 🎯 For You (End User)

### How to Use CSV Import

#### Step 1: Access the Feature
1. Open SAP Learning Platform
2. **Set your role to "Admin"** (top right menu)
3. Navigate to Trainings list
4. Look for **"Import CSV"** button with excel icon 📊

#### Step 2: Prepare Your CSV File
Your CSV must have these columns in this exact order:
```
ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
```

**Example:**
```csv
ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
550e8400-e29b-41d4-a716-446655440001,https://learning.sap.com/course,Developer,ABAP Basics,ABAP,Learn ABAP,20260201,https://help.sap.com
```

**Rules:**
- ID: Must be valid UUID (use online generator or Excel formula)
- role: Must be one of: Developer, Admin, Consultant, Manager, User
- title: Required, 3-100 characters
- sap_module: Required, max 20 characters
- url & sapHelpLink: Optional, must be valid URLs

#### Step 3: Import Data
1. Click **"Import CSV"** button
2. Click **"Choose a CSV file..."**
3. Select your CSV file
4. Wait for preview to load
5. Check for errors (red panel)
6. If all green, click **"Import"** button
7. Confirm: Click **"OK"**
8. Watch progress bar
9. Success message appears
10. Click **"OK"** to close

#### Step 4: Verify Import
1. Check trainings list - new records should appear
2. Test filters (role, module)
3. Click URLs to verify they work

---

## 🔧 For You (Technical Deployment)

### Files Created

#### New Files:
```
app/z.sap.courses/webapp/
├── utils/
│   └── CSVParser.js
├── controller/
│   └── ImportController.js
├── fragments/
│   └── ImportDialog.fragment.xml
├── test/
│   ├── CSVImport.qunit.html
│   ├── CSVImport.qunit.js
│   ├── test_data_valid.csv
│   ├── test_data_invalid_uuid.csv
│   ├── test_data_invalid_role.csv
│   └── test_data_special_chars.csv

Root:
├── CSV_IMPORT_FEATURE_DOCUMENTATION.md
├── CSV_IMPORT_TESTING_GUIDE.md
└── CSV_IMPORT_QUICK_START.md (this file)
```

#### Modified Files:
```
app/z.sap.courses/webapp/ext/
└── TrainingsListExtension.js (added Import button)
```

---

### Build & Deploy Steps

#### 1. Test Locally (Optional but Recommended)

```powershell
# Navigate to app folder
cd app\z.sap.courses

# Install dependencies (if needed)
npm install

# Run QUnit tests in browser
# Open: http://localhost:4004/test/CSVImport.qunit.html
# Or run headless (if configured):
npm test
```

#### 2. Build Frontend

```powershell
cd app\z.sap.courses

# Build production bundle
npm run build
```

**Expected Output:**
```
Build succeeded
Created resources:
  - webapp/utils/CSVParser.js
  - webapp/controller/ImportController.js
  - webapp/fragments/ImportDialog.fragment.xml
  - webapp/ext/TrainingsListExtension.js
```

#### 3. Deploy to S/4HANA

**Option A: Deploy via SAP BAS (Recommended)**
```powershell
npm run deploy
```

**Expected Prompts:**
```
? Enter S/4HANA system destination: s4hana-dev
? Enter transport request: NPLK9##### (your transport)
? Confirm deployment? Yes
```

**Expected Output:**
```
✓ BSP application Z_COURSES_UI updated
✓ Files deployed: 42
✓ Transport NPLK9##### updated
✓ Deployment successful
```

**Option B: Manual Deployment**
1. Transaction: **/IWFND/MAINT_SERVICE**
2. Navigate to BSP Application: **Z_COURSES_UI**
3. Upload files manually via SE80
4. Assign to transport: **NPLK9#####**

#### 4. Clear Browser Cache
```
1. Open Chrome DevTools (F12)
2. Right-click Refresh button
3. Select "Empty Cache and Hard Reload"
```

#### 5. Test in S/4HANA
```
1. Open Fiori Launchpad
2. Launch "SAP Learning Platform"
3. Set role: Admin
4. Verify "Import CSV" button visible
5. Test import with test_data_valid.csv (2 records)
6. Check success message
7. Verify records in list
```

---

### Quick Production Test

Use this test data file to verify deployment:

**test_import.csv:**
```csv
ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
550e8400-e29b-41d4-a716-446655440099,https://learning.sap.com/test,Developer,Test Import Feature,ABAP,Testing CSV import,20260209,https://help.sap.com
550e8400-e29b-41d4-a716-446655440100,https://learning.sap.com/test2,Admin,Second Test Record,UI_UX,Another test,20260209,https://help.sap.com
```

**Steps:**
1. Create file with above content
2. Import via UI
3. Verify 2 records created
4. Delete test records after verification

---

### Import Your Full Dataset (52 Records)

Once testing is complete:

```powershell
# Use your existing CSV file
# Location: db\data\Learning_Data-Trainings.csv

# BUT FIRST: Update column header
# Change: "module" → "sap_module"
```

**Steps:**
1. Open: `db\data\Learning_Data-Trainings.csv`
2. Edit header row:
   ```
   OLD: ID,url,role,title,module,description,lastUpdated,sapHelpLink
   NEW: ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
   ```
3. Save file
4. Open SAP Learning Platform
5. Set role: Admin
6. Click "Import CSV"
7. Upload `Learning_Data-Trainings.csv`
8. Verify preview shows 52 records
9. Click Import
10. Confirm
11. Wait ~20-30 seconds
12. Success! All 52 trainings loaded

---

## 🐛 Troubleshooting

### Problem: "Import CSV" button not visible
**Solution:**
- Verify role is set to "Admin" (top right)
- Refresh page (Ctrl+F5)
- Clear browser cache
- Check deployment completed successfully

### Problem: "Invalid UUID format for ID"
**Solution:**
- Generate valid UUIDs using: https://www.uuidgenerator.net/
- Or Excel formula: `=LOWER(CONCATENATE(DEC2HEX(RANDBETWEEN(0,4294967295),8),"-",...))` 
- Use existing IDs from Learning_Data-Trainings.csv

### Problem: "Invalid role"
**Solution:**
- Use only these roles: Developer, Admin, Consultant, Manager, User
- Check spelling and capitalization

### Problem: "Column count mismatch"
**Solution:**
- Verify header has 8 columns
- Check each row has 8 values
- Look for unescaped commas (should be in quotes: "Title, with comma")

### Problem: "Import failed for all records"
**Solution:**
1. Check OData service is running:
   - Transaction: /IWFND/GW_CLIENT
   - Test: GET /sap/opu/odata/sap/ZCOURSES_SRV_0001/Trainings
   - Should return HTTP 200
2. Check table exists: Transaction SE16 → ZCOURSES
3. Check Gateway service registered: /IWFND/MAINT_SERVICE
4. Enable backend debugging (SE24 → ZCL_ZCOURSES_SRV_DPC_EXT)

### Problem: Import succeeds but records not visible
**Solution:**
- Refresh page (F5)
- Clear filters
- Check role-based filtering (set role to Admin to see all)
- Verify in SE16: `SELECT * FROM ZCOURSES`

### Problem: Slow import (> 1 minute for 52 records)
**Solution:**
- Check network latency
- Verify S/4HANA system performance
- Reduce batch size in ImportController.js:
  ```javascript
  const iBatchSize = 5; // Reduce from 10 to 5
  ```

---

## 📊 What You'll See

### Before Import
```
Trainings List
┌─────────────────────────────────────────┐
│ [Import CSV] [Users] [Role: Admin]      │
├─────────────────────────────────────────┤
│ No trainings found                      │
└─────────────────────────────────────────┘
```

### During Import
```
Import Trainings from CSV
┌─────────────────────────────────────────┐
│ ℹ Upload a CSV file...                  │
│                                         │
│ Selected: Learning_Data-Trainings.csv   │
│                                         │
│ ──── Preview ────                       │
│ Records to import: 52                   │
│ ┌─────────┬──────────┬──────┬────────┐ │
│ │ ID      │ Title    │ Role │ Module │ │
│ ├─────────┼──────────┼──────┼────────┤ │
│ │ 550e... │ ABAP...  │ Dev  │ ABAP   │ │
│ │ 550e... │ Fiori... │ Admin│ UI_UX  │ │
│ └─────────┴──────────┴──────┴────────┘ │
│                                         │
│ ████████████░░░░░░░░░░ 60%              │
│ Processed 31 of 52 records...           │
│                                         │
│         [Import]  [Cancel]              │
└─────────────────────────────────────────┘
```

### After Import
```
✅ Import Successful

Successfully imported all 52 training records!

         [OK]
```

---

## 🎓 Next Steps

1. **Import your data** using steps above
2. **Test the application:**
   - Switch roles (User, Manager, Admin)
   - Test filters (role, module)
   - Click URLs to verify navigation
   - Verify SAP Help links work
3. **Train your team:**
   - Share this guide
   - Demo the import feature
   - Document any organization-specific conventions
4. **Set up data governance:**
   - Define who can import (Admin only?)
   - Backup data before imports
   - Version control CSV files
   - Regular data quality audits

---

## 📞 Support

**Documentation:**
- Technical: `CSV_IMPORT_FEATURE_DOCUMENTATION.md`
- Testing: `CSV_IMPORT_TESTING_GUIDE.md`

**Questions?**
- Check troubleshooting section above
- Review test files in `app/z.sap.courses/webapp/test/`
- Run QUnit tests to verify functionality

---

**Ready to Deploy? ✅**

```powershell
# Quick deployment command
cd c:\Users\14754\SAP\Saplearning\app\z.sap.courses
npm run build
npm run deploy
```

**Then import your 52 trainings and you're live! 🚀**

# CSV Import Feature - Testing Guide

## SAP Expert Team - Production Testing Protocol

### 🎯 Testing Objectives
1. Validate CSV parsing accuracy
2. Verify data validation rules
3. Test OData batch import
4. Confirm error handling
5. Validate UI responsiveness
6. Test with production-scale data (52 records)

---

## 📋 Test Cases

### **Test Suite 1: CSV Parsing**

#### TC-1.1: Valid CSV File
**Objective:** Verify successful parsing of valid CSV
**Steps:**
1. Set role to Admin
2. Click "Import CSV" button
3. Select `test_data_valid.csv` (2 records)
4. Check preview table

**Expected Result:**
- ✅ Preview shows 2 records
- ✅ No errors displayed
- ✅ Import button enabled
- ✅ Record count shows "2"

---

#### TC-1.2: Empty CSV File
**Objective:** Verify rejection of empty file
**Steps:**
1. Create empty file `test_empty.csv`
2. Try to upload

**Expected Result:**
- ❌ Error message: "CSV file is empty or has no data rows"
- ❌ Import button disabled

---

#### TC-1.3: Headers Only
**Objective:** Verify rejection of headers-only file
**Steps:**
1. Upload CSV with only header row
2. Check validation panel

**Expected Result:**
- ❌ Error: "No valid records found in CSV file"
- ❌ Import button disabled

---

#### TC-1.4: Invalid UUID Format
**Objective:** Verify UUID validation
**Steps:**
1. Upload CSV with invalid UUID (e.g., "ABC-123")
2. Check errors

**Expected Result:**
- ❌ Error: "Row 2: Invalid UUID format for ID"
- ❌ Record not in preview table

---

#### TC-1.5: Missing Required Fields
**Objective:** Verify required field validation
**Test Data:**
```csv
ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
550e8400-e29b-41d4-a716-446655440001,https://test.com,Developer,,ABAP,Desc,20260201,
```

**Expected Result:**
- ❌ Error: "Row 2: Title is required (minimum 3 characters)"

---

#### TC-1.6: Invalid Role
**Objective:** Verify role enumeration
**Test Data:** Role = "SuperUser"

**Expected Result:**
- ❌ Error: "Invalid role 'SuperUser' (allowed: Developer, Admin, Consultant, Manager, User)"

---

#### TC-1.7: Invalid URL
**Objective:** Verify URL validation
**Test Data:** url = "not-a-url"

**Expected Result:**
- ❌ Error: "Row 2: Invalid URL format"

---

#### TC-1.8: Field Length Validation
**Objective:** Verify max length constraints
**Test Data:**
- Title: 101 characters
- URL: 256 characters
- Module: 21 characters

**Expected Result:**
- ❌ Error: "Row 2: Title too long (max 100 characters)"
- ❌ Error: "Row 2: URL too long (max 255 characters)"
- ❌ Error: "Row 2: SAP Module too long (max 20 characters)"

---

#### TC-1.9: CSV with Commas in Quoted Fields
**Objective:** Verify RFC 4180 compliance
**Test Data:**
```csv
ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
550e8400-e29b-41d4-a716-446655440001,https://test.com,Developer,"Title with, comma",ABAP,Desc,20260201,
```

**Expected Result:**
- ✅ Title parsed as: "Title with, comma"
- ✅ No parsing errors

---

#### TC-1.10: Escaped Quotes
**Objective:** Verify quote escaping
**Test Data:** Title = `"SAP ""Best"" Practices"`

**Expected Result:**
- ✅ Title parsed as: `SAP "Best" Practices`

---

#### TC-1.11: XSS Protection
**Objective:** Verify script tag sanitization
**Test Data:** Title = `<script>alert('xss')</script>Test`

**Expected Result:**
- ✅ Script tags removed from title
- ✅ Safe text stored

---

#### TC-1.12: Duplicate ID Detection
**Objective:** Verify duplicate UUID warning
**Test Data:** 2 records with same ID

**Expected Result:**
- ⚠️ Warning: "Duplicate IDs found: 550e8400-..."
- ✅ Both records shown in preview
- ✅ Import allowed (backend will handle)

---

### **Test Suite 2: OData Import**

#### TC-2.1: Successful Import (Small Batch)
**Objective:** Verify successful import of 5 records
**Steps:**
1. Upload valid CSV with 5 records
2. Click Import
3. Confirm dialog
4. Wait for completion

**Expected Result:**
- ✅ Progress bar shows 0% → 100%
- ✅ Success message: "Successfully imported all 5 training records!"
- ✅ Dialog closes after confirmation
- ✅ Table refreshes with new data

---

#### TC-2.2: Full Production Import (52 Records)
**Objective:** Verify production-scale import
**Steps:**
1. Upload `Learning_Data-Trainings.csv` (52 records)
2. Import with confirmation
3. Monitor progress

**Expected Result:**
- ✅ Progress indicator updates smoothly
- ✅ All 52 records imported
- ✅ Success message shown
- ✅ Import completes in < 30 seconds

---

#### TC-2.3: Partial Import Failure
**Objective:** Verify error handling during import
**Prerequisite:** Create duplicate records in backend
**Steps:**
1. Import CSV with some duplicate IDs
2. Check partial success message

**Expected Result:**
- ⚠️ Message: "Import completed with errors"
- ⚠️ Shows count: "45 imported, 7 failed"
- ⚠️ Error details displayed
- ✅ Successfully imported records are saved

---

#### TC-2.4: Complete Import Failure
**Objective:** Verify behavior when all records fail
**Prerequisite:** Stop OData service or break connection
**Steps:**
1. Try to import
2. Check error handling

**Expected Result:**
- ❌ Error message: "Import failed for all records"
- ❌ Error details shown
- ❌ Import button re-enabled for retry
- ❌ No partial data saved

---

#### TC-2.5: Network Interruption
**Objective:** Verify resilience to network errors
**Steps:**
1. Start import
2. Disconnect network mid-import
3. Check error handling

**Expected Result:**
- ❌ Error message shows network failure
- ⚠️ Shows partial success count if any
- ✅ Allows retry

---

### **Test Suite 3: UI/UX Testing**

#### TC-3.1: Role-Based Access Control
**Objective:** Verify Import button visibility
**Steps:**
1. Set role to "User" → Import button hidden
2. Set role to "Manager" → Import button hidden
3. Set role to "Admin" → Import button visible

**Expected Result:**
- ✅ Only Admin can see Import CSV button
- ✅ Icon: excel-attachment

---

#### TC-3.2: File Type Validation
**Objective:** Verify only CSV files accepted
**Steps:**
1. Try to upload .xlsx file
2. Try to upload .txt file
3. Try to upload .csv file

**Expected Result:**
- ❌ .xlsx rejected
- ❌ .txt rejected
- ✅ .csv accepted

---

#### TC-3.3: File Size Validation
**Objective:** Verify 5 MB limit
**Steps:**
1. Create 6 MB CSV file
2. Try to upload

**Expected Result:**
- ❌ Error: File too large
- ❌ Upload blocked

---

#### TC-3.4: Dialog Responsiveness
**Objective:** Verify dialog behavior
**Steps:**
1. Open dialog
2. Resize dialog
3. Close dialog
4. Reopen dialog

**Expected Result:**
- ✅ Dialog is draggable
- ✅ Dialog is resizable
- ✅ Dialog resets on reopen
- ✅ Previous data cleared

---

#### TC-3.5: Preview Table Functionality
**Objective:** Verify preview features
**Steps:**
1. Upload 20+ records
2. Check growing threshold
3. Scroll through data

**Expected Result:**
- ✅ Shows first 10 rows
- ✅ "More" button appears
- ✅ All columns visible (ID, Title, Role, Module)

---

#### TC-3.6: Error Panel Expandability
**Objective:** Verify validation panel
**Steps:**
1. Upload CSV with errors
2. Expand/collapse error panel
3. Check error list

**Expected Result:**
- ✅ Panel initially expanded if errors
- ✅ Each error has icon and message
- ✅ Errors grouped (errors vs warnings)

---

#### TC-3.7: Progress Indicator
**Objective:** Verify progress feedback
**Steps:**
1. Import 52 records
2. Watch progress bar
3. Check progress text

**Expected Result:**
- ✅ Progress bar updates continuously
- ✅ Text shows: "Processed X of 52 records..."
- ✅ Percentage accurate

---

### **Test Suite 4: Integration Testing**

#### TC-4.1: Frontend-Backend Integration
**Objective:** Verify end-to-end flow
**Steps:**
1. Upload CSV
2. Import data
3. Navigate to training list
4. Verify records exist

**Expected Result:**
- ✅ Records appear in list
- ✅ All fields correct (title, role, module)
- ✅ URLs are clickable
- ✅ Filtering works

---

#### TC-4.2: Date Format Handling
**Objective:** Verify date parsing
**Test Data:**
- Format 1: 20260201 (YYYYMMDD)
- Format 2: 2026-02-01T00:00:00Z (ISO)

**Expected Result:**
- ✅ Both formats accepted
- ✅ Backend receives correct date
- ✅ Display shows formatted date

---

#### TC-4.3: Special Characters
**Objective:** Verify special character handling
**Test Data:**
- German: ÄÖÜäöüß
- French: éèêë
- Symbols: & < > " '

**Expected Result:**
- ✅ All characters preserved
- ✅ No encoding errors
- ✅ Display correct in UI

---

#### TC-4.4: OData V2 Compatibility
**Objective:** Verify OData version compatibility
**Steps:**
1. Check network tab during import
2. Verify request format

**Expected Result:**
- ✅ POST to /Trainings endpoint
- ✅ OData V2 format used
- ✅ Batch requests work

---

### **Test Suite 5: Error Recovery**

#### TC-5.1: Cancel During Import
**Objective:** Verify cancel behavior
**Steps:**
1. Start import of 52 records
2. Click Cancel immediately

**Expected Result:**
- ⚠️ Partial records may be imported
- ✅ Dialog closes
- ✅ Table refresh triggered

---

#### TC-5.2: Retry After Failure
**Objective:** Verify retry capability
**Steps:**
1. Import fails (all records)
2. Fix issue (e.g., restore network)
3. Keep dialog open
4. Click Import again

**Expected Result:**
- ✅ Import button re-enabled after failure
- ✅ Retry uses same data
- ✅ Success on second attempt

---

#### TC-5.3: Validation Error Correction
**Objective:** Verify user can fix errors
**Steps:**
1. Upload invalid CSV
2. Check errors
3. Fix CSV file
4. Upload corrected file

**Expected Result:**
- ✅ New file replaces old preview
- ✅ Errors cleared
- ✅ Import button enabled

---

## 🔧 Test Data Files

### **test_data_valid.csv**
```csv
ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
550e8400-e29b-41d4-a716-446655440001,https://learning.sap.com/course1,Developer,ABAP Development Basics,ABAP,Learn ABAP fundamentals,20260201,https://help.sap.com/abap
550e8400-e29b-41d4-a716-446655440002,https://learning.sap.com/course2,Admin,SAP Fiori Administration,UI_UX,Fiori admin guide,20260202,https://help.sap.com/fiori
```

### **test_data_invalid_uuid.csv**
```csv
ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
INVALID-UUID,https://test.com,Developer,Test,ABAP,Desc,20260201,
```

### **test_data_invalid_role.csv**
```csv
ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
550e8400-e29b-41d4-a716-446655440001,https://test.com,SuperUser,Test,ABAP,Desc,20260201,
```

### **test_data_special_chars.csv**
```csv
ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink
550e8400-e29b-41d4-a716-446655440001,https://test.com,Developer,"Title with, comma and ""quotes""",ABAP,Beschreibung mit Umlauten: ÄÖÜ,20260201,
```

---

## 📊 Test Execution Report Template

### Test Run: [Date]
**Tester:** [Name]  
**Environment:** S/4HANA Private Cloud 2022  
**Browser:** [Chrome/Edge/Safari]

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| TC-1.1 | Valid CSV | ✅ Pass | |
| TC-1.2 | Empty CSV | ✅ Pass | |
| TC-2.1 | Small Import | ✅ Pass | |
| TC-2.2 | 52 Records | ✅ Pass | Completed in 18s |
| ... | ... | ... | ... |

**Overall Result:** ✅ PASS / ❌ FAIL

**Issues Found:**
1. [Issue description]
2. [Issue description]

**Recommendations:**
1. [Recommendation]
2. [Recommendation]

---

## 🚀 Quick Test Checklist

Use this for quick smoke testing:

- [ ] Admin can see Import CSV button
- [ ] Non-admin cannot see Import CSV button
- [ ] Upload valid 2-record CSV
- [ ] Preview shows data correctly
- [ ] Import succeeds
- [ ] Records appear in list
- [ ] Upload invalid CSV (bad UUID)
- [ ] Error shown, import disabled
- [ ] Upload 52-record production file
- [ ] Import succeeds in < 30 seconds
- [ ] All 52 records visible
- [ ] URLs are clickable
- [ ] Filters work on imported data

---

## 📝 Notes for Testers

1. **Always test as Admin first** - Import feature is Admin-only
2. **Use browser DevTools** - Monitor network tab for OData calls
3. **Check backend logs** - Verify no ABAP short dumps
4. **Test data cleanup** - Delete test records after each run
5. **Performance baseline** - 52 records should import in < 30 seconds
6. **Error messages** - Should be user-friendly, not technical stack traces

---

## ✅ Sign-Off Criteria

CSV Import feature is production-ready when:

1. ✅ All 40+ test cases pass
2. ✅ No console errors in browser
3. ✅ No ABAP short dumps
4. ✅ Performance meets baseline (< 30s for 52 records)
5. ✅ Security review passed (XSS protection, role-based access)
6. ✅ User acceptance testing completed
7. ✅ Documentation updated

---

**Testing Standards:**
- SAP Clean Core principles applied
- WCAG 2.1 accessibility compliance
- RFC 4180 CSV standard compliance
- OData V2 protocol compliance

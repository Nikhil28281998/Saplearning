# Phase 3: Gateway Client Test Scripts

**Transaction:** `/IWFND/GW_CLIENT`  
**Service:** `ZCOURSES_SRV`

---

## Test 1: Verify Metadata

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/$metadata`  
**Method:** `GET`  
**Headers:** None  
**Body:** None  
**Expected:** `200 OK` with XML containing `<EntityType Name="Training">` and `<Property Name="SapModule">`

---

## Test 2: GET Collection (Empty)

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings`  
**Method:** `GET`  
**Headers:**
```
Accept: application/json
```
**Body:** None  
**Expected:** `200 OK`
```json
{
  "d": {
    "results": []
  }
}
```

---

## Test 3: CREATE Training Record #1

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings`  
**Method:** `POST`  
**Headers:**
```
Content-Type: application/json
Accept: application/json
```
**Body:**
```json
{
  "Title": "ABAP Programming Basics",
  "Role": "Developer",
  "SapModule": "ABAP Development",
  "Description": "Learn core ABAP syntax and programming concepts",
  "Url": "https://learning.sap.com/abap-basics",
  "SapHelpLink": "https://help.sap.com/abap"
}
```
**Expected:** `201 Created`  
**Save the returned `Id` value for next tests**

---

## Test 4: GET Single Record by ID

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings(guid'PASTE-ID-FROM-TEST3')`  
**Method:** `GET`  
**Headers:**
```
Accept: application/json
```
**Body:** None  
**Expected:** `200 OK` with single training record

**Example URI:**
```
/sap/opu/odata/sap/ZCOURSES_SRV/Trainings(guid'12345678-1234-1234-1234-123456789012')
```

---

## Test 5: UPDATE Training Record

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings(guid'PASTE-ID-FROM-TEST3')`  
**Method:** `PUT` or `PATCH`  
**Headers:**
```
Content-Type: application/json
Accept: application/json
```
**Body:**
```json
{
  "Title": "ABAP Programming Basics - Updated",
  "Description": "Learn core ABAP syntax, programming concepts, and best practices for modern development"
}
```
**Expected:** `200 OK` or `204 No Content`

---

## Test 6: Filter by Role

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings?$filter=Role eq 'Developer'`  
**Method:** `GET`  
**Headers:**
```
Accept: application/json
```
**Body:** None  
**Expected:** `200 OK` with filtered results

---

## Test 7: Filter by SapModule

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings?$filter=SapModule eq 'ABAP Development'`  
**Method:** `GET`  
**Headers:**
```
Accept: application/json
```
**Body:** None  
**Expected:** `200 OK` with filtered results

---

## Test 8: CREATE Training Record #2

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings`  
**Method:** `POST`  
**Headers:**
```
Content-Type: application/json
Accept: application/json
```
**Body:**
```json
{
  "Title": "SAP Fiori Elements",
  "Role": "Consultant",
  "SapModule": "UI5 Development",
  "Description": "Build modern SAP Fiori applications using UI5 and Fiori Elements templates",
  "Url": "https://learning.sap.com/fiori-elements",
  "SapHelpLink": "https://help.sap.com/fiori"
}
```
**Expected:** `201 Created`  
**Save the returned `Id` value**

---

## Test 9: CREATE Training Record #3

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings`  
**Method:** `POST`  
**Headers:**
```
Content-Type: application/json
Accept: application/json
```
**Body:**
```json
{
  "Title": "SAP BTP Integration",
  "Role": "Architect",
  "SapModule": "Integration Suite",
  "Description": "Integrate S/4HANA with SAP Business Technology Platform services",
  "Url": "https://learning.sap.com/btp-integration",
  "SapHelpLink": "https://help.sap.com/btp"
}
```
**Expected:** `201 Created`

---

## Test 10: CREATE Training Record #4

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings`  
**Method:** `POST`  
**Headers:**
```
Content-Type: application/json
Accept: application/json
```
**Body:**
```json
{
  "Title": "SAP Gateway OData Services",
  "Role": "Developer",
  "SapModule": "Gateway Development",
  "Description": "Create and expose RESTful OData services using SAP Gateway",
  "Url": "https://learning.sap.com/gateway-odata",
  "SapHelpLink": "https://help.sap.com/gateway"
}
```
**Expected:** `201 Created`

---

## Test 11: CREATE Training Record #5

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings`  
**Method:** `POST`  
**Headers:**
```
Content-Type: application/json
Accept: application/json
```
**Body:**
```json
{
  "Title": "SAP S/4HANA Migration",
  "Role": "Manager",
  "SapModule": "Migration Tools",
  "Description": "Plan and execute migration from ECC to S/4HANA",
  "Url": "https://learning.sap.com/s4hana-migration",
  "SapHelpLink": "https://help.sap.com/s4hana"
}
```
**Expected:** `201 Created`

---

## Test 12: GET All Records (Multiple)

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings`  
**Method:** `GET`  
**Headers:**
```
Accept: application/json
```
**Body:** None  
**Expected:** `200 OK` with array of 5 training records

---

## Test 13: DELETE Training Record

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings(guid'PASTE-FIRST-RECORD-ID')`  
**Method:** `DELETE`  
**Headers:** None  
**Body:** None  
**Expected:** `204 No Content`

---

## Test 14: DELETE Non-Existent Record (Error Test)

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings(guid'99999999-9999-9999-9999-999999999999')`  
**Method:** `DELETE`  
**Headers:** None  
**Body:** None  
**Expected:** `404 Not Found` with error message "Training not found"

---

## Test 15: CREATE Without Required Fields (Validation Test)

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings`  
**Method:** `POST`  
**Headers:**
```
Content-Type: application/json
Accept: application/json
```
**Body:**
```json
{
  "Role": "Developer",
  "SapModule": "ABAP Development"
}
```
**Expected:** `400 Bad Request` with error message "Title and URL are required"

---

## Test 16: UPDATE Non-Existent Record (Error Test)

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings(guid'88888888-8888-8888-8888-888888888888')`  
**Method:** `PUT`  
**Headers:**
```
Content-Type: application/json
Accept: application/json
```
**Body:**
```json
{
  "Title": "Should Not Update"
}
```
**Expected:** `404 Not Found` with error message "Training not found"

---

## Test 17: Combined Filter (Role AND Module)

**URI:** `/sap/opu/odata/sap/ZCOURSES_SRV/Trainings?$filter=Role eq 'Developer' and SapModule eq 'ABAP Development'`  
**Method:** `GET`  
**Headers:**
```
Accept: application/json
```
**Body:** None  
**Expected:** `200 OK` with filtered results matching both conditions

---

## Success Checklist

After running all 17 tests, verify:

- ✅ Test 1: Metadata returns 200 with SapModule property
- ✅ Test 2: Empty collection returns empty array
- ✅ Test 3-8: All 5 CREATE operations return 201 with generated UUIDs
- ✅ Test 4: GET single record returns correct data
- ✅ Test 5: UPDATE modifies existing record
- ✅ Test 6-7: $filter works for Role and SapModule
- ✅ Test 12: GET all returns 5 records (or 4 if you already deleted one)
- ✅ Test 13: DELETE removes record successfully (204)
- ✅ Test 14: DELETE non-existent returns 404
- ✅ Test 15: CREATE without required fields returns 400
- ✅ Test 16: UPDATE non-existent returns 404
- ✅ Test 17: Combined filters work correctly

---

## Troubleshooting

### Error 501: Method Not Implemented
**Solution:** Method not redefined in DPC_EXT class. Go to SE24 → ZCL_ZCOURSES_DPC_EXT → Ensure methods are redefined and have code (not empty).

### Error 404: Service Not Found
**Solution:** Service not registered. Check /IWFND/MAINT_SERVICE → ZCOURSES_SRV should be listed.

### Error 500: Internal Server Error
**Solution:** Check ST22 for dump. Usually ABAP syntax error or missing field mapping.

### Empty Response for GET
**Solution:** No data in ZCOURSES table. Run CREATE tests first, verify in SE16.

---

## Database Verification (SE16)

After tests, check **SE16 → ZCOURSES table**:

**Expected records after all tests:**
- 4 records remaining (5 created - 1 deleted in Test 13)
- Fields populated: ID (UUID), TITLE, ROLE, SAP_MODULE, DESCRIPTION, URL, SAP_HELP_LINK, LAST_UPDATED
- LAST_UPDATED = today's date for all records

---

## Next Phase After Success

**Phase 4: Frontend Deployment**
- Build UI5 application
- Deploy to S/4HANA BSP repository
- Configure Fiori Launchpad
- Test CSV import feature
- End-to-end testing

**Prerequisites:**
- All Phase 3 tests passing ✅
- Backend OData service fully functional ✅
- Data can be created/read/updated/deleted via Gateway Client ✅

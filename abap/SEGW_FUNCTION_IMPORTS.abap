*&---------------------------------------------------------------------*
*& SEGW Function Import + Complex Type Configuration Guide
*& Project: ZCOURSES
*&
*& This file documents the COMPLETE SEGW configuration required for
*& the getCurrentRole and markCompleted Function Imports.
*&
*& STATUS: If getCurrentRole returns HTTP 500, follow ALL steps below.
*& The 500 means the Function Import or Complex Type is missing in SEGW.
*&
*& Author: SAP Expert Team
*&---------------------------------------------------------------------*

*& =====================================================================
*& STEP 1: Create Complex Type "CurrentRole" in SEGW
*& =====================================================================
*&
*&   1. Open SEGW → Project ZCOURSES
*&   2. Expand "Data Model" → Right-click "Complex Types"
*&   3. Choose "Create" → Name: CurrentRole
*&   4. Expand the new Complex Type "CurrentRole"
*&   5. Right-click "Properties" → Create:
*&
*&      Property Name:  Role
*&      ABAP Name:      ROLE
*&      Edm Core Type:  Edm.String
*&      MaxLength:      20
*&      Nullable:       true
*&
*&   6. Save
*&
*& =====================================================================
*& STEP 2: Create Function Import "getCurrentRole" in SEGW
*& =====================================================================
*&
*&   1. In SEGW → Project ZCOURSES
*&   2. Expand "Service Implementation" → Right-click "Function Imports"
*&      (OR: Expand "Data Model" → Right-click "Function Imports")
*&   3. Choose "Create"
*&   4. Fill in:
*&
*&      Function Import Name:  getCurrentRole
*&      HTTP Method:           GET
*&      Return Type Kind:      Complex Type
*&      Return Type:           CurrentRole    (the complex type from Step 1)
*&      Return Cardinality:    1  (single)
*&      Addressable:           checked
*&
*&   5. NO parameters needed (getCurrentRole takes no input)
*&   6. Save
*&
*& =====================================================================
*& STEP 3: Create Function Import "markCompleted" in SEGW
*& =====================================================================
*&
*&   1. In SEGW → same project
*&   2. Right-click "Function Imports" → Create
*&   3. Fill in:
*&
*&      Function Import Name:  markCompleted
*&      HTTP Method:           POST
*&      Return Type Kind:      Entity Type
*&      Return Type:           TrainingAssignment
*&      Return Cardinality:    1
*&
*&   4. Add Parameter:
*&      - Right-click the markCompleted function import → Create Parameter
*&      Parameter Name:  Id
*&      ABAP Name:       ID
*&      Edm Core Type:   Edm.String
*&      MaxLength:       36
*&      Mode:            In
*&      Nullable:        false
*&
*&   5. Save
*&
*& =====================================================================
*& STEP 4: Regenerate Runtime Artifacts
*& =====================================================================
*&
*&   1. In SEGW → click "Generate" (the orange gear icon on toolbar)
*&   2. Confirm generation of:
*&      - MPC class (ZCL_ZCOURSES_MPC) — Model Provider Class
*&      - MPC_EXT class (ZCL_ZCOURSES_MPC_EXT)
*&      - DPC class (ZCL_ZCOURSES_DPC)
*&      - DPC_EXT class (ZCL_ZCOURSES_DPC_EXT)
*&   3. After generation, verify in SE24:
*&      - Open ZCL_ZCOURSES_MPC → Attributes tab
*&      - Search for "ts_currentrole" → This MUST exist (it's the
*&        ABAP structure generated from the CurrentRole Complex Type)
*&      - If it doesn't exist, the Complex Type wasn't created properly
*&
*& =====================================================================
*& STEP 5: Re-activate EXECUTE_ACTION
*& =====================================================================
*&
*&   1. SE24 → ZCL_ZCOURSES_DPC_EXT → Methods tab
*&   2. Find /IWBEP/IF_MGW_APPL_SRV_RUNTIME~EXECUTE_ACTION
*&   3. Open the method source code
*&   4. Verify it compiles without errors (Ctrl+F2 → Check)
*&      - If it shows error on "zcl_zcourses_mpc=>ts_currentrole",
*&        the Complex Type wasn't created → go back to Step 1
*&   5. Activate (Ctrl+F3)
*&
*& =====================================================================
*& STEP 6: Clear Metadata Cache
*& =====================================================================
*&
*&   1. Transaction /IWFND/MAINT_SERVICE
*&   2. Find ZCOURSES_SRV → select it
*&   3. Click "ICF Node" → Clear Cache (or use /IWBEP/CACHE_CLEANUP)
*&   4. Also run: /IWFND/CACHE_CLEANUP (or /IWBEP/CACHE_CLEANUP)
*&
*&   5. Verify metadata by opening in browser:
*&      https://<host>:<port>/sap/opu/odata/sap/ZCOURSES_SRV/$metadata
*&      → Search for "getCurrentRole" — it MUST appear as a
*&        FunctionImport in the metadata XML
*&      → Search for "CurrentRole" — it MUST appear as a ComplexType
*&
*& =====================================================================
*& STEP 7: PFCG Role Activities — CRITICAL
*& =====================================================================
*&
*& Each PFCG role MUST have ALL required ACTVT values for Z_COURSES:
*&
*&   Z_COURSES_ADMIN role → Z_COURSES auth object:
*&     ACTVT: 01 (Create), 02 (Change), 03 (Display), 06 (Delete)
*&
*&   Z_COURSES_MANAGER role → Z_COURSES auth object:
*&     ACTVT: 01 (Create), 02 (Change), 03 (Display)
*&
*&   Z_COURSES_USER role → Z_COURSES auth object:
*&     ACTVT: 02 (Change), 03 (Display)
*&
*&   *** IMPORTANT: ACTVT 03 (Display) is REQUIRED for ALL roles ***
*&   Without ACTVT 03, the AUTHORITY-CHECK in GET_ENTITYSET fails,
*&   and the user sees an EMPTY table (no assignments shown).
*&
*&   If PFCG role only has ACTVT 06 (Delete) without 03 (Display),
*&   the getCurrentRole function will detect "Admin", but the
*&   GET_ENTITYSET for assignments/trainings will FAIL because
*&   it checks ACTVT '03'.
*&
*&   HOW TO FIX:
*&   1. PFCG → open role Z_COURSES_ADMIN (or whichever role)
*&   2. Authorizations tab → Change
*&   3. Find Z_COURSES auth object
*&   4. Double-click ACTVT field
*&   5. Add values: 01, 02, 03, 06
*&   6. Save → Generate profile
*&   7. If user was already assigned, do: User comparison (tab Users)
*&      or SU01 → user → Roles tab → compare
*&
*& =====================================================================
*& STEP 8: Verify End-to-End
*& =====================================================================
*&
*&   Test getCurrentRole:
*&   Browser → /sap/opu/odata/sap/ZCOURSES_SRV/getCurrentRole?$format=json
*&   Expected: {"d":{"getCurrentRole":{"Role":"Admin"}}}
*&   or:       {"d":{"Role":"Admin"}}
*&
*&   Test TrainingAssignments:
*&   Browser → /sap/opu/odata/sap/ZCOURSES_SRV/TrainingAssignments?$format=json
*&   Expected: {"d":{"results":[...]}}
*&
*&   If getCurrentRole returns 500 → Go back to Step 1
*&   If TrainingAssignments returns 500 → Check ACTVT 03 in PFCG role
*&   If TrainingAssignments returns empty results → Check ZCOURSE_ASGN
*&     table via SE16 (data might not exist)
*&
*& =====================================================================
*& TROUBLESHOOTING CHECKLIST
*& =====================================================================
*&
*& [ ] Complex Type "CurrentRole" exists in SEGW Data Model
*& [ ] Function Import "getCurrentRole" exists in SEGW (GET method)
*& [ ] Function Import "markCompleted" exists in SEGW (POST method)
*& [ ] MPC class regenerated (ts_currentrole structure exists)
*& [ ] EXECUTE_ACTION compiles and is activated in ZCL_ZCOURSES_DPC_EXT
*& [ ] $metadata shows getCurrentRole FunctionImport
*& [ ] PFCG role has ACTVT 01 + 02 + 03 + 06 for Z_COURSES
*& [ ] User profile is regenerated (PFCG → User comparison)
*& [ ] Metadata cache cleared (/IWFND/CACHE_CLEANUP)
*& [ ] Browser cache cleared (Ctrl+Shift+Delete)
*&
*& =====================================================================

# SIMPLIFIED S4HANA Deployment - 2 Tables Only

## Architecture Decision: Use Standard SAP Tables

### ✅ What We Use from Standard SAP

```
USER DATA (Already exists):
┌────────────────────────────────────────────┐
│ USR01   - User master record               │
│ USR02   - Logon data                       │
│ USR21   - Assignment to address management │
│ ADRP    - Person names                     │
│ ADR6    - Email addresses                  │
│ AGR_USERS - PFCG role assignments          │
└────────────────────────────────────────────┘

AUTHORIZATION (PFCG Roles):
┌────────────────────────────────────────────┐
│ Z_COURSES_ADMIN    - Full access           │
│ Z_COURSES_MANAGER  - Can assign trainings  │
│ Z_COURSES_USER     - View own assignments  │
└────────────────────────────────────────────┘
```

### ✅ What We Need Custom Tables For (Only 2!)

```
CUSTOM TABLES (Minimum required):
┌────────────────────────────────────────────┐
│ 1. ZSLC_TRAINING                           │
│    Why: External course data not in SAP    │
│    Contains: URLs, titles, descriptions    │
│                                            │
│ 2. ZSLC_ASSIGN                             │
│    Why: Track who is assigned what         │
│    Contains: Assignment tracking & status  │
└────────────────────────────────────────────┘
```

## Step 1: Create ONLY 2 Database Tables

### Table 1: ZSLC_TRAINING (Training Catalog)

```abap
@EndUserText.label : 'Training Courses Catalog'
@AbapCatalog.tableCategory : #TRANSPARENT
define table zslc_training {
  key client         : abap.clnt not null;
  key id             : sysuuid_x16 not null;
  url                : abap.string(1024);
  role               : abap.char(20);
  title              : abap.string(255);
  module             : abap.string(100);
  description        : abap.string(500);
  last_updated       : abap.dec(15,0);
  sap_help_link      : abap.string(1024);
  created_by         : sysuname;
  created_at         : abap.dec(15,0);
  modified_by        : sysuname;
  modified_at        : abap.dec(15,0);
}
```

### Table 2: ZSLC_ASSIGN (Training Assignments)

```abap
@EndUserText.label : 'Training Assignments'
@AbapCatalog.tableCategory : #TRANSPARENT
define table zslc_assign {
  key client           : abap.clnt not null;
  key id               : sysuuid_x16 not null;
  training_id          : sysuuid_x16;
  
  // SAP user (from USR21 - no custom user table!)
  user_id              : syuname;        // Standard SAP username
  user_name            : abap.string(80);  // Cached from ADRP
  user_email           : abap.string(241); // Cached from ADR6
  
  // Denormalized training fields
  title                : abap.string(255);
  role                 : abap.char(20);
  module               : abap.string(100);
  url                  : abap.string(1024);
  
  // Assignment tracking
  due_date             : abap.dec(15,0);
  status               : abap.char(20);
  completion_date      : abap.dec(15,0);
  
  // Assignment creator
  assigned_by          : sysuname;       // Manager who assigned
  assigned_by_name     : abap.string(80);
  
  // Audit fields
  created_by           : sysuname;
  created_at           : abap.dec(15,0);
  modified_by          : sysuname;
  modified_at          : abap.dec(15,0);
}
```

## Step 2: Create CDS Views

### Interface View: Z_I_COURSES_TRAININGS

```abap
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Trainings Interface View'
define view Z_I_COURSES_TRAININGS
  as select from zslc_training
{
  key id                  as Id,
      url                 as Url,
      role                as Role,
      title               as Title,
      module              as Module,
      description         as Description,
      last_updated        as LastUpdated,
      sap_help_link       as SapHelpLink,
      created_by          as CreatedBy,
      created_at          as CreatedAt,
      modified_by         as ModifiedBy,
      modified_at         as ModifiedAt
}
```

### Interface View: Z_I_COURSES_ASSIGNMENTS

```abap
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Assignments Interface View'
define view Z_I_COURSES_ASSIGNMENTS
  as select from zslc_assign
  association [0..1] to Z_I_COURSES_TRAININGS as _Training 
    on $projection.TrainingId = _Training.Id
{
  key id                  as Id,
      training_id         as TrainingId,
      user_id             as UserId,
      user_name           as UserName,
      user_email          as UserEmail,
      title               as Title,
      role                as Role,
      module              as Module,
      url                 as Url,
      due_date            as DueDate,
      status              as Status,
      completion_date     as CompletionDate,
      assigned_by         as AssignedBy,
      assigned_by_name    as AssignedByName,
      created_by          as CreatedBy,
      created_at          as CreatedAt,
      modified_by         as ModifiedBy,
      modified_at         as ModifiedAt,
      _Training
}
```

## Step 3: OData Service with User Lookup

### Z_COURSES_MAIN_SRV - DPC_EXT Implementation

```abap
CLASS zcl_z_courses_main_dpc_ext DEFINITION
  PUBLIC
  INHERITING FROM zcl_z_courses_main_dpc
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS /iwbep/if_mgw_appl_srv_runtime~create_entity REDEFINITION.
    METHODS /iwbep/if_mgw_appl_srv_runtime~get_entityset REDEFINITION.

  PRIVATE SECTION.
    METHODS get_user_details
      IMPORTING
        iv_username TYPE syuname
      EXPORTING
        ev_name     TYPE string
        ev_email    TYPE ad_smtpadr.

ENDCLASS.

CLASS zcl_z_courses_main_dpc_ext IMPLEMENTATION.

  METHOD get_user_details.
    " Get user name from ADRP
    SELECT SINGLE name_text
      FROM adrp
      INTO ev_name
      WHERE persnumber = ( SELECT persnumber FROM usr21 WHERE bname = iv_username ).

    " Get user email from ADR6
    SELECT SINGLE smtp_addr
      FROM adr6
      INTO ev_email
      WHERE addrnumber = ( SELECT addrnumber FROM usr21 WHERE bname = iv_username )
        AND flgdefault = 'X'.
  ENDMETHOD.

  METHOD /iwbep/if_mgw_appl_srv_runtime~create_entity.
    CASE iv_entity_name.
      WHEN 'AssignmentsSet'.
        " 1. Check authorization - must have Manager or Admin role
        AUTHORITY-CHECK OBJECT 'Z_COURSES'
          ID 'ACTVT' FIELD '01'
          ID 'ROLE' FIELD 'MANAGER'.
        
        IF sy-subrc <> 0.
          RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
            EXPORTING
              textid            = /iwbep/cx_mgw_busi_exception=>business_error
              message           = 'Not authorized to create assignments'
              http_status_code  = /iwbep/cx_mgw_busi_exception=>gcs_http_status_codes-forbidden.
        ENDIF.

        " 2. Read data from request (from Fiori form)
        io_data_provider->read_entry_data( IMPORTING es_data = er_entity ).

        " 3. Validate user exists in SAP
        DATA(lv_assignee) = er_entity-UserId.
        SELECT SINGLE bname FROM usr21 WHERE bname = @lv_assignee INTO @DATA(lv_valid).
        IF sy-subrc <> 0.
          RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
            EXPORTING message = |User { lv_assignee } not found in SAP system|.
        ENDIF.

        " 4. Get user details from standard tables
        DATA: lv_name TYPE string, lv_email TYPE ad_smtpadr.
        me->get_user_details(
          EXPORTING iv_username = lv_assignee
          IMPORTING ev_name = lv_name ev_email = lv_email ).

        " 5. Populate assignment record
        DATA: ls_assign TYPE zslc_assign.
        ls_assign-id = cl_system_uuid=>create_uuid_x16_static( ).
        ls_assign-training_id = er_entity-TrainingId.
        ls_assign-user_id = lv_assignee.
        ls_assign-user_name = lv_name.
        ls_assign-user_email = lv_email.
        ls_assign-due_date = er_entity-DueDate.
        ls_assign-status = 'Assigned'.
        ls_assign-assigned_by = sy-uname.
        
        " Get current user name
        me->get_user_details(
          EXPORTING iv_username = sy-uname
          IMPORTING ev_name = ls_assign-assigned_by_name ).

        " Get training details for denormalization
        SELECT SINGLE title, role, module, url
          FROM zslc_training
          WHERE id = @ls_assign-training_id
          INTO (@ls_assign-title, @ls_assign-role, @ls_assign-module, @ls_assign-url).

        " 6. Save to database - AUTOMATIC via OData!
        ls_assign-created_by = sy-uname.
        ls_assign-created_at = cl_abap_tstmp=>utclong2tstmp( utclong_current( ) ).
        
        INSERT zslc_assign FROM ls_assign.
        
        " 7. Return created entity to Fiori
        er_entity = CORRESPONDING #( ls_assign ).

      WHEN OTHERS.
        " Standard create handling
        super->/iwbep/if_mgw_appl_srv_runtime~create_entity(
          EXPORTING iv_entity_name = iv_entity_name
                    io_data_provider = io_data_provider ).
    ENDCASE.
  ENDMETHOD.

  METHOD /iwbep/if_mgw_appl_srv_runtime~get_entityset.
    CASE iv_entity_name.
      WHEN 'UsersValueHelpSet'.
        " Return all SAP users with Z_COURSES_USER role
        SELECT u~bname as userid,
               p~name_text as username,
               a~smtp_addr as email
          FROM usr21 AS u
          INNER JOIN adrp AS p ON u~persnumber = p~persnumber
          LEFT JOIN adr6 AS a ON u~addrnumber = a~addrnumber
          WHERE u~bname IN (
            SELECT bname FROM agr_users WHERE agr_name LIKE 'Z_COURSES%'
          )
          INTO TABLE @DATA(lt_users).
        
        et_entityset = CORRESPONDING #( lt_users ).

      WHEN OTHERS.
        " Standard query handling
        super->/iwbep/if_mgw_appl_srv_runtime~get_entityset(
          EXPORTING iv_entity_name = iv_entity_name ).
    ENDCASE.
  ENDMETHOD.

ENDCLASS.
```

## Key Points

### ✅ Fiori Frontend → ABAP Backend Flow

1. **User fills form in Fiori:**
   - Select training
   - Select user (from USR21 value help)
   - Set due date
   - Click "Save"

2. **OData POST request sent to ABAP**

3. **DPC_EXT CREATE_ENTITY method:**
   - Validates authorization (PFCG)
   - Validates user exists in USR21
   - Looks up user name from ADRP
   - Looks up user email from ADR6
   - **Inserts record into ZSLC_ASSIGN**
   - Returns success to Fiori

4. **Fiori refreshes list** - new assignment appears

### ✅ No Custom User Management Needed!

**Before (Overcomplicated):**
```
Custom ZSLC_USERS table
  ├─ Maintain users manually
  ├─ Sync with SAP users
  ├─ Manage manager relationships
  └─ Extra maintenance overhead
```

**After (SAP Standard):**
```
Use USR21, ADRP, ADR6 (already exists)
  ├─ Users already in SAP
  ├─ No sync needed
  ├─ No extra maintenance
  └─ Query standard tables on demand
```

### ✅ Authorization via PFCG Only

**No manager hierarchy table needed!**

- Admin: Z_COURSES_ADMIN → Can manage all
- Manager: Z_COURSES_MANAGER → Can create assignments
- User: Z_COURSES_USER → Can view own assignments

```abap
" Simple authorization check:
AUTHORITY-CHECK OBJECT 'Z_COURSES'
  ID 'ACTVT' FIELD '01'    " 01=Create
  ID 'ROLE' FIELD 'MANAGER'.

IF sy-subrc = 0.
  " User has manager role - allow assignment creation
ENDIF.
```

## Deployment Checklist

### Phase 1: ABAP Backend
- [ ] Create 2 tables: ZSLC_TRAINING, ZSLC_ASSIGN
- [ ] Create CDS views
- [ ] Create OData service with user lookup from USR21
- [ ] Create authorization object Z_COURSES
- [ ] Create 3 PFCG roles
- [ ] Test service in /IWFND/GW_CLIENT

### Phase 2: Fiori App
- [ ] Build: `npm run build`
- [ ] Deploy to BSP
- [ ] Configure FLP tile
- [ ] Test create assignment → Check ZSLC_ASSIGN table has new record

### Phase 3: Verify
- [ ] Admin can add trainings
- [ ] Manager can assign trainings to any SAP user
- [ ] User can see their assignments
- [ ] Status updates persist to database

---

**Result:** Minimal custom development, maximum use of SAP standard!

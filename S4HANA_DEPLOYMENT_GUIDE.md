# S4HANA ABAP Deployment Guide

## Overview
This guide is for SAP expert teams deploying the SAP Learning Courses Fiori application to S/4HANA on-premise ABAP stack.

## Prerequisites

### ABAP System Requirements
- S/4HANA 2020 or higher
- NetWeaver 7.50 SP08 or higher
- ABAP Development Tools (ADT) in Eclipse
- SAP Gateway enabled
- BSP application deployment authorization

### Required PFCG Roles
- `S_DEVELOP` - ABAP development
- `S_A.SYSTEM` - System administration
- `SAP_BC_WEBSERVICE_ADMIN` - OData service activation
- `S_RFC` - RFC administration

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│            S/4HANA ABAP System (On-Premise)         │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Frontend: BSP Application (Z_COURSES_UI)    │  │
│  │  - Fiori UI5 app served from BSP repository  │  │
│  │  - Embedded in Fiori Launchpad               │  │
│  └──────────────────────────────────────────────┘  │
│                      │                              │
│                      │ OData V4                     │
│                      ▼                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Backend: ABAP OData Services                │  │
│  │  - Z_COURSES_MAIN_SRV (CRUD operations)      │  │
│  │  - Z_COURSES_USERCTX_SRV (User context)      │  │
│  └──────────────────────────────────────────────┘  │
│                      │                              │
│                      ▼                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Data Layer: ABAP CDS Views                  │  │
│  │  - Z_I_COURSES_TRAININGS                     │  │
│  │  - Z_I_COURSES_ASSIGNMENTS                   │  │
│  │  - Z_I_COURSES_USERS                         │  │
│  └──────────────────────────────────────────────┘  │
│                      │                              │
│                      ▼                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Database Tables (HANA)                      │  │
│  │  - ZSLC_TRAINING                             │  │
│  │  - ZSLC_ASSIGN                               │  │
│  │  - ZSLC_USERS                                │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Step 1: Create ABAP Database Tables

### SE11 - Create Tables

```abap
*&---------------------------------------------------------------------*
*& Table ZSLC_TRAINING - Training Catalog
*&---------------------------------------------------------------------*
@EndUserText.label : 'SAP Learning Trainings'
@AbapCatalog.enhancementCategory : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #ALLOWED
define table zslc_training {
  key client         : abap.clnt not null;
  key id             : sysuuid_x16 not null;
  url                : abap.string(1024);
  role               : abap.char(20);
  title              : abap.string(255);
  module             : abap.string(100);
  description        : abap.string(500);
  last_updated       : abap.dec(15,0);  // Timestamp
  sap_help_link      : abap.string(1024);
  created_by         : sysuname;
  created_at         : abap.dec(15,0);
  modified_by        : sysuname;
  modified_at        : abap.dec(15,0);
}

*&---------------------------------------------------------------------*
*& Table ZSLC_ASSIGN - Training Assignments
*&---------------------------------------------------------------------*
@EndUserText.label : 'Training Assignments'
@AbapCatalog.enhancementCategory : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #ALLOWED
define table zslc_assign {
  key client           : abap.clnt not null;
  key id               : sysuuid_x16 not null;
  training_id          : sysuuid_x16;
  user_id              : sysuuid_x16;
  title                : abap.string(255);
  role                 : abap.char(20);
  module               : abap.string(100);
  url                  : abap.string(1024);
  due_date             : abap.dec(15,0);
  status               : abap.char(20);
  completion_date      : abap.dec(15,0);
  created_by           : sysuname;
  created_at           : abap.dec(15,0);
  modified_by          : sysuname;
  modified_at          : abap.dec(15,0);
}

*&---------------------------------------------------------------------*
*& Table ZSLC_USERS - User Management
*&---------------------------------------------------------------------*
@EndUserText.label : 'Course Users'
@AbapCatalog.enhancementCategory : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #ALLOWED
define table zslc_users {
  key client      : abap.clnt not null;
  key id          : sysuuid_x16 not null;
  name            : abap.string(255);
  email           : abap.string(255);
  role            : abap.char(20);  // Admin, Manager, User
  manager_id      : sysuuid_x16;
}
```

## Step 2: Create ABAP CDS Views

### Interface Views (Data Definition)

```abap
*&---------------------------------------------------------------------*
*& CDS View Z_I_COURSES_TRAININGS
*&---------------------------------------------------------------------*
@AbapCatalog.sqlViewName: 'ZICOURSESTRAIN'
@AbapCatalog.compiler.compareFilter: true
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

*&---------------------------------------------------------------------*
*& CDS View Z_I_COURSES_ASSIGNMENTS
*&---------------------------------------------------------------------*
@AbapCatalog.sqlViewName: 'ZICOURSESASSIGN'
@AbapCatalog.compiler.compareFilter: true
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Assignments Interface View'
define view Z_I_COURSES_ASSIGNMENTS
  as select from zslc_assign
  association [0..1] to Z_I_COURSES_TRAININGS as _Training on $projection.TrainingId = _Training.Id
  association [0..1] to Z_I_COURSES_USERS as _User on $projection.UserId = _User.Id
{
  key id                  as Id,
      training_id         as TrainingId,
      user_id             as UserId,
      title               as Title,
      role                as Role,
      module              as Module,
      url                 as Url,
      due_date            as DueDate,
      status              as Status,
      completion_date     as CompletionDate,
      created_by          as CreatedBy,
      created_at          as CreatedAt,
      modified_by         as ModifiedBy,
      modified_at         as ModifiedAt,
      _Training,
      _User
}

*&---------------------------------------------------------------------*
*& CDS View Z_I_COURSES_USERS
*&---------------------------------------------------------------------*
@AbapCatalog.sqlViewName: 'ZICOURSESUSERS'
@AbapCatalog.compiler.compareFilter: true
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Users Interface View'
define view Z_I_COURSES_USERS
  as select from zslc_users
  association [0..1] to Z_I_COURSES_USERS as _Manager on $projection.ManagerId = _Manager.Id
{
  key id                  as Id,
      name                as Name,
      email               as Email,
      role                as Role,
      manager_id          as ManagerId,
      _Manager
}
```

### Consumption Views (Projection)

```abap
*&---------------------------------------------------------------------*
*& CDS View Z_C_COURSES_TRAININGS
*&---------------------------------------------------------------------*
@EndUserText.label: 'Trainings Consumption View'
@AccessControl.authorizationCheck: #CHECK
@Metadata.allowExtensions: true
define view entity Z_C_COURSES_TRAININGS
  as projection on Z_I_COURSES_TRAININGS
{
  key Id,
      Url,
      Role,
      Title,
      Module,
      Description,
      LastUpdated,
      SapHelpLink,
      CreatedBy,
      CreatedAt,
      ModifiedBy,
      ModifiedAt
}
```

## Step 3: Create OData Services

### SEGW - Create OData V2 Service (Z_COURSES_MAIN_SRV)

1. **Create Service Project:**
   - Transaction: `SEGW`
   - Project Name: `Z_COURSES_MAIN`
   - Description: SAP Learning Courses Main Service

2. **Import CDS Views:**
   - Right-click Data Model → Import → CDS View
   - Import: Z_C_COURSES_TRAININGS, Z_C_COURSES_ASSIGNMENTS, Z_C_COURSES_USERS

3. **Generate Runtime Objects:**
   - Right-click project → Generate Runtime Objects
   - Model Provider Class: `ZCL_Z_COURSES_MAIN_MPC`
   - Data Provider Class: `ZCL_Z_COURSES_MAIN_DPC_EXT`

4. **Implement Custom Logic in DPC_EXT:**

```abap
CLASS zcl_z_courses_main_dpc_ext DEFINITION
  PUBLIC
  INHERITING FROM zcl_z_courses_main_dpc
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS /iwbep/if_mgw_appl_srv_runtime~create_entity REDEFINITION.
    METHODS /iwbep/if_mgw_appl_srv_runtime~update_entity REDEFINITION.
    METHODS /iwbep/if_mgw_appl_srv_runtime~delete_entity REDEFINITION.
    METHODS /iwbep/if_mgw_appl_srv_runtime~get_entityset REDEFINITION.

  PRIVATE SECTION.
    METHODS check_authorization
      IMPORTING
        iv_auth_object TYPE string
        iv_activity    TYPE string
      RAISING
        /iwbep/cx_mgw_busi_exception.

    METHODS get_current_user_role
      RETURNING
        VALUE(rv_role) TYPE string.

ENDCLASS.

CLASS zcl_z_courses_main_dpc_ext IMPLEMENTATION.

  METHOD get_current_user_role.
    " Check PFCG roles for current user
    DATA: lv_uname TYPE syuname.
    lv_uname = sy-uname.

    " Check Admin role
    AUTHORITY-CHECK OBJECT 'Z_COURSES'
      ID 'ACTVT' FIELD '01'  " Create
      ID 'ROLE' FIELD 'ADMIN'.
    IF sy-subrc = 0.
      rv_role = 'Admin'.
      RETURN.
    ENDIF.

    " Check Manager role
    AUTHORITY-CHECK OBJECT 'Z_COURSES'
      ID 'ACTVT' FIELD '02'  " Change
      ID 'ROLE' FIELD 'MANAGER'.
    IF sy-subrc = 0.
      rv_role = 'Manager'.
      RETURN.
    ENDIF.

    " Default to User
    rv_role = 'User'.
  ENDMETHOD.

  METHOD check_authorization.
    " Implement PFCG authorization check
    AUTHORITY-CHECK OBJECT 'Z_COURSES'
      ID 'ACTVT' FIELD iv_activity
      ID 'OBJECT' FIELD iv_auth_object.

    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid            = /iwbep/cx_mgw_busi_exception=>business_error
          message           = 'Not authorized for this operation'
          http_status_code  = /iwbep/cx_mgw_busi_exception=>gcs_http_status_codes-forbidden.
    ENDIF.
  ENDMETHOD.

  " Implement CRUD operations with authorization checks
  " ... (rest of implementation)

ENDCLASS.
```

### Create User Context Service (Z_COURSES_USERCTX_SRV)

```abap
*&---------------------------------------------------------------------*
*& Function Module Z_COURSES_GET_USER_CONTEXT
*&---------------------------------------------------------------------*
FUNCTION z_courses_get_user_context.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  EXPORTING
*"     VALUE(EV_USER_ID) TYPE  SYUNAME
*"     VALUE(EV_FULL_NAME) TYPE  STRING
*"     VALUE(EV_EMAIL) TYPE  AD_SMTPADR
*"     VALUE(EV_IS_ADMIN) TYPE  ABAP_BOOL
*"     VALUE(EV_IS_MANAGER) TYPE  ABAP_BOOL
*"     VALUE(EV_IS_END_USER) TYPE  ABAP_BOOL
*"----------------------------------------------------------------------
  DATA: lv_role TYPE string.

  ev_user_id = sy-uname.

  " Get user details from USR21/ADRP
  SELECT SINGLE name_text
    FROM adrp
    INTO ev_full_name
    WHERE persnumber = ( SELECT persnumber FROM usr21 WHERE bname = sy-uname ).

  " Get email from ADR6
  SELECT SINGLE smtp_addr
    FROM adr6
    INTO ev_email
    WHERE addrnumber = ( SELECT addrnumber FROM usr21 WHERE bname = sy-uname )
      AND flgdefault = 'X'.

  " Check PFCG roles
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ROLE' FIELD 'ADMIN'.
  ev_is_admin = COND #( WHEN sy-subrc = 0 THEN abap_true ELSE abap_false ).

  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ROLE' FIELD 'MANAGER'.
  ev_is_manager = COND #( WHEN sy-subrc = 0 THEN abap_true ELSE abap_false ).

  ev_is_end_user = abap_true.  " Everyone is at least end user

ENDFUNCTION.
```

## Step 4: Create Authorization Object

### SU21 - Create Authorization Object Z_COURSES

```
Authorization Object: Z_COURSES
Authorization Class: BC (Basis - Cross-Application Authorization Objects)

Fields:
1. ACTVT (Activity)
   - 01 = Create/Add
   - 02 = Change
   - 03 = Display
   - 06 = Delete
   
2. ROLE (Course Role)
   - ADMIN = Administrator
   - MANAGER = Manager
   - USER = End User
   
3. OBJECT (Business Object)
   - TRAINING = Training catalog
   - ASSIGNMENT = Training assignment
   - USER = User management
```

## Step 5: Create PFCG Roles

### PFCG - Role Maintenance

```
Role: Z_COURSES_ADMIN
Description: SAP Learning Courses - Administrator
Menu:
  - Transaction: /UI2/FLP (Fiori Launchpad)
  - Application: Z_COURSES_UI
Authorizations:
  - Z_COURSES: ACTVT=01,02,03,06 ROLE=ADMIN OBJECT=*

Role: Z_COURSES_MANAGER
Description: SAP Learning Courses - Manager
Menu:
  - Transaction: /UI2/FLP
  - Application: Z_COURSES_UI
Authorizations:
  - Z_COURSES: ACTVT=01,02,03 ROLE=MANAGER OBJECT=TRAINING,ASSIGNMENT

Role: Z_COURSES_USER
Description: SAP Learning Courses - End User
Menu:
  - Transaction: /UI2/FLP
  - Application: Z_COURSES_UI
Authorizations:
  - Z_COURSES: ACTVT=02,03 ROLE=USER OBJECT=ASSIGNMENT
```

## Step 6: Activate OData Services

### /IWFND/MAINT_SERVICE - Activate Services

1. **Add Service:**
   - System Alias: LOCAL
   - Technical Service Name: Z_COURSES_MAIN_SRV
   - Click "Add Service"

2. **ICF Node:** Automatically created at `/sap/opu/odata/sap/z_courses_main_srv`

3. **Test Service:**
   - Transaction: `/IWFND/GW_CLIENT`
   - URI: `/sap/opu/odata/sap/Z_COURSES_MAIN_SRV/$metadata`
   - Execute (F8)

4. **Repeat for Z_COURSES_USERCTX_SRV**

## Step 7: Deploy Fiori App to BSP

### Using SAP BAS / VSCode with Fiori Tools

```powershell
# In project root
cd app/z.sap.courses

# Build production artifacts
npm run build

# Deploy to ABAP
npm run deploy
```

### Configuration (ui5-deploy.yaml)

```yaml
specVersion: '3.1'
metadata:
  name: z.sap.courses
type: application
builder:
  customTasks:
    - name: deploy-to-abap
      afterTask: generateCachebusterInfo
      configuration:
        target:
          url: https://your-s4hana-host:44300
          client: 100
          scp: false
        credentials:
          username: <username>
          password: env:ABAP_PASSWORD
        app:
          name: Z_COURSES_UI
          package: ZSLC
          transport: <TRANSPORT_REQUEST>
          description: SAP Learning Courses UI
```

### Manual Deployment (SE80)

1. **Create BSP Application:**
   - Transaction: `SE80`
   - BSP Application: `Z_COURSES_UI`
   - Description: SAP Learning Courses

2. **Upload Dist Folder:**
   - Copy contents of `app/z.sap.courses/dist/` to BSP

3. **Activate BSP Application**

## Step 8: Configure Fiori Launchpad

### /UI2/FLPD_CUST - Launchpad Designer

1. **Create Catalog:**
   - Catalog ID: `Z_COURSES_CATALOG`
   - Title: SAP Learning Courses

2. **Create Tile:**
   - Tile Title: SAP Learning Courses
   - Semantic Object: `ZLEARNING`
   - Action: `display`
   - URL: `/sap/bc/ui5_ui5/sap/z_courses_ui/index.html`

3. **Assign to Group:**
   - Group ID: `Z_LEARNING_GROUP`
   - Group Title: Learning & Development

4. **Assign to Roles:**
   - Z_COURSES_ADMIN
   - Z_COURSES_MANAGER
   - Z_COURSES_USER

## Step 9: Testing

### Test Checklist

- [ ] OData services accessible via `/IWFND/GW_CLIENT`
- [ ] Metadata loads: `$metadata` endpoint
- [ ] EntitySets return data: `TrainingsSet`, `AssignmentsSet`, `UsersSet`
- [ ] PFCG roles assigned to test users
- [ ] Authorization checks work (Admin can CRUD, User can only read/update own)
- [ ] BSP application accessible in browser
- [ ] Fiori app loads without errors (F12 console)
- [ ] User context service returns correct role
- [ ] UI adapts based on user role (Admin sees Users menu, User doesn't)
- [ ] CRUD operations work via UI
- [ ] Tile appears in Fiori Launchpad for authorized users

### Test Users

Create test users with different roles:
```
SU01 - User Maintenance
User: TESTADMIN, Role: Z_COURSES_ADMIN
User: TESTMGR, Role: Z_COURSES_MANAGER  
User: TESTUSER, Role: Z_COURSES_USER
```

## Step 10: Go-Live Checklist

- [ ] All database tables activated and transported
- [ ] All CDS views activated and transported
- [ ] OData services activated in production
- [ ] Authorization object created in production
- [ ] PFCG roles created and assigned
- [ ] BSP application deployed to production
- [ ] Fiori Launchpad tiles configured
- [ ] End-user documentation prepared
- [ ] Admin training completed
- [ ] Monitoring configured (SM21, SLG1)
- [ ] Backup and recovery procedures documented

## Troubleshooting

### Common Issues

**Issue: OData service not found (404)**
- Check service activation in `/IWFND/MAINT_SERVICE`
- Verify ICF node active in `SICF`
- Check system alias configuration

**Issue: 403 Forbidden**
- Verify PFCG roles assigned to user
- Check authorization object Z_COURSES exists
- Test AUTHORITY-CHECK in SE37

**Issue: BSP not loading**
- Check BSP application name matches manifest.json
- Verify all files uploaded and activated
- Check browser console for errors

**Issue: User context not working**
- Test function module Z_COURSES_GET_USER_CONTEXT in SE37
- Verify user has USR21/ADRP entries
- Check email in ADR6

## Support

For SAP expert team support:
- SAP Note: Search for "Fiori deployment" on SAP Support Portal
- Community: SAP Community (community.sap.com)
- OSS: Raise ticket under component BC-FES-GAF (Gateway & Fiori)

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-05  
**Target System:** S/4HANA 2020+

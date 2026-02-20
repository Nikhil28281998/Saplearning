*& Method: TRAININGASSIGNME_CREATE_ENTITY  (SEGW may truncate the name)
*& Creates a new training assignment in ZCOURSE_ASGN via OData POST
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& IMPORTANT: Check the exact method name in SE24 → ZCL_ZCOURSES_DPC_EXT
*&   Search for method containing "TRAININGASSIGN" - SEGW may truncate it.
*&   Common names: TRAININGASSIGNME_CREATE_ENTITY or TRAININGASSIG_CREATE_ENTITY
*&
*& PREREQUISITE: DB Table ZCOURSE_ASGN must exist with these fields:
*&   ID            CHAR 36  (UUID key)
*&   TRAINING_ID   CHAR 36  (FK to ZCOURSES-ID)
*&   TITLE         CHAR 255
*&   ROLE          CHAR 20
*&   SAP_MODULE    CHAR 20
*&   URL           CHAR 500
*&   STATUS        CHAR 20  (Assigned / In Progress / Completed)
*&   USER_ID       CHAR 12  (SAP user name)
*&   USER_NAME     CHAR 80
*&   USER_EMAIL    CHAR 241
*&   DUE_DATE      DATS
*&   COMPLETION_DT DATS
*&   ASSIGNED_BY   CHAR 12  (manager who assigned)
*&   ASSIGNED_BY_N CHAR 80  (manager display name)
*&   MANAGER_SORT2 CHAR 20  (ADRP.SORT2 of assignee - manager name from SU01 search term 2)
*&   CREATED_AT    DATS
*&
*& To create the table: SE11 → Create Table → ZCOURSE_ASGN
*&   Delivery Class: A (Application Table)
*&   Data Class: APPL0
*&   Size Category: 0
*&---------------------------------------------------------------------*

METHOD trainingassignme_create_entity.

* -- Local variables (classic ABAP - no inline DATA) ------------------
  DATA: ls_entity   TYPE zcl_zcourses_mpc=>ts_trainingassignment,
        ls_asgn     TYPE zcourse_asgn,
        lv_guid     TYPE sysuuid_c36,
        lv_dup_id   TYPE char36,
        lv_errmsg   TYPE bapi_msg,
        lv_msg      TYPE bapi_msg,
        lv_ftype    TYPE c,
        lv_ts_conv  TYPE timestamp,
        lv_time_ini TYPE t,
        lx_root     TYPE REF TO cx_root,
        lx_busi     TYPE REF TO /iwbep/cx_mgw_busi_exception.

* -- Wrap everything in TRY/CATCH to prevent short dumps (500 errors)
  TRY.

* -- Authorization check: Create (ACTVT 01) -------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '01'.
  IF sy-subrc <> 0.
    MESSAGE e001(zcourses) WITH 'create' 'assignments' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- Read incoming OData payload into entity structure ----------------
  io_data_provider->read_entry_data( IMPORTING es_data = ls_entity ).

* -- Validate required fields ----------------------------------------
  IF ls_entity-trainingid IS INITIAL.
    MESSAGE e002(zcourses) WITH 'TrainingId' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

  IF ls_entity-userid IS INITIAL.
    MESSAGE e002(zcourses) WITH 'UserId' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- Validate UserId format: uppercase alphanumeric + underscore, 1-12 chars
*    Must match @assert.format: '^[A-Z0-9_]{1,12}$' from schema.cds
  IF NOT ls_entity-userid CO 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_ '.
    MESSAGE e006(zcourses) INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- WF-2 FIX: Duplicate assignment check ----------------------------
*   Prevent assigning the same training to the same user when active
  SELECT SINGLE id FROM zcourse_asgn INTO lv_dup_id
    WHERE training_id = ls_entity-trainingid
      AND user_id     = ls_entity-userid
      AND status     <> 'Completed'.
  IF sy-subrc = 0.
    MESSAGE e005(zcourses) INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- PG-2: DueDate validation — must not be in the past -------------
  IF ls_entity-duedate IS NOT INITIAL.
    DATA: lv_due_date_chk TYPE d,
          lv_ftype_chk    TYPE c,
          lv_ts_chk       TYPE timestamp,
          lv_time_chk     TYPE t.
    DESCRIBE FIELD ls_entity-duedate TYPE lv_ftype_chk.
    IF lv_ftype_chk = 'P'.
      lv_ts_chk = ls_entity-duedate.
      CONVERT TIME STAMP lv_ts_chk TIME ZONE 'UTC'
        INTO DATE lv_due_date_chk TIME lv_time_chk.
    ELSE.
      lv_due_date_chk = ls_entity-duedate.
    ENDIF.
    IF lv_due_date_chk < sy-datum.
      MESSAGE e011(zcourses) INTO lv_msg.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid  = /iwbep/cx_mgw_busi_exception=>business_error
          message = lv_msg.
    ENDIF.
  ENDIF.

* -- Generate UUID for the new assignment ----------------------------
  IF ls_entity-id IS INITIAL.
    TRY.
        lv_guid = cl_system_uuid=>create_uuid_c36_static( ).
      CATCH cx_uuid_error.
*       Fallback: use timestamp-based ID
        CONCATENATE sy-datum sy-uzeit sy-uname INTO lv_guid.
    ENDTRY.
    ls_entity-id = lv_guid.
  ENDIF.

* -- Set default status if not provided ------------------------------
  IF ls_entity-status IS INITIAL.
    ls_entity-status = 'Assigned'.
  ENDIF.

* -- Map OData entity to database structure --------------------------
  CLEAR ls_asgn.
  ls_asgn-id            = ls_entity-id.
  ls_asgn-training_id   = ls_entity-trainingid.
  ls_asgn-title         = ls_entity-title.
  ls_asgn-role          = ls_entity-role.
  ls_asgn-sap_module    = ls_entity-sapmodule.
  ls_asgn-url           = ls_entity-url.
  ls_asgn-status        = ls_entity-status.
  ls_asgn-user_id       = ls_entity-userid.
  ls_asgn-user_name     = ls_entity-username.
  ls_asgn-user_email    = ls_entity-useremail.
* -- Set AssignedBy to current user (server-side, not from payload) --
  ls_asgn-assigned_by   = sy-uname.
* -- Look up AssignedBy display name from ADRP ----------------------
  DATA: lv_asgn_persnumber TYPE ad_persnum,
        ls_asgn_adrp       TYPE adrp.
  SELECT SINGLE persnumber FROM usr21
    INTO lv_asgn_persnumber
    WHERE bname = sy-uname.
  IF sy-subrc = 0 AND lv_asgn_persnumber IS NOT INITIAL.
    SELECT SINGLE name_first name_last FROM adrp
      INTO CORRESPONDING FIELDS OF ls_asgn_adrp
      WHERE persnumber = lv_asgn_persnumber.
    IF sy-subrc = 0.
      CONCATENATE ls_asgn_adrp-name_first ls_asgn_adrp-name_last
        INTO ls_asgn-assigned_by_n SEPARATED BY space.
      CONDENSE ls_asgn-assigned_by_n.
    ENDIF.
  ENDIF.
  IF ls_asgn-assigned_by_n IS INITIAL.
    ls_asgn-assigned_by_n = sy-uname.
  ENDIF.

* -- Populate ManagerSort2 with the assigning manager's user ID ------
*    Stores sy-uname (the manager who assigns the training)
*    so we can filter "show assignments made by this manager"
  ls_asgn-manager_sort2 = sy-uname.

  ls_asgn-created_at    = sy-datum.

* -- Map DueDate if provided (safe conversion across MPC types) ------
  DESCRIBE FIELD ls_entity-duedate TYPE lv_ftype.
  IF ls_entity-duedate IS NOT INITIAL.
    IF lv_ftype = 'P'.
*     MPC uses TIMESTAMP — convert to DATS via CONVERT TIME STAMP
      lv_ts_conv = ls_entity-duedate.
      CONVERT TIME STAMP lv_ts_conv TIME ZONE 'UTC'
        INTO DATE ls_asgn-due_date TIME lv_time_ini.
    ELSE.
*     MPC uses DATS/CHAR — direct assignment is safe
      ls_asgn-due_date = ls_entity-duedate.
    ENDIF.
  ENDIF.

* -- Insert into database table ZCOURSE_ASGN ------------------------
*   Note: Do NOT call COMMIT WORK inside DPC methods.
*   The SAP Gateway framework manages the transaction (LUW).
  INSERT zcourse_asgn FROM ls_asgn.

  IF sy-subrc = 0.
*   -- Fill response entity with assigned-by info --------------------
    ls_entity-assignedby     = ls_asgn-assigned_by.
    ls_entity-assignedbyname = ls_asgn-assigned_by_n.
    ls_entity-manager        = ls_asgn-manager_sort2.
    er_entity = ls_entity.
  ELSE.
    MESSAGE e004(zcourses) WITH 'create' 'assignment' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- Catch-all: convert any unhandled exception to business exception
  CATCH /iwbep/cx_mgw_busi_exception INTO lx_busi.
    RAISE EXCEPTION lx_busi.  " re-raise business exceptions as-is
  CATCH cx_root INTO lx_root.
    lv_errmsg = lx_root->get_text( ).
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_errmsg.
  ENDTRY.

ENDMETHOD.

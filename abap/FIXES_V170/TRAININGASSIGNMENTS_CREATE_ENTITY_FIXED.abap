*& Method: TRAININGASSIGNMENTS_CREATE_ENTITY (FIXED v1.7.0)
*& Creates a new assignment in ZCOURSE_ASGN via OData POST
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& FIXES APPLIED:
*&   - Audit #3: Added AUTHORITY-CHECK for Z_COURSES authorization object
*&   - Audit #4: Added duplicate assignment check (prevents same user+training twice)
*&---------------------------------------------------------------------*
METHOD trainingassignments_create_entity.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: ls_asgn    TYPE zcourse_asgn,
        ls_entity  TYPE zcl_zcourses_mpc=>ts_trainingassignment,
        lv_guid    TYPE sysuuid_c36,
        lv_check   TYPE char36,
        lv_subrc   TYPE sysubrc.

* -- Read incoming OData payload into entity structure ----------------
  io_data_provider->read_entry_data( IMPORTING es_data = ls_entity ).

* -- FIX #3: Authorization check (PFCG role enforcement) -------------
*   Only Admin and Manager roles can create assignments.
*   Authorization object Z_COURSES in SU21 with:
*     ACTVT (Activity): 01=Create, 02=Update, 03=Display, 06=Delete
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '01'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Not authorized to create training assignments'.
  ENDIF.

* -- Validate required fields ----------------------------------------
  IF ls_entity-trainingid IS INITIAL OR ls_entity-userid IS INITIAL.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'TrainingId and UserId are required'.
  ENDIF.

* -- FIX #4: Duplicate assignment check ------------------------------
*   Prevent assigning the same training to the same user when active
  SELECT SINGLE id FROM zcourse_asgn INTO lv_check
    WHERE training_id = ls_entity-trainingid
      AND user_id     = ls_entity-userid
      AND status     <> 'Completed'.

  IF sy-subrc = 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'User already has an active assignment for this training'.
  ENDIF.

* -- Generate UUID if caller did not provide one ---------------------
  IF ls_entity-id IS INITIAL.
    TRY.
        lv_guid = cl_system_uuid=>create_uuid_c36_static( ).
      CATCH cx_uuid_error.
        CONCATENATE sy-datum sy-uzeit sy-uname INTO lv_guid.
    ENDTRY.
    ls_entity-id = lv_guid.
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
  ls_asgn-due_date      = ls_entity-duedate.
  ls_asgn-completion_dt = ls_entity-completiondate.

* -- Insert into database table ZCOURSE_ASGN ------------------------
  INSERT zcourse_asgn FROM ls_asgn.

  IF sy-subrc = 0.
    er_entity = ls_entity.
  ELSE.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Failed to create assignment - record may already exist'.
  ENDIF.

ENDMETHOD.

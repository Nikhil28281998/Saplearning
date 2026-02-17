*&---------------------------------------------------------------------*
*& Method: TRAININGASSIGNME_UPDATE_ENTITY  (SEGW may truncate the name)
*& Updates an existing training assignment in ZCOURSE_ASGN (partial update)
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& IMPORTANT: Check the exact method name in SE24 → ZCL_ZCOURSES_DPC_EXT
*&   Search for method containing "TRAININGASSIGN" and "UPDATE"
*&
*& Supports partial update (PATCH): only fields that are provided
*& in the OData payload are overwritten. Other fields remain unchanged.
*&
*& PREREQUISITE: DB Table ZCOURSE_ASGN must exist (see CREATE_ENTITY file)
*&---------------------------------------------------------------------*

METHOD trainingassignme_update_entity.

* -- Local variables (classic ABAP - no inline DATA) ------------------
  DATA: ls_entity   TYPE zcl_zcourses_mpc=>ts_trainingassignment,
        ls_asgn     TYPE zcourse_asgn,
        ls_key      TYPE /iwbep/s_mgw_name_value_pair,
        lv_id       TYPE char36,
        lv_ftype    TYPE c,
        lv_ts_conv  TYPE timestamp,
        lv_time_ini TYPE t,
        lv_errmsg   TYPE bapi_msg,
        lx_root     TYPE REF TO cx_root,
        lx_busi     TYPE REF TO /iwbep/cx_mgw_busi_exception.

  TRY.

* -- Authorization check: Change (ACTVT 02) --------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '02'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'No authorization to update assignments'.
  ENDIF.

* -- Read key from OData URI path ------------------------------------
  READ TABLE it_key_tab WITH KEY name = 'Id' INTO ls_key.
  IF sy-subrc <> 0.
    READ TABLE it_key_tab WITH KEY name = 'ID' INTO ls_key.
  ENDIF.

  IF sy-subrc = 0.
    lv_id = ls_key-value.
  ELSE.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Assignment ID is required'.
  ENDIF.

* -- Fetch existing record -------------------------------------------
  SELECT SINGLE * FROM zcourse_asgn INTO ls_asgn
    WHERE id = lv_id.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Assignment not found'.
  ENDIF.

* -- Read incoming update payload ------------------------------------
  io_data_provider->read_entry_data( IMPORTING es_data = ls_entity ).

* -- Merge: only overwrite fields that were actually provided --------
*   (IS NOT INITIAL check = partial update / PATCH support)
  IF ls_entity-status IS NOT INITIAL.
    ls_asgn-status = ls_entity-status.
  ENDIF.
  IF ls_entity-duedate IS NOT INITIAL.
    DESCRIBE FIELD ls_entity-duedate TYPE lv_ftype.
    IF lv_ftype = 'P'.
      lv_ts_conv = ls_entity-duedate.
      CONVERT TIME STAMP lv_ts_conv TIME ZONE 'UTC'
        INTO DATE ls_asgn-due_date TIME lv_time_ini.
    ELSE.
      ls_asgn-due_date = ls_entity-duedate.
    ENDIF.
  ENDIF.
  IF ls_entity-completiondate IS NOT INITIAL.
    DESCRIBE FIELD ls_entity-completiondate TYPE lv_ftype.
    IF lv_ftype = 'P'.
      lv_ts_conv = ls_entity-completiondate.
      CONVERT TIME STAMP lv_ts_conv TIME ZONE 'UTC'
        INTO DATE ls_asgn-completion_dt TIME lv_time_ini.
    ELSE.
      ls_asgn-completion_dt = ls_entity-completiondate.
    ENDIF.
  ENDIF.
  IF ls_entity-username IS NOT INITIAL.
    ls_asgn-user_name = ls_entity-username.
  ENDIF.
  IF ls_entity-useremail IS NOT INITIAL.
    ls_asgn-user_email = ls_entity-useremail.
  ENDIF.

* -- Write back to database ------------------------------------------
*   Note: No COMMIT WORK - Gateway framework manages the LUW.
  MODIFY zcourse_asgn FROM ls_asgn.

  IF sy-subrc = 0.
*   Return updated entity to caller
    CLEAR ls_entity.
    ls_entity-id              = ls_asgn-id.
    ls_entity-trainingid      = ls_asgn-training_id.
    ls_entity-title           = ls_asgn-title.
    ls_entity-role            = ls_asgn-role.
    ls_entity-sapmodule       = ls_asgn-sap_module.
    ls_entity-url             = ls_asgn-url.
    ls_entity-status          = ls_asgn-status.
    ls_entity-userid          = ls_asgn-user_id.
    ls_entity-username        = ls_asgn-user_name.
    ls_entity-useremail       = ls_asgn-user_email.
*   -- Safe date conversion: DATS → entity (handles TIMESTAMP MPC) --
    DESCRIBE FIELD ls_entity-duedate TYPE lv_ftype.
    IF ls_asgn-due_date IS NOT INITIAL.
      IF lv_ftype = 'P'.
        CONVERT DATE ls_asgn-due_date TIME lv_time_ini
          INTO TIME STAMP lv_ts_conv TIME ZONE 'UTC'.
        IF sy-subrc = 0.
          ls_entity-duedate = lv_ts_conv.
        ENDIF.
      ELSE.
        ls_entity-duedate = ls_asgn-due_date.
      ENDIF.
    ENDIF.
    DESCRIBE FIELD ls_entity-completiondate TYPE lv_ftype.
    IF ls_asgn-completion_dt IS NOT INITIAL.
      IF lv_ftype = 'P'.
        CONVERT DATE ls_asgn-completion_dt TIME lv_time_ini
          INTO TIME STAMP lv_ts_conv TIME ZONE 'UTC'.
        IF sy-subrc = 0.
          ls_entity-completiondate = lv_ts_conv.
        ENDIF.
      ELSE.
        ls_entity-completiondate = ls_asgn-completion_dt.
      ENDIF.
    ENDIF.
    ls_entity-assignedby      = ls_asgn-assigned_by.
    ls_entity-assignedbyname  = ls_asgn-assigned_by_n.

    er_entity = ls_entity.
  ELSE.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Failed to update assignment'.
  ENDIF.

* -- Catch-all: prevent short dumps (500 errors) --------------------
  CATCH /iwbep/cx_mgw_busi_exception INTO lx_busi.
    RAISE EXCEPTION lx_busi.
  CATCH cx_root INTO lx_root.
    lv_errmsg = lx_root->get_text( ).
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_errmsg.
  ENDTRY.

ENDMETHOD.

*&---------------------------------------------------------------------*
*& Method: TRAININGASSIGNME_GET_ENTITY  (SEGW may truncate the name)
*& Returns a single training assignment by ID key
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& IMPORTANT: Check the exact method name in SE24 → ZCL_ZCOURSES_DPC_EXT
*&   Search for method containing "TRAININGASSIGN" and "GET_ENTITY"
*&   (NOT GET_ENTITYSET — that is the list method)
*&
*& PREREQUISITE: DB Table ZCOURSE_ASGN must exist (see CREATE_ENTITY file)
*&---------------------------------------------------------------------*

METHOD trainingassignme_get_entity.

* -- Local variables (classic ABAP - no inline DATA) ------------------
  DATA: ls_key      TYPE /iwbep/s_mgw_name_value_pair,
        ls_asgn     TYPE zcourse_asgn,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_trainingassignment,
        lv_id       TYPE char36,
        lv_ftype    TYPE c,
        lv_ts_conv  TYPE timestamp,
        lv_time_ini TYPE t,
        lv_errmsg   TYPE bapi_msg,
        lx_root     TYPE REF TO cx_root,
        lx_busi     TYPE REF TO /iwbep/cx_mgw_busi_exception.

  TRY.

* -- Authorization check: Display (ACTVT 03) or any higher privilege ---
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '03'.
  IF sy-subrc <> 0.
    AUTHORITY-CHECK OBJECT 'Z_COURSES'
      ID 'ACTVT' FIELD '06'.
    IF sy-subrc <> 0.
      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '01'.
      IF sy-subrc <> 0.
        AUTHORITY-CHECK OBJECT 'Z_COURSES'
          ID 'ACTVT' FIELD '02'.
        IF sy-subrc <> 0.
          RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
            EXPORTING
              textid  = /iwbep/cx_mgw_busi_exception=>business_error
              message = 'No authorization to read assignments (need ACTVT 03, 02, 01, or 06 in Z_COURSES)'.
        ENDIF.
      ENDIF.
    ENDIF.
  ENDIF.

* -- Read key from OData URI path ------------------------------------
  READ TABLE it_key_tab WITH KEY name = 'Id' INTO ls_key.
  IF sy-subrc <> 0.
    READ TABLE it_key_tab WITH KEY name = 'ID' INTO ls_key.
  ENDIF.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Assignment ID is required in the request URI'.
  ENDIF.

  lv_id = ls_key-value.

* -- Fetch from database ---------------------------------------------
  SELECT SINGLE * FROM zcourse_asgn INTO ls_asgn
    WHERE id = lv_id.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Assignment not found'.
  ENDIF.

* -- Map database record to OData entity structure -------------------
  ls_entity-id              = ls_asgn-id.
  ls_entity-trainingid      = ls_asgn-training_id.
  ls_entity-title           = ls_asgn-title.
  ls_entity-role            = ls_asgn-role.
  ls_entity-topic           = ls_asgn-topic.
  ls_entity-sapmodule       = ls_asgn-sap_module.
  ls_entity-url             = ls_asgn-url.
  ls_entity-status          = ls_asgn-status.
  ls_entity-userid          = ls_asgn-user_id.
  ls_entity-username        = ls_asgn-user_name.
  ls_entity-useremail       = ls_asgn-user_email.
* -- Safe date conversion: DATS → entity (handles TIMESTAMP MPC) ----
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

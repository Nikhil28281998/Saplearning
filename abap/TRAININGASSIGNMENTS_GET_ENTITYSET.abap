*& Method: TRAININGASSIGNME_GET_ENTITYSET  (SEGW may truncate the name)
*& Returns training assignments with optional UserId/Status filters
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& IMPORTANT: Check the exact method name in SE24 → ZCL_ZCOURSES_DPC_EXT
*&   Search for method containing "TRAININGASSIGN" and "GET_ENTITYSET"
*&
*& PREREQUISITE: DB Table ZCOURSE_ASGN must exist (see CREATE_ENTITY file)
*&---------------------------------------------------------------------*

METHOD trainingassignme_get_entityset.

* -- Local variables (classic ABAP - no inline DATA) ------------------
  DATA: lt_asgn        TYPE TABLE OF zcourse_asgn,
        ls_asgn        TYPE zcourse_asgn,
        ls_entity      TYPE zcl_zcourses_mpc=>ts_trainingassignment,
        ls_filter_uid  TYPE /iwbep/s_mgw_select_option,
        ls_filter_stat TYPE /iwbep/s_mgw_select_option,
        ls_uid_opt     TYPE /iwbep/s_cod_select_option,
        ls_stat_opt    TYPE /iwbep/s_cod_select_option,
        lv_user_id     TYPE char12,
        lv_status      TYPE char20,
        lv_skip        TYPE i,
        lv_top         TYPE i.

* -- Authorization check: Display (ACTVT 03) -------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '03'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'No authorization to read assignments'.
  ENDIF.

* -- Read filter: UserId ---------------------------------------------
  READ TABLE it_filter_select_options
    WITH KEY property = 'UserId'
    INTO ls_filter_uid.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'USER_ID'
      INTO ls_filter_uid.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter_uid-select_options INDEX 1
      INTO ls_uid_opt.
    IF sy-subrc = 0.
      lv_user_id = ls_uid_opt-low.
    ENDIF.
  ENDIF.

* -- Read filter: Status ---------------------------------------------
  READ TABLE it_filter_select_options
    WITH KEY property = 'Status'
    INTO ls_filter_stat.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'STATUS'
      INTO ls_filter_stat.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter_stat-select_options INDEX 1
      INTO ls_stat_opt.
    IF sy-subrc = 0.
      lv_status = ls_stat_opt-low.
    ENDIF.
  ENDIF.

* -- Query ZCOURSE_ASGN with dynamic WHERE ---------------------------
  IF lv_user_id IS NOT INITIAL AND lv_status IS NOT INITIAL.
    SELECT * FROM zcourse_asgn INTO TABLE lt_asgn
      WHERE user_id = lv_user_id
        AND status  = lv_status
      ORDER BY created_at DESCENDING.
  ELSEIF lv_user_id IS NOT INITIAL.
    SELECT * FROM zcourse_asgn INTO TABLE lt_asgn
      WHERE user_id = lv_user_id
      ORDER BY created_at DESCENDING.
  ELSEIF lv_status IS NOT INITIAL.
    SELECT * FROM zcourse_asgn INTO TABLE lt_asgn
      WHERE status = lv_status
      ORDER BY created_at DESCENDING.
  ELSE.
    SELECT * FROM zcourse_asgn INTO TABLE lt_asgn
      ORDER BY created_at DESCENDING.
  ENDIF.

* -- Pagination: $skip / $top ----------------------------------------
  lv_skip = is_paging-skip.
  lv_top  = is_paging-top.

  IF lv_skip > 0.
    IF lv_skip >= lines( lt_asgn ).
      CLEAR lt_asgn.
    ELSE.
      DELETE lt_asgn FROM 1 TO lv_skip.
    ENDIF.
  ENDIF.

  IF lv_top > 0 AND lv_top < lines( lt_asgn ).
    DELETE lt_asgn FROM ( lv_top + 1 ).
  ENDIF.

* -- Map database records to OData entity structure -------------------
  LOOP AT lt_asgn INTO ls_asgn.
    CLEAR ls_entity.
    ls_entity-id            = ls_asgn-id.
    ls_entity-training_id   = ls_asgn-training_id.
    ls_entity-title         = ls_asgn-title.
    ls_entity-role          = ls_asgn-role.
    ls_entity-sap_module    = ls_asgn-sap_module.
    ls_entity-url           = ls_asgn-url.
    ls_entity-status        = ls_asgn-status.
    ls_entity-user_id       = ls_asgn-user_id.
    ls_entity-user_name     = ls_asgn-user_name.
    ls_entity-user_email    = ls_asgn-user_email.
    ls_entity-due_date      = ls_asgn-due_date.
    ls_entity-completion_date = ls_asgn-completion_dt.
    ls_entity-assigned_by     = ls_asgn-assigned_by.
    ls_entity-assigned_by_name = ls_asgn-assigned_by_n.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

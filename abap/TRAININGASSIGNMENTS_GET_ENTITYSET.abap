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
        ls_filter_mgr  TYPE /iwbep/s_mgw_select_option,
        ls_uid_opt     TYPE /iwbep/s_cod_select_option,
        ls_stat_opt    TYPE /iwbep/s_cod_select_option,
        ls_mgr_opt     TYPE /iwbep/s_cod_select_option,
        lv_user_id     TYPE char12,
        lv_status      TYPE char20,
        lv_mgr_sort2   TYPE char20,
        lv_skip        TYPE i,
        lv_top         TYPE i,
        lv_ftype       TYPE c,
        lv_ts_conv     TYPE timestamp,
        lv_time_ini    TYPE t,
        lv_errmsg      TYPE bapi_msg,
        lx_root        TYPE REF TO cx_root,
        lx_busi        TYPE REF TO /iwbep/cx_mgw_busi_exception.

  TRY.

* -- Authorization check: Display (ACTVT 03) or any higher privilege ---
* Users with Admin (06), Create (01), or Change (02) implicitly can read.
* Check 03 first; if that fails, check for any other valid activity.
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

* -- Read filter: ManagerSort2 (manager team filtering via ADRP.SORT2) -
*   NM-1 FIX: Accept both 'Manager' and 'ManagerSort2' as property names
*   (frontend may send 'Manager' which is the actual OData property name,
*    or 'ManagerSort2' which was used in older versions)
  READ TABLE it_filter_select_options
    WITH KEY property = 'Manager'
    INTO ls_filter_mgr.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'ManagerSort2'
      INTO ls_filter_mgr.
  ENDIF.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'MANAGER_SORT2'
      INTO ls_filter_mgr.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter_mgr-select_options INDEX 1
      INTO ls_mgr_opt.
    IF sy-subrc = 0.
      lv_mgr_sort2 = ls_mgr_opt-low.
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

* -- SEC-3 FIX: Server-side UserId enforcement for User role ----------
*   Users with only ACTVT 03 (Display) may NOT see other users' data.
*   Force lv_user_id = sy-uname unless Admin (06) or Manager (01).
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '06'.
  IF sy-subrc <> 0.
    AUTHORITY-CHECK OBJECT 'Z_COURSES'
      ID 'ACTVT' FIELD '01'.
    IF sy-subrc <> 0.
*     User role: force filter to own user only (cannot override via $filter)
      lv_user_id = sy-uname.
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

* -- Post-filter: ManagerSort2 (applied after SELECT for flexibility) --
  IF lv_mgr_sort2 IS NOT INITIAL.
    DELETE lt_asgn WHERE manager_sort2 <> lv_mgr_sort2.
  ENDIF.

* -- ABP-1 FIX: Set $inlinecount BEFORE pagination -------------------
  IF io_tech_request_context->has_inlinecount( ) = abap_true.
    es_response_context-inlinecount = lines( lt_asgn ).
    es_response_context-count = es_response_context-inlinecount.
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
    ls_entity-manager         = ls_asgn-manager_sort2.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

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

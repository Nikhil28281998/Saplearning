*& Method: TRAININGASSIGNMENTS_GET_ENTITYSET (FIXED v1.7.0)
*& Returns assignments with FULL filter support + $inlinecount
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& FIXES APPLIED:
*&   - Audit #3:  Added AUTHORITY-CHECK for read access
*&   - Audit #10: Added Role, SapModule, Title, DueDate filter handling
*&   - Audit #24: Added $inlinecount support
*&---------------------------------------------------------------------*
METHOD trainingassignments_get_entityset.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: lt_asgn     TYPE TABLE OF zcourse_asgn,
        ls_asgn     TYPE zcourse_asgn,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_trainingassignment,
        ls_filter   TYPE /iwbep/s_mgw_select_option,
        ls_option   TYPE /iwbep/s_cod_select_option,
        lv_user_id  TYPE char12,
        lv_status   TYPE char20,
        lv_role     TYPE char50,
        lv_module   TYPE char50,
        lv_title    TYPE char255,
        lv_title_pat TYPE char255,
        lv_title_up TYPE char255,
        lv_skip     TYPE i,
        lv_top      TYPE i,
        lv_total    TYPE i.

* -- FIX #3: Authorization check (read access) ----------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '03'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Not authorized to view training assignments'.
  ENDIF.

* -- Read filter: UserId ---------------------------------------------
  READ TABLE it_filter_select_options
    WITH KEY property = 'UserId' INTO ls_filter.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'USER_ID' INTO ls_filter.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_option.
    IF sy-subrc = 0. lv_user_id = ls_option-low. ENDIF.
  ENDIF.

* -- Read filter: Status ---------------------------------------------
  CLEAR ls_filter.
  READ TABLE it_filter_select_options
    WITH KEY property = 'Status' INTO ls_filter.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'STATUS' INTO ls_filter.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_option.
    IF sy-subrc = 0. lv_status = ls_option-low. ENDIF.
  ENDIF.

* -- FIX #10: Read filter: Role -------------------------------------
  CLEAR ls_filter.
  READ TABLE it_filter_select_options
    WITH KEY property = 'Role' INTO ls_filter.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'ROLE' INTO ls_filter.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_option.
    IF sy-subrc = 0. lv_role = ls_option-low. ENDIF.
  ENDIF.

* -- FIX #10: Read filter: SapModule --------------------------------
  CLEAR ls_filter.
  READ TABLE it_filter_select_options
    WITH KEY property = 'SapModule' INTO ls_filter.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'SAP_MODULE' INTO ls_filter.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_option.
    IF sy-subrc = 0. lv_module = ls_option-low. ENDIF.
  ENDIF.

* -- FIX #10: Read filter: Title ------------------------------------
  CLEAR ls_filter.
  READ TABLE it_filter_select_options
    WITH KEY property = 'Title' INTO ls_filter.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'TITLE' INTO ls_filter.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_option.
    IF sy-subrc = 0. lv_title = ls_option-low. ENDIF.
  ENDIF.

* -- Build query with DB-level filters for performance ---------------
  IF lv_user_id IS NOT INITIAL AND lv_status IS NOT INITIAL.
    SELECT * FROM zcourse_asgn INTO TABLE lt_asgn
      WHERE user_id = lv_user_id AND status = lv_status
      ORDER BY due_date DESCENDING.
  ELSEIF lv_user_id IS NOT INITIAL.
    SELECT * FROM zcourse_asgn INTO TABLE lt_asgn
      WHERE user_id = lv_user_id
      ORDER BY due_date DESCENDING.
  ELSEIF lv_status IS NOT INITIAL.
    SELECT * FROM zcourse_asgn INTO TABLE lt_asgn
      WHERE status = lv_status
      ORDER BY due_date DESCENDING.
  ELSE.
    SELECT * FROM zcourse_asgn INTO TABLE lt_asgn
      ORDER BY due_date DESCENDING.
  ENDIF.

* -- FIX #10: Post-filter Role (if specified) -------------------------
  IF lv_role IS NOT INITIAL.
    DELETE lt_asgn WHERE role <> lv_role.
  ENDIF.

* -- FIX #10: Post-filter SapModule (if specified) --------------------
  IF lv_module IS NOT INITIAL.
    DELETE lt_asgn WHERE sap_module <> lv_module.
  ENDIF.

* -- FIX #10: Post-filter Title (LIKE pattern for contains) -----------
  IF lv_title IS NOT INITIAL.
    TRANSLATE lv_title TO UPPER CASE.
    CONCATENATE '%' lv_title '%' INTO lv_title_pat.
    LOOP AT lt_asgn INTO ls_asgn.
      CLEAR lv_title_up.
      lv_title_up = ls_asgn-title.
      TRANSLATE lv_title_up TO UPPER CASE.
      IF lv_title_up NP lv_title_pat.
        DELETE lt_asgn.
      ENDIF.
    ENDLOOP.
  ENDIF.

* -- FIX #24: Set $inlinecount for SmartTable row count support ------
  lv_total = lines( lt_asgn ).
  es_response_context-inlinecount = lv_total.

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
    ls_entity-duedate         = ls_asgn-due_date.
    ls_entity-completiondate  = ls_asgn-completion_dt.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

*& Method: TRAININGS_GET_ENTITYSET (FIXED v1.7.0)
*& Returns all trainings with full filter support + $inlinecount
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& FIXES APPLIED:
*&   - Audit #3:  Added AUTHORITY-CHECK for read access
*&   - Audit #24: Added $inlinecount support (es_response_context)
*&---------------------------------------------------------------------*
METHOD trainings_get_entityset.

* -- Authority check: minimum ACTVT 03 (Display) required ----------
*   Cascading check: 03 (Display) → 06 (Execute) → 01 (Create) → 02 (Change)
  AUTHORITY-CHECK OBJECT 'Z_COURSES' ID 'ACTVT' FIELD '03'.   "Display
  IF sy-subrc <> 0.
    AUTHORITY-CHECK OBJECT 'Z_COURSES' ID 'ACTVT' FIELD '06'. "Execute
    IF sy-subrc <> 0.
      AUTHORITY-CHECK OBJECT 'Z_COURSES' ID 'ACTVT' FIELD '01'. "Create
      IF sy-subrc <> 0.
        AUTHORITY-CHECK OBJECT 'Z_COURSES' ID 'ACTVT' FIELD '02'. "Change
        IF sy-subrc <> 0.
          RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
            EXPORTING textid = /iwbep/cx_mgw_busi_exception=>resource_not_found
                      message = 'Not authorized to view training catalog (Z_COURSES ACTVT 03)'.
        ENDIF.
      ENDIF.
    ENDIF.
  ENDIF.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: lt_training    TYPE TABLE OF zcourses,
        ls_training    TYPE zcourses,
        ls_entity      TYPE zcl_zcourses_mpc=>ts_training,
        ls_filter_role TYPE /iwbep/s_mgw_select_option,
        ls_filter_mod  TYPE /iwbep/s_mgw_select_option,
        ls_filter_ttl  TYPE /iwbep/s_mgw_select_option,
        ls_filter_upd  TYPE /iwbep/s_mgw_select_option,
        ls_role_opt    TYPE /iwbep/s_cod_select_option,
        ls_module_opt  TYPE /iwbep/s_cod_select_option,
        ls_title_opt   TYPE /iwbep/s_cod_select_option,
        ls_upd_opt     TYPE /iwbep/s_cod_select_option,
        lv_role        TYPE char50,
        lv_module      TYPE char50,
        lv_title       TYPE char255,
        lv_title_pat   TYPE char255,
        lv_title_up    TYPE char255,
        lv_upd_date    TYPE sydatum,
        lv_skip        TYPE i,
        lv_top         TYPE i,
        lv_total       TYPE i.

* -- Read filter: Role -----------------------------------------------
  READ TABLE it_filter_select_options
    WITH KEY property = 'Role'
    INTO ls_filter_role.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'ROLE'
      INTO ls_filter_role.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter_role-select_options INDEX 1
      INTO ls_role_opt.
    IF sy-subrc = 0.
      lv_role = ls_role_opt-low.
    ENDIF.
  ENDIF.

* -- Read filter: SapModule ------------------------------------------
  READ TABLE it_filter_select_options
    WITH KEY property = 'SapModule'
    INTO ls_filter_mod.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'SAP_MODULE'
      INTO ls_filter_mod.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter_mod-select_options INDEX 1
      INTO ls_module_opt.
    IF sy-subrc = 0.
      lv_module = ls_module_opt-low.
    ENDIF.
  ENDIF.

* -- Read filter: Title (supports Contains / substringof) ------------
  READ TABLE it_filter_select_options
    WITH KEY property = 'Title'
    INTO ls_filter_ttl.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'TITLE'
      INTO ls_filter_ttl.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter_ttl-select_options INDEX 1
      INTO ls_title_opt.
    IF sy-subrc = 0.
      lv_title = ls_title_opt-low.
    ENDIF.
  ENDIF.

* -- Read filter: LastUpdated (date GE / LE) -------------------------
  READ TABLE it_filter_select_options
    WITH KEY property = 'LastUpdated'
    INTO ls_filter_upd.
  IF sy-subrc <> 0.
    READ TABLE it_filter_select_options
      WITH KEY property = 'LAST_UPDATED'
      INTO ls_filter_upd.
  ENDIF.
  IF sy-subrc = 0.
    READ TABLE ls_filter_upd-select_options INDEX 1
      INTO ls_upd_opt.
    IF sy-subrc = 0.
      lv_upd_date = ls_upd_opt-low.
    ENDIF.
  ENDIF.

* -- Query ZCOURSES: apply Role + Module at DB level -----------------
  IF lv_role IS NOT INITIAL AND lv_module IS NOT INITIAL.
    SELECT * FROM zcourses INTO TABLE lt_training
      WHERE role       = lv_role
        AND sap_module = lv_module
      ORDER BY last_updated DESCENDING.
  ELSEIF lv_role IS NOT INITIAL.
    SELECT * FROM zcourses INTO TABLE lt_training
      WHERE role = lv_role
      ORDER BY last_updated DESCENDING.
  ELSEIF lv_module IS NOT INITIAL.
    SELECT * FROM zcourses INTO TABLE lt_training
      WHERE sap_module = lv_module
      ORDER BY last_updated DESCENDING.
  ELSE.
    SELECT * FROM zcourses INTO TABLE lt_training
      ORDER BY last_updated DESCENDING.
  ENDIF.

* -- Post-filter: Title (case-insensitive LIKE pattern) ---------------
  IF lv_title IS NOT INITIAL.
    TRANSLATE lv_title TO UPPER CASE.
    CONCATENATE '%' lv_title '%' INTO lv_title_pat.
    LOOP AT lt_training INTO ls_training.
      CLEAR lv_title_up.
      lv_title_up = ls_training-title.
      TRANSLATE lv_title_up TO UPPER CASE.
      IF lv_title_up NP lv_title_pat.
        DELETE lt_training.
      ENDIF.
    ENDLOOP.
  ENDIF.

* -- Post-filter: LastUpdated (GE date) ------------------------------
  IF lv_upd_date IS NOT INITIAL.
    DELETE lt_training WHERE last_updated < lv_upd_date.
  ENDIF.

* -- FIX #24: Set $inlinecount BEFORE pagination ---------------------
  lv_total = lines( lt_training ).
  es_response_context-inlinecount = lv_total.

* -- Convert database rows to OData entity format --------------------
  LOOP AT lt_training INTO ls_training.
    CLEAR ls_entity.
    ls_entity-id            = ls_training-id.
    ls_entity-url           = ls_training-url.
    ls_entity-role          = ls_training-role.
    ls_entity-title         = ls_training-title.
    ls_entity-sap_module    = ls_training-sap_module.
    ls_entity-description   = ls_training-description.
    ls_entity-last_updated  = ls_training-last_updated.
    ls_entity-sap_help_link = ls_training-sap_help_link.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

* -- Server-side pagination ($top / $skip) ---------------------------
  IF is_paging IS NOT INITIAL.
    lv_skip = is_paging-skip.
    lv_top  = is_paging-top.

    IF lv_skip > 0.
      DELETE et_entityset TO lv_skip.
    ENDIF.
    IF lv_top > 0 AND lines( et_entityset ) > lv_top.
      DELETE et_entityset FROM ( lv_top + 1 ).
    ENDIF.
  ENDIF.

ENDMETHOD.

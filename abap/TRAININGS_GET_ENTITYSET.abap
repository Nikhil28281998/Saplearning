*&---------------------------------------------------------------------*
*& Method:  TRAININGS_GET_ENTITYSET
*& Purpose: Returns all training records from ZCOURSES table with
*&          optional filtering by Role and SapModule, plus $top/$skip
*&          pagination. Called when the Fiori SmartTable loads data.
*& Class:   ZCL_ZCOURSES_DPC_EXT  (Redefine in SE24)
*&---------------------------------------------------------------------*
*& REVIEWED BY SAP EXPERT TEAM  |  2026-02-13  |  Classic ABAP Syntax
*&---------------------------------------------------------------------*
METHOD trainings_get_entityset.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: lt_training    TYPE TABLE OF zcourses,
        ls_training    TYPE zcourses,
        ls_entity      TYPE zcl_zcourses_mpc=>ts_training,
        ls_filter_role TYPE /iwbep/s_mgw_select_option,
        ls_filter_mod  TYPE /iwbep/s_mgw_select_option,
        ls_role_opt    TYPE /iwbep/s_cod_select_option,
        ls_module_opt  TYPE /iwbep/s_cod_select_option,
        lv_role        TYPE char50,
        lv_module      TYPE char50,
        lv_skip        TYPE i,
        lv_top         TYPE i.

* -- Read filter: Role -----------------------------------------------
*   Try PascalCase first (SEGW standard), then UPPERCASE fallback
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

* -- Query ZCOURSES with dynamic WHERE (classic syntax) --------------
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
*   BUG-FIX: previous version skipped pagination when skip = 0
*   (first page). Now handles skip = 0 correctly.
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

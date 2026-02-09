*&---------------------------------------------------------------------*
*& Method: TRAININGSET_GET_ENTITYSET
*& Get all training records (with optional filters)
*&---------------------------------------------------------------------*
METHOD trainingset_get_entityset.
  
  DATA: lt_training TYPE TABLE OF zcourses,
        ls_training TYPE zcourses,
        ls_entity   TYPE zcl_zcourses_srv_mpc=>ts_training,
        lv_role     TYPE string,
        lv_module   TYPE string.

  " Read filter parameters from $filter query
  READ TABLE it_filter_select_options 
    WITH KEY property = 'ROLE' 
    INTO DATA(ls_filter_role).
  IF sy-subrc = 0.
    READ TABLE ls_filter_role-select_options INDEX 1 INTO DATA(ls_role_opt).
    lv_role = ls_role_opt-low.
  ENDIF.

  READ TABLE it_filter_select_options 
    WITH KEY property = 'SAP_MODULE' 
    INTO DATA(ls_filter_module).
  IF sy-subrc = 0.
    READ TABLE ls_filter_module-select_options INDEX 1 INTO DATA(ls_module_opt).
    lv_module = ls_module_opt-low.
  ENDIF.

  " Query database with filters
  SELECT * FROM zcourses INTO TABLE @lt_training
    WHERE ( role = @lv_role OR @lv_role IS INITIAL )
      AND ( sap_module = @lv_module OR @lv_module IS INITIAL )
    ORDER BY last_updated DESCENDING.

  IF sy-subrc = 0.
    " Convert to OData entity format
    LOOP AT @lt_training INTO @ls_training.
      CLEAR ls_entity.
      ls_entity-id = ls_training-id.
      ls_entity-url = ls_training-url.
      ls_entity-role = ls_training-role.
      ls_entity-title = ls_training-title.
      ls_entity-sap_module = ls_training-sap_module.
      ls_entity-description = ls_training-description.
      ls_entity-last_updated = ls_training-last_updated.
      ls_entity-sap_help_link = ls_training-sap_help_link.
      
      APPEND ls_entity TO et_entityset.
    ENDLOOP.
  ENDIF.

  " Implement pagination (TOP/SKIP)
  IF is_paging-top IS NOT INITIAL AND is_paging-skip IS NOT INITIAL.
    DELETE et_entityset TO is_paging-skip.
    DELETE et_entityset FROM ( is_paging-top + 1 ).
  ENDIF.

ENDMETHOD.

*&---------------------------------------------------------------------*
*& Method: TRAININGS_GET_ENTITY
*& Get single training by ID
*&---------------------------------------------------------------------*
METHOD trainings_get_entity.
  
  DATA: ls_training TYPE zcourses,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_training,
        lv_id       TYPE char36.

  " Read key from request
  READ TABLE it_key_tab WITH KEY name = 'ID' INTO DATA(ls_key).
  IF sy-subrc = 0.
    lv_id = ls_key-value.
    
    " Get from database
    SELECT SINGLE * FROM zcourses INTO @ls_training
      WHERE id = @lv_id.
    
    IF sy-subrc = 0.
      " Map to entity
      ls_entity-id = ls_training-id.
      ls_entity-url = ls_training-url.
      ls_entity-role = ls_training-role.
      ls_entity-title = ls_training-title.
      ls_entity-sap_module = ls_training-sap_module.
      ls_entity-description = ls_training-description.
      ls_entity-last_updated = ls_training-last_updated.
      ls_entity-sap_help_link = ls_training-sap_help_link.
      
      er_entity = ls_entity.
    ELSE.
      " Not found
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid            = /iwbep/cx_mgw_busi_exception=>business_error
          message           = 'Training not found'
          http_status_code  = 404.
    ENDIF.
  ENDIF.

ENDMETHOD.

*&---------------------------------------------------------------------*
*& Method: TRAININGS_UPDATE_ENTITY
*& Update existing training record
*&---------------------------------------------------------------------*
METHOD trainings_update_entity.
  
  DATA: ls_training TYPE zcourses,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_training,
        lv_id       TYPE char36.

  " Read key
  " Debug: Check what key name is actually passed
  DATA(lv_key_count) = lines( it_key_tab ).
  IF lv_key_count > 0.
    READ TABLE it_key_tab INDEX 1 INTO DATA(ls_key_debug).
    " Check if key name is 'ID' or 'Id' (case sensitive)
  ENDIF.
  
  READ TABLE it_key_tab WITH KEY name = 'ID' INTO DATA(ls_key).
  IF sy-subrc <> 0.
    " Try lowercase 'id'
    READ TABLE it_key_tab WITH KEY name = 'Id' INTO ls_key.
  ENDIF.
  
  IF sy-subrc = 0.
    lv_id = ls_key-value.
  ELSE.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>business_error
        message           = 'Training ID is required'
        http_status_code  = 400.
  ENDIF.

  " Get existing record
  SELECT SINGLE * FROM zcourses INTO @ls_training
    WHERE id = @lv_id.
  
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>business_error
        message           = 'Training not found'
        http_status_code  = 404.
  ENDIF.

  " Get updated data
  io_data_provider->read_entry_data( IMPORTING es_data = ls_entity ).

  " Update fields (only if provided)
  IF ls_entity-title IS NOT INITIAL.
    ls_training-title = ls_entity-title.
  ENDIF.
  IF ls_entity-url IS NOT INITIAL.
    ls_training-url = ls_entity-url.
  ENDIF.
  IF ls_entity-role IS NOT INITIAL.
    ls_training-role = ls_entity-role.
  ENDIF.
  IF ls_entity-sap_module IS NOT INITIAL.
    ls_training-sap_module = ls_entity-sap_module.
  ENDIF.
  IF ls_entity-description IS NOT INITIAL.
    ls_training-description = ls_entity-description.
  ENDIF.
  IF ls_entity-sap_help_link IS NOT INITIAL.
    ls_training-sap_help_link = ls_entity-sap_help_link.
  ENDIF.

  " Update timestamp
  ls_training-last_updated = sy-datum.

  " Update database - ensure MANDT is preserved from SELECT
  UPDATE zcourses
    SET title = @ls_training-title
        url = @ls_training-url
        role = @ls_training-role
        sap_module = @ls_training-sap_module
        description = @ls_training-description
        sap_help_link = @ls_training-sap_help_link
        last_updated = @ls_training-last_updated
    WHERE mandt = @ls_training-mandt
      AND id = @lv_id.
  
  IF sy-subrc = 0.
    COMMIT WORK.
    
    " Map back to entity
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
    ROLLBACK WORK.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>business_error
        message           = 'Failed to update training'
        http_status_code  = 500.
  ENDIF.

ENDMETHOD.

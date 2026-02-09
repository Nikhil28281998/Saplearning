*&---------------------------------------------------------------------*
*& Method: TRAININGSET_UPDATE_ENTITY
*& Update existing training record
*&---------------------------------------------------------------------*
METHOD trainingset_update_entity.
  
  DATA: ls_training TYPE zcourses,
        ls_entity   TYPE zcl_zcourses_srv_mpc=>ts_training,
        lv_id TYPE char36.

  " Read key
  READ TABLE it_key_tab WITH KEY name = 'ID' INTO DATA(ls_key).
  IF sy-subrc = 0.
    lv_id = ls_key-value.
  ELSE.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>bad_request
        message           = 'Training ID is required'
        http_status_code  = /iwbep/cx_mgw_busi_exception=>gcs_http_status_codes-bad_request.
  ENDIF.

  " Get existing record
  SELECT SINGLE * FROM zcourses INTO ls_training
    WHERE id = lv_id.
  
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>resource_not_found
        message           = 'Training not found'
        http_status_code  = /iwbep/cx_mgw_busi_exception=>gcs_http_status_codes-not_found.
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
  IF ls_entity-module IS NOT INITIAL.
    ls_training-module = ls_entity-module.
  ENDIF.
  IF ls_entity-description IS NOT INITIAL.
    ls_training-description = ls_entity-description.
  ENDIF.
  IF ls_entity-sap_help_link IS NOT INITIAL.
    ls_training-sap_help_link = ls_entity-sap_help_link.
  ENDIF.

  " Update timestamp
  ls_training-last_updated = sy-datum.

  " Update database
  UPDATE zcourses FROM ls_training.
  
  IF sy-subrc = 0.
    COMMIT WORK.
    
    " Map back to entity
    ls_entity-id = ls_training-id.
    ls_entity-url = ls_training-url.
    ls_entity-role = ls_training-role.
    ls_entity-title = ls_training-title.
    ls_entity-module = ls_training-module.
    ls_entity-description = ls_training-description.
    ls_entity-last_updated = ls_training-last_updated.
    ls_entity-sap_help_link = ls_training-sap_help_link.
    
    er_entity = ls_entity.
  ELSE.
    ROLLBACK WORK.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>internal_server_error
        message           = 'Failed to update training'
        http_status_code  = /iwbep/cx_mgw_busi_exception=>gcs_http_status_codes-internal_server_error.
  ENDIF.

ENDMETHOD.

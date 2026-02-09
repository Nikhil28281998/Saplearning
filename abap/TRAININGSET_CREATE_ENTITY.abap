*&---------------------------------------------------------------------*
*& Method: TRAININGSET_CREATE_ENTITY
*& Create new training record
*&---------------------------------------------------------------------*
METHOD trainingset_create_entity.
  
  DATA: ls_training TYPE zcourses,
  IF ls_entity-title IS INITIAL OR ls_entity-url IS INITIAL.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>bad_request
        message           = 'Title and URL are required'
        http_status_code  = /iwbep/cx_mgw_busi_exception=>gcs_http_status_codes-bad_request.
  ENDIF.

  " Generate UUID if not provided
  IF ls_entity-id IS INITIAL.
    CALL FUNCTION 'GUID_CREATE'
      IMPORTING
        ev_guid_16 = DATA(lv_guid).
    ls_entity-id = lv_guid.
  ENDIF.

  " Set last updated date
  ls_entity-last_updated = sy-datum.

  " Map to database structure
  ls_training-id = ls_entity-id.
  ls_training-url = ls_entity-url.
  ls_training-role = ls_entity-role.
  ls_training-title = ls_entity-title.
  ls_training-module = ls_entity-module.
  ls_training-description = ls_entity-description.
  ls_training-last_updated = ls_entity-last_updated.
  ls_training-sap_help_link = ls_entity-sap_help_link.

  " Insert into database
  INSERT zcourses FROM ls_training.
  
  IF sy-subrc = 0.
    COMMIT WORK.
    er_entity = ls_entity.
  ELSE.
    ROLLBACK WORK.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>internal_server_error
        message           = 'Failed to create training'
        http_status_code  = /iwbep/cx_mgw_busi_exception=>gcs_http_status_codes-internal_server_error.
  ENDIF.

ENDMETHOD.

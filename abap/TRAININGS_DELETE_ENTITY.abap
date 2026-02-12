*&---------------------------------------------------------------------*
*& Method: TRAININGS_DELETE_ENTITY
*& Delete training record
*&---------------------------------------------------------------------*
METHOD trainings_delete_entity.
  
  DATA: lv_id TYPE char36.

  " Read key
  READ TABLE it_key_tab WITH KEY name = 'ID' INTO DATA(ls_key).
  IF sy-subrc <> 0.
    " Try case-sensitive 'Id'
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

  " Check if record exists
  SELECT SINGLE id FROM zcourses INTO @DATA(lv_check)
    WHERE id = @lv_id.
  
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>business_error
        message           = 'Training not found'
        http_status_code  = 404.
  ENDIF.

  " Delete from database
  DELETE FROM zcourses WHERE id = @lv_id.
  
  IF sy-subrc = 0.
    COMMIT WORK.
  ELSE.
    ROLLBACK WORK.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid            = /iwbep/cx_mgw_busi_exception=>business_error
        message           = 'Failed to delete training'
        http_status_code  = 500.
  ENDIF.

ENDMETHOD.

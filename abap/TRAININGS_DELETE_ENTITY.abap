*&---------------------------------------------------------------------*
*& Method:  TRAININGS_DELETE_ENTITY
*& Purpose: Deletes a training record from ZCOURSES by its ID key.
*&          Called when user clicks "Delete" action in the Fiori app.
*&          Reads the key from the OData URI, verifies the record
*&          exists, then removes it from the database table.
*& Class:   ZCL_ZCOURSES_DPC_EXT  (Redefine in SE24)
*&---------------------------------------------------------------------*
*& REVIEWED BY SAP EXPERT TEAM  |  2026-02-13  |  Classic ABAP Syntax
*&---------------------------------------------------------------------*
METHOD trainings_delete_entity.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: ls_key    TYPE /iwbep/s_mgw_name_value_pair,
        lv_id     TYPE char36,
        lv_check  TYPE char36.

* -- Read key from OData URI path (e.g. Trainings('xxx')) ------------
  READ TABLE it_key_tab WITH KEY name = 'Id' INTO ls_key.
  IF sy-subrc <> 0.
    READ TABLE it_key_tab WITH KEY name = 'ID' INTO ls_key.
  ENDIF.

  IF sy-subrc = 0.
    lv_id = ls_key-value.
  ELSE.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Training ID is required'.
  ENDIF.

* -- Verify record exists before deleting ----------------------------
  SELECT SINGLE id FROM zcourses INTO lv_check
    WHERE id = lv_id.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Training not found'.
  ENDIF.

* -- Delete from ZCOURSES -------------------------------------------
*   Note: No COMMIT WORK here - Gateway framework manages the LUW.
  DELETE FROM zcourses WHERE id = lv_id.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Failed to delete training'.
  ENDIF.

ENDMETHOD.

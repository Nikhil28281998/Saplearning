*&---------------------------------------------------------------------*
*& Method:  TRAININGS_UPDATE_ENTITY
*& Purpose: Updates an existing training record in ZCOURSES.
*&          Called when user edits a training in the Fiori app and
*&          submits. Uses PATCH/PUT semantics - only non-initial
*&          fields are overwritten so partial updates work.
*& Class:   ZCL_ZCOURSES_DPC_EXT  (Redefine in SE24)
*&---------------------------------------------------------------------*
*& REVIEWED BY SAP EXPERT TEAM  |  2026-02-13  |  Classic ABAP Syntax
*&---------------------------------------------------------------------*
METHOD trainings_update_entity.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: ls_key      TYPE /iwbep/s_mgw_name_value_pair,
        ls_training TYPE zcourses,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_training,
        lv_id       TYPE char36.

* -- Read key from OData URI path ------------------------------------
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

* -- Fetch existing record (classic syntax, no @ host expression) ----
  SELECT SINGLE * FROM zcourses INTO ls_training
    WHERE id = lv_id.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Training not found'.
  ENDIF.

* -- Read incoming update payload ------------------------------------
  io_data_provider->read_entry_data( IMPORTING es_data = ls_entity ).

* -- Merge: only overwrite fields that were actually provided --------
*   (IS NOT INITIAL check = partial update / PATCH support)
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

* -- Update audit timestamp ------------------------------------------
  ls_training-last_updated = sy-datum.

* -- Write back to database (classic MODIFY - simpler than UPDATE SET)
*   Note: No COMMIT WORK - Gateway framework manages the LUW.
  MODIFY zcourses FROM ls_training.

  IF sy-subrc = 0.
*   Return updated entity to caller
    ls_entity-id            = ls_training-id.
    ls_entity-url           = ls_training-url.
    ls_entity-role          = ls_training-role.
    ls_entity-title         = ls_training-title.
    ls_entity-sap_module    = ls_training-sap_module.
    ls_entity-description   = ls_training-description.
    ls_entity-last_updated  = ls_training-last_updated.
    ls_entity-sap_help_link = ls_training-sap_help_link.

    er_entity = ls_entity.
  ELSE.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Failed to update training'.
  ENDIF.

ENDMETHOD.

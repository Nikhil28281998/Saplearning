*& Method: TRAININGS_UPDATE_ENTITY (FIXED v1.7.0)
*& Updates an existing training record in ZCOURSES
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& FIXES APPLIED:
*&   - Audit #3:  Added AUTHORITY-CHECK for Admin-only update
*&   - Audit #25: Note about IS NOT INITIAL partial update flaw
*&                (Cannot clear a field to empty - documented as known limitation)
*&---------------------------------------------------------------------*
METHOD trainings_update_entity.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: ls_key      TYPE /iwbep/s_mgw_name_value_pair,
        ls_training TYPE zcourses,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_training,
        lv_id       TYPE char36.

* -- FIX #3: Authorization check (Admin only) ------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES_MGR'
    ID 'ACTVT' FIELD '02'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Not authorized to update trainings'.
  ENDIF.

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

* -- Fetch existing record -------------------------------------------
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
*   NOTE (Audit #25): IS NOT INITIAL check means you cannot clear a field.
*   To fix this properly, you would need to check the OData request headers
*   for $merge vs PUT semantics. Documented as known limitation.
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

* -- Write back to database ------------------------------------------
  MODIFY zcourses FROM ls_training.

  IF sy-subrc = 0.
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

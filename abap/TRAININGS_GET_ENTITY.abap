*&---------------------------------------------------------------------*
*& Method:  TRAININGS_GET_ENTITY
*& Purpose: Retrieves a single training record by its ID key.
*&          Called when the Fiori app navigates to a training detail
*&          page, e.g. GET /Trainings('uuid-here'). Reads the key
*&          from the URI, fetches from ZCOURSES, maps to OData entity.
*& Class:   ZCL_ZCOURSES_DPC_EXT  (Redefine in SE24)
*&---------------------------------------------------------------------*
*& REVIEWED BY SAP EXPERT TEAM  |  2026-02-13  |  Classic ABAP Syntax
*&---------------------------------------------------------------------*
METHOD trainings_get_entity.

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

  IF sy-subrc <> 0.
*   BUG-FIX: previous version silently returned empty entity when
*   no key was found. Now raises proper error.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Training ID is required in the request URI'.
  ENDIF.

  lv_id = ls_key-value.

* -- Fetch from database (classic syntax, no @ host expression) ------
  SELECT SINGLE * FROM zcourses INTO ls_training
    WHERE id = lv_id.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Training not found'.
  ENDIF.

* -- Map database record to OData entity structure -------------------
  ls_entity-id            = ls_training-id.
  ls_entity-url           = ls_training-url.
  ls_entity-role          = ls_training-role.
  ls_entity-title         = ls_training-title.
  ls_entity-sap_module    = ls_training-sap_module.
  ls_entity-description   = ls_training-description.
  ls_entity-last_updated  = ls_training-last_updated.
  ls_entity-sap_help_link = ls_training-sap_help_link.

  er_entity = ls_entity.

ENDMETHOD.

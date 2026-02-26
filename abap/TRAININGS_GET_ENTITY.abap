*& Method: TRAININGS_GET_ENTITY
*& Gets a single training record by ID key
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
METHOD trainings_get_entity.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: ls_key      TYPE /iwbep/s_mgw_name_value_pair,
        ls_training TYPE zcourses,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_training,
        lv_id       TYPE char36,
        lv_errmsg   TYPE bapi_msg,
        lx_root     TYPE REF TO cx_root,
        lx_busi     TYPE REF TO /iwbep/cx_mgw_busi_exception.

  TRY.

* -- Authorization check: Display (ACTVT 03) or any higher privilege ---
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '03'.
  IF sy-subrc <> 0.
    AUTHORITY-CHECK OBJECT 'Z_COURSES'
      ID 'ACTVT' FIELD '06'.
    IF sy-subrc <> 0.
      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '01'.
      IF sy-subrc <> 0.
        AUTHORITY-CHECK OBJECT 'Z_COURSES'
          ID 'ACTVT' FIELD '02'.
        IF sy-subrc <> 0.
          RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
            EXPORTING
              textid  = /iwbep/cx_mgw_busi_exception=>business_error
              message = 'No authorization to read trainings (need ACTVT 03, 02, 01, or 06 in Z_COURSES)'.
        ENDIF.
      ENDIF.
    ENDIF.
  ENDIF.

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
  ls_entity-topic         = ls_training-topic.
  ls_entity-title         = ls_training-title.
  ls_entity-sap_module    = ls_training-sap_module.
  ls_entity-description   = ls_training-description.
  ls_entity-last_updated  = ls_training-last_updated.
  ls_entity-sap_help_link = ls_training-sap_help_link.

  er_entity = ls_entity.

  CATCH /iwbep/cx_mgw_busi_exception INTO lx_busi.
    RAISE EXCEPTION lx_busi.
  CATCH cx_root INTO lx_root.
    lv_errmsg = lx_root->get_text( ).
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_errmsg.
  ENDTRY.

ENDMETHOD.

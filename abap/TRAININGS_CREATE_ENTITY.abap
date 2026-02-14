*& Method: TRAININGS_CREATE_ENTITY
*& Creates a new training record in ZCOURSES via OData POST
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
METHOD trainings_create_entity.

* -- Local variables --------------------------------------------------
  DATA: ls_training TYPE zcourses,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_training,
        lv_guid     TYPE sysuuid_c36.

* -- Authorization check: Create (ACTVT 01) -------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '01'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'No authorization to create trainings'.
  ENDIF.

* -- Read incoming OData payload into entity structure ----------------
  io_data_provider->read_entry_data( IMPORTING es_data = ls_entity ).

* -- Validate required fields (Title + URL mandatory) ----------------
  IF ls_entity-title IS INITIAL OR ls_entity-url IS INITIAL.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Title and URL are required'.
  ENDIF.

* -- Generate UUID if caller did not provide one ---------------------
  IF ls_entity-id IS INITIAL.
    TRY.
        lv_guid = cl_system_uuid=>create_uuid_c36_static( ).
      CATCH cx_uuid_error.
*       Fallback: use timestamp-based ID
        CONCATENATE sy-datum sy-uzeit sy-uname INTO lv_guid.
    ENDTRY.
    ls_entity-id = lv_guid.
  ENDIF.

* -- Set audit timestamp ---------------------------------------------
  ls_entity-last_updated = sy-datum.

* -- Map OData entity to database structure --------------------------
  CLEAR ls_training.
  ls_training-id            = ls_entity-id.
  ls_training-url           = ls_entity-url.
  ls_training-role          = ls_entity-role.
  ls_training-title         = ls_entity-title.
  ls_training-sap_module    = ls_entity-sap_module.
  ls_training-description   = ls_entity-description.
  ls_training-last_updated  = ls_entity-last_updated.
  ls_training-sap_help_link = ls_entity-sap_help_link.

* -- Insert into database table ZCOURSES ----------------------------
*   Note: Do NOT call COMMIT WORK inside DPC methods.
*   The SAP Gateway framework manages the transaction (LUW).
*   It will COMMIT automatically after successful return.
  INSERT zcourses FROM ls_training.

  IF sy-subrc = 0.
    er_entity = ls_entity.
  ELSE.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Failed to create training - record may already exist'.
  ENDIF.

ENDMETHOD.

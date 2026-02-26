*& Method: TRAININGS_UPDATE_ENTITY
*& Updates an existing training record in ZCOURSES (partial update)
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
METHOD trainings_update_entity.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: ls_key      TYPE /iwbep/s_mgw_name_value_pair,
        ls_training TYPE zcourses,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_training,
        lv_id       TYPE char36,
        lv_errmsg   TYPE bapi_msg,
        lv_msg      TYPE bapi_msg,
        lx_root     TYPE REF TO cx_root,
        lx_busi     TYPE REF TO /iwbep/cx_mgw_busi_exception.

  TRY.

* -- Authorization check: Change (ACTVT 02) --------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '02'.
  IF sy-subrc <> 0.
    MESSAGE e001(zcourses) WITH 'update' 'trainings' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- Read key from OData URI path ------------------------------------
  READ TABLE it_key_tab WITH KEY name = 'Id' INTO ls_key.
  IF sy-subrc <> 0.
    READ TABLE it_key_tab WITH KEY name = 'ID' INTO ls_key.
  ENDIF.

  IF sy-subrc = 0.
    lv_id = ls_key-value.
  ELSE.
    MESSAGE e002(zcourses) WITH 'Training ID' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- Fetch existing record (classic syntax, no @ host expression) ----
  SELECT SINGLE * FROM zcourses INTO ls_training
    WHERE id = lv_id.

  IF sy-subrc <> 0.
    MESSAGE e003(zcourses) WITH 'Training' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- Read incoming update payload ------------------------------------
  io_data_provider->read_entry_data( IMPORTING es_data = ls_entity ).

* -- SEC-5: XSS sanitization — strip HTML angle brackets from text fields
  IF ls_entity-title IS NOT INITIAL.
    REPLACE ALL OCCURRENCES OF '<' IN ls_entity-title WITH ''.
    REPLACE ALL OCCURRENCES OF '>' IN ls_entity-title WITH ''.
  ENDIF.
  IF ls_entity-description IS NOT INITIAL.
    REPLACE ALL OCCURRENCES OF '<' IN ls_entity-description WITH ''.
    REPLACE ALL OCCURRENCES OF '>' IN ls_entity-description WITH ''.
  ENDIF.

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
  IF ls_entity-topic IS NOT INITIAL.
    ls_training-topic = ls_entity-topic.
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

*   -- PG-4: Cascade denormalized fields to ZCOURSE_ASGN ------------
*     Only update fields that were actually changed in the payload
    DATA: lv_cascade_needed TYPE abap_bool VALUE abap_false.
    IF ls_entity-title IS NOT INITIAL OR ls_entity-role IS NOT INITIAL
       OR ls_entity-topic IS NOT INITIAL
       OR ls_entity-sap_module IS NOT INITIAL OR ls_entity-url IS NOT INITIAL.
      lv_cascade_needed = abap_true.
    ENDIF.
    IF lv_cascade_needed = abap_true.
      UPDATE zcourse_asgn
        SET title      = ls_training-title
            role       = ls_training-role
            topic      = ls_training-topic
            sap_module = ls_training-sap_module
            url        = ls_training-url
        WHERE training_id = lv_id.
*     Log cascade result (non-critical — do not fail the main update)
    ENDIF.

*   Return updated entity to caller
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
  ELSE.
    MESSAGE e004(zcourses) WITH 'update' 'training' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

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

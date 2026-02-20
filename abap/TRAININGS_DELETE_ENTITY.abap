*& Method: TRAININGS_DELETE_ENTITY
*& Deletes a training record from ZCOURSES by ID key
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
METHOD trainings_delete_entity.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: ls_key    TYPE /iwbep/s_mgw_name_value_pair,
        lv_id     TYPE char36,
        lv_check  TYPE char36,
        lv_errmsg TYPE bapi_msg,
        lv_msg    TYPE bapi_msg,
        lx_root   TYPE REF TO cx_root,
        lx_busi   TYPE REF TO /iwbep/cx_mgw_busi_exception.

  TRY.

* -- Authorization check: Delete (ACTVT 06) --------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '06'.
  IF sy-subrc <> 0.
    MESSAGE e001(zcourses) WITH 'delete' 'trainings' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- Read key from OData URI path (e.g. Trainings('xxx')) ------------
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

* -- Verify record exists before deleting ----------------------------
  SELECT SINGLE id FROM zcourses INTO lv_check
    WHERE id = lv_id.

  IF sy-subrc <> 0.
    MESSAGE e003(zcourses) WITH 'Training' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- Delete from ZCOURSES -------------------------------------------
*   Note: No COMMIT WORK here - Gateway framework manages the LUW.
  DELETE FROM zcourses WHERE id = lv_id.

  IF sy-subrc <> 0.
    MESSAGE e004(zcourses) WITH 'delete' 'training' INTO lv_msg.
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

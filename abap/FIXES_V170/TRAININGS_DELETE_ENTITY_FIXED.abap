*& Method: TRAININGS_DELETE_ENTITY (FIXED v1.7.0)
*& Deletes a training record from ZCOURSES by ID key
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& FIXES APPLIED:
*&   - Audit #3: Added AUTHORITY-CHECK for Admin-only delete
*&---------------------------------------------------------------------*
METHOD trainings_delete_entity.

* -- Local variables (explicit - no inline DATA) ----------------------
  DATA: ls_key    TYPE /iwbep/s_mgw_name_value_pair,
        lv_id     TYPE char36,
        lv_check  TYPE char36,
        lv_errmsg TYPE bapi_msg,
        lx_root   TYPE REF TO cx_root,
        lx_busi   TYPE REF TO /iwbep/cx_mgw_busi_exception.

  TRY.

* -- FIX #3: Authorization check (Admin only) ------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '06'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Not authorized to delete trainings'.
  ENDIF.

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
  DELETE FROM zcourses WHERE id = lv_id.

* -- HI-2: Cascade delete related assignments ------------------------
  DELETE FROM zcourse_asgn WHERE training_id = lv_id.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Failed to delete training'.
  ENDIF.

* -- HI-9: Catch-all exception handler ------------------------------
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

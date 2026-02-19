*&---------------------------------------------------------------------*
*& Method: TRAININGASSIGNME_DELETE_ENTITY  (SEGW may truncate the name)
*& Allows Managers/Admins to de-assign (remove) training assignments
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& IMPORTANT: Check the exact method name in SE24 → ZCL_ZCOURSES_DPC_EXT
*&   Search for method containing "TRAININGASSIGN" and "DELETE"
*&
*& Security:
*&   - Admin (ACTVT 06): can delete any assignment
*&   - Manager (ACTVT 01): can only delete assignments they created
*&     (MANAGER_SORT2 = sy-uname)
*&   - User: no delete permission
*&---------------------------------------------------------------------*

METHOD trainingassignme_delete_entity.

  DATA: ls_key_tab  TYPE /iwbep/s_mgw_name_value_pair,
        lv_id       TYPE char36,
        ls_asgn     TYPE zcourse_asgn,
        lv_errmsg   TYPE bapi_msg,
        lx_root     TYPE REF TO cx_root,
        lx_busi     TYPE REF TO /iwbep/cx_mgw_busi_exception.

  TRY.

* -- Authorization check: need at least Create (01) or Admin (06) ----
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '06'.
  IF sy-subrc <> 0.
    AUTHORITY-CHECK OBJECT 'Z_COURSES'
      ID 'ACTVT' FIELD '01'.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid  = /iwbep/cx_mgw_busi_exception=>business_error
          message = 'No authorization to remove assignments'.
    ENDIF.
  ENDIF.

* -- Read key: Id ----------------------------------------------------
  READ TABLE it_key_tab INTO ls_key_tab
    WITH KEY name = 'Id'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Assignment ID is required'.
  ENDIF.
  lv_id = ls_key_tab-value.

* -- Fetch record to verify ownership --------------------------------
  SELECT SINGLE * FROM zcourse_asgn INTO ls_asgn
    WHERE id = lv_id.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Assignment not found'.
  ENDIF.

* -- Manager can only delete their own assignments -------------------
*    Admin (ACTVT 06) can delete any; Manager only if MANAGER_SORT2 = sy-uname
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '06'.
  IF sy-subrc <> 0.
*   Not admin — check ownership
    IF ls_asgn-manager_sort2 <> sy-uname.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid  = /iwbep/cx_mgw_busi_exception=>business_error
          message = 'You can only remove assignments you created'.
    ENDIF.
  ENDIF.

* -- Delete from database (no COMMIT — Gateway manages LUW) ----------
  DELETE FROM zcourse_asgn WHERE id = lv_id.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Failed to remove assignment'.
  ENDIF.

* -- Catch-all -------------------------------------------------------
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

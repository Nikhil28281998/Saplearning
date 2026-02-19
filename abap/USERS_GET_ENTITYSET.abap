*& Method: USERS_GET_ENTITYSET
*& Returns SAP users for value help in Assign Training dialog
*& When $filter=Sort2 eq 'XXXX' is sent, returns only users
*& whose ADRP.SORT2 matches the manager's SAP user ID (team members).
*& Without filter, returns all users (for Admin role).
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)

METHOD users_get_entityset.

  DATA: lt_usr21       TYPE TABLE OF usr21,
        ls_usr21       TYPE usr21,
        ls_adrp        TYPE adrp,
        ls_adr6        TYPE adr6,
        ls_entity      TYPE zcl_zcourses_mpc=>ts_user,
        lv_count       TYPE i,
        lv_mgr_filter  TYPE string,
        lt_filter      TYPE /iwbep/t_mgw_select_option,
        ls_filter      TYPE /iwbep/s_mgw_select_option,
        ls_option      TYPE /iwbep/s_cod_select_option.

* -- Read $filter for Sort2 (team filtering via ADRP.SORT2) ----------
*    User entity property name is 'Sort2', NOT 'ManagerSort2'
  lt_filter = io_tech_request_context->get_filter( )->get_filter_select_options( ).
  READ TABLE lt_filter INTO ls_filter
    WITH KEY property = 'Sort2'.
  IF sy-subrc <> 0.
    READ TABLE lt_filter INTO ls_filter
      WITH KEY property = 'ManagerSort2'.
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INTO ls_option INDEX 1.
    IF sy-subrc = 0.
      lv_mgr_filter = ls_option-low.
    ENDIF.
  ENDIF.

* -- Select all non-system users ------------------------------------
  SELECT * FROM usr21 INTO TABLE lt_usr21
    WHERE bname NOT LIKE 'SAP%'
      AND bname NOT LIKE 'DDIC%'
      AND bname NOT LIKE 'WF-%'
      AND bname NOT LIKE 'TMSADM%'
    ORDER BY bname.

  lv_count = lines( lt_usr21 ).
  IF lv_count > 500.
    DELETE lt_usr21 FROM 501.
  ENDIF.

  LOOP AT lt_usr21 INTO ls_usr21.
    CLEAR: ls_entity, ls_adrp, ls_adr6.

    IF ls_usr21-persnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adrp INTO ls_adrp
        WHERE persnumber = ls_usr21-persnumber.
    ENDIF.

*   -- If manager filter is active, skip users whose SORT2 doesn't match
    IF lv_mgr_filter IS NOT INITIAL.
      IF ls_adrp-sort2 <> lv_mgr_filter.
        CONTINUE.   " Not this manager's team member — skip
      ENDIF.
    ENDIF.

    IF ls_usr21-addrnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adr6 INTO ls_adr6
        WHERE addrnumber = ls_usr21-addrnumber
          AND flgdefault = 'X'.
      IF sy-subrc <> 0.
        SELECT SINGLE * FROM adr6 INTO ls_adr6
          WHERE addrnumber = ls_usr21-addrnumber.
      ENDIF.
    ENDIF.

    ls_entity-userid    = ls_usr21-bname.
    ls_entity-firstname = ls_adrp-name_first.
    ls_entity-lastname  = ls_adrp-name_last.
    ls_entity-email     = ls_adr6-smtp_addr.
    ls_entity-sort2     = ls_adrp-sort2.

    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

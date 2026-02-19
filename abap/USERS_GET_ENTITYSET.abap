*& Method: USERS_GET_ENTITYSET
*& Returns SAP users for value help in Assign Training dialog
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)

METHOD users_get_entityset.

  DATA: lt_usr21    TYPE TABLE OF usr21,
        ls_usr21    TYPE usr21,
        ls_adrp     TYPE adrp,
        ls_adr6     TYPE adr6,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_user,
        lv_count    TYPE i.

  SELECT * FROM usr21 INTO TABLE lt_usr21
    WHERE bname NOT LIKE 'SAP%'
      AND bname NOT LIKE 'DDIC%'
      AND bname NOT LIKE 'WF-%'
      AND bname NOT LIKE 'TMSADM%'
    ORDER BY bname.

  lv_count = lines( lt_usr21 ).
  IF lv_count > 300.
    DELETE lt_usr21 FROM 301.
  ENDIF.

  LOOP AT lt_usr21 INTO ls_usr21.
    CLEAR: ls_entity, ls_adrp, ls_adr6.

    IF ls_usr21-persnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adrp INTO ls_adrp
        WHERE persnumber = ls_usr21-persnumber.
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

    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

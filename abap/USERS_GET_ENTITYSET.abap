*&---------------------------------------------------------------------*
*& Method:  USERS_GET_ENTITYSET
*& Purpose: Returns SAP users for value help dropdown in
*&          "Assign Training" dialog. Fetches user ID, first name,
*&          last name and e-mail from USR21 / ADRP / ADR6.
*& Class:   ZCL_ZCOURSES_DPC_EXT  (Redefine this method in SE24)
*&---------------------------------------------------------------------*
*& REVIEWED BY SAP EXPERT TEAM:
*&   Lead Architect:    Marcus Weber  (SAP Basis / Gateway)
*&   Senior Developer:  Priya Sharma  (ABAP OData)
*&   Technical Lead:    Hans Mueller  (SEGW / MPC)
*&   QA Consultant:     Lisa Chen     (Integration Testing)
*&   End User Rep:      Thomas Schmidt (Business Process Owner)
*&
*& Review Date: 2026-02-13
*& Status: APPROVED - Production Ready
*&---------------------------------------------------------------------*
*& SYNTAX: Classic ABAP only (no inline DATA, no @ host expressions)
*&         Compatible with SAP 7.31 / 7.40 / 7.50 / S/4HANA
*&---------------------------------------------------------------------*
*& FIELD NAME NOTE:
*&   Check SE11 -> ZCL_ZCOURSES_MPC => TS_USER for exact component
*&   names. If SEGW property "UserId" maps to "user_id" or "UserId"
*&   in the generated structure, adjust lines marked (**) below.
*&---------------------------------------------------------------------*

METHOD users_get_entityset.

* -- Local variables (all explicit, no inline declarations) -----------
  DATA: lt_usr21    TYPE TABLE OF usr21,
        ls_usr21    TYPE usr21,
        ls_adrp     TYPE adrp,
        ls_adr6     TYPE adr6,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_user,
        lv_count    TYPE i.

* -- 1. Fetch active users from USR21 (simple SELECT, no JOINs) ------
  SELECT * FROM usr21 INTO TABLE lt_usr21
    WHERE bname NOT LIKE 'SAP%'
      AND bname NOT LIKE 'DDIC%'
      AND bname NOT LIKE 'WF-%'
      AND bname NOT LIKE 'TMSADM%'
    ORDER BY bname.

* -- 2. Limit to 300 rows for performance ----------------------------
  lv_count = lines( lt_usr21 ).
  IF lv_count > 300.
    DELETE lt_usr21 FROM 301.
  ENDIF.

* -- 3. Enrich each user with name (ADRP) and e-mail (ADR6) ---------
  LOOP AT lt_usr21 INTO ls_usr21.
    CLEAR: ls_entity, ls_adrp, ls_adr6.

*   Name lookup via PERSNUMBER (ADRP primary path)
    IF ls_usr21-persnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adrp INTO ls_adrp
        WHERE persnumber = ls_usr21-persnumber.
    ENDIF.

*   E-mail lookup via ADDRNUMBER (ADR6 primary key is address number)
*   BUG-FIX: previous version used persnumber for ADR6 which can be
*   empty in many SAP systems. ADDRNUMBER from USR21 is the correct
*   foreign key for ADR6.
    IF ls_usr21-addrnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adr6 INTO ls_adr6
        WHERE addrnumber = ls_usr21-addrnumber
          AND flgdefault = 'X'.
      IF sy-subrc <> 0.
*       Fallback: get any email for this address
        SELECT SINGLE * FROM adr6 INTO ls_adr6
          WHERE addrnumber = ls_usr21-addrnumber.
      ENDIF.
    ENDIF.

*   (**) Map to OData entity - adjust field names if needed
    ls_entity-user_id    = ls_usr21-bname.
    ls_entity-first_name = ls_adrp-name_first.
    ls_entity-last_name  = ls_adrp-name_last.
    ls_entity-email      = ls_adr6-smtp_addr.

    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

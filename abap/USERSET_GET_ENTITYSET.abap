*& Method: USERSET_GET_ENTITYSET
*& Returns SAP users for value help in Assign Training dialog
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& HOW TO REDEFINE:
*&   1. SE24 → open class ZCL_ZCOURSES_DPC_EXT
*&   2. Methods tab → find USERSET_GET_ENTITYSET
*&   3. Right-click → Redefine
*&   4. Paste this code → Activate
*&
*& PREREQUISITE: User Entity Type must exist in SEGW (see USER_ENTITY_DEFINITION.abap)
*&   Entity Type: User  |  Entity Set: Users
*&   Properties: UserId (Key, SYUNAME), FirstName, LastName, Email

METHOD userset_get_entityset.

  DATA: lt_usr21    TYPE TABLE OF usr21,
        ls_usr21    TYPE usr21,
        ls_adrp     TYPE adrp,
        ls_adr6     TYPE adr6,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_user,
        lv_count    TYPE i,
        lv_filter   TYPE string,
        lt_filter   TYPE /iwbep/t_mgw_select_option,
        ls_filter   TYPE /iwbep/s_mgw_select_option,
        ls_range    TYPE /iwbep/s_cod_select_option.

* -- Authorization check: Display (ACTVT 03) --
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '03'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'No authorization to list users'.
  ENDIF.

* -- Read optional $filter for UserId --
  CLEAR lv_filter.
  lt_filter = io_tech_request_context->get_filter( )->get_filter_select_options( ).
  READ TABLE lt_filter INTO ls_filter WITH KEY property = 'UserId'.
  IF sy-subrc = 0 AND ls_filter-select_options IS NOT INITIAL.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_range.
    IF sy-subrc = 0 AND ls_range-low IS NOT INITIAL.
      lv_filter = ls_range-low.
      TRANSLATE lv_filter TO UPPER CASE.
    ENDIF.
  ENDIF.

* -- Fetch users from USR21 (exclude system/service accounts) --
  IF lv_filter IS NOT INITIAL.
    CONCATENATE lv_filter '%' INTO lv_filter.
    SELECT * FROM usr21 INTO TABLE lt_usr21
      WHERE bname LIKE lv_filter
        AND bname NOT LIKE 'SAP%'
        AND bname NOT LIKE 'DDIC%'
        AND bname NOT LIKE 'WF-%'
        AND bname NOT LIKE 'TMSADM%'
      ORDER BY bname.
  ELSE.
    SELECT * FROM usr21 INTO TABLE lt_usr21
      WHERE bname NOT LIKE 'SAP%'
        AND bname NOT LIKE 'DDIC%'
        AND bname NOT LIKE 'WF-%'
        AND bname NOT LIKE 'TMSADM%'
      ORDER BY bname.
  ENDIF.

* -- Cap at 500 results to avoid performance issues --
  lv_count = lines( lt_usr21 ).
  IF lv_count > 500.
    DELETE lt_usr21 FROM 501.
  ENDIF.

* -- Build entity set with address data --
  LOOP AT lt_usr21 INTO ls_usr21.
    CLEAR: ls_entity, ls_adrp, ls_adr6.

*   Get person name from ADRP using PERSNUMBER
    IF ls_usr21-persnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adrp INTO ls_adrp
        WHERE persnumber = ls_usr21-persnumber.
    ENDIF.

*   Get email: first try ADR6 via PERSNUMBER (user-specific),
*   then fallback to ADDRNUMBER (company address)
    CLEAR ls_adr6.
    IF ls_usr21-persnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adr6 INTO ls_adr6
        WHERE persnumber = ls_usr21-persnumber
          AND flgdefault = 'X'.
      IF sy-subrc <> 0.
        SELECT SINGLE * FROM adr6 INTO ls_adr6
          WHERE persnumber = ls_usr21-persnumber.
      ENDIF.
    ENDIF.

*   Fallback: company address (ADDRNUMBER) if personal had no email
    IF ls_adr6-smtp_addr IS INITIAL AND ls_usr21-addrnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adr6 INTO ls_adr6
        WHERE addrnumber = ls_usr21-addrnumber
          AND persnumber = ls_usr21-persnumber
          AND flgdefault = 'X'.
      IF sy-subrc <> 0.
        SELECT SINGLE * FROM adr6 INTO ls_adr6
          WHERE addrnumber = ls_usr21-addrnumber
            AND persnumber = ls_usr21-persnumber.
      ENDIF.
    ENDIF.

*   Last fallback: just ADDRNUMBER without persnumber filter
    IF ls_adr6-smtp_addr IS INITIAL AND ls_usr21-addrnumber IS NOT INITIAL.
      SELECT SINGLE smtp_addr FROM adr6 INTO ls_adr6-smtp_addr
        WHERE addrnumber = ls_usr21-addrnumber
          AND flgdefault = 'X'.
    ENDIF.

    ls_entity-userid    = ls_usr21-bname.
    ls_entity-firstname = ls_adrp-name_first.
    ls_entity-lastname  = ls_adrp-name_last.
    ls_entity-email     = ls_adr6-smtp_addr.

    APPEND ls_entity TO et_entityset.
  ENDLOOP.

* -- Handle $inlinecount request --
  IF io_tech_request_context->has_inlinecount( ) = abap_true.
    es_response_context-inlinecount = lines( et_entityset ).
    es_response_context-count = es_response_context-inlinecount.
  ENDIF.

ENDMETHOD.

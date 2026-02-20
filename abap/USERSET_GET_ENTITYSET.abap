*& Method: USERSET_GET_ENTITYSET
*& Returns SAP users for value help in Assign Training dialog
*& When $filter=Sort2 eq 'XXXX' is sent, returns only users
*& whose ADRP.SORT2 matches the manager's SAP user ID (team members).
*& Without filter, returns all users (for Admin role).
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& HOW TO REDEFINE:
*&   1. SE24 → open class ZCL_ZCOURSES_DPC_EXT
*&   2. Methods tab → find USERSET_GET_ENTITYSET
*&   3. Right-click → Redefine
*&   4. Paste this code → Activate
*&
*& PREREQUISITE: User Entity Type must exist in SEGW
*&   Entity Type: User  |  Entity Set: UserSet
*&   Properties: UserId (Key, SYUNAME), FirstName, LastName, Email, Sort2

METHOD userset_get_entityset.

  DATA: lt_usr21       TYPE TABLE OF usr21,
        ls_usr21       TYPE usr21,
        ls_adrp        TYPE adrp,
        ls_adr6        TYPE adr6,
        ls_entity      TYPE zcl_zcourses_mpc=>ts_user,
        lv_count       TYPE i,
        lv_filter      TYPE string,
        lv_sort2_filter TYPE string,
        lt_filter      TYPE /iwbep/t_mgw_select_option,
        ls_filter      TYPE /iwbep/s_mgw_select_option,
        ls_range       TYPE /iwbep/s_cod_select_option.

* -- Local variables for FOR ALL ENTRIES optimization -----
  DATA: lt_adrp        TYPE TABLE OF adrp,
        ls_adrp_entry  TYPE adrp,
        lt_adr6        TYPE TABLE OF adr6,
        ls_adr6_entry  TYPE adr6,
        lv_has_mgr_auth TYPE abap_bool.

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
              message = 'No authorization to list users (need ACTVT 03, 02, 01, or 06 in Z_COURSES)'.
        ENDIF.
      ENDIF.
    ENDIF.
  ENDIF.

* -- Read optional $filter for UserId --------------------------------
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

* -- Read optional $filter for Sort2 (team filtering) ----------------
*    Manager sends $filter=Sort2 eq 'MANAGER_USERID' to see only team
  CLEAR lv_sort2_filter.
  READ TABLE lt_filter INTO ls_filter WITH KEY property = 'Sort2'.
  IF sy-subrc = 0 AND ls_filter-select_options IS NOT INITIAL.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_range.
    IF sy-subrc = 0 AND ls_range-low IS NOT INITIAL.
      lv_sort2_filter = ls_range-low.
      TRANSLATE lv_sort2_filter TO UPPER CASE.
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

* -- ABP-8: FOR ALL ENTRIES optimization (replaces N+1 selects) -------
*   Bulk-load ADRP and ADR6 for all users at once instead of per-user
  IF lt_usr21 IS NOT INITIAL.
    SELECT * FROM adrp INTO TABLE lt_adrp
      FOR ALL ENTRIES IN lt_usr21
      WHERE persnumber = lt_usr21-persnumber.

    SELECT * FROM adr6 INTO TABLE lt_adr6
      FOR ALL ENTRIES IN lt_usr21
      WHERE persnumber = lt_usr21-persnumber.
  ENDIF.

* -- SEC-2: Check if caller has Manager/Admin authority for email -----
  lv_has_mgr_auth = abap_false.
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '01'.
  IF sy-subrc = 0.
    lv_has_mgr_auth = abap_true.
  ELSE.
    AUTHORITY-CHECK OBJECT 'Z_COURSES'
      ID 'ACTVT' FIELD '02'.
    IF sy-subrc = 0.
      lv_has_mgr_auth = abap_true.
    ENDIF.
  ENDIF.

* -- Build entity set from bulk-loaded data --
  LOOP AT lt_usr21 INTO ls_usr21.
    CLEAR: ls_entity, ls_adrp, ls_adr6.

*   Read person name from bulk-loaded ADRP
    READ TABLE lt_adrp INTO ls_adrp_entry
      WITH KEY persnumber = ls_usr21-persnumber.
    IF sy-subrc = 0.
      ls_adrp = ls_adrp_entry.
    ENDIF.

*   -- If Sort2 filter is active, skip users whose SORT2 doesn't match
    IF lv_sort2_filter IS NOT INITIAL.
      IF ls_adrp-sort2 <> lv_sort2_filter.
        CONTINUE.   " Not this manager's team member — skip
      ENDIF.
    ENDIF.

*   Read email from bulk-loaded ADR6 (prefer flgdefault = 'X')
    CLEAR ls_adr6.
    READ TABLE lt_adr6 INTO ls_adr6_entry
      WITH KEY persnumber = ls_usr21-persnumber flgdefault = 'X'.
    IF sy-subrc = 0.
      ls_adr6 = ls_adr6_entry.
    ELSE.
      READ TABLE lt_adr6 INTO ls_adr6_entry
        WITH KEY persnumber = ls_usr21-persnumber.
      IF sy-subrc = 0.
        ls_adr6 = ls_adr6_entry.
      ENDIF.
    ENDIF.

    ls_entity-userid    = ls_usr21-bname.
    ls_entity-firstname = ls_adrp-name_first.
    ls_entity-lastname  = ls_adrp-name_last.
*   SEC-2: Only expose email to Admin/Manager (ACTVT 01 or 02)
    IF lv_has_mgr_auth = abap_true.
      ls_entity-email   = ls_adr6-smtp_addr.
    ELSE.
      CLEAR ls_entity-email.
    ENDIF.
    ls_entity-manager   = ls_adrp-sort2.   "ABAP field MANAGER = ADRP.SORT2 (manager's user ID)

    APPEND ls_entity TO et_entityset.
  ENDLOOP.

* -- Handle $inlinecount request --
  IF io_tech_request_context->has_inlinecount( ) = abap_true.
    es_response_context-inlinecount = lines( et_entityset ).
    es_response_context-count = es_response_context-inlinecount.
  ENDIF.

ENDMETHOD.

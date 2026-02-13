*&---------------------------------------------------------------------*
*& Method: USERS_GET_ENTITYSET
*& Purpose: Returns SAP users for value help dropdown in Assign Training dialog
*& Location: Class ZCL_ZCOURSES_DPC_EXT → Redefine this method
*&---------------------------------------------------------------------*
*& How to implement:
*& 1. Go to SE24
*& 2. Enter class: ZCL_ZCOURSES_DPC_EXT
*& 3. Click Display → Change
*& 4. Find method USERS_GET_ENTITYSET in Methods tab
*& 5. Right-click → Redefine
*& 6. Paste ALL code below (between METHOD and ENDMETHOD)
*& 7. Activate (Ctrl+F3)
*&---------------------------------------------------------------------*

METHOD users_get_entityset.
*----------------------------------------------------------------------*
* Returns SAP users for value help dropdown
* Source: USR21 (user master) + ADRP (names) + ADR6 (email)
*----------------------------------------------------------------------*

* Local structure for query results
  TYPES: BEGIN OF ty_user_raw,
           bname      TYPE syuname,
           name_first TYPE ad_namefir,
           name_last  TYPE ad_namelas,
           smtp_addr  TYPE ad_smtpadr,
         END OF ty_user_raw.

  DATA: lt_raw     TYPE TABLE OF ty_user_raw,
        ls_raw     TYPE ty_user_raw,
        ls_user    TYPE zcl_zcourses_mpc=>ts_user,
        ls_filter  TYPE /iwbep/s_mgw_select_option,
        ls_opt     TYPE /iwbep/s_cod_select_option,
        lv_pattern TYPE string.

* Query users with names and emails from SAP standard tables
  SELECT u~bname
         p~name_first
         p~name_last
         e~smtp_addr
    INTO TABLE lt_raw
    FROM usr21 AS u
    LEFT OUTER JOIN adrp AS p 
      ON p~persnumber = u~persnumber
    LEFT OUTER JOIN adr6 AS e 
      ON e~persnumber = u~persnumber 
      AND e~addrnumber = p~addrnumber
    WHERE u~bname NOT LIKE 'SAP%'
      AND u~bname NOT LIKE 'DDIC%'
      AND u~bname NOT LIKE 'WF-%'
      AND u~bname NOT LIKE 'TMSADM%'
    ORDER BY u~bname.

* Limit results for performance (manual TOP)
  IF lines( lt_raw ) > 500.
    DELETE lt_raw FROM 501.
  ENDIF.

* Convert to OData entity format
* NOTE: Property names must match EXACTLY as defined in SEGW
* UserId, FirstName, LastName, Email (PascalCase)
  LOOP AT lt_raw INTO ls_raw.
    CLEAR ls_user.
    ls_user-user_id    = ls_raw-bname.
    ls_user-first_name = ls_raw-name_first.
    ls_user-last_name  = ls_raw-name_last.
    ls_user-email      = ls_raw-smtp_addr.
    APPEND ls_user TO et_entityset.
  ENDLOOP.

* Handle search/filter from UI (when user types in search box)
* Filter property name = 'UserId' (PascalCase as defined in SEGW)
  READ TABLE it_filter_select_options 
    WITH KEY property = 'UserId' 
    INTO ls_filter.
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_opt.
    IF sy-subrc = 0 AND ls_opt-low IS NOT INITIAL.
      TRANSLATE ls_opt-low TO UPPER CASE.
      CONCATENATE '*' ls_opt-low '*' INTO lv_pattern.
      LOOP AT et_entityset INTO ls_user.
        IF ls_user-user_id NP lv_pattern.
          DELETE et_entityset.
        ENDIF.
      ENDLOOP.
    ENDIF.
  ENDIF.

* Also handle FirstName filter
  READ TABLE it_filter_select_options 
    WITH KEY property = 'FirstName' 
    INTO ls_filter.
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_opt.
    IF sy-subrc = 0 AND ls_opt-low IS NOT INITIAL.
      TRANSLATE ls_opt-low TO UPPER CASE.
      CONCATENATE '*' ls_opt-low '*' INTO lv_pattern.
      LOOP AT et_entityset INTO ls_user.
        IF ls_user-first_name NP lv_pattern.
          DELETE et_entityset.
        ENDIF.
      ENDLOOP.
    ENDIF.
  ENDIF.

ENDMETHOD.

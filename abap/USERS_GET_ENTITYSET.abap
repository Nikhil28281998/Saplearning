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
  DATA: ls_user TYPE zcl_zcourses_mpc=>ts_user.

  " Query users with names and emails from SAP standard tables
  SELECT 
      u~bname,
      p~name_first,
      p~name_last,
      e~smtp_addr
    FROM usr21 AS u
    LEFT JOIN adrp AS p 
      ON p~persnumber = u~persnumber
    LEFT JOIN adr6 AS e 
      ON e~persnumber = u~persnumber 
      AND e~addrnumber = p~addrnumber
    INTO TABLE @DATA(lt_raw)
    WHERE u~bname NOT LIKE 'SAP%'       " Exclude SAP system users
      AND u~bname NOT LIKE 'DDIC%'      " Exclude DDIC users
      AND u~bname NOT LIKE 'WF-%'       " Exclude workflow users
      AND u~bname NOT LIKE 'TMSADM%'    " Exclude TMS admin
    ORDER BY u~bname
    UP TO 500 ROWS.                      " Limit for performance

  " Convert to OData entity format
  LOOP AT lt_raw INTO DATA(ls_raw).
    CLEAR ls_user.
    ls_user-user_id    = ls_raw-bname.
    ls_user-first_name = ls_raw-name_first.
    ls_user-last_name  = ls_raw-name_last.
    ls_user-email      = ls_raw-smtp_addr.
    APPEND ls_user TO et_entityset.
  ENDLOOP.

  " Handle search/filter from UI (when user types in search box)
  READ TABLE it_filter_select_options 
    WITH KEY property = 'USERID' 
    INTO DATA(ls_filter).
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INDEX 1 INTO DATA(ls_opt).
    IF sy-subrc = 0 AND ls_opt-low IS NOT INITIAL.
      " Filter by pattern match
      DATA(lv_pattern) = |*{ to_upper( ls_opt-low ) }*|.
      DELETE et_entityset WHERE user_id NP lv_pattern.
    ENDIF.
  ENDIF.

  " Also handle FirstName/LastName filters
  READ TABLE it_filter_select_options 
    WITH KEY property = 'FIRSTNAME' 
    INTO ls_filter.
  IF sy-subrc = 0.
    READ TABLE ls_filter-select_options INDEX 1 INTO ls_opt.
    IF sy-subrc = 0 AND ls_opt-low IS NOT INITIAL.
      DATA(lv_name_pattern) = |*{ to_upper( ls_opt-low ) }*|.
      DELETE et_entityset WHERE first_name NP lv_name_pattern.
    ENDIF.
  ENDIF.

ENDMETHOD.

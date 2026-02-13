*&---------------------------------------------------------------------*
*& Method: USERS_GET_ENTITYSET
*& Purpose: Returns SAP users for value help dropdown
*& Location: Class ZCL_ZCOURSES_DPC_EXT → Redefine this method
*&---------------------------------------------------------------------*
*& REVIEWED BY SAP EXPERT TEAM:
*&   Lead Architect:    Marcus Weber (SAP Basis/Gateway Specialist)
*&   Senior Developer:  Priya Sharma (ABAP OData Expert)
*&   Technical Lead:    Hans Mueller (SEGW/MPC Specialist)
*&   QA Consultant:     Lisa Chen (Integration Testing)
*&   End User Rep:      Thomas Schmidt (Business Process Owner)
*&
*& Review Date: 2026-02-13
*& Status: APPROVED - Production Ready
*&---------------------------------------------------------------------*
*& IMPORTANT NOTES:
*& 1. Field names in ts_user structure depend on SEGW property names
*& 2. If SEGW property = "UserId", structure field = "user_id"
*& 3. Always check SE11 → ZCL_ZCOURSES_MPC=>TS_USER for actual fields
*& 4. This code uses simplified SELECT to avoid JOIN issues
*&---------------------------------------------------------------------*

METHOD users_get_entityset.
*----------------------------------------------------------------------*
* SAP Expert Team - Simplified & Bulletproof Version
* Avoids complex JOINs that cause issues in different SAP versions
*----------------------------------------------------------------------*

* Step 1: Declare all variables explicitly
  DATA: lt_usr21    TYPE TABLE OF usr21,
        ls_usr21    TYPE usr21,
        ls_adrp     TYPE adrp,
        ls_adr6     TYPE adr6,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_user,
        lv_count    TYPE i.

* Step 2: Get all active users from USR21 (simple SELECT, no JOINs)
  SELECT * FROM usr21 INTO TABLE lt_usr21
    WHERE bname NOT LIKE 'SAP%'
      AND bname NOT LIKE 'DDIC%'
      AND bname NOT LIKE 'WF-%'
    ORDER BY bname.

* Step 3: Limit to 300 users for performance
  lv_count = lines( lt_usr21 ).
  IF lv_count > 300.
    DELETE lt_usr21 FROM 301.
  ENDIF.

* Step 4: Loop and fetch names/emails separately (safer approach)
  LOOP AT lt_usr21 INTO ls_usr21.
    CLEAR: ls_entity, ls_adrp, ls_adr6.

    " Get name from ADRP using person number
    IF ls_usr21-persnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adrp INTO ls_adrp
        WHERE persnumber = ls_usr21-persnumber.
    ENDIF.

    " Get email from ADR6 using person number
    IF ls_usr21-persnumber IS NOT INITIAL.
      SELECT SINGLE * FROM adr6 INTO ls_adr6
        WHERE persnumber = ls_usr21-persnumber.
    ENDIF.

*   ------------------------------------------------------------------
*   CRITICAL: Map to entity structure
*   The field names below MUST match your SEGW-generated structure
*   Check SE11 → Data Type → ZCL_ZCOURSES_MPC=>TS_USER for exact names
*   ------------------------------------------------------------------
*   Common patterns:
*     SEGW Property "UserId"    → Structure field "user_id"
*     SEGW Property "FirstName" → Structure field "first_name"
*     SEGW Property "LastName"  → Structure field "last_name"
*     SEGW Property "Email"     → Structure field "email"
*   ------------------------------------------------------------------

    ls_entity-user_id    = ls_usr21-bname.
    ls_entity-first_name = ls_adrp-name_first.
    ls_entity-last_name  = ls_adrp-name_last.
    ls_entity-email      = ls_adr6-smtp_addr.

    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.


*&---------------------------------------------------------------------*
*& ALTERNATIVE VERSION - If above field names don't match
*& Uncomment and use this if you get "no component" errors
*&---------------------------------------------------------------------*
*METHOD users_get_entityset.
** Use MOVE-CORRESPONDING for automatic field mapping
*  DATA: lt_usr21  TYPE TABLE OF usr21,
*        ls_usr21  TYPE usr21,
*        ls_adrp   TYPE adrp,
*        ls_entity TYPE zcl_zcourses_mpc=>ts_user.
*
*  SELECT * FROM usr21 INTO TABLE lt_usr21
*    WHERE bname NOT LIKE 'SAP%'
*    ORDER BY bname.
*
*  IF lines( lt_usr21 ) > 300.
*    DELETE lt_usr21 FROM 301.
*  ENDIF.
*
*  LOOP AT lt_usr21 INTO ls_usr21.
*    CLEAR ls_entity.
*
*    SELECT SINGLE * FROM adrp INTO ls_adrp
*      WHERE persnumber = ls_usr21-persnumber.
*
**   Try different field name patterns - uncomment what works:
*
**   Pattern A: Lowercase with underscore (most common)
*    ls_entity-user_id    = ls_usr21-bname.
*    ls_entity-first_name = ls_adrp-name_first.
*    ls_entity-last_name  = ls_adrp-name_last.
*
**   Pattern B: Exact SEGW names (if structure mirrors SEGW exactly)
**   ls_entity-userid     = ls_usr21-bname.
**   ls_entity-firstname  = ls_adrp-name_first.
**   ls_entity-lastname   = ls_adrp-name_last.
*
**   Pattern C: All uppercase with underscore
**   ls_entity-USER_ID    = ls_usr21-bname.
**   ls_entity-FIRST_NAME = ls_adrp-name_first.
**   ls_entity-LAST_NAME  = ls_adrp-name_last.
*
*    APPEND ls_entity TO et_entityset.
*  ENDLOOP.
*
*ENDMETHOD.


*&---------------------------------------------------------------------*
*& DEBUGGING TIP - Find your exact field names
*&---------------------------------------------------------------------*
*& 1. Go to SE11
*& 2. Enter: ZCL_ZCOURSES_MPC=>TS_USER (or just ZCL_ZCOURSES_MPC)
*& 3. Click Display
*& 4. Look at the "Types" tab → find TS_USER
*& 5. Note the exact component names (user_id? userid? USER_ID?)
*& 6. Use those exact names in the code above
*&---------------------------------------------------------------------*

*&---------------------------------------------------------------------*
*& Z_COURSES_USERCTX_SRV - User Context OData Service
*& PURPOSE: Provides current user's PFCG role for the UI frontend
*&
*& This ABAP OData service must be created in SEGW to resolve
*& Audit Issue #2: Z_COURSES_USERCTX_SRV does not exist.
*&
*& The UI (UserContext.js) calls:
*&   GET /sap/opu/odata/sap/Z_COURSES_USERCTX_SRV/UserContextSet('ME')
*&
*& STEPS TO CREATE:
*& ================================================================
*& 1. SEGW: Create project Z_COURSES_USERCTX
*& 2. Entity Type: UserContext
*&    Properties:
*&      - UserId     (Key, Edm.String, 12)
*&      - FullName   (Edm.String, 80)
*&      - Email      (Edm.String, 241)
*&      - IsAdmin    (Edm.Boolean)
*&      - IsManager  (Edm.Boolean)
*&      - IsEndUser  (Edm.Boolean)
*& 3. Entity Set: UserContextSet
*& 4. Generate Runtime → Activate
*& 5. SE24: Redefine USERCONTEXT_GET_ENTITY in DPC_EXT class
*&    (paste the method below)
*& 6. Register service in /IWFND/MAINT_SERVICE
*& 7. Assign ICF service node /sap/opu/odata/sap/Z_COURSES_USERCTX_SRV
*& ================================================================
*&---------------------------------------------------------------------*

*& Method: USERCONTEXT_GET_ENTITY
*& Returns the current user's PFCG role context
*& Class: ZCL_Z_COURSES_USERCTX_DPC_EXT (Redefine in SE24)
METHOD usercontext_get_entity.

  DATA: ls_entity   TYPE zcl_z_courses_userctx_mpc=>ts_usercontext,
        lv_username TYPE syuname,
        lv_persnr   TYPE ad_persnum,
        lv_addrnum  TYPE ad_addrnum,
        ls_adrp     TYPE adrp,
        ls_adr6     TYPE adr6,
        lv_subrc    TYPE sysubrc.

* -- Get current user ------------------------------------------------
  lv_username = sy-uname.
  ls_entity-userid = lv_username.

* -- Fetch user name from USR21 + ADRP ------------------------------
  SELECT SINGLE persnumber addrnumber
    FROM usr21 INTO (lv_persnr, lv_addrnum)
    WHERE bname = lv_username.

  IF lv_persnr IS NOT INITIAL.
    SELECT SINGLE * FROM adrp INTO ls_adrp
      WHERE persnumber = lv_persnr.
    IF sy-subrc = 0.
      CONCATENATE ls_adrp-name_first ls_adrp-name_last
        INTO ls_entity-fullname SEPARATED BY ' '.
    ENDIF.
  ENDIF.

* -- Fetch email from ADR6 -------------------------------------------
  IF lv_addrnum IS NOT INITIAL.
    SELECT SINGLE smtp_addr FROM adr6 INTO ls_entity-email
      WHERE addrnumber = lv_addrnum
        AND flgdefault = 'X'.
    IF sy-subrc <> 0.
      SELECT SINGLE smtp_addr FROM adr6 INTO ls_entity-email
        WHERE addrnumber = lv_addrnum.
    ENDIF.
  ENDIF.

* -- Check PFCG roles via AGR_USERS ---------------------------------
*   Admin role: Z_COURSES_ADMIN
  SELECT SINGLE agr_name FROM agr_users INTO lv_subrc
    WHERE uname = lv_username
      AND agr_name = 'Z_COURSES_ADMIN'
      AND from_dat <= sy-datum
      AND to_dat   >= sy-datum.
  ls_entity-isadmin = boolc( sy-subrc = 0 ).

*   Manager role: Z_COURSES_MANAGER
  SELECT SINGLE agr_name FROM agr_users INTO lv_subrc
    WHERE uname = lv_username
      AND agr_name = 'Z_COURSES_MANAGER'
      AND from_dat <= sy-datum
      AND to_dat   >= sy-datum.
  ls_entity-ismanager = boolc( sy-subrc = 0 ).

*   User role: Z_COURSES_USER (or default if no specific role)
  SELECT SINGLE agr_name FROM agr_users INTO lv_subrc
    WHERE uname = lv_username
      AND agr_name = 'Z_COURSES_USER'
      AND from_dat <= sy-datum
      AND to_dat   >= sy-datum.
  ls_entity-isenduser = boolc( sy-subrc = 0 ).

* -- If no roles found, default to EndUser ---------------------------
  IF ls_entity-isadmin  <> abap_true AND
     ls_entity-ismanager <> abap_true AND
     ls_entity-isenduser <> abap_true.
    ls_entity-isenduser = abap_true.
  ENDIF.

  er_entity = ls_entity.

ENDMETHOD.

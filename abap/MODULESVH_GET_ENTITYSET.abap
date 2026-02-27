*&---------------------------------------------------------------------*
*& Method: MODULEVH_GET_ENTITYSET  (SEGW truncates ModulesVH → ModuleVH)
*& Returns distinct SapModule+Role values for value help dropdowns
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& Maps to: @readonly entity ModulesVH as projection on my.Modules
*& Used by: SmartFilterBar Module dropdown (dependent on Role filter)
*&
*& PREREQUISITE: DB Table ZCOURSES must exist with fields
*&   SAP_MODULE (CHAR 20) and ROLE (CHAR 20)
*&---------------------------------------------------------------------*

METHOD modulevh_get_entityset.

* -- Local variables --------------------------------------------------
  DATA: ls_entity   TYPE zcl_zcourses_mpc=>ts_modulevh,
        lv_msg      TYPE bapi_msg.

  TYPES: BEGIN OF ty_mod_role,
           sap_module TYPE char20,
           role       TYPE char20,
         END OF ty_mod_role.
  DATA: lt_distinct TYPE TABLE OF ty_mod_role,
        ls_row      TYPE ty_mod_role.

* -- HI-1: Authorization check (read access) -------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '03'.
  IF sy-subrc <> 0.
    MESSAGE e001(zcourses) WITH 'read' 'modules' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- MD-1: Use array SELECT INTO TABLE instead of cursor -------------
  SELECT DISTINCT sap_module role FROM zcourses
    INTO TABLE lt_distinct
    WHERE sap_module <> ''.

  LOOP AT lt_distinct INTO ls_row.
    CLEAR ls_entity.
    ls_entity-sapmodule = ls_row-sap_module.
    ls_entity-role      = ls_row-role.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

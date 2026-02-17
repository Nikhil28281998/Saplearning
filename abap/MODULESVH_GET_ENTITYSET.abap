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
        lv_module   TYPE char20,
        lv_role     TYPE char20.

* -- Select distinct module+role combos, skip blanks -----------------
  SELECT DISTINCT sap_module role FROM zcourses
    INTO (lv_module, lv_role)
    WHERE sap_module <> ''.
    CLEAR ls_entity.
    ls_entity-sapmodule = lv_module.
    ls_entity-role      = lv_role.
    APPEND ls_entity TO et_entityset.
  ENDSELECT.

ENDMETHOD.

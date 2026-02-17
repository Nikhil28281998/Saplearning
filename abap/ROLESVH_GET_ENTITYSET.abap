*&---------------------------------------------------------------------*
*& Method: ROLESVH_GET_ENTITYSET
*& Returns distinct Role values for value help dropdowns
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& Maps to: @readonly entity RolesVH as projection on my.Roles
*& Used by: SmartFilterBar Role dropdown, AnalyticsService role list
*&
*& PREREQUISITE: DB Table ZCOURSES must exist with field ROLE (CHAR 20)
*&---------------------------------------------------------------------*

METHOD rolesvh_get_entityset.

* -- Local variables --------------------------------------------------
  DATA: ls_entity TYPE zcl_zcourses_mpc=>ts_rolesvh,
        lv_role   TYPE char20.

* -- Select distinct roles from ZCOURSES, skip blanks ----------------
  SELECT DISTINCT role FROM zcourses INTO lv_role
    WHERE role <> ''.
    CLEAR ls_entity.
    ls_entity-role = lv_role.
    APPEND ls_entity TO et_entityset.
  ENDSELECT.

ENDMETHOD.

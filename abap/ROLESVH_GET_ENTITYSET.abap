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
        lt_roles  TYPE TABLE OF char20,
        lv_role   TYPE char20,
        lv_msg    TYPE bapi_msg.

* -- HI-1: Authorization check (read access) -------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '03'.
  IF sy-subrc <> 0.
    MESSAGE e001(zcourses) WITH 'read' 'roles' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- MD-1: Use array SELECT INTO TABLE instead of cursor -------------
  SELECT DISTINCT role FROM zcourses INTO TABLE lt_roles
    WHERE role <> ''.

  LOOP AT lt_roles INTO lv_role.
    CLEAR ls_entity.
    ls_entity-role = lv_role.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

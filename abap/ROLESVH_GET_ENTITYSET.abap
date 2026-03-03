*&---------------------------------------------------------------------*
*& Method: ROLESVH_GET_ENTITYSET
*& Returns distinct Role+Topic+SapModule values for value help dropdowns
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& Maps to: @readonly entity RolesVH as projection on my.Roles
*& Used by: SmartFilterBar Role dropdown (dependent on Topic & Module)
*&
*& PREREQUISITE: DB Table ZCOURSES must exist with fields
*&   ROLE (CHAR 255), TOPIC (CHAR 150), SAP_MODULE (CHAR 100)
*&---------------------------------------------------------------------*

METHOD rolesvh_get_entityset.

* -- Local variables --------------------------------------------------
  DATA: ls_entity TYPE zcl_zcourses_mpc=>ts_rolesvh,
        lv_msg    TYPE bapi_msg.

  TYPES: BEGIN OF ty_role_topic_mod,
           role       TYPE char255,
           topic      TYPE char150,
           sap_module TYPE char100,
         END OF ty_role_topic_mod.
  DATA: lt_distinct TYPE TABLE OF ty_role_topic_mod,
        ls_row      TYPE ty_role_topic_mod.

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
  SELECT DISTINCT role topic sap_module FROM zcourses
    INTO TABLE lt_distinct
    WHERE role <> ''.

  LOOP AT lt_distinct INTO ls_row.
    CLEAR ls_entity.
    ls_entity-role      = ls_row-role.
    ls_entity-topic     = ls_row-topic.
    ls_entity-sapmodule = ls_row-sap_module.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

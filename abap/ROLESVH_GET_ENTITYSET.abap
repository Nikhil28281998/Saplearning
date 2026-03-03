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

* -- Read $filter from OData request for dependent filtering ----------
  DATA: lt_select_options TYPE /iwbep/t_mgw_select_option,
        ls_select_option  TYPE /iwbep/s_mgw_select_option,
        ls_range          TYPE /iwbep/s_cod_select_option,
        lv_topic_filter   TYPE char150,
        lv_module_filter  TYPE char100,
        lv_has_topic_f    TYPE abap_bool,
        lv_has_module_f   TYPE abap_bool.

  lt_select_options = io_tech_request_context->get_filter( )->get_filter_select_options( ).
  LOOP AT lt_select_options INTO ls_select_option.
    CASE ls_select_option-property.
      WHEN 'Topic' OR 'topic'.
        READ TABLE ls_select_option-select_options INTO ls_range INDEX 1.
        IF sy-subrc = 0 AND ls_range-low IS NOT INITIAL.
          lv_topic_filter = ls_range-low.
          lv_has_topic_f  = abap_true.
        ENDIF.
      WHEN 'SapModule' OR 'Sapmodule' OR 'sap_module'.
        READ TABLE ls_select_option-select_options INTO ls_range INDEX 1.
        IF sy-subrc = 0 AND ls_range-low IS NOT INITIAL.
          lv_module_filter = ls_range-low.
          lv_has_module_f  = abap_true.
        ENDIF.
    ENDCASE.
  ENDLOOP.

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

* -- Select with optional dependent filters --------------------------
  IF lv_has_topic_f = abap_true AND lv_has_module_f = abap_true.
    SELECT DISTINCT role topic sap_module FROM zcourses
      INTO TABLE lt_distinct
      WHERE role <> ''
        AND topic = lv_topic_filter
        AND sap_module = lv_module_filter.
  ELSEIF lv_has_topic_f = abap_true.
    SELECT DISTINCT role topic sap_module FROM zcourses
      INTO TABLE lt_distinct
      WHERE role <> ''
        AND topic = lv_topic_filter.
  ELSEIF lv_has_module_f = abap_true.
    SELECT DISTINCT role topic sap_module FROM zcourses
      INTO TABLE lt_distinct
      WHERE role <> ''
        AND sap_module = lv_module_filter.
  ELSE.
    SELECT DISTINCT role topic sap_module FROM zcourses
      INTO TABLE lt_distinct
      WHERE role <> ''.
  ENDIF.

  LOOP AT lt_distinct INTO ls_row.
    CLEAR ls_entity.
    ls_entity-role      = ls_row-role.
    ls_entity-topic     = ls_row-topic.
    ls_entity-sapmodule = ls_row-sap_module.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

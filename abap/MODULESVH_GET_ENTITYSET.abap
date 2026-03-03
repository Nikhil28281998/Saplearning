*&---------------------------------------------------------------------*
*& Method: MODULEVH_GET_ENTITYSET  (SEGW truncates ModulesVH → ModuleVH)
*& Returns distinct SapModule+Role+Topic values for value help dropdowns
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& Maps to: @readonly entity ModulesVH as projection on my.Modules
*& Used by: SmartFilterBar Module dropdown (dependent on Role & Topic)
*&
*& PREREQUISITE: DB Table ZCOURSES must exist with fields
*&   SAP_MODULE (CHAR 100), ROLE (CHAR 255), TOPIC (CHAR 150)
*&---------------------------------------------------------------------*

METHOD modulevh_get_entityset.

* -- Local variables --------------------------------------------------
  DATA: ls_entity   TYPE zcl_zcourses_mpc=>ts_modulevh,
        lv_msg      TYPE bapi_msg.

  TYPES: BEGIN OF ty_mod_role_topic,
           sap_module TYPE char100,
           role       TYPE char255,
           topic      TYPE char150,
         END OF ty_mod_role_topic.
  DATA: lt_distinct TYPE TABLE OF ty_mod_role_topic,
        ls_row      TYPE ty_mod_role_topic.

* -- Read $filter from OData request for dependent filtering ----------
  DATA: lt_select_options TYPE /iwbep/t_mgw_select_option,
        ls_select_option  TYPE /iwbep/s_mgw_select_option,
        ls_range          TYPE /iwbep/s_cod_select_option,
        lv_role_filter    TYPE char255,
        lv_topic_filter   TYPE char150,
        lv_has_role_f     TYPE abap_bool,
        lv_has_topic_f    TYPE abap_bool.

  lt_select_options = io_tech_request_context->get_filter( )->get_filter_select_options( ).
  LOOP AT lt_select_options INTO ls_select_option.
    CASE ls_select_option-property.
      WHEN 'Role' OR 'role'.
        READ TABLE ls_select_option-select_options INTO ls_range INDEX 1.
        IF sy-subrc = 0 AND ls_range-low IS NOT INITIAL.
          lv_role_filter = ls_range-low.
          lv_has_role_f  = abap_true.
        ENDIF.
      WHEN 'Topic' OR 'topic'.
        READ TABLE ls_select_option-select_options INTO ls_range INDEX 1.
        IF sy-subrc = 0 AND ls_range-low IS NOT INITIAL.
          lv_topic_filter = ls_range-low.
          lv_has_topic_f  = abap_true.
        ENDIF.
    ENDCASE.
  ENDLOOP.

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

* -- Select with optional dependent filters --------------------------
  IF lv_has_role_f = abap_true AND lv_has_topic_f = abap_true.
    SELECT DISTINCT sap_module role topic FROM zcourses
      INTO TABLE lt_distinct
      WHERE sap_module <> ''
        AND role = lv_role_filter
        AND topic = lv_topic_filter.
  ELSEIF lv_has_role_f = abap_true.
    SELECT DISTINCT sap_module role topic FROM zcourses
      INTO TABLE lt_distinct
      WHERE sap_module <> ''
        AND role = lv_role_filter.
  ELSEIF lv_has_topic_f = abap_true.
    SELECT DISTINCT sap_module role topic FROM zcourses
      INTO TABLE lt_distinct
      WHERE sap_module <> ''
        AND topic = lv_topic_filter.
  ELSE.
    SELECT DISTINCT sap_module role topic FROM zcourses
      INTO TABLE lt_distinct
      WHERE sap_module <> ''.
  ENDIF.

  LOOP AT lt_distinct INTO ls_row.
    CLEAR ls_entity.
    ls_entity-sapmodule = ls_row-sap_module.
    ls_entity-role      = ls_row-role.
    ls_entity-topic     = ls_row-topic.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

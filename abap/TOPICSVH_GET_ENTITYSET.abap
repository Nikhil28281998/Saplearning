*&---------------------------------------------------------------------*
*& Method: TOPICSVH_GET_ENTITYSET  (SEGW may truncate TopicsVH → TopicVH)
*& Returns distinct Topic+Role+SapModule values for value help dropdowns
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& Maps to: @readonly entity TopicsVH as projection on my.Topics
*& Used by: SmartFilterBar Topic dropdown (dependent on Role & Module)
*&
*& PREREQUISITE: DB Table ZCOURSES must exist with fields
*&   TOPIC (CHAR 150), ROLE (CHAR 255), SAP_MODULE (CHAR 100)
*&---------------------------------------------------------------------*

METHOD topicsvh_get_entityset.

* -- Local variables --------------------------------------------------
  DATA: ls_entity  TYPE zcl_zcourses_mpc=>ts_topicsvh,
        lv_msg     TYPE bapi_msg.

  TYPES: BEGIN OF ty_topic_role_mod,
           topic      TYPE char150,
           role       TYPE char255,
           sap_module TYPE char100,
         END OF ty_topic_role_mod.
  DATA: lt_distinct TYPE TABLE OF ty_topic_role_mod,
        ls_row      TYPE ty_topic_role_mod.

* -- Read $filter from OData request for dependent filtering ----------
  DATA: lt_select_options TYPE /iwbep/t_mgw_select_option,
        ls_select_option  TYPE /iwbep/s_mgw_select_option,
        ls_range          TYPE /iwbep/s_cod_select_option,
        lv_role_filter    TYPE char255,
        lv_module_filter  TYPE char100,
        lv_has_role_f     TYPE abap_bool,
        lv_has_module_f   TYPE abap_bool.

  lt_select_options = io_tech_request_context->get_filter( )->get_filter_select_options( ).
  LOOP AT lt_select_options INTO ls_select_option.
    CASE ls_select_option-property.
      WHEN 'Role' OR 'role'.
        READ TABLE ls_select_option-select_options INTO ls_range INDEX 1.
        IF sy-subrc = 0 AND ls_range-low IS NOT INITIAL.
          lv_role_filter = ls_range-low.
          lv_has_role_f  = abap_true.
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
    MESSAGE e001(zcourses) WITH 'read' 'topics' INTO lv_msg.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_msg.
  ENDIF.

* -- Select with optional dependent filters --------------------------
  IF lv_has_role_f = abap_true AND lv_has_module_f = abap_true.
    SELECT DISTINCT topic role sap_module FROM zcourses
      INTO TABLE lt_distinct
      WHERE topic <> ''
        AND role = lv_role_filter
        AND sap_module = lv_module_filter.
  ELSEIF lv_has_role_f = abap_true.
    SELECT DISTINCT topic role sap_module FROM zcourses
      INTO TABLE lt_distinct
      WHERE topic <> ''
        AND role = lv_role_filter.
  ELSEIF lv_has_module_f = abap_true.
    SELECT DISTINCT topic role sap_module FROM zcourses
      INTO TABLE lt_distinct
      WHERE topic <> ''
        AND sap_module = lv_module_filter.
  ELSE.
    SELECT DISTINCT topic role sap_module FROM zcourses
      INTO TABLE lt_distinct
      WHERE topic <> ''.
  ENDIF.

  LOOP AT lt_distinct INTO ls_row.
    CLEAR ls_entity.
    ls_entity-topic     = ls_row-topic.
    ls_entity-role      = ls_row-role.
    ls_entity-sapmodule = ls_row-sap_module.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

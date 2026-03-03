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

* -- MD-1: Use array SELECT INTO TABLE instead of cursor -------------
  SELECT DISTINCT topic role sap_module FROM zcourses
    INTO TABLE lt_distinct
    WHERE topic <> ''.

  LOOP AT lt_distinct INTO ls_row.
    CLEAR ls_entity.
    ls_entity-topic     = ls_row-topic.
    ls_entity-role      = ls_row-role.
    ls_entity-sapmodule = ls_row-sap_module.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

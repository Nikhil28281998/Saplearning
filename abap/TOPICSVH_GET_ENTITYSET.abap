*&---------------------------------------------------------------------*
*& Method: TOPICSVH_GET_ENTITYSET  (SEGW may truncate TopicsVH → TopicVH)
*& Returns distinct Topic values for value help dropdowns
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& Maps to: @readonly entity TopicsVH as projection on my.Topics
*& Used by: SmartFilterBar Topic dropdown, Create/Edit Training dialog
*&
*& PREREQUISITE: DB Table ZCOURSES must exist with field TOPIC (CHAR 100)
*&---------------------------------------------------------------------*

METHOD topicsvh_get_entityset.

* -- Local variables --------------------------------------------------
  DATA: ls_entity  TYPE zcl_zcourses_mpc=>ts_topicsvh,
        lt_topics  TYPE TABLE OF char100,
        lv_topic   TYPE char100,
        lv_msg     TYPE bapi_msg.

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
  SELECT DISTINCT topic FROM zcourses INTO TABLE lt_topics
    WHERE topic <> ''.

  LOOP AT lt_topics INTO lv_topic.
    CLEAR ls_entity.
    ls_entity-topic = lv_topic.
    APPEND ls_entity TO et_entityset.
  ENDLOOP.

ENDMETHOD.

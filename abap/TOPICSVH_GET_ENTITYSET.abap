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
  DATA: ls_entity TYPE zcl_zcourses_mpc=>ts_topicsvh,
        lv_topic  TYPE char100.

* -- Select distinct topics from ZCOURSES, skip blanks ----------------
  SELECT DISTINCT topic FROM zcourses INTO lv_topic
    WHERE topic <> ''.
    CLEAR ls_entity.
    ls_entity-topic = lv_topic.
    APPEND ls_entity TO et_entityset.
  ENDSELECT.

ENDMETHOD.

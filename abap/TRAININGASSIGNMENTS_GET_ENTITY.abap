*&---------------------------------------------------------------------*
*& Method: TRAININGASSIGNME_GET_ENTITY  (SEGW may truncate the name)
*& Returns a single training assignment by ID key
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& IMPORTANT: Check the exact method name in SE24 → ZCL_ZCOURSES_DPC_EXT
*&   Search for method containing "TRAININGASSIGN" and "GET_ENTITY"
*&   (NOT GET_ENTITYSET — that is the list method)
*&
*& PREREQUISITE: DB Table ZCOURSE_ASGN must exist (see CREATE_ENTITY file)
*&---------------------------------------------------------------------*

METHOD trainingassignme_get_entity.

* -- Local variables (classic ABAP - no inline DATA) ------------------
  DATA: ls_key    TYPE /iwbep/s_mgw_name_value_pair,
        ls_asgn   TYPE zcourse_asgn,
        ls_entity TYPE zcl_zcourses_mpc=>ts_trainingassignment,
        lv_id     TYPE char36.

* -- Authorization check: Display (ACTVT 03) -------------------------
  AUTHORITY-CHECK OBJECT 'Z_COURSES'
    ID 'ACTVT' FIELD '03'.
  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'No authorization to read assignments'.
  ENDIF.

* -- Read key from OData URI path ------------------------------------
  READ TABLE it_key_tab WITH KEY name = 'Id' INTO ls_key.
  IF sy-subrc <> 0.
    READ TABLE it_key_tab WITH KEY name = 'ID' INTO ls_key.
  ENDIF.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Assignment ID is required in the request URI'.
  ENDIF.

  lv_id = ls_key-value.

* -- Fetch from database ---------------------------------------------
  SELECT SINGLE * FROM zcourse_asgn INTO ls_asgn
    WHERE id = lv_id.

  IF sy-subrc <> 0.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = 'Assignment not found'.
  ENDIF.

* -- Map database record to OData entity structure -------------------
  ls_entity-id              = ls_asgn-id.
  ls_entity-trainingid      = ls_asgn-training_id.
  ls_entity-title           = ls_asgn-title.
  ls_entity-role            = ls_asgn-role.
  ls_entity-sapmodule       = ls_asgn-sap_module.
  ls_entity-url             = ls_asgn-url.
  ls_entity-status          = ls_asgn-status.
  ls_entity-userid          = ls_asgn-user_id.
  ls_entity-username        = ls_asgn-user_name.
  ls_entity-useremail       = ls_asgn-user_email.
  ls_entity-duedate         = ls_asgn-due_date.
  ls_entity-completiondate  = ls_asgn-completion_dt.
  ls_entity-assignedby      = ls_asgn-assigned_by.
  ls_entity-assignedbyname  = ls_asgn-assigned_by_n.

  er_entity = ls_entity.

ENDMETHOD.

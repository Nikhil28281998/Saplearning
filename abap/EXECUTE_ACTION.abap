*&---------------------------------------------------------------------*
*& Method: /IWBEP/IF_MGW_APPL_SRV_RUNTIME~EXECUTE_ACTION
*& Handles Function Import calls: markCompleted + getCurrentRole
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& HOW TO REDEFINE:
*&   1. SE24 → open class ZCL_ZCOURSES_DPC_EXT
*&   2. Go to Methods tab
*&   3. Find method /IWBEP/IF_MGW_APPL_SRV_RUNTIME~EXECUTE_ACTION
*&      (it is inherited from the DPC base class)
*&   4. Right-click → Redefine
*&   5. Paste this code
*&   6. Activate
*&
*& This method handles TWO function imports:
*&   - markCompleted(Id)  → POST, marks assignment as Completed
*&   - getCurrentRole()   → GET, returns user role based on auth
*&---------------------------------------------------------------------*

METHOD /iwbep/if_mgw_appl_srv_runtime~execute_action.

* -- Local variables --------------------------------------------------
  DATA: ls_asgn     TYPE zcourse_asgn,
        ls_entity   TYPE zcl_zcourses_mpc=>ts_trainingassignment,
        ls_param    TYPE /iwbep/s_mgw_name_value_pair,
        lv_id       TYPE char36,
        lv_role_val TYPE char20,
        ls_role     TYPE zcl_zcourses_mpc=>ts_currentrole.

  CASE iv_action_name.

* ═══════════════════════════════════════════════════════════════════════
* markCompleted - Sets assignment status to 'Completed'
* ═══════════════════════════════════════════════════════════════════════
    WHEN 'markCompleted'.

*     Authorization check: Change (ACTVT 02)
      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '02'.
      IF sy-subrc <> 0.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = 'No authorization to mark assignments complete'.
      ENDIF.

*     Read Id parameter
      READ TABLE it_parameter WITH KEY name = 'Id' INTO ls_param.
      IF sy-subrc <> 0.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = 'Assignment ID parameter is required'.
      ENDIF.
      lv_id = ls_param-value.

*     Fetch assignment from DB
      SELECT SINGLE * FROM zcourse_asgn INTO ls_asgn
        WHERE id = lv_id.
      IF sy-subrc <> 0.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = 'Assignment not found'.
      ENDIF.

*     Business rule: cannot complete an already completed assignment
      IF ls_asgn-status = 'Completed'.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = 'Assignment is already completed'.
      ENDIF.

*     Update status and completion date
      ls_asgn-status        = 'Completed'.
      ls_asgn-completion_dt = sy-datum.

*     Save to DB (no COMMIT - Gateway manages LUW)
      MODIFY zcourse_asgn FROM ls_asgn.
      IF sy-subrc <> 0.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = 'Failed to mark as completed'.
      ENDIF.

*     Return updated entity
      CLEAR ls_entity.
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

      copy_data_to_ref(
        EXPORTING is_data = ls_entity
        CHANGING  cr_data = er_data ).

* ═══════════════════════════════════════════════════════════════════════
* getCurrentRole - Returns the user's highest role
* ═══════════════════════════════════════════════════════════════════════
    WHEN 'getCurrentRole'.

*     Role detection logic:
*     - Admin  = has Delete authorization (ACTVT 06) — only Z_COURSES_ADMIN has this
*     - Manager = has Create authorization (ACTVT 01) — Z_COURSES_MANAGER has 01 but not 06
*     - User   = everyone else with at least Display (ACTVT 03)

      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '06'.
      IF sy-subrc = 0.
        lv_role_val = 'Admin'.
      ELSE.
        AUTHORITY-CHECK OBJECT 'Z_COURSES'
          ID 'ACTVT' FIELD '01'.
        IF sy-subrc = 0.
          lv_role_val = 'Manager'.
        ELSE.
          lv_role_val = 'User'.
        ENDIF.
      ENDIF.

*     Return via Complex Type structure (ts_currentrole)
*     SEGW Complex Type "CurrentRole" has one property: Role (Edm.String 20)
      ls_role-role = lv_role_val.

      copy_data_to_ref(
        EXPORTING is_data = ls_role
        CHANGING  cr_data = er_data ).

* ═══════════════════════════════════════════════════════════════════════
* Unknown action
* ═══════════════════════════════════════════════════════════════════════
    WHEN OTHERS.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid  = /iwbep/cx_mgw_busi_exception=>business_error
          message = 'Unknown action'.

  ENDCASE.

ENDMETHOD.

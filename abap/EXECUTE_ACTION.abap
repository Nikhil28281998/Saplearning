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
        lv_avail    TYPE char60,
        ls_role     TYPE zcl_zcourses_mpc=>ts_currentrole,  "if error: try CURRENTROLE
        lv_ftype    TYPE c,
        lv_ts_conv  TYPE timestamp,
        lv_time_ini TYPE t,
        lv_errmsg   TYPE bapi_msg,
        lv_msg      TYPE bapi_msg,
        lx_root     TYPE REF TO cx_root,
        lx_busi     TYPE REF TO /iwbep/cx_mgw_busi_exception.

  TRY.

  CASE iv_action_name.

* ═══════════════════════════════════════════════════════════════════════
* markCompleted - Sets assignment status to 'Completed'
* ═══════════════════════════════════════════════════════════════════════
    WHEN 'markCompleted'.

*     Authorization check: Change (ACTVT 02)
      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '02'.
      IF sy-subrc <> 0.
        MESSAGE e001(zcourses) WITH 'mark complete' 'assignments' INTO lv_msg.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = lv_msg.
      ENDIF.

*     Read Id parameter
      READ TABLE it_parameter WITH KEY name = 'Id' INTO ls_param.
      IF sy-subrc <> 0.
        MESSAGE e002(zcourses) WITH 'Assignment ID' INTO lv_msg.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = lv_msg.
      ENDIF.
      lv_id = ls_param-value.

*     Fetch assignment from DB
      SELECT SINGLE * FROM zcourse_asgn INTO ls_asgn
        WHERE id = lv_id.
      IF sy-subrc <> 0.
        MESSAGE e003(zcourses) WITH 'Assignment' INTO lv_msg.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = lv_msg.
      ENDIF.

*     Business rule: cannot complete an already completed assignment
      IF ls_asgn-status = 'Completed'.
        MESSAGE e009(zcourses) WITH 'Assignment' INTO lv_msg.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = lv_msg.
      ENDIF.

*     Update status and completion date
      ls_asgn-status        = 'Completed'.
      ls_asgn-completion_dt = sy-datum.

*     Save to DB (no COMMIT - Gateway manages LUW)
      MODIFY zcourse_asgn FROM ls_asgn.
      IF sy-subrc <> 0.
        MESSAGE e004(zcourses) WITH 'complete' 'assignment' INTO lv_msg.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = lv_msg.
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
*     -- Safe date conversion: DATS → entity (handles TIMESTAMP MPC) -
      DESCRIBE FIELD ls_entity-duedate TYPE lv_ftype.
      IF ls_asgn-due_date IS NOT INITIAL.
        IF lv_ftype = 'P'.
          CONVERT DATE ls_asgn-due_date TIME lv_time_ini
            INTO TIME STAMP lv_ts_conv TIME ZONE 'UTC'.
          IF sy-subrc = 0.
            ls_entity-duedate = lv_ts_conv.
          ENDIF.
        ELSE.
          ls_entity-duedate = ls_asgn-due_date.
        ENDIF.
      ENDIF.
      DESCRIBE FIELD ls_entity-completiondate TYPE lv_ftype.
      IF ls_asgn-completion_dt IS NOT INITIAL.
        IF lv_ftype = 'P'.
          CONVERT DATE ls_asgn-completion_dt TIME lv_time_ini
            INTO TIME STAMP lv_ts_conv TIME ZONE 'UTC'.
          IF sy-subrc = 0.
            ls_entity-completiondate = lv_ts_conv.
          ENDIF.
        ELSE.
          ls_entity-completiondate = ls_asgn-completion_dt.
        ENDIF.
      ENDIF.
      ls_entity-assignedby      = ls_asgn-assigned_by.
      ls_entity-assignedbyname  = ls_asgn-assigned_by_n.

      copy_data_to_ref(
        EXPORTING is_data = ls_entity
        CHANGING  cr_data = er_data ).

* ═══════════════════════════════════════════════════════════════════════
* getCurrentRole - Returns highest role + ALL available roles
*   UI uses AvailableRoles to populate the role switcher dynamically:
*   - 3 roles → switcher shows Admin / Manager / End User
*   - 2 roles → switcher shows those two only
*   - 1 role  → no switcher, just role badge
* ═══════════════════════════════════════════════════════════════════════
    WHEN 'getCurrentRole'.

      CLEAR: lv_role_val, lv_avail.

*     Check Admin: Delete auth (ACTVT 06) — only Z_COURSES_ADMIN has this
      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '06'.
      IF sy-subrc = 0.
        lv_role_val = 'Admin'.
        lv_avail    = 'Admin'.
      ENDIF.

*     Check Manager: Create auth (ACTVT 01)
*     NOTE: Admin also passes this (ACTVT 01 is in Z_COURSES_ADMIN)
      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '01'.
      IF sy-subrc = 0.
        IF lv_role_val IS INITIAL.
          lv_role_val = 'Manager'.
        ENDIF.
        IF lv_avail IS NOT INITIAL.
          CONCATENATE lv_avail ',Manager' INTO lv_avail.
        ELSE.
          lv_avail = 'Manager'.
        ENDIF.
      ENDIF.

*     Check User: Display auth (ACTVT 03)
*     NOTE: Admin & Manager also pass this (ACTVT 03 is in both roles)
      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '03'.
      IF sy-subrc = 0.
        IF lv_role_val IS INITIAL.
          lv_role_val = 'User'.
        ENDIF.
        IF lv_avail IS NOT INITIAL.
          CONCATENATE lv_avail ',User' INTO lv_avail.
        ELSE.
          lv_avail = 'User'.
        ENDIF.
      ENDIF.

*     Fallback: if no authorization at all, reject the request
      IF lv_role_val IS INITIAL.
        MESSAGE e001(zcourses) WITH 'view' 'role context' INTO lv_msg.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = 'Not authorized: no PFCG role assigned for Z_COURSES'.
      ENDIF.

*     Return via Complex Type structure (ts_currentrole)
*     SEGW Complex Type "CurrentRole":
*       Role            (Edm.String 20) — highest role
*       AvailableRoles  (Edm.String 60) — comma-separated, e.g. "Admin,Manager,User"
      ls_role-role           = lv_role_val.
      ls_role-availableroles = lv_avail.

      copy_data_to_ref(
        EXPORTING is_data = ls_role
        CHANGING  cr_data = er_data ).

* ═══════════════════════════════════════════════════════════════════════
* Unknown action
* ═══════════════════════════════════════════════════════════════════════
    WHEN OTHERS.
      MESSAGE e003(zcourses) WITH 'Action' INTO lv_msg.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid  = /iwbep/cx_mgw_busi_exception=>business_error
          message = lv_msg.

  ENDCASE.

* -- Catch-all: prevent short dumps (500 errors) --------------------
  CATCH /iwbep/cx_mgw_busi_exception INTO lx_busi.
    RAISE EXCEPTION lx_busi.
  CATCH cx_root INTO lx_root.
    lv_errmsg = lx_root->get_text( ).
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING
        textid  = /iwbep/cx_mgw_busi_exception=>business_error
        message = lv_errmsg.
  ENDTRY.

ENDMETHOD.

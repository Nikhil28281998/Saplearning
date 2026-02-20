*&---------------------------------------------------------------------*
*& TEAM_ANALYTICS_FUNCTION_IMPORT_GUIDE.abap
*& NEW-8: Guide for implementing getTeamAnalytics as an ABAP Function Import
*&
*& This is a GUIDE file — not directly pasteable into SE24.
*& Follow the steps below to implement server-side team analytics.
*&---------------------------------------------------------------------*
*&
*& STEP 1: SEGW — Add Function Import
*& ====================================
*& 1. Open SEGW → project ZCOURSES
*& 2. Right-click "Function Imports" → Create
*& 3. Function Import Name: getTeamAnalytics
*&    Return Type: (complex type — see step 2)
*&    HTTP Method: GET
*&    Return Cardinality: 1
*&    No parameters required (uses sy-uname for manager filter)
*&
*& STEP 2: SEGW — Define Complex Types
*& ====================================
*& Create two complex types in SEGW:
*&
*& Complex Type: TeamUserBreakdown
*&   - userId      CHAR 12
*&   - userName    CHAR 80
*&   - total       INT4
*&   - completed   INT4
*&
*& Complex Type: TeamAnalyticsResult
*&   - totalAssignments  INT4
*&   - assigned          INT4
*&   - inProgress        INT4
*&   - completed         INT4
*&   - overdue           INT4
*&   - completionPercent INT4
*&   - userBreakdown     Array of TeamUserBreakdown  (Navigation Property)
*&
*& Note: For the userBreakdown array, create a Navigation Property from
*& TeamAnalyticsResult to TeamUserBreakdown with cardinality 0..N.
*&
*& STEP 3: Generate Runtime Artifacts
*& ====================================
*& After defining the complex types and function import:
*& 1. Click "Generate Runtime Objects" (Ctrl+F3)
*& 2. This creates the MPC and DPC classes
*&
*& STEP 4: Implement in EXECUTE_ACTION
*& ====================================
*& Add the following WHEN branch to the EXECUTE_ACTION method
*& (in ZCL_ZCOURSES_DPC_EXT):
*&
*&   WHEN 'getTeamAnalytics'.
*&     (see implementation below)
*&
*&---------------------------------------------------------------------*

* -- Add this WHEN branch inside EXECUTE_ACTION method ----------------

    WHEN 'getTeamAnalytics'.

*     Authorization: Must have at least Read (ACTVT 03)
      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '03'.
      IF sy-subrc <> 0.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = 'No authorization to view team analytics'.
      ENDIF.

*     Determine role: Admin sees all, Manager sees own team
      DATA: lv_is_admin   TYPE abap_bool VALUE abap_false,
            lv_is_manager TYPE abap_bool VALUE abap_false.

      AUTHORITY-CHECK OBJECT 'Z_COURSES'
        ID 'ACTVT' FIELD '06'.
      IF sy-subrc = 0.
        lv_is_admin = abap_true.
      ELSE.
        AUTHORITY-CHECK OBJECT 'Z_COURSES'
          ID 'ACTVT' FIELD '01'.
        IF sy-subrc = 0.
          lv_is_manager = abap_true.
        ENDIF.
      ENDIF.

      IF lv_is_admin = abap_false AND lv_is_manager = abap_false.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = 'Team analytics requires Manager or Admin role'.
      ENDIF.

*     Read assignments (with optional manager filter)
      DATA: lt_asgn TYPE TABLE OF zcourse_asgn,
            ls_a    TYPE zcourse_asgn.

      IF lv_is_admin = abap_true.
        SELECT * FROM zcourse_asgn INTO TABLE lt_asgn.
      ELSE.
*       Manager: filter by MANAGER_SORT2 = sy-uname
        SELECT * FROM zcourse_asgn INTO TABLE lt_asgn
          WHERE manager_sort2 = sy-uname.
      ENDIF.

*     Aggregate counts
      DATA: lv_total     TYPE i VALUE 0,
            lv_assigned  TYPE i VALUE 0,
            lv_inprog    TYPE i VALUE 0,
            lv_completed TYPE i VALUE 0,
            lv_overdue   TYPE i VALUE 0,
            lv_pct       TYPE i VALUE 0.

      DATA: BEGIN OF ls_user,
              user_id   TYPE char12,
              user_name TYPE char80,
              total     TYPE i,
              completed TYPE i,
            END OF ls_user,
            lt_users LIKE TABLE OF ls_user.

      LOOP AT lt_asgn INTO ls_a.
        lv_total = lv_total + 1.

        CASE ls_a-status.
          WHEN 'Assigned'.    lv_assigned  = lv_assigned + 1.
          WHEN 'In Progress'. lv_inprog    = lv_inprog + 1.
          WHEN 'Completed'.   lv_completed = lv_completed + 1.
        ENDCASE.

*       Overdue: not completed and due_date < sy-datum
        IF ls_a-status <> 'Completed' AND ls_a-due_date IS NOT INITIAL.
          IF ls_a-due_date < sy-datum.
            lv_overdue = lv_overdue + 1.
          ENDIF.
        ENDIF.

*       User breakdown
        READ TABLE lt_users INTO ls_user
          WITH KEY user_id = ls_a-user_id.
        IF sy-subrc = 0.
          ls_user-total = ls_user-total + 1.
          IF ls_a-status = 'Completed'.
            ls_user-completed = ls_user-completed + 1.
          ENDIF.
          MODIFY lt_users FROM ls_user INDEX sy-tabix.
        ELSE.
          CLEAR ls_user.
          ls_user-user_id   = ls_a-user_id.
          ls_user-user_name = ls_a-user_name.
          ls_user-total     = 1.
          IF ls_a-status = 'Completed'.
            ls_user-completed = 1.
          ENDIF.
          APPEND ls_user TO lt_users.
        ENDIF.
      ENDLOOP.

*     Completion percentage
      IF lv_total > 0.
        lv_pct = lv_completed * 100 / lv_total.
      ENDIF.

*     Sort users by completion % descending
      SORT lt_users BY completed DESCENDING total ASCENDING.

*     Build response (depends on MPC-generated complex type structure)
*     The exact structure name depends on your SEGW generation.
*     Example: zcl_zcourses_mpc=>ts_teamanalyticsresult
*
*     DATA: ls_result TYPE zcl_zcourses_mpc=>ts_teamanalyticsresult.
*     ls_result-totalassignments  = lv_total.
*     ls_result-assigned          = lv_assigned.
*     ls_result-inprogress        = lv_inprog.
*     ls_result-completed         = lv_completed.
*     ls_result-overdue           = lv_overdue.
*     ls_result-completionpercent = lv_pct.
*
*     For the userBreakdown array, use the entity provider:
*     copy_data_to_ref( EXPORTING is_data = ls_result
*                       CHANGING  cr_data = er_data ).
*
*     Note: The exact implementation of returning nested complex types
*     varies by SAP Gateway version. Consult SAP Note 2187515 for deep
*     entity handling in function imports.


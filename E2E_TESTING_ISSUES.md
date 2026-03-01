# E2E Testing Issues Log
> All issues collected during interactive testing. Will be fixed in a single batch.

## HOME PAGE (Manager View - TrainingsList)

| # | Issue | Severity | Area |
|---|-------|----------|------|
| H1 | User Progress: overdue badge "2 overdue" overlaps/floats onto progress bar (Nikhil Kumar row) | HIGH | TeamUserRow fragment |
| H2 | User Progress: progress bar text truncated "0/2 (0..." instead of "0/2 (0%)" | MEDIUM | TeamUserRow fragment |
| H3 | User Progress: user names truncated "Nikhil Tanw...", "Nikhil Kuma..." | MEDIUM | TeamUserRow fragment CSS |
| H4 | Top Modules: module names truncated "WAREHOUSE MANA...", "LOGISTICS - SHIPPI..." — names must be fully visible | HIGH | moduleBarLabel CSS |
| H5 | User Progress overall feels cramped — too much packed in small horizontal space. Current look/feel not good — needs redesign | HIGH | TeamUserRow layout |
| H6 | "Hide Filter Bar" link visible — should be hidden | MEDIUM | SmartFilterBar CSS |
| H7 | Top Modules chart only shows modules assigned to manager's team — WRONG. Should show total courses/modules across system | HIGH | Controller logic (team filter) |
| H8 | Replace custom filters (Role/Topic/Module dropdowns) with SAP standard "Adapt Filters" like other Fiori apps | HIGH | SmartFilterBar config |
| H9 | Topic filter not working — only Role & Module cross-reference filtering works. Topic needs same logic | HIGH | Controller filter logic |
| H10 | Learning Content cards section not responsive across screen sizes (laptop/phone/monitor) — same issue as analytics had | HIGH | CSS responsive |
| H11 | Card design inconsistent — info start position, icon positions, text positioning not aligned across cards | HIGH | Card template CSS |
| H12 | "My Assignments" badge uses custom icon — should use SAP standard shell/tile notification instead | MEDIUM | headerContent / ShellBar |
| H13 | "My Assignments" badge shows number "10" — remove the number, not needed | MEDIUM | BadgeCustomData |
| H14 | Learning Content (838 courses) table on Home page feels inappropriate — Home should focus on Team Analytics, not full course catalog | HIGH | Page layout / UX decision |
| H15 | Assign Training dialog: no "Next" button to navigate wizard steps (1. Trainings → 2. Team → 3. Review) | HIGH | AssignWizard dialog |
| H16 | Assign Training dialog: Due Date has no default — should default to 2 weeks from today (user can modify) | HIGH | AssignWizard default |
| H17 | Assign Training dialog: Schedule input fields (Notes, Sequence) too cramped/narrow — need more spacing for user input | MEDIUM | AssignWizard CSS |
| H18 | Assign Training dialog: no Close/Cancel button to dismiss the popup | HIGH | AssignWizard dialog buttons |
| H19 | Assign Training dialog: Priority dropdown truncated "Me..." — not fully visible | LOW | AssignWizard field width |
| H20 | Tutorial dialog: 3rd tab (ⓘ info) has space allocated but shows NO content — empty panel | HIGH | Tutorial dialog content |
| H21 | Tutorial dialog title "SAP Learning Courses – Training Catalog Guide" — rename to just "Training Catalog Guide" | MEDIUM | Tutorial dialog title |
| H22 | Home page: remove "SAP Learning Courses" text from page header — FLP shell already shows app name | MEDIUM | TrainingsList.view.xml title |
| H23 | My Assignments page: remove "My Assignments" text from page header — redundant | MEDIUM | TrainingAssignmentsList.view.xml title |
| H24 | My Assignments tutorial says "As a Manager" — should be role-specific. Each role (Manager/Admin/End User) needs its own tutorial text | HIGH | Tutorial dialog role logic |
| H25 | My Assignments page tutorial should be distinct from Home page tutorial — different content, not same format with minor text changes | MEDIUM | Tutorial dialog content |
| H26 | Start Training: confirmation dialog shows, click OK → "Failed to update" error. Backend update not working | CRITICAL | Controller/Service update logic |
| H27 | Mark Completed: fails with "Error: Resource not found for URI segment" | CRITICAL | Controller/Service update logic |
| H28 | View Details dialog: Mark Completed button is full blue — text not visible (white on blue contrast missing or button style wrong) | HIGH | ViewDetails dialog CSS |
| H29 | View Details dialog: clicking the icon next to "Open Training Link" opens View Details again instead of the training URL. Only clicking the TEXT works correctly | HIGH | ViewDetails link/icon binding |
| H30 | View Details dialog: "Resources" section — the blue icon button next to Open Training Link has wrong press handler (navigates to details instead of opening training URL) | HIGH | ViewDetails fragment event |
| H31 | Search box not working — typing text + clicking Go does not filter results | HIGH | SmartFilterBar search binding |
| H32 | Cross-reference filtering: Role, Topic, Module work individually. Role+Module cross-ref works. But all 3 filters combined (Role+Topic+Module) does NOT work | HIGH | Controller filter logic |
| H33 | Table fullscreen mode: switching from Table view to Card view while maximized shows BLANK screen | CRITICAL | SmartTable view toggle in fullscreen |
| H34 | Error notification: "The request URI contains an invalid key predicate. Resource not found for the segment 'Priority'." — Priority entity/segment issue in OData | CRITICAL | OData service / CDS model |
| H35 | My Assignments badge shows "10" but actual assignments = 3. Badge count is wrong — likely counting all team assignments instead of personal ones | HIGH | Badge count logic in controller |

## ASSIGNMENTS PAGE (My Assignments - TrainingAssignmentsList)

| # | Issue | Severity | Area |
|---|-------|----------|------|
| A1 | Remove Reassign + Send Reminder buttons from My Assignments page entirely — not relevant for user viewing own assignments | HIGH | View XML + controller cleanup |
| A2 | Hero card (Your Completion) purple gradient wastes space — 5 cards in 6-col grid leaves gap | MEDIUM | CSS grid + heroCard |
| A3 | Table shows in CARD style not TABLE style (default should be table) | HIGH | SmartTable initialView |
| A4 | Empty state shows raw element ID: "Element sap.m.IllustratedMessage#__xmlview1--assignmentsEmptyState" | HIGH | IllustratedMessage setup |
| A5 | Status filter pre-set to "Completed" (screenshot 1) / "Assigned" (screenshot 2) — should default to "All" | MEDIUM | Filter default |
| A6 | "Hide Filter Bar" link visible — should be hidden | LOW | CSS |
| A7 | Horizontal scrollbar visible under KPI cards — unnecessary | LOW | CSS overflow |

## TESTING CHECKLIST

| # | Test | Status | Notes |
|---|------|--------|-------|
| T1 | Home page loads — KPIs, charts, table | ✅ | 6 KPIs correct (10,8,2,2,0,0%). Top Modules + User Progress visible. 7 new issues found (H7-H13) |
| T2 | My Assignments page loads — KPIs, table | ✅ | KPIs load. Card view shows data. Table view shows empty with raw element ID (A4). Reassign/SendReminder visible (A1 — never been fixed, in batch list) |
| T3 | Click KPI card → filters table | ✅ | KPI click filters Learning Content table. Count changes. Works. |
| T4 | Assign Training workflow | ✅ | Dialog opens with 3-step wizard. Selected trainings shown. Issues: no Next btn (H15), no default due date (H16), cramped fields (H17), no close btn (H18), truncated Priority (H19) |
| T5 | Mark Completed workflow | ✅ | FAILS: "Resource not found for URI segment" error (H27). Button text invisible in details dialog (H28) |
| T6 | Start Training workflow | ✅ | Confirm dialog shows. Click OK → "Failed to update" error (H26) |
| T7 | Export Report | ✅ | Works. Downloads Excel file. Only Excel option available (no CSV/PDF) — acceptable for now |
| T8 | Search in filter bar | ✅ | NOT WORKING — search box does not filter results (H31) |
| T9 | Role/Topic/Module filter dropdowns | ✅ | Individual: all 3 work. Role+Module cross-ref works. All 3 combined cross-ref FAILS (H32) |
| T10 | View Details dialog | ✅ | Opens correctly. Shows training info, user, schedule, resources. Issues: Mark Completed btn invisible text (H28), icon opens wrong target (H29) |
| T11 | Team Drill-down (click KPI on home) | ✅ | KPI filter works. But user questions if Learning Content table belongs on Home page (H14) |
| T12 | Tutorial dialog | ✅ | Opens on both pages. 3 tabs (Quick Start, Steps, Info). Info tab empty (H20). Title needs renaming (H21). Role-specific text missing (H24). Both pages need distinct tutorials (H25) |
| T13 | Card/Table view toggle | ✅ | Table view works + shows data. Card view works normally. BUT switching to Card while in fullscreen Table = BLANK (H33). Errors: invalid key predicate for Priority (H34) |
| T14 | Switch to Admin role | ⏸️ | Deferred — will test after Manager fixes |
| T15 | Switch to End-user role | ⏸️ | Deferred — will test after Manager fixes |
| T16 | Responsive — phone/tablet/desktop | ⏸️ | Deferred — will test after fixes applied |
| T17 | FLP back navigation | ✅ | Works correctly: My Assignments → Home → FLP launchpad. All transitions smooth |
| T18 | Badge count correct | ✅ | Shows 10, actual is 3. WRONG (H35) |

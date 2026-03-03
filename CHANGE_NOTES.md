# SAP Learning App — Change Notes

## Session: March 2, 2026

### Commit History (newest first)
| Commit | Description |
|--------|-------------|
| Current (unpushed) | Fix drill-down missing Name/Title/Module for older assignments |
| `5b062f5` | Remove re-added KPIs from Analytics Dashboard, cleanup CSS, add change notes, E2E tests |
| `46add80` | Data refresh after assign, card styling, navigation, analytics enhancements |
| `7612618` | Move Send Reminder to drill-down, remove duplicate KPIs from Analytics Dashboard |
| `8ae2a64` | Replace inline charts with Analytics Dashboard popup, add NIKKUMAR test data |

---

## Changes Made

### 1. Analytics Dashboard Popup (Commit `8ae2a64`)
**Added:**
- New `AnalyticsDashboard.fragment.xml` — fullscreen dialog opened via "Analytics" button
- Module Distribution chart (all modules with completion bars + overdue flags)
- Team Member Progress chart (all users with progress bars, active/overdue stats)
- Export Report button in dashboard sub-header

**Intentionally Removed:**
- Compact inline charts (Top Modules & User Progress) from the main page — replaced by the popup

### 2. Send Reminder Relocation (Commit `7612618`)
**Intentionally Removed:**
- Send Reminder button from My Assignments page (`TrainingAssignmentsList.view.xml`)
  - **Reason:** Users viewing their own assignments don't need to send reminders to themselves

**Added:**
- Send Reminder button in Team drill-down dialog (`TeamAssignmentsDialog.fragment.xml`)
  - Placed next to De-assign in `<buttons>` aggregation
  - Visible only for Pending/Overdue status drill-downs (Manager/Admin only)
- `onSendReminderFromDrillDown` handler in `TrainingsList.controller.js`

### 3. Duplicate KPI Removal from Analytics Dashboard (Commits `7612618` + current)
**Intentionally Removed:**
- Status Overview panel (5 KPI cards: Assigned, In Progress, Completed, Overdue, Completion Rate)
  - **Reason:** These exact numbers are already displayed as KPI cards on the main Team Analytics panel. Showing them again in the popup is redundant.
- Quick Stats bar (6 mini stat cards re-added in `46add80` — **removed again in current commit**)
  - **Reason:** Same data as main page KPIs. Was mistakenly re-added.
- Status Distribution bar chart (added in `46add80` — **removed in current commit**)
  - **Reason:** The same assigned/in-progress/completed/overdue counts are clickable KPI cards on the main page. The bar chart added no new information.

**Analytics Dashboard now contains ONLY:**
- Module Distribution (all modules — no top-5 cap)
- Team Member Progress (all users with completion bars)
- Export Report button

### 4. Data Refresh After Assignment (Commit `46add80`)
**Added:**
- `EventBus.publish("assignmentsChanged")` in `Component.js` after `onAssignSubmit` completes
- `TrainingsList.controller.js` listens → re-runs `_loadTeamAnalytics()` to refresh KPI numbers
- `TrainingAssignmentsList.controller.js` listens → re-runs `_loadAnalytics()` + rebinds table/cards
- **Reason:** Previously, KPI numbers would not update until manual page refresh

### 5. Card Style Consistency (Commit `46add80`)
**Changed:**
- `.learningCardTitle`: `min-height` → fixed `height: 2.625rem` (exactly 2 lines)
- `.learningCardDesc`: `min-height` → fixed `height: 2.4375rem`
- `.learningCardBody`: removed `justify-content: space-between` (caused uneven spacing)
- `.learningCardTitleRow`: `align-items: center` → `flex-start` (icons align to first line of title)
- Added `flex-shrink: 0` to title, desc, and meta sections
- **Reason:** Long titles (e.g. "POSTING GOODS RECEIPTS FOR REWORK PRODUCTION ORDERS") caused inconsistent card layouts

### 6. Back Navigation (Commit `46add80`)
**Added:**
- Home page: `showNavButton="true"` + `onNavBack` → navigates to SAP Launchpad shell (FLP)
- Assignments page: `showNavButton="true"` + `onNavBack` → navigates to Home route
- **Reason:** Switching between pages multiple times caused incorrect back-navigation loops

### 7. Analytics Dashboard Size (Commit `46add80`)
**Changed:**
- Dialog: `stretch="true"` → `stretch="false"`, `contentHeight="85%"`, `contentWidth="90%"`
- **Reason:** Full-screen popup felt too heavy; 90×85% is more proportional

### 8. Module Distribution — Show All Modules (Commit `46add80`)
**Changed:**
- `AnalyticsService.js`: removed `.slice(0, 5)` from module distribution
- Fallback `_loadTeamAnalyticsFallback` already showed all modules (no cap)
- **Reason:** User requested all modules in the system be visible, not just top 5

---

## What Was NOT Changed (Intentionally Kept)
- Team Analytics KPI cards on the main page (6 cards: Total, Assigned, In Progress, Overdue, Completed, Completion %)
- KPI card click-through to drill-down dialog
- De-assign button in drill-down dialog
- My Assignments page KPI cards (personal progress)
- Card/Table view toggle on both pages
- Smart filters, export, variant management
- Reassign dialog was already deleted in a prior session

---

## Files Modified (since `8ae2a64`)
| File | Changes |
|------|---------|
| `Component.js` | EventBus publish after assignment |
| `TrainingsList.controller.js` | EventBus listener, onNavBack, onSendReminderFromDrillDown, drill-down button visibility, **enrichment of missing drill-down data** |
| `TrainingAssignmentsList.controller.js` | EventBus listener, onNavBack |
| `AnalyticsDashboard.fragment.xml` | Removed all KPI cards/stats, kept Module + User charts, resized to 90×85% |
| `TeamAssignmentsDialog.fragment.xml` | Changed to `<buttons>` aggregation with De-assign + Send Reminder + Close |
| `TrainingsList.view.xml` | Added showNavButton + navButtonPress, removed Send Reminder |
| `TrainingAssignmentsList.view.xml` | Added showNavButton + navButtonPress |
| `style.css` | Fixed card heights, removed Quick Stats/Status Distribution CSS, cleaned up dead code |
| `AnalyticsService.js` | Removed top-5 module cap |

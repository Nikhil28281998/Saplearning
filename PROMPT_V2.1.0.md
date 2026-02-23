# SAP Learning Courses – v2.1.0 Implementation Prompt

## Context

You are working on `c:\Users\14754\SAP\Saplearning\` — an SAP CAP CDS 8 + SAPUI5 1.108 + OData V2 app (ABAP Gateway on S/4HANA 2022). The app manages training assignments with 3 roles: Admin, Manager, User (1 person = 1 role always, no multi-role).

Current version: **v2.0.3** (all 37 audit items resolved). This prompt covers:
- **Part A** — 3 remaining audit issues (1 medium, 2 low)
- **Part B** — Back navigation infinite redirect bug
- **Part C** — Complete analytics redesign (top-tier Fiori Horizon design)
- **Part D** — 59 frontend improvements (prioritized)

---

## PART A — 3 Remaining Audit Issues

### A-1 (Medium): Dead `onDeassignBtn` Handler — Wire or Remove

**Problem:** `TrainingAssignmentsList.controller.js` has a ~75-line `onDeassignBtn()` handler (line 443) that de-assigns selected assignments. But the assignments view XML (`TrainingAssignmentsList.view.xml`) has NO button that calls it. The handler is dead unreachable code.

**Fix — Option 1 (Recommended: Wire the button):**
In `TrainingAssignmentsList.view.xml`, inside the `<smartTable:customToolbar>` `<OverflowToolbar>`, add a de-assign button visible only for Manager/Admin, placed between `markCompletedBtn` and `ToolbarSpacer`:

```xml
<Button
    id="deassignBtn"
    text="{i18n>deassign}"
    icon="sap-icon://decline"
    type="Reject"
    press="onDeassignBtn"
    visible="{= ${user>/role} === 'Manager' || ${user>/role} === 'Admin' }" />
```

Also add the i18n keys if missing:
```properties
deassign=De-assign
selectAssignmentFirst=Please select at least one assignment
confirmDeassign=Remove {0} assignment(s)? This cannot be undone.
confirmDeassignTitle=Confirm De-assignment
deassignSuccess={0} assignment(s) removed successfully
deassignFailed=Failed to remove assignments
```

Also update the SmartTable to enable multi-select for Manager/Admin. In the controller's `onSmartTableInit` or `onInit`, set `oTable.setMode("MultiSelect")` conditionally:
```javascript
var sRole = this.getOwnerComponent()._role || "User";
if (sRole === "Manager" || sRole === "Admin") {
    var oTable = this.byId("assignSmartTable").getTable();
    if (oTable && oTable.setMode) { oTable.setMode("MultiSelect"); }
}
```

**Fix — Option 2 (Remove dead code):** Delete the entire `onDeassignBtn` method (~lines 443-510) from `TrainingAssignmentsList.controller.js`.

### A-2 (Low): Missing Client-Side Overdue Filter on Assignments Page

**Problem:** The assignments `SmartFilterBar` has an "Overdue" option in the Status dropdown. When selected, `onBeforeRebindTable` sends `Status NE Completed` to the backend, but there's no `dataReceived` handler to client-filter records where `DueDate < today`. Records that have `Status=Assigned` but `DueDate` in the future will incorrectly show.

**Fix:** In `TrainingAssignmentsList.controller.js`, add a `dataReceived` handler in `onInit` after the SmartTable is available:

```javascript
// In onInit, after metadataLoaded:
var oSmartTable = this.byId("assignSmartTable");
if (oSmartTable) {
    oSmartTable.attachDataReceived(function () {
        if (that._overdueFilter) {
            that._clientFilterOverdue();
        }
    });
}
```

Add the `_clientFilterOverdue` method:
```javascript
_clientFilterOverdue: function () {
    var oTable = this.byId("assignSmartTable").getTable();
    if (!oTable) { return; }
    var oBinding = oTable.getBinding("items");
    if (!oBinding) { return; }
    
    var sToday = new Date().toISOString().substring(0, 10);
    var aFilters = [
        new Filter("Status", FilterOperator.NE, "Completed"),
        new Filter({
            path: "DueDate",
            operator: FilterOperator.LT,
            value1: new Date(sToday)
        })
    ];
    oBinding.filter(aFilters, "Application");
}
```

Also set `this._overdueFilter = true` inside `_filterByStatus` when status is "Overdue", and `false` for any other status.

### A-3 (Low): Stale `Z_COURSES_MGR_AUTH_OBJECT_GUIDE.abap`

**Problem:** File `abap/FIXES_V170/Z_COURSES_MGR_AUTH_OBJECT_GUIDE.abap` documents an authorization object `Z_COURSES_MGR` that no code actually uses. The app uses `Z_COURSES` with `ACTVT` field only.

**Fix:** Delete the file:
```
Saplearning/abap/FIXES_V170/Z_COURSES_MGR_AUTH_OBJECT_GUIDE.abap
```

---

## PART B — Back Navigation Infinite Redirect Bug (Critical)

### Problem Analysis

When a **User** role person clicks the **back arrow** on the Assignments page:
1. `onNavBack()` → `navTo("TrainingsList", {}, true)` — navigates to Training Catalog
2. The Training Catalog page briefly appears
3. Then the app immediately redirects BACK to the Assignments page

**Root Cause:** In `Component.js`, `_applyRoleUI()` redirects User role to assignments on first load using a `_landingApplied` guard. But this guard is a component instance property — it resets to `undefined` if:
- The FLP re-instantiates the component (shell navigation, bookmark reload)
- A browser refresh occurs mid-session
- The `roleChanged` EventBus event re-triggers `_applyRoleUI()` from a delayed async response

Additionally, the User role should NOT navigate to TrainingsList at all via back button — they don't use that page. The back button for User role should either exit the app (go to FLP) or be hidden entirely.

### Fix

**File: `Saplearning/app/z.sap.courses/webapp/Component.js`**

1. **Persist `_landingApplied` in `sessionStorage`** so it survives FLP re-initialization:

```javascript
_applyRoleUI: function () {
    var sRole = this._role || 'User';
    Log.info('User role applied: ' + sRole);
    this._userModel.setProperty("/role", sRole);
    sap.ui.getCore().getEventBus().publish("sapCourses", "roleChanged", { role: sRole });

    // Role-based landing: User starts at My Assignments (one-time per session)
    var bLandingDone = false;
    try { bLandingDone = sessionStorage.getItem('saplc-landing-done') === 'true'; } catch (_) {}
    
    if (!this._landingApplied && !bLandingDone) {
        this._landingApplied = true;
        try { sessionStorage.setItem('saplc-landing-done', 'true'); } catch (_) {}
        if (sRole === 'User') {
            this.getRouter().navTo('TrainingAssignmentsList');
        }
    }
},
```

2. **Guard the back button for User role.** 

**File: `Saplearning/app/z.sap.courses/webapp/controller/TrainingAssignmentsList.controller.js`**

Replace `onNavBack`:
```javascript
onNavBack: function () {
    var sRole = this.getOwnerComponent()._role || "User";
    
    if (sRole === "User") {
        // User role: back goes to FLP launchpad (not Training Catalog)
        var oCrossAppNav = sap.ushell && sap.ushell.Container && 
            sap.ushell.Container.getService("CrossApplicationNavigation");
        if (oCrossAppNav) {
            oCrossAppNav.toExternal({ target: { shellHash: "#" } });
        } else {
            // Dev mode: go back in browser history
            window.history.back();
        }
    } else {
        // Manager/Admin: navigate to Training Catalog
        this.getOwnerComponent().getRouter().navTo("TrainingsList", {}, true);
    }
},
```

3. **Hide back button for User role** in the view (optional enhancement):

**File: `Saplearning/app/z.sap.courses/webapp/view/TrainingAssignmentsList.view.xml`**

```xml
<Page
    id="assignmentsListPage"
    title="{i18n>myAssignments}"
    showNavButton="{= ${user>/role} !== 'User' }"
    navButtonPress="onNavBack"
    ...>
```

This way User role never sees a confusing back button, while Manager/Admin can navigate back to the catalog.

4. **Clear session landing flag on component destroy:**

```javascript
destroy: function () {
    try { sessionStorage.removeItem('saplc-landing-done'); } catch (_) {}
    // ... rest of existing destroy code
}
```

---

## PART C — Analytics Redesign (Top-Tier Fiori Horizon Design)

Redesign BOTH analytics dashboards with premium, production-grade Fiori Horizon aesthetics. Think Fortune 500 SAP S/4HANA deployment — clean visual hierarchy, generous spacing, smooth micro-interactions, responsive grid, accessible.

### C-1: Team Analytics Dashboard (Manager/Admin — TrainingsList page)

**Current State:** 6 summary cards in a flat row + 3 chart cards in another row. Cards are small (120-200px), cramped. Charts use `ComparisonMicroChart` and `RadialMicroChart` which are tiny visualization components designed for table cells, not dashboards.

**Redesign — New Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  TEAM OVERVIEW                                              [▼ Collapse] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  👥 156  │ │  ⏳  42  │ │  🔄  38  │ │  ⚠️  12  │ │  ✅  64  │ │
│  │  Total   │ │ Pending  │ │ Active   │ │ Overdue  │ │ Complete │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  COMPLETION PROGRESS                                64.5%   │  │
│  │  ████████████████████████████████░░░░░░░░░░░░░░░░          │  │
│  │  Completed: 64  |  Remaining: 92                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────┐  ┌────────────────────────────────┐  │
│  │  STATUS DISTRIBUTION    │  │  TOP MODULES                   │  │
│  │                         │  │                                │  │
│  │  Pending   ████████ 42  │  │  FI/CO    █████████████  12   │  │
│  │  Active    ███████  38  │  │  SD/MM    ████████████   10   │  │
│  │  Overdue   ████     12  │  │  HR/HCM   ████████       8   │  │
│  │  Complete  ████████████ │  │  BTP      ██████         6   │  │
│  │            ████████ 64  │  │  ABAP     █████          5   │  │
│  └─────────────────────────┘  └────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  TEAM MEMBERS                                     Top 10 ▾  │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │ 👤 John Smith      ████████████████████████  8/10 80% │  │  │
│  │  │ 👤 Maria Garcia    ██████████████████       6/10 60% │   │  │
│  │  │ 👤 Alex Chen       ████████████████         5/8  63% │   │  │
│  │  │ 👤 Sarah Wilson    ██████████              3/6  50% │    │  │
│  │  │ 👤 ...                                               │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation Details:**

1. **KPI Cards Row** — Keep 5 cards (drop the RadialMicroChart card — merge its info into a new full-width completion bar):
   - Larger cards: `min-width: 160px`, `min-height: 140px`
   - Each card: Icon (2rem) → Number (2.75rem, bold 800) → Label → Trend micro-text (e.g., "+3 this week")
   - Use CSS Grid: `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`
   - Cards are keyboard-focusable buttons with `role="button"`, `tabindex="0"`, ARIA labels

2. **Completion Progress Bar** — New full-width card replacing RadialMicroChart:
   - `sap.m.ProgressIndicator` full width, height `2.5rem`, rounded, with percentage overlay
   - Color: gradient from Warning (0-50%) → Critical (50-80%) → Good (80-100%)
   - Below bar: "Completed: {n} | Remaining: {n}" as `sap.m.Text`
   - Animate from 0% to actual on load (`CSS transition: width 1s ease`)

3. **Charts Row** — 2-column grid (status + modules), not 3:
   - **Status Distribution:** Horizontal `sap.m.ProgressIndicator` bars (one per status)
     - Each row: Icon → Label (5rem fixed) → ProgressIndicator (100% fill) → Count
     - Heights: `2.5rem` (bigger than current 2rem)
     - Colors: Pending=Warning, Active=Information, Overdue=Error, Complete=Success
   - **Top Modules:** Same horizontal bar pattern using `sap.m.ProgressIndicator`
     - Show top 5 modules (not 8 — cleaner)
     - Each bar: Module name → ProgressIndicator → Count

4. **Team Members List** — Full-width card at bottom:
   - `sap.m.List` with custom `CustomListItem` (not fragment):
     - Avatar circle (initials) → Name bold → Department → ProgressIndicator → "X/Y (Z%)" 
   - Show top 10, with a "Show All" link that opens existing `TeamAssignmentsDialog`
   - Progress bar colored by completion: <50% Error, 50-80% Warning, ≥80% Success
   - Click a row → open drill-down filtered to that user

**CSS changes for Team Analytics:**

```css
/* Team KPI cards — larger, more spacious */
.teamAnalyticsContainer {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    padding: 1rem;
}

.teamKpiCard {
    min-height: 140px;
    padding: 1rem;
    border-radius: var(--sapRadius);
    background: var(--sapGlass);
    backdrop-filter: blur(12px);
    border: 1px solid var(--sapBorder);
    border-top: 3px solid var(--sapAccent1);
    box-shadow: var(--sapShadowSm);
    transition: all var(--sapTransition);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
}

.teamKpiCard:hover {
    transform: translateY(-3px);
    box-shadow: var(--sapShadowHover);
}

.teamKpiCard:focus-visible {
    outline: 2px solid var(--sapBorderFocus);
    outline-offset: 2px;
}

/* Full-width completion bar card */
.completionBarCard {
    padding: 1rem 1.5rem;
    border-radius: var(--sapRadius);
    background: linear-gradient(135deg, rgba(8,84,160,0.04), rgba(10,110,209,0.04));
    border: 1px solid var(--sapBorder);
    margin: 0 1rem;
}

.completionBarCard .sapMPI {
    height: 2.5rem !important;
    border-radius: 12px;
}

/* Charts 2-column grid */
.teamChartsGrid {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
    padding: 1rem;
}

@media (max-width: 900px) {
    .teamChartsGrid {
        grid-template-columns: 1fr;
    }
}

/* Team Members full-width list card */
.teamMembersCard {
    margin: 0 1rem 1rem;
    border-radius: var(--sapRadius);
    border: 1px solid var(--sapBorder);
    background: var(--sapSurface);
    box-shadow: var(--sapShadowSm);
}

.teamMembersCard .sapMListHdr {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--sapText);
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--sapBorder);
}
```

### C-2: My Progress Dashboard (End-User — TrainingAssignmentsList page)

**Current State:** 4 small cards (Assigned, In Progress, Overdue, Completed) in a flat row. No completion bar, no charts, no visual encouragement.

**Redesign — New Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  MY LEARNING PROGRESS                                    [▼ Collapse] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  🎯 YOUR COMPLETION         ████████████████░░░░░  75%      │  │
│  │     12 of 16 completed · 2 overdue · Keep going! 🔥        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│  │   ⏳ 2    │ │   🔄 2    │ │   ⚠️ 2    │ │   ✅ 12   │         │
│  │  To Start │ │ In Prog.  │ │  Overdue  │ │ Completed │         │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation Details:**

1. **Completion Hero Bar** — NEW full-width motivational card at top:
   - Large `ProgressIndicator` (3rem height, full width, rounded 12px)
   - Percentage text overlaid: bold, 1.5rem
   - Below the bar: motivational subtitle text:
     - `< 25%`: "Just getting started — you've got this!"
     - `25-50%`: "Making progress — keep it up!"
     - `50-75%`: "Over halfway there — great work!"
     - `75-99%`: "Almost done — finish strong! 🔥"
     - `100%`: "All complete — excellent! 🏆"
   - Animate bar width from 0% to actual on load
   - Background: subtle gradient with brand color tint

2. **4 KPI Cards** — Same structure but improved:
   - Use `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))` (not fixed 6-col!)
   - Cards: same glassmorphism style but with `tabindex="0"` + `role="button"` + `aria-label`
   - Overdue card: pulsing subtle red glow animation when count > 0
   - Completed card: subtle green checkmark pulse when 100%

3. **CSS for End-User Analytics:**

```css
/* Completion Hero Card */
.completionHeroCard {
    padding: 1.25rem 1.5rem;
    border-radius: var(--sapRadius);
    background: linear-gradient(135deg, rgba(0,112,242,0.06) 0%, rgba(16,126,62,0.06) 100%);
    border: 1px solid var(--sapBorder);
    margin-bottom: 0.75rem;
}

.completionHeroCard .sapMPI {
    height: 3rem !important;
    border-radius: 12px;
}

.completionHeroCard .sapMPI .sapMPIBar {
    transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.motivationalText {
    font-size: 0.8125rem;
    color: var(--sapNeutral);
    font-weight: 500;
    margin-top: 0.5rem;
}

/* Overdue pulse when count > 0 */
@keyframes overduePulse {
    0%, 100% { box-shadow: var(--sapShadowSm); }
    50% { box-shadow: 0 0 0 4px rgba(187,0,0,0.12), var(--sapShadowSm); }
}

.analyticsCardRed.hasOverdue {
    animation: overduePulse 2.5s ease-in-out infinite;
}

/* User analytics grid — always 4 cols or responsive */
.userAnalyticsContainer {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
    padding: 0.75rem 1rem;
}
```

### C-3: Shared Analytics CSS Improvements

Apply these to BOTH dashboards:

1. **Reduce `!important` count** — Use `.sapCoursesApp` root class for specificity instead:
```css
.sapCoursesApp .analyticsCard .sapMObjectNumber {
    font-size: 2.5rem;  /* no !important */
    font-weight: 800;
}
```

2. **Use SAP theme variables as fallbacks:**
```css
:root {
    --sapBrand: var(--sapBrandColor, #0070f2);
    --sapAccent1: var(--sapAccentColor1, #0854a0);
    /* etc. */
}
```

3. **Add `prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
    .analyticsCard { transition: none !important; }
    .analyticsCard:hover { transform: none; }
    .completionHeroCard .sapMPI .sapMPIBar { transition: none; }
    .analyticsCardRed.hasOverdue { animation: none; }
    @keyframes skeletonPulse { /* no-op */ }
}
```

4. **Add skeleton loading:** Actually USE the existing `analyticsCard--loading` CSS class. In both controllers' load methods, add/remove the class:
```javascript
// Before fetch:
aCards.forEach(function(id) { 
    var oCard = that.byId(id);
    if (oCard) oCard.addStyleClass("analyticsCard--loading");
});
// After fetch (success or error):
aCards.forEach(function(id) {
    var oCard = that.byId(id);
    if (oCard) oCard.removeStyleClass("analyticsCard--loading");
});
```

5. **Keyboard accessibility on all cards:**
```javascript
// In onInit for each clickable card:
oCard.addStyleClass("analyticsCardClickable");
oCard.getDomRef().setAttribute("tabindex", "0");
oCard.getDomRef().setAttribute("role", "button");
oCard.getDomRef().setAttribute("aria-label", i18n.getText("filterBy") + " " + card.label);
oCard.attachBrowserEvent("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        that._filterByStatus(card.status);
    }
});
```

---

## PART D — Frontend Improvements (Prioritized 59 Items)

Implement these in priority order. Group into batches.

### BATCH 1: Critical + High Priority (Must Fix)

#### D-1: EventBus Memory Leak Fix (FE-35)
Both controllers subscribe to `"sapCourses/roleChanged"` in `onInit()` but never unsubscribe.

**Fix:** Add `onExit` to BOTH controllers:

**`TrainingsList.controller.js`:**
```javascript
onExit: function () {
    sap.ui.getCore().getEventBus().unsubscribe("sapCourses", "roleChanged", this._onRoleChanged, this);
    // Detach browser events from analytics cards
    var aCards = ["teamTotalBox","teamAssignedBox","teamInProgressBox","teamOverdueBox","teamCompletedBox"];
    var that = this;
    aCards.forEach(function(id) {
        var oCard = that.byId(id);
        if (oCard) { oCard.detachBrowserEvent("click"); }
    });
},
```

Refactor onInit to store the handler reference:
```javascript
this._onRoleChanged = function () {
    that._loadAllData();
    that._updateTableSelectionMode();
};
sap.ui.getCore().getEventBus().subscribe("sapCourses", "roleChanged", this._onRoleChanged, this);
```

**`TrainingAssignmentsList.controller.js`:** Same pattern.

#### D-2: Hardcoded Strings → i18n (FE-4 through FE-12)
**ALL hardcoded English strings in XML views, fragments, and controllers must use i18n bindings.**

Key files to fix:
- `TrainingsList.view.xml`: 3 hardcoded strings (noDataText, noModuleData, IllustratedMessage)
- `TrainingAssignmentsList.view.xml`: 2 hardcoded strings (IllustratedMessage title/description)
- `AssignDialog.fragment.xml`: 12+ hardcoded strings (title, labels, placeholders, buttons)
- `CreateTrainingDialog.fragment.xml`: 5 hardcoded strings
- `TrainingDetailDialog.fragment.xml`: 1 hardcoded string
- `TrainingsList.controller.js`: 3+ hardcoded messages (delete confirm, URL validation)
- `Component.js`: 5 hardcoded messages in `onAssignSubmit`

Add ALL missing keys to `i18n/i18n.properties`. Also sync `i18n_en.properties` or delete it (UI5 uses the base file as fallback).

#### D-3: AssignDialog Missing i18n Model (FE-46)
In `Component.js`, `_openAssignFragment` loads the `AssignDialog` fragment but doesn't pass the i18n model. After fixing D-2 (hardcoded strings → i18n), the dialog will break without this.

**Fix:** In `_openAssignFragment`, after `Fragment.load().then()`:
```javascript
oDialog.setModel(that.getModel("i18n"), "i18n");
oDialog.setModel(that._userModel, "user");
```

#### D-4: Accessibility — Analytics Cards (FE-15, FE-29, FE-30)
All analytics cards use `attachBrowserEvent("click")` which is mouse-only. See Part C-3 item 5 for the full fix.

Additionally, add ARIA label to `RadialMicroChart`:
```xml
<mc:RadialMicroChart
    id="teamCompletionRadial"
    ...
    ariaLabel="{= 'Team completion rate: ' + ${teamAnalytics>/completionPercent} + '%' }" />
```

#### D-5: CSS `!important` Reduction (FE-22)
Add a root app class to `App.view.xml`:
```xml
<App id="app" class="sapCoursesApp">
```

Then refactor CSS selectors from:
```css
.analyticsCard .sapMObjectNumber {
    font-size: 2.25rem !important;
}
```
To:
```css
.sapCoursesApp .analyticsCard .sapMObjectNumber {
    font-size: 2.25rem;
}
```

Do this for all custom app styles. Keep `!important` ONLY for overriding core SAP FLP/Shell styles (document with `/* FLP override */` comment).

#### D-6: CSS Theme Variables (FE-26)
Replace hardcoded design tokens with SAP theme-aware fallbacks:
```css
:root {
    --sapBrand: var(--sapBrandColor, #0070f2);
    --sapAccent1: var(--sapAccentColor1, #0854a0);
    --sapAccent2: var(--sapAccentColor2, #e76500);
    --sapAccent3: var(--sapAccentColor3, #0a6ed1);
    --sapAccent4: var(--sapAccentColor4, #107e3e);
    --sapAccent5: var(--sapAccentColor5, #6c32a9);
    --sapBg: var(--sapBackgroundColor, #f5f6fa);
    --sapSurface: var(--sapGroup_ContentBackground, #ffffff);
    --sapBorder: var(--sapGroup_ContentBorderColor, #e0e0e0);
    --sapText: var(--sapTextColor, #1d2d3e);
}
```

#### D-7: Unused CSS Cleanup (FE-23, FE-24)
Remove:
- `.teamUserProgressItem` dark-mode rules → rename to `.teamUserRow`
- `.sapSuiteSBMCBarCntr`, `.sapSuiteSBMCBar`, `.sapSuiteSBMCBarText` — StackedBarMicroChart is not used
- `.detailSection` labeled "Legacy fallback"
- Duplicate `html, body` rules (lines ~42 and ~685)
- Duplicate `.sapUiTable { width: 100% !important }`

#### D-8: `onEnrollMe` Missing Confirmation (FE-14)
In `TrainingsList.controller.js`, `onEnrollMe()` immediately creates an assignment. Add `MessageBox.confirm()`:
```javascript
onEnrollMe: function () {
    var that = this;
    var i18n = this.getView().getModel("i18n").getResourceBundle();
    // ... get selected training ...
    
    MessageBox.confirm(i18n.getText("confirmEnroll", [oTraining.Title]), {
        title: i18n.getText("confirmEnrollTitle"),
        emphasizedAction: MessageBox.Action.OK,
        onClose: function (sAction) {
            if (sAction !== MessageBox.Action.OK) { return; }
            // existing create logic here
        }
    });
},
```

#### D-9: Duplicate Overdue Date Logic → Shared Utility (FE-36)
The same `isOverdue(dDueDate, sStatus)` logic appears in 4 places.

**Create `utils/DateHelper.js`:**
```javascript
sap.ui.define([], function () {
    "use strict";
    return {
        isOverdue: function (dDueDate, sStatus) {
            if (sStatus === "Completed") { return false; }
            if (!dDueDate) { return false; }
            var d = (dDueDate instanceof Date) ? dDueDate : new Date(dDueDate);
            if (isNaN(d.getTime())) { return false; }
            var sToday = new Date().toISOString().substring(0, 10);
            var sDue = d.toISOString().substring(0, 10);
            return sDue < sToday;
        }
    };
});
```

Replace all 4 inline calculations with `DateHelper.isOverdue(...)`.

#### D-10: Sequential Deletes → Batch (FE-37)
`onDeassignBtn`, `onDeassignFromDrillDown`, and `onDeleteTraining` use sequential `oModel.remove()` calls. Refactor to use deferred batch groups like `_markCompletedBulk` already does.

#### D-11: Performance — `AnalyticsService.getTrainingStats()` (FE-51)
Add `$select=Role,SapModule,Title` to the `/Trainings` read to avoid transferring full entity data:
```javascript
urlParameters: { 
    "$inlinecount": "allpages",
    "$select": "Role,SapModule,Title"
}
```

### BATCH 2: Medium Priority

#### D-12 (FE-2): NotFound Page — Role-Aware Back Navigation
```javascript
// NotFound.controller.js
onNavBack: function () {
    var sRole = this.getOwnerComponent()._role || "User";
    var sTarget = (sRole === "User") ? "TrainingAssignmentsList" : "TrainingsList";
    this.getOwnerComponent().getRouter().navTo(sTarget, {}, true);
}
```

#### D-13 (FE-16): Fix 4-Card Grid Layout for Assignments Analytics
The `.analyticsContainer` uses `grid-template-columns: repeat(6, 1fr)` but assignments only has 4 cards. Add modifier:
```css
.userAnalyticsContainer {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
}
```
Add class `userAnalyticsContainer` to the My Progress HBox in `TrainingAssignmentsList.view.xml`.

#### D-14 (FE-17): Team Analytics Error State Visible to User
When both `getTeamAnalytics` and fallback fail, show a `MessageStrip`:
```javascript
// In _loadTeamAnalyticsFallback error handler:
var oPanel = this.byId("teamAnalyticsPanel");
if (oPanel) {
    var oStrip = new sap.m.MessageStrip({
        text: i18n.getText("teamAnalyticsLoadFailed"),
        type: "Warning",
        showIcon: true,
        showCloseButton: true
    });
    oPanel.insertContent(oStrip, 0);
}
```

#### D-15 (FE-19): Phone-Stretch All Dialogs
In every `Fragment.load().then()` callback, add:
```javascript
if (sap.ui.Device.system.phone) {
    oDialog.setStretch(true);
}
```
Apply to: `CreateTrainingDialog`, `ImportDialog`, `AssignDialog`, `TeamAssignmentsDialog`.

#### D-16 (FE-20): Tooltips on Analytics Cards
Add tooltips to each analytics card in the view XML:
```xml
<VBox id="teamAssignedBox" ... tooltip="{i18n>clickToFilter}">
```

#### D-17 (FE-25): Extend Dark Mode Coverage
Extend the `@media (prefers-color-scheme: dark)` section to cover:
- Header gradient bar
- SmartFilterBar background
- SmartTable toolbar
- Detail dialog cards (`.detailHeaderCard`, `.detailCard`)
- Page background
- IL message (empty state)
- Progress indicators
- Scrollbar colors

#### D-18 (FE-31): ARIA Live Region for Analytics
Wrap analytics container in view XML:
```xml
<VBox id="analyticsLiveRegion" ariaLabelledBy="..." 
      customData:aria-live="polite">
```
Or use `sap.ui.core.InvisibleMessage.announce()` after data loads:
```javascript
sap.ui.require(["sap/ui/core/InvisibleMessage", "sap/ui/core/library"], function(InvisibleMessage, coreLib) {
    InvisibleMessage.getInstance().announce(
        "Team analytics loaded: " + total + " assignments, " + completed + " completed",
        coreLib.InvisibleMessageMode.Polite
    );
});
```

#### D-19 (FE-39): Remove Redundant `_applyLinkTemplates` Call
Remove the `_applyLinkTemplates()` call from `onBeforeRebindTable`. Reset `_linksApplied = false` there instead so the `rowsUpdated` handler re-applies after new data loads.

#### D-20 (FE-40): Fragment.byId Instead of sap.ui.getCore().byId
In the import CSV handler, replace:
```javascript
sap.ui.getCore().byId("previewPanel")
```
With:
```javascript
sap.ui.core.Fragment.byId(this._importDlg.getId(), "previewPanel")
```
Or use `this._importDlg.getContent()` traversal.

#### D-21 (FE-42): Replace Deprecated EventBus API
Replace all `sap.ui.getCore().getEventBus()` calls with:
```javascript
this.getOwnerComponent().getEventBus()
```
This is component-scoped and not deprecated.

#### D-22 (FE-43): Fix `bUseBatch` Thread-Safety
Instead of toggling `oModel.bUseBatch`, pass `groupId: "$direct"` to individual reads:
```javascript
oModel.read("/TrainingAssignments", {
    groupId: "$direct",
    // ... other params
});
```
This bypasses batch for that single call without affecting concurrent operations.

#### D-23 (FE-45): Standardize Fragment Loading
Standardize: controllers use `this.loadFragment()`. Component.js uses `Fragment.load()` with explicit controller.

#### D-24 (FE-48): Sync or Delete `i18n_en.properties`
Either delete `i18n_en.properties` (SAPUI5 uses `i18n.properties` as fallback) or synchronize all keys.

#### D-25 (FE-53): Optimize `_applyAssignmentColumnTemplates`
Replace per-row cell manipulation on every `updateFinished` with column-level template configuration at init time.

#### D-26 (FE-55): Consider ResponsiveTable for TrainingsList
The TrainingsList SmartTable uses `sap.ui.table.Table` (GridTable). On mobile/tablet this is not touch-friendly. Consider `tableType="ResponsiveTable"` or at minimum configure `demandPopin="true"`.

#### D-27 (FE-56): Add Page Title to TrainingsList Header
```xml
<contentLeft>
    <Title id="headerTitle" text="{i18n>appTitle}" level="H3" />
</contentLeft>
```

### BATCH 3: Low Priority (Nice to Have)

#### D-28 (FE-3): Bookmarkable Status Filters via URL Hash
#### D-29 (FE-21): Undo After Mark-Completed (5-second window)
#### D-30 (FE-27): `backdrop-filter` Fallback for Older Browsers
#### D-31 (FE-28): `prefers-reduced-motion` (covered in Part C-3)
#### D-32 (FE-34): Stable Fragment IDs (replace `Date.now()` suffix)
#### D-33 (FE-44): Remove Dead `_buildUserProgressList` Method
#### D-34 (FE-47): Extract `TeamUserRow` Completion % to Formatter
#### D-35 (FE-49): Remove Duplicate `dueDateLabel2` from i18n
#### D-36 (FE-50): Add SAP i18n Type Annotations (`#XTIT:`, `#XBUT:`, etc.)
#### D-37 (FE-52): Guard `_formatDateColumns` with Applied Flag
#### D-38 (FE-54): Lazy-Load Drill-Down Data (only on card click)
#### D-39 (FE-58): Responsive RadialMicroChart Sizing
#### D-40 (FE-59): Overdue Badge in Drill-Down Dialog Table

---

## Implementation Order

1. **Part B** (back nav fix) — Critical bug fix
2. **Part A** (3 audit items) — Clear remaining audit debt
3. **Part C** (analytics redesign) — Major visual upgrade
4. **Part D Batch 1** (D-1 through D-11) — High-priority frontend fixes
5. **Part D Batch 2** (D-12 through D-27) — Medium-priority improvements
6. **Part D Batch 3** (D-28 through D-40) — Polish

After all changes, bump version in `manifest.json` to `2.1.0`, commit, and push to GitHub.

---

## Files Modified (Expected)

| File | Changes |
|---|---|
| `Component.js` | Back nav fix, sessionStorage landing, i18n model on AssignDialog, EventBus migration |
| `TrainingsList.controller.js` | onExit cleanup, skeleton loading, batch deletes, DateHelper import, i18n strings |
| `TrainingAssignmentsList.controller.js` | onNavBack role-aware, onExit cleanup, deassign button wiring, dataReceived handler, DateHelper |
| `TrainingsList.view.xml` | Analytics redesign (completion bar, 2-col charts, team members list), i18n strings, a11y |
| `TrainingAssignmentsList.view.xml` | Analytics redesign (hero bar, 4-col grid), showNavButton conditional, deassign button, i18n |
| `style.css` | New analytics classes, theme variables, dark mode extension, !important reduction, cleanup |
| `fragments/AssignDialog.fragment.xml` | All hardcoded strings → i18n |
| `fragments/CreateTrainingDialog.fragment.xml` | Hardcoded strings → i18n |
| `fragments/TrainingDetailDialog.fragment.xml` | Hardcoded string → i18n |
| `i18n/i18n.properties` | ~30 new keys added |
| `i18n/i18n_en.properties` | Sync or delete |
| `utils/DateHelper.js` | NEW — shared overdue check utility |
| `view/App.view.xml` | Add `sapCoursesApp` class |
| `view/NotFound.view.xml` | Role-aware back nav |
| `controller/NotFound.controller.js` | Role-aware onNavBack |
| `services/AnalyticsService.js` | Add $select to training stats read |
| `abap/FIXES_V170/Z_COURSES_MGR_AUTH_OBJECT_GUIDE.abap` | DELETE |
| `manifest.json` | Version → 2.1.0 |

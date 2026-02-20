# Changelog

All notable changes to the SAP Learning Courses app are documented here.

## [2.0.1] - 2025-06-22

### Security (P0)
- **SEC-5**: Added XSS sanitization (strip `<`/`>`) to `TRAININGS_UPDATE_ENTITY.abap` — matches CREATE_ENTITY pattern
- **WF-8**: Fixed empty userId bypass in mark-completed — blocks completion when userId is empty (User role)
- **NM-5**: Fixed remaining `Z_COURSES_MGR` → `Z_COURSES` in FIXES_V170 reference file

### Features (P1)
- **NEW-1**: CSV Import — Admin can bulk import trainings from CSV via Import button + ImportDialog fragment
- **AN-1**: Overdue card click handler — clicking the Overdue analytics card now opens drill-down filtered to overdue assignments
- **UI-9/UI-10**: Role switcher on Assignments page now uses dynamic `{user>/availableRoles}` binding instead of hard-coded items

### Performance (P2)
- **ABP-8**: Replaced N+1 `SELECT SINGLE` queries in `USERSET_GET_ENTITYSET` with `FOR ALL ENTRIES` bulk reads (ADRP + ADR6)
- **ABP-3**: Added Title search filter (case-insensitive LIKE) to `TRAININGASSIGNMENTS_GET_ENTITYSET` for assignment search

### Security (P2)
- **SEC-2**: Email addresses in UserSet restricted to Admin/Manager roles only (ACTVT 01/02); User role (ACTVT 03 only) receives blank email

### i18n
- Added `teamDrilldownOverdue` string for overdue drill-down dialog title

## [2.0.0] - 2025-06-21

### Major Release — 23 items implemented

#### Security
- Canonical auth object `Z_COURSES` with ACTVT 01/02/03/06
- SEC-3: Server-side UserId enforcement in TRAININGASSIGNMENTS_GET_ENTITYSET
- Input sanitization (XSS strip in CREATE_ENTITY, URL format validation)

#### Features
- Full admin CRUD: Create, Delete (multi-select), Update trainings
- Assign Training dialog with MultiComboBox user picker + DatePicker
- Self-enrollment (Enroll Me button for User role)
- Start Training (status → In Progress)
- Mark Completed (single + bulk)
- De-assign (Manager/Admin)
- Team Analytics dashboard (Manager/Admin) with drill-down
- Module distribution chart (ComparisonMicroChart)
- User progress list with ProgressIndicator
- CSV Import dialog + CSVParser utility
- MessagePopover for global error display

#### UI/UX
- SmartFilterBar with Role/Module dropdowns + basic search
- SmartTable with GridTable (Trainings) and ResponsiveTable (Assignments)
- Dark mode CSS support
- Empty state IllustratedMessages
- Status coloring with ObjectStatus + overdue indicators
- FLP tile configuration

#### Backend (ABAP)
- All 6 CRUD methods + 2 GET_ENTITYSET methods + UserSet + Value Helps
- getCurrentRole Function Import for PFCG role detection
- $inlinecount support on all GET_ENTITYSET methods
- Server-side pagination ($skip/$top)
- Duplicate assignment check
- Cascading authority checks

## [1.0.0] - 2025-06-20

### Initial Release
- Basic training catalog with OData V2
- Training assignments list
- SEGW project ZCOURSES with entity types: Training, TrainingAssignment, User, RolesVH, ModulesVH

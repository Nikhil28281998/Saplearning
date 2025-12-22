# Training Management System (SAP CAP + Fiori Elements)

## Business Use Case
Manage training content and user assignments with clear workflows:
- Admin: Manages users and organization structure.
- Manager: Assigns trainings to users and tracks team progress.
- User: Views all trainings and completes their own assignments.

## Architecture
- Backend: SAP CAP (Node.js) with OData V4
- UI: SAP Fiori Elements (ListReport/ObjectPage) with FlexibleColumnLayout
- Database: SQLite for local dev, HANA for production
- Service: SaplearningcenterService (srv/service.cds)
  - Entities: Trainings, TrainingAssignments, Users
  - Action: markCompleted (srv/SaplearningcenterService.js) sets status and server timestamp

## Role Definitions (RBAC)
Defined declaratively in srv/service.cds using @restrict:
- Admin: Full CRUD on Trainings, TrainingAssignments, and Users
- Manager/Lead: READ on Trainings; manage TrainingAssignments for their team
- User: READ on Trainings; READ + limited UPDATE on own TrainingAssignments (status, completionDate) where userId = $user

## Local Testing Guide
- Install dependencies: npm install (at repo root)
- Start: npm run cds-watch or cds watch
- Mock users (development): configured in package.json
  - alice → Admin
  - bob → Manager
  - charles → User
- UI entry: app/saplearningcenter.saplearningcenter/webapp/index.html
- URL role override for preview: ?saplc-role=Admin|Manager|User (server RBAC still enforced)

## Navigation
- Trainings: ListReport → ObjectPage
- "Training Text" button in Trainings header/toolbar navigates to "My Trainings" (ListReport bound to TrainingAssignments)
- TrainingAssignments: line-item action "Mark Completed" with immediate UI refresh (SideEffects)

## Data and Seeds
- Trainings CSV: db/data/Learning_Data-Trainings.csv
- TrainingAssignments CSV: db/data/Learning_Data-TrainingAssignments.csv (trainingId links to Trainings)
- Users CSV: db/data/Learning_Data-Users.csv

## Deployment (Cloud Ready)
- Security: xs-security.json defines scopes and role-templates (Admin, Manager, User)
- DB: HANA in production via cds.requires.db=hana; SQLite locally via @cap-js/sqlite
- FLP: manifest.json includes inbounds; app ready for Fiori Launchpad tiles

## SOP: Common Tasks
- Add trainings: append new rows to Trainings CSV with unique UUIDs
- Assign training (Manager/Admin): use "Assign" header action on Trainings ListReport
- Mark completion (User): use the line-item action on "My Trainings"

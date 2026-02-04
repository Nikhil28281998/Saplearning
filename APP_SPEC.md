# SAP CAP Project Specification: Training Management System

## 1. Core Goal
A Fiori-style app to manage training data imported from Excel. The app tracks user progress and allows role-based management.

## 2. Data Structure
- **Entity: Trainings**: Based on Excel/datamodel headers and sample data.
- **Entity: Assignments**: Links Users to Trainings.
- **Fields for Completion**: `status` (Pending/Completed), `completionDate` (Timestamp).

## 3. Role-Based Access Control (RBAC)
- **Admin**: Full CRUD (Create, Read, Update, Delete) on all data.
- **Manager/Lead**: Read-only Trainings; can Create/Update Assignments for Users.
- **User**: View all Trainings; View "My Assignments"; can update status to 'Completed' for their own assignments.

## 4. Specific Logic Requirements
- When a User marks a training as "Completed," the system must automatically capture the current date and time (Timestamp).
- The UI must be a Fiori Elements template.
- There should be a 'Training Text' option on the results header (Missing).
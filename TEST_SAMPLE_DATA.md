# Test Sample Data for ZCOURSES Table

## 10 Training Records for Testing

### How to Import

**Method 1: Gateway Client (/IWFND/GW_CLIENT)**
1. Transaction: `/IWFND/GW_CLIENT`
2. Service Name: `ZCOURSES_SRV`
3. HTTP Method: `POST`
4. Request URI: `/Trainings`
5. Content-Type: `application/json`
6. Paste each JSON record below and execute

**Method 2: Direct SQL (SE16N)**
1. Transaction: `SE16N`
2. Table: `ZCOURSES`
3. Click "Create" and enter values manually

---

## Record 1: ABAP Basics
```json
{
  "Id": "TRAIN-001",
  "Url": "https://learning.sap.com/courses/abap-programming-basics",
  "Role": "Developer",
  "Title": "ABAP Programming Basics",
  "SapModule": "ABAP",
  "Description": "Introduction to ABAP programming language for S/4HANA development",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/ABAP_PLATFORM"
}
```

## Record 2: Fiori Overview
```json
{
  "Id": "TRAIN-002",
  "Url": "https://learning.sap.com/courses/fiori-development-overview",
  "Role": "Developer",
  "Title": "SAP Fiori Development Overview",
  "SapModule": "FIORI",
  "Description": "Learn how to build SAP Fiori apps with SAPUI5 framework",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/SAP_FIORI"
}
```

## Record 3: S/4HANA Finance
```json
{
  "Id": "TRAIN-003",
  "Url": "https://learning.sap.com/courses/s4hana-finance-overview",
  "Role": "Consultant",
  "Title": "S/4HANA Finance Overview",
  "SapModule": "FI",
  "Description": "Comprehensive guide to Financial Accounting in S/4HANA",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/FI"
}
```

## Record 4: OData Services
```json
{
  "Id": "TRAIN-004",
  "Url": "https://learning.sap.com/courses/odata-service-development",
  "Role": "Developer",
  "Title": "Building OData Services in ABAP",
  "SapModule": "GATEWAY",
  "Description": "Create and expose RESTful OData services using SAP Gateway",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/SAP_GATEWAY"
}
```

## Record 5: Materials Management
```json
{
  "Id": "TRAIN-005",
  "Url": "https://learning.sap.com/courses/materials-management-mm",
  "Role": "Consultant",
  "Title": "SAP Materials Management (MM)",
  "SapModule": "MM",
  "Description": "Master procurement, inventory management, and invoice verification",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/MM"
}
```

## Record 6: Sales & Distribution
```json
{
  "Id": "TRAIN-006",
  "Url": "https://learning.sap.com/courses/sales-distribution-sd",
  "Role": "Consultant",
  "Title": "Sales & Distribution (SD) Fundamentals",
  "SapModule": "SD",
  "Description": "Learn order-to-cash processes and sales configuration",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/SD"
}
```

## Record 7: BTP Integration
```json
{
  "Id": "TRAIN-007",
  "Url": "https://learning.sap.com/courses/btp-integration-suite",
  "Role": "Architect",
  "Title": "SAP BTP Integration Suite",
  "SapModule": "BTP",
  "Description": "Connect cloud and on-premise systems using Integration Suite",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/SAP_INTEGRATION_SUITE"
}
```

## Record 8: ABAP CDS Views
```json
{
  "Id": "TRAIN-008",
  "Url": "https://learning.sap.com/courses/abap-cds-views-advanced",
  "Role": "Developer",
  "Title": "Advanced ABAP CDS Views",
  "SapModule": "ABAP",
  "Description": "Master Core Data Services for data modeling and virtual data models",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/ABAP_PLATFORM/CDS"
}
```

## Record 9: Workflow Management
```json
{
  "Id": "TRAIN-009",
  "Url": "https://learning.sap.com/courses/workflow-management",
  "Role": "Manager",
  "Title": "SAP Workflow Management",
  "SapModule": "WORKFLOW",
  "Description": "Design and implement business workflows for process automation",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/WORKFLOW_MANAGEMENT"
}
```

## Record 10: Security & Authorization
```json
{
  "Id": "TRAIN-010",
  "Url": "https://learning.sap.com/courses/security-authorization",
  "Role": "Administrator",
  "Title": "S/4HANA Security & Authorizations",
  "SapModule": "BASIS",
  "Description": "Configure roles, profiles, and authorization objects for enterprise security",
  "LastUpdated": "2026-02-09T00:00:00",
  "SapHelpLink": "https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/BASIS"
}
```

---

## SQL Insert Statements (Alternative Method)

If you prefer direct database insertion via SE16N or DBACOCKPIT:

```sql
-- Note: Replace 800 with your actual client number (MANDT)

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-001', 'https://learning.sap.com/courses/abap-programming-basics', 'Developer', 'ABAP Programming Basics', 'ABAP', 'Introduction to ABAP programming language for S/4HANA development', '20260209', 'https://help.sap.com/docs/ABAP_PLATFORM');

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-002', 'https://learning.sap.com/courses/fiori-development-overview', 'Developer', 'SAP Fiori Development Overview', 'FIORI', 'Learn how to build SAP Fiori apps with SAPUI5 framework', '20260209', 'https://help.sap.com/docs/SAP_FIORI');

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-003', 'https://learning.sap.com/courses/s4hana-finance-overview', 'Consultant', 'S/4HANA Finance Overview', 'FI', 'Comprehensive guide to Financial Accounting in S/4HANA', '20260209', 'https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/FI');

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-004', 'https://learning.sap.com/courses/odata-service-development', 'Developer', 'Building OData Services in ABAP', 'GATEWAY', 'Create and expose RESTful OData services using SAP Gateway', '20260209', 'https://help.sap.com/docs/SAP_GATEWAY');

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-005', 'https://learning.sap.com/courses/materials-management-mm', 'Consultant', 'SAP Materials Management (MM)', 'MM', 'Master procurement, inventory management, and invoice verification', '20260209', 'https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/MM');

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-006', 'https://learning.sap.com/courses/sales-distribution-sd', 'Consultant', 'Sales & Distribution (SD) Fundamentals', 'SD', 'Learn order-to-cash processes and sales configuration', '20260209', 'https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/SD');

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-007', 'https://learning.sap.com/courses/btp-integration-suite', 'Architect', 'SAP BTP Integration Suite', 'BTP', 'Connect cloud and on-premise systems using Integration Suite', '20260209', 'https://help.sap.com/docs/SAP_INTEGRATION_SUITE');

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-008', 'https://learning.sap.com/courses/abap-cds-views-advanced', 'Developer', 'Advanced ABAP CDS Views', 'ABAP', 'Master Core Data Services for data modeling and virtual data models', '20260209', 'https://help.sap.com/docs/ABAP_PLATFORM/CDS');

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-009', 'https://learning.sap.com/courses/workflow-management', 'Manager', 'SAP Workflow Management', 'WORKFLOW', 'Design and implement business workflows for process automation', '20260209', 'https://help.sap.com/docs/WORKFLOW_MANAGEMENT');

INSERT INTO ZCOURSES VALUES ('800', 'TRAIN-010', 'https://learning.sap.com/courses/security-authorization', 'Administrator', 'S/4HANA Security & Authorizations', 'BASIS', 'Configure roles, profiles, and authorization objects for enterprise security', '20260209', 'https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/BASIS');
```

---

## Test Coverage

This data set covers:
- **Roles**: Developer (4), Consultant (3), Administrator (1), Manager (1), Architect (1)
- **Modules**: ABAP (2), FIORI (1), FI (1), GATEWAY (1), MM (1), SD (1), BTP (1), WORKFLOW (1), BASIS (1)
- **Variety**: Different URL patterns, description lengths, and help links

Perfect for testing:
- List Report filters (Role, Module)
- Search functionality
- Sorting and pagination
- URL navigation
- Authorization scenarios

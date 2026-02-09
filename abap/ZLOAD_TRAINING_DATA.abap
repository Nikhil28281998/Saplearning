*&---------------------------------------------------------------------*
*& Report ZLOAD_TRAINING_DATA
*&---------------------------------------------------------------------*
*& Load 52 SAP Training Courses from CSV data into ZCOURSES table
*& SAP Clean Code: Simplified table name (ZCOURSES instead of ZCOURSES_TRAIN)
*& Uses ID field (not COURSE_ID) to match frontend
*&---------------------------------------------------------------------*
REPORT zload_training_data.

TYPES: BEGIN OF ty_training,
         id            TYPE char36,
         url           TYPE char255,
         role          TYPE char20,
         title         TYPE char100,
         module        TYPE char20,
         description   TYPE char255,
         last_updated  TYPE dats,
         sap_help_link TYPE char255,
       END OF ty_training.

DATA: lt_training TYPE TABLE OF zcourses,
      ls_training TYPE zcourses,
      lv_lines    TYPE i.

* Training data (52 records from CSV)
ls_training-mandt = sy-mandt.

* Record 1
ls_training-id = '11111111-1111-1111-1111-111111111111'.
ls_training-url = 'https://learning.sap.com/fiori-fundamentals'.
ls_training-role = 'Developer'.
ls_training-title = 'SAP Fiori Fundamentals'.
ls_training-module = 'UI_UX'.
ls_training-description = 'Master SAP Fiori design principles and best practices for building intuitive user interfaces'.
ls_training-last_updated = '20260201'.
ls_training-sap_help_link = 'https://help.sap.com/docs/fiori'.
APPEND ls_training TO lt_training.

* Record 2
ls_training-id = '22222222-2222-2222-2222-222222222222'.
ls_training-url = 'https://learning.sap.com/abap-objects'.
ls_training-role = 'Developer'.
ls_training-title = 'ABAP Objects Programming'.
ls_training-module = 'ABAP'.
ls_training-description = 'Learn object-oriented ABAP programming for S/4HANA applications'.
ls_training-last_updated = '20260201'.
ls_training-sap_help_link = 'https://help.sap.com/docs/abap'.
APPEND ls_training TO lt_training.

* Record 3
ls_training-id = '33333333-3333-3333-3333-333333333333'.
ls_training-url = 'https://learning.sap.com/rap-development'.
ls_training-role = 'Developer'.
ls_training-title = 'RAP Development Guide'.
ls_training-module = 'ABAP'.
ls_training-description = 'Build Fiori apps using RESTful ABAP Programming model'.
ls_training-last_updated = '20260202'.
ls_training-sap_help_link = 'https://help.sap.com/docs/rap'.
APPEND ls_training TO lt_training.

* Record 4
ls_training-id = '44444444-4444-4444-4444-444444444444'.
ls_training-url = 'https://learning.sap.com/ui5-essentials'.
ls_training-role = 'Developer'.
ls_training-title = 'SAPUI5 Essentials'.
ls_training-module = 'UI_UX'.
ls_training-description = 'Complete SAPUI5 framework training for enterprise applications'.
ls_training-last_updated = '20260202'.
ls_training-sap_help_link = 'https://help.sap.com/docs/ui5'.
APPEND ls_training TO lt_training.

* Record 5
ls_training-id = '55555555-5555-5555-5555-555555555555'.
ls_training-url = 'https://learning.sap.com/basis-administration'.
ls_training-role = 'Admin'.
ls_training-title = 'SAP Basis Administration'.
ls_training-module = 'BASIS'.
ls_training-description = 'System administration and monitoring for S/4HANA systems'.
ls_training-last_updated = '20260203'.
ls_training-sap_help_link = 'https://help.sap.com/docs/basis'.
APPEND ls_training TO lt_training.

* Record 6
ls_training-id = '66666666-6666-6666-6666-666666666666'.
ls_training-url = 'https://learning.sap.com/hana-database'.
ls_training-role = 'Admin'.
ls_training-title = 'SAP HANA Database Administration'.
ls_training-module = 'HANA'.
ls_training-description = 'Manage and optimize SAP HANA database performance'.
ls_training-last_updated = '20260203'.
ls_training-sap_help_link = 'https://help.sap.com/docs/hana'.
APPEND ls_training TO lt_training.

* Record 7
ls_training-id = '77777777-7777-7777-7777-777777777777'.
ls_training-url = 'https://learning.sap.com/fico-fundamentals'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP FICO Fundamentals'.
ls_training-module = 'FI_CO'.
ls_training-description = 'Financial accounting and controlling configuration and processes'.
ls_training-last_updated = '20260204'.
ls_training-sap_help_link = 'https://help.sap.com/docs/fico'.
APPEND ls_training TO lt_training.

* Record 8
ls_training-id = '88888888-8888-8888-8888-888888888888'.
ls_training-url = 'https://learning.sap.com/mm-procurement'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP MM Material Management'.
ls_training-module = 'MM'.
ls_training-description = 'Materials management and procurement business processes'.
ls_training-last_updated = '20260204'.
ls_training-sap_help_link = 'https://help.sap.com/docs/mm'.
APPEND ls_training TO lt_training.

* Record 9
ls_training-id = '99999999-9999-9999-9999-999999999999'.
ls_training-url = 'https://learning.sap.com/sd-sales'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP SD Sales & Distribution'.
ls_training-module = 'SD'.
ls_training-description = 'Sales order processing and distribution management'.
ls_training-last_updated = '20260205'.
ls_training-sap_help_link = 'https://help.sap.com/docs/sd'.
APPEND ls_training TO lt_training.

* Record 10
ls_training-id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'.
ls_training-url = 'https://learning.sap.com/pp-production'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP PP Production Planning'.
ls_training-module = 'PP'.
ls_training-description = 'Production planning and manufacturing execution processes'.
ls_training-last_updated = '20260205'.
ls_training-sap_help_link = 'https://help.sap.com/docs/pp'.
APPEND ls_training TO lt_training.

* Record 11
ls_training-id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'.
ls_training-url = 'https://learning.sap.com/security-pfcg'.
ls_training-role = 'Admin'.
ls_training-title = 'SAP Security & PFCG'.
ls_training-module = 'SECURITY'.
ls_training-description = 'Role-based authorization and user management with PFCG'.
ls_training-last_updated = '20260206'.
ls_training-sap_help_link = 'https://help.sap.com/docs/security'.
APPEND ls_training TO lt_training.

* Record 12
ls_training-id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'.
ls_training-url = 'https://learning.sap.com/grc-compliance'.
ls_training-role = 'Admin'.
ls_training-title = 'SAP GRC Compliance'.
ls_training-module = 'SECURITY'.
ls_training-description = 'Governance risk and compliance management in SAP'.
ls_training-last_updated = '20260206'.
ls_training-sap_help_link = 'https://help.sap.com/docs/grc'.
APPEND ls_training TO lt_training.

* Record 13
ls_training-id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'.
ls_training-url = 'https://learning.sap.com/cds-modeling'.
ls_training-role = 'Developer'.
ls_training-title = 'CDS View Modeling'.
ls_training-module = 'ABAP'.
ls_training-description = 'Create and optimize Core Data Services views for analytics'.
ls_training-last_updated = '20260128'.
ls_training-sap_help_link = 'https://help.sap.com/docs/cds'.
APPEND ls_training TO lt_training.

* Record 14
ls_training-id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'.
ls_training-url = 'https://learning.sap.com/odata-services'.
ls_training-role = 'Developer'.
ls_training-title = 'OData Service Development'.
ls_training-module = 'ABAP'.
ls_training-description = 'Build and expose OData V2/V4 services in S/4HANA'.
ls_training-last_updated = '20260128'.
ls_training-sap_help_link = 'https://help.sap.com/docs/odata'.
APPEND ls_training TO lt_training.

* Record 15
ls_training-id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'.
ls_training-url = 'https://learning.sap.com/btp-fundamentals'.
ls_training-role = 'Developer'.
ls_training-title = 'SAP BTP Cloud Platform'.
ls_training-module = 'BTP'.
ls_training-description = 'SAP Business Technology Platform fundamentals and architecture'.
ls_training-last_updated = '20260129'.
ls_training-sap_help_link = 'https://help.sap.com/docs/btp'.
APPEND ls_training TO lt_training.

* Record 16
ls_training-id = '10101010-1010-1010-1010-101010101010'.
ls_training-url = 'https://learning.sap.com/cap-nodejs'.
ls_training-role = 'Developer'.
ls_training-title = 'CAP Node.js Development'.
ls_training-module = 'BTP'.
ls_training-description = 'Build cloud applications with SAP Cloud Application Programming Model'.
ls_training-last_updated = '20260129'.
ls_training-sap_help_link = 'https://help.sap.com/docs/cap'.
APPEND ls_training TO lt_training.

* Record 17
ls_training-id = '11111111-2222-3333-4444-555555555555'.
ls_training-url = 'https://learning.sap.com/wm-warehouse'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP WM Warehouse Management'.
ls_training-module = 'MM'.
ls_training-description = 'Warehouse management and inventory control processes'.
ls_training-last_updated = '20260130'.
ls_training-sap_help_link = 'https://help.sap.com/docs/wm'.
APPEND ls_training TO lt_training.

* Record 18
ls_training-id = '22222222-3333-4444-5555-666666666666'.
ls_training-url = 'https://learning.sap.com/qm-quality'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP QM Quality Management'.
ls_training-module = 'PP'.
ls_training-description = 'Quality planning inspection and certificates in production'.
ls_training-last_updated = '20260130'.
ls_training-sap_help_link = 'https://help.sap.com/docs/qm'.
APPEND ls_training TO lt_training.

* Record 19
ls_training-id = '33333333-4444-5555-6666-777777777777'.
ls_training-url = 'https://learning.sap.com/pm-maintenance'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP PM Plant Maintenance'.
ls_training-module = 'PM'.
ls_training-description = 'Preventive and corrective maintenance management'.
ls_training-last_updated = '20260131'.
ls_training-sap_help_link = 'https://help.sap.com/docs/pm'.
APPEND ls_training TO lt_training.

* Record 20
ls_training-id = '44444444-5555-6666-7777-888888888888'.
ls_training-url = 'https://learning.sap.com/ps-project'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP PS Project Systems'.
ls_training-module = 'PM'.
ls_training-description = 'Project planning execution and controlling processes'.
ls_training-last_updated = '20260131'.
ls_training-sap_help_link = 'https://help.sap.com/docs/ps'.
APPEND ls_training TO lt_training.

* Record 21
ls_training-id = '55555555-6666-7777-8888-999999999999'.
ls_training-url = 'https://learning.sap.com/hr-payroll'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP HCM Payroll'.
ls_training-module = 'HR'.
ls_training-description = 'Human capital management and payroll processing'.
ls_training-last_updated = '20260201'.
ls_training-sap_help_link = 'https://help.sap.com/docs/hcm'.
APPEND ls_training TO lt_training.

* Record 22
ls_training-id = '66666666-7777-8888-9999-aaaaaaaaaaaa'.
ls_training-url = 'https://learning.sap.com/successfactors'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP SuccessFactors Core'.
ls_training-module = 'HR'.
ls_training-description = 'Employee central and talent management in SuccessFactors'.
ls_training-last_updated = '20260201'.
ls_training-sap_help_link = 'https://help.sap.com/docs/successfactors'.
APPEND ls_training TO lt_training.

* Record 23
ls_training-id = '77777777-8888-9999-aaaa-bbbbbbbbbbbb'.
ls_training-url = 'https://learning.sap.com/ariba-procurement'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP Ariba Procurement'.
ls_training-module = 'MM'.
ls_training-description = 'Cloud-based procurement and supplier management'.
ls_training-last_updated = '20260202'.
ls_training-sap_help_link = 'https://help.sap.com/docs/ariba'.
APPEND ls_training TO lt_training.

* Record 24
ls_training-id = '88888888-9999-aaaa-bbbb-cccccccccccc'.
ls_training-url = 'https://learning.sap.com/concur-expense'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP Concur Expense'.
ls_training-module = 'FI_CO'.
ls_training-description = 'Travel and expense management in the cloud'.
ls_training-last_updated = '20260202'.
ls_training-sap_help_link = 'https://help.sap.com/docs/concur'.
APPEND ls_training TO lt_training.

* Record 25
ls_training-id = '99999999-aaaa-bbbb-cccc-dddddddddddd'.
ls_training-url = 'https://learning.sap.com/analytics-cloud'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP Analytics Cloud'.
ls_training-module = 'ANALYTICS'.
ls_training-description = 'Business intelligence and planning with SAC'.
ls_training-last_updated = '20260203'.
ls_training-sap_help_link = 'https://help.sap.com/docs/sac'.
APPEND ls_training TO lt_training.

* Record 26
ls_training-id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'.
ls_training-url = 'https://learning.sap.com/bw4hana'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP BW/4HANA'.
ls_training-module = 'ANALYTICS'.
ls_training-description = 'Data warehousing and analytics with BW/4HANA'.
ls_training-last_updated = '20260203'.
ls_training-sap_help_link = 'https://help.sap.com/docs/bw4hana'.
APPEND ls_training TO lt_training.

* Record 27
ls_training-id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'.
ls_training-url = 'https://learning.sap.com/s4hana-migration'.
ls_training-role = 'Admin'.
ls_training-title = 'S/4HANA Migration'.
ls_training-module = 'BASIS'.
ls_training-description = 'System conversion and migration strategies to S/4HANA'.
ls_training-last_updated = '20260204'.
ls_training-sap_help_link = 'https://help.sap.com/docs/s4hana'.
APPEND ls_training TO lt_training.

* Record 28
ls_training-id = 'cccccccc-dddd-eeee-ffff-111111111111'.
ls_training-url = 'https://learning.sap.com/transport-management'.
ls_training-role = 'Admin'.
ls_training-title = 'Transport Management'.
ls_training-module = 'BASIS'.
ls_training-description = 'Change and transport system configuration and management'.
ls_training-last_updated = '20260204'.
ls_training-sap_help_link = 'https://help.sap.com/docs/transports'.
APPEND ls_training TO lt_training.

* Record 29
ls_training-id = 'dddddddd-eeee-ffff-1111-222222222222'.
ls_training-url = 'https://learning.sap.com/solution-manager'.
ls_training-role = 'Admin'.
ls_training-title = 'SAP Solution Manager'.
ls_training-module = 'BASIS'.
ls_training-description = 'IT service management and application lifecycle management'.
ls_training-last_updated = '20260205'.
ls_training-sap_help_link = 'https://help.sap.com/docs/solution-manager'.
APPEND ls_training TO lt_training.

* Record 30
ls_training-id = 'eeeeeeee-ffff-1111-2222-333333333333'.
ls_training-url = 'https://learning.sap.com/cloud-connector'.
ls_training-role = 'Admin'.
ls_training-title = 'SAP Cloud Connector'.
ls_training-module = 'BTP'.
ls_training-description = 'Connect on-premise systems to SAP BTP securely'.
ls_training-last_updated = '20260205'.
ls_training-sap_help_link = 'https://help.sap.com/docs/cloud-connector'.
APPEND ls_training TO lt_training.

* Record 31
ls_training-id = 'ffffffff-1111-2222-3333-444444444444'.
ls_training-url = 'https://learning.sap.com/idm-identity'.
ls_training-role = 'Admin'.
ls_training-title = 'SAP IDM Identity Management'.
ls_training-module = 'SECURITY'.
ls_training-description = 'Identity provisioning and access governance'.
ls_training-last_updated = '20260206'.
ls_training-sap_help_link = 'https://help.sap.com/docs/idm'.
APPEND ls_training TO lt_training.

* Record 32
ls_training-id = '12121212-1212-1212-1212-121212121212'.
ls_training-url = 'https://learning.sap.com/fiori-launchpad'.
ls_training-role = 'Developer'.
ls_training-title = 'Fiori Launchpad Configuration'.
ls_training-module = 'UI_UX'.
ls_training-description = 'Configure and customize SAP Fiori Launchpad'.
ls_training-last_updated = '20260127'.
ls_training-sap_help_link = 'https://help.sap.com/docs/flp'.
APPEND ls_training TO lt_training.

* Record 33
ls_training-id = '23232323-2323-2323-2323-232323232323'.
ls_training-url = 'https://learning.sap.com/workflow'.
ls_training-role = 'Developer'.
ls_training-title = 'SAP Workflow Development'.
ls_training-module = 'ABAP'.
ls_training-description = 'Business workflow configuration and development'.
ls_training-last_updated = '20260127'.
ls_training-sap_help_link = 'https://help.sap.com/docs/workflow'.
APPEND ls_training TO lt_training.

* Record 34
ls_training-id = '34343434-3434-3434-3434-343434343434'.
ls_training-url = 'https://learning.sap.com/forms-adobe'.
ls_training-role = 'Developer'.
ls_training-title = 'SAP Adobe Forms'.
ls_training-module = 'ABAP'.
ls_training-description = 'Design and develop interactive Adobe forms'.
ls_training-last_updated = '20260128'.
ls_training-sap_help_link = 'https://help.sap.com/docs/forms'.
APPEND ls_training TO lt_training.

* Record 35
ls_training-id = '45454545-4545-4545-4545-454545454545'.
ls_training-url = 'https://learning.sap.com/smartforms'.
ls_training-role = 'Developer'.
ls_training-title = 'SAP Smart Forms'.
ls_training-module = 'ABAP'.
ls_training-description = 'Create business documents with Smart Forms'.
ls_training-last_updated = '20260128'.
ls_training-sap_help_link = 'https://help.sap.com/docs/smartforms'.
APPEND ls_training TO lt_training.

* Record 36
ls_training-id = '56565656-5656-5656-5656-565656565656'.
ls_training-url = 'https://learning.sap.com/alv-reporting'.
ls_training-role = 'Developer'.
ls_training-title = 'ALV Reporting Techniques'.
ls_training-module = 'ABAP'.
ls_training-description = 'Advanced list viewer for interactive reports'.
ls_training-last_updated = '20260129'.
ls_training-sap_help_link = 'https://help.sap.com/docs/alv'.
APPEND ls_training TO lt_training.

* Record 37
ls_training-id = '67676767-6767-6767-6767-676767676767'.
ls_training-url = 'https://learning.sap.com/badi-enhancement'.
ls_training-role = 'Developer'.
ls_training-title = 'BAdI Enhancement Framework'.
ls_training-module = 'ABAP'.
ls_training-description = 'Business Add-Ins for clean core extensions'.
ls_training-last_updated = '20260129'.
ls_training-sap_help_link = 'https://help.sap.com/docs/badi'.
APPEND ls_training TO lt_training.

* Record 38
ls_training-id = '78787878-7878-7878-7878-787878787878'.
ls_training-url = 'https://learning.sap.com/bapi-development'.
ls_training-role = 'Developer'.
ls_training-title = 'BAPI Development'.
ls_training-module = 'ABAP'.
ls_training-description = 'Business Application Programming Interface development'.
ls_training-last_updated = '20260130'.
ls_training-sap_help_link = 'https://help.sap.com/docs/bapi'.
APPEND ls_training TO lt_training.

* Record 39
ls_training-id = '89898989-8989-8989-8989-898989898989'.
ls_training-url = 'https://learning.sap.com/rfc-integration'.
ls_training-role = 'Developer'.
ls_training-title = 'RFC & Integration'.
ls_training-module = 'ABAP'.
ls_training-description = 'Remote Function Call for system integration'.
ls_training-last_updated = '20260130'.
ls_training-sap_help_link = 'https://help.sap.com/docs/rfc'.
APPEND ls_training TO lt_training.

* Record 40
ls_training-id = '90909090-9090-9090-9090-909090909090'.
ls_training-url = 'https://learning.sap.com/idoc-edi'.
ls_training-role = 'Developer'.
ls_training-title = 'IDoc & EDI Processing'.
ls_training-module = 'ABAP'.
ls_training-description = 'Intermediate document processing for data exchange'.
ls_training-last_updated = '20260131'.
ls_training-sap_help_link = 'https://help.sap.com/docs/idoc'.
APPEND ls_training TO lt_training.

* Record 41
ls_training-id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'.
ls_training-url = 'https://learning.sap.com/webdynpro'.
ls_training-role = 'Developer'.
ls_training-title = 'Web Dynpro ABAP'.
ls_training-module = 'ABAP'.
ls_training-description = 'Web application development with Web Dynpro'.
ls_training-last_updated = '20260131'.
ls_training-sap_help_link = 'https://help.sap.com/docs/webdynpro'.
APPEND ls_training TO lt_training.

* Record 42
ls_training-id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2'.
ls_training-url = 'https://learning.sap.com/tr-treasury'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP TR Treasury'.
ls_training-module = 'FI_CO'.
ls_training-description = 'Treasury and cash management processes'.
ls_training-last_updated = '20260201'.
ls_training-sap_help_link = 'https://help.sap.com/docs/treasury'.
APPEND ls_training TO lt_training.

* Record 43
ls_training-id = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'.
ls_training-url = 'https://learning.sap.com/co-controlling'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP CO Controlling'.
ls_training-module = 'FI_CO'.
ls_training-description = 'Cost center profit center and internal orders'.
ls_training-last_updated = '20260201'.
ls_training-sap_help_link = 'https://help.sap.com/docs/controlling'.
APPEND ls_training TO lt_training.

* Record 44
ls_training-id = 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4'.
ls_training-url = 'https://learning.sap.com/asset-accounting'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP FI-AA Asset Accounting'.
ls_training-module = 'FI_CO'.
ls_training-description = 'Fixed asset management and depreciation'.
ls_training-last_updated = '20260202'.
ls_training-sap_help_link = 'https://help.sap.com/docs/asset'.
APPEND ls_training TO lt_training.

* Record 45
ls_training-id = 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5'.
ls_training-url = 'https://learning.sap.com/accounts-payable'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP FI-AP Accounts Payable'.
ls_training-module = 'FI_CO'.
ls_training-description = 'Vendor invoice processing and payment management'.
ls_training-last_updated = '20260202'.
ls_training-sap_help_link = 'https://help.sap.com/docs/ap'.
APPEND ls_training TO lt_training.

* Record 46
ls_training-id = 'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6'.
ls_training-url = 'https://learning.sap.com/accounts-receivable'.
ls_training-role = 'Consultant'.
ls_training-title = 'SAP FI-AR Accounts Receivable'.
ls_training-module = 'FI_CO'.
ls_training-description = 'Customer invoice and dunning management'.
ls_training-last_updated = '20260203'.
ls_training-sap_help_link = 'https://help.sap.com/docs/ar'.
APPEND ls_training TO lt_training.

* Record 47
ls_training-id = '12345678-1234-5678-1234-567812345678'.
ls_training-url = 'https://learning.sap.com/pricing-config'.
ls_training-role = 'Consultant'.
ls_training-title = 'SD Pricing Configuration'.
ls_training-module = 'SD'.
ls_training-description = 'Pricing procedures and condition techniques'.
ls_training-last_updated = '20260203'.
ls_training-sap_help_link = 'https://help.sap.com/docs/pricing'.
APPEND ls_training TO lt_training.

* Record 48
ls_training-id = '23456789-2345-6789-2345-678923456789'.
ls_training-url = 'https://learning.sap.com/credit-management'.
ls_training-role = 'Consultant'.
ls_training-title = 'SD Credit Management'.
ls_training-module = 'SD'.
ls_training-description = 'Customer credit limit checks and risk management'.
ls_training-last_updated = '20260204'.
ls_training-sap_help_link = 'https://help.sap.com/docs/credit'.
APPEND ls_training TO lt_training.

* Record 49
ls_training-id = '34567890-3456-7890-3456-789034567890'.
ls_training-url = 'https://learning.sap.com/inventory-management'.
ls_training-role = 'Consultant'.
ls_training-title = 'MM Inventory Management'.
ls_training-module = 'MM'.
ls_training-description = 'Stock movements and inventory valuation'.
ls_training-last_updated = '20260204'.
ls_training-sap_help_link = 'https://help.sap.com/docs/inventory'.
APPEND ls_training TO lt_training.

* Record 50
ls_training-id = '45678901-4567-8901-4567-890145678901'.
ls_training-url = 'https://learning.sap.com/mrp-planning'.
ls_training-role = 'Consultant'.
ls_training-title = 'PP MRP Planning'.
ls_training-module = 'PP'.
ls_training-description = 'Material requirements planning and procurement'.
ls_training-last_updated = '20260205'.
ls_training-sap_help_link = 'https://help.sap.com/docs/mrp'.
APPEND ls_training TO lt_training.

* Record 51
ls_training-id = '56789012-5678-9012-5678-901256789012'.
ls_training-url = 'https://learning.sap.com/shop-floor'.
ls_training-role = 'Consultant'.
ls_training-title = 'PP Shop Floor Control'.
ls_training-module = 'PP'.
ls_training-description = 'Production orders and manufacturing execution'.
ls_training-last_updated = '20260205'.
ls_training-sap_help_link = 'https://help.sap.com/docs/shopfloor'.
APPEND ls_training TO lt_training.

* Record 52
ls_training-id = '67890123-6789-0123-6789-012367890123'.
ls_training-url = 'https://learning.sap.com/performance-tuning'.
ls_training-role = 'Admin'.
ls_training-title = 'ABAP Performance Tuning'.
ls_training-module = 'ABAP'.
ls_training-description = 'Optimize ABAP code and database queries'.
ls_training-last_updated = '20260206'.
ls_training-sap_help_link = 'https://help.sap.com/docs/performance'.
APPEND ls_training TO lt_training.

* Insert all 52 records into database
INSERT zcourses FROM TABLE lt_training.

IF sy-subrc = 0.
  COMMIT WORK.
  lv_lines = lines( lt_training ).
  WRITE: / '✓ Successfully loaded', lv_lines, 'training records into ZCOURSES table.'.
  WRITE: / '✓ Data source: Learning_Data-Trainings.csv (52 SAP training courses)'.
  WRITE: / '✓ Field: ID (not COURSE_ID) - matches frontend expectations'.
  WRITE: / '✓ Verify in SE16: SELECT * FROM ZCOURSES'.
ELSE.
  ROLLBACK WORK.
  WRITE: / '✗ Error loading training data - sy-subrc:', sy-subrc.
  WRITE: / 'Check: 1) Table ZCOURSES exists (SE11)'.
  WRITE: / '       2) Table is activated (Ctrl+F3)'.
  WRITE: / '       3) Field is named ID (not COURSE_ID)'.
  WRITE: / '       4) You have INSERT authorization'.
ENDIF.

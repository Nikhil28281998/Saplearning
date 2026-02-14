*&---------------------------------------------------------------------*
*& Authorization Object: Z_COURSES_MGR
*& PURPOSE: Controls access to SAP Learning Courses CRUD operations
*&
*& STEPS TO CREATE IN SU21:
*& ================================================================
*& 1. Transaction SU21 → Create Authorization Object
*& 2. Object Name: Z_COURSES_MGR
*& 3. Object Class: Z_COURSES (create if not exists)
*& 4. Description: SAP Learning Courses Management Authorization
*& 5. Authorization Fields:
*&    - ACTVT (Activity): 01=Create, 02=Update, 03=Display, 06=Delete
*& 6. Activate
*&
*& PFCG ROLE ASSIGNMENTS (Transaction PFCG):
*& ================================================================
*&
*& Role: Z_COURSES_ADMIN
*&   Z_COURSES_MGR: ACTVT = 01, 02, 03, 06 (Full access)
*&   S_SERVICE:     SRV_NAME = ZCOURSES_SRV, SRV_TYPE = HT
*&   S_SERVICE:     SRV_NAME = Z_COURSES_USERCTX_SRV, SRV_TYPE = HT
*&
*& Role: Z_COURSES_MANAGER
*&   Z_COURSES_MGR: ACTVT = 01, 02, 03 (Create, Update, Display)
*&   S_SERVICE:     SRV_NAME = ZCOURSES_SRV, SRV_TYPE = HT
*&   S_SERVICE:     SRV_NAME = Z_COURSES_USERCTX_SRV, SRV_TYPE = HT
*&
*& Role: Z_COURSES_USER
*&   Z_COURSES_MGR: ACTVT = 03 (Display only)
*&   S_SERVICE:     SRV_NAME = ZCOURSES_SRV, SRV_TYPE = HT
*&   S_SERVICE:     SRV_NAME = Z_COURSES_USERCTX_SRV, SRV_TYPE = HT
*&
*& After creating roles:
*& 1. Generate role profiles (PFCG → Authorizations tab → Generate)
*& 2. Assign roles to users (PFCG → User tab)
*& 3. Compare user master (SU01 → Roles tab → User comparison)
*& ================================================================
*&---------------------------------------------------------------------*

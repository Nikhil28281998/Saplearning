*&---------------------------------------------------------------------*
*& ZCOURSES_MESSAGE_CLASS_GUIDE.abap
*& ABP-9: Guide for creating SE91 message class ZCOURSES
*&
*& All ABAP DPC_EXT methods should use message class constants instead of
*& inline string literals. This improves:
*&   - Translation (SE63)
*&   - Consistency across methods
*&   - Searchability (where-used list on message numbers)
*&
*& STEP 1: Create Message Class in SE91
*& =====================================
*& Transaction: SE91
*& Message Class: ZCOURSES
*& Short Text: SAP Learning Courses Application Messages
*&
*& STEP 2: Define Message Numbers
*& =====================================
*& Number | Type | Short Text
*& -------|------|------------------------------------------------------------
*& 001    | E    | No authorization to &1 &2
*& 002    | E    | &1 is required
*& 003    | E    | &1 not found
*& 004    | E    | Failed to &1 &2
*& 005    | E    | User already has an active assignment for this training
*& 006    | E    | UserId must contain only uppercase letters, digits, or underscores
*& 007    | E    | Title and URL are required
*& 008    | E    | URL must start with http:// or https://
*& 009    | E    | &1 is already completed
*& 010    | E    | You can only remove assignments you created
*& 011    | E    | Due date cannot be in the past
*& 012    | E    | Team analytics requires Manager or Admin role
*& 013    | S    | &1 completed successfully
*& 014    | I    | Cascade update: &1 assignments updated for training &2
*&
*& Variable placeholders:
*&   &1, &2 = dynamic text inserted at runtime via MESSAGE ... WITH
*&
*& STEP 3: Usage Pattern
*& =====================================
*& Replace inline string messages with:
*&
*&   " Old (inline string):
*&   message = 'No authorization to create trainings'.
*&
*&   " New (message class):
*&   MESSAGE e001(zcourses) WITH 'create' 'trainings' INTO lv_msg.
*&   RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
*&     EXPORTING
*&       textid  = /iwbep/cx_mgw_busi_exception=>business_error
*&       message = lv_msg.
*&
*& STEP 4: Maintain Translations
*& =====================================
*& Transaction: SE63 → Short Texts → ABAP Objects → Message Class → ZCOURSES
*& Translate each message number to the target language (e.g., DE, FR, JA).
*&
*& STEP 5: Message Class Quick Reference
*& =====================================
*&
*& Authorization messages (001):
*&   MESSAGE e001(zcourses) WITH 'create' 'trainings' INTO lv_msg.
*&   MESSAGE e001(zcourses) WITH 'update' 'trainings' INTO lv_msg.
*&   MESSAGE e001(zcourses) WITH 'delete' 'trainings' INTO lv_msg.
*&   MESSAGE e001(zcourses) WITH 'create' 'assignments' INTO lv_msg.
*&   MESSAGE e001(zcourses) WITH 'update' 'assignments' INTO lv_msg.
*&   MESSAGE e001(zcourses) WITH 'remove' 'assignments' INTO lv_msg.
*&   MESSAGE e001(zcourses) WITH 'mark complete' 'assignments' INTO lv_msg.
*&   MESSAGE e001(zcourses) WITH 'view' 'team analytics' INTO lv_msg.
*&
*& Required field messages (002):
*&   MESSAGE e002(zcourses) WITH 'TrainingId' INTO lv_msg.
*&   MESSAGE e002(zcourses) WITH 'UserId' INTO lv_msg.
*&   MESSAGE e002(zcourses) WITH 'Assignment ID' INTO lv_msg.
*&   MESSAGE e002(zcourses) WITH 'Training ID' INTO lv_msg.
*&
*& Not found messages (003):
*&   MESSAGE e003(zcourses) WITH 'Training' INTO lv_msg.
*&   MESSAGE e003(zcourses) WITH 'Assignment' INTO lv_msg.
*&
*& Failed operation (004):
*&   MESSAGE e004(zcourses) WITH 'create' 'training' INTO lv_msg.
*&   MESSAGE e004(zcourses) WITH 'update' 'training' INTO lv_msg.
*&   MESSAGE e004(zcourses) WITH 'delete' 'training' INTO lv_msg.
*&   MESSAGE e004(zcourses) WITH 'create' 'assignment' INTO lv_msg.
*&   MESSAGE e004(zcourses) WITH 'update' 'assignment' INTO lv_msg.
*&   MESSAGE e004(zcourses) WITH 'mark complete' '' INTO lv_msg.
*&
*&---------------------------------------------------------------------*

*&---------------------------------------------------------------------*
*& SEGW Entity Type: User
*& Purpose: Value help for user selection in Assign Training dialog
*&---------------------------------------------------------------------*
*& How to create in SEGW (Transaction SEGW):
*&
*& 1. Open project ZCOURSES_SRV
*& 2. Expand Data Model → Right-click Entity Types → Create
*& 3. Entity Type Name: User
*& 4. Check "Create Related Entity Set" → Press Enter
*&
*& 5. Expand User → Right-click Properties → Create
*& 6. Add properties using ABAP Dictionary references:
*&---------------------------------------------------------------------*

*----------------------------------------------------------------------*
* Property 1: UserId (KEY)
*----------------------------------------------------------------------*
* Name:              UserId
* ABAP Dict Element: SYUNAME
* Is Key:            YES (checked)
* Nullable:          NO (unchecked)
*
* OR if using Edm Types:
* Edm Core Type:     Edm.String
* Max Length:        12
*----------------------------------------------------------------------*

*----------------------------------------------------------------------*
* Property 2: FirstName
*----------------------------------------------------------------------*
* Name:              FirstName
* ABAP Dict Element: AD_NAMEFIR
* Is Key:            NO
* Nullable:          YES
*
* OR if using Edm Types:
* Edm Core Type:     Edm.String
* Max Length:        40
*----------------------------------------------------------------------*

*----------------------------------------------------------------------*
* Property 3: LastName
*----------------------------------------------------------------------*
* Name:              LastName
* ABAP Dict Element: AD_NAMELAS
* Is Key:            NO
* Nullable:          YES
*
* OR if using Edm Types:
* Edm Core Type:     Edm.String
* Max Length:        40
*----------------------------------------------------------------------*

*----------------------------------------------------------------------*
* Property 4: Email
*----------------------------------------------------------------------*
* Name:              Email
* ABAP Dict Element: AD_SMTPADR
* Is Key:            NO
* Nullable:          YES
*
* OR if using Edm Types:
* Edm Core Type:     Edm.String
* Max Length:        241
*----------------------------------------------------------------------*

*----------------------------------------------------------------------*
* After creating properties:
* 1. Save (Ctrl+S)
* 2. Check Consistency: Project → Check Model Consistency
* 3. Generate Runtime: Click Generate (Ctrl+G)
* 4. Activate all objects
* 5. Go to SE24 → ZCL_ZCOURSES_DPC_EXT → Redefine USERS_GET_ENTITYSET
*    (see USERS_GET_ENTITYSET.abap for code)
*----------------------------------------------------------------------*

# ABAP Error Message Class Guide — ZCOURSES (SE91)

## Purpose

Centralized SAP message class for all error, warning, and info messages
used by the **ZCOURSES_SRV** OData service and related ABAP programs.
Using a message class instead of hardcoded strings enables:

- **Translation** via SE63 (multi-language support)
- **Where-used** analysis to find all message usages
- **Consistent** error codes across all ABAP methods
- **Fiori-friendly** OData error messages via `/iwbep/cx_mgw_busi_exception`

---

## Step 1: Create Message Class in SE91

1. Open **SE91** (Message Maintenance)
2. Enter message class: `ZCOURSES`
3. Click **Create**
4. Short text: `SAP Learning Courses App Messages`
5. Package: your development package (e.g., `ZLEARNING`)
6. Save and assign to a Transport Request

---

## Step 2: Define Messages

Add the following messages in the **Messages** tab:

| Msg # | Type | Short Text | Long Text |
|-------|------|-----------|-----------|
| 001 | E | Not authorized for action &1 (Z_COURSES ACTVT &2) | User &3 does not have authorization object Z_COURSES with activity &2. Contact your system administrator to assign the appropriate PFCG role. |
| 002 | E | Training &1 not found | Training with ID &1 does not exist in table ZCOURSES. |
| 003 | E | Training title is required | The Title field is mandatory when creating or updating a training. |
| 004 | E | Training URL is required | The Url field is mandatory when creating a training. |
| 005 | E | Assignment &1 not found | Training assignment with key &1 does not exist in table ZCOURSE_ASGN. |
| 006 | E | Cannot modify assignments of other managers | Manager &1 can only modify assignments where MANAGER_SORT2 = &1. |
| 007 | E | Only the assigned user can mark their own training complete | User &1 attempted to complete assignment belonging to user &2. |
| 008 | E | Assignment already completed | This assignment was already marked as completed on &1. |
| 009 | S | Training &1 created successfully | |
| 010 | S | Training &1 updated successfully | |
| 011 | S | Training &1 deleted successfully | |
| 012 | S | Assignment created for user &1 — training &2 | |
| 013 | S | Assignment &1 marked as completed | |
| 014 | S | Assignment &1 removed | |
| 015 | W | Training &1 has no URL — users cannot access course material | |
| 016 | I | User &1 role resolved: &2 (available: &3) | |
| 017 | E | Invalid role &1 — expected Admin, Manager, or User | |
| 018 | E | Duplicate assignment — user &1 already assigned to training &2 | |
| 019 | E | Security token validation failed | CSRF token mismatch or expired. Reload the application. |
| 020 | E | OData request failed — &1 | Generic OData error wrapper with dynamic message &1. |

> **&1, &2, &3, &4** are SAP message placeholders (up to 4 per message).

---

## Step 3: Use in ABAP OData Methods

### Pattern A: Raise OData business exception with message class

```abap
* In any DPC_EXT method (e.g., TRAININGS_GET_ENTITYSET):
AUTHORITY-CHECK OBJECT 'Z_COURSES' ID 'ACTVT' FIELD '03'.
IF sy-subrc <> 0.
  " Use message class for translatable error text
  MESSAGE e001(zcourses) WITH 'Display' '03' sy-uname
    INTO DATA(lv_msg).

  RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
    EXPORTING textid  = /iwbep/cx_mgw_busi_exception=>resource_not_found
              message = lv_msg.
ENDIF.
```

### Pattern B: OData message container (multiple messages)

```abap
* For returning multiple messages in a single response:
DATA(lo_msg) = mo_context->get_message_container( ).

lo_msg->add_message(
  iv_msg_type   = /iwbep/cl_cos_logger=>error
  iv_msg_id     = 'ZCOURSES'
  iv_msg_number = '002'
  iv_msg_v1     = lv_training_id ).

RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
  EXPORTING message_container = lo_msg.
```

### Pattern C: Simple MESSAGE statement (reports/programs)

```abap
* In ZLOAD_TRAINING_DATA or other reports:
MESSAGE s009(zcourses) WITH lv_title.   " 'Training X created successfully'
MESSAGE e002(zcourses) WITH lv_id.      " 'Training X not found'
```

---

## Step 4: Map to OData Error Response

When the DPC_EXT raises `/iwbep/cx_mgw_busi_exception`, SAP Gateway
automatically wraps the message in the standard OData error JSON:

```json
{
  "error": {
    "code": "ZCOURSES/001",
    "message": {
      "lang": "en",
      "value": "Not authorized for action Display (Z_COURSES ACTVT 03)"
    }
  }
}
```

The UI5 frontend parses this in `Component.js` error handlers:
```javascript
try {
    var parsed = JSON.parse(err.responseText);
    msg = parsed.error.message.value;
} catch (e) { /* fallback */ }
```

---

## Step 5: Transport & Activate

1. In SE91, save all messages
2. Activate the message class
3. Transport to QA/PRD via your transport request
4. Update all DPC_EXT methods to use `MESSAGE ... INTO lv_msg` pattern
5. Test via `/sap/opu/odata/sap/ZCOURSES_SRV/` error scenarios

---

## Message Types Reference

| Type | Meaning | UI5 Display |
|------|---------|-------------|
| E | Error | MessageBox.error / MessageStrip type="Error" |
| W | Warning | MessageBox.warning / MessageStrip type="Warning" |
| I | Information | MessageBox.information / MessageStrip type="Information" |
| S | Success | MessageToast.show / MessageStrip type="Success" |
| A | Abort (dump) | Not used in OData — avoid |

---

## PFCG Role ↔ Message Mapping

| PFCG Role | Allowed ACTVT | Error if Missing |
|-----------|---------------|-----------------|
| Z_COURSES_ADMIN | 01, 02, 03, 06 | MSG 001 with ACTVT value |
| Z_COURSES_MANAGER | 01, 02, 03 | MSG 001 with ACTVT value |
| Z_COURSES_USER | 03 | MSG 001 with ACTVT '03' |

---

## Checklist

- [ ] Create message class ZCOURSES in SE91
- [ ] Add all 20 messages from the table above
- [ ] Translate messages in SE63 (if multi-language required)
- [ ] Update TRAININGS_GET_ENTITYSET to use MESSAGE e001
- [ ] Update TRAININGS_CREATE_ENTITY to use MESSAGE e003/e004
- [ ] Update TRAININGS_UPDATE_ENTITY to use MESSAGE e010
- [ ] Update TRAININGS_DELETE_ENTITY to use MESSAGE e011
- [ ] Update TRAININGASSIGNMENTS_CREATE_ENTITY to use MESSAGE e012/e018
- [ ] Update EXECUTE_ACTION to use MESSAGE e001/e017
- [ ] Transport to QA and test all error scenarios

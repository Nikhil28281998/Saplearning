# PFCG Role Setup & Dynamic Role Switching — Complete Guide

> **Applies to:** SAP Learning Courses App on S/4HANA 2022  
> **Auth Object:** `Z_COURSES` (created in SU21)  
> **Date:** February 2026

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  PFCG Roles in SAP                                   │
│                                                      │
│  Z_COURSES_ADMIN   → ACTVT 01,02,03,06 (Full CRUD)  │
│  Z_COURSES_MANAGER → ACTVT 01,02,03    (No Delete)  │
│  Z_COURSES_USER    → ACTVT 03          (View only)  │
│                                                      │
├──────────────────────────────────────────────────────┤
│  ABAP: getCurrentRole Function Import                │
│  Returns: Role (highest) + AvailableRoles (all)      │
│  e.g. Role="Admin", AvailableRoles="Admin,Manager,User" │
│                                                      │
├──────────────────────────────────────────────────────┤
│  UI: Dynamic Role Switcher                           │
│  • 3 roles → dropdown shows all three                │
│  • 2 roles → dropdown shows those two                │
│  • 1 role  → no dropdown, just badge                 │
└──────────────────────────────────────────────────────┘
```

### Do We Need 3 Roles or Can We Use Fewer?

**Recommended: 3 explicit PFCG roles.** Here's why:

| Approach | Pros | Cons |
|----------|------|------|
| **3 roles** (Admin/Manager/User) | Standard SAP audit practice; explicit assignment; role-based reporting in SUIM; clean SoD checks | 3 roles to maintain |
| **2 roles** (Admin + Manager only) | Fewer objects | "User" becomes implicit — anyone with S_SERVICE but no Z_COURSES role is a User. Harder to audit, no SUIM visibility |
| **1 composite role** | Single assignment | Over-engineered for this app; still needs 3 child roles |

**Verdict:** 3 explicit roles. In SAP audit/compliance, **every access level must be traceable in SUIM**. An implicit "everyone else is User" approach fails audit reviews.

---

## PREREQUISITE: Authorization Object Z_COURSES in SU21

> **Skip this if you already created it** (you likely did when creating Z_COURSES_ADMIN).

1. **SU21** → Display/Maintain Authorization Objects
2. Click **Create Object** (or find existing `Z_COURSES`)
3. Settings:
   - **Object:** `Z_COURSES`
   - **Object Class:** `ZZCOURSES` (create class if needed — just a grouping)
   - **Description:** SAP Learning Courses Authorization
   - **Authorization Fields:** `ACTVT` (Activity) — this is a standard SAP field
4. **Save** → **Activate**

The `ACTVT` field values used by our app:
| Value | Meaning | Who Gets It |
|-------|---------|-------------|
| 01 | Create | Admin, Manager |
| 02 | Change/Update | Admin, Manager |
| 03 | Display | Admin, Manager, User |
| 06 | Delete | Admin only |

---

## STEP 1: Create Z_COURSES_MANAGER Role

### 1.1 Open PFCG
```
Transaction: PFCG
```

### 1.2 Create Single Role
- **Role:** `Z_COURSES_MANAGER`
- Click **Single Role** button
- **Description:** SAP Learning Courses - Manager

### 1.3 Menu Tab (Optional)
- You can skip this tab — no menu entries needed for OData-only apps.

### 1.4 Authorizations Tab ← CRITICAL
1. Click **Change Authorization Data** (pencil icon)
2. If prompted "Do you want to use the template?" → **Do not select template**
3. Click **Manually** (expert mode) to add authorization objects

#### Add Z_COURSES Authorization:
1. Click **Manually** button (or Edit → Insert authorization → Manually)
2. Enter Object: `Z_COURSES`
3. Click the **green checkmark**
4. Expand `Z_COURSES` → click on `ACTVT` field
5. Enter individual values:
   - `01` (Create)
   - `02` (Change)
   - `03` (Display)
   
   ❌ **Do NOT add `06` (Delete)** — that's Admin only!
6. Click **Save** (💾)

#### Add S_SERVICE Authorization (OData service access):
1. Click **Manually** button again
2. Enter Object: `S_SERVICE`
3. Click the **green checkmark**
4. Expand `S_SERVICE`:
   - **SRV_NAME:** `ZCOURSES_SRV`
   - **SRV_TYPE:** `HT`
5. **Save**

#### Add ICF service access (if needed):
If your system requires explicit ICF authorization:
1. Object: `S_ICF`
2. Fields:
   - **ICF_FIELD:** `SERVICE`
   - **ICF_VALUE:** `ZCOURSES_SRV`

### 1.5 Generate Profile
1. Still on **Authorizations** tab
2. Click **Generate** button (🔴 icon at top, or Utilities → Generate)
3. Confirm the profile name (auto-generated, e.g., `Z_COURSES_000002`)
4. You should see green traffic light ✅

### 1.6 User Tab — Assign Users
1. Go to **User** tab
2. Click **User Comparison** initially to sync
3. Add manager users who should get this role:
   - Enter SAP username (e.g., `MANAGER01`)
   - Set **Valid From:** today's date
   - Set **Valid To:** `12/31/9999`
4. Click **User Comparison** button → **Full comparison**
5. **Save**

---

## STEP 2: Create Z_COURSES_USER Role

### 2.1 PFCG → Create Single Role
- **Role:** `Z_COURSES_USER`
- **Description:** SAP Learning Courses - End User

### 2.2 Authorizations Tab
1. Click **Change Authorization Data**
2. **Do not select template** → **Manually**

#### Add Z_COURSES Authorization:
1. Object: `Z_COURSES`
2. `ACTVT` field values:
   - `03` (Display) — **ONLY this one!**
   
   ❌ No 01, 02, or 06!

#### Add S_SERVICE Authorization:
1. Object: `S_SERVICE`
2. **SRV_NAME:** `ZCOURSES_SRV`
3. **SRV_TYPE:** `HT`

### 2.3 Generate Profile
- Click **Generate** → Confirm

### 2.4 User Tab — Assign Users
- Add end users
- **User Comparison** → **Full comparison** → **Save**

---

## STEP 3: Verify Z_COURSES_ADMIN (Already Created)

Confirm your existing Admin role has the correct authorizations:

1. **PFCG** → Enter `Z_COURSES_ADMIN` → **Display**
2. Go to **Authorizations** tab
3. Verify:
   - `Z_COURSES`: ACTVT = `01`, `02`, `03`, `06` (all four!)
   - `S_SERVICE`: SRV_NAME = `ZCOURSES_SRV`, SRV_TYPE = `HT`

If `06` is missing, add it now (Change mode → add value `06` to ACTVT → Generate).

---

## Summary: ACTVT Values per Role

| Role | 01 Create | 02 Change | 03 Display | 06 Delete |
|------|-----------|-----------|------------|-----------|
| **Z_COURSES_ADMIN** | ✅ | ✅ | ✅ | ✅ |
| **Z_COURSES_MANAGER** | ✅ | ✅ | ✅ | ❌ |
| **Z_COURSES_USER** | ❌ | ❌ | ✅ | ❌ |

---

## STEP 4: SEGW — Add AvailableRoles to CurrentRole Complex Type

The `getCurrentRole` function import currently returns only the **highest** role. We need it to also return **all available roles** so the UI can dynamically populate the role switcher.

### 4.1 Open SEGW
```
Transaction: SEGW → Open project ZCOURSES
```

### 4.2 Add Property to CurrentRole Complex Type
1. Expand **Data Model** → **Complex Types** → **CurrentRole**
2. Right-click **Properties** → **Create**
3. New property:
   - **Name:** `AvailableRoles`
   - **ABAP Field Name:** `AVAILABLEROLES`
   - **Edm Core Type:** `Edm.String`
   - **MaxLength:** `60`
   - **Nullable:** `true`
4. **Save**

### 4.3 Regenerate Runtime Artifacts
1. Click **Generate Runtime Objects** (Ctrl+G or ▶ button)
2. Confirm overwrite
3. **Activate** all generated objects

> After this step, `zcl_zcourses_mpc=>ts_currentrole` will have component `AVAILABLEROLES`.

---

## STEP 5: Paste Updated ABAP Code

### 5.1 EXECUTE_ACTION in SE24
1. **SE24** → Open `ZCL_ZCOURSES_DPC_EXT`
2. Find method `EXECUTE_ACTION` (or `/IWBEP/IF_MGW_APPL_SRV_RUNTIME~EXECUTE_ACTION`)
3. Replace the code with the updated version from:
   `abap/EXECUTE_ACTION.abap`
4. **Activate**

The key change: `getCurrentRole` now checks **all three** ACTVT levels independently and returns a comma-separated `AvailableRoles` string like `"Admin,Manager,User"`.

---

## STEP 6: Test Role Assignment Scenarios

### Test via SUIM (Who Has Which Role):
```
Transaction: SUIM → Roles by User Assignment
```

### Test Matrix:

| User | Roles Assigned | getCurrentRole Returns |
|------|---------------|----------------------|
| ADMIN01 | Z_COURSES_ADMIN | Role=Admin, AvailableRoles=Admin,Manager,User |
| ADMIN01 | Z_COURSES_ADMIN + Z_COURSES_MANAGER | Role=Admin, AvailableRoles=Admin,Manager,User |
| MGR01 | Z_COURSES_MANAGER | Role=Manager, AvailableRoles=Manager,User |
| MGR01 | Z_COURSES_MANAGER + Z_COURSES_USER | Role=Manager, AvailableRoles=Manager,User |
| USER01 | Z_COURSES_USER | Role=User, AvailableRoles=User |
| USER01 | (no role) | Role=User, AvailableRoles=User |

> **Key insight:** Because Z_COURSES_ADMIN has ACTVT 01,02,03,06, an Admin user automatically passes the Manager (01) and User (03) auth checks too. So an Admin always sees all 3 roles in the switcher — no need to assign all 3 roles to them.

### Quick Test via Gateway Client:
```
Transaction: /IWFND/GW_CLIENT
URI: /sap/opu/odata/sap/ZCOURSES_SRV/getCurrentRole
Method: GET
```
Check the response contains both `Role` and `AvailableRoles` fields.

---

## STEP 7: Assign Roles to Test Users

### Multi-Role User (for testing role switching):
1. **PFCG** → `Z_COURSES_ADMIN` → User tab → Add user `TESTADMIN`
2. **PFCG** → `Z_COURSES_MANAGER` → User tab → Add user `TESTADMIN`
3. Now TESTADMIN will see Admin + Manager + User in switcher

### Single-Role Users:
- MANAGER01 → only `Z_COURSES_MANAGER` → sees Manager + User
- ENDUSER01 → only `Z_COURSES_USER` → sees User only (no switcher)

---

## Role Switching Behavior in the UI

| Scenario | Switcher Visible? | Options Shown |
|----------|-------------------|---------------|
| Admin has all 3 role auth | ✅ Yes | Admin, Manager, End User |
| Manager + User | ✅ Yes | Manager, End User |
| User only | ❌ Hidden | Just role badge shows "User" |
| Admin only (no Manager/User roles but ADMIN has ACTVT 01,03) | ✅ Yes | Admin, Manager, End User |

---

## Troubleshooting

### "No authorization" errors after role creation
- Did you click **Generate** on the Authorizations tab?
- Did you run **User Comparison** on the User tab?
- Check in SU53 (last failed auth check) for which object/field failed

### User doesn't see expected roles in switcher
- Check `/IWFND/GW_CLIENT` → GET `/getCurrentRole` → verify AvailableRoles
- Check SUIM → User's role assignments → verify role is valid (date range)
- Check SU01 → user's Roles tab → role must have green icon (active profile)

### S_SERVICE authorization missing
- Symptom: HTTP 403 when accessing the OData service URL
- Fix: Ensure all 3 roles have `S_SERVICE` with SRV_NAME=`ZCOURSES_SRV`, SRV_TYPE=`HT`

---

## Quick Reference Commands
```
SU21  - Create/maintain authorization objects
PFCG  - Create/maintain roles
SU01  - User maintenance (verify roles assigned)
SUIM  - Authorization information system (reporting)
SU53  - Last failed authorization check
/IWFND/GW_CLIENT - Test OData service calls
/IWFND/MAINT_SERVICE - Maintain OData services
```

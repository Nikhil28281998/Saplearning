# SkillForge - Cloud Identity-Based Access Control Setup

## Overview
SkillForge implements **platform identity-based access control** where:
1. User's email from XSUAA JWT token (`req.user.id`) is looked up in the Users database table
2. Role (Admin/Manager/User) is determined from the database, not from XSUAA scopes
3. Manager hierarchy is validated in backend handlers for assignment creation

## Architecture

### Database-Driven Roles
- **Users table** now has a `role` column: Admin | Manager | User
- **email field** must match the user's BTP/XSUAA login email exactly
- **managerId field** defines reporting relationships for Manager access control

### Backend Security Flow
1. **Login**: User authenticates via XSUAA, receives JWT token with email
2. **Request**: Browser sends OData request with JWT token
3. **Identity Resolution**: CAP extracts `req.user.id` (email) from token
4. **Role Lookup**: `getCurrentRole` queries `Users` table by email to get role
5. **Authorization**: Custom handlers validate:
   - Managers can only assign to their direct reports (managerId check)
   - Users can only view/update their own assignments (userId check)
   - Admins have full access

## Setup Steps for Cloud Deployment

### 1. Configure Users Table
Add all application users to `db/data/Learning_Data-Users.csv` with their BTP email addresses:

```csv
ID,name,email,role,managerId
<UUID>,Admin User,admin@yourcompany.com,Admin,
<UUID>,Manager Smith,manager.smith@yourcompany.com,Manager,
<UUID>,Employee One,employee1@yourcompany.com,User,<Manager-UUID>
<UUID>,Employee Two,employee2@yourcompany.com,User,<Manager-UUID>
```

**Critical**: The `email` column must match exactly what XSUAA provides in `req.user.id` (typically the user's BTP login email).

### 2. XSUAA Configuration
The `xs-security.json` file defines authentication but **not** the business roles:
- XSUAA scopes (Admin, Manager, User) are still defined for backward compatibility
- However, actual access control is now **database-driven** via the Users table
- You can optionally simplify `xs-security.json` to a single scope if desired

### 3. Deploy to Cloud Foundry
```bash
# Build MTA or deploy directly
cf push
# or
mbt build && cf deploy mta_archives/Saplearningcenter_*.mtar
```

### 4. Assign Users in BTP Cockpit
1. Navigate to **Security → Users**
2. Add users with their email addresses (must match Users CSV)
3. Assign XSUAA roles (Admin/Manager/User) - optional since DB drives access
4. Users will be authenticated via XSUAA, then authorized via database lookup

## Local Development vs Production

### Local Development
- Mock users defined in `package.json` (alice/bob/charles)
- Optional URL override: `?saplc-role=Admin` for quick testing
- `getCurrentRole` still works, but returns mock role from package.json config

### Production (Cloud)
- URL override is **disabled** (only works on localhost)
- `getCurrentRole` queries Users table by `req.user.id` email
- Custom handlers enforce manager hierarchy and user-level access

## Key Handler Logic

### getCurrentRole (srv/SkillForgeService.js)
```javascript
const userEmail = req.user.id; // from XSUAA JWT token
const userRecord = await tx.read(Users).where({ email: userEmail });
return userRecord[0].role; // Admin, Manager, or User from database
```

### Manager Hierarchy Validation (before CREATE TrainingAssignments)
**Location**: srv/SkillForgeService.js
```javascript
if (userRole === 'Manager') {
  const assignee = await tx.read(Users).byKey(assigneeId);
  if (assignee.managerId !== userID) {
    return req.error(403, 'Managers can only assign to their direct reports');
  }
}
```

### User-Level Filtering (before READ TrainingAssignments)
**Location**: srv/SkillForgeService.js
```javascript
if (userRole === 'User') {
  req.query.where({ userId: userID });
}
```

## Testing Scenarios

### Scenario 1: Admin Full Access
- User: admin.one@example.com (role: Admin in Users CSV)
- Can: Create/Read/Update/Delete all Trainings, TrainingAssignments, Users
- Cannot: Nothing restricted

### Scenario 2: Manager Team Scoping
- User: manager.one@example.com (role: Manager)
- Can: Assign trainings only to direct reports (where managerId = manager's ID)
- Can: View Users where managerId = manager's ID
- Cannot: Assign to users not in their team, access other managers' users

### Scenario 3: Regular User Self-Access
- User: user1@example.com (role: User)
- Can: View all Trainings catalog
- Can: View/Update own TrainingAssignments (where userId = user's ID)
- Can: Mark own assignments as Completed
- Cannot: Create assignments, view other users' data, access Users entity

## Troubleshooting

### "User not found in system" Error
**Cause**: Logged-in user's email doesn't exist in Users CSV
**Fix**: Add user to `db/data/Learning_Data-Users.csv` with matching email and appropriate role

### Manager Cannot Assign Training
**Cause**: Target user's managerId doesn't match manager's ID
**Fix**: Update Users CSV to set employee's managerId to the manager's UUID

### Role Always Returns "User"
**Cause**: req.user.id doesn't match any email in Users table
**Fix**: Check XSUAA token content (log `req.user.id`) and ensure Users CSV has matching email

### Local Testing with Mock Users
For local development, ensure mock users in `package.json` use email addresses that exist in Users CSV:
```json
"auth": {
  "[development]": {
    "kind": "mocked",
    "users": {
      "admin.one@example.com": { "roles": ["Admin"] },
      "manager.one@example.com": { "roles": ["Manager"] },
      "user1@example.com": { "roles": ["User"] }
    }
  }
}
```

## Security Best Practices
1. **Never hardcode roles in handlers** - always look up from Users table
2. **Validate hierarchy** on CREATE operations, not just READ
3. **Use database roles** as single source of truth, not XSUAA scopes
4. **Log access attempts** for audit trail
5. **Keep Users table in sync** with organizational changes
6. **Use UUID for managerId** to avoid circular dependencies

## Migration from Mock Roles
If you have existing code using URL role overrides (`?sap-role=Admin`):
1. URL overrides now only work on localhost (dev safety)
2. Production deployment ignores URL params and uses database lookup
3. Remove localStorage role caching in production
4. Update mock user config in package.json to use real email addresses

## Next Steps
1. Populate Users CSV with all company users and their reporting structure
2. Deploy to Cloud Foundry and test with real XSUAA authentication
3. Monitor logs for "User not found" warnings to identify missing users
4. Add custom error page for unauthorized users directing them to IT support

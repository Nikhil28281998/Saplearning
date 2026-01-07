# SkillForge - Enterprise Training Management Platform

## 📋 Executive Summary
SkillForge is a production-ready, enterprise-grade training management platform built on SAP Cloud Application Programming Model (CAP). It provides comprehensive training lifecycle management with role-based access control, manager hierarchy enforcement, and SAP BTP cloud identity integration.

### Key Features
- **Cloud-Native Architecture**: Full SAP BTP integration with XSUAA authentication
- **Database-Driven Authorization**: Platform identity mapped to organizational roles
- **Manager Hierarchy**: Enforce reporting relationships for training assignments
- **SAP Fiori UI**: Modern, responsive Fiori Elements interface with flexible column layout
- **Multi-Tenant Ready**: Scalable architecture for enterprise deployment
- **Audit & Compliance**: Complete tracking of training assignments and completions

---

## 🏗️ Architecture Overview

### Technology Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | SAP Fiori Elements (SAPUI5) | Responsive UI with ListReport/ObjectPage patterns |
| **Backend** | SAP Cloud Application Programming Model (CAP) | OData V4 services, business logic |
| **Runtime** | Node.js 18+ | Application server |
| **Database** | SQLite (dev) / SAP HANA Cloud (prod) | Persistent data storage |
| **Authentication** | XSUAA (SAP Authorization & Trust) | Cloud identity, JWT tokens |
| **Authorization** | Database-driven RBAC + @restrict | Role-based access with hierarchy enforcement |
| **Deployment** | Cloud Foundry / Kyma | SAP BTP platform services |

### Domain Model
```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Users     │────────▶│ TrainingAssignments│────────▶│   Trainings  │
│             │         │                  │         │              │
│ - email     │         │ - status         │         │ - title      │
│ - role      │         │ - assignedDate   │         │ - description│
│ - managerId │         │ - completionDate │         │ - category   │
└─────────────┘         └──────────────────┘         └──────────────┘
      ↓ (self-reference)
 Reporting Hierarchy
```

### Service Layer (OData V4)
**Service**: `SkillForgeService` (srv/service.cds)
- **Entities**: Trainings, TrainingAssignments, Users, Modules, Resources, Playlists
- **Actions**: 
  - `markCompleted`: Sets assignment status to "Completed" with server timestamp
  - `assignTraining`: Creates new assignment (Admin/Manager only, hierarchy validated)
- **Functions**: 
  - `getCurrentRole`: Returns user's database role based on XSUAA email

---

## 🔐 Security Architecture

### Platform Identity Integration
**Flow**: XSUAA Authentication → Email Extraction → Database Role Lookup → Authorization

1. **User Login**: Authenticates via SAP Cloud Identity / XSUAA
2. **JWT Token**: Contains user's email in `req.user.id`
3. **Role Resolution**: Backend queries `Users` table: `WHERE email = req.user.id`
4. **Access Control**: Custom handlers + @restrict annotations enforce permissions

### Role-Based Access Control (RBAC)

#### Admin Role
- **Scope**: Full system access
- **Permissions**:
  - CRUD operations on all entities (Trainings, TrainingAssignments, Users)
  - Assign trainings to any user regardless of hierarchy
  - Manage organizational structure (managerId relationships)
  - View all analytics and audit logs
- **Use Cases**: IT administrators, training coordinators, system managers

#### Manager Role
- **Scope**: Team-level access with hierarchy enforcement
- **Permissions**:
  - READ all Trainings catalog
  - CREATE TrainingAssignments **only for direct reports** (managerId validation)
  - READ Users where `managerId = $user` (team view only)
  - READ/UPDATE TrainingAssignments for team members
  - Track team training progress and compliance
- **Restrictions**:
  - Cannot assign to users outside their team
  - Cannot modify other managers' teams
  - Cannot access Users entity beyond direct reports
- **Use Cases**: Department heads, team leads, supervisors

#### User Role
- **Scope**: Self-service access only
- **Permissions**:
  - READ all Trainings catalog (view available courses)
  - READ own TrainingAssignments where `userId = $user`
  - UPDATE own assignments (mark completed, add notes)
  - View own training history and progress
- **Restrictions**:
  - Cannot create TrainingAssignments
  - Cannot view other users' data
  - Cannot access Users entity
  - Cannot modify assigned trainings (only mark complete)
- **Use Cases**: Employees, trainees, end users

### Security Implementation

#### Declarative Security (@restrict annotations)
```cds
// srv/service.cds
service SkillForgeService {
  entity Trainings @(restrict: [
    { grant: '*', to: 'Admin' },
    { grant: 'READ', to: ['Manager', 'User'] }
  ]);
  
  entity TrainingAssignments @(restrict: [
    { grant: '*', to: 'Admin' },
    { grant: ['READ', 'UPDATE'], to: 'Manager', where: '$user.team' },
    { grant: ['READ', 'UPDATE'], to: 'User', where: 'userId = $user' }
  ]);
}
```

#### Programmatic Security (Custom Handlers)
**Location**: `srv/SkillForgeService.js`

**getCurrentRole Handler**:
```javascript
// Maps XSUAA email to database role
const userEmail = req.user.id; // from JWT token
const userRecord = await tx.read(Users).where({ email: userEmail });
return userRecord[0].role; // Admin | Manager | User
```

**Manager Hierarchy Validation**:
```javascript
// before CREATE TrainingAssignments
if (userRole === 'Manager') {
  const assignee = await tx.read(Users).byKey(assigneeId);
  if (assignee.managerId !== currentUser.ID) {
    return req.error(403, 'Managers can only assign trainings to their direct reports');
  }
}
```

**User-Level Filtering**:
```javascript
// before READ TrainingAssignments
if (userRole === 'User') {
  req.query.where({ userId: currentUser.ID }); // Only see own assignments
}
```

---

## 🚀 Development & Deployment

### Prerequisites
- **SAP Business Application Studio (BAS)** - Full-stack cloud IDE
- **Node.js**: v20+ (pre-installed in BAS)
- **SAP Cloud SDK**: @sap/cds-dk (pre-installed in BAS)
- **Cloud Foundry CLI**: v8+ (pre-installed in BAS)
- **MTA Build Tool**: v1.2+ (pre-installed in BAS)
- **BTP Account**: SAP BTP Cloud Foundry space with HANA entitlement

### Development Workflow

#### 1. Clone from GitHub (in SAP BAS)
```bash
cd /home/user/projects
git clone https://github.com/Nikhil28281998/Saplearning.git
cd Saplearning
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Preview in SAP BAS
```bash
# Start CAP development server
cds watch
```
Access preview: Use BAS "Open in New Tab" feature when prompted

#### 4. Make Code Changes
- Edit files in SAP BAS
- Test locally with `cds watch`
- Commit to GitHub when ready

### Deployment to BTP (from SAP BAS)

#### Step 1: Pull Latest from GitHub
```bash
git pull origin main
```

#### Step 2: Build MTA Archive
```bash
# Clean previous builds
rm -rf mta_archives gen

# Build
mbt build
```

#### Step 3: Deploy to Cloud Foundry
```bash
cf deploy mta_archives/*.mtar -f
```

#### Step 4: Verify Deployment
```bash
# Check application status
cf apps

# View logs
cf logs skillforge-approuter --recent
```

### Application URLs (Production)
- **Approuter**: https://bridgebio-pharma-inc--sap-build-work-zone-zsdt2mzd-buil5883134b.cfapps.us10.hana.ondemand.com
- **Backend**: https://bridgebio-pharma-inc--sap-build-work-zone-zsdt2mzd-buil51ed6958.cfapps.us10.hana.ondemand.com
        "user1@example.com": { "roles": ["User"] }
      }
    }
  }
}
```

**Login**: Use any of the configured emails (no password required in dev mode)

### Dev-Time Role Override
For UI testing convenience (localhost only):
- **URL Parameter**: `?saplc-role=Admin|Manager|User`
- **Behavior**: Frontend displays UI elements for specified role
- **Note**: Backend still enforces actual role from database
- **Production**: This override is automatically disabled (hostname check)

---

## 📊 Data Model & Seeding

### Entity Definitions
**Location**: `db/schema.cds`

#### Users Entity
```cds
entity Users : cuid, managed {
  name       : String(100);
  email      : String(255); // Maps to XSUAA req.user.id
  role       : String(20);  // Admin | Manager | User
  managerId  : UUID;        // Self-reference for hierarchy
  assignments: Association to many TrainingAssignments on assignments.user = $self;
}
```

#### Trainings Entity
```cds
entity Trainings : cuid, managed {
  title         : String(255);
  description   : String(5000);
  category      : String(100);
  duration      : Integer;      // minutes
  difficultyLevel: String(20);  // Beginner | Intermediate | Advanced
  assignments   : Association to many TrainingAssignments on assignments.training = $self;
}
```

#### TrainingAssignments Entity
```cds
entity TrainingAssignments : cuid, managed {
  user          : Association to Users;
  training      : Association to Trainings;
  status        : String(20);  // Assigned | In Progress | Completed
  assignedDate  : DateTime;
  completionDate: DateTime;
  notes         : String(1000);
}
```

### Seed Data (CSV Files)
**Location**: `db/data/Learning_Data-*.csv`

#### Users CSV Structure
```csv
ID,name,email,role,managerId
00000000-0000-0000-0000-00000000ADM1,Admin One,admin.one@example.com,Admin,
00000000-0000-0000-0000-00000000MGR1,Manager One,manager.one@example.com,Manager,
00000000-0000-0000-0000-00000000USR1,User One,user1@example.com,User,00000000-0000-0000-0000-00000000MGR1
```

**Critical**: `email` column must match users' actual BTP login emails for production deployment.

#### Trainings CSV
- **File**: `db/data/Learning_Data-Trainings.csv`
- **Sample**: SAP S/4HANA basics, ABAP programming, Fiori development courses
- **Columns**: ID, title, description, category, duration, difficultyLevel

#### TrainingAssignments CSV
- **File**: `db/data/Learning_Data-TrainingAssignments.csv`
- **Links**: trainingId → Trainings.ID, userId → Users.ID
- **Columns**: ID, userId, trainingId, status, assignedDate, completionDate

---

## 🎨 User Interface

### SAP Fiori Elements Design
- **Pattern**: ListReport + ObjectPage with Flexible Column Layout
- **Framework**: SAPUI5 / Fiori Elements (annotation-driven)
- **Responsive**: Mobile, tablet, desktop adaptive layout
- **Accessibility**: WCAG 2.1 AA compliant

### Navigation Flow
```
[Trainings ListReport] 
    ↓ (select row)
[Training ObjectPage]
    ↓ (click "My Trainings" button)
[TrainingAssignments ListReport]
    ↓ (select assignment)
[Assignment ObjectPage] → "Mark Completed" action
```

### Key UI Components

#### Trainings ListReport
- **Features**: Search, filter, sort, multi-column layout
- **Actions**: 
  - Header: "Assign Training" (Admin/Manager only)
  - Line Item: View details, navigate to ObjectPage
- **Smart Controls**: Smart FilterBar, Smart Table

#### TrainingAssignments ListReport ("My Trainings")
- **Features**: Status badges (Assigned/In Progress/Completed)
- **Actions**:
  - "Mark Completed" line-item action (User role)
  - Immediate UI refresh via SideEffects
- **Filtering**: Auto-filtered by user role (Users see only their assignments)

#### Flexible Column Layout
- **Columns**: Master (list) + Detail (ObjectPage) + Detail-Detail (related entities)
- **Behavior**: Responsive collapse on mobile, 3-column on desktop

### UI Annotations
**Location**: `app/saplearningcenter.saplearningcenter/annotations.cds`

```cds
// Example: TrainingAssignments ListReport
annotate SaplearningcenterService.TrainingAssignments with @(
  UI.LineItem: [
    { Value: training.title, Label: 'Training' },
    { Value: status, Label: 'Status' },
    { Value: assignedDate, Label: 'Assigned Date' },
    { Value: completionDate, Label: 'Completed Date' }
  ],
  UI.HeaderInfo: {
    TypeName: 'Training Assignment',
    TypeNamePlural: 'My Trainings'
  }
);
```

---

## ☁️ Cloud Deployment (SAP BTP)

### Deployment Options
1. **Cloud Foundry** (Recommended): Standard CF push or MBT build
2. **Kyma**: Kubernetes-native deployment with Helm charts
3. **Hybrid**: On-premise connectivity via Cloud Connector

### Step-by-Step Deployment Guide

#### 1. Prerequisites
- SAP BTP subaccount with Cloud Foundry space enabled
- Entitlements: HANA Cloud, XSUAA, Destination service
- CF CLI installed and logged in

#### 2. Build Application
```bash
# Install MBT build tool
npm install -g mbt

# Build MTA archive
mbt build

# Output: mta_archives/skillforge-training-platform_1.0.0.mtar
```

#### 3. Deploy to BTP
```bash
# Login to CF
cf login -a <API_ENDPOINT> -o <ORG> -s <SPACE>

# Deploy MTA
cf deploy mta_archives/skillforge-training-platform*.mtar

# Or direct push (simpler, no MTA)
cf push
```

#### 4. Configure XSUAA Service
**File**: `xs-security.json`

```json
{
  "xsappname": "skillforge-app",
  "tenant-mode": "dedicated",
  "scopes": [
    { "name": "$XSAPPNAME.Admin", "description": "Administrator" },
    { "name": "$XSAPPNAME.Manager", "description": "Manager" },
    { "name": "$XSAPPNAME.User", "description": "User" }
  ],
  "role-templates": [
    {
      "name": "Admin",
      "description": "Full access",
      "scope-references": ["$XSAPPNAME.Admin"]
    },
    {
      "name": "Manager",
      "description": "Team management",
      "scope-references": ["$XSAPPNAME.Manager"]
    },
    {
      "name": "User",
      "description": "Self-service",
      "scope-references": ["$XSAPPNAME.User"]
    }
  ]
}
```

**Note**: While XSUAA scopes are defined, actual authorization is database-driven via Users table.

#### 5. Bind Services
```bash
# HANA Cloud
cf bind-service skillforge-training-platform skillforge-hana

# XSUAA
cf bind-service skillforge-training-platform skillforge-xsuaa

# Restage to apply bindings
cf restage skillforge-training-platform
```

#### 6. Assign Users in BTP Cockpit
1. Navigate to **Security → Users**
2. Add users with their corporate email addresses
3. Assign role collections (Admin/Manager/User)
4. Update `db/data/Learning_Data-Users.csv` with same emails
5. Redeploy or manually insert into HANA Users table

### Platform Identity Mapping
**Critical Configuration**:
- Users must exist in `Users` table with `email` column matching their BTP login email
- XSUAA JWT token provides `req.user.id` containing user's email
- Backend `getCurrentRole` queries: `SELECT role FROM Users WHERE email = req.user.id`
- Missing users default to 'User' role with restricted access

**Example**:
- BTP User: john.doe@company.com
- Users Table: Must have record with `email = 'john.doe@company.com'`
- Result: User's role (Admin/Manager/User) retrieved from database

### Production Checklist
- [ ] Users CSV populated with actual company emails
- [ ] Manager hierarchy (managerId) configured correctly
- [ ] XSUAA service bound and role-templates created
- [ ] HANA Cloud instance provisioned and bound
- [ ] Application security descriptor (xs-app.json) configured
- [ ] Route configured with authentication
- [ ] FLP site created with app tile
- [ ] Test with real user accounts (not mock)
- [ ] Monitoring and logging enabled

---

## 🧪 Testing

### Unit Testing
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for TDD
npm run test:watch
```

**Framework**: Jest or Mocha with Chai  
**Location**: `tests/unit/`

### Integration Testing
```bash
# Start test server
npm run test:integration

# Run e2e tests
npm run test:e2e
```

**Framework**: Supertest for API testing, UI5 Test Automation  
**Location**: `tests/integration/`

### Test Scenarios by Role

#### Admin Test Cases
1. ✅ Create new training course
2. ✅ Assign training to any user (no hierarchy restriction)
3. ✅ View all users regardless of managerId
4. ✅ Modify TrainingAssignments for any user
5. ✅ Delete trainings and assignments

#### Manager Test Cases
1. ✅ View all trainings catalog
2. ✅ Assign training to direct report (success)
3. ❌ Assign training to user from another team (403 error)
4. ✅ View only team members where managerId = manager's ID
5. ✅ Update team member's assignment status
6. ❌ View users outside team (filtered out)

#### User Test Cases
1. ✅ View all trainings catalog
2. ✅ View own TrainingAssignments
3. ✅ Mark own assignment as completed
4. ❌ Create new TrainingAssignment (403 error)
5. ❌ View other users' assignments (filtered out)
6. ❌ Access Users entity (403 error)

### Manual Testing: Role Simulation
**Local Development**: Use URL parameter
```
http://localhost:4004/.../index.html?saplc-role=Manager
```

**Production**: Must use real database roles (URL override disabled)

---

## 📦 Project Structure

```
skillforge-training-platform/
├── app/                              # Fiori UI applications
│   └── saplearningcenter.saplearningcenter/
│       ├── webapp/
│       │   ├── index.html           # Entry point
│       │   ├── manifest.json        # App descriptor (FLP config)
│       │   ├── Component.js         # UI5 component (role fetch)
│       │   ├── i18n/                # Internationalization
│       │   └── annotations.cds      # UI annotations
├── db/
│   ├── schema.cds                   # Data model definitions
│   └── data/                        # Seed data (CSV files)
│       ├── Learning_Data-Users.csv
│       ├── Learning_Data-Trainings.csv
│       └── Learning_Data-TrainingAssignments.csv
├── srv/
│   ├── service.cds                  # OData service definitions + @restrict
│   └── SkillForgeService.js         # Business logic handlers
├── tests/                           # Test suites
│   ├── unit/
│   └── integration/
├── mta.yaml                         # Multi-target application descriptor
├── xs-security.json                 # XSUAA security configuration
├── package.json                     # Dependencies + scripts
├── README.md                        # This file
├── CLOUD_IDENTITY_SETUP.md         # Detailed cloud deployment guide
└── docs/                            # Additional documentation
    ├── API.md                       # OData API reference
    ├── DATABASE.md                  # Schema documentation
    └── DEVELOPMENT.md               # Developer guide
```

---

## 🛠️ Development Workflow

### Common Tasks (SOP)

#### Add New Training Course
```bash
# 1. Edit CSV file
# db/data/Learning_Data-Trainings.csv
# Add row: <UUID>,<title>,<description>,<category>,<duration>,<level>

# 2. Restart CDS watch
# Data automatically reloaded
```

#### Assign Training (Manager/Admin)
1. Navigate to Trainings ListReport
2. Select training row
3. Click "Assign Training" header action
4. Select user from dropdown (filtered by hierarchy)
5. Submit

**Backend**: Creates TrainingAssignments record with status="Assigned"

#### Mark Training Complete (User)
1. Navigate to "My Trainings" (TrainingAssignments)
2. Select assignment row
3. Click "Mark Completed" line-item action
4. Confirmation dialog → Submit

**Backend**: Updates status="Completed", sets completionDate=now()

#### Add New User
```csv
# db/data/Learning_Data-Users.csv
<UUID>,<Name>,<email@company.com>,<Admin|Manager|User>,<managerID_UUID>

# CRITICAL: email must match BTP login email for production
```

#### Change User's Manager
```sql
-- In production HANA, run SQL:
UPDATE Learning_Data_Users 
SET managerId = '<new_manager_UUID>' 
WHERE ID = '<user_UUID>';

-- Or update CSV for dev environment
```

### Code Conventions
- **CDS Naming**: PascalCase for entities, camelCase for fields
- **JavaScript**: ESLint with SAP rules
- **Annotations**: Prefix with UI, Common, or Core
- **Handlers**: Prefix with before/after/on
- **Error Messages**: User-friendly, actionable
- **Comments**: JSDoc for public APIs

### Debugging
```bash
# Backend debugging
npm run debug

# Frontend debugging
# Use browser DevTools + SAPUI5 Support Assistant
```

**Breakpoints**: Set in `srv/SaplearningcenterService.js` handlers

---

## 📖 Additional Resources

### SAP Documentation
- [CAP Documentation](https://cap.cloud.sap/docs/)
- [Fiori Elements](https://ui5.sap.com/test-resources/sap/fe/demokit/index.html)
- [XSUAA Security](https://help.sap.com/docs/CP_AUTHORIZ_TRUST_MNG)
- [SAP BTP](https://help.sap.com/docs/BTP)

### Related Project Files
- **[CLOUD_IDENTITY_SETUP.md](./CLOUD_IDENTITY_SETUP.md)**: Detailed cloud identity integration guide
- **[docs/API.md](./docs/API.md)**: OData API reference
- **[docs/DATABASE.md](./docs/DATABASE.md)**: Schema and relationships
- **[docs/FRD.md](./docs/FRD.md)**: Functional requirements document
- **[docs/BRD.md](./docs/BRD.md)**: Business requirements document

### Support & Contribution
- **Issues**: Report bugs via GitHub Issues
- **Pull Requests**: Follow Git Flow branching strategy
- **Code Review**: Mandatory for all changes
- **Versioning**: Semantic versioning (MAJOR.MINOR.PATCH)

---

## 📄 License & Copyright
Copyright © 2026 SkillForge Training Platform  
Licensed under SAP Developer License Agreement

---

## 🎯 Roadmap
- [ ] Multi-language support (i18n for 10+ languages)
- [ ] Integration with SAP SuccessFactors Learning
- [ ] AI-powered training recommendations
- [ ] Mobile native app (iOS/Android)
- [ ] Gamification: badges, leaderboards
- [ ] Advanced analytics dashboard
- [ ] Video streaming integration
- [ ] Certification workflow
- [ ] External training provider API integration

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Project**: SkillForge Training Platform  
**Built with**: SAP Cloud Application Programming Model (CAP)  
**Maintained By**: SAP Expert Development Team

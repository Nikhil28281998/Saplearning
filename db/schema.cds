using { managed } from '@sap/cds/common';

namespace Learning_Data;

// ============================================================================
// TYPES
// ============================================================================
type Status : String(20) enum {
    Assigned   = 'Assigned';
    InProgress = 'In Progress';
    Completed  = 'Completed';
};

type Priority : String(10) enum {
    High   = 'High';
    Medium = 'Medium';
    Low    = 'Low';
};

// ============================================================================
// USERS - SAP user master data (mirrors USR21/ADRP in production)
// In production S/4HANA: replaced by direct ABAP reads from USR21/ADRP/ADR6
// In CAP dev: populated via CSV for testing
// ============================================================================
entity Users {
    key userId    : String(12);       // SAP user ID (SY-UNAME)
        firstName : String(40);       // First name (ADRP.NAME_FIRST)
        lastName  : String(40);       // Last name (ADRP.NAME_LAST)
        email     : String(241);      // Email (ADR6.SMTP_ADDR)
        sort2     : String(20);       // Search term 2 (ADRP.SORT2) = Manager's user ID
        role      : String(20);       // PFCG role: Admin, Manager, User
}

// ============================================================================
// TRAINING CATALOG - External training course data
// ============================================================================
entity Trainings : managed {
    key ID          : UUID;
        @mandatory url         : String(2048);
        @mandatory role        : String(255);       // Learner role(s) — may contain multiple comma-separated roles
        @mandatory topic       : String(150);       // Course subject / topic (Accelerated Customer Returns, etc.)
        @mandatory title       : String(255);
        sap_module  : String(100);      // SAP module with description (e.g. "Finance - General Ledger (FI-GL)")
        description : String(2000);
        lastUpdated : DateTime;
        sapHelpLink : String(2048);
}

// ============================================================================
// TRAINING ASSIGNMENTS - Who is assigned what, with tracking
// ============================================================================
entity TrainingAssignments : managed {
    key ID              : UUID;

        // Foreign key to Trainings
        @mandatory trainingId  : UUID;
        training    : Association to Trainings on training.ID = trainingId;

        // SAP user ID (from USR21 - standard SAP user table)
        @mandatory @assert.format: '^[A-Z0-9_]{1,12}$'
        userId      : String(12);
        userName    : String(80);
        userEmail   : String(241);

        // Denormalized fields from training — set by server, not client
        @readonly title      : String(255);
        @readonly role       : String(255);
        @readonly topic      : String(150);
        @readonly sap_module : String(100);
        @readonly url        : String(2048);

        // Assignment tracking
        @mandatory dueDate : DateTime;
        @mandatory status : Status default 'Assigned';
        completionDate : DateTime;
        priority       : Priority default 'Medium';   // C3: Assignment priority
        sequence       : Integer default 0;            // C4: Learning path order
        notes          : String(500);                  // Manager notes / instructions

        // Assignment creator (manager who assigned this training)
        assignedBy     : String(12);
        assignedByName : String(80);

        // Manager identifier from ADRP.SORT2 (User Maintenance search term 2)
        managerSort2   : String(20);

        // C2: Reassignment tracking
        reassignedFrom : String(12);                   // Previous assignee userId
        reassignedDate : DateTime;

        // C5: Recurring assignment scheduling
        recurring        : Boolean default false;       // Is this a recurring assignment?
        recurringInterval: String(20);                  // daily, weekly, monthly, quarterly, yearly
        maxRecurrences   : Integer default 0;           // 4-5 FIX: Max recurrences (0 = unlimited)
        recurrenceCount  : Integer default 0;           // Current recurrence count
}



// ============================================================================
// DATABASE INDEXES - Performance Optimization
// ============================================================================
annotate TrainingAssignments with @(
    cds.persistence.skip : false
) {
    userId     @cds.persistence.index;
    trainingId @cds.persistence.index;
    status     @cds.persistence.index;
};

annotate Trainings with @(
    cds.persistence.skip : false
) {
    role       @cds.persistence.index;
    topic      @cds.persistence.index;
    sap_module @cds.persistence.index;
};

// ============================================================================
// VALUE HELP VIEWS - For UI dropdowns (filter NULLs)
// ============================================================================
view Roles as select from Trainings { key role }
    where role is not null group by role;

view Topics as select from Trainings { key topic }
    where topic is not null group by topic;

view Modules as select from Trainings { key sap_module }
    where sap_module is not null group by sap_module;

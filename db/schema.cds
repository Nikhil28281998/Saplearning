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

// ============================================================================
// TRAINING CATALOG - External training course data
// ============================================================================
entity Trainings : managed {
    key ID          : UUID;
        @mandatory url         : String(2048);
        @mandatory topic       : String(100);      // SAP product line / topic (Finance, BTP, SCM, etc.)
        @mandatory title       : String(255);
        sap_module  : String(20);       // SAP module (MM, SD, FICO, etc.)
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
        @readonly topic      : String(100);
        @readonly sap_module : String(20);
        @readonly url        : String(2048);

        // Assignment tracking
        dueDate        : DateTime;
        @mandatory status : Status default 'Assigned';
        completionDate : DateTime;

        // Assignment creator (manager who assigned this training)
        assignedBy     : String(12);
        assignedByName : String(80);

        // Manager identifier from ADRP.SORT2 (User Maintenance search term 2)
        managerSort2   : String(20);
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
    topic      @cds.persistence.index;
    sap_module @cds.persistence.index;
};

// ============================================================================
// VALUE HELP VIEWS - For UI dropdowns (filter NULLs)
// ============================================================================
view Topics as select from Trainings { key topic }
    where topic is not null group by topic;

view Modules as select from Trainings { key sap_module, topic }
    where sap_module is not null group by sap_module, topic;

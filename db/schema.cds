using { managed } from '@sap/cds/common';

namespace Learning_Data;

// ============================================================================
// TRAINING CATALOG - External training course data
// ============================================================================
// Stores SAP Learning Hub course URLs and metadata
// This data is external to SAP and must be maintained in custom table
// ============================================================================
entity Trainings : managed {
    key ID         : UUID;
        url        : String;
        role       : String;      // Target role: Admin, Manager, User
        title      : String;
        module     : String;      // SAP module (MM, SD, FICO, etc.)
        description: String;
        lastUpdated: DateTime;
        sapHelpLink: String;      // Link to SAP Help documentation
}

// ============================================================================
// TRAINING ASSIGNMENTS - Who is assigned what, with tracking
// ============================================================================
// Links SAP users (from USR21) to training courses with completion tracking
// Authorization handled by PFCG roles - no manager hierarchy needed!
// ============================================================================
entity TrainingAssignments : managed {
    key ID         : UUID;
        // Foreign key to Trainings
        trainingId  : UUID;
        training    : Association to Trainings on training.ID = trainingId;

        // SAP user ID (from USR21 - standard SAP user table)
        userId      : String(12);  // SYUNAME format (12 char max)
        userName    : String(80);  // Cached from ADRP for display/search
        userEmail   : String(241); // Cached from ADR6 for display/search

        // Denormalized fields from training for search/filter performance
        title       : String;
        role        : String;
        module      : String;
        url         : String;

        // Assignment tracking
        dueDate     : DateTime;
        status      : String;       // Assigned, In Progress, Completed
        completionDate : DateTime;
        
        // Assignment creator (manager who assigned this training)
        assignedBy  : String(12);   // SYUNAME of the assigner
        assignedByName : String(80); // Name for display
}

// ============================================================================
// VALUE HELP VIEWS - For UI dropdowns
// ============================================================================
view Roles as select from Trainings { key role } group by role;
view Modules as select from Trainings { key module, role } group by module, role;

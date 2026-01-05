using { managed } from '@sap/cds/common';

namespace Learning_Data;

// Trainings catalogue (formerly Entity1)
entity Trainings : managed {
    key ID         : UUID;
        url        : String;
        role       : String;
        title      : String;
        module     : String;      // normalized from Module
        description: String;
        lastUpdated: DateTime;    // proper DateTime
        sapHelpLink: String;
}

// Assignments linking Users to Trainings
entity TrainingAssignments : managed {
    key ID         : UUID;
        // association to the training record
        trainingId  : UUID;
        training    : Association to Trainings on training.ID = trainingId;

        // association to the user
        userId      : UUID;

        // denormalized fields kept for convenience/search
        title       : String;
        role        : String;
        module      : String;
        url         : String;

        dueDate     : DateTime;
        status      : String;
        completionDate : DateTime;   // renamed from completedAt
}

// Distinct value help sources via views using GROUP BY
view Roles as select from Trainings { key role } group by role;
view Modules as select from Trainings { key module, role } group by module, role;

// Users managed by Admin; Users are tied to a Manager
// email maps to req.user.id from XSUAA token for cloud identity
// role: Admin | Manager | User (stored in DB, not in XSUAA scopes)
entity Users {
    key ID       : UUID;
        name     : String;
        email    : String;    // must match platform user email/ID from XSUAA token
        role     : String;    // Admin, Manager, or User
        managerId: UUID;      // for Manager hierarchy validation
}

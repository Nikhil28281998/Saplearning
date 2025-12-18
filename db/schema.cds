namespace Learning_Data;

entity Entity1 {
    key ID         : UUID;
            url        : String;
            role       : String;
            title      : String;
            module     : String;      // renamed from Module for consistency
            description: String;
            lastUpdated: DateTime;    // was String, now proper DateTime
            sapHelpLink: String;
}

entity TrainingAssignments {
    key ID         : UUID;
            title      : String;
            role       : String;
            module     : String;
            url        : String;
            dueDate    : DateTime;
            status     : String;
            completedAt: DateTime;
}

// Distinct value help sources via views using GROUP BY
view Roles as select from Entity1 { key role } group by role;
view Modules as select from Entity1 { key module, role } group by module, role;

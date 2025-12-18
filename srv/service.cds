using { Learning_Data as my } from '../db/schema.cds';

@path : '/service/SaplearningcenterService'
service SaplearningcenterService {
    @cds.redirection.target
    entity Entity1 as projection on my.Entity1;

    // Optional: expose training for future use
    @cds.redirection.target
    entity TrainingAssignments as projection on my.TrainingAssignments actions {
        action markCompleted();
    };

    // Value help projections (read-only)
    entity RolesVH   as projection on my.Roles;
    entity ModulesVH as projection on my.Modules;

    // Role helper for UI logic
    function getCurrentRole() returns String;
}

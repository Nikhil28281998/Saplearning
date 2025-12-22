using { Learning_Data as my } from '../db/schema.cds';

@path : '/service/SaplearningcenterService'
@impl: 'srv/SaplearningcenterService.js'
service SaplearningcenterService {
    @cds.redirection.target
    entity Trainings as projection on my.Trainings;

    // Optional: expose training for future use
    @cds.redirection.target
    entity TrainingAssignments as projection on my.TrainingAssignments actions {
        action markCompleted();
    };

    // Value help projections (read-only)
    entity RolesVH   as projection on my.Roles;
    entity ModulesVH as projection on my.Modules;

    // Admin-managed Users
    @cds.redirection.target
    entity Users as projection on my.Users;

    // Role helper for UI logic
    function getCurrentRole() returns String;
}

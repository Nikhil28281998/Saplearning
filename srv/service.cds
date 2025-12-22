using { Learning_Data as my } from '../db/schema.cds';

@path : '/service/SaplearningcenterService'
@impl: 'srv/SaplearningcenterService.js'
@requires: ['Admin','Manager','User']
service SaplearningcenterService {
        @cds.redirection.target
        @restrict: [
            { grant: '*', to: 'Admin' },
            { grant: 'READ', to: ['Manager','Lead','User'] }
        ]
        entity Trainings as projection on my.Trainings;

    // Optional: expose training for future use
        @cds.redirection.target
        @restrict: [
            { grant: '*', to: 'Admin' },
            { grant: '*', to: ['Manager','Lead'] },
            { grant: 'READ', to: 'User', where: 'userId = $user' },
            { grant: 'UPDATE', to: 'User', where: 'userId = $user', columns: ['status','completionDate'] }
        ]
        entity TrainingAssignments as projection on my.TrainingAssignments actions {
        action markCompleted();
    };

        // Ensure FE refreshes status/completionDate after actions
        annotate TrainingAssignments with @(com.sap.vocabularies.Common.v1.SideEffects: [{ TargetProperties: ['status','completionDate'] }]);

    // Value help projections (read-only)
    entity RolesVH   as projection on my.Roles;
    entity ModulesVH as projection on my.Modules;

    // Users directory
    @cds.redirection.target
    @restrict: [
        { grant: '*', to: 'Admin' },
        { grant: 'READ', to: ['Manager','Lead'], where: 'managerId = $user' },
        { grant: 'READ', to: 'User', where: 'ID = $user' }
    ]
    entity Users as projection on my.Users;

    // Role helper for UI logic
    function getCurrentRole() returns String;
}

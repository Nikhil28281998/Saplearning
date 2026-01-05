using { Learning_Data as my } from '../db/schema.cds';

@path : '/service/SkillForgeService'
@impl: 'srv/SkillForgeService.js'
@requires: ['Admin','Manager','User']
service SkillForgeService {
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
            { grant: ['READ', 'CREATE', 'UPDATE'], to: ['Manager','Lead'] },
            { grant: ['READ', 'UPDATE'], to: 'User' }
            // FIXED: Removed broken where clauses - filtering done in custom handlers
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
        { grant: 'READ', to: ['Manager','Lead'] },
        { grant: 'READ', to: 'User' }
        // FIXED: Removed broken where clauses - filtering done in custom handlers
    ]
    entity Users as projection on my.Users;

    // Role helper for UI logic
    function getCurrentRole() returns String;
}

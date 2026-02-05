using { Learning_Data as my } from '../db/schema.cds';

@path : '/service/SAPLearningService'
@impl: 'srv/SAPLearningService.js'
@requires: ['Admin','Manager','User']
service SAPLearningService {
    // ========================================================================
    // TRAININGS - Course catalog
    // ========================================================================
    @cds.redirection.target
    @restrict: [
        { grant: '*', to: 'Admin' },
        { grant: 'READ', to: ['Manager','Lead','User'] }
    ]
    entity Trainings as projection on my.Trainings;

    // ========================================================================
    // TRAINING ASSIGNMENTS - Assignment tracking
    // ========================================================================
    @cds.redirection.target
    @restrict: [
        { grant: '*', to: 'Admin' },
        { grant: ['READ', 'CREATE', 'UPDATE'], to: ['Manager','Lead'] },
        { grant: ['READ', 'UPDATE'], to: 'User' }
    ]
    entity TrainingAssignments as projection on my.TrainingAssignments actions {
        action markCompleted();
    };

    // Side effects for UI refresh after actions
    annotate TrainingAssignments with @(com.sap.vocabularies.Common.v1.SideEffects: [{ 
        TargetProperties: ['status','completionDate'] 
    }]);

    // ========================================================================
    // VALUE HELP - For UI dropdowns
    // ========================================================================
    entity RolesVH   as projection on my.Roles;
    entity ModulesVH as projection on my.Modules;

    // ========================================================================
    // USER MANAGEMENT - Uses standard SAP tables (USR21, ADRP, AGR_USERS)
    // ========================================================================
    // No custom Users entity!
    // Use function to get user list from standard tables
    
    function getCurrentRole() returns String;
    function getUserList() returns array of {
        userId: String;
        name: String;
        email: String;
        role: String;
        managerId: String;
        managerName: String;
    };
    function getMyTeam() returns array of {
        userId: String;
        name: String;
        email: String;
        role: String;
    };
}

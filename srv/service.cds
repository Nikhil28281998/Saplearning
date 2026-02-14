using { Learning_Data as my } from '../db/schema.cds';

@path : '/service/SAPLearningService'
@impl: 'srv/SAPLearningService.js'
@requires: ['Admin','Manager','User']
@protocol: 'odata-v4'
@Capabilities.BatchSupported: true
@Capabilities.KeyAsSegmentSupported: true
service SAPLearningService {
    // ========================================================================
    // TRAININGS - Course catalog
    // ========================================================================
    @cds.redirection.target
    @restrict: [
        { grant: '*', to: 'Admin' },
        { grant: 'READ', to: ['Manager','User'] }
    ]
    entity Trainings as projection on my.Trainings;

    // ========================================================================
    // TRAINING ASSIGNMENTS - Assignment tracking
    // ========================================================================
    @cds.redirection.target
    @restrict: [
        { grant: '*', to: 'Admin' },
        { grant: ['READ', 'CREATE', 'UPDATE'], to: 'Manager' },
        { grant: ['READ', 'UPDATE'], to: 'User' }
    ]
    entity TrainingAssignments as projection on my.TrainingAssignments actions {
        @restrict: [{ grant: 'WRITE', to: ['Admin','Manager','User'] }]
        action markCompleted();
    };

    // Side effects for UI refresh after actions
    annotate TrainingAssignments with @(com.sap.vocabularies.Common.v1.SideEffects: [{ 
        TargetProperties: ['status','completionDate'] 
    }]);

    // ========================================================================
    // VALUE HELP - For UI dropdowns
    // ========================================================================
    @readonly entity RolesVH   as projection on my.Roles;
    @readonly entity ModulesVH as projection on my.Modules;

    // ========================================================================
    // USER AUTHORIZATION - PFCG Role-Based (Clean Core Compliant)
    // ========================================================================
    // NO custom Users entity - uses standard SAP tables:
    //   - USR21/USR02: User master data
    //   - ADRP: Name data
    //   - ADR6: Email addresses
    //   - AGR_USERS: Role assignments
    // 
    // Authorization enforced via:
    //   - PFCG roles: Z_COURSES_ADMIN, Z_COURSES_MANAGER, Z_COURSES_USER
    //   - @restrict annotations above
    //   - ABAP AUTHORITY-CHECK in DPC_EXT methods
    // 
    // Team: Dr. Hans Mueller (SAP Principal Architect)
    //       Priya Sharma (Senior ABAP Developer)
    //       Thomas Weber (SAP Security Consultant)
    // ========================================================================
    
    function getCurrentRole() returns String;
}

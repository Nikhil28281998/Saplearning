using { Learning_Data as my } from '../db/schema.cds';

@path : '/service/SaplearningcenterService'
service SaplearningcenterService {
    @cds.redirection.target
    @odata.draft.enabled
    entity Entity1 as projection on my.Entity1;

    // Optional: expose training for future use
    @cds.redirection.target
    entity TrainingAssignments as projection on my.TrainingAssignments;
}

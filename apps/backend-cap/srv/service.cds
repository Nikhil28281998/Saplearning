using ulhn from '../db/schema';

service ULHNService @(path:'/api') {
  entity Resources as projection on ulhn.Resources;
  entity TrainingAssignments as projection on ulhn.TrainingAssignments;
}

using { Learning_Data as my } from '../db/schema.cds';

@path : '/service/SaplearningcenterService'
service SaplearningcenterService
{
    @cds.redirection.target
    @odata.draft.enabled
    entity Entity1 as
        projection on my.Entity1;
}

annotate SaplearningcenterService with @requires :
[
    'authenticated-user'
];

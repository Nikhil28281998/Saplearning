const cds = require('@sap/cds');

module.exports = (srv) => {
  const { TrainingAssignments } = cds.entities('Learning_Data');

  // Only keep explicit action logic; RBAC handled via @restrict in service.cds
  srv.on('markCompleted', 'TrainingAssignments', async (req) => {
    const id = req.params?.[0]?.ID;
    if (!id) return req.error(400, 'Missing key');
    const tx = cds.tx(req);
    await tx.update(TrainingAssignments).set({ status: 'Completed', completionDate: new Date().toISOString() }).where({ ID: id });
    const row = await tx.read(TrainingAssignments).byKey(id);
    return row;
  });
};

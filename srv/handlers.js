const cds = require('@sap/cds');

module.exports = (srv) => {
  const { TrainingAssignments } = cds.entities('Learning_Data');

  srv.on('markCompleted', 'TrainingAssignments', async (req) => {
    const id = req.params?.[0]?.ID;
    if (!id) return req.error(400, 'Missing key');
    const tx = cds.tx(req);
    await tx.update(TrainingAssignments).set({ status: 'Completed', completedAt: new Date().toISOString() }).where({ ID: id });
    const row = await tx.read(TrainingAssignments).byKey(id);
    return row;
  });
};

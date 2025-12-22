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
    try { req.notify(200, 'Training marked as complete'); } catch(_) {}
    return row;
  });

  // Provide role resolution for preview/testing and UI logic
  srv.on('getCurrentRole', async (req) => {
    try{
      const u = req.user;
      if (!u) return 'User';
      if (u.is('Admin')) return 'Admin';
      if (u.is('Manager') || u.is('Lead')) return 'Manager';
      if (u.is('User')) return 'User';
      // Fallback
      return 'User';
    }catch(_){
      return 'User';
    }
  });
};

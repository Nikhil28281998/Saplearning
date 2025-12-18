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

  // Simple role resolver for preview: Manager or User
  function resolveRole(req) {
    // precedence: query ?role=, header x-user-role, env DEFAULT_ROLE
    const qRole = req?.req?.query?.role || req?.data?.role;
    const hRole = req?.req?.headers?.['x-user-role'] || req?.headers?.['x-user-role'];
    const envRole = process.env.DEFAULT_ROLE;
    const role = (qRole || hRole || envRole || 'Manager').toLowerCase();
    return role === 'manager' ? 'Manager' : 'User';
  }

  // Enforce that only Managers can create assignments
  srv.before('CREATE', 'TrainingAssignments', (req) => {
    const role = resolveRole(req);
    if (role !== 'Manager') {
      return req.error(403, 'Only managers can create assignments');
    }
  });

  // Provide current role to UI
  srv.on('getCurrentRole', async (req) => {
    return resolveRole(req);
  });
};

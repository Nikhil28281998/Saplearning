const cds = require('@sap/cds');

module.exports = (srv) => {
  const { TrainingAssignments, Users } = cds.entities('Learning_Data');

  // Helper: resolve current role and identity for preview/dev
  function resolveRole(req) {
    // 1) XSUAA/JWT roles when available
    const u = req?.user;
    if (u && (u.is && (u.is('Admin') || u.is('Manager') || u.is('User')))) {
      if (u.is('Admin')) return 'Admin';
      if (u.is('Manager')) return 'Manager';
      return 'User';
    }
    // 2) Headers / query for BAS preview
    const qRole = req?.req?.query?.role || req?.data?.role;
    const hRole = req?.req?.headers?.['x-user-role'] || req?.headers?.['x-user-role'];
    const envRole = process.env.DEFAULT_ROLE;
    const role = (qRole || hRole || envRole || 'Admin').toLowerCase();
    if (role === 'admin') return 'Admin';
    if (role === 'manager') return 'Manager';
    return 'User';
  }

  function resolveUserId(req) {
    // Preview-only: allow passing current user via header or query
    const qUid = req?.req?.query?.userId || req?.data?.userId;
    const hUid = req?.req?.headers?.['x-user-id'] || req?.headers?.['x-user-id'];
    return qUid || hUid || null;
  }

  function resolveManagerId(req) {
    const qMid = req?.req?.query?.managerId || req?.data?.managerId;
    const hMid = req?.req?.headers?.['x-manager-id'] || req?.headers?.['x-manager-id'];
    return qMid || hMid || null;
  }

  // Action: markCompleted on TrainingAssignments
  srv.on('markCompleted', 'TrainingAssignments', async (req) => {
    const id = req.params?.[0]?.ID;
    if (!id) return req.error(400, 'Missing key');
    const tx = cds.tx(req);
    await tx.update(TrainingAssignments).set({ status: 'Completed', completionDate: new Date().toISOString() }).where({ ID: id });
    const row = await tx.read(TrainingAssignments).byKey(id);
    return row;
  });

  // Restrict CREATE of assignments to Managers (and Admins if desired)
  srv.before('CREATE', 'TrainingAssignments', async (req) => {
    const role = resolveRole(req);
    if (role !== 'Manager' && role !== 'Admin') {
      return req.error(403, 'Only managers or admins can create assignments');
    }
    // If manager, ensure assignment user belongs to this manager
    const userId = req.data?.userId;
    if (role === 'Manager' && userId) {
      const tx = cds.tx(req);
      const user = await tx.read(Users).byKey(userId);
      const managerId = resolveManagerId(req);
      if (user && managerId && user.managerId && user.managerId !== managerId) {
        return req.error(403, 'Cannot assign training to users outside your team');
      }
    }
  });

  // Filter READ results based on role
  srv.on('READ', 'TrainingAssignments', async (req, next) => {
    const role = resolveRole(req);
    if (role === 'Admin') {
      return next(); // full access
    }
    const tx = cds.tx(req);
    if (role === 'Manager') {
      const managerId = resolveManagerId(req);
      if (!managerId) return next();
      // Show assignments for users whose managerId equals current manager
      const teamUsers = await tx.read(Users).columns('ID').where({ managerId });
      const userIds = teamUsers.map(u => u.ID);
      if (userIds.length === 0) {
        req.where = cds.parse.expr(`userId = '00000000-0000-0000-0000-000000000000'`); // yields empty
        return next();
      }
      req.where = cds.parse.expr({ userId: { in: userIds } });
      return next();
    }
    // User: show only own assignments
    const userId = resolveUserId(req);
    if (userId) {
      req.where = cds.parse.expr({ userId });
    }
    return next();
  });

  // Users entity: allow Admin full CRUD; Managers read team; Users read self only
  srv.on('READ', 'Users', async (req, next) => {
    const role = resolveRole(req);
    if (role === 'Admin') return next();
    const tx = cds.tx(req);
    if (role === 'Manager') {
      const managerId = resolveManagerId(req);
      if (!managerId) return next();
      req.where = cds.parse.expr({ managerId });
      return next();
    }
    const userId = resolveUserId(req);
    if (userId) {
      req.where = cds.parse.expr({ ID: userId });
    }
    return next();
  });

  srv.before('CREATE', 'Users', (req) => {
    const role = resolveRole(req);
    if (role !== 'Admin') return req.error(403, 'Only admins can create users');
  });
  srv.before('UPDATE', 'Users', (req) => {
    const role = resolveRole(req);
    if (role !== 'Admin') return req.error(403, 'Only admins can update users');
  });
  srv.before('DELETE', 'Users', (req) => {
    const role = resolveRole(req);
    if (role !== 'Admin') return req.error(403, 'Only admins can delete users');
  });

  // Provide current role to UI
  srv.on('getCurrentRole', async (req) => {
    return resolveRole(req);
  });
};

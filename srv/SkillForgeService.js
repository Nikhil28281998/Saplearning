const cds = require('@sap/cds');

module.exports = (srv) => {
  const { TrainingAssignments, Users } = cds.entities('Learning_Data');
  
  // SkillForge Training Platform - Service Implementation

  // Action: mark TrainingAssignment as completed
  srv.on('markCompleted', 'TrainingAssignments', async (req) => {
    const id = req.params?.[0]?.ID;
    if (!id) return req.error(400, 'Missing key');
    const tx = cds.tx(req);
    await tx.update(TrainingAssignments).set({ status: 'Completed', completionDate: new Date().toISOString() }).where({ ID: id });
    const row = await tx.read(TrainingAssignments).byKey(id);
    try { req.notify(200, 'Training marked as complete'); } catch(_) {}
    return row;
  });

  // Function: resolve user role from database based on platform identity
  srv.on('getCurrentRole', async (req) => {
    try {
      const userEmail = req.user.id; // XSUAA token contains user email/ID
      if (!userEmail) {
        console.warn('getCurrentRole: No user identity found in req.user.id');
        return 'User'; // default fallback
      }

      const tx = cds.tx(req);
      const userRecord = await tx.read(Users).where({ email: userEmail }).limit(1);
      
      if (userRecord && userRecord.length > 0 && userRecord[0].role) {
        return userRecord[0].role; // Admin, Manager, or User from DB
      }

      console.warn(`getCurrentRole: No user record found for email ${userEmail}, defaulting to User`);
      return 'User'; // default if user not found in database
    } catch (err) {
      console.error('getCurrentRole error:', err);
      return 'User'; // safe fallback
    }
  });

  // Before CREATE on TrainingAssignments: validate manager hierarchy
  srv.before('CREATE', 'TrainingAssignments', async (req) => {
    const userEmail = req.user.id;
    if (!userEmail) {
      return req.error(403, 'User identity not found');
    }

    const tx = cds.tx(req);
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    
    if (!currentUser || currentUser.length === 0) {
      return req.error(403, 'User not found in system');
    }

    const userRole = currentUser[0].role;
    const userID = currentUser[0].ID;
    const assigneeId = req.data.userId;

    // Admin can assign to anyone
    if (userRole === 'Admin') {
      return; // allow
    }

    // Manager can only assign to their direct reports
    if (userRole === 'Manager') {
      const assignee = await tx.read(Users).byKey(assigneeId);
      if (!assignee) {
        return req.error(400, 'Assignee user not found');
      }
      if (assignee.managerId !== userID) {
        return req.error(403, `Managers can only assign trainings to their direct reports`);
      }
      return; // allow
    }

    // Regular Users cannot create assignments
    return req.error(403, 'Regular users cannot create training assignments');
  });

  // Before READ on Users: enforce role-based filtering
  // (This complements @restrict but adds explicit hierarchy validation)
  srv.before('READ', 'Users', async (req) => {
    const userEmail = req.user.id;
    if (!userEmail) return; // let @restrict handle it

    const tx = cds.tx(req);
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    
    if (!currentUser || currentUser.length === 0) return; // no user found

    const userRole = currentUser[0].role;
    const userID = currentUser[0].ID;

    // Admin can see all users - no restriction
    if (userRole === 'Admin') {
      return;
    }

    // Manager can only see their team (where managerId = current user ID)
    if (userRole === 'Manager') {
      req.query.where({ managerId: userID });
      return;
    }

    // Regular User can only see themselves
    if (userRole === 'User') {
      req.query.where({ ID: userID });
      return;
    }
  });

  // Before READ on TrainingAssignments: ensure userId filtering for Users
  srv.before('READ', 'TrainingAssignments', async (req) => {
    const userEmail = req.user.id;
    if (!userEmail) return;

    const tx = cds.tx(req);
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    
    if (!currentUser || currentUser.length === 0) return;

    const userRole = currentUser[0].role;
    const userID = currentUser[0].ID;

    // Admin and Manager can see all assignments - no additional restriction
    if (userRole === 'Admin' || userRole === 'Manager') {
      return;
    }

    // Regular User can only see their own assignments
    if (userRole === 'User') {
      req.query.where({ userId: userID });
      return;
    }
  });
};

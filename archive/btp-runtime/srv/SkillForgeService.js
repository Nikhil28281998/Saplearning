const cds = require('@sap/cds');

module.exports = (srv) => {
  const { TrainingAssignments, Users } = cds.entities('Learning_Data');
  
  // SkillForge Training Platform - Service Implementation

  // Action: mark TrainingAssignment as completed
  srv.on('markCompleted', 'TrainingAssignments', async (req) => {
    const id = req.params?.[0]?.ID;
    if (!id) return req.error(400, 'Missing assignment ID');
    
    const tx = cds.tx(req);
    const userEmail = req.user.id;
    
    // CRITICAL FIX: Authorization check
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    if (!currentUser || currentUser.length === 0) {
      return req.error(403, 'Unauthorized');
    }
    
    const assignment = await tx.read(TrainingAssignments).byKey(id);
    if (!assignment) {
      return req.error(404, 'Assignment not found');
    }
    
    const userRole = currentUser[0].role;
    const userID = currentUser[0].ID;
    
    // Only assignment owner, their manager, or Admin can mark complete
    if (userRole === 'User' && assignment.userId !== userID) {
      return req.error(403, 'Cannot modify other users\' assignments');
    }
    
    if (userRole === 'Manager') {
      const assignee = await tx.read(Users).byKey(assignment.userId);
      if (assignee.managerId !== userID) {
        return req.error(403, 'Cannot modify assignments outside your team');
      }
    }
    
    // Prevent re-completion
    if (assignment.status === 'Completed') {
      return req.error(400, 'Assignment already completed');
    }
    
    await tx.update(TrainingAssignments)
      .set({ 
        status: 'Completed', 
        completionDate: new Date().toISOString() 
      })
      .where({ ID: id });
    
    const row = await tx.read(TrainingAssignments).byKey(id);
    
    // Audit log
    console.info(`[AUDIT] User ${userEmail} (${userRole}) marked assignment ${id} complete`);
    
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
      return req.error(403, 'Authentication required');
    }

    const tx = cds.tx(req);
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    
    if (!currentUser || currentUser.length === 0) {
      console.warn(`[AUDIT] CREATE TrainingAssignment blocked - user not found: ${userEmail}`);
      return req.error(403, 'Unauthorized');
    }

    const userRole = currentUser[0].role;
    const userID = currentUser[0].ID;
    const assigneeId = req.data.userId;
    const trainingId = req.data.trainingId;
    
    // HIGH FIX: Input validation
    if (!assigneeId) {
      return req.error(400, 'User ID is required');
    }
    if (!trainingId) {
      return req.error(400, 'Training ID is required');
    }
    
    // Validate training exists
    const { Trainings } = cds.entities('Learning_Data');
    const training = await tx.read(Trainings).byKey(trainingId);
    if (!training) {
      return req.error(400, 'Invalid training ID');
    }
    
    // Validate assignee exists
    const assignee = await tx.read(Users).byKey(assigneeId);
    if (!assignee) {
      return req.error(400, 'Invalid user ID');
    }
    
    // Check for duplicate assignment
    const existing = await tx.read(TrainingAssignments)
      .where({ userId: assigneeId, trainingId: trainingId, status: { '!=': 'Completed' } });
    if (existing.length > 0) {
      return req.error(400, 'User already has an active assignment for this training');
    }
    
    // Set default status if not provided
    if (!req.data.status) {
      req.data.status = 'Assigned';
    }

    // Admin can assign to anyone
    if (userRole === 'Admin') {
      console.info(`[AUDIT] Admin ${userEmail} creating assignment: user=${assigneeId}, training=${trainingId}`);
      return; // allow
    }

    // Manager can only assign to their direct reports
    if (userRole === 'Manager') {
      if (assignee.managerId !== userID) {
        console.warn(`[AUDIT] Manager ${userEmail} blocked - tried to assign outside team`);
        return req.error(403, `Cannot assign trainings outside your team`);
      }
      console.info(`[AUDIT] Manager ${userEmail} creating assignment: user=${assigneeId}, training=${trainingId}`);
      return; // allow
    }

    // Regular Users cannot create assignments
    console.warn(`[AUDIT] User ${userEmail} blocked - attempted to create assignment`);
    return req.error(403, 'Insufficient privileges');
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
      console.debug(`[AUDIT] Manager ${userEmail} accessing team members`);
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

  // Before UPDATE on TrainingAssignments: restrict field updates based on role
  srv.before('UPDATE', 'TrainingAssignments', async (req) => {
    const userEmail = req.user.id;
    if (!userEmail) return req.error(403, 'Authentication required');

    const tx = cds.tx(req);
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    
    if (!currentUser || currentUser.length === 0) {
      return req.error(403, 'Unauthorized');
    }

    const userRole = currentUser[0].role;
    const userID = currentUser[0].ID;
    const assignmentId = req.data.ID || req.params[0]?.ID;
    
    if (!assignmentId) return;
    
    const assignment = await tx.read(TrainingAssignments).byKey(assignmentId);
    if (!assignment) return req.error(404, 'Assignment not found');

    // Admin can update anything
    if (userRole === 'Admin') {
      return;
    }

    // Manager can update their team's assignments
    if (userRole === 'Manager') {
      const assignee = await tx.read(Users).byKey(assignment.userId);
      if (assignee.managerId !== userID) {
        return req.error(403, 'Cannot update assignments outside your team');
      }
      return;
    }

    // Regular User can only update their own assignments and only specific fields
    if (userRole === 'User') {
      if (assignment.userId !== userID) {
        return req.error(403, 'Cannot update other users\' assignments');
      }
      
      // Users can only update status and completionDate (via markCompleted action preferably)
      const allowedFields = ['status', 'completionDate'];
      const attemptedFields = Object.keys(req.data).filter(k => k !== 'ID');
      const disallowedFields = attemptedFields.filter(f => !allowedFields.includes(f));
      
      if (disallowedFields.length > 0) {
        return req.error(403, `Users can only update: ${allowedFields.join(', ')}`);
      }
      
      return;
    }
  });

  // Before DELETE on Trainings: only Admin can delete
  srv.before('DELETE', 'Trainings', async (req) => {
    const userEmail = req.user.id;
    if (!userEmail) return req.error(403, 'Authentication required');

    const tx = cds.tx(req);
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    
    if (!currentUser || currentUser.length === 0) {
      return req.error(403, 'Unauthorized');
    }

    const userRole = currentUser[0].role;

    // Only Admin can delete trainings
    if (userRole !== 'Admin') {
      console.warn(`[AUDIT] ${userRole} ${userEmail} blocked - attempted to delete Training`);
      return req.error(403, 'Only Admins can delete trainings');
    }

    const trainingId = req.data.ID || req.params[0]?.ID;
    console.info(`[AUDIT] Admin ${userEmail} deleting Training ${trainingId}`);
  });

  // Before DELETE on Users: only Admin can delete, prevent self-deletion
  srv.before('DELETE', 'Users', async (req) => {
    const userEmail = req.user.id;
    if (!userEmail) return req.error(403, 'Authentication required');

    const tx = cds.tx(req);
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    
    if (!currentUser || currentUser.length === 0) {
      return req.error(403, 'Unauthorized');
    }

    const userRole = currentUser[0].role;
    const currentUserID = currentUser[0].ID;

    // Only Admin can delete users
    if (userRole !== 'Admin') {
      console.warn(`[AUDIT] ${userRole} ${userEmail} blocked - attempted to delete User`);
      return req.error(403, 'Only Admins can delete users');
    }

    const targetUserId = req.data.ID || req.params[0]?.ID;

    // Prevent self-deletion
    if (targetUserId === currentUserID) {
      return req.error(400, 'Cannot delete your own user account');
    }

    console.info(`[AUDIT] Admin ${userEmail} deleting User ${targetUserId}`);
  });

  // Before CREATE/UPDATE on Users: only Admin can modify users
  srv.before(['CREATE', 'UPDATE'], 'Users', async (req) => {
    const userEmail = req.user.id;
    if (!userEmail) return req.error(403, 'Authentication required');

    const tx = cds.tx(req);
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    
    if (!currentUser || currentUser.length === 0) {
      return req.error(403, 'Unauthorized');
    }

    const userRole = currentUser[0].role;

    // Only Admin can create/update users
    if (userRole !== 'Admin') {
      console.warn(`[AUDIT] ${userRole} ${userEmail} blocked - attempted to ${req.method} User`);
      return req.error(403, 'Only Admins can manage users');
    }

    // Validate role if provided
    if (req.data.role) {
      const validRoles = ['Admin', 'Manager', 'User'];
      if (!validRoles.includes(req.data.role)) {
        return req.error(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }
    }

    // Validate email format
    if (req.data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.data.email)) {
        return req.error(400, 'Invalid email format');
      }
    }

    // Validate managerId exists if provided
    if (req.data.managerId) {
      const manager = await tx.read(Users).byKey(req.data.managerId);
      if (!manager) {
        return req.error(400, 'Invalid manager ID - user does not exist');
      }
      if (manager.role !== 'Manager' && manager.role !== 'Admin') {
        return req.error(400, 'Manager ID must reference a user with Manager or Admin role');
      }
    }

    const operation = req.method;
    const userId = req.data.ID || (req.params && req.params[0]?.ID);
    console.info(`[AUDIT] Admin ${userEmail} ${operation} User ${userId || 'new'}`);
  });

  // Before CREATE/UPDATE on Trainings: only Admin can modify
  srv.before(['CREATE', 'UPDATE'], 'Trainings', async (req) => {
    const userEmail = req.user.id;
    if (!userEmail) return req.error(403, 'Authentication required');

    const tx = cds.tx(req);
    const currentUser = await tx.read(Users).where({ email: userEmail }).limit(1);
    
    if (!currentUser || currentUser.length === 0) {
      return req.error(403, 'Unauthorized');
    }

    const userRole = currentUser[0].role;

    // Only Admin can create/update trainings
    if (userRole !== 'Admin') {
      console.warn(`[AUDIT] ${userRole} ${userEmail} blocked - attempted to ${req.method} Training`);
      return req.error(403, 'Only Admins can manage trainings');
    }

    const operation = req.method;
    const trainingId = req.data.ID || (req.params && req.params[0]?.ID);
    console.info(`[AUDIT] Admin ${userEmail} ${operation} Training ${trainingId || 'new'}`);
  });
};

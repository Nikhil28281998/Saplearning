/**
 * ============================================================================
 * SAP Learning Courses - Service Implementation (Clean Core Compliant)
 * ============================================================================
 * 
 * CLEAN CORE COMPLIANCE:
 * ✅ No custom user management (uses USR21/ADRP/ADR6)
 * ✅ PFCG role-based authorization only
 * ✅ No modifications to standard SAP objects
 * ✅ All custom code in Z namespace
 * ✅ Upgrade-safe architecture
 * ✅ Input validation & XSS protection
 * ✅ Secure logging (no PII exposure)
 * ✅ CAP-managed transactions (no manual tx handling)
 * ============================================================================
 */

const cds = require('@sap/cds');
let xss;
try {
  xss = require('xss');
} catch (e) {
  // Fallback: basic HTML entity encoding when xss module is unavailable
  xss = function (str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  };
}
const LOG = cds.log('sap-learning');

// H-4: Configurable default due date days (avoid magic number)
const DEFAULT_DUE_DAYS = parseInt(process.env.DEFAULT_DUE_DAYS, 10) || 30;
const DELEGATION_EXPIRY_DAYS = parseInt(process.env.DELEGATION_EXPIRY_DAYS, 10) || 30;

module.exports = class SAPLearningService extends cds.ApplicationService {

  async init() {
    const { TrainingAssignments, Trainings, Users, ManagerDelegations } = this.entities;

    // ============================================================================
    // AUTHORIZATION HELPER - PFCG Role-Based (SAP Standard)
    // ============================================================================

    function getUserContext(req) {
      const username = req.user?.id || 'ANONYMOUS';
      return {
        username,
        isAdmin: req.user?.is('Admin') || false,
        isManager: req.user?.is('Manager') || false,
        isUser: req.user?.is('User') || false,
        sapUsername: req.user?.attr?.sapUsername || username.split('@')[0].toUpperCase().substring(0, 12)
      };
    }

    /**
     * Validate and sanitize user input.
     * CDS now enforces: @mandatory, @assert.format on userId, Status enum, String lengths.
     * This function handles: XSS sanitization, email format, URL format.
     * @returns {boolean} true if valid, false if errors were registered via req.reject()
     */
    function validateInput(data, req) {
      const errors = [];

      // Sanitize text inputs (XSS protection — CDS does not do this)
      ['title', 'description', 'userName', 'userEmail', 'assignedByName'].forEach(field => {
        if (data[field] && typeof data[field] === 'string') {
          data[field] = xss(data[field]).trim();
        }
      });

      // Validate email format (CDS has no built-in email assertion)
      if (data.userEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.userEmail)) {
          errors.push('Invalid email format');
        }
      }

      if (errors.length > 0) {
        req.reject(400, errors.join('; '));
        return false;
      }
      return true;
    }

    /**
     * Secure logging - masks PII and only logs in development.
     * Uses cds.log('sap-learning') namespace.
     */
    function secureLog(level, message, data = {}) {
      const authKind = cds.env.requires?.auth?.kind;
      if (authKind === 'dummy' || authKind === 'mocked' || process.env.NODE_ENV !== 'production') {
        const masked = { ...data };
        if (masked.email) masked.email = masked.email.substring(0, 3) + '***@***';
        if (masked.username && masked.username.length > 3) {
          masked.username = masked.username.substring(0, 3) + '***';
        }
        if (level === 'info')  LOG.info(message, masked);
        else if (level === 'warn')  LOG.warn(message, masked);
        else if (level === 'error') LOG.error(message, masked);
        else LOG.info(message, masked);
      }
    }

    // ============================================================================
    // ACTION: Mark Training Assignment as Completed
    // ============================================================================

    this.on('markCompleted', 'TrainingAssignments', async (req) => {
      // CDS V4: req.params is an array; each element is either {ID:'uuid'} or a plain string
      const p0 = req.params?.[0];
      const id = typeof p0 === 'object' ? p0.ID : p0;
      if (!id) return req.reject(400, 'Missing assignment ID');

      const userCtx = getUserContext(req);

      const assignment = await SELECT.one.from(TrainingAssignments).where({ ID: id });
      if (!assignment) return req.reject(404, 'Assignment not found');

      // Authorization: Only assignment owner, Manager, or Admin can mark complete
      if (userCtx.isUser && !userCtx.isManager && !userCtx.isAdmin) {
        if (assignment.userId !== userCtx.sapUsername) {
          secureLog('warn', 'Unauthorized markCompleted attempt', {
            username: userCtx.username, assignmentId: id
          });
          return req.reject(403, 'Cannot modify other users\' assignments');
        }
      }

      if (assignment.status === 'Completed') {
        return req.reject(400, 'Assignment already completed');
      }

      await UPDATE(TrainingAssignments)
        .set({
          status: 'Completed',
          completionDate: cds.context.timestamp
        })
        .where({ ID: id });

      const updated = await SELECT.one.from(TrainingAssignments).where({ ID: id });

      // C5: Auto-recreate if this is a recurring assignment
      // 4-5 FIX: Respect maxRecurrences limit (0 = unlimited)
      if (assignment.recurring && assignment.recurringInterval) {
        const currentCount = (assignment.recurrenceCount || 0) + 1;
        const maxAllowed = assignment.maxRecurrences || 0;
        if (maxAllowed > 0 && currentCount >= maxAllowed) {
          secureLog('info', 'Recurring assignment reached max recurrences', {
            trainingId: assignment.trainingId, userId: assignment.userId,
            count: currentCount, max: maxAllowed
          });
        } else {
          const intervalDays = {
            'daily': 1, 'weekly': 7, 'monthly': 30, 'quarterly': 90, 'yearly': 365
          };
          const days = intervalDays[assignment.recurringInterval.toLowerCase()] || 30;
          const nextDue = new Date();
          nextDue.setDate(nextDue.getDate() + days);

          try {
            await INSERT.into(TrainingAssignments).entries({
              trainingId:        assignment.trainingId,
              userId:            assignment.userId,
              userName:          assignment.userName,
              userEmail:         assignment.userEmail,
              title:             assignment.title,
              role:              assignment.role,
              topic:             assignment.topic,
              sap_module:        assignment.sap_module,
              url:               assignment.url,
              managerSort2:      assignment.managerSort2,
              assignedBy:        assignment.assignedBy,
              assignedByName:    assignment.assignedByName,
              status:            'Assigned',
              priority:          assignment.priority,
              notes:             assignment.notes,
              dueDate:           nextDue.toISOString(),
              recurring:         true,
              recurringInterval: assignment.recurringInterval,
              maxRecurrences:    maxAllowed,
              recurrenceCount:   currentCount,
              sequence:          assignment.sequence
            });
            secureLog('info', 'Recurring assignment auto-created', {
              trainingId: assignment.trainingId, userId: assignment.userId,
              interval: assignment.recurringInterval, count: currentCount
            });
          } catch (err) {
            secureLog('error', 'Failed to auto-create recurring assignment', { error: err.message });
          }
        }
      }

      secureLog('info', 'Assignment completed', {
        assignmentId: id, username: userCtx.username
      });

      try { req.notify(200, 'Training marked as complete'); } catch (_) { /* noop */ }
      return updated;
    });

    // ============================================================================
    // FUNCTION: Get Current User Role (for UI UX only - backend enforces via @restrict)
    // ============================================================================

    this.on('getCurrentRole', async (req) => {
      if (req.user.is('Admin')) return 'Admin';
      if (req.user.is('Manager')) return 'Manager';
      if (req.user.is('User')) return 'User';

      secureLog('warn', 'User has no recognized role', { username: req.user?.id });
      return 'None';
    });

    // ============================================================================
    // FUNCTION: Get Current User's SAP Username (for UI data filtering)
    // ============================================================================

    this.on('getCurrentUser', async (req) => {
      const userCtx = getUserContext(req);
      return userCtx.sapUsername;
    });

    // ============================================================================
    // NEW-8: FUNCTION: Server-side Team Analytics Aggregation
    // ============================================================================

    this.on('getTeamAnalytics', async (req) => {
      const userCtx = getUserContext(req);

      // Only Managers and Admins can view team analytics
      if (!userCtx.isManager && !userCtx.isAdmin) {
        return req.reject(403, 'Team analytics requires Manager or Admin role');
      }

      // Build filter: Manager sees only their team; Admin sees all
      const where = {};
      if (userCtx.isManager && !userCtx.isAdmin) {
        where.managerSort2 = userCtx.sapUsername;
      }

      const assignments = await SELECT.from(TrainingAssignments).where(where);

      let assigned = 0, inProgress = 0, completed = 0, overdue = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const userMap = {};

      for (const a of assignments) {
        if (a.status === 'Assigned') assigned++;
        else if (a.status === 'In Progress') inProgress++;
        else if (a.status === 'Completed') completed++;

        // Overdue: not completed and dueDate < today (strictly past due)
        let isOverdue = false;
        if (a.status !== 'Completed' && a.dueDate) {
          const due = new Date(a.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < today) { overdue++; isOverdue = true; }
        }

        const uid = a.userId || 'UNKNOWN';
        if (!userMap[uid]) {
          userMap[uid] = { userId: uid, userName: a.userName || uid, total: 0, completed: 0, overdue: 0, inProgress: 0 };
        }
        userMap[uid].total++;
        if (a.status === 'Completed') userMap[uid].completed++;
        if (a.status === 'In Progress') userMap[uid].inProgress++;
        if (isOverdue) userMap[uid].overdue++;
      }

      const totalAssignments = assignments.length;
      const completionPercent = totalAssignments > 0
        ? Math.round((completed / totalAssignments) * 100)
        : 0;

      // Sort by completion % descending
      const userBreakdown = Object.values(userMap).sort((a, b) => {
        const pctA = a.total > 0 ? a.completed / a.total : 0;
        const pctB = b.total > 0 ? b.completed / b.total : 0;
        return pctB - pctA;
      });

      // D1: Compute trend indicators (compare last 30 days vs previous 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date(now);
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      let currentPeriodCompleted = 0, previousPeriodCompleted = 0;
      let currentPeriodCreated = 0, previousPeriodCreated = 0;

      for (const a of assignments) {
        const completionDate = a.completionDate ? new Date(a.completionDate) : null;
        const createdAt = a.createdAt ? new Date(a.createdAt) : null;

        if (completionDate) {
          if (completionDate >= thirtyDaysAgo) currentPeriodCompleted++;
          else if (completionDate >= sixtyDaysAgo) previousPeriodCompleted++;
        }
        if (createdAt) {
          if (createdAt >= thirtyDaysAgo) currentPeriodCreated++;
          else if (createdAt >= sixtyDaysAgo) previousPeriodCreated++;
        }
      }

      // Trend: 'up' = improved, 'down' = declined, 'flat' = same
      const completionTrend = currentPeriodCompleted > previousPeriodCompleted ? 'up'
        : currentPeriodCompleted < previousPeriodCompleted ? 'down' : 'flat';
      const activityTrend = currentPeriodCreated > previousPeriodCreated ? 'up'
        : currentPeriodCreated < previousPeriodCreated ? 'down' : 'flat';

      return {
        totalAssignments,
        assigned,
        inProgress,
        completed,
        overdue,
        completionPercent,
        userBreakdown,
        // D1: Trend data
        completionTrend,
        activityTrend,
        currentPeriodCompleted,
        previousPeriodCompleted,
        currentPeriodCreated,
        previousPeriodCreated
      };
    });

    // ============================================================================
    // BEFORE CREATE: Training Assignments
    // ============================================================================

    this.before('CREATE', 'TrainingAssignments', async (req) => {
      const userCtx = getUserContext(req);

      if (!userCtx.username || userCtx.username === 'ANONYMOUS') {
        return req.reject(403, 'Authentication required');
      }

      if (!validateInput(req.data, req)) return;

      const assigneeId = req.data.userId;
      const trainingId = req.data.trainingId;

      // @mandatory on trainingId/userId enforced by CDS; this is a business-logic check
      // Validate training exists
      const training = await SELECT.one.from(Trainings).where({ ID: trainingId });
      if (!training) return req.reject(400, 'Training not found');

      // B4: Server-side team validation — Manager can only assign to own team members
      // 1-6 FIX: Also supports delegated authority from another manager
      if (userCtx.isManager && !userCtx.isAdmin) {
        const assigneeUser = await SELECT.one.from(Users).where({ userId: assigneeId });
        if (!assigneeUser) {
          return req.reject(400, 'User not found: ' + assigneeId);
        }
        if (assigneeUser.sort2 !== userCtx.sapUsername) {
          // Check if current user has an active delegation from the assignee's actual manager
          const delegation = await SELECT.one.from(ManagerDelegations).where({
            managerUserId: assigneeUser.sort2,
            delegateUserId: userCtx.sapUsername,
            active: true
          });
          if (!delegation || (delegation.expiresAt && new Date(delegation.expiresAt) < new Date())) {
            secureLog('warn', 'Manager attempted to assign outside team', {
              manager: userCtx.sapUsername, assignee: assigneeId, assigneeManager: assigneeUser.sort2
            });
            return req.reject(403, 'You can only assign trainings to your own team members');
          }
          // Delegation valid — auto-expire if checked just in time
          if (delegation.expiresAt && new Date(delegation.expiresAt) < new Date()) {
            await UPDATE(ManagerDelegations).set({ active: false }).where({ ID: delegation.ID });
            return req.reject(403, 'Delegation has expired');
          }
          secureLog('info', 'Delegated assignment', {
            delegate: userCtx.sapUsername, delegatingManager: assigneeUser.sort2, assignee: assigneeId
          });
        }
      }

      // Check for duplicate assignment (prevent multiple active assignments)
      const existing = await SELECT.from(TrainingAssignments)
        .where({
          userId: assigneeId,
          trainingId: trainingId,
          status: { '!=': 'Completed' }
        });

      if (existing.length > 0) {
        return req.reject(400, 'User already has an active assignment for this training');
      }

      // E1: Slim payload — client only needs to send trainingId, userId, dueDate, priority, notes
      // Server denormalizes everything else from training + user master data
      req.data.assignedBy = userCtx.sapUsername;
      req.data.assignedByName = userCtx.username.split('@')[0];

      // PG-2: Validate DueDate is not in the past
      if (req.data.dueDate) {
        const due = new Date(req.data.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (due < today) {
          return req.reject(400, 'Due date cannot be in the past');
        }
      }

      // FIX 3.1: Due date is mandatory — reject if not provided
      if (!req.data.dueDate) {
        return req.reject(400, 'Due date is required. No assignment can be created without a due date.');
      }

      // Denormalize training fields for performance (search/filter without joins)
      req.data.title = training.title;
      req.data.role = training.role;
      req.data.topic = training.topic;
      req.data.sap_module = training.sap_module;
      req.data.url = training.url;

      // Denormalize user fields from Users entity
      try {
        const assigneeUser = await SELECT.one.from(Users).where({ userId: assigneeId });
        if (assigneeUser) {
          req.data.userName = ((assigneeUser.firstName || '') + ' ' + (assigneeUser.lastName || '')).trim() || assigneeId;
          req.data.userEmail = assigneeUser.email || '';
          // M-4 FIX: Populate managerSort2 from assignee's user master
          if (assigneeUser.sort2) {
            req.data.managerSort2 = assigneeUser.sort2;
          } else {
            req.data.managerSort2 = userCtx.sapUsername;
          }
        } else {
          req.data.managerSort2 = userCtx.sapUsername;
        }
      } catch (_) {
        req.data.managerSort2 = req.data.assignedBy || userCtx.sapUsername;
      }

      // Default priority if not provided
      if (!req.data.priority) {
        req.data.priority = 'Medium';
      }

      secureLog('info', 'Training assignment created', {
        assigneeId, trainingId, createdBy: userCtx.username
      });
    });

    // ============================================================================
    // BEFORE UPDATE: Training Assignments
    // ============================================================================

    this.before('UPDATE', 'TrainingAssignments', async (req) => {
      const userCtx = getUserContext(req);

      if (!userCtx.username || userCtx.username === 'ANONYMOUS') {
        return req.reject(403, 'Authentication required');
      }

      if (!validateInput(req.data, req)) return;

      // PG-2: Validate DueDate is not in the past (on update too)
      if (req.data.dueDate) {
        const due = new Date(req.data.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (due < today) {
          return req.reject(400, 'Due date cannot be in the past');
        }
      }

      const assignmentId = req.data.ID || req.params?.[0]?.ID;
      if (!assignmentId) return req.reject(400, 'Assignment ID is required');

      const assignment = await SELECT.one.from(TrainingAssignments).where({ ID: assignmentId });
      if (!assignment) return req.reject(404, 'Assignment not found');

      // Regular users can only update their own assignments and only specific fields
      if (userCtx.isUser && !userCtx.isManager && !userCtx.isAdmin) {
        if (assignment.userId !== userCtx.sapUsername) {
          secureLog('warn', 'Unauthorized UPDATE attempt', {
            username: userCtx.username, assignmentId
          });
          return req.reject(403, 'Cannot update other users\' assignments');
        }

        const allowedFields = ['status', 'completionDate', 'ID'];
        const attemptedFields = Object.keys(req.data);
        const disallowedFields = attemptedFields.filter(f => !allowedFields.includes(f));

        if (disallowedFields.length > 0) {
          return req.reject(403, 'Users can only update: status, completionDate');
        }
      }

      secureLog('info', 'Assignment updated', {
        assignmentId, username: userCtx.username
      });
    });

    // ============================================================================
    // BEFORE DELETE: Trainings (Admin Only — authorization check only)
    // ============================================================================

    this.before('DELETE', 'Trainings', async (req) => {
      const userCtx = getUserContext(req);

      if (!userCtx.isAdmin) {
        secureLog('warn', 'Unauthorized DELETE Trainings attempt', {
          username: userCtx.username
        });
        return req.reject(403, 'Only Admins can delete trainings');
      }
    });

    // ============================================================================
    // AFTER DELETE: Trainings — log after successful delete
    // ============================================================================

    this.after('DELETE', 'Trainings', async (_, req) => {
      const userCtx = getUserContext(req);
      const trainingId = req.data.ID || req.params?.[0]?.ID;

      // HI-2 FIX: Cascade delete orphaned assignments
      if (trainingId) {
        try {
          const n = await DELETE.from(TrainingAssignments).where({ trainingId: trainingId });
          secureLog('info', 'Cascade deleted assignments', { trainingId, rowsDeleted: n });
        } catch (err) {
          secureLog('error', 'Cascade delete failed', { trainingId, error: err.message });
        }
      }

      secureLog('info', 'Training deleted', { trainingId, username: userCtx.username });
    });

    // ============================================================================
    // BEFORE CREATE/UPDATE: Trainings (Admin Only)
    // ============================================================================

    this.before(['CREATE', 'UPDATE'], 'Trainings', async (req) => {
      const userCtx = getUserContext(req);

      if (!userCtx.isAdmin) {
        secureLog('warn', 'Unauthorized training modification attempt', {
          username: userCtx.username, operation: req.method
        });
        return req.reject(403, 'Only Admins can manage trainings');
      }

      if (!validateInput(req.data, req)) return;

      // M-5 FIX: Allow HTTP URLs in development, enforce HTTPS in production only
      if (req.data.url) {
        try {
          const parsed = new URL(req.data.url);
          const isProduction = process.env.NODE_ENV === 'production';
          const allowedProtocols = isProduction ? ['https:'] : ['https:', 'http:'];
          if (!allowedProtocols.includes(parsed.protocol)) {
            return req.reject(400, isProduction ? 'Only HTTPS URLs are allowed' : 'Only HTTP or HTTPS URLs are allowed');
          }
        } catch (err) {
          return req.reject(400, 'Invalid URL format');
        }
      }

      const operation = req.method;
      const trainingId = req.data.ID || req.params?.[0]?.ID;
      secureLog('info', 'Training modified', {
        operation, trainingId, username: userCtx.username
      });
    });

    // ============================================================================
    // PG-4: AFTER UPDATE: Trainings — cascade denormalized fields to assignments
    // ============================================================================

    this.after('UPDATE', 'Trainings', async (data, req) => {
      const trainingId = data.ID || req.params?.[0]?.ID;
      if (!trainingId) return;

      // Build SET clause with only the denormalized fields that changed
      const updateFields = {};
      if (data.title !== undefined) updateFields.title = data.title;
      if (data.role !== undefined) updateFields.role = data.role;
      if (data.topic !== undefined) updateFields.topic = data.topic;
      if (data.sap_module !== undefined) updateFields.sap_module = data.sap_module;
      if (data.url !== undefined) updateFields.url = data.url;

      if (Object.keys(updateFields).length === 0) return;

      try {
        const n = await UPDATE(TrainingAssignments)
          .set(updateFields)
          .where({ trainingId: trainingId });
        secureLog('info', 'Cascade update to assignments', {
          trainingId, fieldsUpdated: Object.keys(updateFields), rowsAffected: n
        });
      } catch (err) {
        secureLog('error', 'Cascade update failed', {
          trainingId, error: err.message
        });
      }
    });

    // ============================================================================
    // AFTER READ: Add caching headers for performance
    // ============================================================================

    this.after('READ', 'Trainings', (trainings, req) => {
      if (req.res) {
        req.res.set('Cache-Control', 'public, max-age=3600');
      }
    });

    this.after('READ', 'TrainingAssignments', (assignments, req) => {
      if (req.res) {
        req.res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    });

    // ============================================================================
    // ACTION: Reassign Training Assignment (C2)
    // ============================================================================

    this.on('reassign', 'TrainingAssignments', async (req) => {
      const p0 = req.params?.[0];
      const id = typeof p0 === 'object' ? p0.ID : p0;
      if (!id) return req.reject(400, 'Missing assignment ID');

      const { newUserId, newUserName, newUserEmail } = req.data || {};
      if (!newUserId) return req.reject(400, 'New user ID is required');

      const userCtx = getUserContext(req);
      const assignment = await SELECT.one.from(TrainingAssignments).where({ ID: id });
      if (!assignment) return req.reject(404, 'Assignment not found');

      if (assignment.status === 'Completed') {
        return req.reject(400, 'Cannot reassign a completed assignment');
      }

      // B4: Verify new user is in manager's team
      if (userCtx.isManager && !userCtx.isAdmin) {
        const newUser = await SELECT.one.from(Users).where({ userId: newUserId });
        if (!newUser || newUser.sort2 !== userCtx.sapUsername) {
          return req.reject(403, 'You can only reassign to your own team members');
        }
      }

      // Check for duplicate: new user might already have this training
      const existing = await SELECT.from(TrainingAssignments)
        .where({ userId: newUserId, trainingId: assignment.trainingId, status: { '!=': 'Completed' } });
      if (existing.length > 0) {
        return req.reject(400, 'Target user already has an active assignment for this training');
      }

      // Look up new user details
      let userName = newUserName || newUserId;
      let userEmail = newUserEmail || '';
      let managerSort2 = userCtx.sapUsername;
      try {
        const newUser = await SELECT.one.from(Users).where({ userId: newUserId });
        if (newUser) {
          userName = ((newUser.firstName || '') + ' ' + (newUser.lastName || '')).trim() || newUserId;
          userEmail = newUser.email || '';
          managerSort2 = newUser.sort2 || userCtx.sapUsername;
        }
      } catch (_) { /* fallback */ }

      await UPDATE(TrainingAssignments)
        .set({
          reassignedFrom: assignment.userId,
          reassignedDate: cds.context.timestamp,
          userId: newUserId,
          userName: userName,
          userEmail: userEmail,
          managerSort2: managerSort2,
          status: 'Assigned',
          completionDate: null
        })
        .where({ ID: id });

      const updated = await SELECT.one.from(TrainingAssignments).where({ ID: id });
      secureLog('info', 'Assignment reassigned', {
        assignmentId: id, from: assignment.userId, to: newUserId, by: userCtx.username
      });

      try { req.notify(200, 'Assignment reassigned to ' + newUserId); } catch (_) { /* noop */ }
      return updated;
    });

    // ============================================================================
    // FUNCTION: Check Duplicates (A1 — pre-check before bulk assignment)
    // ============================================================================

    this.on('checkDuplicates', async (req) => {
      const { userIds, trainingIds } = req.data || {};
      if (!userIds || !trainingIds || userIds.length === 0 || trainingIds.length === 0) {
        return { duplicates: [] };
      }

      // 1-5 FIX: Single bulk query using IN clauses instead of N+1 loop
      const existing = await SELECT.from(TrainingAssignments)
        .columns('userId', 'trainingId', 'status')
        .where({
          userId: { in: userIds },
          trainingId: { in: trainingIds },
          status: { '!=': 'Completed' }
        });

      const duplicates = existing.map(e => ({
        userId: e.userId,
        trainingId: e.trainingId,
        exists: true,
        status: e.status
      }));

      return { duplicates };
    });

    // ============================================================================
    // C6: DELEGATION — Manager delegates authority to another user
    // ============================================================================

    this.on('delegateAuthority', async (req) => {
      const userCtx = getUserContext(req);
      if (!userCtx.isManager && !userCtx.isAdmin) {
        return req.reject(403, 'Only Managers can delegate authority');
      }

      const { delegateUserId } = req.data || {};
      if (!delegateUserId) return req.reject(400, 'Delegate user ID is required');

      if (delegateUserId === userCtx.sapUsername) {
        return req.reject(400, 'Cannot delegate to yourself');
      }

      // Verify delegate exists
      const delegateUser = await SELECT.one.from(Users).where({ userId: delegateUserId });
      if (!delegateUser) return req.reject(404, 'Delegate user not found');

      // Revoke any existing active delegation from this manager
      await UPDATE(ManagerDelegations)
        .set({ active: false })
        .where({ managerUserId: userCtx.sapUsername, active: true });

      // Create new delegation (expires in 30 days by default)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + DELEGATION_EXPIRY_DAYS);

      const delegation = {
        managerUserId: userCtx.sapUsername,
        delegateUserId: delegateUserId,
        delegateName: ((delegateUser.firstName || '') + ' ' + (delegateUser.lastName || '')).trim() || delegateUserId,
        active: true,
        expiresAt: expiresAt.toISOString()
      };

      await INSERT.into(ManagerDelegations).entries(delegation);

      secureLog('info', 'Authority delegated', {
        manager: userCtx.sapUsername, delegate: delegateUserId
      });

      return delegation;
    });

    this.on('revokeDelegation', async (req) => {
      const userCtx = getUserContext(req);
      const { delegationId } = req.data || {};

      if (delegationId) {
        const delegation = await SELECT.one.from(ManagerDelegations).where({ ID: delegationId });
        if (!delegation) return req.reject(404, 'Delegation not found');
        if (delegation.managerUserId !== userCtx.sapUsername && !userCtx.isAdmin) {
          return req.reject(403, 'Can only revoke your own delegations');
        }
        await UPDATE(ManagerDelegations).set({ active: false }).where({ ID: delegationId });
      } else {
        // Revoke all active delegations for this manager
        await UPDATE(ManagerDelegations)
          .set({ active: false })
          .where({ managerUserId: userCtx.sapUsername, active: true });
      }

      secureLog('info', 'Delegation revoked', { manager: userCtx.sapUsername });
    });

    this.on('getActiveDelegation', async (req) => {
      const userCtx = getUserContext(req);
      const delegation = await SELECT.one.from(ManagerDelegations)
        .where({ managerUserId: userCtx.sapUsername, active: true });

      if (delegation) {
        // Check if expired
        if (delegation.expiresAt && new Date(delegation.expiresAt) < new Date()) {
          await UPDATE(ManagerDelegations).set({ active: false }).where({ ID: delegation.ID });
          return '';
        }
        return delegation.delegateUserId + '|' + delegation.delegateName;
      }
      return '';
    });

    await super.init();
  }
};

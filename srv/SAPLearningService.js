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

module.exports = class SAPLearningService extends cds.ApplicationService {

  async init() {
    const { TrainingAssignments, Trainings } = this.entities;

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
      const id = req.params?.[0]?.ID;
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

        // Overdue: not completed and dueDate <= today (due today = overdue)
        if (a.status !== 'Completed' && a.dueDate) {
          const due = new Date(a.dueDate);
          if (due <= today) overdue++;
        }

        const uid = a.userId || 'UNKNOWN';
        if (!userMap[uid]) {
          userMap[uid] = { userId: uid, userName: a.userName || uid, total: 0, completed: 0 };
        }
        userMap[uid].total++;
        if (a.status === 'Completed') userMap[uid].completed++;
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

      return {
        totalAssignments,
        assigned,
        inProgress,
        completed,
        overdue,
        completionPercent,
        userBreakdown
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

      // Set metadata (status default handled by CDS schema)
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

      // Denormalize training fields for performance (search/filter without joins)
      req.data.title = training.title;
      req.data.role = training.role;
      req.data.sap_module = training.sap_module;
      req.data.url = training.url;

      // Populate managerSort2 — the manager who assigned this training
      // In production (ABAP Gateway), ADRP.SORT2 is read for the assignee's manager
      // In CAP dev mode, store the assigning manager's username as the sort2 value
      req.data.managerSort2 = userCtx.sapUsername;

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

    this.after('DELETE', 'Trainings', (_, req) => {
      const userCtx = getUserContext(req);
      const trainingId = req.data.ID || req.params?.[0]?.ID;
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

      // Validate URL format — only HTTPS allowed
      if (req.data.url) {
        try {
          const parsed = new URL(req.data.url);
          if (parsed.protocol !== 'https:') {
            return req.reject(400, 'Only HTTPS URLs are allowed');
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

    await super.init();
  }
};

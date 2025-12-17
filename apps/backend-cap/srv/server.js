const cds = require('@sap/cds');

cds.on('bootstrap', app => {
  // Filters: roles
  app.get('/api/filters/roles', async (req, res) => {
    try {
      const rows = await cds.run(/* sql */`SELECT DISTINCT role FROM ulhn_Resources WHERE role IS NOT NULL AND role <> ''`);
      res.json(rows.map(r => r.ROLE || r.role));
    } catch (e) {
      res.status(500).json({ error: 'failed', details: String(e) });
    }
  });

  // Filters: modules
  app.get('/api/filters/modules', async (req, res) => {
    try {
      const rows = await cds.run(/* sql */`SELECT DISTINCT module FROM ulhn_Resources WHERE module IS NOT NULL AND module <> ''`);
      res.json(rows.map(r => r.MODULE || r.module));
    } catch (e) {
      res.status(500).json({ error: 'failed', details: String(e) });
    }
  });

  // Search
  app.get('/api/search', async (req, res) => {
    try {
      const { role, module, query, dateFrom, dateTo } = req.query;
      const conditions = [];
      const params = [];
      if (role) { conditions.push('role = ?'); params.push(role); }
      if (module) { conditions.push('module = ?'); params.push(module); }
      if (query) {
        conditions.push('(title LIKE ? OR description LIKE ? OR url LIKE ?)');
        params.push(`%${query}%`, `%${query}%`, `%${query}%`);
      }
      if (dateFrom) { conditions.push('lastUpdated >= ?'); params.push(dateFrom); }
      if (dateTo) { conditions.push('lastUpdated <= ?'); params.push(dateTo); }
      const where = conditions.length ? ('WHERE ' + conditions.join(' AND ')) : '';
      const sql = `SELECT ID as id, url, role, title, module, description, lastUpdated, sapHelpLink FROM ulhn_Resources ${where} ORDER BY lastUpdated DESC`;
      const rows = await cds.run({
        sql,
        args: params
      });
      res.json({ results: rows });
    } catch (e) {
      res.status(500).json({ error: 'failed', details: String(e) });
    }
  });

  // Training list
  app.get('/api/training', async (req, res) => {
    try {
      const rows = await cds.run(/* sql */`SELECT ID as id, title, role, module, url, dueDate, status, completedAt FROM ulhn_TrainingAssignments ORDER BY dueDate ASC`);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'failed', details: String(e) });
    }
  });

  // Mark Completed
  app.post('/api/training/:id/complete', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const now = new Date().toISOString();
      await cds.run({ sql: 'UPDATE ulhn_TrainingAssignments SET status = ?, completedAt = ? WHERE ID = ?', args: ['Completed', now, id] });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'failed', details: String(e) });
    }
  });
});

module.exports = cds.server;
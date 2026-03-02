const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  console.log('=== INVESTIGATE: Sort2 field + user data ===\n');

  // 1. Check ALL fields of a few users to find which field has manager data
  const userFields = await page.evaluate(() => {
    return new Promise((resolve) => {
      const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
      const oModel = comp.getModel();
      oModel.read('/UserSet', {
        urlParameters: { "$top": "5" },
        success: (data) => {
          // Return ALL fields for each user
          resolve(data.results.slice(0, 5).map(u => {
            const clean = {};
            for (var k in u) {
              if (k.startsWith('__') || typeof u[k] === 'function') continue;
              clean[k] = u[k];
            }
            return clean;
          }));
        },
        error: (err) => resolve({ err: err.message })
      });
    });
  });
  console.log('1. Full user records (first 5):');
  userFields.forEach((u, i) => console.log(`   User ${i+1}:`, JSON.stringify(u)));

  // 2. Check if NIKKUMAR is in the user list and what their Sort2 says
  const nikkumar = await page.evaluate(() => {
    return new Promise((resolve) => {
      const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
      const oModel = comp.getModel();
      oModel.read('/UserSet', {
        filters: [new sap.ui.model.Filter('UserId', sap.ui.model.FilterOperator.EQ, 'NIKKUMAR')],
        success: (data) => {
          if (data.results.length > 0) {
            const u = data.results[0];
            const clean = {};
            for (var k in u) {
              if (k.startsWith('__') || typeof u[k] === 'function') continue;
              clean[k] = u[k];
            }
            resolve(clean);
          } else {
            resolve({ notFound: 'NIKKUMAR not in UserSet' });
          }
        },
        error: () => resolve({ err: 'read failed' })
      });
    });
  });
  console.log('\n2. NIKKUMAR record:', JSON.stringify(nikkumar));

  // 3. Check how many users have Sort2 populated vs empty
  const sort2Stats = await page.evaluate(() => {
    return new Promise((resolve) => {
      const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
      const oModel = comp.getModel();
      oModel.read('/UserSet', {
        success: (data) => {
          const users = data.results || [];
          const total = users.length;
          const hasSort2 = users.filter(u => u.Sort2 && u.Sort2.trim() !== '');
          const sort2Values = {};
          hasSort2.forEach(u => {
            sort2Values[u.Sort2] = (sort2Values[u.Sort2] || 0) + 1;
          });
          
          // Find manager ID mentions
          const nikkumarTeam = users.filter(u => 
            (u.Sort2 || '').toUpperCase() === 'NIKKUMAR'
          );
          
          resolve({
            totalUsers: total,
            usersWithSort2: hasSort2.length,
            usersWithoutSort2: total - hasSort2.length,
            sort2ValueCounts: sort2Values,
            nikkumarTeam: nikkumarTeam.map(u => u.UserId + ' - ' + u.FirstName + ' ' + u.LastName)
          });
        },
        error: () => resolve({ err: 'failed' })
      });
    });
  });
  console.log('\n3. Sort2 statistics:', JSON.stringify(sort2Stats, null, 2));

  // 4. Check ABAP backend implementation for the UserSet
  const serviceUrl = await page.evaluate(() => {
    const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
    const oModel = comp.getModel();
    return {
      serviceUrl: oModel.sServiceUrl,
      metadataUrl: oModel.sServiceUrl + '/$metadata'
    };
  });
  console.log('\n4. OData service URL:', JSON.stringify(serviceUrl));

  await browser.close();
})();

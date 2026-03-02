const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  
  // Check TrainingAssignment entity type properties from $metadata
  const meta = await page.evaluate(() => {
    const comp = sap.ui.core.Component.registry.get('application-ZLEARNING-display-component');
    const oModel = comp.getModel();
    const m = oModel.getServiceMetadata();
    const schemas = m.dataServices.schema || [];
    const result = {};
    for (var s = 0; s < schemas.length; s++) {
      var types = schemas[s].entityType || [];
      for (var t = 0; t < types.length; t++) {
        if (types[t].name.indexOf('Assignment') >= 0 || types[t].name.indexOf('Training') >= 0) {
          result[types[t].name] = (types[t].property || []).map(p => p.name + ' (' + p.type + ')');
        }
      }
    }
    return result;
  });
  console.log('Entity types with properties:');
  for (const [name, props] of Object.entries(meta)) {
    console.log(`\n${name}:`);
    props.forEach(p => console.log(`  ${p}`));
  }
  await browser.close();
})();

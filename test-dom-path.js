const { chromium } = require('playwright');

(async () => {
  try {
    const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const pages = b.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('ZLEARNING'));
    if (!page) { console.log('No page'); await b.close(); return; }
    
    // Check DOM structure of a KPI card icon vs the team user overdue icon
    const structure = await page.evaluate(() => {
      var r = {};
      
      // KPI card icon - get the path from .analyticsCard to .sapUiIcon
      var kpiCard = document.querySelector('[id*="teamTotalBox"]');
      if (kpiCard) {
        var icon = kpiCard.querySelector('.sapUiIcon');
        if (icon) {
          var path = [];
          var el = icon;
          while (el !== kpiCard) {
            path.unshift({ tag: el.tagName, class: el.className.substring(0, 60), id: el.id });
            el = el.parentElement;
          }
          path.unshift({ tag: kpiCard.tagName, class: kpiCard.className.substring(0, 80), id: kpiCard.id });
          r.kpiIconPath = path;
        }
      }
      
      // Team user overdue icon path
      var overdueIcon = document.querySelector('[id*="teamUserList"] .sapMObjStatus .sapUiIcon');
      if (overdueIcon) {
        var teamCard = document.querySelector('[id*="teamMembersCard"]');
        var path2 = [];
        var el2 = overdueIcon;
        while (el2 && el2 !== teamCard) {
          path2.unshift({ tag: el2.tagName, class: el2.className.substring(0, 60), id: el2.id });
          el2 = el2.parentElement;
        }
        if (teamCard) path2.unshift({ tag: teamCard.tagName, class: teamCard.className.substring(0, 80), id: teamCard.id });
        r.overdueIconPath = path2;
      }
      
      // Check what classes the KPI cards have
      var kpiCards = ['teamTotalBox', 'teamAssignedBox', 'teamInProgressBox', 'teamOverdueBox', 'teamCompletedBox'];
      r.kpiClasses = {};
      kpiCards.forEach(function(id) {
        var card = document.querySelector('[id*="' + id + '"]');
        if (card) r.kpiClasses[id] = card.className.substring(0, 100);
      });
      
      // Chart cards classes
      var chartCards = ['teamMembersCard', 'teamStatusChartBox', 'moduleChartBox'];
      r.chartClasses = {};
      chartCards.forEach(function(id) {
        var card = document.querySelector('[id*="' + id + '"]');
        if (card) r.chartClasses[id] = card.className.substring(0, 100);
      });
      
      return r;
    });
    
    console.log('KPI icon DOM path:');
    (structure.kpiIconPath || []).forEach(function(n, i) { 
      console.log('  ' + '  '.repeat(i) + n.tag + ' class="' + n.class + '"'); 
    });
    
    console.log('\nOverdue icon DOM path:');
    (structure.overdueIconPath || []).forEach(function(n, i) { 
      console.log('  ' + '  '.repeat(i) + n.tag + ' class="' + n.class + '"'); 
    });
    
    console.log('\nKPI card classes:');
    Object.entries(structure.kpiClasses).forEach(function(e) { console.log('  ' + e[0] + ': ' + e[1]); });
    
    console.log('\nChart card classes:');
    Object.entries(structure.chartClasses).forEach(function(e) { console.log('  ' + e[0] + ': ' + e[1]); });
    
    await b.close();
  } catch(e) {
    console.log('ERROR:', e.message);
  }
})();

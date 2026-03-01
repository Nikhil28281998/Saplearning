const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const pages = b.contexts()[0].pages();
  let page = pages.find(p => p.url().includes('flp'));
  if (!page) { console.log('No page'); await b.close(); return; }
  
  console.log('URL:', page.url().substring(0,90));
  
  const r = await page.evaluate(() => {
    var kpiCard = document.querySelector('[id$="teamTotalBox"]');
    var result = { kpiFound: !!kpiCard };
    if (kpiCard) {
      result.kpiClass = kpiCard.className;
      var icon = kpiCard.querySelector('.sapUiIcon');
      if (icon) {
        var path = [];
        var el = icon;
        while (el !== kpiCard && el) {
          path.unshift(el.tagName + '.' + Array.from(el.classList).join('.'));
          el = el.parentElement;
        }
        result.iconPath = path;
      }
    }
    
    var chartCard = document.querySelector('[id$="teamMembersCard"]');
    result.chartFound = !!chartCard;
    if (chartCard) {
      result.chartClass = chartCard.className;
      // Check for overdue icon
      var overdueIcon = chartCard.querySelector('.sapMObjStatus .sapUiIcon');
      result.overdueFound = !!overdueIcon;
      if (overdueIcon) {
        var path2 = [];
        var el2 = overdueIcon;
        while (el2 !== chartCard && el2) {
          path2.unshift(el2.tagName + '.' + Array.from(el2.classList).join('.'));
          el2 = el2.parentElement;
        }
        result.overduePath = path2;
      }
    }
    
    return result;
  });
  
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})().catch(e => console.error('ERR:', e.message));

const { chromium } = require('playwright');

(async () => {
  try {
    const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const pages = b.contexts()[0].pages();
    let page = pages.find(p => p.url().includes('ZLEARNING'));
    if (!page) { console.log('No page'); await b.close(); return; }
    
    console.log('Connected');
    
    // Inspect Team Members / User Progress section
    const teamInfo = await page.evaluate(() => {
      var r = {};
      
      // Find the team user list
      var userList = document.querySelector('[id*="teamUserList"]');
      if (userList) {
        var items = userList.querySelectorAll('.sapMLIB');
        r.userItems = Array.from(items).map(function(item) {
          var texts = Array.from(item.querySelectorAll('.sapMText, .sapMTitle, .sapMLabel')).map(function(t) {
            return t.textContent.trim();
          });
          var icons = Array.from(item.querySelectorAll('.sapUiIcon')).map(function(i) {
            return {
              ariaLabel: i.getAttribute('aria-label') || '',
              fontSize: getComputedStyle(i).fontSize,
              width: i.getBoundingClientRect().width,
              height: i.getBoundingClientRect().height,
              color: getComputedStyle(i).color,
              parentClass: i.parentElement.className.substring(0, 80)
            };
          });
          var statuses = Array.from(item.querySelectorAll('.sapMObjStatus')).map(function(s) {
            return { text: s.textContent.trim(), state: s.getAttribute('data-sap-ui-qs') };
          });
          var progressBars = Array.from(item.querySelectorAll('.sapMPI')).map(function(p) {
            return { value: p.getAttribute('aria-valuenow'), width: p.getBoundingClientRect().width };
          });
          return { texts: texts, icons: icons, statuses: statuses, progressBars: progressBars };
        });
      }
      
      // Check the overdue status/icon specifically
      var overdueEls = document.querySelectorAll('[id*="teamUserList"] .sapMObjStatus');
      r.statusElements = Array.from(overdueEls).map(function(s) {
        return {
          text: s.textContent.trim(),
          fontSize: getComputedStyle(s).fontSize,
          color: getComputedStyle(s).color,
          width: s.getBoundingClientRect().width,
          height: s.getBoundingClientRect().height,
          id: s.id
        };
      });
      
      // Check all icons in team members section for oversized ones
      var teamMembersCard = document.querySelector('[id*="teamMembersCard"]');
      if (teamMembersCard) {
        var allIcons = teamMembersCard.querySelectorAll('.sapUiIcon');
        r.teamIcons = Array.from(allIcons).map(function(i) {
          return {
            ariaLabel: i.getAttribute('aria-label') || '',
            fontSize: getComputedStyle(i).fontSize,
            lineHeight: getComputedStyle(i).lineHeight,
            width: i.getBoundingClientRect().width,
            height: i.getBoundingClientRect().height,
            id: i.id,
            parentId: i.closest('[id]') ? i.closest('[id]').id : '',
            parentClass: i.parentElement.className.substring(0, 100)
          };
        });
      }
      
      // Check My Assignments badge
      var badge = document.querySelector('[id*="myAssignmentsBtn"] .sapMBadgeIndicator, [id*="myAssignmentsBtn-badge"], .sapMBadge');
      r.badge = badge ? {
        text: badge.textContent.trim(),
        visible: badge.offsetParent !== null,
        id: badge.id,
        class: badge.className.substring(0, 80)
      } : 'not found';
      
      // Also check the custom badge
      var customBadge = document.querySelector('[id*="myAssignmentsBtn-customBadge"], [id*="pendingBadge"]');
      r.customBadge = customBadge ? {
        text: customBadge.textContent.trim(),
        visible: customBadge.offsetParent !== null,
        id: customBadge.id
      } : 'not found';
      
      return r;
    });
    
    console.log('\n=== TEAM USER LIST ===');
    (teamInfo.userItems || []).forEach(function(u, i) {
      console.log('User ' + (i+1) + ':', u.texts.join(', '));
      u.icons.forEach(function(ic) { 
        console.log('  Icon: ' + ic.ariaLabel + ' size=' + ic.fontSize + ' w=' + ic.width.toFixed(0) + 'px h=' + ic.height.toFixed(0) + 'px color=' + ic.color);
      });
      u.statuses.forEach(function(s) { console.log('  Status: ' + s.text); });
      u.progressBars.forEach(function(p) { console.log('  Progress: ' + p.value + '%'); });
    });
    
    console.log('\n=== STATUS ELEMENTS IN TEAM LIST ===');
    (teamInfo.statusElements || []).forEach(function(s) {
      console.log('  [' + s.id + '] "' + s.text + '" fontSize=' + s.fontSize + ' w=' + s.width.toFixed(0) + 'px h=' + s.height.toFixed(0) + 'px');
    });
    
    console.log('\n=== ALL ICONS IN TEAM MEMBERS CARD ===');
    (teamInfo.teamIcons || []).forEach(function(i) {
      console.log('  [' + i.id + '] ' + i.ariaLabel + ' size=' + i.fontSize + ' w=' + i.width.toFixed(0) + 'px h=' + i.height.toFixed(0) + 'px parent=' + i.parentId);
    });
    
    console.log('\n=== MY ASSIGNMENTS BADGE ===');
    console.log('Badge:', JSON.stringify(teamInfo.badge));
    console.log('Custom badge:', JSON.stringify(teamInfo.customBadge));
    
    await b.close();
  } catch(e) {
    console.log('ERROR:', e.message);
  }
})();

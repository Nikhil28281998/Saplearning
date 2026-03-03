/**
 * SAP Courses App — Leadership PDF v2
 *
 * Compact: no blank pages, no repeated screenshots.
 * Includes frontend action walkthrough (Assign → Start → Complete).
 * Uses screenshots from screenshots_v2/ captured by record_demo_v2.js.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const SS_DIR = path.join(__dirname, 'presentation', 'screenshots_v2');
const OUTPUT = path.join(__dirname, 'presentation', 'SAP_Courses_App_Overview_v2.pdf');

// Colors
const BLUE = '#0D47A1';
const ACCENT = '#1565C0';
const DARK = '#333333';
const MED = '#666666';
const LIGHT = '#F5F5F5';
const WHITE = '#FFFFFF';
const GREEN = '#2E7D32';

const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
        Title: 'SAP Courses App — Overview & Feature Guide',
        Author: 'Nikhil Kumar — SAP Development Team, BridgeBio',
        Subject: 'Centralized Training Management Application',
        Creator: 'BridgeBio SAP Team'
    }
});
const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);

const PW = 595.28;
const CW = PW - 100;

function img(name, caption, maxH) {
    const p = path.join(SS_DIR, name);
    if (!fs.existsSync(p)) {
        // Fallback to original screenshots dir
        const fallback = path.join(__dirname, 'presentation', 'screenshots', name);
        if (!fs.existsSync(fallback)) {
            doc.fontSize(9).fillColor('#CC0000').text('[Screenshot: ' + name + ']', { align: 'center' });
            doc.moveDown(0.3);
            return;
        }
        return img_path(fallback, caption, maxH);
    }
    return img_path(p, caption, maxH);
}

function img_path(filePath, caption, maxH) {
    const h = maxH || 280;
    // Start new page if not enough room
    if (doc.y > 842 - 50 - h - 30) doc.addPage();
    const x = (PW - CW) / 2;
    // Border
    doc.save().rect(x - 1, doc.y - 1, CW + 2, h + 2).fill('#E0E0E0').restore();
    doc.image(filePath, x, doc.y, { fit: [CW, h], align: 'center', valign: 'center' });
    doc.y += h + 6;
    if (caption) {
        doc.fontSize(8.5).fillColor(MED).text(caption, 50, doc.y, { align: 'center', width: CW, oblique: true });
        doc.moveDown(0.6);
    }
}

function heading(text) {
    if (doc.y > 650) doc.addPage();
    doc.moveDown(0.3);
    doc.save().moveTo(50, doc.y).lineTo(50 + CW, doc.y).lineWidth(2).strokeColor(BLUE).stroke().restore();
    doc.moveDown(0.4);
    doc.fontSize(15).fillColor(BLUE).text(text);
    doc.moveDown(0.4);
}

function subheading(text) {
    if (doc.y > 680) doc.addPage();
    doc.fontSize(11.5).fillColor(ACCENT).text(text);
    doc.moveDown(0.2);
}

function body(text) {
    doc.fontSize(9.5).fillColor(DARK).text(text, { lineGap: 2.5 });
    doc.moveDown(0.3);
}

function bullet(text) {
    doc.fontSize(9.5).fillColor(DARK).text('  •  ' + text, { indent: 10, lineGap: 2 });
}

function actionStep(step, desc) {
    if (doc.y > 700) doc.addPage();
    const y0 = doc.y;
    doc.save().roundedRect(50, y0, CW, 32, 3).fill('#E8F5E9').restore();
    doc.fontSize(9.5).fillColor(GREEN).text('Step ' + step + ':', 58, y0 + 6, { continued: true, width: CW - 16 });
    doc.fillColor(DARK).text('  ' + desc, { width: CW - 70 });
    doc.y = y0 + 36;
}

function featureBox(title, desc) {
    if (doc.y > 690) doc.addPage();
    const y0 = doc.y;
    doc.save().roundedRect(50, y0, CW, 38, 3).fill(LIGHT).restore();
    doc.fontSize(9.5).fillColor(BLUE).text('✓  ' + title, 58, y0 + 6, { width: CW - 16 });
    doc.fontSize(8.5).fillColor(MED).text(desc, 74, y0 + 20, { width: CW - 40 });
    doc.y = y0 + 42;
}

// ======================== PAGE 1: COVER ========================
console.log('Generating PDF v2...');

doc.rect(0, 0, PW, 842).fill(BLUE);
doc.fontSize(34).fillColor(WHITE).text('SAP Courses App', 0, 200, { align: 'center', width: PW });
doc.moveDown(0.4);
doc.fontSize(15).fillColor('#90CAF9').text('Centralized Training Management for BridgeBio', 0, doc.y, { align: 'center', width: PW });
doc.moveDown(1);
doc.fontSize(12).fillColor(WHITE).text('Feature Overview & User Guide', 0, doc.y, { align: 'center', width: PW });
doc.moveDown(0.2);
doc.fontSize(11).fillColor('#BBDEFB').text('Manager & End User Perspectives', 0, doc.y, { align: 'center', width: PW });

doc.moveDown(4);
doc.fontSize(10).fillColor('#E3F2FD').text('Prepared by', 0, doc.y, { align: 'center', width: PW });
doc.moveDown(0.2);
doc.fontSize(13).fillColor(WHITE).text('Nikhil Kumar', 0, doc.y, { align: 'center', width: PW });
doc.fontSize(9.5).fillColor('#90CAF9').text('SAP Development Team — BridgeBio', 0, doc.y + 18, { align: 'center', width: PW });

doc.fontSize(8.5).fillColor('#64B5F6').text('Deployed on SAP Fiori  |  SAP S/4HANA  |  SAP Fiori Launchpad', 0, 770, { align: 'center', width: PW });

// ======================== PAGE 2: EXECUTIVE SUMMARY ========================
doc.addPage();

heading('1.  Executive Summary');

body(
    'The SAP Courses App is a purpose-built SAP Fiori application that centralizes training management ' +
    'across BridgeBio. It replaces fragmented spreadsheets and email-based tracking with a unified, ' +
    'role-aware platform accessible directly from the SAP Fiori Launchpad.'
);
body(
    'Designed for both Managers and End Users, the app delivers real-time visibility into team training ' +
    'progress, intelligent filtering, and streamlined assignment workflows — all within the familiar ' +
    'SAP S/4HANA environment.'
);

doc.moveDown(0.3);
subheading('Key Benefits');
[
    'Single source of truth for all training data across the organization',
    'Role-based views: Managers see team analytics; End Users see personal assignments',
    'Smart dependent filtering by Role, Topic, and SAP Module',
    'Full lifecycle management: Assign → Start → Complete',
    'One-click Excel export for leadership reporting',
    'Email notifications for assignment reminders',
    'Card & Table view toggle for flexible data consumption',
    'Responsive design: desktops, laptops, and tablets'
].forEach(bullet);

doc.moveDown(0.5);
img('00_flp_home.png', 'Figure 1 — SAP Fiori Launchpad with SAP Courses tile');

// ======================== PAGE 3: APP LAUNCH ========================
doc.addPage();

heading('2.  Launching the App');

body(
    'The SAP Courses App is deployed as a standard SAP Fiori tile on the Launchpad. ' +
    'Users click the tile to launch directly — no separate login or external tools required.'
);

actionStep(1, 'Open SAP Fiori Launchpad in your browser.');
actionStep(2, 'Locate the "SAP Courses" tile on the home screen.');
actionStep(3, 'Click the tile to launch the training management application.');

doc.moveDown(0.5);
img('01_click_tile.png', 'Figure 2 — Click the SAP Courses tile to launch the app');

// ======================== PAGE 4-5: MANAGER — HOMEPAGE ========================
doc.addPage();

heading('3.  Manager Perspective — Homepage');

body(
    'Managers gain complete oversight of their team\'s training landscape. The homepage displays ' +
    'all training courses alongside Team Analytics KPIs showing Total, Pending, In Progress, ' +
    'Overdue, and Completed counts at a glance.'
);

img('02_home_overview.png', 'Figure 3 — Homepage with Team Analytics KPIs');

subheading('3.1  Team Analytics & Dashboard');
body(
    'The Team Analytics section displays five KPI tiles that update in real-time. ' +
    'Clicking "Analytics Dashboard" opens a detailed popup with Module Distribution ' +
    'charts and per-team-member progress bars.'
);

actionStep(1, 'View Team Analytics KPI cards at the top of the page.');
actionStep(2, 'Click "Analytics Dashboard" button to open detailed view.');
actionStep(3, 'Review Module Distribution and Team Member progress.');
actionStep(4, 'Click "Close" to return to the homepage.');

doc.moveDown(0.3);
img('03_team_analytics.png', 'Figure 4 — Team Analytics KPI tiles');

img('05_analytics_dashboard_view.png', 'Figure 5 — Analytics Dashboard: Module Distribution & Team Progress');

// ======================== FILTERS + VIEWS ========================
subheading('3.2  Smart Filtering');
body(
    'Three interconnected dropdown filters — Role, Topic, and SAP Module — enable managers to quickly ' +
    'narrow down the training catalog. Selecting a Role automatically filters available Topics and ' +
    'Modules to show only relevant values.'
);

img('07_smart_filters.png', 'Figure 6 — Smart Filters: Role, Topic, and Module dropdowns');

subheading('3.3  Card View & Table View');
body(
    'Toggle between Card View (visual grid for browsing) and Table View (structured data grid with ' +
    'sorting, column configuration, full-screen mode, and direct export). The table provides a built-in ' +
    'scrollbar for large datasets.'
);

img('10_card_view.png', 'Figure 7 — Card View: Visual grid layout');

img('11_table_view.png', 'Figure 8 — Table View: Full-width data grid with built-in scroll');

subheading('3.4  Export Report');
body(
    'The Export Report button generates a downloadable Excel spreadsheet of training data. ' +
    'One click to share status with leadership or feed into other reporting tools.'
);

img('09_export_report.png', 'Figure 9 — Export Report button highlighted');

// ======================== PAGE 6-7: ASSIGNMENT WORKFLOW ========================
heading('4.  Assignment Workflow — Manager Actions');

body(
    'The My Assignments page is where managers perform core workflow actions: assign training to team ' +
    'members, track status, send reminders, and manage completions.'
);

actionStep(1, 'Click "My Assignments" button in the header.');
actionStep(2, 'Review the assignment list with Status, Due Date, and Progress.');
actionStep(3, 'Click "Assign Training" to assign a course to a team member (e.g., niktanwar).');
actionStep(4, 'Select a course, set due date, and confirm the assignment.');

doc.moveDown(0.3);
img('12_click_my_assignments.png', 'Figure 10 — Click "My Assignments" to navigate');

img('13_assignments_overview.png', 'Figure 11 — Assignments page with KPIs and training list');

img('14_assign_training.png', 'Figure 12 — Manager assigns training to team member');

// ======================== PAGE 8-9: END USER WORKFLOW ========================
heading('5.  End User Workflow — Training Lifecycle');

body(
    'End users manage their personal training assignments through a clear workflow: ' +
    'Assigned → In Progress → Completed. Each status change is tracked with timestamps.'
);

doc.moveDown(0.3);
subheading('5.1  Start Training');
body(
    'Select an "Assigned" course and click "Start Training". The status changes to "In Progress" ' +
    'and the start timestamp is recorded.'
);

actionStep(1, 'Select a course with "Assigned" status in the table.');
actionStep(2, 'Click "Start Training" button in the toolbar.');
actionStep(3, 'Confirm the action — status updates to "In Progress".');

doc.moveDown(0.3);
img('17_click_start_training.png', 'Figure 13 — Click "Start Training" to begin');

img('18_show_in_progress.png', 'Figure 14 — Status updated to "In Progress"');

subheading('5.2  Mark Completed');
body(
    'When the training is finished, select the course and click "Mark Completed". ' +
    'Status changes to "Completed" with the completion date recorded automatically.'
);

actionStep(4, 'Select the "In Progress" course.');
actionStep(5, 'Click "Mark Completed" button.');
actionStep(6, 'Status changes to "Completed" — lifecycle complete.');

doc.moveDown(0.3);
img('19_click_mark_completed.png', 'Figure 15 — Click "Mark Completed"');

img('20_show_completed.png', 'Figure 16 — Course status: Completed');

subheading('5.3  Verify Completion');
body(
    'Use the Status filter to view "Completed" courses. This confirms the full ' +
    'end-to-end lifecycle: Assigned → In Progress → Completed.'
);

img('21_filter_completed.png', 'Figure 17 — Filter to "Completed" showing the course lifecycle');

// ======================== KEY FEATURES SUMMARY ========================
heading('6.  Key Features Summary');
doc.moveDown(0.2);

[
    ['Smart Dependent Filtering', 'Role → Topic → Module filters auto-narrow based on selections'],
    ['Card & Table Views', 'Toggle between visual card grid and data-rich table with scrollbar'],
    ['Team Analytics KPIs', 'Real-time counts: Total, Pending, In Progress, Overdue, Completed'],
    ['Analytics Dashboard', 'Module Distribution chart and per-user completion progress bars'],
    ['Training Assignment', 'Assign courses to team members with due dates and tracking'],
    ['Start Training', 'End users begin training; status changes to In Progress'],
    ['Mark Completed', 'Record completion with timestamp — managers or users'],
    ['De-assign Training', 'Remove assignments that are no longer needed'],
    ['Send Email Reminder', 'One-click email notifications for overdue trainings'],
    ['Export Report', 'Download training data as Excel for offline reporting'],
    ['Full-Screen Mode', 'Expand table to full screen for focused data review'],
    ['Responsive Design', 'Optimized for 13" laptops through 32" monitors'],
    ['SAP Fiori Launchpad', 'Standard Fiori tile with role-based access']
].forEach(([t, d]) => featureBox(t, d));

// ======================== TECHNICAL ARCHITECTURE ========================
heading('7.  Technical Architecture');
doc.moveDown(0.2);

body('The SAP Courses App is built on the SAP technology stack:');
doc.moveDown(0.2);

[
    ['Frontend', 'SAPUI5 / SAP Fiori with custom extensions (SmartTable, SmartFilterBar)'],
    ['Backend', 'SAP S/4HANA OData V2 Service (SEGW)'],
    ['OData Service', 'ZCOURSES_SRV — Trainings, TrainingAssignment, RoleVH, ModuleVH, TopicsVH, UserSet'],
    ['Deployment', 'SAP Fiori Launchpad tile (Semantic Object: ZLEARNING)'],
    ['Authentication', 'SAP Logon with role-based authorization (Admin / Manager / User)'],
    ['Server', 'SAP S/4HANA on-premise'],
    ['Design', 'SAP Fiori Horizon design guidelines with responsive breakpoints']
].forEach(([label, value]) => {
    doc.fontSize(9.5).fillColor(BLUE).text(label + ': ', { continued: true }).fillColor(DARK).text(value);
    doc.moveDown(0.25);
});

doc.moveDown(1);
// Closing box
const boxY = doc.y;
doc.save().roundedRect(50, boxY, CW, 50, 5).fill('#E3F2FD').restore();
doc.fontSize(11).fillColor(BLUE).text('Deployed on SAP Fiori', 60, boxY + 10, { width: CW - 20, align: 'center' });
doc.fontSize(9).fillColor(DARK).text(
    'The SAP Courses App is fully functional and deployed on the BridgeBio SAP S/4HANA system, ' +
    'accessible via the SAP Fiori Launchpad for authorized users.',
    60, boxY + 26, { width: CW - 20, align: 'center' }
);

// ======================== PAGE NUMBERS ========================
const pageCount = doc.bufferedPageRange().count;
for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    if (i === 0) continue; // Skip cover
    doc.fontSize(7.5).fillColor('#999999')
        .text('Page ' + (i + 1) + ' of ' + pageCount, 0, 815, { align: 'center', width: PW })
        .text('SAP Courses App — BridgeBio', 50, 815);
}

doc.end();
stream.on('finish', () => {
    const sz = fs.statSync(OUTPUT);
    console.log('\n=== PDF Generated ===');
    console.log('File: ' + OUTPUT);
    console.log('Size: ' + (sz.size / 1024).toFixed(0) + ' KB');
    console.log('Pages: ' + pageCount);
});

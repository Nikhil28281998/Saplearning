/**
 * SAP Courses App — Demo Video Recorder v4
 *
 * Changes from v3:
 *   ✓ Manager Assign Training shown BEFORE Assignments Overview
 *   ✓ readMs reduced from 2s → 1s (snappier pacing)
 *   ✓ Scene order: Navigate → Assign → Overview → Start → Progress → Complete
 *
 * Prerequisites:
 *   1. Chrome launched with --remote-debugging-port=9222
 *   2. Logged in to SAP — Fiori Launchpad fully loaded
 *   3. Run: node record_demo_v4.js
 */

const DEMO_LIBS = 'C:\\Users\\NikhilKumar-EXT\\demo-libs\\node_modules';
const { chromium } = require(DEMO_LIBS + '\\playwright');
const ffmpeg    = require(DEMO_LIBS + '\\fluent-ffmpeg');
const ffmpegPath = require(DEMO_LIBS + '\\@ffmpeg-installer\\ffmpeg').path;
const fs   = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

const OUT_DIR    = path.join(__dirname, 'presentation');
const FRAMES_DIR = path.join(OUT_DIR, 'frames_v4');
const SS_DIR     = path.join(OUT_DIR, 'screenshots_v4');
const VIDEO_FILE = path.join(OUT_DIR, 'SAP_Courses_Demo_v4.mp4');
const FPS = 10;
let frameIndex = 0;

[OUT_DIR, FRAMES_DIR, SS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

/* ══════════════════════════════════════════════════════════════
 *  SUBTITLE OVERLAY
 * ══════════════════════════════════════════════════════════════ */
async function showSubtitle(page, text) {
    await page.evaluate((t) => {
        let el = document.getElementById('__v3_sub');
        if (!el) {
            el = document.createElement('div');
            el.id = '__v3_sub';
            el.style.cssText =
                'position:fixed;bottom:36px;left:50%;transform:translateX(-50%);z-index:999999;' +
                'background:rgba(0,0,0,0.82);color:#fff;padding:13px 30px;border-radius:10px;' +
                'font-family:"Segoe UI",Arial,sans-serif;font-size:18px;font-weight:500;' +
                'text-align:center;max-width:85%;line-height:1.5;pointer-events:none;' +
                'box-shadow:0 4px 16px rgba(0,0,0,0.35);';
            document.body.appendChild(el);
        }
        if (t) { el.textContent = t; el.style.display = 'block'; }
        else   { el.style.display = 'none'; }
    }, text);
}

/* ══════════════════════════════════════════════════════════════
 *  CLICK HIGHLIGHT  (red ring + arrow, blocks for durationMs)
 * ══════════════════════════════════════════════════════════════ */
async function highlight(page, findFn, durationMs = 1800) {
    await page.evaluate(({ fnSrc, dur }) => {
        return new Promise(resolve => {
            // Inject keyframe CSS once
            if (!document.getElementById('__v3_css')) {
                const s = document.createElement('style');
                s.id = '__v3_css';
                s.textContent =
                    '@keyframes v3pulse{0%{transform:scale(1);opacity:1}50%{transform:scale(1.28);opacity:0.55}100%{transform:scale(1);opacity:1}}' +
                    '@keyframes v3bounce{0%{transform:translateY(0)}50%{transform:translateY(-9px)}100%{transform:translateY(0)}}';
                document.head.appendChild(s);
            }

            // findFn is passed as source string and eval'd
            const el = (new Function('return (' + fnSrc + ')')())();
            if (!el) { resolve(false); return; }

            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width  / 2;
            const cy = rect.top  + rect.height / 2;
            const w  = Math.max(rect.width  + 10, 52);
            const h  = Math.max(rect.height + 10, 52);

            const ring = document.createElement('div');
            ring.style.cssText =
                `position:fixed;z-index:999998;border:3px solid #FF1744;border-radius:8px;` +
                `width:${w}px;height:${h}px;left:${cx - w/2}px;top:${cy - h/2}px;` +
                `pointer-events:none;animation:v3pulse 0.65s ease-in-out 3;` +
                `box-shadow:0 0 14px rgba(255,23,68,0.45);`;

            const arrow = document.createElement('div');
            arrow.textContent = '▼';
            arrow.style.cssText =
                `position:fixed;z-index:999998;color:#FF1744;font-size:28px;font-weight:bold;` +
                `left:${cx - 14}px;top:${cy - h/2 - 34}px;pointer-events:none;` +
                `text-shadow:0 2px 5px rgba(0,0,0,0.4);animation:v3bounce 0.55s ease-in-out 3;`;

            document.body.appendChild(ring);
            document.body.appendChild(arrow);

            setTimeout(() => {
                ring.remove();
                arrow.remove();
                resolve(true);
            }, dur);
        });
    }, { fnSrc: findFn.toString(), dur: durationMs });
}

async function clearOverlays(page) {
    await page.evaluate(() => {
        ['__v3_sub', '__v3_css'].forEach(id => document.getElementById(id)?.remove());
    });
}

/* ══════════════════════════════════════════════════════════════
 *  FRAME CAPTURE
 * ══════════════════════════════════════════════════════════════ */
async function captureFrames(page, durationMs) {
    const count = Math.max(1, Math.round((durationMs / 1000) * FPS));
    for (let i = 0; i < count; i++) {
        await page.screenshot({
            path: path.join(FRAMES_DIR, `frame_${String(frameIndex).padStart(5,'0')}.png`)
        });
        frameIndex++;
        // Small delay so the page can update between frames
        await page.waitForTimeout(80);
    }
}

async function takeScreenshot(page, name) {
    // Remove subtitle for clean screenshot
    await page.evaluate(() => { const e = document.getElementById('__v3_sub'); if(e) e.style.display='none'; });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SS_DIR, `${name}.png`) });
    console.log(`  📸 ${name}.png`);
    await page.evaluate(() => { const e = document.getElementById('__v3_sub'); if(e) e.style.display='block'; });
}

/* ══════════════════════════════════════════════════════════════
 *  VIDEO BUILD
 * ══════════════════════════════════════════════════════════════ */
function buildVideo() {
    return new Promise((resolve, reject) => {
        console.log(`\nBuilding video — ${frameIndex} frames @ ${FPS}fps...`);
        ffmpeg()
            .input(path.join(FRAMES_DIR, 'frame_%05d.png'))
            .inputFPS(FPS)
            .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-preset medium', '-crf 22', '-movflags +faststart'])
            .output(VIDEO_FILE)
            .on('end',   ()    => { console.log('Video saved:', VIDEO_FILE); resolve(); })
            .on('error', (err) => { console.error('Video error:', err.message); reject(err); })
            .run();
    });
}

/* ══════════════════════════════════════════════════════════════
 *  SCENE RUNNER
 *
 *  Per scene flow:
 *    1. Show subtitle            ← viewer reads what's about to happen
 *    2. Capture readMs frames    ← subtitle visible, current state shown
 *    3. Execute action           ← highlight → click → wait for result
 *    4. Re-show subtitle         ← action may have cleared it
 *    5. Capture holdMs frames    ← result visible with subtitle
 *    6. Clean screenshot
 * ══════════════════════════════════════════════════════════════ */
async function runScene(page, scene, index, total) {
    const {
        id,
        subtitle,
        readMs  = 2000,   // how long to show subtitle before action
        holdMs  = 4000,   // how long to show result after action
        action  = null,
        shot    = true
    } = scene;

    console.log(`\n[${index}/${total}] ${id}`);
    if (subtitle) console.log(`  "${subtitle}"`);

    // 1 + 2: show subtitle, let viewer read it
    await showSubtitle(page, subtitle || '');
    await captureFrames(page, readMs);

    // 3: execute action
    if (action) {
        try {
            await action(page);
        } catch (e) {
            console.log(`  ⚠ Action error: ${e.message} — continuing`);
        }
    }

    // 4 + 5: restore subtitle, capture result
    await showSubtitle(page, subtitle || '');
    await captureFrames(page, holdMs);

    // 6: clean screenshot
    if (shot) await takeScreenshot(page, id);
}

/* ══════════════════════════════════════════════════════════════
 *  SAPUI5 HELPERS  (used inside page.evaluate — no closure vars)
 * ══════════════════════════════════════════════════════════════ */
function sapCtrl(idFragment) {
    // Returns first SAPUI5 element whose id contains idFragment
    const ids = Object.keys(sap.ui.getCore().mElements || {})
        .filter(id => id.includes(idFragment));
    return ids.length ? sap.ui.getCore().mElements[ids[0]] : null;
}

function fireBtn(idFragment) {
    const ctrl = sapCtrl(idFragment);
    if (ctrl) ctrl.firePress();
}

function setViewMode(modelName, showCards) {
    const views = Object.keys(sap.ui.getCore().mElements || {})
        .filter(id => id.includes('__xmlview') && !id.includes('--'));
    for (const id of views) {
        const v = sap.ui.getCore().mElements[id];
        if (v && v.getModel && v.getModel(modelName)) {
            const vm = v.getModel(modelName);
            vm.setProperty('/showCards', showCards);
            vm.setProperty('/showTable', !showCards);
            vm.setProperty('/mode', showCards ? 'cards' : 'table');
        }
    }
}

function selectRowByStatus(smartTableIdFrag, status) {
    const st = sapCtrl(smartTableIdFrag);
    if (!st) return;
    const tbl = st.getTable ? st.getTable() : null;
    if (!tbl || !tbl.getBinding) return;
    const binding = tbl.getBinding('rows');
    if (!binding) return;
    const contexts = binding.getContexts(0, binding.getLength());
    for (let i = 0; i < contexts.length; i++) {
        if (contexts[i].getObject().Status === status) {
            tbl.setSelectedIndex(i);
            return;
        }
    }
}

function confirmDialog() {
    for (const btn of document.querySelectorAll('.sapMDialog .sapMBtn')) {
        if (/OK|Yes|Confirm/i.test(btn.textContent || '')) { btn.click(); return; }
    }
}

/* ══════════════════════════════════════════════════════════════
 *  SCENES  — 16 scenes, no duplicates, properly sequenced
 * ══════════════════════════════════════════════════════════════ */
const SCENES = [

    /* ─── 01: SAP Fiori Launchpad ─────────────────────────────── */
    {
        id:       '01_flp_home',
        subtitle: 'SAP Fiori Launchpad — the central entry point for all SAP applications.',
        readMs:   1000,
        holdMs:   1500,
        action:   null
    },

    /* ─── 02: Launch SAP Courses app ──────────────────────────── */
    {
        id:       '02_launch_app',
        subtitle: 'Clicking the SAP Courses tile to launch the training management application.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            // Highlight the SAP Courses tile
            await highlight(page, () => {
                const tiles = document.querySelectorAll('.sapUshellTile, .sapMGT, [id*="tile"]');
                for (const t of tiles) {
                    if (t.textContent && (t.textContent.includes('SAP Courses') || t.textContent.includes('ZLEARNING'))) {
                        return t;
                    }
                }
                return null;
            }, 2000);

            // Click tile or navigate via hash
            await page.evaluate(() => {
                const tiles = document.querySelectorAll('.sapUshellTile, .sapMGT, [id*="tile"]');
                for (const t of tiles) {
                    if (t.textContent && (t.textContent.includes('SAP Courses') || t.textContent.includes('ZLEARNING'))) {
                        t.click(); return;
                    }
                }
                window.location.hash = '#ZLEARNING-display';
            });
            await page.waitForTimeout(2000); // wait for app to load
        }
    },

    /* ─── 03: Homepage — Team Analytics KPIs ──────────────────── */
    {
        id:       '03_team_analytics_kpis',
        subtitle: 'Team Analytics KPIs — Total, Pending, In Progress, Overdue, and Completed assignments at a glance.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(500);
            // Scroll to and highlight the analytics panel
            await page.evaluate(() => {
                const panel = document.querySelector('[id$="teamAnalyticsPanel"]');
                if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            await page.waitForTimeout(800);
            await highlight(page, () => document.querySelector('[id$="teamAnalyticsPanel"]'), 2000);
        }
    },

    /* ─── 04: Open Analytics Dashboard ────────────────────────── */
    {
        id:       '04_analytics_dashboard_open',
        subtitle: 'Opening Analytics Dashboard — detailed Module Distribution and team member progress.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => {
                const btn = document.querySelector('[id$="analyticsDashboardBtn"]');
                if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            await page.waitForTimeout(400);
            await highlight(page, () => document.querySelector('[id$="analyticsDashboardBtn"]'), 2000);
            // Fire press via SAPUI5
            await page.evaluate(() => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('analyticsDashboardBtn'));
                if (ids.length) sap.ui.getCore().mElements[ids[0]].firePress();
            });
            await page.waitForTimeout(2000); // wait for dialog to open and render
        }
    },

    /* ─── 05: Close Analytics Dashboard ───────────────────────── */
    {
        id:       '05_analytics_dashboard_close',
        subtitle: 'Closing the Analytics Dashboard to return to the course listing.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await highlight(page, () => {
                for (const btn of document.querySelectorAll('.sapMDialog .sapMBtn')) {
                    if (/Close/i.test(btn.textContent || '')) return btn;
                }
                return null;
            }, 1800);
            await page.evaluate(() => {
                for (const btn of document.querySelectorAll('.sapMDialog .sapMBtn')) {
                    if (/Close/i.test(btn.textContent || '')) { btn.click(); return; }
                }
            });
            await page.waitForTimeout(1500);
        }
    },

    /* ─── 06: Smart Filters (Role → Topic → Module) ────────────── */
    {
        id:       '06_smart_filters',
        subtitle: 'Smart Filters: selecting a Role automatically narrows Topics and Modules.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => {
                const fb = document.querySelector('[id$="smartFilterBar"]');
                if (fb) fb.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            await page.waitForTimeout(600);
            await highlight(page, () => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('filterRole') && !id.includes('Label'));
                if (ids.length) return sap.ui.getCore().mElements[ids[0]].getDomRef();
                return null;
            }, 2000);
            // Open Role dropdown to show options, then close
            await page.evaluate(() => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('filterRole') && !id.includes('Label'));
                if (ids.length && sap.ui.getCore().mElements[ids[0]].open)
                    sap.ui.getCore().mElements[ids[0]].open();
            });
            await page.waitForTimeout(1500);
            await page.evaluate(() => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('filterRole') && !id.includes('Label'));
                if (ids.length) {
                    const ctrl = sap.ui.getCore().mElements[ids[0]];
                    if (ctrl.isOpen && ctrl.isOpen()) ctrl.close();
                }
            });
            await page.waitForTimeout(500);
        }
    },

    /* ─── 07: Export Report ────────────────────────────────────── */
    {
        id:       '07_export_report',
        subtitle: 'Export Report: one-click Excel download of all training data for leadership.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => {
                const btn = document.querySelector('[id$="exportTeamReportBtn"]');
                if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            await page.waitForTimeout(400);
            await highlight(page, () => document.querySelector('[id$="exportTeamReportBtn"]'), 2000);
            // Highlight only — do not click to avoid file download
        }
    },

    /* ─── 08: Card View ────────────────────────────────────────── */
    {
        id:       '08_card_view',
        subtitle: 'Card View: visual grid layout for browsing courses with key details at a glance.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => {
                const views = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('__xmlview') && !id.includes('--'));
                for (const id of views) {
                    const v = sap.ui.getCore().mElements[id];
                    if (v && v.getModel && v.getModel('viewMode')) {
                        const vm = v.getModel('viewMode');
                        vm.setProperty('/showCards', true);
                        vm.setProperty('/showTable', false);
                        vm.setProperty('/mode', 'cards');
                    }
                }
            });
            await page.waitForTimeout(1000);
            await page.evaluate(() => {
                const grid = document.querySelector('[id$="cardGrid"]');
                if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            await page.waitForTimeout(600);
        }
    },

    /* ─── 09: Table View ───────────────────────────────────────── */
    {
        id:       '09_table_view',
        subtitle: 'Table View: full data grid with sorting, column config, and built-in scrollbar.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('viewModeToggle') && !id.includes('assign'));
                if (ids.length) {
                    const dom = sap.ui.getCore().mElements[ids[0]].getDomRef();
                    if (dom) dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            await page.waitForTimeout(400);
            await highlight(page, () => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('viewModeToggle') && !id.includes('assign'));
                return ids.length ? sap.ui.getCore().mElements[ids[0]].getDomRef() : null;
            }, 1800);
            await page.evaluate(() => {
                const views = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('__xmlview') && !id.includes('--'));
                for (const id of views) {
                    const v = sap.ui.getCore().mElements[id];
                    if (v && v.getModel && v.getModel('viewMode')) {
                        const vm = v.getModel('viewMode');
                        vm.setProperty('/showCards', false);
                        vm.setProperty('/showTable', true);
                        vm.setProperty('/mode', 'table');
                    }
                }
            });
            await page.waitForTimeout(1500);
        }
    },

    /* ─── 10: Assign Training to User ──────────────────────────── */
    {
        id:       '10_assign_training',
        subtitle: 'Manager assigns a training course to team member — selecting course, user, and due date.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => {
                const btns = document.querySelectorAll('.sapMBtn');
                for (const btn of btns) {
                    if (btn.textContent?.includes('Assign') && !btn.textContent?.includes('De-assign')) {
                        btn.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
                    }
                }
            });
            await page.waitForTimeout(500);
            await highlight(page, () => {
                for (const btn of document.querySelectorAll('.sapMBtn')) {
                    if (btn.textContent?.includes('Assign') && !btn.textContent?.includes('De-assign')) return btn;
                }
                return null;
            }, 2000);
            await page.evaluate(() => {
                for (const btn of document.querySelectorAll('.sapMBtn')) {
                    if (btn.textContent?.includes('Assign') && !btn.textContent?.includes('De-assign')) {
                        btn.click(); return;
                    }
                }
            });
            await page.waitForTimeout(2000);
        }
    },

    /* ─── 11: Assignments Overview (after assignment made) ──────── */
    {
        id:       '11_assignments_overview',
        subtitle: 'Assignments list updated — Status, Due Date, and completion tracking visible for the team.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(800);
        }
    },

    /* ─── 12: Navigate to My Assignments ──────────────────────── */
    {
        id:       '12_my_assignments',
        subtitle: 'Navigating to My Assignments — the training management hub for managers and users.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => {
                const btn = document.querySelector('[id$="myAssignmentsBtn"]');
                if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            await page.waitForTimeout(400);
            await highlight(page, () => document.querySelector('[id$="myAssignmentsBtn"]'), 2000);
            await page.evaluate(() => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('myAssignmentsBtn'));
                if (ids.length) sap.ui.getCore().mElements[ids[0]].firePress();
            });
            await page.waitForTimeout(1500); // wait for navigation and render
        }
    },

    /* ─── 13: Select Assigned course + Start Training ───────────── */
    {
        id:       '13_start_training',
        subtitle: 'Selecting an Assigned course and clicking Start Training — status changes to In Progress.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            // Select first row with Assigned status
            await page.evaluate(() => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('assignSmartTable'));
                if (!ids.length) return;
                const st  = sap.ui.getCore().mElements[ids[0]];
                const tbl = st.getTable ? st.getTable() : null;
                if (!tbl?.getBinding) return;
                const contexts = tbl.getBinding('rows').getContexts(0, tbl.getBinding('rows').getLength());
                for (let i = 0; i < contexts.length; i++) {
                    if (contexts[i].getObject().Status === 'Assigned') {
                        tbl.setSelectedIndex(i); break;
                    }
                }
            });
            await page.waitForTimeout(800);
            // Highlight Start Training button
            await highlight(page, () => document.querySelector('[id$="startTrainingBtn"]'), 2000);
            // Fire press
            await page.evaluate(() => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('startTrainingBtn'));
                if (ids.length) sap.ui.getCore().mElements[ids[0]].firePress();
            });
            await page.waitForTimeout(1500);
            // Accept confirmation dialog
            await page.evaluate(() => {
                for (const btn of document.querySelectorAll('.sapMDialog .sapMBtn')) {
                    if (/OK|Yes/i.test(btn.textContent || '')) { btn.click(); return; }
                }
            });
            await page.waitForTimeout(1500);
        }
    },

    /* ─── 14: Show In Progress status ──────────────────────────── */
    {
        id:       '14_in_progress_status',
        subtitle: 'Course is now In Progress — status updated in real time with start timestamp recorded.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => {
                const statuses = document.querySelectorAll('.assignmentStatusBadge,[class*="statusBadge"]');
                for (const s of statuses) {
                    if (s.textContent?.includes('In Progress')) {
                        s.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
                    }
                }
            });
            await page.waitForTimeout(600);
            await highlight(page, () => {
                const statuses = document.querySelectorAll('.assignmentStatusBadge,[class*="statusBadge"]');
                for (const s of statuses) { if (s.textContent?.includes('In Progress')) return s; }
                return null;
            }, 2000);
        }
    },

    /* ─── 15: Mark Completed ────────────────────────────────────── */
    {
        id:       '15_mark_completed',
        subtitle: 'Clicking Mark Completed — course moves from In Progress to Completed with timestamp.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            // Select the In Progress row
            await page.evaluate(() => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('assignSmartTable'));
                if (!ids.length) return;
                const tbl = sap.ui.getCore().mElements[ids[0]].getTable?.();
                if (!tbl?.getBinding) return;
                const contexts = tbl.getBinding('rows').getContexts(0, tbl.getBinding('rows').getLength());
                for (let i = 0; i < contexts.length; i++) {
                    if (contexts[i].getObject().Status === 'In Progress') {
                        tbl.setSelectedIndex(i); break;
                    }
                }
            });
            await page.waitForTimeout(800);
            // Highlight Mark Completed button
            await highlight(page, () => document.querySelector('[id$="markCompletedBtn"]'), 2000);
            // Fire press
            await page.evaluate(() => {
                const ids = Object.keys(sap.ui.getCore().mElements || {})
                    .filter(id => id.includes('markCompletedBtn'));
                if (ids.length) sap.ui.getCore().mElements[ids[0]].firePress();
            });
            await page.waitForTimeout(1500);
            // Confirm dialog
            await page.evaluate(() => {
                for (const btn of document.querySelectorAll('.sapMDialog .sapMBtn')) {
                    if (/OK|Yes|Confirm/i.test(btn.textContent || '')) { btn.click(); return; }
                }
            });
            await page.waitForTimeout(1500);
        }
    },

    /* ─── 16: Completed — end of lifecycle ─────────────────────── */
    {
        id:       '16_lifecycle_complete',
        subtitle: 'Full lifecycle complete: Assigned → In Progress → Completed. SAP Courses App — Built on SAP Fiori, deployed on SAP S/4HANA.',
        readMs:   1000,
        holdMs:   1500,
        action: async (page) => {
            await page.evaluate(() => {
                const statuses = document.querySelectorAll('.assignmentStatusBadge,[class*="statusBadge"]');
                for (const s of statuses) {
                    if (s.textContent?.includes('Completed')) {
                        s.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
                    }
                }
            });
            await page.waitForTimeout(600);
            await highlight(page, () => {
                const statuses = document.querySelectorAll('.assignmentStatusBadge,[class*="statusBadge"]');
                for (const s of statuses) { if (s.textContent?.includes('Completed')) return s; }
                return null;
            }, 2200);
        }
    }
];

/* ══════════════════════════════════════════════════════════════
 *  MAIN
 * ══════════════════════════════════════════════════════════════ */
(async () => {
    console.log('Connecting to Chrome on port 9222...');
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const page    = browser.contexts()[0].pages()[0];
    console.log('Connected:', page.url());
    await page.waitForTimeout(1500);

    const totalDuration = SCENES.reduce((s, sc) => s + (sc.readMs || 2000) + (sc.holdMs || 4000), 0);
    console.log(`\nStarting v4 recording — ${SCENES.length} scenes, ~${Math.round(totalDuration/1000)}s\n`);

    for (let i = 0; i < SCENES.length; i++) {
        await runScene(page, SCENES[i], i + 1, SCENES.length);
    }

    // Cleanup DOM injections
    await clearOverlays(page);

    console.log(`\nTotal frames captured: ${frameIndex}`);
    await buildVideo();

    // Remove frame files
    console.log('Cleaning up frames...');
    for (const f of fs.readdirSync(FRAMES_DIR)) fs.unlinkSync(path.join(FRAMES_DIR, f));
    fs.rmdirSync(FRAMES_DIR);

    console.log('\n✓ DONE');
    console.log('  Video:       ', VIDEO_FILE);
    console.log('  Screenshots: ', SS_DIR);
})().catch(e => {
    console.error('FATAL:', e.message);
    console.error(e.stack);
    process.exit(1);
});

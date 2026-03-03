/**
 * SAP Courses App — Add Voice Narration v2
 *
 * Generates TTS audio per scene, pads to match durations,
 * concatenates into full audio track, merges with video.
 * Matches record_demo_v2.js scene order.
 */

const say = require('say');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PRES_DIR = path.join(__dirname, 'presentation');
const AUDIO_DIR = path.join(PRES_DIR, 'audio_clips_v2');
const VIDEO_IN = path.join(PRES_DIR, 'SAP_Courses_Demo_v2.mp4');
const VIDEO_OUT = path.join(PRES_DIR, 'SAP_Courses_Demo_v2_Narrated.mp4');

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Scene narrations matching record_demo_v2.js exactly
const SCENES = [
    { id: '00_flp_home',                text: 'This is the SAP Fiori Launchpad. The central entry point for all SAP applications.',                                     duration: 4.0 },
    { id: '01_click_tile',              text: 'Click the SAP Courses tile to launch the training management application.',                                                duration: 5.0 },
    { id: '02_home_overview',           text: 'This is the SAP Courses homepage. The central hub for training management.',                                               duration: 4.0 },
    { id: '03_team_analytics',          text: 'Team Analytics KPIs show Total, Pending, In Progress, Overdue, and Completed assignments.',                                duration: 5.0 },
    { id: '04_analytics_dashboard_click', text: 'Click Analytics Dashboard for the detailed team progress view.',                                                         duration: 4.0 },
    { id: '05_analytics_dashboard_view', text: 'The Dashboard shows Module Distribution and Team Member Progress with completion bars.',                                   duration: 5.0 },
    { id: '06_analytics_dashboard_close', text: 'Close the Analytics Dashboard to return to the homepage.',                                                                duration: 3.0 },
    { id: '07_smart_filters',           text: 'Smart Filters. Role, Topic, and Module dropdowns with dependent filtering.',                                               duration: 4.0 },
    { id: '08_role_filter_click',       text: 'Select a Role. Topics and Modules automatically narrow to matching values.',                                               duration: 4.0 },
    { id: '09_export_report',           text: 'Export Report. One click Excel download of training data for leadership reporting.',                                        duration: 3.5 },
    { id: '10_card_view',               text: 'Card View displays training courses in a visual grid layout.',                                                             duration: 4.0 },
    { id: '11_table_view',              text: 'Table View provides a full-width data grid with sorting, columns, and built-in scrollbar.',                                duration: 4.0 },
    { id: '12_click_my_assignments',    text: 'Click My Assignments to manage training assignments.',                                                                     duration: 4.0 },
    { id: '13_assignments_overview',    text: 'My Assignments page. KPI progress cards and the training assignment list.',                                                duration: 4.0 },
    { id: '14_assign_training',         text: 'Manager Action. Assign a training course to team member niktanwar.',                                                       duration: 6.0 },
    { id: '15_assignment_table_view',   text: 'The assignments table shows Status, Due Date, and Completion tracking.',                                                   duration: 4.0 },
    { id: '16_select_assigned_course',  text: 'Select an Assigned course to begin the training workflow.',                                                                duration: 4.0 },
    { id: '17_click_start_training',    text: 'Click Start Training. The status changes to In Progress.',                                                                 duration: 5.0 },
    { id: '18_show_in_progress',        text: 'The course is now In Progress. Status updated in real time.',                                                              duration: 4.0 },
    { id: '19_click_mark_completed',    text: 'Click Mark Completed. The course moves to Completed status.',                                                              duration: 5.0 },
    { id: '20_show_completed',          text: 'Course is now Completed. Full lifecycle: Assigned, In Progress, Completed.',                                               duration: 5.0 },
    { id: '21_filter_completed',        text: 'Filter by Completed to verify the course status end to end.',                                                              duration: 4.0 },
    { id: '22_back_to_home',            text: '',                                                                                                                         duration: 2.0 },
    { id: '23_closing',                 text: 'SAP Courses App. Built on SAP Fiori, deployed on SAP S4HANA. Thank you!',                                                 duration: 5.0 },
];

function generateTTS(text, outputPath) {
    return new Promise((resolve, reject) => {
        if (!text || text.trim() === '') { resolve(null); return; }
        say.export(text, null, 0.9, outputPath, (err) => {
            if (err) reject(err); else resolve(outputPath);
        });
    });
}

function getAudioDuration(filePath) {
    try {
        const output = execSync(`"${ffmpegPath}" -i "${filePath}" 2>&1`, { encoding: 'utf8' });
        const m = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        if (m) return parseFloat(m[1]) * 3600 + parseFloat(m[2]) * 60 + parseFloat(m[3]);
    } catch (e) {
        const m = (e.stdout || '').match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        if (m) return parseFloat(m[1]) * 3600 + parseFloat(m[2]) * 60 + parseFloat(m[3]);
    }
    return 0;
}

function generateSilence(duration, outputPath) {
    execSync(
        `"${ffmpegPath}" -f lavfi -i anullsrc=r=22050:cl=mono -t ${duration.toFixed(3)} -y "${outputPath}"`,
        { stdio: 'pipe' }
    );
}

async function main() {
    console.log('=== Adding Voice Narration v2 ===\n');

    console.log('Step 1: Generating TTS audio clips...');
    const clipFiles = [];

    for (let i = 0; i < SCENES.length; i++) {
        const scene = SCENES[i];
        const wavPath = path.join(AUDIO_DIR, `${String(i).padStart(2, '0')}_${scene.id}.wav`);
        const padPath = path.join(AUDIO_DIR, `${String(i).padStart(2, '0')}_${scene.id}_pad.wav`);

        if (scene.text && scene.text.trim() !== '') {
            console.log(`  [${i + 1}/${SCENES.length}] ${scene.id}: "${scene.text.substring(0, 50)}..."`);
            await generateTTS(scene.text, wavPath);
            const dur = getAudioDuration(wavPath);
            const target = scene.duration;

            if (dur < target) {
                const silPath = path.join(AUDIO_DIR, `${String(i).padStart(2, '0')}_silence.wav`);
                generateSilence(target - dur, silPath);
                // Concat TTS + silence
                const concatFile = path.join(AUDIO_DIR, `${String(i).padStart(2, '0')}_concat.txt`);
                fs.writeFileSync(concatFile, `file '${wavPath}'\nfile '${silPath}'`);
                execSync(`"${ffmpegPath}" -f concat -safe 0 -i "${concatFile}" -y "${padPath}"`, { stdio: 'pipe' });
                fs.unlinkSync(silPath);
                fs.unlinkSync(concatFile);
            } else {
                fs.copyFileSync(wavPath, padPath);
            }
            clipFiles.push(padPath);
        } else {
            console.log(`  [${i + 1}/${SCENES.length}] ${scene.id}: (silence ${scene.duration}s)`);
            generateSilence(scene.duration, padPath);
            clipFiles.push(padPath);
        }
    }

    // Step 2: Concatenate
    console.log('\nStep 2: Concatenating audio clips...');
    const fullConcat = path.join(AUDIO_DIR, 'full_concat.txt');
    fs.writeFileSync(fullConcat, clipFiles.map(f => `file '${f}'`).join('\n'));
    const fullAudio = path.join(AUDIO_DIR, 'full_narration.wav');
    execSync(`"${ffmpegPath}" -f concat -safe 0 -i "${fullConcat}" -y "${fullAudio}"`, { stdio: 'pipe' });
    console.log('Full narration:', fullAudio);

    // Step 3: Merge with video
    console.log('\nStep 3: Merging audio with video...');
    if (!fs.existsSync(VIDEO_IN)) {
        console.log('  Video not found: ' + VIDEO_IN);
        console.log('  Run record_demo_v2.js first, then re-run this script.');
        return;
    }
    execSync(
        `"${ffmpegPath}" -i "${VIDEO_IN}" -i "${fullAudio}" -c:v copy -c:a aac -b:a 128k -shortest -y "${VIDEO_OUT}"`,
        { stdio: 'pipe' }
    );
    console.log('\n=== DONE ===');
    console.log('Narrated video:', VIDEO_OUT);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });

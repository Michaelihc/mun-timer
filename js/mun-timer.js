'use strict';

// Default Data
let appData = {
    topics: [
        { id: 1, title: 'Climate Change and Environmental Policy' },
        { id: 2, title: 'Nuclear Non-Proliferation' },
        { id: 3, title: 'Human Rights Violations' },
    ],
    events: [
        {
            id: 1,
            type: 'general',
            title: 'Opening Ceremony',
            subtitle: 'Welcome and Introduction',
            topicId: null,
            // Optional generic timer in seconds for any event
            // timer: 300,
        },
        {
            id: 2,
            type: 'moderated',
            title: 'Moderated Caucus',
            subtitle: 'Discussing Climate Solutions',
            topicId: 1,
            totalTime: 600,
            speakerTime: 60,
        },
        {
            id: 3,
            type: 'unmoderated',
            title: 'Unmoderated Caucus',
            subtitle: 'Informal Discussion',
            topicId: 1,
            duration: 300,
        },
        {
            id: 4,
            type: 'voting',
            title: 'Voting Procedure',
            subtitle: 'Draft Resolution 1.1',
            topicId: 1,
            // Example: enable a short voting timer
            // timer: 120,
        },
        {
            id: 5,
            type: 'moderated',
            title: 'Moderated Caucus',
            subtitle: 'Arms Control Measures',
            topicId: 2,
            totalTime: 480,
            speakerTime: 45,
        },
        {
            id: 6,
            type: 'general',
            title: 'Closing Remarks',
            subtitle: 'Summary and Adjournment',
            topicId: null,
        },
    ],
    delegates: [
        { id: 1, code: 'USA', name: 'United States' },
        { id: 2, code: 'CHN', name: 'China' },
        { id: 3, code: 'GBR', name: 'United Kingdom' },
        { id: 4, code: 'FRA', name: 'France' },
        { id: 5, code: 'RUS', name: 'Russia' },
        { id: 6, code: 'DEU', name: 'Germany' },
        { id: 7, code: 'JPN', name: 'Japan' },
        { id: 8, code: 'IND', name: 'India' },
        { id: 9, code: 'BRA', name: 'Brazil' },
        { id: 10, code: 'CAN', name: 'Canada' },
    ],
    chair: { name: 'Chair' },
    votingConfig: {
        majorityMode: 'simple', // 'simple' | 'twoThirds' | 'securityCouncil' | 'consensus'
        voteType: 'substantive', // 'substantive' | 'procedural' (controls abstentions)
        securityCouncil: {
            members: ['USA', 'CHN', 'GBR', 'FRA', 'RUS', 'DEU', 'JPN', 'IND', 'BRA', 'CAN',],
            p5: ['USA', 'CHN', 'GBR', 'FRA', 'RUS'],
            requiredYes: 9,
        },
    },
    speechesDefaults: {
        round1Seconds: 120,
        round2Seconds: 120,
        rightOfReplySeconds: 60,
    },
    // Store voting results per event
    votingResults: {},
};

let currentEventIndex = 0;
let timers = {
    total: { time: 0, interval: null, running: false, initial: 0, extension: 30 },
    speaker: { time: 0, interval: null, running: false, initial: 0, extension: 30 },
};

// Motion definitions sorted by disturbance level
const motionTypes = [
    {
        id: 'suspension',
        title: 'Suspension of the Meeting / Adjournment',
        disturbance: 1,
        type: 'general',
        requiresParams: false,
        eventTitle: 'Meeting Suspended',
        eventSubtitle: 'Session Adjourned'
    },
    {
        id: 'unmoderated',
        title: 'Unmoderated Caucus',
        disturbance: 2,
        type: 'unmoderated',
        requiresParams: true,
        params: ['duration'],
        eventTitle: 'Unmoderated Caucus',
        eventSubtitle: 'Informal Discussion'
    },
    {
        id: 'moderated',
        title: 'Moderated Caucus',
        disturbance: 3,
        type: 'moderated',
        requiresParams: true,
        params: ['totalTime', 'speakerTime', 'topic'],
        eventTitle: 'Moderated Caucus',
        eventSubtitle: 'Formal Discussion'
    },
    {
        id: 'introduce_document',
        title: 'Introduce Draft Resolution / Working Paper',
        disturbance: 4,
        type: 'general',
        requiresParams: true,
        params: ['documentTitle'],
        eventTitle: 'Document Introduction',
        eventSubtitle: ''
    },
    {
        id: 'close_debate',
        title: 'Close Debate',
        disturbance: 5,
        type: 'general',
        requiresParams: false,
        eventTitle: 'Debate Closed',
        eventSubtitle: 'Moving to Voting Procedure'
    },
    {
        id: 'set_agenda',
        title: 'Set/Change Agenda',
        disturbance: 6,
        type: 'general',
        requiresParams: true,
        params: ['agendaItem'],
        eventTitle: 'Agenda Set',
        eventSubtitle: ''
    },
    {
        id: 'yield_time',
        title: 'Yield Time / Extend Speaking Time',
        disturbance: 7,
        type: 'general',
        requiresParams: true,
        params: ['extension'],
        eventTitle: 'Time Extension',
        eventSubtitle: ''
    }
];

// Current motion being voted on
let currentMotion = null;

// Motion queue - list of submitted motions awaiting voting
let motionQueue = [];

// Counter for unique motion IDs
let motionIdCounter = 1;

// Delegate attendance tracking
let delegateAttendance = {}; // { delegateId: 'none' | 'present' | 'present-voting' | 'absent' }

// Ensure optional configs exist when loading/applying JSON
function ensureDefaults() {
    // Voting config
    if (!appData.votingConfig) appData.votingConfig = {};
    if (!appData.votingConfig.majorityMode) appData.votingConfig.majorityMode = 'simple';
    if (!appData.votingConfig.voteType) appData.votingConfig.voteType = 'substantive';
    if (!appData.votingConfig.securityCouncil) {
        const codes = (appData.delegates || []).map(d => d.code);
        appData.votingConfig.securityCouncil = {
            members: codes.length ? codes.slice(0, Math.min(15, Math.max(10, codes.length))) : ['USA', 'CHN', 'GBR', 'FRA', 'RUS', 'DEU', 'JPN', 'IND', 'BRA', 'CAN'],
            p5: ['USA', 'CHN', 'GBR', 'FRA', 'RUS'],
            requiredYes: 9,
        };
    } else {
        const sc = appData.votingConfig.securityCouncil;
        if (!Array.isArray(sc.members)) sc.members = [];
        if (!Array.isArray(sc.p5)) sc.p5 = ['USA', 'CHN', 'GBR', 'FRA', 'RUS'];
        if (typeof sc.requiredYes !== 'number' || sc.requiredYes < 1) sc.requiredYes = 9;
    }
    // Speeches defaults
    if (!appData.speechesDefaults) {
        appData.speechesDefaults = { round1Seconds: 120, round2Seconds: 120, rightOfReplySeconds: 60 };
    }
    // Voting results storage
    if (!appData.votingResults) {
        appData.votingResults = {};
    }
}

// Initialize App
function init() {
    ensureDefaults();
    renderTopics();
    renderTimeline();
    renderDelegates();
    renderMotions(); // Add motions rendering
    initMotionPanelResize(); // Initialize motion panel resize functionality
    if (appData.events.length > 0) {
        setCurrentEvent(0);
    }
}

// Render Topics
function renderTopics() {
    const list = document.getElementById('topicsList');
    list.innerHTML = appData.topics
        .map(
            (topic, index) => `
                <div class="topic-item">
                    <div class="topic-number">${index + 1}</div>
                    <div class="topic-text">${topic.title}</div>
                    <div class="reorder-buttons">
                        <button class="reorder-btn" onclick="moveTopic(${index}, -1)" ${index === 0 ? 'disabled' : ''
                }>▲</button>
                        <button class="reorder-btn" onclick="moveTopic(${index}, 1)" ${index === appData.topics.length - 1 ? 'disabled' : ''
                }>▼</button>
                    </div>
                </div>
            `
        )
        .join('');
}

// Render Timeline
function renderTimeline() {
    const list = document.getElementById('timelineList');
    list.innerHTML = appData.events
        .map(
            (event, index) => `
                <div class="event-item ${index === currentEventIndex ? 'active' : ''
                }" onclick="setCurrentEvent(${index})">
                    <span class="event-type ${event.type}">${event.type}</span>
                    <div class="event-text">
                        <strong>${event.title}</strong><br>
                        <small>${event.subtitle}</small>
                    </div>
                    <div class="reorder-buttons">
                        <button class="reorder-btn" onclick="event.stopPropagation(); moveEvent(${index}, -1)" ${index === 0 ? 'disabled' : ''
                }>▲</button>
                        <button class="reorder-btn" onclick="event.stopPropagation(); moveEvent(${index}, 1)" ${index === appData.events.length - 1 ? 'disabled' : ''
                }>▼</button>
                    </div>
                </div>
            `
        )
        .join('');
}

// Render Delegates
function renderDelegates() {
    const bar = document.getElementById('delegatesBar');

    const delegatesHTML = appData.delegates.map((d) => {
        let classes = 'delegate-badge';
        const attendance = delegateAttendance[d.id] || 'none';

        if (attendance === 'present') classes += ' present';
        else if (attendance === 'present-voting') classes += ' present-voting';
        else if (attendance === 'absent') classes += ' absent';

        return `<div class="${classes}" title="${d.name}" onclick="cycleAttendance(${d.id})">${d.code}</div>`;
    }).join('');

    bar.innerHTML = `
        <div class="chair-badge">👤 ${appData.chair.name}</div>
        ${delegatesHTML}
        <div style="font-size: 0.85em; color: #6c757d; width: 100%; text-align: center;">
            💡 Click delegate badges to set attendance: Present / Present and Voting / Absent
        </div>
    `;
}// Move Topic
function moveTopic(index, direction) {
    if (index + direction < 0 || index + direction >= appData.topics.length)
        return;
    const temp = appData.topics[index];
    appData.topics[index] = appData.topics[index + direction];
    appData.topics[index + direction] = temp;
    renderTopics();
}

// Cycle delegate attendance
let currentAttendanceDelegate = null;

function cycleAttendance(delegateId) {
    const delegate = appData.delegates.find(d => d.id === delegateId);
    if (!delegate) return;

    currentAttendanceDelegate = delegateId;

    const modal = document.getElementById('attendanceModal');
    const delegateLabel = document.getElementById('attendanceDelegate');

    const currentStatus = delegateAttendance[delegateId] || 'none';
    let statusText = '';
    if (currentStatus === 'present') statusText = ' - Currently: Present';
    else if (currentStatus === 'present-voting') statusText = ' - Currently: Present and Voting';
    else if (currentStatus === 'absent') statusText = ' - Currently: Absent';

    delegateLabel.textContent = `${delegate.name} (${delegate.code})${statusText}`;
    modal.style.display = 'flex';
}

function setAttendance(status) {
    if (currentAttendanceDelegate === null) return;

    delegateAttendance[currentAttendanceDelegate] = status;
    renderDelegates();
    closeAttendanceModal();
}

function closeAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    modal.style.display = 'none';
    currentAttendanceDelegate = null;
}

// Move Event
function moveEvent(index, direction) {
    if (index + direction < 0 || index + direction >= appData.events.length)
        return;
    const temp = appData.events[index];
    appData.events[index] = appData.events[index + direction];
    appData.events[index + direction] = temp;

    // Update current event index
    if (currentEventIndex === index) {
        currentEventIndex = index + direction;
    } else if (currentEventIndex === index + direction) {
        currentEventIndex = index;
    }

    renderTimeline();
}

// Set Current Event
function setCurrentEvent(index) {
    // Save voting data from current event before switching
    if (currentEventIndex >= 0 && appData.events[currentEventIndex] && appData.events[currentEventIndex].type === 'voting') {
        saveVotingData();
    }

    currentEventIndex = index;
    const event = appData.events[index];

    // Stop all timers
    stopTimer('total');
    stopTimer('speaker');

    renderTimeline();

    const display = document.getElementById('eventDisplay');

    let topicText = '';
    if (event.topicId) {
        const topic = appData.topics.find((t) => t.id === event.topicId);
        if (topic) {
            topicText = `<div class="event-topic">Topic: ${topic.title}</div>`;
        }
    }

    let content = `
                <div class="event-title">${event.title}</div>
                <div class="event-subtitle">${event.subtitle}</div>
                ${topicText}
            `;

    // Render based on event type
    switch (event.type) {
        case 'moderated':
            content += renderModeratedCaucus(event);
            break;
        case 'unmoderated':
            content += renderUnmoderatedCaucus(event);
            break;
        case 'voting':
            content += renderVoting(event);
            break;
        case 'speeches':
            content += renderGeneralSpeeches(event);
            break;
        default:
            // For general/other events, show generic timer if configured
            if (typeof event.timer === 'number' && event.timer > 0) {
                content += renderGenericTimer(event);
            } else {
                content += '<div style="margin-top: 40px; color: #999;">No timer for this event</div>';
            }
    }

    display.innerHTML = content;
    // Initialize vote visualization if voting
    if (event.type === 'voting') {
        loadVotingData();
        updateVoteVisualization();
    }
}

// Render Moderated Caucus
function renderModeratedCaucus(event) {
    timers.total.time = event.totalTime;
    timers.total.initial = event.totalTime;
    timers.speaker.time = event.speakerTime;
    timers.speaker.initial = event.speakerTime;

    return `
                <div class="dual-timer">
                    <div class="timer-section">
                        <div class="timer-label">Total Time</div>
                        <div class="timer-display" id="totalTimer">${formatTime(
        timers.total.time
    )}</div>
                        <div class="timer-controls">
                            <button class="timer-btn" onclick="startTimer('total')">Start</button>
                            <button class="timer-btn pause" onclick="pauseTimer('total')">Pause</button>
                            <button class="timer-btn reset" onclick="resetTimer('total')">Reset</button>
                        </div>
                        <div class="timer-extension">
                            <label>Extension: <span id="totalExtensionLabel">${timers.total.extension}s</span></label>
                            <input type="range" min="5" max="300" step="5" value="${timers.total.extension}" 
                                   oninput="updateExtension('total', this.value)" class="extension-slider">
                            <button class="timer-btn extend" onclick="extendTimer('total')">+ Extend</button>
                        </div>
                    </div>
                    <div class="timer-section">
                        <div class="timer-label">Speaker Time</div>
                        <div class="timer-display" id="speakerTimer">${formatTime(
        timers.speaker.time
    )}</div>
                        <div class="timer-controls">
                            <button class="timer-btn" onclick="startTimer('speaker')">Start</button>
                            <button class="timer-btn pause" onclick="pauseTimer('speaker')">Pause</button>
                            <button class="timer-btn reset" onclick="resetTimer('speaker')">Reset</button>
                        </div>
                        <div class="timer-extension">
                            <label>Extension: <span id="speakerExtensionLabel">${timers.speaker.extension}s</span></label>
                            <input type="range" min="5" max="300" step="5" value="${timers.speaker.extension}" 
                                   oninput="updateExtension('speaker', this.value)" class="extension-slider">
                            <button class="timer-btn extend" onclick="extendTimer('speaker')">+ Extend</button>
                        </div>
                    </div>
                </div>
            `;
}

// Render Unmoderated Caucus
function renderUnmoderatedCaucus(event) {
    timers.total.time = event.duration;
    timers.total.initial = event.duration;

    return `
                <div class="timer-display" id="totalTimer">${formatTime(
        timers.total.time
    )}</div>
                <div class="timer-controls">
                    <button class="timer-btn" onclick="startTimer('total')">Start</button>
                    <button class="timer-btn pause" onclick="pauseTimer('total')">Pause</button>
                    <button class="timer-btn reset" onclick="resetTimer('total')">Reset</button>
                </div>
                <div class="timer-extension">
                    <label>Extension: <span id="totalExtensionLabel">${timers.total.extension}s</span></label>
                    <input type="range" min="5" max="300" step="5" value="${timers.total.extension}" 
                           oninput="updateExtension('total', this.value)" class="extension-slider">
                    <button class="timer-btn extend" onclick="extendTimer('total')">+ Extend</button>
                </div>
            `;
}

// Render Voting
function renderVoting(event) {
    const mode = appData.votingConfig?.majorityMode || 'simple';
    const voteType = appData.votingConfig?.voteType || 'substantive';
    let html = `
                <div class="voting-container">
                    <div class="vote-mode">
                        <label for="majorityMode">Required Majority</label>
                        <select id="majorityMode" onchange="onMajorityModeChange()">
                            <option value="simple" ${mode === 'simple' ? 'selected' : ''}>Simple Majority</option>
                            <option value="twoThirds" ${mode === 'twoThirds' ? 'selected' : ''}>Two Thirds Majority</option>
                            <option value="securityCouncil" ${mode === 'securityCouncil' ? 'selected' : ''}>Security Council</option>
                            <option value="consensus" ${mode === 'consensus' ? 'selected' : ''}>Consensus Vote</option>
                        </select>
                        <button class="sc-config-btn" onclick="openSCConfig()" title="Configure Security Council" ${mode === 'securityCouncil' ? '' : 'style="display:none"'}>Configure SC</button>
                        <label for="voteType">Vote Type</label>
                        <select id="voteType" onchange="onVoteTypeChange()">
                            <option value="substantive" ${voteType === 'substantive' ? 'selected' : ''}>Substantive</option>
                            <option value="procedural" ${voteType === 'procedural' ? 'selected' : ''}>Procedural</option>
                        </select>
                    </div>
                    <div class="vote-inputs" id="voteInputs">
                        ${renderVoteInputs(mode)}
                    </div>
                    <div class="vote-visualizer" id="voteVisualizer">
                        <div class="vote-bar for" style="width: 33.33%">0</div>
                        <div class="vote-bar against" style="width: 33.33%">0</div>
                        <div class="vote-bar abstain" style="width: 33.33%">0</div>
                    </div>
                    <div class="vote-result" id="voteResult" style="display: none;"></div>
                </div>
            `;
    if (typeof event.timer === 'number' && event.timer > 0) {
        html += renderGenericTimer(event);
    }
    return html;
}

function renderVoteInputs(mode) {
    const voteType = appData.votingConfig?.voteType || 'substantive';
    if (mode === 'securityCouncil') {
        const sc = appData.votingConfig.securityCouncil;
        const members = sc.members;
        // Build per-member selectors: Yes/No/Abstain
        return `
            <div class="sc-vote-grid">
                ${members.map(code => `
                    <div class="sc-vote-row" data-code="${code}">
                        <div class="sc-vote-country">${code}${sc.p5.includes(code) ? ' *' : ''}</div>
                        <select class="sc-vote-select" onchange="updateVoteVisualization()">
                            ${voteType === 'procedural' ? `
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            ` : `
                                <option value="abstain">Abstain</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            `}
                        </select>
                    </div>
                `).join('')}
            </div>
        `;
    }
    // Default triplet numeric inputs
    return voteType === 'procedural' ? `
        <div class="vote-input-group for">
            <label>For</label>
            <input type="number" id="voteFor" value="0" min="0" oninput="updateVoteVisualization()">
        </div>
        <div class="vote-input-group against">
            <label>Against</label>
            <input type="number" id="voteAgainst" value="0" min="0" oninput="updateVoteVisualization()">
        </div>
    ` : `
        <div class="vote-input-group for">
            <label>For</label>
            <input type="number" id="voteFor" value="0" min="0" oninput="updateVoteVisualization()">
        </div>
        <div class="vote-input-group against">
            <label>Against</label>
            <input type="number" id="voteAgainst" value="0" min="0" oninput="updateVoteVisualization()">
        </div>
        <div class="vote-input-group abstain">
            <label>Abstain</label>
            <input type="number" id="voteAbstain" value="0" min="0" oninput="updateVoteVisualization()">
        </div>
    `;
}

// Render a generic single timer based on event.timer (seconds)
function renderGenericTimer(event) {
    timers.total.time = event.timer;
    timers.total.initial = event.timer;

    // Timer UI plus quick-config input
    return `
                <div class="timer-display" id="totalTimer">${formatTime(
        timers.total.time
    )}</div>
                <div class="timer-controls">
                    <button class="timer-btn" onclick="startTimer('total')">Start</button>
                    <button class="timer-btn pause" onclick="pauseTimer('total')">Pause</button>
                    <button class="timer-btn reset" onclick="resetTimer('total')">Reset</button>
                </div>
                <div class="timer-extension">
                    <label>Extension: <span id="totalExtensionLabel">${timers.total.extension}s</span></label>
                    <input type="range" min="5" max="300" step="5" value="${timers.total.extension}" 
                           oninput="updateExtension('total', this.value)" class="extension-slider">
                    <button class="timer-btn extend" onclick="extendTimer('total')">+ Extend</button>
                </div>
                <div class="timer-config">
                    <label for="genericTimerSeconds">Timer (seconds)</label>
                    <input type="number" id="genericTimerSeconds" min="0" value="${event.timer}" />
                    <button class="timer-btn" onclick="applyGenericTimerSeconds()">Apply</button>
                </div>
            `;
}

// Timer Functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
}

function startTimer(type) {
    if (timers[type].running) return;

    timers[type].running = true;
    const timerElement = document.getElementById(
        type === 'total' ? 'totalTimer' : 'speakerTimer'
    );

    timers[type].interval = setInterval(() => {
        if (timers[type].time > 0) {
            timers[type].time--;
            timerElement.textContent = formatTime(timers[type].time);

            // Update color based on remaining time
            const percentage = (timers[type].time / timers[type].initial) * 100;
            timerElement.classList.remove('warning', 'danger');
            if (percentage <= 10) {
                timerElement.classList.add('danger');
            } else if (percentage <= 25) {
                timerElement.classList.add('warning');
            }
        } else {
            stopTimer(type);
            playBeep();
        }
    }, 1000);
}

function pauseTimer(type) {
    timers[type].running = false;
    clearInterval(timers[type].interval);
}

function stopTimer(type) {
    timers[type].running = false;
    clearInterval(timers[type].interval);
}

function resetTimer(type) {
    stopTimer(type);
    timers[type].time = timers[type].initial;
    const timerElement = document.getElementById(
        type === 'total' ? 'totalTimer' : 'speakerTimer'
    );
    if (timerElement) {
        timerElement.textContent = formatTime(timers[type].time);
        timerElement.classList.remove('warning', 'danger');
    }
}

function playBeep() {
    // Pleasant chime sequence using Web Audio API (keeps function name)
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;

        const notes = [
            { freq: 660, start: 0.0, dur: 0.14, vol: 0.25 }, // E5
            { freq: 880, start: 0.16, dur: 0.14, vol: 0.22 }, // A5
            { freq: 1320, start: 0.32, dur: 0.22, vol: 0.20 }, // E6
        ];

        notes.forEach(({ freq, start, dur, vol }) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(0.0001, now + start);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), now + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now + start);
            osc.stop(now + start + dur + 0.02);
        });
    } catch (e) {
        // Fallback: no-op if audio context fails
        // console.warn('Audio playback failed', e);
    }
}

// Apply changes from the generic timer seconds input
function applyGenericTimerSeconds() {
    const input = document.getElementById('genericTimerSeconds');
    if (!input) return;
    const seconds = parseInt(input.value, 10);
    if (Number.isNaN(seconds) || seconds < 0) {
        alert('Please enter a valid non-negative number of seconds.');
        return;
    }
    // Stop current timer and apply new value
    stopTimer('total');
    timers.total.initial = seconds;
    timers.total.time = seconds;
    const el = document.getElementById('totalTimer');
    if (el) {
        el.textContent = formatTime(seconds);
        el.classList.remove('warning', 'danger');
    }
    // Update current event's JSON so saving will persist it
    const ev = appData.events[currentEventIndex];
    if (ev) {
        ev.timer = seconds;
    }
}

// Extension Functions
function updateExtension(type, value) {
    timers[type].extension = parseInt(value, 10);
    const label = document.getElementById(`${type}ExtensionLabel`);
    if (label) {
        label.textContent = `${value}s`;
    }
}

function extendTimer(type) {
    const extensionAmount = timers[type].extension;
    timers[type].time += extensionAmount;
    timers[type].initial += extensionAmount;

    const timerElement = document.getElementById(
        type === 'total' ? 'totalTimer' : 'speakerTimer'
    );
    if (timerElement) {
        timerElement.textContent = formatTime(timers[type].time);
        // Update color based on new remaining time
        const percentage = (timers[type].time / timers[type].initial) * 100;
        timerElement.classList.remove('warning', 'danger');
        if (percentage <= 10) {
            timerElement.classList.add('danger');
        } else if (percentage <= 25) {
            timerElement.classList.add('warning');
        }
    }
}

// Voting Functions
function updateVoteVisualization() {
    const mode = document.getElementById('majorityMode')?.value || appData.votingConfig.majorityMode || 'simple';
    const voteType = document.getElementById('voteType')?.value || appData.votingConfig.voteType || 'substantive';
    let forVotes = 0, againstVotes = 0, abstainVotes = 0;

    if (mode === 'securityCouncil') {
        // Count per-member decisions
        const selects = Array.from(document.querySelectorAll('.sc-vote-select'));
        let veto = null;
        let yes = 0, no = 0, abstain = 0;
        const sc = appData.votingConfig.securityCouncil;
        selects.forEach((sel, idx) => {
            const row = sel.closest('.sc-vote-row');
            const code = row?.getAttribute('data-code');
            const val = sel.value;
            if (val === 'yes') yes++;
            else if (val === 'no') {
                no++;
                if (code && sc.p5.includes(code)) veto = code;
            } else abstain++;
        });
        forVotes = yes; againstVotes = no; abstainVotes = abstain;
        // Visualizer: percent out of members
        const total = Math.max(1, sc.members.length);
        const forPercent = (forVotes / total) * 100;
        const againstPercent = (againstVotes / total) * 100;
        const abstainPercent = (abstainVotes / total) * 100;
        let html = '';
        if (forVotes > 0) html += `<div class="vote-bar for" style="width: ${forPercent}%">${forVotes}</div>`;
        if (againstVotes > 0) html += `<div class="vote-bar against" style="width: ${againstPercent}%">${againstVotes}</div>`;
        if (abstainVotes > 0) html += `<div class="vote-bar abstain" style="width: ${abstainPercent}%">${abstainVotes}</div>`;
        document.getElementById('voteVisualizer').innerHTML = html || (voteType === 'procedural' ? `
            <div class="vote-bar for" style="width: 50%">0</div>
            <div class="vote-bar against" style="width: 50%">0</div>` : `
            <div class="vote-bar for" style="width: 33.33%">0</div>
            <div class="vote-bar against" style="width: 33.33%">0</div>
            <div class="vote-bar abstain" style="width: 33.33%">0</div>`);
        const resultElement = document.getElementById('voteResult');
        const pass = yes >= (sc.requiredYes || 9) && !veto;
        resultElement.style.display = 'block';
        if (pass) {
            resultElement.textContent = 'PASSED' + (veto ? ' (Vetoed)' : '');
            resultElement.className = 'vote-result passed';
        } else {
            resultElement.textContent = veto ? `FAILED (Veto by ${veto})` : 'FAILED';
            resultElement.className = 'vote-result failed';
        }
        return;
    }

    // Numeric inputs mode
    forVotes = parseInt(document.getElementById('voteFor')?.value) || 0;
    againstVotes = parseInt(document.getElementById('voteAgainst')?.value) || 0;
    abstainVotes = parseInt(document.getElementById('voteAbstain')?.value) || 0;
    const total = forVotes + againstVotes + abstainVotes;

    const forPercent = total ? (forVotes / total) * 100 : 33.33;
    const againstPercent = total ? (againstVotes / total) * 100 : 33.33;
    const abstainPercent = total ? (abstainVotes / total) * 100 : 33.33;
    let html = '';
    if (forVotes > 0) html += `<div class="vote-bar for" style="width: ${forPercent}%">${forVotes}</div>`;
    if (againstVotes > 0) html += `<div class="vote-bar against" style="width: ${againstPercent}%">${againstVotes}</div>`;
    if (abstainVotes > 0) html += `<div class="vote-bar abstain" style="width: ${abstainPercent}%">${abstainVotes}</div>`;
    document.getElementById('voteVisualizer').innerHTML = html || (voteType === 'procedural' ? `
        <div class="vote-bar for" style="width: 50%">0</div>
        <div class="vote-bar against" style="width: 50%">0</div>` : `
        <div class="vote-bar for" style="width: 33.33%">0</div>
        <div class="vote-bar against" style="width: 33.33%">0</div>
        <div class="vote-bar abstain" style="width: 33.33%">0</div>`);

    const resultElement = document.getElementById('voteResult');
    let passed = false; let tie = false;
    const presentAndVoting = forVotes + againstVotes; // abstentions excluded
    switch (mode) {
        case 'twoThirds':
            passed = presentAndVoting > 0 && forVotes >= Math.ceil((2 / 3) * presentAndVoting);
            break;
        case 'consensus':
            passed = againstVotes === 0 && (forVotes > 0 || abstainVotes > 0);
            break;
        case 'simple':
        default:
            passed = presentAndVoting > 0 && forVotes > againstVotes; // >50% of P&V
            tie = forVotes === againstVotes && presentAndVoting > 0;
    }
    resultElement.style.display = 'block';
    if (passed) {
        resultElement.textContent = 'PASSED';
        resultElement.className = 'vote-result passed';
    } else if (tie) {
        resultElement.textContent = 'TIE';
        resultElement.className = 'vote-result';
    } else {
        resultElement.textContent = 'FAILED';
        resultElement.className = 'vote-result failed';
    }
}

function onMajorityModeChange() {
    const sel = document.getElementById('majorityMode');
    if (!sel) return;
    const mode = sel.value;
    appData.votingConfig.majorityMode = mode;
    // Toggle SC config button
    const btn = document.querySelector('.sc-config-btn');
    if (btn) btn.style.display = mode === 'securityCouncil' ? '' : 'none';
    // Re-render vote inputs
    const inputs = document.getElementById('voteInputs');
    if (inputs) {
        inputs.innerHTML = renderVoteInputs(mode);
    }
    // Reset visualization
    updateVoteVisualization();
}

// Save voting data for the current event
function saveVotingData() {
    if (!appData.events[currentEventIndex] || appData.events[currentEventIndex].type !== 'voting') {
        return; // Not a voting event
    }

    const eventId = appData.events[currentEventIndex].id;
    const mode = document.getElementById('majorityMode')?.value || appData.votingConfig.majorityMode;
    const voteType = document.getElementById('voteType')?.value || appData.votingConfig.voteType;

    const votingData = {
        mode: mode,
        voteType: voteType,
        timestamp: new Date().toISOString()
    };

    if (mode === 'securityCouncil') {
        // Save per-member votes
        const selects = Array.from(document.querySelectorAll('.sc-vote-select'));
        votingData.scVotes = {};
        selects.forEach((sel) => {
            const row = sel.closest('.sc-vote-row');
            const code = row?.getAttribute('data-code');
            if (code) {
                votingData.scVotes[code] = sel.value;
            }
        });
    } else {
        // Save numeric votes
        votingData.forVotes = parseInt(document.getElementById('voteFor')?.value) || 0;
        votingData.againstVotes = parseInt(document.getElementById('voteAgainst')?.value) || 0;
        votingData.abstainVotes = parseInt(document.getElementById('voteAbstain')?.value) || 0;
    }

    // Check if data has actually changed
    const previousData = appData.votingResults[eventId];
    if (hasVotingDataChanged(previousData, votingData)) {
        appData.votingResults[eventId] = votingData;
        // Auto-save to JSON file only if changed
        autoSaveToFile();
    }
}// Check if voting data has changed from previous save
function hasVotingDataChanged(previousData, newData) {
    // No previous data means it's new/changed
    if (!previousData) {
        // But only if there's actual vote data entered
        if (newData.mode === 'securityCouncil') {
            // Check if any SC votes are not at default (abstain for substantive, or any selection for procedural)
            const scVotes = newData.scVotes || {};
            const defaultValue = newData.voteType === 'procedural' ? 'yes' : 'abstain';
            return Object.values(scVotes).some(vote => vote !== defaultValue);
        } else {
            // Check if any numeric votes are non-zero
            return (newData.forVotes || 0) !== 0 ||
                (newData.againstVotes || 0) !== 0 ||
                (newData.abstainVotes || 0) !== 0;
        }
    }

    // Compare mode and voteType
    if (previousData.mode !== newData.mode || previousData.voteType !== newData.voteType) {
        return true;
    }

    // Compare votes based on mode
    if (newData.mode === 'securityCouncil') {
        const prevVotes = previousData.scVotes || {};
        const newVotes = newData.scVotes || {};
        const allCodes = new Set([...Object.keys(prevVotes), ...Object.keys(newVotes)]);
        for (const code of allCodes) {
            if (prevVotes[code] !== newVotes[code]) {
                return true;
            }
        }
        return false;
    } else {
        return (previousData.forVotes || 0) !== (newData.forVotes || 0) ||
            (previousData.againstVotes || 0) !== (newData.againstVotes || 0) ||
            (previousData.abstainVotes || 0) !== (newData.abstainVotes || 0);
    }
}

// Load voting data for the current event
function loadVotingData() {
    if (!appData.events[currentEventIndex] || appData.events[currentEventIndex].type !== 'voting') {
        return; // Not a voting event
    }

    const eventId = appData.events[currentEventIndex].id;
    const savedData = appData.votingResults[eventId];

    if (!savedData) {
        return; // No saved data
    }

    // Restore mode and type
    if (savedData.mode) {
        appData.votingConfig.majorityMode = savedData.mode;
        const modeSelect = document.getElementById('majorityMode');
        if (modeSelect) modeSelect.value = savedData.mode;
    }

    if (savedData.voteType) {
        appData.votingConfig.voteType = savedData.voteType;
        const typeSelect = document.getElementById('voteType');
        if (typeSelect) typeSelect.value = savedData.voteType;
    }

    // Small delay to ensure DOM is ready
    setTimeout(() => {
        if (savedData.mode === 'securityCouncil' && savedData.scVotes) {
            // Restore per-member votes
            Object.keys(savedData.scVotes).forEach((code) => {
                const row = document.querySelector(`.sc-vote-row[data-code="${code}"]`);
                if (row) {
                    const select = row.querySelector('.sc-vote-select');
                    if (select) select.value = savedData.scVotes[code];
                }
            });
        } else {
            // Restore numeric votes
            const forInput = document.getElementById('voteFor');
            const againstInput = document.getElementById('voteAgainst');
            const abstainInput = document.getElementById('voteAbstain');

            if (forInput && savedData.forVotes !== undefined) forInput.value = savedData.forVotes;
            if (againstInput && savedData.againstVotes !== undefined) againstInput.value = savedData.againstVotes;
            if (abstainInput && savedData.abstainVotes !== undefined) abstainInput.value = savedData.abstainVotes;
        }

        updateVoteVisualization();
    }, 10);
}

// Auto-save data to local JSON file
function autoSaveToFile() {
    try {
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mun-timer-autosave.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        console.error('Auto-save failed:', e);
    }
}

function onVoteTypeChange() {
    const sel = document.getElementById('voteType');
    if (!sel) return;
    const voteType = sel.value;
    appData.votingConfig.voteType = voteType;
    // Re-render inputs based on vote type and mode
    const modeSel = document.getElementById('majorityMode');
    const mode = modeSel ? modeSel.value : appData.votingConfig.majorityMode;
    const inputs = document.getElementById('voteInputs');
    if (inputs) {
        inputs.innerHTML = renderVoteInputs(mode);
    }
    updateVoteVisualization();
}

// Security Council config modal
function openSCConfig() {
    const modal = document.getElementById('scConfigModal');
    if (!modal) return;
    populateSCModal();
    modal.classList.add('active');
}
function closeSCConfig() {
    const modal = document.getElementById('scConfigModal');
    if (!modal) return;
    modal.classList.remove('active');
}
function populateSCModal() {
    const sc = appData.votingConfig.securityCouncil;
    const membersList = document.getElementById('scMembersList');
    const p5List = document.getElementById('scP5List');
    if (!membersList || !p5List) return;
    // Members: checkbox list of all delegates
    membersList.innerHTML = appData.delegates.map(d => {
        const checked = sc.members.includes(d.code) ? 'checked' : '';
        return `<label class="sc-item"><input type="checkbox" class="sc-member" value="${d.code}" ${checked}> ${d.name} (${d.code})</label>`;
    }).join('');
    // P5: checkbox list but only those in members enabled
    p5List.innerHTML = appData.delegates.map(d => {
        const checked = sc.p5.includes(d.code) ? 'checked' : '';
        const disabled = sc.members.includes(d.code) ? '' : 'disabled';
        return `<label class="sc-item"><input type="checkbox" class="sc-p5" value="${d.code}" ${checked} ${disabled}> ${d.name} (${d.code})</label>`;
    }).join('');
}
function scSelectStandardP5() {
    const checkboxes = document.querySelectorAll('#scP5List .sc-p5');
    const standard = ['USA', 'CHN', 'GBR', 'FRA', 'RUS'];
    checkboxes.forEach(cb => {
        cb.checked = standard.includes(cb.value);
    });
}
function saveSCConfig() {
    const memberCbs = Array.from(document.querySelectorAll('#scMembersList .sc-member'));
    const p5Cbs = Array.from(document.querySelectorAll('#scP5List .sc-p5'));
    const members = memberCbs.filter(cb => cb.checked).map(cb => cb.value);
    const p5 = p5Cbs.filter(cb => cb.checked && members.includes(cb.value)).map(cb => cb.value);
    appData.votingConfig.securityCouncil.members = members;
    appData.votingConfig.securityCouncil.p5 = p5;
    closeSCConfig();
    // If currently on voting UI and SC mode, re-render inputs
    const sel = document.getElementById('majorityMode');
    if (sel && sel.value === 'securityCouncil') {
        const inputs = document.getElementById('voteInputs');
        if (inputs) inputs.innerHTML = renderVoteInputs('securityCouncil');
        updateVoteVisualization();
    }
}

// Modal Functions
function openAddEventModal() {
    updateTopicDropdown();
    document.getElementById('addEventModal').classList.add('active');
    updateEventForm();
}

function closeAddEventModal() {
    document.getElementById('addEventModal').classList.remove('active');
}

function updateTopicDropdown() {
    const select = document.getElementById('newEventTopic');
    select.innerHTML =
        '<option value="">None</option>' +
        appData.topics.map((t) => `<option value="${t.id}">${t.title}</option>`).join('');
}

function updateEventForm() {
    const type = document.getElementById('newEventType').value;
    const fieldsDiv = document.getElementById('eventSpecificFields');

    let html = '';

    if (type === 'moderated') {
        html = `
                    <div class="form-group">
                        <label>Total Time (seconds)</label>
                        <input type="number" id="newEventTotalTime" value="600" min="0">
                    </div>
                    <div class="form-group">
                        <label>Speaker Time (seconds)</label>
                        <input type="number" id="newEventSpeakerTime" value="60" min="0">
                    </div>
                `;
    } else if (type === 'unmoderated') {
        html = `
                    <div class="form-group">
                        <label>Duration (seconds)</label>
                        <input type="number" id="newEventDuration" value="300" min="0">
                    </div>
                `;
    } else if (type === 'speeches') {
        html = `
                        <div class="form-group">
                            <label>Subject/What are the speeches about?</label>
                            <input type="text" id="newSpeechSubject" placeholder="e.g., Opening Statements">
                        </div>
                        <div class="form-group">
                            <label>Total Time (seconds)</label>
                            <input type="number" id="newSpeechTotal" value="600" min="0">
                        </div>
                        <div class="form-group">
                            <label>Speaker Time (seconds)</label>
                            <input type="number" id="newSpeechSpeaker" value="60" min="0">
                        </div>
                    `;
    }

    fieldsDiv.innerHTML = html;
}

function addNewEvent() {
    const type = document.getElementById('newEventType').value;
    const title = document.getElementById('newEventTitle').value;
    const subtitle = document.getElementById('newEventSubtitle').value;
    const topicId = document.getElementById('newEventTopic').value;

    if (!title || !subtitle) {
        alert('Please fill in title and subtitle');
        return;
    }

    const newEvent = {
        id: Math.max(...appData.events.map((e) => e.id), 0) + 1,
        type,
        title,
        subtitle,
        topicId: topicId ? parseInt(topicId) : null,
    };

    if (type === 'moderated') {
        newEvent.totalTime = parseInt(
            document.getElementById('newEventTotalTime').value
        );
        newEvent.speakerTime = parseInt(
            document.getElementById('newEventSpeakerTime').value
        );
    } else if (type === 'unmoderated') {
        newEvent.duration = parseInt(
            document.getElementById('newEventDuration').value
        );
    } else if (type === 'speeches') {
        newEvent.speechSubject = (document.getElementById('newSpeechSubject').value || '').trim();
        newEvent.totalTime = parseInt(document.getElementById('newSpeechTotal').value);
        newEvent.speakerTime = parseInt(document.getElementById('newSpeechSpeaker').value);
    }

    // Find the index of closing remarks (or similar closing event)
    const closingIndex = appData.events.findIndex(
        (e) =>
            e.title.toLowerCase().includes('closing') ||
            e.title.toLowerCase().includes('adjourn')
    );

    // Insert before closing remarks if found, otherwise add to end
    if (closingIndex !== -1) {
        appData.events.splice(closingIndex, 0, newEvent);
        // If current event is at or after closing, adjust the index
        if (currentEventIndex >= closingIndex) {
            currentEventIndex++;
        }
    } else {
        appData.events.push(newEvent);
    }

    renderTimeline();
    closeAddEventModal();

    // Clear form
    document.getElementById('newEventTitle').value = '';
    document.getElementById('newEventSubtitle').value = '';
}

function addNewTopic() {
    const title = prompt('Enter topic title:');
    if (title) {
        appData.topics.push({
            id: Math.max(...appData.topics.map((t) => t.id), 0) + 1,
            title,
        });
        renderTopics();
    }
}

// JSON Functions
function openJSONEditor() {
    document.getElementById('jsonEditor').value = JSON.stringify(appData, null, 2);
    document.getElementById('jsonEditorModal').classList.add('active');
}

function closeJSONEditor() {
    document.getElementById('jsonEditorModal').classList.remove('active');
}

function saveJSON() {
    try {
        const newData = JSON.parse(document.getElementById('jsonEditor').value);
        appData = newData;
        ensureDefaults();
        currentEventIndex = 0;
        init();
        closeJSONEditor();
    } catch (e) {
        alert('Invalid JSON: ' + e.message);
    }
}

function copyJSON() {
    const json = JSON.stringify(appData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        alert('JSON copied to clipboard!');
    });
}

// Save/Load JSON to/from local file
function downloadJSON() {
    try {
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date()
            .toISOString()
            .replace(/[:]/g, '-')
            .replace('T', '_')
            .replace(/\..+/, '');
        a.href = url;
        a.download = `mun-timer_${ts}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('Failed to save JSON: ' + e.message);
    }
}

function triggerLoadJSON() {
    const input = document.getElementById('jsonFileInput');
    if (!input) {
        alert('File input not found.');
        return;
    }
    input.value = '';
    input.onchange = handleLoadJSONFromFile;
    input.click();
}

function handleLoadJSONFromFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const text = e.target.result;
            const parsed = JSON.parse(text);
            validateAppData(parsed);
            appData = parsed;
            ensureDefaults();
            currentEventIndex = 0;
            init();
            alert('JSON loaded successfully.');
        } catch (err) {
            alert('Failed to load JSON: ' + err.message);
        }
    };
    reader.onerror = function () {
        alert('Error reading file.');
    };
    reader.readAsText(file);
}

function validateAppData(data) {
    if (typeof data !== 'object' || data === null) throw new Error('Data must be an object');
    if (!Array.isArray(data.topics)) throw new Error('Missing topics array');
    if (!Array.isArray(data.events)) throw new Error('Missing events array');
    if (!Array.isArray(data.delegates)) throw new Error('Missing delegates array');
    if (!data.chair || typeof data.chair.name !== 'string') throw new Error('Missing chair name');
    // Basic per-item checks (non-exhaustive)
    data.topics.forEach((t, i) => {
        if (typeof t.id !== 'number' || typeof t.title !== 'string') {
            throw new Error(`Invalid topic at index ${i}`);
        }
    });
    data.events.forEach((ev, i) => {
        if (typeof ev.id !== 'number' || typeof ev.type !== 'string' || typeof ev.title !== 'string') {
            throw new Error(`Invalid event at index ${i}`);
        }
        if (ev.type === 'moderated') {
            if (typeof ev.totalTime !== 'number' || typeof ev.speakerTime !== 'number') {
                throw new Error(`Moderated event missing times at index ${i}`);
            }
        }
        if (ev.type === 'unmoderated') {
            if (typeof ev.duration !== 'number') {
                throw new Error(`Unmoderated event missing duration at index ${i}`);
            }
        }
        if (ev.type === 'speeches') {
            if (typeof ev.totalTime !== 'number' || typeof ev.speakerTime !== 'number') {
                throw new Error(`Speeches event missing times at index ${i}`);
            }
            if (ev.speechSubject !== undefined && typeof ev.speechSubject !== 'string') {
                throw new Error(`Speeches event has invalid subject at index ${i}`);
            }
        }
        // Optional: generic timer in seconds for any event type
        if (ev.timer !== undefined && (typeof ev.timer !== 'number' || ev.timer < 0)) {
            throw new Error(`Event at index ${i} has invalid timer (must be a non-negative number of seconds)`);
        }
    });
    data.delegates.forEach((d, i) => {
        if (typeof d.id !== 'number' || typeof d.code !== 'string' || typeof d.name !== 'string') {
            throw new Error(`Invalid delegate at index ${i}`);
        }
    });
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);

// General Speeches: subject + total and per-speaker timers
function renderGeneralSpeeches(event) {
    const subject = event.speechSubject ? `<div class="event-topic">${event.speechSubject}</div>` : '';
    timers.total.time = event.totalTime;
    timers.total.initial = event.totalTime;
    timers.speaker.time = event.speakerTime;
    timers.speaker.initial = event.speakerTime;
    return `
        ${subject}
        <div class="dual-timer">
            <div class="timer-section">
                <div class="timer-label">Total Time</div>
                <div class="timer-display" id="totalTimer">${formatTime(timers.total.time)}</div>
                <div class="timer-controls">
                    <button class="timer-btn" onclick="startTimer('total')">Start</button>
                    <button class="timer-btn pause" onclick="pauseTimer('total')">Pause</button>
                    <button class="timer-btn reset" onclick="resetTimer('total')">Reset</button>
                </div>
                <div class="timer-extension">
                    <label>Extension: <span id="totalExtensionLabel">${timers.total.extension}s</span></label>
                    <input type="range" min="5" max="300" step="5" value="${timers.total.extension}" 
                           oninput="updateExtension('total', this.value)" class="extension-slider">
                    <button class="timer-btn extend" onclick="extendTimer('total')">+ Extend</button>
                </div>
            </div>
            <div class="timer-section">
                <div class="timer-label">Speaker Time</div>
                <div class="timer-display" id="speakerTimer">${formatTime(timers.speaker.time)}</div>
                <div class="timer-controls">
                    <button class="timer-btn" onclick="startTimer('speaker')">Start</button>
                    <button class="timer-btn pause" onclick="pauseTimer('speaker')">Pause</button>
                    <button class="timer-btn reset" onclick="resetTimer('speaker')">Reset</button>
                </div>
                <div class="timer-extension">
                    <label>Extension: <span id="speakerExtensionLabel">${timers.speaker.extension}s</span></label>
                    <input type="range" min="5" max="300" step="5" value="${timers.speaker.extension}" 
                           oninput="updateExtension('speaker', this.value)" class="extension-slider">
                    <button class="timer-btn extend" onclick="extendTimer('speaker')">+ Extend</button>
                </div>
            </div>
        </div>
    `;
}

// ========== MOTIONS SYSTEM ==========

// Render motions panel
function renderMotions() {
    const queueContainer = document.getElementById('motionQueue');
    if (!queueContainer) return;

    if (motionQueue.length === 0) {
        queueContainer.innerHTML = '<div class="motion-queue-empty">No motions submitted yet</div>';
        return;
    }

    // Sort motions by disturbance level (lower = more disruptive = higher priority)
    // Then sort moderated caucuses by speaker time (shorter = higher priority)
    const sortedMotions = [...motionQueue].sort((a, b) => {
        // Primary sort: by disturbance level
        const disturbanceDiff = a.motion.disturbance - b.motion.disturbance;
        if (disturbanceDiff !== 0) return disturbanceDiff;

        // Secondary sort: if both are moderated caucuses, sort by speaker time (shorter first)
        if (a.motion.id === 'moderated' && b.motion.id === 'moderated') {
            const aSpeakerTime = a.params.speakerTime || Infinity;
            const bSpeakerTime = b.params.speakerTime || Infinity;
            return aSpeakerTime - bSpeakerTime;
        }

        return 0;
    });

    queueContainer.innerHTML = sortedMotions.map(item => {
        let paramsText = '';
        const params = item.params;

        // Show custom title/subtitle if provided
        if (params.customTitle) {
            paramsText += `Title: ${params.customTitle} · `;
        }
        if (params.customSubtitle) {
            paramsText += `Subtitle: ${params.customSubtitle} · `;
        }
        if (params.duration) {
            paramsText += `Duration: ${params.duration / 60} min · `;
        }
        if (params.totalTime) {
            paramsText += `Total: ${params.totalTime / 60} min · `;
        }
        if (params.speakerTime) {
            paramsText += `Speaker: ${params.speakerTime}s · `;
        }
        if (params.topicId) {
            const topic = appData.topics.find(t => t.id === params.topicId);
            if (topic) paramsText += `Topic: ${topic.title} · `;
        }
        if (params.documentTitle) {
            paramsText += `Doc: ${params.documentTitle} · `;
        }
        if (params.agendaItem) {
            paramsText += `Agenda: ${params.agendaItem} · `;
        }
        if (params.extension) {
            paramsText += `Extension: ${params.extension}s · `;
        }

        // Remove trailing separator
        paramsText = paramsText.replace(/ · $/, '');

        return `
            <div class="motion-queue-item">
                <div class="motion-header">
                    <div style="display: flex; align-items: center;">
                        <span class="disturbance-badge">${item.motion.disturbance}</span>
                        <span class="motion-title-text">${item.motion.title}</span>
                    </div>
                    <div class="motion-actions">
                        <button class="motion-action-btn vote-btn" onclick="startVotingOnMotion(${item.id})">Vote</button>
                        <button class="motion-action-btn remove-btn" onclick="removeMotionFromQueue(${item.id})">✗</button>
                    </div>
                </div>
                ${paramsText ? `<div class="motion-params">${paramsText}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Add motion to queue
function addMotionToQueue(motion, params) {
    const queueItem = {
        id: motionIdCounter++,
        motion: motion,
        params: params,
        timestamp: Date.now()
    };

    motionQueue.push(queueItem);
    renderMotions();
}

// Remove motion from queue
function removeMotionFromQueue(motionId) {
    motionQueue = motionQueue.filter(item => item.id !== motionId);
    renderMotions();
}

// Start voting on a specific motion from the queue
function startVotingOnMotion(motionId) {
    const queueItem = motionQueue.find(item => item.id === motionId);
    if (!queueItem) return;

    // Set as current motion
    currentMotion = {
        queueId: queueItem.id,
        motion: queueItem.motion,
        params: queueItem.params,
        votes: { yes: 0, no: 0, abstain: 0 }
    };

    showVotingDisplay();
}

// Clear all motions from queue
function clearMotionQueue() {
    motionQueue = [];
    renderMotions();
}

// Open motion modal
function openMotionModal(motionId) {
    const motion = motionTypes.find(m => m.id === motionId);
    if (!motion) return;

    const modal = document.getElementById('motionModal');
    const title = document.getElementById('motionModalTitle');
    const form = document.getElementById('motionParamsForm');

    title.textContent = `Motion: ${motion.title}`;

    if (!motion.requiresParams) {
        form.innerHTML = '<p style="color: #6c757d; margin: 12px 0;">This motion requires no additional parameters.</p>';
    } else {
        let formHTML = '';

        // Add title and subtitle fields for moderated and unmoderated caucuses
        if (motion.id === 'moderated' || motion.id === 'unmoderated') {
            formHTML += `
                <div class="form-group">
                    <label>Title (Optional)</label>
                    <input type="text" id="motionTitle" placeholder="${motion.eventTitle}" value="">
                </div>
                <div class="form-group">
                    <label>Subtitle (Optional)</label>
                    <input type="text" id="motionSubtitle" placeholder="${motion.eventSubtitle}" value="">
                </div>
            `;
        }

        if (motion.params.includes('duration')) {
            formHTML += `
                <div class="form-group">
                    <label>Duration (minutes)</label>
                    <input type="number" id="motionDuration" min="1" max="60" value="10" placeholder="Duration in minutes">
                </div>
            `;
        }

        if (motion.params.includes('totalTime')) {
            formHTML += `
                <div class="form-group">
                    <label>Total Time (minutes)</label>
                    <input type="number" id="motionTotalTime" min="1" max="120" value="10" placeholder="Total time in minutes">
                </div>
            `;
        }

        if (motion.params.includes('speakerTime')) {
            formHTML += `
                <div class="form-group">
                    <label>Speaker Time (seconds)</label>
                    <input type="number" id="motionSpeakerTime" min="10" max="300" value="60" placeholder="Speaker time in seconds">
                </div>
            `;
        }

        if (motion.params.includes('topic')) {
            const topicsOptions = appData.topics.map(t =>
                `<option value="${t.id}">${t.title}</option>`
            ).join('');
            formHTML += `
                <div class="form-group">
                    <label>Topic (Optional)</label>
                    <select id="motionTopic">
                        <option value="">None</option>
                        ${topicsOptions}
                    </select>
                </div>
            `;
        }

        if (motion.params.includes('documentTitle')) {
            formHTML += `
                <div class="form-group">
                    <label>Document Title</label>
                    <input type="text" id="motionDocTitle" placeholder="e.g., Draft Resolution 1.1" value="">
                </div>
            `;
        }

        if (motion.params.includes('agendaItem')) {
            formHTML += `
                <div class="form-group">
                    <label>Agenda Item</label>
                    <input type="text" id="motionAgendaItem" placeholder="New agenda item" value="">
                </div>
            `;
        }

        if (motion.params.includes('extension')) {
            formHTML += `
                <div class="form-group">
                    <label>Time Extension (seconds)</label>
                    <input type="number" id="motionExtension" min="10" max="300" value="30" placeholder="Extension in seconds">
                </div>
            `;
        }

        form.innerHTML = formHTML;
    }

    modal.style.display = 'flex';
    modal.dataset.motionId = motionId;
}

// Close motion modal
function closeMotionModal() {
    const modal = document.getElementById('motionModal');
    modal.style.display = 'none';
    delete modal.dataset.motionId;
}

// Submit motion for voting
function submitMotion() {
    const modal = document.getElementById('motionModal');
    const motionId = modal.dataset.motionId;
    const motion = motionTypes.find(m => m.id === motionId);

    if (!motion) return;

    // Collect parameters
    const params = {};

    // Capture custom title and subtitle for moderated/unmoderated caucuses
    if (motion.id === 'moderated' || motion.id === 'unmoderated') {
        const customTitle = document.getElementById('motionTitle')?.value;
        const customSubtitle = document.getElementById('motionSubtitle')?.value;

        if (customTitle && customTitle.trim()) {
            params.customTitle = customTitle.trim();
        }
        if (customSubtitle && customSubtitle.trim()) {
            params.customSubtitle = customSubtitle.trim();
        }
    }

    if (motion.params && motion.params.includes('duration')) {
        const val = document.getElementById('motionDuration')?.value;
        params.duration = val ? parseInt(val) * 60 : 600; // Convert to seconds
    }

    if (motion.params && motion.params.includes('totalTime')) {
        const val = document.getElementById('motionTotalTime')?.value;
        params.totalTime = val ? parseInt(val) * 60 : 600;
    }

    if (motion.params && motion.params.includes('speakerTime')) {
        const val = document.getElementById('motionSpeakerTime')?.value;
        params.speakerTime = val ? parseInt(val) : 60;
    }

    if (motion.params && motion.params.includes('topic')) {
        const val = document.getElementById('motionTopic')?.value;
        params.topicId = val ? parseInt(val) : null;
    }

    if (motion.params && motion.params.includes('documentTitle')) {
        params.documentTitle = document.getElementById('motionDocTitle')?.value || 'Untitled Document';
    }

    if (motion.params && motion.params.includes('agendaItem')) {
        params.agendaItem = document.getElementById('motionAgendaItem')?.value || 'New Agenda Item';
    }

    if (motion.params && motion.params.includes('extension')) {
        const val = document.getElementById('motionExtension')?.value;
        params.extension = val ? parseInt(val) : 30;
    }

    // Add motion to queue instead of immediately voting
    addMotionToQueue(motion, params);

    closeMotionModal();
}

// Open motion type selection panel
function openMotionTypePanel() {
    const modal = document.getElementById('motionTypeModal');
    const list = document.getElementById('motionTypesList');

    // Render motion types sorted by disturbance
    list.innerHTML = motionTypes.map(motion => `
        <div class="motion-type-option" onclick="openMotionModal('${motion.id}'); closeMotionTypePanel();">
            <span class="disturbance-badge">${motion.disturbance}</span>
            <div class="motion-info">
                <div class="motion-name">${motion.title}</div>
            </div>
        </div>
    `).join('');

    modal.style.display = 'flex';
}

// Close motion type selection panel
function closeMotionTypePanel() {
    const modal = document.getElementById('motionTypeModal');
    modal.style.display = 'none';
}

// Show voting display
function showVotingDisplay() {
    const display = document.getElementById('votingDisplay');
    const details = document.getElementById('motionDetails');

    if (!currentMotion) return;

    // Build motion details text
    let detailsHTML = `
        <div class="motion-title">${currentMotion.motion.title}</div>
    `;

    if (currentMotion.params) {
        let paramsText = '';

        if (currentMotion.params.customTitle) {
            paramsText += `Title: ${currentMotion.params.customTitle}<br>`;
        }
        if (currentMotion.params.customSubtitle) {
            paramsText += `Subtitle: ${currentMotion.params.customSubtitle}<br>`;
        }
        if (currentMotion.params.duration) {
            paramsText += `Duration: ${currentMotion.params.duration / 60} minutes<br>`;
        }
        if (currentMotion.params.totalTime) {
            paramsText += `Total Time: ${currentMotion.params.totalTime / 60} minutes<br>`;
        }
        if (currentMotion.params.speakerTime) {
            paramsText += `Speaker Time: ${currentMotion.params.speakerTime} seconds<br>`;
        }
        if (currentMotion.params.topicId) {
            const topic = appData.topics.find(t => t.id === currentMotion.params.topicId);
            if (topic) paramsText += `Topic: ${topic.title}<br>`;
        }
        if (currentMotion.params.documentTitle) {
            paramsText += `Document: ${currentMotion.params.documentTitle}<br>`;
        }
        if (currentMotion.params.agendaItem) {
            paramsText += `Agenda: ${currentMotion.params.agendaItem}<br>`;
        }
        if (currentMotion.params.extension) {
            paramsText += `Extension: ${currentMotion.params.extension} seconds<br>`;
        }

        if (paramsText) {
            detailsHTML += `<div class="motion-params">${paramsText}</div>`;
        }
    }

    details.innerHTML = detailsHTML;

    // Reset input fields
    document.getElementById('yesInput').value = 0;
    document.getElementById('noInput').value = 0;
    document.getElementById('abstainInput').value = 0;

    updateVotingDisplay();
    display.style.display = 'block';
}

// Update voting display
function updateVotingDisplay() {
    if (!currentMotion) return;

    const yesVotes = currentMotion.votes.yes;
    const noVotes = currentMotion.votes.no;
    const abstainVotes = currentMotion.votes.abstain;

    // Simple majority: more than half of votes cast (excluding abstentions for the threshold)
    const votesForMajority = yesVotes + noVotes;
    const required = Math.floor(votesForMajority / 2) + 1;

    document.getElementById('requiredVotes').textContent = required;

    const resultDiv = document.getElementById('votingResult');

    if (votesForMajority === 0) {
        resultDiv.className = 'voting-result pending';
        resultDiv.textContent = 'Enter vote counts';
    } else if (yesVotes >= required) {
        resultDiv.className = 'voting-result passed';
        resultDiv.textContent = `✓ MOTION PASSES (${yesVotes} Yes / ${noVotes} No / ${abstainVotes} Abstain)`;
    } else {
        resultDiv.className = 'voting-result failed';
        resultDiv.textContent = `✗ MOTION FAILS (${yesVotes} Yes / ${noVotes} No / ${abstainVotes} Abstain)`;
    }
}

// Update voting from input fields
function updateVotingFromInputs() {
    if (!currentMotion) return;

    const yesInput = document.getElementById('yesInput');
    const noInput = document.getElementById('noInput');
    const abstainInput = document.getElementById('abstainInput');

    currentMotion.votes.yes = parseInt(yesInput.value) || 0;
    currentMotion.votes.no = parseInt(noInput.value) || 0;
    currentMotion.votes.abstain = parseInt(abstainInput.value) || 0;

    updateVotingDisplay();
}

// Finalize voting
function finalizeVoting() {
    if (!currentMotion) return;

    const yesVotes = currentMotion.votes.yes;
    const noVotes = currentMotion.votes.no;
    const votesForMajority = yesVotes + noVotes;
    const required = Math.floor(votesForMajority / 2) + 1;

    if (votesForMajority === 0) {
        alert('Please enter vote counts before finalizing.');
        return;
    }

    if (yesVotes >= required) {
        // Motion passes - create event
        createEventFromMotion();

        // Remove the voted motion from queue
        if (currentMotion.queueId) {
            removeMotionFromQueue(currentMotion.queueId);
        }

        // Clear all other motions from queue
        clearMotionQueue();
    } else {
        // Motion fails - just remove it from queue
        if (currentMotion.queueId) {
            removeMotionFromQueue(currentMotion.queueId);
        }
        setTimeout(() => clearMotionVoting(), 1500);
    }
}

// Cancel motion voting
function cancelMotionVoting() {
    if (confirm('Cancel this motion without voting?')) {
        // Remove from queue if it has a queue ID
        if (currentMotion && currentMotion.queueId) {
            removeMotionFromQueue(currentMotion.queueId);
        }
        clearMotionVoting();
    }
}

// Create event from passed motion
function createEventFromMotion() {
    if (!currentMotion) return;

    const motion = currentMotion.motion;
    const params = currentMotion.params;

    // Generate new event ID
    const newId = Math.max(...appData.events.map(e => e.id), 0) + 1;

    let newEvent = {
        id: newId,
        type: motion.type,
        title: params.customTitle || motion.eventTitle,
        subtitle: params.customSubtitle || motion.eventSubtitle,
        topicId: params.topicId || null
    };

    // Add type-specific parameters
    if (motion.type === 'moderated' && params.totalTime && params.speakerTime) {
        newEvent.totalTime = params.totalTime;
        newEvent.speakerTime = params.speakerTime;
    } else if (motion.type === 'unmoderated' && params.duration) {
        newEvent.duration = params.duration;
    } else if (motion.id === 'yield_time' && params.extension) {
        // Add timer for time extension events
        newEvent.timer = params.extension;
    }

    // Update subtitle with specific details (only if custom subtitle wasn't provided)
    if (!params.customSubtitle) {
        if (params.documentTitle) {
            newEvent.subtitle = params.documentTitle;
        } else if (params.agendaItem) {
            newEvent.subtitle = params.agendaItem;
        } else if (params.extension) {
            // For time extensions, show the extension time in subtitle
            newEvent.subtitle = `${params.extension} seconds`;
        } else if (params.topicId) {
            const topic = appData.topics.find(t => t.id === params.topicId);
            if (topic) newEvent.subtitle = topic.title;
        }
    }

    // Add event to timeline
    appData.events.push(newEvent);
    renderTimeline();

    // Switch to new event
    const newIndex = appData.events.length - 1;
    setCurrentEvent(newIndex);

    // Clear motion
    setTimeout(() => clearMotionVoting(), 2000);
}

// Clear motion voting
function clearMotionVoting() {
    currentMotion = null;
    const display = document.getElementById('votingDisplay');
    display.style.display = 'none';
}

// Toggle motions panel visibility
function toggleMotionsPanel() {
    const panel = document.getElementById('motionsPanel');
    const btn = event.target;

    panel.classList.toggle('collapsed');

    // Update button text based on state
    if (panel.classList.contains('collapsed')) {
        btn.textContent = '+';
        btn.title = 'Show Motion Panel';
    } else {
        btn.textContent = '−';
        btn.title = 'Hide Motion Panel';
    }
}

// Motion panel resizing functionality
function initMotionPanelResize() {
    const resizeHandle = document.getElementById('motionsResizeHandle');
    const motionsPanel = document.getElementById('motionsPanel');

    if (!resizeHandle || !motionsPanel) return;

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
        // Don't resize if panel is collapsed
        if (motionsPanel.classList.contains('collapsed')) return;

        isResizing = true;
        startY = e.clientY;
        startHeight = motionsPanel.offsetHeight;

        motionsPanel.classList.add('resizing');
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        // Calculate new height (inverted because we're dragging from top)
        const deltaY = startY - e.clientY;
        const newHeight = startHeight + deltaY;

        // Set minimum and maximum heights
        const minHeight = 150; // Minimum height to show content
        const maxHeight = window.innerHeight * 0.7; // Max 70% of viewport

        if (newHeight >= minHeight && newHeight <= maxHeight) {
            motionsPanel.style.maxHeight = `${newHeight}px`;
        }

        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            motionsPanel.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}
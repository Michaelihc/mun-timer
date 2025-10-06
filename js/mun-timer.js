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
};

let currentEventIndex = 0;
let timers = {
    total: { time: 0, interval: null, running: false, initial: 0 },
    speaker: { time: 0, interval: null, running: false, initial: 0 },
};

// Initialize App
function init() {
    renderTopics();
    renderTimeline();
    renderDelegates();
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
    bar.innerHTML = `
                <div class="chair-badge">👤 ${appData.chair.name}</div>
                ${appData.delegates
            .map((d) => `<div class="delegate-badge" title="${d.name}">${d.code}</div>`)
            .join('')}
            `;
}

// Move Topic
function moveTopic(index, direction) {
    if (index + direction < 0 || index + direction >= appData.topics.length)
        return;
    const temp = appData.topics[index];
    appData.topics[index] = appData.topics[index + direction];
    appData.topics[index + direction] = temp;
    renderTopics();
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
        default:
            // For general/other events, show generic timer if configured
            if (typeof event.timer === 'number' && event.timer > 0) {
                content += renderGenericTimer(event);
            } else {
                content += '<div style="margin-top: 40px; color: #999;">No timer for this event</div>';
            }
    }

    display.innerHTML = content;
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
            `;
}

// Render Voting
function renderVoting(event) {
    let html = `
                <div class="voting-container">
                    <div class="vote-inputs">
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

// Voting Functions
function updateVoteVisualization() {
    const forVotes = parseInt(document.getElementById('voteFor').value) || 0;
    const againstVotes =
        parseInt(document.getElementById('voteAgainst').value) || 0;
    const abstainVotes =
        parseInt(document.getElementById('voteAbstain').value) || 0;

    const total = forVotes + againstVotes + abstainVotes;

    if (total === 0) {
        document.getElementById('voteVisualizer').innerHTML = `
                    <div class="vote-bar for" style="width: 33.33%">0</div>
                    <div class="vote-bar against" style="width: 33.33%">0</div>
                    <div class="vote-bar abstain" style="width: 33.33%">0</div>
                `;
        document.getElementById('voteResult').style.display = 'none';
        return;
    }

    const forPercent = (forVotes / total) * 100;
    const againstPercent = (againstVotes / total) * 100;
    const abstainPercent = (abstainVotes / total) * 100;

    let html = '';
    if (forVotes > 0) {
        html += `<div class="vote-bar for" style="width: ${forPercent}%">${forVotes}</div>`;
    }
    if (againstVotes > 0) {
        html += `<div class="vote-bar against" style="width: ${againstPercent}%">${againstVotes}</div>`;
    }
    if (abstainVotes > 0) {
        html += `<div class="vote-bar abstain" style="width: ${abstainPercent}%">${abstainVotes}</div>`;
    }

    document.getElementById('voteVisualizer').innerHTML = html;

    // Determine result
    const resultElement = document.getElementById('voteResult');
    if (forVotes > againstVotes) {
        resultElement.textContent = 'PASSED';
        resultElement.className = 'vote-result passed';
        resultElement.style.display = 'block';
    } else if (againstVotes > forVotes) {
        resultElement.textContent = 'FAILED';
        resultElement.className = 'vote-result failed';
        resultElement.style.display = 'block';
    } else {
        resultElement.textContent = 'TIE';
        resultElement.className = 'vote-result';
        resultElement.style.display = 'block';
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

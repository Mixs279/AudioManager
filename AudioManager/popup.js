const PRESETS = {
    "Flat": [0, 0, 0, 0, 0],
    "Bass Booster": [7, 4, 1, 0, -2],
    "Vocal Booster": [-4, 0, 3, 5, 2],
    "Rock": [5, 2, -1, 3, 5],
    "Pop": [-2, 1, 3, 2, -2],
    "Classic": [4, 2, 0, 2, 4],
    "Club": [4, 5, 2, 1, 0]
};

const DEFAULT_SETTINGS = {
    volume: 100,
    eqEnabled: false,
    preset: "Flat",
    eqBands: [0, 0, 0, 0, 0]
};

let currentTab = null;
let currentSettings = {
    ...DEFAULT_SETTINGS
};
let visualizerPort = null;

// DOM Selectors
const landingView = document.getElementById('landingView');
const dashboardView = document.getElementById('dashboardView');
const unsupportedView = document.getElementById('unsupportedView');

const activateBtn = document.getElementById('activateBtn');
const deactivateBtn = document.getElementById('deactivateBtn');

const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const resetBtn = document.getElementById('resetBtn');

const eqToggle = document.getElementById('eqToggle');
const eqPanel = document.getElementById('eqPanel');

const dropdownTrigger = document.getElementById('dropdownTrigger');
const dropdownMenu = document.getElementById('dropdownMenu');
const selectedPresetText = document.getElementById('selectedPreset');

const bandSliders = document.querySelectorAll('.vertical-slider');
const miniVisualizer = document.getElementById('miniVisualizer');
const canvasCtx = miniVisualizer.getContext('2d');
const volumeActions = document.querySelector('.volume-actions');

document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });
    currentTab = tab;

    const isSupported = tab && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'));
    if (!isSupported) {
        showView(unsupportedView);
        return;
    }

    // Fetch active tab structures
    chrome.runtime.sendMessage({
        type: 'GET_ACTIVE_TABS'
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn("Could not retrieve active captured tabs:", chrome.runtime.lastError.message);
            showView(landingView);
            return;
        }

        const activeTabs = response?.activeTabs || [];
        const isCaptured = activeTabs.includes(tab.id);

        chrome.storage.local.get(['tabs'], (result) => {
            const savedTabs = result.tabs || {};
            currentSettings = savedTabs[tab.id] || {
                ...DEFAULT_SETTINGS
            };

            if (isCaptured) {
                initDashboard();
                showView(dashboardView);
            } else {
                showView(landingView);
            }
        }
        );
    }
    );
}
);

function showView(viewElement) {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
    }
    );
    viewElement.style.display = 'block';
    setTimeout( () => {
        viewElement.classList.add('active');
    }
    , 10);
}

// Power Button Activator (Requests Tab Stream Capture ID)
activateBtn.addEventListener('click', () => {
    if (!currentTab)
        return;

    chrome.tabCapture.getMediaStreamId({
        targetTabId: currentTab.id
    }, (streamId) => {
        if (chrome.runtime.lastError) {
            console.warn("Capture context failed verification:", chrome.runtime.lastError.message);
            return;
        }
        if (!streamId) {
            console.warn("Capture context failed verification: No stream ID was returned.");
            return;
        }

        chrome.runtime.sendMessage({
            type: 'START_CAPTURE',
            tabId: currentTab.id,
            streamId,
            settings: currentSettings
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Failed to route capture to processor:", chrome.runtime.lastError.message);
                return;
            }
            saveSettings();
            initDashboard();
            showView(dashboardView);
        }
        );
    }
    );
}
);

// Deactivator Control (Re-routes straight back to Chrome Default Engine)
deactivateBtn.addEventListener('click', () => {
    if (!currentTab)
        return;

    chrome.runtime.sendMessage({
        type: 'STOP_CAPTURE',
        tabId: currentTab.id
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error stopping capture:", chrome.runtime.lastError.message);
        }
        stopVisualizer();
        showView(landingView);
    }
    );
}
);

function initDashboard() {
    // Sync core inputs
    volumeSlider.value = currentSettings.volume;
    updateVolumeUI(currentSettings.volume);

    eqToggle.checked = currentSettings.eqEnabled;
    toggleEQPanelUI(currentSettings.eqEnabled);

    selectedPresetText.textContent = currentSettings.preset;
    updateDropdownSelectionUI(currentSettings.preset);

    // Sync Equalizer Fader lines
    bandSliders.forEach( (slider, idx) => {
        const bandValue = currentSettings.eqBands[idx];
        slider.value = bandValue;
        updateBandLabelUI(idx, bandValue);
        updateSliderBackgroundFill(slider);
    }
    );

    updateSliderBackgroundFill(volumeSlider);
    startVisualizer();
}

// Slider Element Input Adjusters
volumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    currentSettings.volume = val;
    updateVolumeUI(val);
    updateSliderBackgroundFill(volumeSlider);
    pushSettings();
}
);

resetBtn.addEventListener('click', () => {
    animateSlider(volumeSlider, 100, () => {
        currentSettings.volume = 100;
        updateVolumeUI(100);
        pushSettings();
    }
    );
}
);

eqToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    currentSettings.eqEnabled = enabled;
    toggleEQPanelUI(enabled);
    pushSettings();
}
);

// EQ Individual Band Drag updates
bandSliders.forEach( (slider, idx) => {
    slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        currentSettings.eqBands[idx] = val;
        updateBandLabelUI(idx, val);
        updateSliderBackgroundFill(slider);

        if (currentSettings.preset !== "Custom") {
            currentSettings.preset = "Custom";
            selectedPresetText.textContent = "Custom";
            updateDropdownSelectionUI("Custom");
        }
        pushSettings();
    }
    );
}
);

// Dropdown Logic
dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('open');
    const arrow = dropdownTrigger.querySelector('.dropdown-arrow');
    arrow.style.transform = dropdownMenu.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
}
);

document.addEventListener('click', () => {
    dropdownMenu.classList.remove('open');
    const arrow = dropdownTrigger.querySelector('.dropdown-arrow');
    if (arrow)
        arrow.style.transform = 'rotate(0deg)';
}
);

dropdownMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.m3-dropdown-item');
    if (!item)
        return;

    const selectedPreset = item.dataset.preset;
    currentSettings.preset = selectedPreset;
    selectedPresetText.textContent = selectedPreset;
    updateDropdownSelectionUI(selectedPreset);

    if (PRESETS[selectedPreset]) {
        const targetBands = PRESETS[selectedPreset];
        targetBands.forEach( (targetVal, idx) => {
            animateSlider(bandSliders[idx], targetVal, () => {
                currentSettings.eqBands[idx] = targetVal;
                updateBandLabelUI(idx, targetVal);
                if (idx === targetBands.length - 1) {
                    pushSettings();
                }
            }
            );
        }
        );
    }
}
);

// Helpers: Visual styling & update handlers
function updateVolumeUI(value) {
    volumeValue.textContent = `${value}%`;

    if (parseInt(value) === 100) {
        resetBtn.classList.add('hidden');
        volumeActions.classList.add('collapsed');
    } else {
        resetBtn.classList.remove('hidden');
        volumeActions.classList.remove('collapsed');
    }
}

function toggleEQPanelUI(open) {
    if (open) {
        eqPanel.classList.add('open');
    } else {
        eqPanel.classList.remove('open');
    }
}

function updateBandLabelUI(index, val) {
    const lbl = document.getElementById(`val${index}`);
    if (lbl) {
        lbl.textContent = val > 0 ? `+${val}dB` : `${val}dB`;
    }
}

function updateDropdownSelectionUI(presetName) {
    document.querySelectorAll('.m3-dropdown-item').forEach(item => {
        if (item.dataset.preset === presetName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    }
    );
}

// Fader Fill calculations (Emulates Material 3 Slider style)
function updateSliderBackgroundFill(slider) {
    const val = parseFloat(slider.value);
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const percentage = ((val - min) / (max - min)) * 100;

    slider.style.background = `linear-gradient(to right, var(--md-sys-color-primary) ${percentage}%, var(--md-sys-color-surface-variant) ${percentage}%)`;
}

// Linear Interpolator for natural mechanical sliding movements
function animateSlider(slider, targetValue, onStep) {
    const startValue = parseFloat(slider.value);
    const startTime = performance.now();
    const duration = 200;

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth Ease-Out Cubic Curve
        const ease = 1 - Math.pow(1 - progress, 3);
        const currVal = startValue + (targetValue - startValue) * ease;

        slider.value = currVal;
        updateSliderBackgroundFill(slider);

        if (onStep)
            onStep();

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

// Persistent storage pipeline
function saveSettings() {
    if (!currentTab)
        return;
    chrome.storage.local.get(['tabs'], (result) => {
        const tabs = result.tabs || {};
        tabs[currentTab.id] = currentSettings;
        chrome.storage.local.set({
            tabs
        });
    }
    );
}

function pushSettings() {
    saveSettings();
    if (!currentTab)
        return;
    chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        tabId: currentTab.id,
        settings: currentSettings
    });
}

// Real-Time Canvas Visualizer Frame Loops
function startVisualizer() {
    stopVisualizer();

    visualizerPort = chrome.runtime.connect({
        name: 'visualizer'
    });
    visualizerPort.postMessage({
        type: 'SET_ACTIVE_TAB',
        tabId: currentTab.id
    });

    visualizerPort.onMessage.addListener( (msg) => {
        if (msg.type === 'AUDIO_DATA') {
            drawVisualizer(msg.data);
            checkAudibleStatus(msg.data);
        }
    }
    );

    visualizerPort.onDisconnect.addListener( () => {
        // Silence runtime error logs when visualizer ports cleanly detach
        if (chrome.runtime.lastError) {
            console.log("Visualizer cleanly disconnected.");
        }
    }
    );
}

function stopVisualizer() {
    if (visualizerPort) {
        visualizerPort.disconnect();
        visualizerPort = null;
    }
    drawVisualizer([]);
    setAudioAudibleUI(false);
}

function drawVisualizer(data) {
    canvasCtx.clearRect(0, 0, miniVisualizer.width, miniVisualizer.height);

    const bars = 8;
    const barWidth = 6;
    const gap = 4;
    const startX = (miniVisualizer.width - (bars * barWidth + (bars - 1) * gap)) / 2;

    if (!data || data.length === 0) {
        canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let i = 0; i < bars; i++) {
            const x = startX + i * (barWidth + gap);
            canvasCtx.beginPath();
            canvasCtx.roundRect(x, miniVisualizer.height / 2 - 1, barWidth, 2, 1);
            canvasCtx.fill();
        }
        return;
    }

    for (let i = 0; i < bars; i++) {
        const dataIdx = Math.floor((i / bars) * (data.length / 2));
        const magnitude = data[dataIdx] || 0;
        const peakHeight = Math.max(2, (magnitude / 255) * miniVisualizer.height);

        const x = startX + i * (barWidth + gap);
        const y = (miniVisualizer.height - peakHeight) / 2;

        const gradient = canvasCtx.createLinearGradient(0, y, 0, y + peakHeight);
        gradient.addColorStop(0, '#EFB8C8');
        gradient.addColorStop(1, '#D0BCFF');

        canvasCtx.fillStyle = gradient;
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barWidth, peakHeight, 3);
        canvasCtx.fill();
    }
}

function checkAudibleStatus(data) {
    if (!data)
        return;
    const sum = data.reduce( (acc, val) => acc + val, 0);
    const avg = sum / data.length;
    setAudioAudibleUI(avg > 3);
}

function setAudioAudibleUI(isAudible) {
    const indicator = document.querySelector('.status-indicator');
    const txt = document.getElementById('statusText');
    if (isAudible) {
        indicator.classList.add('audible');
        txt.textContent = "LIVE AUDIO PLAYING";
    } else {
        indicator.classList.remove('audible');
        txt.textContent = "CONNECTED (IDLE)";
    }
}

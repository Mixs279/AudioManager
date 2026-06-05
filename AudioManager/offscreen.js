const activeCaptures = {};
let visualizerInterval = null;
let activePort = null;
let activeVisualizerTabId = null;

chrome.runtime.onMessage.addListener( (message, sender, sendResponse) => {
    if (message.target !== 'offscreen')
        return false;

    if (message.type === 'START_CAPTURE') {
        const {streamId, tabId, settings} = message;
        initAudioCapture(tabId, streamId, settings).then( () => {
            sendResponse({
                success: true
            });
        }
        ).catch( (err) => {
            sendResponse({
                error: err.message
            });
        }
        );
        return true;
        // async return path
    } else if (message.type === 'UPDATE_SETTINGS') {
        const {tabId, settings} = message;
        updateAudioSettings(tabId, settings);
        sendResponse({
            success: true
        });
    } else if (message.type === 'STOP_CAPTURE') {
        const {tabId} = message;
        stopAudioCapture(tabId);
        sendResponse({
            success: true
        });
    } else if (message.type === 'GET_ACTIVE_TABS') {
        sendResponse({
            activeTabs: Object.keys(activeCaptures).map(Number)
        });
    }
    return false;
}
);

// Port connection manages efficient visualizer data streaming to popup
chrome.runtime.onConnect.addListener( (port) => {
    if (port.name === 'visualizer') {
        activePort = port;
        port.onMessage.addListener( (msg) => {
            if (msg.type === 'SET_ACTIVE_TAB') {
                activeVisualizerTabId = msg.tabId;
                startVisualizerStream();
            }
        }
        );
        port.onDisconnect.addListener( () => {
            activePort = null;
            activeVisualizerTabId = null;
            stopVisualizerStream();
        }
        );
    }
}
);

async function initAudioCapture(tabId, streamId, settings) {
    if (activeCaptures[tabId])
        return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: false
        });

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);

        const gainNode = audioContext.createGain();
        gainNode.gain.value = settings.volume / 100;

        const frequencies = [60, 230, 910, 4000, 14000];
        const filters = frequencies.map( (freq, index) => {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.0;
            filter.gain.value = settings.eqEnabled ? settings.eqBands[index] : 0;
            return filter;
        }
        );

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;

        let lastNode = source;
        filters.forEach(filter => {
            lastNode.connect(filter);
            lastNode = filter;
        }
        );
        lastNode.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioContext.destination);

        activeCaptures[tabId] = {
            audioContext,
            stream,
            gainNode,
            filters,
            analyser,
            settings: {
                ...settings
            }
        };

        await audioContext.resume();
    } catch (err) {
        console.error('Failed to capture audio stream:', err);
        throw err;
    }
}

function updateAudioSettings(tabId, settings) {
    const capture = activeCaptures[tabId];
    if (!capture)
        return;

    capture.settings = {
        ...capture.settings,
        ...settings
    };

    if (settings.volume !== undefined) {
        capture.gainNode.gain.value = settings.volume / 100;
    }

    if (settings.eqEnabled !== undefined || settings.eqBands !== undefined) {
        const enabled = capture.settings.eqEnabled;
        const bands = capture.settings.eqBands;
        capture.filters.forEach( (filter, index) => {
            filter.gain.value = enabled ? bands[index] : 0;
        }
        );
    }
}

function stopAudioCapture(tabId) {
    const capture = activeCaptures[tabId];
    if (capture) {
        capture.stream.getTracks().forEach(track => track.stop());
        capture.audioContext.close();
        delete activeCaptures[tabId];
    }
}

function startVisualizerStream() {
    stopVisualizerStream();
    visualizerInterval = setInterval( () => {
        if (!activePort || !activeVisualizerTabId)
            return;
        const capture = activeCaptures[activeVisualizerTabId];
        if (capture) {
            const dataArray = new Uint8Array(capture.analyser.frequencyBinCount);
            capture.analyser.getByteFrequencyData(dataArray);
            activePort.postMessage({
                type: 'AUDIO_DATA',
                data: Array.from(dataArray)
            });
        } else {
            activePort.postMessage({
                type: 'AUDIO_DATA',
                data: Array(32).fill(0)
            });
        }
    }
    , 33);
}

function stopVisualizerStream() {
    if (visualizerInterval) {
        clearInterval(visualizerInterval);
        visualizerInterval = null;
    }
}

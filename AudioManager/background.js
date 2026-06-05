let creatingOffscreenPromise = null;

// Lock mechanism to prevent race conditions during concurrent offscreen generation
async function setupOffscreen() {
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (contexts.length > 0) {
        return;
    }

    if (creatingOffscreenPromise) {
        await creatingOffscreenPromise;
        return;
    }

    creatingOffscreenPromise = chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'To run Web Audio API for gain controls and multi-band equalizer filters.'
    });

    await creatingOffscreenPromise;
    creatingOffscreenPromise = null;
}

chrome.runtime.onMessage.addListener( (message, sender, sendResponse) => {
    // Explicitly handle all known messaging routes
    if (message.type === 'START_CAPTURE' || message.type === 'UPDATE_SETTINGS' || message.type === 'STOP_CAPTURE' || message.type === 'GET_ACTIVE_TABS') {

        setupOffscreen().then( () => {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                ...message
            }, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        error: chrome.runtime.lastError.message
                    });
                } else {
                    sendResponse(response);
                }
            }
            );
        }
        ).catch( (err) => {
            sendResponse({
                error: err.message
            });
        }
        );

        return true;
        // Keep message channel open for asynchronous responses
    }
}
);

chrome.tabs.onRemoved.addListener( (tabId) => {
    setupOffscreen().then( () => {
        chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'STOP_CAPTURE',
            tabId
        }).catch( () => {}
        );
    }
    );
    chrome.storage.local.get(['tabs'], (result) => {
        if (result.tabs && result.tabs[tabId]) {
            const updated = {
                ...result.tabs
            };
            delete updated[tabId];
            chrome.storage.local.set({
                tabs: updated
            });
        }
    }
    );
}
);

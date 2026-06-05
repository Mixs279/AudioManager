# Audio Manager (v1.4.0)

An elegant, fully-featured tab audio manager built using the system. Take complete command of your browser tab's volume with a 0% to 200% volume amplifier, a 5-band peak equalizer with presets, and a real-time reactive audio visualizer. 

This extension is fully compliant with **Chrome Manifest V3**, utilizing an offscreen processing document to keep audio amplification and equalization persistent while you browse across other tabs.

---

## 🌟 Key Features

* **Volume Amplification (0% to 200%)**: Smooth slider boost control with interactive track fills.
* **Smart Reset Button**: A dynamic "Reset to 100%" fader button that smoothly scales, fades, and collapses the layout space when the volume is already at the default state.
* **5-Band Equalizer (60Hz, 230Hz, 910Hz, 4kHz, 14kHz)**: High-fidelity individual peaking filters with a gain scale ranging from -12dB to +12dB.
* **Studio Sound Presets**: Custom select dropdown menu supporting various profiles (`Flat`, `Bass Booster`, `Vocal Booster`, `Rock`, `Pop`, `Classic`, `Club`) with automated motor-fader animations.
* **Audio Status Indicator**: Detects if the current tab is playing audio, showing a reactive visual alert (`LIVE AUDIO PLAYING` vs `CONNECTED (IDLE)`).
* **Real-time Canvas Visualizer**: Low-latency glowing vertical spectrum drawn using HTML5 canvas directly on the interface.
* **Manifest V3 Stable**: Uses Chrome's standard Offscreen Document API for background audio processing, preventing runtime stream termination.

---

## 📂 Project Structure

Ensure your local directory is organized as follows:

```text
AudioManager/
├── manifest.json
├── background.js
├── offscreen.html
├── offscreen.js
├── popup.html
├── popup.css
├── popup.js
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🛠️ Installation Instructions

To install and run the extension locally in developer mode:

1. **Prepare the Extension Directory**:
   * Save the files listed in the file structure above to a folder named `AudioManager` on your computer.
   * Ensure you have PNG icons placed in the `icons/` subdirectory.

2. **Access Chrome Extensions**:
   * Open Google Chrome and type `chrome://extensions/` into the URL search bar.

3. **Enable Developer Mode**:
   * Toggle the **Developer mode** switch located in the upper-right corner of the Extensions dashboard.

4. **Load the Unpacked Folder**:
   * Click the **Load unpacked** button in the upper-left corner.
   * Choose the `AudioManager` root directory containing your `manifest.json`.

5. **Pin the Extension**:
   * Click the puzzle icon in Chrome's toolbar and pin **Audio Manager** for quick access.

---

## 📖 How to Use

1. **Activate Capture**: 
   Navigate to any media page (such as YouTube, Spotify, or SoundCloud) and click the extension icon. Click **Activate on Tab**. This redirects the audio route through the extension's mixing engine.
2. **Amplify**: 
   Drag the main slider past 100% to boost weak audio. Click **Reset to 100%** to return to standard system volume.
3. **Equalize**: 
   Turn on the **Equalizer** toggle switch. Select an option from the preset dropdown menu or manually adjust individual sliders to fit your acoustics.
4. **Deactivate**: 
   To disconnect the extension and hand audio routing back to standard Chrome default behaviors, click the power-off icon in the top right.

*Note: Due to security settings enforced by Chrome, extensions cannot inject audio capture hooks into native system pages (e.g., `chrome://` settings, the Chrome Web Store, or empty start pages).*

---

## 📝 Commit & Development Log

* **v1.0.0 (Commit 1):** Configured initial core components, including Manifest V3 permissions, background capture routes, offscreen audio context setup, and the basic popup UI.
* **v1.1.0 (Commit 2):** Solved communication channel port exceptions and corrected tab state checks that caused the reactivation loop.
* **v1.2.0 (Commit 3):** Appended a custom footer element and styling to display credit details cleanly.
* **v1.3.0 (Commit 4):** Configured dynamic visibility parameters to automatically hide the reset button when set to exactly 100%.
* **v1.4.0 (Commit 5):** Added conditional CSS transition delays, allowing the layout space below the slider to smoothly collapse and open.

---

## 💖 Credits

Made with 💖 by [Mycho Famadico](https://www.facebook.com/mixss14)

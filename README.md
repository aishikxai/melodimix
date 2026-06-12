# Spoptify 🎵 - Premium Offline Music Deck

Spoptify is a premium, client-side, 100% ad-free, Spotify-inspired music player. It is built using clean native Web APIs (HTML5, Vanilla CSS, and modern modular ES6 JavaScript) and works completely offline without any internet connection.

[![Deploy to GitHub Pages](https://github.com/aishikxai/New-1/actions/workflows/deploy.yml/badge.svg)](https://github.com/aishikxai/New-1/actions/workflows/deploy.yml)

## Core Features

- **Installable PWA**: Easily install it on your Android device, iPhone, or Desktop. Once installed, it launches in a standalone, immersive full-screen window (hiding browser bars) and functions like a native app (an APK).
- **Procedural Ambient Synthesizer**: No local music files? Spoptify has a built-in beat synthesizer running locally. It dynamically schedules chill kicks, snares, hats, analog bass, chord pads, and improvises a lofi melody using browser oscillators in real time.
- **Local Audio Library**: Drag and drop or upload your personal MP3, WAV, FLAC, M4A, or OGG files. The files are securely saved locally inside your browser's persistent `IndexedDB` database.
- **Real-Time Canvas Visualizers**: Five reactive animation presets (Circular Portal, Neon Equalizer Bars, Oscilloscope Wave, and Floating Constellations) rendered on canvas matching audio frequency nodes.
- **5-Band Equalizer**: Adjust sound ranges: 60Hz, 250Hz, 1kHz, 4kHz, and 16kHz, or choose acoustic presets (Bass Boost, Pop, Rock, Electronic, Vocal, Flat).
- **Full Player Features**: Queue management, volume control (with mute shortcut), seek control, shuffle playback, repeat modes, and theme customizers.

---

## 📱 Mobile Installation Guide (Alternative to APK)

Instead of compiling and signing a heavy native Android APK (which is restricted from running on iPhones), Spoptify uses Progressive Web App technology. It is lighter, faster, requires 0 space, and compiles locally in the browser:

### On Android (Chrome / Edge):
1. Open your web browser and navigate to the deployed website: `https://aishikxai.github.io/New-1/`
2. Wait for the page to load, then click the **"Add Spoptify to Home Screen"** banner, or click the three dots menu in the top-right and select **"Install App"**.
3. Spoptify will appear as a native app icon on your home screen.

### On iOS/iPhone (Safari):
1. Open Safari and navigate to `https://aishikxai.github.io/New-1/`
2. Tap the **Share** button (box with an up arrow) at the bottom center.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top right.

*Once installed, you can turn off your internet, open the app from your home screen, and enjoy playback of your local library and synthesized beats offline!*

---

## 🛠️ Local Development & Running

To run Spoptify locally on your computer:

1. Clone or download the repository.
2. Launch a local web server in the folder root. Do not open `index.html` directly as a file path because ES6 modules require an HTTP context due to browser CORS policies.
   - Using Python: `python -m http.server 8000`
   - Using Node: `npx http-server`
3. Navigate to `http://localhost:8000` in your browser.

---

## 🔒 Privacy & Safety

Spoptify is built for absolute privacy:
- **Zero Ads**: No ad frameworks are loaded.
- **Zero Telemetry**: No trackers or analysis systems are included.
- **100% Client-Side**: Your uploaded music files never touch the cloud or any external server. They are parsed and cached locally in your own browser's secure data sandboxes.

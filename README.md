# Melodix - Personal Spotify Clone Music Player

Melodix is a full-featured Spotify clone that features full-length online streaming via YouTube (using `yt-dlp`), local MP3 file downloads, library track management (with favorites/likes), and user custom playlists. It runs on a Python FastAPI backend and a React + Vite frontend.

## Prerequisites

Melodix requires **FFmpeg** to extract audio from YouTube videos and convert it to MP3 format.

### Installing FFmpeg:

- **Windows**:
  ```bash
  winget install ffmpeg
  ```
- **macOS** (using Homebrew):
  ```bash
  brew install ffmpeg
  ```
- **Linux** (Debian/Ubuntu):
  ```bash
  sudo apt install ffmpeg
  ```

## How to Run

### Windows:
1. Double-click the **`start.bat`** file in the root directory, or run it in your terminal:
   ```cmd
   start.bat
   ```
This will automatically verify your Python and Node.js environment, install dependencies, and launch the backend and frontend servers.

### macOS / Linux:
1. Open your terminal in the project root.
2. Grant execution permissions and run the start script:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

### Accessing the App:
Once started, open your web browser at:
- **Frontend**: [http://localhost:5173](http://localhost:5173) (or click "Install Standalone App" from the left sidebar to install it!)
- **Backend**: [http://localhost:8000](http://localhost:8000)

## Features Included

- **Search View**: Search any song on YouTube, play instantly, bookmark to your library, or download to listen offline.
- **Home View**: Dynamic local greeting with recently played and saved tracks lists.
- **Library View**: Manage saved tracks, mark as liked (heart), delete entries, and organize into playlists.
- **Playlist View**: Create, manage, and delete playlist groupings.
- **Bottom Player Bar**: Fixed player containing seekable timeline progress slider, mute/volume control, shuffle/repeat, and album info.

## Note on Deployment vs Local Run

Melodix is designed to be **run locally** on your machine. 

Since it uses a Python FastAPI backend to search YouTube (via `yt-dlp`), handle direct streaming redirects, save metadata to a local SQLite database, and download audio tracks, **it cannot be hosted on static hosting services like GitHub Pages** (which only serve static HTML, CSS, and JS, and cannot run Python code).

### Running as a Standalone App:
1. Double-click **`start.bat`** (Windows) or run `./start.sh` (macOS/Linux).
2. Go to **`http://localhost:5173`** in your browser.
3. Click the green **"Install Standalone App"** button at the bottom of the Left Sidebar. This will install Melodix as a native, borderless window on your computer!


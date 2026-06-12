import { AudioEngine } from './audio.js';
import { AudioVisualizer } from './visualizer.js';
import { saveTrack, getAllTracks, deleteTrack } from './db.js';

// Access Code for Privacy Access Control
// Share this code (or link ?code=spoptify2026) with users to give them access.
const ACCESS_CODE = 'spoptify2026';

// Instantiate Core Engines
const audio = new AudioEngine();
let visualizer = null;
let fullscreenVisualizer = null;

// Built-in Synthesizer Presets
const SYNTH_TRACKS = [
  {
    id: 'synth-lofi',
    title: 'Lofi Dreams (Procedural)',
    artist: 'Spoptify Synthesizer',
    duration: 180,
    isSynth: true,
    tempo: 80,
    cover: null
  },
  {
    id: 'synth-wave',
    title: 'Neon Horizon (Procedural)',
    artist: 'Spoptify Synthesizer',
    duration: 180,
    isSynth: true,
    tempo: 105,
    cover: null
  },
  {
    id: 'synth-ambient',
    title: 'Space Stardust (Procedural)',
    artist: 'Spoptify Synthesizer',
    duration: 180,
    isSynth: true,
    tempo: 65,
    cover: null
  }
];

// Document Elements
const DOM = {
  navItems: document.querySelectorAll('.nav-item'),
  panels: document.querySelectorAll('.view-panel'),
  featuredTracks: document.getElementById('featured-tracks'),
  libraryTracksBody: document.getElementById('library-tracks-body'),
  
  // Controls
  playPauseBtn: document.getElementById('ctrl-play-pause'),
  prevBtn: document.getElementById('ctrl-prev'),
  nextBtn: document.getElementById('ctrl-next'),
  shuffleBtn: document.getElementById('ctrl-shuffle'),
  repeatBtn: document.getElementById('ctrl-repeat'),
  
  // Sliders
  progressBar: document.getElementById('progress-bar'),
  progressFill: document.getElementById('progress-fill'),
  progressThumb: document.getElementById('progress-thumb'),
  progressCurrent: document.getElementById('progress-current'),
  progressDuration: document.getElementById('progress-duration'),
  
  volumeBtn: document.getElementById('volume-btn'),
  volumeSlider: document.getElementById('volume-slider'),
  volumeFill: document.getElementById('volume-fill'),
  volumeThumb: document.getElementById('volume-thumb'),

  // Search
  searchInput: document.getElementById('search-input'),

  // Header Import
  importHeaderBtn: document.getElementById('import-header-btn'),

  // Library Import
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),

  // Sidebar card
  sidebarCard: document.getElementById('sidebar-card'),
  sidebarVinyl: document.getElementById('sidebar-vinyl'),
  sidebarTitle: document.getElementById('sidebar-title'),
  sidebarArtist: document.getElementById('sidebar-artist'),

  // Playbar details
  playbarCover: document.getElementById('playbar-cover'),
  playbarTitle: document.getElementById('playbar-title'),
  playbarArtist: document.getElementById('playbar-artist'),
  playbarExpandTrigger: document.getElementById('playbar-expand-trigger'),
  playbarVisBtn: document.getElementById('playbar-vis-btn'),
  playbarEqBtn: document.getElementById('playbar-eq-btn'),

  // Fullscreen Drawer
  fullscreenPlayer: document.getElementById('fullscreen-player'),
  fullscreenCloseBtn: document.getElementById('fullscreen-close-btn'),
  largeVinyl: document.getElementById('large-vinyl'),
  largeTitle: document.getElementById('large-title'),
  largeArtist: document.getElementById('large-artist'),
  largeProgressBar: document.getElementById('large-progress-bar'),
  largeProgressFill: document.getElementById('large-progress-fill'),
  largeProgressThumb: document.getElementById('large-progress-thumb'),
  largeProgressCurrent: document.getElementById('large-progress-current'),
  largeProgressDuration: document.getElementById('large-progress-duration'),
  
  largePlayPauseBtn: document.getElementById('large-ctrl-play-pause'),
  largePrevBtn: document.getElementById('large-ctrl-prev'),
  largeNextBtn: document.getElementById('large-ctrl-next'),
  largeShuffleBtn: document.getElementById('large-ctrl-shuffle'),
  largeRepeatBtn: document.getElementById('large-ctrl-repeat'),
  
  floatingEqPreview: document.querySelector('.floating-equalizer-preview'),

  // Equalizer
  eqPresetBtns: document.querySelectorAll('.eq-preset-btn'),
  eqSliders: document.querySelectorAll('.eq-slider'),

  // Settings
  colorPresetBtns: document.querySelectorAll('.color-preset-btn'),
  clearDbBtn: document.getElementById('clear-db-btn'),
  storageInfo: document.getElementById('storage-info'),
  copyInviteBtn: document.getElementById('copy-invite-btn'),
  copySuccessText: document.getElementById('copy-success-text'),

  // Visualizer style dropdown
  visStyleSelect: document.getElementById('vis-style'),
  visNowPlaying: document.getElementById('vis-now-playing'),

  // Synth Home Card Controls
  playSynthBtn: document.getElementById('play-synth-btn'),
  synthTempo: document.getElementById('synth-tempo'),
  synthTempoVal: document.getElementById('synth-tempo-val'),

  // Online Search View elements
  searchOnlineInput: document.getElementById('search-online-input'),
  searchOnlineBtn: document.getElementById('search-online-btn'),
  searchOnlineLoading: document.getElementById('search-online-loading'),
  searchOnlineResults: document.getElementById('search-online-results'),
  searchOnlineSuggestions: document.getElementById('search-online-suggestions'),
  searchRecommendations: document.getElementById('search-recommendations')
};

// Global volume state
let currentVolume = 0.8;
let isMuted = false;

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  checkAccessControl();
  setupAccessControlBindings();

  setupRouting();
  setupTheme();
  setupDemoTracks();
  
  // Setup audio engines visualizer once canvas elements are loaded
  initVisualizer();
  
  // Load local database tracks
  await refreshLibrary();

  // Setup event listeners
  setupAudioListeners();
  setupPlayerControlBindings();
  setupImportAndLibraryBindings();
  setupEqualizerBindings();
  setupSettingsBindings();
  setupOnlineSearch();
  
  // Set default volume
  updateVolume(currentVolume);

  // Sync PWA service worker
  registerServiceWorker();
});

// 1. NAVIGATION & ROUTING
function setupRouting() {
  DOM.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = item.getAttribute('data-target');
      
      DOM.navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      DOM.panels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === targetId) {
          panel.classList.add('active');
        }
      });

      // Special visualizer trigger to resize canvas
      if (targetId === 'visualizer-view' && visualizer) {
        visualizer.resize();
        visualizer.start();
      } else if (visualizer) {
        // Pause visualizer loops if not visible to save CPU/battery
        visualizer.stop();
      }
    });
  });

  // Expand fullscreen player on playbar card click
  DOM.playbarExpandTrigger.addEventListener('click', () => {
    DOM.fullscreenPlayer.classList.add('active');
    if (fullscreenVisualizer) {
      fullscreenVisualizer.resize();
      fullscreenVisualizer.start();
    }
  });

  // Close fullscreen player
  DOM.fullscreenCloseBtn.addEventListener('click', () => {
    DOM.fullscreenPlayer.classList.remove('active');
    if (fullscreenVisualizer) {
      fullscreenVisualizer.stop();
    }
    // If we're on visualizer tab, resume main visualizer
    const activePanel = document.querySelector('.view-panel.active');
    if (activePanel.id === 'visualizer-view' && visualizer) {
      visualizer.start();
    }
  });

  // Footer visualizer navigation shortcut
  DOM.playbarVisBtn.addEventListener('click', () => {
    const visNav = Array.from(DOM.navItems).find(n => n.getAttribute('data-target') === 'visualizer-view');
    if (visNav) visNav.click();
  });

  // Footer EQ navigation shortcut
  DOM.playbarEqBtn.addEventListener('click', () => {
    const eqNav = Array.from(DOM.navItems).find(n => n.getAttribute('data-target') === 'equalizer-view');
    if (eqNav) eqNav.click();
  });
}

// 2. THEME AND DESIGN SYSTEM ACCENT COLORS
function setupTheme() {
  const savedColor = localStorage.getItem('spoptify-accent-color') || '#1db954';
  setAccentColor(savedColor);

  DOM.colorPresetBtns.forEach(btn => {
    const color = btn.getAttribute('data-color');
    if (color === savedColor) {
      DOM.colorPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
      DOM.colorPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setAccentColor(color);
    });
  });
}

function setAccentColor(hex) {
  document.documentElement.style.setProperty('--accent-color', hex);
  
  // Convert hex to rgb for glow opacity
  let r = 29, g = 185, b = 84;
  if (hex.startsWith('#')) {
    const code = hex.substring(1);
    r = parseInt(code.substring(0, 2), 16);
    g = parseInt(code.substring(2, 4), 16);
    b = parseInt(code.substring(4, 6), 16);
  }
  document.documentElement.style.setProperty('--accent-color-glow', `rgba(${r}, ${g}, ${b}, 0.25)`);
  localStorage.setItem('spoptify-accent-color', hex);

  // Update visualizers colors
  if (visualizer) visualizer.setThemeColor(hex);
  if (fullscreenVisualizer) fullscreenVisualizer.setThemeColor(hex);
}

// 3. RETRIEVE AND RENDER DEMO SYNTH TRACKS
function setupDemoTracks() {
  DOM.featuredTracks.innerHTML = '';
  
  SYNTH_TRACKS.forEach(track => {
    const card = document.createElement('div');
    card.className = 'track-card';
    card.innerHTML = `
      <div class="track-card-art">
        <!-- CD center symbol -->
      </div>
      <h3 class="track-card-title truncate">${track.title}</h3>
      <p class="track-card-artist truncate">${track.artist}</p>
      <button class="play-hover-btn">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
    `;

    card.addEventListener('click', () => {
      playTrackItem(track);
    });

    DOM.featuredTracks.appendChild(card);
  });
}

// 4. CANVAS AUDIO VISUALIZER INITIALIZATION
function initVisualizer() {
  const canvas = document.getElementById('visualizer-canvas');
  visualizer = new AudioVisualizer(canvas, audio);

  const fullCanvas = document.getElementById('fullscreen-bg-canvas');
  fullscreenVisualizer = new AudioVisualizer(fullCanvas, audio);
  fullscreenVisualizer.setStyle('particles'); // Background floating particles for fullscreen

  // Dropdown style selector
  DOM.visStyleSelect.addEventListener('change', (e) => {
    visualizer.setStyle(e.target.value);
  });

  // Synchronize visualizer colors
  const activeColor = localStorage.getItem('spoptify-accent-color') || '#1db954';
  visualizer.setThemeColor(activeColor);
  fullscreenVisualizer.setThemeColor(activeColor);
}

// 5. AUDIO ENGINE CALLBACK LISTENERS
function setupAudioListeners() {
  // Sync details on track change
  audio.onTrackChange = (track) => {
    if (track) {
      const title = track.title;
      const artist = track.artist;
      const durationStr = formatTime(track.duration);

      // Sidebar
      DOM.sidebarTitle.textContent = title;
      DOM.sidebarArtist.textContent = artist;
      DOM.sidebarCard.classList.add('active');

      // Playbar
      DOM.playbarTitle.textContent = title;
      DOM.playbarArtist.textContent = artist;
      DOM.progressDuration.textContent = durationStr;

      // Fullscreen Player
      DOM.largeTitle.textContent = title;
      DOM.largeArtist.textContent = artist;
      DOM.largeProgressDuration.textContent = durationStr;

      // Visualizer banner
      DOM.visNowPlaying.textContent = `Playing: ${title}`;

      // Cover Art setup
      const coverSrc = track.cover || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23251e3d"/><circle cx="50" cy="50" r="10" fill="%231db954"/></svg>';
      
      DOM.playbarCover.style.backgroundImage = `url('${coverSrc}')`;
      DOM.playbarCover.style.backgroundSize = 'cover';
      DOM.playbarCover.style.backgroundPosition = 'center';
      
      const largeLabel = DOM.largeVinyl.querySelector('.vinyl-large-label');
      if (largeLabel) {
        largeLabel.style.backgroundImage = `url('${coverSrc}')`;
        largeLabel.style.backgroundSize = 'cover';
        largeLabel.style.backgroundPosition = 'center';
      }

      DOM.sidebarVinyl.style.backgroundImage = `url('${coverSrc}')`;
      DOM.sidebarVinyl.style.backgroundSize = 'cover';
      DOM.sidebarVinyl.style.backgroundPosition = 'center';

      // Custom Synth controls on Home View
      if (track.isSynth) {
        DOM.playSynthBtn.innerHTML = `<svg viewBox="0 0 24 24" class="btn-icon"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Stop Synth Beats`;
        DOM.synthTempo.value = track.tempo;
        DOM.synthTempoVal.textContent = `${track.tempo} BPM`;
      } else {
        DOM.playSynthBtn.innerHTML = `<svg viewBox="0 0 24 24" class="btn-icon"><path d="M8 5v14l11-7z"/></svg> Generate Live Beats`;
      }

      // Highlight active row in library table
      const rows = DOM.libraryTracksBody.querySelectorAll('.tracklist-row');
      rows.forEach(row => {
        row.classList.remove('playing');
        if (Number(row.getAttribute('data-id')) === track.id) {
          row.classList.add('playing');
        }
      });
    } else {
      // Clean slate
      DOM.sidebarTitle.textContent = 'No Track Playing';
      DOM.sidebarArtist.textContent = 'Select a track';
      DOM.sidebarVinyl.style.backgroundImage = '';
      
      DOM.playbarTitle.textContent = 'No Track Playing';
      DOM.playbarArtist.textContent = 'Select a track to start listening';
      DOM.playbarCover.style.backgroundImage = '';
      DOM.progressDuration.textContent = '0:00';
      
      DOM.largeTitle.textContent = 'No Track Playing';
      DOM.largeArtist.textContent = 'Select a track to enjoy music';
      DOM.largeProgressDuration.textContent = '0:00';
      const largeLabel = DOM.largeVinyl.querySelector('.vinyl-large-label');
      if (largeLabel) largeLabel.style.backgroundImage = '';
      
      DOM.visNowPlaying.textContent = 'Playing: None';
      DOM.playSynthBtn.innerHTML = `<svg viewBox="0 0 24 24" class="btn-icon"><path d="M8 5v14l11-7z"/></svg> Generate Live Beats`;

      const rows = DOM.libraryTracksBody.querySelectorAll('.tracklist-row');
      rows.forEach(r => r.classList.remove('playing'));
    }
  };

  // Sync play states (toggle play icons, start record rotating animations)
  audio.onPlayStateChange = (isPlaying) => {
    const playIcons = document.querySelectorAll('.play-icon');
    const pauseIcons = document.querySelectorAll('.pause-icon');

    if (isPlaying) {
      playIcons.forEach(i => i.style.display = 'none');
      pauseIcons.forEach(i => i.style.display = 'block');
      
      DOM.sidebarVinyl.classList.add('playing');
      DOM.playbarCover.classList.add('playing');
      DOM.largeVinyl.classList.add('playing');

      // Start visualizer cycles
      const activePanel = document.querySelector('.view-panel.active');
      if (activePanel && activePanel.id === 'visualizer-view' && visualizer) {
        visualizer.start();
      }
      if (DOM.fullscreenPlayer.classList.contains('active') && fullscreenVisualizer) {
        fullscreenVisualizer.start();
      }
    } else {
      playIcons.forEach(i => i.style.display = 'block');
      pauseIcons.forEach(i => i.style.display = 'none');

      DOM.sidebarVinyl.classList.remove('playing');
      DOM.playbarCover.classList.remove('playing');
      DOM.largeVinyl.classList.remove('playing');
    }
  };

  // Sync progress bar sliders
  audio.onProgressUpdate = (current, total) => {
    if (total <= 0) return;
    const percent = (current / total) * 100;
    
    // Bottom bar progress slider
    DOM.progressFill.style.width = `${percent}%`;
    DOM.progressThumb.style.left = `${percent}%`;
    DOM.progressCurrent.textContent = formatTime(current);

    // Fullscreen slider
    DOM.largeProgressFill.style.width = `${percent}%`;
    DOM.largeProgressThumb.style.left = `${percent}%`;
    DOM.largeProgressCurrent.textContent = formatTime(current);

    // Animate tiny wave bars in fullscreen overlay if playing
    if (audio.isPlaying) {
      animateFullscreenEqBars();
    } else {
      resetFullscreenEqBars();
    }
  };

  // Sync queue updates
  audio.onQueueUpdate = (queue) => {
    // We can update a queue panel in the UI if needed
  };
}

// Fullscreen Wave preview bars animator
function animateFullscreenEqBars() {
  const bars = DOM.floatingEqPreview.querySelectorAll('.bar');
  const freq = audio.getFrequencyData();
  
  if (freq && freq.length > 0) {
    // Distribute frequency bins over the 8 bars
    const step = Math.floor(freq.length * 0.4 / bars.length);
    bars.forEach((bar, index) => {
      const val = freq[index * step];
      const h = Math.max(4, (val / 255) * 55); // scale between 4px and 55px
      bar.style.height = `${h}px`;
    });
  } else {
    // Gentle floating loop if synth generator context has no frequency array yet
    const time = Date.now() * 0.004;
    bars.forEach((bar, index) => {
      const h = Math.max(4, (Math.sin(index * 0.8 - time) + 1) * 20);
      bar.style.height = `${h}px`;
    });
  }
}

function resetFullscreenEqBars() {
  const bars = DOM.floatingEqPreview.querySelectorAll('.bar');
  bars.forEach(bar => {
    bar.style.height = `4px`;
  });
}

// 6. PLAYBACK CONTROLS EVENTS
function setupPlayerControlBindings() {
  const togglePlay = () => {
    if (audio.playlist.length === 0) {
      // Fallback: load first Synth track if playlist empty
      playTrackItem(SYNTH_TRACKS[0]);
    } else {
      if (audio.isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    }
  };

  DOM.playPauseBtn.addEventListener('click', togglePlay);
  DOM.largePlayPauseBtn.addEventListener('click', togglePlay);

  DOM.nextBtn.addEventListener('click', () => audio.next());
  DOM.largeNextBtn.addEventListener('click', () => audio.next());

  DOM.prevBtn.addEventListener('click', () => audio.prev());
  DOM.largePrevBtn.addEventListener('click', () => audio.prev());

  // Shuffle toggler
  const toggleShuffle = () => {
    audio.toggleShuffle();
    DOM.shuffleBtn.classList.toggle('active', audio.isShuffle);
    DOM.largeShuffleBtn.classList.toggle('active', audio.isShuffle);
  };
  DOM.shuffleBtn.addEventListener('click', toggleShuffle);
  DOM.largeShuffleBtn.addEventListener('click', toggleShuffle);

  // Repeat toggler
  const toggleRepeat = () => {
    const mode = audio.toggleRepeat();
    const indics = document.querySelectorAll('.repeat-one-indicator');
    
    if (mode === 'none') {
      DOM.repeatBtn.classList.remove('active');
      DOM.largeRepeatBtn.classList.remove('active');
      indics.forEach(i => i.style.display = 'none');
    } else if (mode === 'all') {
      DOM.repeatBtn.classList.add('active');
      DOM.largeRepeatBtn.classList.add('active');
      indics.forEach(i => i.style.display = 'none');
    } else if (mode === 'one') {
      DOM.repeatBtn.classList.add('active');
      DOM.largeRepeatBtn.classList.add('active');
      indics.forEach(i => i.style.display = 'flex');
    }
  };
  DOM.repeatBtn.addEventListener('click', toggleRepeat);
  DOM.largeRepeatBtn.addEventListener('click', toggleRepeat);

  // Custom progress bar drag seeking
  setupSliderInteraction(DOM.progressBar, (percent) => {
    audio.seek(percent);
  });
  setupSliderInteraction(DOM.largeProgressBar, (percent) => {
    audio.seek(percent);
  });

  // Volume slider interaction
  setupSliderInteraction(DOM.volumeSlider, (percent) => {
    isMuted = false;
    currentVolume = percent;
    updateVolume(percent);
  });

  // Mute volume button click
  DOM.volumeBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    updateVolume(isMuted ? 0 : currentVolume);
  });
}

function updateVolume(val) {
  audio.setVolume(val);
  const percent = val * 100;
  
  DOM.volumeFill.style.width = `${percent}%`;
  DOM.volumeThumb.style.left = `${percent}%`;

  const highIcon = DOM.volumeBtn.querySelector('.vol-high');
  const muteIcon = DOM.volumeBtn.querySelector('.vol-mute');

  if (val === 0) {
    highIcon.style.display = 'none';
    muteIcon.style.display = 'block';
  } else {
    highIcon.style.display = 'block';
    muteIcon.style.display = 'none';
  }
}

// Drag / Click helper for custom sliders
function setupSliderInteraction(sliderEl, onSeekCallback) {
  let isDragging = false;

  const getPercent = (clientX) => {
    const rect = sliderEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return x / rect.width;
  };

  const onStart = (e) => {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    onSeekCallback(getPercent(clientX));
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    onSeekCallback(getPercent(clientX));
  };

  const onEnd = () => {
    isDragging = false;
  };

  sliderEl.addEventListener('mousedown', onStart);
  sliderEl.addEventListener('touchstart', onStart, { passive: true });

  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });

  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
}

// 7. LOCAL FILE IMPORT & DRAG AND DROP
function setupImportAndLibraryBindings() {
  // Main header button clicks input file
  DOM.importHeaderBtn.addEventListener('click', () => DOM.fileInput.click());

  // Click inside drop zone clicks file input
  DOM.dropZone.addEventListener('click', () => DOM.fileInput.click());

  // Drag over effects
  DOM.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.add('dragover');
  });

  DOM.dropZone.addEventListener('dragleave', () => {
    DOM.dropZone.classList.remove('dragover');
  });

  DOM.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.remove('dragover');
    if (e.dataTransfer.files) {
      importFiles(e.dataTransfer.files);
    }
  });

  DOM.fileInput.addEventListener('change', (e) => {
    if (e.target.files) {
      importFiles(e.target.files);
    }
  });

  // Search local tracks
  DOM.searchInput.addEventListener('input', (e) => {
    filterLibrary(e.target.value);
  });
}

// Import multiple local files
async function importFiles(filesList) {
  const validFiles = Array.from(filesList).filter(file => file.type.startsWith('audio/'));
  if (validFiles.length === 0) return;

  // Show status loading or similar
  for (const file of validFiles) {
    try {
      const duration = await getAudioDuration(file);
      const title = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      
      // Basic title/artist parsing: "Artist - Title.mp3"
      let artist = 'Local File';
      let cleanTitle = title;
      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        artist = parts[0].trim();
        cleanTitle = parts.slice(1).join(' - ').trim();
      }

      await saveTrack(file, cleanTitle, artist, duration, null);
    } catch (err) {
      console.error('Failed to import file:', file.name, err);
    }
  }

  // Refresh
  await refreshLibrary();
}

// Fetch exact audio duration by loading metadata on an offline element
function getAudioDuration(file) {
  return new Promise((resolve) => {
    const audioEl = new Audio();
    const url = URL.createObjectURL(file);
    audioEl.src = url;
    
    audioEl.addEventListener('loadedmetadata', () => {
      resolve(audioEl.duration);
      URL.revokeObjectURL(url);
    });

    audioEl.addEventListener('error', () => {
      resolve(0); // fallback if fails to fetch
      URL.revokeObjectURL(url);
    });
  });
}

// Load library tracks from IndexedDB, rebuild playlist, and populate table
async function refreshLibrary() {
  const dbTracks = await getAllTracks();
  
  // Combine custom synth tracks and uploaded tracks
  // This gives the player immediately playable options
  const fullPlaylist = [...SYNTH_TRACKS, ...dbTracks];
  audio.setPlaylist(fullPlaylist);

  // Populate Library view tracklist
  DOM.libraryTracksBody.innerHTML = '';

  if (dbTracks.length === 0) {
    DOM.libraryTracksBody.innerHTML = `
      <tr class="empty-state">
        <td colspan="5">
          <p>No tracks in your library yet. Drag and drop audio files above to load them offline!</p>
        </td>
      </tr>
    `;
    updateStorageText(0);
    return;
  }

  dbTracks.forEach((track, index) => {
    const tr = document.createElement('tr');
    tr.className = 'tracklist-row';
    tr.setAttribute('data-id', track.id);
    if (audio.getCurrentTrack() && audio.getCurrentTrack().id === track.id) {
      tr.classList.add('playing');
    }

    const trCover = track.cover || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23251e3d"/><circle cx="50" cy="50" r="10" fill="%231db954"/></svg>';
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="track-title-cell">
          <div class="mini-cover" style="background-image: url('${trCover}'); background-size: cover; background-position: center;"></div>
          <span class="truncate">${escapeHtml(track.title)}</span>
        </div>
      </td>
      <td class="truncate">${escapeHtml(track.artist)}</td>
      <td>${formatTime(track.duration)}</td>
      <td>
        <button class="delete-btn" title="Delete offline track" data-id="${track.id}">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </td>
    `;

    // Row clicks triggers play
    tr.addEventListener('click', (e) => {
      // Don't trigger play if deleting
      if (e.target.closest('.delete-btn')) return;
      playTrackItem(track);
    });

    // Delete trigger
    tr.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      await deleteTrack(id);
      audio.removeTrackFromPlaylist(id);
      await refreshLibrary();
    });

    DOM.libraryTracksBody.appendChild(tr);
  });

  // Calculate storage usage
  let totalBytes = 0;
  dbTracks.forEach(t => {
    if (t.file && t.file.size) totalBytes += t.file.size;
  });
  updateStorageText(totalBytes);
}

function updateStorageText(bytes) {
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  DOM.storageInfo.textContent = `Offline Library holds ${mb} MB of audio files saved in local storage.`;
}

function filterLibrary(query) {
  const lower = query.toLowerCase();
  const rows = DOM.libraryTracksBody.querySelectorAll('.tracklist-row');
  
  rows.forEach(row => {
    if (row.classList.contains('empty-state')) return;
    const title = row.querySelector('.track-title-cell span').textContent.toLowerCase();
    const artist = row.querySelector('td:nth-child(3)').textContent.toLowerCase();

    if (title.includes(lower) || artist.includes(lower)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function playTrackItem(track) {
  audio.playTrack(track);
}

// 8. EQUALIZER CONTROLS
function setupEqualizerBindings() {
  // Sliders input change
  DOM.eqSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const band = Number(e.target.getAttribute('data-band'));
      const gain = Number(e.target.value);
      audio.setEqualizerBand(band, gain);
      
      const label = document.getElementById(`eq-val-${band}`);
      if (label) {
        label.textContent = `${gain > 0 ? '+' : ''}${gain}dB`;
      }

      // Reset preset active button when custom bands are tweaked
      DOM.eqPresetBtns.forEach(btn => btn.classList.remove('active'));
    });
  });

  // Preset button clicks
  DOM.eqPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.eqPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.getAttribute('data-preset');
      const levels = audio.setEqualizerPreset(preset);

      // Sync UI sliders
      levels.forEach((gain, band) => {
        const slider = DOM.eqSliders[band];
        if (slider) {
          slider.value = gain;
        }
        const label = document.getElementById(`eq-val-${band}`);
        if (label) {
          label.textContent = `${gain > 0 ? '+' : ''}${gain}dB`;
        }
      });
    });
  });
}

// 9. SETTINGS AND SYNTH CONTROLS
function setupSettingsBindings() {
  DOM.clearDbBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your entire offline music library? This cannot be undone.')) {
      // Clear database store
      const db = await indexedDB.open('SpoptifyOfflineDB', 1);
      db.onsuccess = (e) => {
        const d = e.target.result;
        const tx = d.transaction(['tracks'], 'readwrite');
        tx.objectStore('tracks').clear();
        tx.oncomplete = async () => {
          audio.setPlaylist(SYNTH_TRACKS);
          audio.stop();
          await refreshLibrary();
          alert('Local music database cleared.');
        };
      };
    }
  });

  // Lofi Synth Home Card trigger
  DOM.playSynthBtn.addEventListener('click', () => {
    const currentTrack = audio.getCurrentTrack();
    
    if (currentTrack && currentTrack.isSynth && audio.isPlaying) {
      audio.pause();
    } else {
      // Find the first synth track or use custom BPM slider
      const tempo = Number(DOM.synthTempo.value);
      const synthTrack = {
        id: 'synth-custom',
        title: `Live Ambient (BPM: ${tempo})`,
        artist: 'Spoptify Synthesizer',
        duration: 180,
        isSynth: true,
        tempo: tempo,
        cover: null
      };
      
      // Inject selected tempo in synth engine before playing
      audio.initContext();
      if (audio.synth) {
        audio.synth.tempo = tempo;
      }
      playTrackItem(synthTrack);
    }
  });

  DOM.synthTempo.addEventListener('input', (e) => {
    const bpm = Number(e.target.value);
    DOM.synthTempoVal.textContent = `${bpm} BPM`;
    if (audio.synth && audio.isSynthPlaying) {
      audio.synth.tempo = bpm;
      // Update track title dynamically
      const track = audio.getCurrentTrack();
      if (track && track.id === 'synth-custom') {
        track.title = `Live Ambient (BPM: ${bpm})`;
        DOM.playbarTitle.textContent = track.title;
        DOM.largeTitle.textContent = track.title;
      }
    }
  });
}

// 10. UTILITIES
function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Register service worker for Progressive Web App caching
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Spoptify Service Worker registered successfully:', reg.scope);
        })
        .catch(err => {
          console.error('Service Worker registration failed:', err);
        });
    });
  }
}

// 12. ACCESS CONTROL AND PASSCODE LOGIC
function checkAccessControl() {
  const isUnlocked = localStorage.getItem('spoptify_unlocked') === 'true';
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');

  if (codeParam === ACCESS_CODE) {
    localStorage.setItem('spoptify_unlocked', 'true');
    // Clean URL so the code isn't exposed in address bar
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    hideLockScreen();
    return;
  }

  if (isUnlocked) {
    hideLockScreen();
  } else {
    showLockScreen();
  }
}

function showLockScreen() {
  const lockScreen = document.getElementById('lock-screen');
  if (lockScreen) {
    lockScreen.style.display = 'flex';
  }
}

function hideLockScreen() {
  const lockScreen = document.getElementById('lock-screen');
  if (lockScreen) {
    lockScreen.style.display = 'none';
  }
}

function setupAccessControlBindings() {
  const unlockBtn = document.getElementById('lock-unlock-btn');
  const lockInput = document.getElementById('lock-input');
  const lockError = document.getElementById('lock-error');

  if (unlockBtn && lockInput) {
    unlockBtn.addEventListener('click', () => {
      if (lockInput.value === ACCESS_CODE) {
        localStorage.setItem('spoptify_unlocked', 'true');
        hideLockScreen();
      } else {
        if (lockError) lockError.style.display = 'block';
        lockInput.value = '';
      }
    });

    lockInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        unlockBtn.click();
      }
    });
  }

  // Set active access code text in settings
  const settingsCodeLabel = document.getElementById('settings-access-code');
  if (settingsCodeLabel) {
    settingsCodeLabel.textContent = ACCESS_CODE;
  }

  // Copy Invite Link button
  if (DOM.copyInviteBtn) {
    DOM.copyInviteBtn.addEventListener('click', () => {
      const inviteUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?code=${ACCESS_CODE}`;
      navigator.clipboard.writeText(inviteUrl).then(() => {
        if (DOM.copySuccessText) {
          DOM.copySuccessText.style.display = 'inline';
          setTimeout(() => {
            DOM.copySuccessText.style.display = 'none';
          }, 2000);
        }
      });
    });
  }
}

// 13. ONLINE SEARCH AND IMPORT
function setupOnlineSearch() {
  if (!DOM.searchOnlineBtn || !DOM.searchOnlineInput) return;

  const performSearch = async (forcedQuery = null) => {
    // Hide suggestions dropdown immediately
    if (DOM.searchOnlineSuggestions) DOM.searchOnlineSuggestions.style.display = 'none';

    const query = forcedQuery !== null ? forcedQuery.trim() : DOM.searchOnlineInput.value.trim();
    if (!query) {
      // If empty search, restore recommendations
      showRecommendations();
      return;
    }

    // Populate search box if forced (e.g. from recommendation cards)
    DOM.searchOnlineInput.value = query;

    if (DOM.searchOnlineLoading) DOM.searchOnlineLoading.style.display = 'flex';
    hideRecommendations();
    if (DOM.searchOnlineResults) {
      DOM.searchOnlineResults.style.display = 'none';
      DOM.searchOnlineResults.innerHTML = '';
    }

    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=24`;
      const response = await fetch(url);
      const data = await response.json();

      if (DOM.searchOnlineLoading) DOM.searchOnlineLoading.style.display = 'none';
      if (DOM.searchOnlineResults) DOM.searchOnlineResults.style.display = 'grid';

      if (data.resultCount === 0) {
        if (DOM.searchOnlineResults) {
          DOM.searchOnlineResults.innerHTML = `
            <div class="search-empty-state">
              <p>No tracks found online for "${escapeHtml(query)}". Try another search!</p>
            </div>
          `;
        }
        return;
      }

      renderOnlineResults(data.results);
    } catch (err) {
      console.error('Online search failed:', err);
      if (DOM.searchOnlineLoading) DOM.searchOnlineLoading.style.display = 'none';
      if (DOM.searchOnlineResults) {
        DOM.searchOnlineResults.style.display = 'grid';
        DOM.searchOnlineResults.innerHTML = `
          <div class="search-empty-state">
            <p style="color: #ff3366;">Search failed. Please check your internet connection and try again.</p>
          </div>
        `;
      }
    }
  };

  const showRecommendations = () => {
    if (DOM.searchRecommendations) DOM.searchRecommendations.style.display = 'block';
    if (DOM.searchOnlineResults) {
      DOM.searchOnlineResults.style.display = 'none';
      DOM.searchOnlineResults.innerHTML = '';
    }
  };

  const hideRecommendations = () => {
    if (DOM.searchRecommendations) DOM.searchRecommendations.style.display = 'none';
  };

  // Bind full search triggers
  DOM.searchOnlineBtn.addEventListener('click', () => performSearch());
  DOM.searchOnlineInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Bind Recommendation Genre cards
  const genreCards = document.querySelectorAll('.genre-card');
  genreCards.forEach(card => {
    card.addEventListener('click', () => {
      const query = card.getAttribute('data-query');
      performSearch(query);
    });
  });

  // Bind Recommendation Artist cards
  const artistCards = document.querySelectorAll('.artist-circle-card');
  artistCards.forEach(card => {
    card.addEventListener('click', () => {
      const query = card.getAttribute('data-query');
      performSearch(query);
    });
  });

  // Implement debounced autocomplete suggestions query on keystroke
  const handleAutocomplete = debounce(async (val) => {
    const query = val.trim();
    if (!query) {
      if (DOM.searchOnlineSuggestions) DOM.searchOnlineSuggestions.style.display = 'none';
      showRecommendations();
      return;
    }

    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`;
      const response = await fetch(url);
      const data = await response.json();

      if (!DOM.searchOnlineSuggestions) return;

      if (data.resultCount === 0 || DOM.searchOnlineInput.value.trim() === '') {
        DOM.searchOnlineSuggestions.style.display = 'none';
        return;
      }

      renderSuggestions(data.results);
    } catch (err) {
      console.warn('Failed to fetch suggestions:', err);
    }
  }, 250);

  DOM.searchOnlineInput.addEventListener('input', (e) => {
    handleAutocomplete(e.target.value);
  });

  // Hide suggestions dropdown on clicking outside
  document.addEventListener('click', (e) => {
    if (DOM.searchOnlineSuggestions && !e.target.closest('.search-online-input-wrapper')) {
      DOM.searchOnlineSuggestions.style.display = 'none';
    }
  });

  // Show suggestions when clicking back inside the input (if text exists)
  DOM.searchOnlineInput.addEventListener('focus', () => {
    if (DOM.searchOnlineInput.value.trim() && DOM.searchOnlineSuggestions && DOM.searchOnlineSuggestions.children.length > 0) {
      DOM.searchOnlineSuggestions.style.display = 'flex';
    }
  });
}

function renderSuggestions(results) {
  if (!DOM.searchOnlineSuggestions) return;
  DOM.searchOnlineSuggestions.innerHTML = '';
  DOM.searchOnlineSuggestions.style.display = 'flex';

  results.forEach(track => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      <div class="suggestion-details">
        <span class="suggestion-title truncate">${escapeHtml(track.trackName)}</span>
        <span class="suggestion-artist truncate">${escapeHtml(track.artistName)}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      DOM.searchOnlineInput.value = `${track.trackName} ${track.artistName}`;
      DOM.searchOnlineSuggestions.style.display = 'none';
      
      // Trigger full search
      const btn = document.getElementById('search-online-btn');
      if (btn) btn.click();
    });

    DOM.searchOnlineSuggestions.appendChild(item);
  });
}

function renderOnlineResults(results) {
  if (!DOM.searchOnlineResults) return;
  DOM.searchOnlineResults.innerHTML = '';

  results.forEach(track => {
    const card = document.createElement('div');
    card.className = 'track-card';

    const hiresArtwork = track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '300x300bb') : '';
    const durationSec = track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 180;

    card.innerHTML = `
      <div class="track-card-art">
        <img class="track-card-art-img" src="${hiresArtwork}" alt="${escapeHtml(track.trackName)}">
      </div>
      <h3 class="track-card-title truncate" title="${escapeHtml(track.trackName)}">${escapeHtml(track.trackName)}</h3>
      <p class="track-card-artist truncate" title="${escapeHtml(track.artistName)}">${escapeHtml(track.artistName)}</p>
      
      <div class="search-track-btn-group">
        <button class="search-play-btn" title="Stream Preview">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><path d="M8 5v14l11-7z"/></svg> Play
        </button>
        <button class="search-download-btn" title="Save offline" data-preview="${track.previewUrl}" data-art="${hiresArtwork}">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg> Save
        </button>
      </div>
    `;

    // Stream preview click
    card.querySelector('.search-play-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      
      const previewTrack = {
        id: 'preview-' + track.trackId,
        title: track.trackName + ' (Preview)',
        artist: track.artistName,
        duration: durationSec,
        file: null,
        isSynth: false,
        cover: hiresArtwork
      };

      audio.initContext();
      audio.stopCurrentMedia();
      audio.isSynthPlaying = false;
      audio.audioElement.src = track.previewUrl;
      audio.isPlaying = true;
      audio.audioElement.play().catch(err => {
        console.error('Playback of preview failed:', err);
      });
      
      audio.currentIndex = -1; // reset library index
      
      if (audio.onTrackChange) audio.onTrackChange(previewTrack);
      if (audio.onPlayStateChange) audio.onPlayStateChange(true);
    });

    // Save offline click
    const downloadBtn = card.querySelector('.search-download-btn');
    downloadBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      const previewUrl = downloadBtn.getAttribute('data-preview');
      const artUrl = downloadBtn.getAttribute('data-art');

      downloadBtn.disabled = true;
      downloadBtn.classList.add('downloading');
      downloadBtn.innerHTML = `<span class="spinner"></span> Saving...`;

      try {
        // Use a CORS proxy to fetch the MP3 file client-side
        const proxiedAudioUrl = `https://corsproxy.io/?${encodeURIComponent(previewUrl)}`;
        const audioResponse = await fetch(proxiedAudioUrl);
        if (!audioResponse.ok) throw new Error('Audio fetch failed');
        const audioBlob = await audioResponse.blob();

        // Convert cover art to Base64 to save in IndexedDB
        let coverBase64 = null;
        try {
          const proxiedArtUrl = `https://corsproxy.io/?${encodeURIComponent(artUrl)}`;
          const artResponse = await fetch(proxiedArtUrl);
          const artBlob = await artResponse.blob();
          coverBase64 = await blobToBase64(artBlob);
        } catch (artErr) {
          console.warn('Failed to fetch cover art via proxy, saving without custom cover:', artErr);
        }

        // Save to IndexedDB database
        await saveTrack(audioBlob, track.trackName, track.artistName, durationSec, coverBase64);

        downloadBtn.className = 'search-download-btn downloaded';
        downloadBtn.innerHTML = `✓ Saved`;

        // Refresh offline library table
        await refreshLibrary();
      } catch (err) {
        console.error('Failed to download track:', err);
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('downloading');
        downloadBtn.className = 'search-download-btn';
        downloadBtn.innerHTML = `✗ Error`;
        alert('Could not download file for offline use. Check your internet connection.');
      }
    });

    DOM.searchOnlineResults.appendChild(card);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Debounce helper
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

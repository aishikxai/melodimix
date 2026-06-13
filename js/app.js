import { AudioEngine } from './audio.js';
import { AudioVisualizer } from './visualizer.js';
import { 
  saveTrack, 
  getAllTracks, 
  deleteTrack, 
  createPlaylist, 
  getAllPlaylists, 
  getPlaylist, 
  updatePlaylist, 
  deletePlaylist,
  updateTrack,
  getTrack
} from './db.js';
import {
  setSpotifyClientId,
  getSpotifyClientId,
  getSpotifyAccessToken,
  isSpotifyConnected,
  getSpotifyLoginUrl,
  handleSpotifyCallback,
  logoutSpotify,
  fetchSpotifyProfile,
  fetchSpotifyPlaylists,
  fetchSpotifyPlaylistTracks,
  fetchSpotifyLikedTracks
} from './spotify.js';

// Access Code for Privacy Access Control
const ACCESS_CODE = 'spoptify2026';

// Instantiate Core Engines
const audio = new AudioEngine();
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

// Cache references to DOM elements
const DOM = {
  // Navigation & Views
  navItems: document.querySelectorAll('.nav-item'),
  panels: document.querySelectorAll('.view-panel'),
  greetingTitle: document.getElementById('greeting-title'),
  quickLinksGrid: document.getElementById('quick-links-grid'),
  featuredTracks: document.getElementById('featured-tracks'),
  
  // Sidebar Playlists list
  sidebarPlaylistsList: document.getElementById('sidebar-playlists-list'),
  sidebarLikedSongs: document.getElementById('sidebar-liked-songs'),
  sidebarLikedCount: document.getElementById('sidebar-liked-count'),
  createPlaylistBtn: document.getElementById('create-playlist-btn'),
  
  // Profile dropdown menu
  profileTrigger: document.getElementById('profile-menu-trigger'),
  profileMenu: document.getElementById('profile-dropdown-menu'),
  menuEqualizer: document.getElementById('menu-equalizer'),
  menuSettings: document.getElementById('menu-settings'),
  menuLock: document.getElementById('menu-lock'),

  // Header Search bar wrapper
  headerSearchBar: document.getElementById('header-search-bar'),
  searchOnlineInput: document.getElementById('search-online-input'),
  searchOnlineSuggestions: document.getElementById('search-suggestions-dropdown'),
  searchOnlineLoading: document.getElementById('search-online-loading'),
  searchOnlineResults: document.getElementById('search-online-results'),
  searchRecommendations: document.getElementById('search-recommendations'),
  importHeaderBtn: document.getElementById('import-header-btn'),

  // Playlist view details
  playlistDetailCover: document.getElementById('playlist-detail-cover'),
  playlistDetailTitle: document.getElementById('playlist-detail-title'),
  playlistDetailCount: document.getElementById('playlist-detail-count'),
  playlistDetailDuration: document.getElementById('playlist-detail-duration'),
  playlistPlayBtn: document.getElementById('playlist-play-btn'),
  deletePlaylistBtn: document.getElementById('delete-playlist-btn'),
  playlistTracksBody: document.getElementById('playlist-tracks-body'),
  playlistAddSearchInput: document.getElementById('playlist-add-search-input'),
  playlistAddSearchResults: document.getElementById('playlist-add-search-results'),

  // Liked Songs view details
  likedDetailCount: document.getElementById('liked-detail-count'),
  likedSongsPlayBtn: document.getElementById('liked-songs-play-btn'),
  likedTracksBody: document.getElementById('liked-tracks-body'),

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

  // Playbar details
  playbarCover: document.getElementById('playbar-cover'),
  playbarTitle: document.getElementById('playbar-title'),
  playbarArtist: document.getElementById('playbar-artist'),
  playbarHeartBtn: document.getElementById('playbar-heart-btn'),
  playbarExpandTrigger: document.getElementById('playbar-expand-trigger'),
  playbarQueueBtn: document.getElementById('playbar-queue-btn'),
  playbarEqBtn: document.getElementById('playbar-eq-btn'),

  // Collapsible Now Playing Right Panel
  rightPanel: document.getElementById('right-now-playing-panel'),
  closeRightPanelBtn: document.getElementById('close-right-panel-btn'),
  rightPanelCover: document.getElementById('right-panel-cover'),
  rightPanelTitle: document.getElementById('right-panel-title'),
  rightPanelArtist: document.getElementById('right-panel-artist'),
  rightPanelQueueContainer: document.getElementById('right-panel-queue-container'),

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

  // Equalizer view
  eqPresetBtns: document.querySelectorAll('.eq-preset-btn'),
  eqSliders: document.querySelectorAll('.eq-slider'),

  // Settings view
  colorPresetBtns: document.querySelectorAll('.color-preset-btn'),
  clearDbBtn: document.getElementById('clear-db-btn'),
  storageInfo: document.getElementById('storage-info'),
  copyInviteBtn: document.getElementById('copy-invite-btn'),
  copySuccessText: document.getElementById('copy-success-text'),
  settingsInstallBtn: document.getElementById('settings-install-btn'),
  headerInstallBtn: document.getElementById('header-install-btn'),

  // Modals
  createPlaylistModal: document.getElementById('create-playlist-modal'),
  newPlaylistNameInput: document.getElementById('new-playlist-name-input'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalCreateBtn: document.getElementById('modal-create-btn'),
  addToPlaylistMenu: document.getElementById('add-to-playlist-menu'),
  playlistMenuOptionsContainer: document.getElementById('playlist-menu-options-container'),

  // Synth controls
  playSynthBtn: document.getElementById('play-synth-btn'),
  synthTempo: document.getElementById('synth-tempo'),
  synthTempoVal: document.getElementById('synth-tempo-val'),

  // Spotify UI bindings
  spotifyClientIdInput: document.getElementById('spotify-client-id-input'),
  spotifySaveClientIdBtn: document.getElementById('spotify-save-client-id-btn'),
  spotifyConnectForm: document.getElementById('spotify-connect-form'),
  spotifyConnectedStatus: document.getElementById('spotify-connected-status'),
  spotifyUsername: document.getElementById('spotify-username'),
  spotifySyncBtn: document.getElementById('spotify-sync-btn'),
  spotifyDisconnectBtn: document.getElementById('spotify-disconnect-btn'),
  spotifySyncSuccessText: document.getElementById('spotify-sync-success-text'),

  // Local Files view details
  localFilesView: document.getElementById('local-files-view'),
  localTracksBody: document.getElementById('local-tracks-body'),
  localDetailCount: document.getElementById('local-detail-count'),
  localFilesPlayBtn: document.getElementById('local-files-play-btn'),
  sidebarLocalFiles: document.getElementById('sidebar-local-files'),
  sidebarLocalCount: document.getElementById('sidebar-local-count'),
};

// Global State
let playlists = [];
let currentPlaylistId = null;
let currentVolume = 0.8;
let isMuted = false;
let currentView = 'home-view';
let activeTrackForMenu = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  checkAccessControl();
  setupAccessControlBindings();
  setupPwaInstallation();

  // Handle Spotify redirect authorization
  const hashHandled = handleSpotifyCallback();
  if (hashHandled) {
    console.log('Spotify access token successfully received from callback');
  }

  setupRouting();
  setupTheme();
  setupFeaturedTracks();
  initVisualizer();
  
  setupAudioListeners();
  setupPlayerControlBindings();
  setupHeaderAndSidebarBindings();
  setupEqualizerBindings();
  setupSettingsBindings();
  setupOnlineSearch();
  setupPlaylistDetailsActions();
  setupSpotifyBindings();
  setupLocalFilesBindings();

  // Load custom database contents
  await reloadAppData();
  
  // Set default volume
  updateVolume(currentVolume);

  // Sync PWA service worker
  registerServiceWorker();
});

// REFRESH DB DATA AND UI STATE
async function reloadAppData() {
  await loadPlaylists();
  await loadLikedSongsCount();
  await loadLocalFilesCount();
  renderHomeView();
  
  if (currentView === 'liked-songs-view') {
    renderLikedSongsView();
  } else if (currentView === 'playlist-view' && currentPlaylistId !== null) {
    renderPlaylistView(currentPlaylistId);
  } else if (currentView === 'local-files-view') {
    renderLocalFilesView();
  }
}

// 1. NAVIGATION & ROUTING
function setupRouting() {
  DOM.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-target');
      navigateToView(targetId);
    });
  });

  DOM.sidebarLikedSongs.addEventListener('click', () => {
    navigateToView('liked-songs-view');
  });

  if (DOM.sidebarLocalFiles) {
    DOM.sidebarLocalFiles.addEventListener('click', () => {
      navigateToView('local-files-view');
    });
  }

  DOM.menuEqualizer.addEventListener('click', () => {
    navigateToView('equalizer-view');
    DOM.profileMenu.style.display = 'none';
  });

  DOM.menuSettings.addEventListener('click', () => {
    navigateToView('settings-view');
    DOM.profileMenu.style.display = 'none';
  });

  DOM.menuLock.addEventListener('click', () => {
    localStorage.removeItem('spoptify_unlocked');
    showLockScreen();
    DOM.profileMenu.style.display = 'none';
  });

  DOM.playbarExpandTrigger.addEventListener('click', () => {
    DOM.fullscreenPlayer.classList.add('active');
    if (fullscreenVisualizer) {
      fullscreenVisualizer.resize();
      fullscreenVisualizer.start();
    }
  });

  DOM.fullscreenCloseBtn.addEventListener('click', () => {
    DOM.fullscreenPlayer.classList.remove('active');
    if (fullscreenVisualizer) {
      fullscreenVisualizer.stop();
    }
  });

  DOM.playbarQueueBtn.addEventListener('click', () => {
    toggleRightPanel();
  });

  DOM.playbarEqBtn.addEventListener('click', () => {
    navigateToView('equalizer-view');
  });

  const backBtn = document.querySelector('.arrow-btn[title="Back"]');
  const forwardBtn = document.querySelector('.arrow-btn[title="Forward"]');
  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (currentView !== 'home-view') navigateToView('home-view');
    });
  }

  if (forwardBtn) {
    forwardBtn.addEventListener('click', () => {
      if (currentView === 'home-view') navigateToView('search-view');
    });
  }
}

function navigateToView(viewId, playlistId = null) {
  currentView = viewId;
  currentPlaylistId = playlistId;

  DOM.panels.forEach(panel => {
    panel.classList.remove('active');
    if (panel.id === viewId) {
      panel.classList.add('active');
    }
  });

  DOM.navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-target') === viewId) {
      item.classList.add('active');
    }
  });

  DOM.sidebarLikedSongs.classList.toggle('active', viewId === 'liked-songs-view');
  if (DOM.sidebarLocalFiles) {
    DOM.sidebarLocalFiles.classList.toggle('active', viewId === 'local-files-view');
  }

  if (viewId === 'search-view') {
    DOM.headerSearchBar.style.display = 'flex';
  } else {
    DOM.headerSearchBar.style.display = 'none';
  }

  if (viewId === 'playlist-view' && playlistId !== null) {
    renderPlaylistView(playlistId);
  } else if (viewId === 'liked-songs-view') {
    renderLikedSongsView();
  } else if (viewId === 'local-files-view') {
    renderLocalFilesView();
  } else if (viewId === 'home-view') {
    renderHomeView();
  }

  DOM.profileMenu.style.display = 'none';
  hidePlaylistSelectMenu();
}

function toggleRightPanel() {
  DOM.rightPanel.classList.toggle('collapsed');
  if (!DOM.rightPanel.classList.contains('collapsed')) {
    updateRightPanelQueue();
  }
}

// 2. THEME AND ACCENT COLOR Accent Styling
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
  
  let r = 29, g = 185, b = 84;
  if (hex.startsWith('#')) {
    const code = hex.substring(1);
    r = parseInt(code.substring(0, 2), 16);
    g = parseInt(code.substring(2, 4), 16);
    b = parseInt(code.substring(4, 6), 16);
  }
  document.documentElement.style.setProperty('--accent-color-glow', `rgba(${r}, ${g}, ${b}, 0.25)`);
  localStorage.setItem('spoptify-accent-color', hex);

  if (fullscreenVisualizer) fullscreenVisualizer.setThemeColor(hex);
}

// 3. RETRIEVE AND RENDER DEMO SYNTH TRACKS
function setupFeaturedTracks() {
  DOM.featuredTracks.innerHTML = '';
  
  SYNTH_TRACKS.forEach(track => {
    const card = document.createElement('div');
    card.className = 'track-card';
    card.innerHTML = `
      <div class="track-card-art">
        <svg viewBox="0 0 100 100" style="width: 50%; height: 50%; fill: #535353;">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="4"/>
          <path d="M40 30l30 20-30 20z" fill="currentColor"/>
        </svg>
      </div>
      <h3 class="track-card-title truncate" title="${track.title}">${track.title}</h3>
      <p class="track-card-artist truncate">${track.artist}</p>
      <button class="play-hover-btn">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.play-hover-btn') || !e.target.closest('.search-track-btn-group')) {
        playTrackItem(track);
      }
    });

    DOM.featuredTracks.appendChild(card);
  });
}

// 4. CANVAS AUDIO VISUALIZER INITIALIZATION
function initVisualizer() {
  const fullCanvas = document.getElementById('fullscreen-bg-canvas');
  fullscreenVisualizer = new AudioVisualizer(fullCanvas, audio);
  fullscreenVisualizer.setStyle('particles');
  
  const activeColor = localStorage.getItem('spoptify-accent-color') || '#1db954';
  fullscreenVisualizer.setThemeColor(activeColor);
}

// 5. AUDIO ENGINE CALLBACK LISTENERS
function setupAudioListeners() {
  audio.onPlaybarBuffering = (isBuffering) => {
    if (isBuffering) {
      DOM.playbarTitle.innerHTML = '<span class="spinner" style="display:inline-block; margin-right:6px; vertical-align:middle;"></span> Buffering...';
      DOM.playbarArtist.textContent = "Resolving online stream...";
    }
  };

  audio.onTrackChange = async (track) => {
    if (track) {
      const title = track.title;
      const artist = track.artist;
      const durationStr = formatTime(track.duration);

      // Playbar
      DOM.playbarTitle.textContent = title;
      DOM.playbarArtist.textContent = artist;
      DOM.progressDuration.textContent = durationStr;

      // Collapsible Right Panel
      DOM.rightPanelTitle.textContent = title;
      DOM.rightPanelArtist.textContent = artist;

      // Fullscreen Immersive Drawer
      DOM.largeTitle.textContent = title;
      DOM.largeArtist.textContent = artist;
      DOM.largeProgressDuration.textContent = durationStr;

      // Cover Art setup
      const coverSrc = track.cover || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23181818"/><circle cx="50" cy="50" r="15" fill="%23535353"/><path d="M45 40l18 10-18 10z" fill="white"/></svg>';
      
      DOM.playbarCover.style.backgroundImage = `url('${coverSrc}')`;
      DOM.playbarCover.style.backgroundSize = 'cover';
      DOM.playbarCover.style.backgroundPosition = 'center';
      
      DOM.rightPanelCover.src = coverSrc;
      
      const largeLabel = DOM.largeVinyl.querySelector('.vinyl-large-label');
      if (largeLabel) {
        largeLabel.style.backgroundImage = `url('${coverSrc}')`;
        largeLabel.style.backgroundSize = 'cover';
        largeLabel.style.backgroundPosition = 'center';
      }

      // Check Heart/Like state of the active track
      const allTracks = await getAllTracks();
      const dbTrack = allTracks.find(t => t.id === track.id || (track.isSynth && t.id === track.id));
      const isLiked = dbTrack ? dbTrack.liked : false;
      updatePlaybarHeartIcon(isLiked);

      // Sync active play item styling in current view
      highlightActiveTrackInDOM(track.id);
      
      // Update queue details in right panel
      updateRightPanelQueue();
    } else {
      // Clear playback details
      DOM.playbarTitle.textContent = 'No Track Playing';
      DOM.playbarArtist.textContent = 'Select a track to start listening';
      DOM.playbarCover.style.backgroundImage = '';
      DOM.progressDuration.textContent = '0:00';
      updatePlaybarHeartIcon(false);

      DOM.rightPanelTitle.textContent = 'No Track Playing';
      DOM.rightPanelArtist.textContent = 'Select a track';
      DOM.rightPanelCover.src = '';
      DOM.rightPanelQueueContainer.innerHTML = '';

      DOM.largeTitle.textContent = 'No Track Playing';
      DOM.largeArtist.textContent = 'Select a track to enjoy music';
      DOM.largeProgressDuration.textContent = '0:00';
      const largeLabel = DOM.largeVinyl.querySelector('.vinyl-large-label');
      if (largeLabel) largeLabel.style.backgroundImage = '';

      removeTrackHighlightingInDOM();
    }
  };

  audio.onPlayStateChange = (isPlaying) => {
    const playIcons = document.querySelectorAll('.play-icon');
    const pauseIcons = document.querySelectorAll('.pause-icon');

    if (isPlaying) {
      playIcons.forEach(i => i.style.display = 'none');
      pauseIcons.forEach(i => i.style.display = 'block');
      
      DOM.largeVinyl.classList.add('playing');

      if (DOM.fullscreenPlayer.classList.contains('active') && fullscreenVisualizer) {
        fullscreenVisualizer.start();
      }
    } else {
      playIcons.forEach(i => i.style.display = 'block');
      pauseIcons.forEach(i => i.style.display = 'none');

      DOM.largeVinyl.classList.remove('playing');
    }
  };

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

    if (audio.isPlaying) {
      animateFullscreenEqBars();
    } else {
      resetFullscreenEqBars();
    }
  };
}

function highlightActiveTrackInDOM(trackId) {
  const playlistRows = document.querySelectorAll('.playlist-row');
  playlistRows.forEach(row => {
    const rowId = row.getAttribute('data-id');
    row.classList.remove('playing');
    if (rowId === String(trackId)) {
      row.classList.add('playing');
    }
  });
}

function removeTrackHighlightingInDOM() {
  const playlistRows = document.querySelectorAll('.playlist-row');
  playlistRows.forEach(row => row.classList.remove('playing'));
}

// Fullscreen Wave preview bars animator
function animateFullscreenEqBars() {
  const bars = DOM.floatingEqPreview.querySelectorAll('.bar');
  const freq = audio.getFrequencyData();
  
  if (freq && freq.length > 0) {
    const step = Math.floor(freq.length * 0.4 / bars.length);
    bars.forEach((bar, index) => {
      const val = freq[index * step];
      const h = Math.max(4, (val / 255) * 55); 
      bar.style.height = `${h}px`;
    });
  } else {
    // Synth fallback
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

  const toggleShuffle = () => {
    audio.toggleShuffle();
    DOM.shuffleBtn.classList.toggle('active', audio.isShuffle);
    DOM.largeShuffleBtn.classList.toggle('active', audio.isShuffle);
    updateRightPanelQueue();
  };
  DOM.shuffleBtn.addEventListener('click', toggleShuffle);
  DOM.largeShuffleBtn.addEventListener('click', toggleShuffle);

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

  DOM.playbarHeartBtn.addEventListener('click', async () => {
    const currentTrack = audio.getCurrentTrack();
    if (!currentTrack) return;
    
    await toggleLikeTrack(currentTrack);
  });

  setupSliderInteraction(DOM.progressBar, (percent) => {
    audio.seek(percent);
  });
  setupSliderInteraction(DOM.largeProgressBar, (percent) => {
    audio.seek(percent);
  });

  setupSliderInteraction(DOM.volumeSlider, (percent) => {
    isMuted = false;
    currentVolume = percent;
    updateVolume(percent);
  });

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

function updatePlaybarHeartIcon(isLiked) {
  const empty = DOM.playbarHeartBtn.querySelector('.heart-empty');
  const filled = DOM.playbarHeartBtn.querySelector('.heart-filled');
  if (isLiked) {
    empty.style.display = 'none';
    filled.style.display = 'block';
    DOM.playbarHeartBtn.title = 'Remove from Liked Songs';
  } else {
    empty.style.display = 'block';
    filled.style.display = 'none';
    DOM.playbarHeartBtn.title = 'Save to Liked Songs';
  }
}

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

// 7. HEADER, SIDEBAR, AND PLAYLIST CREATION BINDINGS
function setupHeaderAndSidebarBindings() {
  DOM.profileTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.profileMenu.style.display = DOM.profileMenu.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', () => {
    DOM.profileMenu.style.display = 'none';
  });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.accept = 'audio/*';
  
  DOM.importHeaderBtn.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', async (e) => {
    if (e.target.files) {
      await importLocalFiles(e.target.files);
    }
  });

  DOM.createPlaylistBtn.addEventListener('click', () => {
    showCreatePlaylistModal();
  });

  DOM.modalCancelBtn.addEventListener('click', () => {
    hideCreatePlaylistModal();
  });

  DOM.modalCreateBtn.addEventListener('click', async () => {
    const name = DOM.newPlaylistNameInput.value.trim();
    if (name) {
      await createPlaylist(name);
      DOM.newPlaylistNameInput.value = '';
      hideCreatePlaylistModal();
      await reloadAppData();
    }
  });

  DOM.newPlaylistNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      DOM.modalCreateBtn.click();
    }
  });

  DOM.closeRightPanelBtn.addEventListener('click', () => {
    DOM.rightPanel.classList.add('collapsed');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#add-to-playlist-menu') && !e.target.closest('.plus-add-to-playlist')) {
      hidePlaylistSelectMenu();
    }
  });
}

function showCreatePlaylistModal() {
  DOM.createPlaylistModal.style.display = 'flex';
  DOM.newPlaylistNameInput.focus();
}

function hideCreatePlaylistModal() {
  DOM.createPlaylistModal.style.display = 'none';
}

async function importLocalFiles(filesList) {
  const validFiles = Array.from(filesList).filter(file => file.type.startsWith('audio/'));
  if (validFiles.length === 0) return;

  for (const file of validFiles) {
    try {
      const duration = await getAudioDuration(file);
      const title = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      
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

  await reloadAppData();
}

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
      resolve(0);
      URL.revokeObjectURL(url);
    });
  });
}

// 8. DATABASE PLAYLIST MANAGEMENT & SIDEBAR RENDER
async function loadPlaylists() {
  playlists = await getAllPlaylists();
  renderSidebarPlaylists();
}

function renderSidebarPlaylists() {
  DOM.sidebarPlaylistsList.innerHTML = '';
  
  if (playlists.length === 0) return;

  playlists.forEach(playlist => {
    const item = document.createElement('div');
    item.className = 'sidebar-lib-item';
    if (currentView === 'playlist-view' && currentPlaylistId === playlist.id) {
      item.classList.add('active');
    }

    const isSpotify = playlist.isSpotify;
    const avatarHtml = isSpotify 
      ? `<div class="playlist-avatar-mini spotify-branded">
           <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.668.47-.745 3.856-.88 7.15-.505 9.82 1.13.295.18.387.563.207.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.08-1.182-.413.125-.85-.107-.978-.52-.128-.414.107-.85.52-.978 3.67-1.114 8.243-.574 11.35 1.337.368.228.488.708.262 1.083zm.106-2.833C14.385 8.8 8.564 8.61 5.176 9.637c-.54.163-1.107-.15-1.27-.69-.163-.54.15-1.106.69-1.27 3.886-1.18 10.31-.967 14.386 1.45.485.288.643.91.355 1.396-.288.485-.91.642-1.396.355z"/></svg>
         </div>`
      : `<div class="playlist-avatar-mini">
           <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
         </div>`;

    item.innerHTML = `
      ${avatarHtml}
      <div class="lib-item-info">
        <span class="lib-item-title">${escapeHtml(playlist.name)}</span>
        <span class="lib-item-subtitle">Playlist • ${playlist.trackIds.length} songs</span>
      </div>
    `;

    item.addEventListener('click', () => {
      navigateToView('playlist-view', playlist.id);
    });

    DOM.sidebarPlaylistsList.appendChild(item);
  });
}

async function loadLikedSongsCount() {
  const allTracks = await getAllTracks();
  const likedCount = allTracks.filter(t => t.liked).length;
  DOM.sidebarLikedCount.textContent = likedCount;
  
  const label = document.getElementById('liked-detail-count');
  if (label) label.textContent = `${likedCount} songs`;
}

// 9. VIEW RENDERING ENGINE
function renderHomeView() {
  const greeting = getGreeting();
  DOM.greetingTitle.textContent = greeting;

  DOM.quickLinksGrid.innerHTML = '';

  const likedCard = document.createElement('div');
  likedCard.className = 'quick-card';
  likedCard.innerHTML = `
    <div class="quick-card-art" style="background: linear-gradient(135deg, #450af5 0%, #c4efd9 100%);">
      <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
    </div>
    <div class="quick-card-title">Liked Songs</div>
    <button class="play-hover-btn">
      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </button>
  `;
  likedCard.addEventListener('click', (e) => {
    if (e.target.closest('.play-hover-btn')) {
      e.stopPropagation();
      playLikedSongsPlaylist();
    } else {
      navigateToView('liked-songs-view');
    }
  });
  DOM.quickLinksGrid.appendChild(likedCard);

  const synthCard = document.createElement('div');
  synthCard.className = 'quick-card';
  synthCard.innerHTML = `
    <div class="quick-card-art" style="background: linear-gradient(135deg, #00ffff 0%, #1db954 100%);">
      <svg viewBox="0 0 24 24" style="fill:#121212;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
    </div>
    <div class="quick-card-title">Live Synthesizer Beats</div>
    <button class="play-hover-btn">
      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </button>
  `;
  synthCard.addEventListener('click', (e) => {
    if (e.target.closest('.play-hover-btn')) {
      e.stopPropagation();
      DOM.playSynthBtn.click();
    } else {
      DOM.playSynthBtn.click();
    }
  });
  DOM.quickLinksGrid.appendChild(synthCard);

  const gridPlaylists = playlists.slice(0, 4);
  gridPlaylists.forEach(playlist => {
    const card = document.createElement('div');
    card.className = 'quick-card';
    const isSpotify = playlist.isSpotify;
    const backgroundStyle = isSpotify ? `background: rgba(29, 185, 84, 0.1);` : `background-color: #282828;`;
    const svgIcon = isSpotify 
      ? `<svg viewBox="0 0 24 24" style="fill: var(--accent-color); width: 32px; height: 32px;"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.668.47-.745 3.856-.88 7.15-.505 9.82 1.13.295.18.387.563.207.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.08-1.182-.413.125-.85-.107-.978-.52-.128-.414.107-.85.52-.978 3.67-1.114 8.243-.574 11.35 1.337.368.228.488.708.262 1.083zm.106-2.833C14.385 8.8 8.564 8.61 5.176 9.637c-.54.163-1.107-.15-1.27-.69-.163-.54.15-1.106.69-1.27 3.886-1.18 10.31-.967 14.386 1.45.485.288.643.91.355 1.396-.288.485-.91.642-1.396.355z"/></svg>`
      : `<svg viewBox="0 0 24 24" style="fill: #b3b3b3; width: 32px; height: 32px;"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>`;

    card.innerHTML = `
      <div class="quick-card-art" style="${backgroundStyle}">
        ${svgIcon}
      </div>
      <div class="quick-card-title">${escapeHtml(playlist.name)}</div>
      <button class="play-hover-btn">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.play-hover-btn')) {
        e.stopPropagation();
        playUserPlaylist(playlist.id);
      } else {
        navigateToView('playlist-view', playlist.id);
      }
    });
    DOM.quickLinksGrid.appendChild(card);
  });
}

// PLAYLIST DETAIL VIEW RENDERING
async function renderPlaylistView(playlistId) {
  const playlist = await getPlaylist(playlistId);
  if (!playlist) return;

  DOM.playlistDetailTitle.textContent = playlist.name;
  DOM.playlistDetailCount.textContent = `${playlist.trackIds.length} songs`;

  DOM.playlistTracksBody.innerHTML = '';
  
  const allTracks = await getAllTracks();
  let totalDurationSec = 0;

  if (playlist.trackIds.length === 0) {
    DOM.playlistTracksBody.innerHTML = `
      <tr class="empty-state">
        <td colspan="5" style="text-align: center; padding: 40px 0;">
          <p>This playlist is empty. Add songs using the finder below!</p>
        </td>
      </tr>
    `;
    DOM.playlistDetailDuration.textContent = '0 min';
  } else {
    const playlistTracks = playlist.trackIds.map(tid => {
      const localTrack = allTracks.find(t => t.id === tid);
      if (localTrack) return localTrack;
      const synthTrack = SYNTH_TRACKS.find(s => s.id === tid);
      if (synthTrack) return synthTrack;
      return null;
    }).filter(Boolean);

    playlistTracks.forEach((track, index) => {
      totalDurationSec += track.duration;
      const tr = document.createElement('tr');
      tr.className = 'playlist-row';
      tr.setAttribute('data-id', track.id);
      
      const currentTrack = audio.getCurrentTrack();
      if (currentTrack && currentTrack.id === track.id) {
        tr.classList.add('playing');
      }

      const coverSrc = track.cover || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23181818"/><path d="M40 35l20 15-20 15z" fill="white"/></svg>';
      
      let actionBtnHtml = `<button class="btn-icon-only remove-track-btn" title="Remove from playlist" data-track-id="${track.id}">
                          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M19 13H5v-2h14v2z"/></svg>
                        </button>`;

      tr.innerHTML = `
        <td class="track-num">${index + 1}</td>
        <td>
          <div class="track-title-cell-wrapper">
            <div class="track-mini-art" style="background-image: url('${coverSrc}')"></div>
            <div class="track-text-details">
              <span class="track-title">${escapeHtml(track.title)}</span>
            </div>
          </div>
        </td>
        <td class="track-artist-col">${escapeHtml(track.artist)}</td>
        <td>${formatTime(track.duration)}</td>
        <td>
          <div style="display:flex; align-items:center; justify-content:flex-end;">
            ${actionBtnHtml}
          </div>
        </td>
      `;

      // Row playback clicks
      tr.addEventListener('click', (e) => {
        if (e.target.closest('.remove-track-btn')) return;
        audio.setPlaylist(playlistTracks);
        audio.playTrack(track);
      });

      // Remove track binding
      tr.querySelector('.remove-track-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const tid = e.currentTarget.getAttribute('data-track-id');
        const finalTid = isNaN(tid) ? tid : Number(tid);
        
        playlist.trackIds = playlist.trackIds.filter(id => id !== finalTid);
        await updatePlaylist(playlist);
        await reloadAppData();
      });

      DOM.playlistTracksBody.appendChild(tr);
    });

    const mins = Math.round(totalDurationSec / 60);
    DOM.playlistDetailDuration.textContent = `${mins} min`;
  }

  DOM.playlistPlayBtn.onclick = () => {
    playUserPlaylist(playlistId);
  };
}

// Spotify stream preview downloader
async function downloadSpotifyTrack(trackId, downloadBtn) {
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = `<span class="spinner"></span>`;
  
  try {
    const track = await getTrack(trackId);
    if (!track || !track.previewUrl) throw new Error('No preview URL available');
    
    const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(track.previewUrl)}`;
    const response = await fetch(proxiedUrl);
    if (!response.ok) throw new Error('Audio fetch failed');
    const blob = await response.blob();
    
    // Save to database
    track.file = blob;
    await updateTrack(track);
    
    // Sync buttons
    downloadBtn.outerHTML = `<span style="color:var(--accent-color); font-size:14px; margin-right:12px; font-weight:bold;" title="Saved offline">✓</span>`;
    await reloadAppData();
  } catch (err) {
    console.error('Failed to download Spotify preview:', err);
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = `✗`;
    alert('Could not download preview file offline. The track preview may have expired or you are offline.');
  }
}

function setupLocalFilesBindings() {
  const dropZone = document.getElementById('local-drop-zone');
  const fileInput = document.getElementById('local-file-input');
  const browseTrigger = document.getElementById('local-browse-trigger');

  if (browseTrigger && fileInput) {
    browseTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        await importLocalFiles(e.target.files);
      }
    });
  }

  if (dropZone) {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        await importLocalFiles(files);
      }
    }, false);
  }
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

async function loadLocalFilesCount() {
  const allTracks = await getAllTracks();
  const localTracksCount = allTracks.filter(t => t.file !== null).length;
  if (DOM.sidebarLocalCount) {
    DOM.sidebarLocalCount.textContent = localTracksCount;
  }
  if (DOM.localDetailCount) {
    DOM.localDetailCount.textContent = `${localTracksCount} songs`;
  }
}

async function renderLocalFilesView() {
  const allTracks = await getAllTracks();
  const localTracks = allTracks.filter(t => t.file !== null);
  
  DOM.localTracksBody.innerHTML = '';
  await loadLocalFilesCount();

  if (localTracks.length === 0) {
    DOM.localTracksBody.innerHTML = `
      <tr class="empty-state">
        <td colspan="5" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
          <p>No local files imported yet. Drag & drop MP3s here or click browse to upload!</p>
        </td>
      </tr>
    `;
    return;
  }

  localTracks.forEach((track, index) => {
    const tr = document.createElement('tr');
    tr.className = 'playlist-row';
    tr.setAttribute('data-id', track.id);
    
    const currentTrack = audio.getCurrentTrack();
    if (currentTrack && currentTrack.id === track.id) {
      tr.classList.add('playing');
    }

    const coverSrc = track.cover || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23181818"/><circle cx="50" cy="50" r="15" fill="%23535353"/><path d="M45 40l18 10-18 10z" fill="white"/></svg>';

    // Like button state
    const isLiked = track.liked;
    const heartIcon = isLiked 
      ? `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:var(--accent-color);"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
      : `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

    tr.innerHTML = `
      <td class="track-num">${index + 1}</td>
      <td>
        <div class="track-title-cell-wrapper">
          <div class="track-mini-art" style="background-image: url('${coverSrc}')"></div>
          <div class="track-text-details">
            <span class="track-title">${escapeHtml(track.title)}</span>
          </div>
        </div>
      </td>
      <td>${escapeHtml(track.artist)}</td>
      <td>${formatTime(track.duration)}</td>
      <td>
        <div style="display:flex; align-items:center; justify-content:flex-end; gap: 12px;">
          <button class="btn-icon-only local-heart-btn" title="Like track" data-track-id="${track.id}">
            ${heartIcon}
          </button>
          <button class="btn-icon-only local-delete-btn" title="Delete track" data-track-id="${track.id}" style="color: var(--text-dim);">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (e.target.closest('.local-heart-btn') || e.target.closest('.local-delete-btn')) return;
      audio.setPlaylist(localTracks);
      audio.playTrack(track);
    });

    tr.querySelector('.local-heart-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      track.liked = !track.liked;
      await updateTrack(track);
      await renderLocalFilesView();
    });

    tr.querySelector('.local-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete "${track.title}"?`)) {
        await deleteTrack(track.id);
        await reloadAppData();
      }
    });

    DOM.localTracksBody.appendChild(tr);
  });

  DOM.localFilesPlayBtn.onclick = () => {
    if (localTracks.length > 0) {
      audio.setPlaylist(localTracks);
      audio.playIndex(0);
    }
  };
}

// LIKED SONGS VIEW RENDERING
async function renderLikedSongsView() {
  const allTracks = await getAllTracks();
  const likedTracks = allTracks.filter(t => t.liked);
  
  DOM.likedTracksBody.innerHTML = '';
  DOM.likedDetailCount.textContent = `${likedTracks.length} songs`;

  if (likedTracks.length === 0) {
    DOM.likedTracksBody.innerHTML = `
      <tr class="empty-state">
        <td colspan="5" style="text-align: center; padding: 40px 0;">
          <p>No liked songs yet. Find some music in Search or load local files, then click the heart icon!</p>
        </td>
      </tr>
    `;
    return;
  }

  likedTracks.forEach((track, index) => {
    const tr = document.createElement('tr');
    tr.className = 'playlist-row';
    tr.setAttribute('data-id', track.id);
    
    const currentTrack = audio.getCurrentTrack();
    if (currentTrack && currentTrack.id === track.id) {
      tr.classList.add('playing');
    }

    const coverSrc = track.cover || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23181818"/><path d="M40 35l20 15-20 15z" fill="white"/></svg>';
    
    tr.innerHTML = `
      <td class="track-num">${index + 1}</td>
      <td>
        <div class="track-title-cell-wrapper">
          <div class="track-mini-art" style="background-image: url('${coverSrc}')"></div>
          <div class="track-text-details">
            <span class="track-title">${escapeHtml(track.title)}</span>
          </div>
        </div>
      </td>
      <td>${escapeHtml(track.artist)}</td>
      <td>${formatTime(track.duration)}</td>
      <td>
        <div style="display:flex; align-items:center; justify-content:flex-end;">
          <button class="btn-icon-only playbar-heart-btn liked-page-heart" title="Unlike track" data-track-id="${track.id}">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:var(--accent-color);"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (e.target.closest('.liked-page-heart')) return;
      audio.setPlaylist(likedTracks);
      audio.playTrack(track);
    });

    tr.querySelector('.liked-page-heart').addEventListener('click', async (e) => {
      e.stopPropagation();
      const tid = e.currentTarget.getAttribute('data-track-id');
      const finalTid = isNaN(tid) ? tid : Number(tid);
      
      const dbTrack = allTracks.find(t => t.id === finalTid);
      if (dbTrack) {
        dbTrack.liked = false;
        await updateTrack(dbTrack);
        await reloadAppData();
      }
    });

    DOM.likedTracksBody.appendChild(tr);
  });

  DOM.likedSongsPlayBtn.onclick = () => {
    playLikedSongsPlaylist();
  };
}

// Playback Trigger helpers
async function playUserPlaylist(playlistId) {
  const playlist = await getPlaylist(playlistId);
  if (!playlist || playlist.trackIds.length === 0) return;

  const allTracks = await getAllTracks();
  const playlistTracks = playlist.trackIds.map(tid => {
    const localTrack = allTracks.find(t => t.id === tid);
    if (localTrack) return localTrack;
    const synthTrack = SYNTH_TRACKS.find(s => s.id === tid);
    if (synthTrack) return synthTrack;
    return null;
  }).filter(Boolean);

  if (playlistTracks.length > 0) {
    audio.setPlaylist(playlistTracks);
    audio.playIndex(0);
  }
}

async function playLikedSongsPlaylist() {
  const allTracks = await getAllTracks();
  const likedTracks = allTracks.filter(t => t.liked);
  if (likedTracks.length > 0) {
    audio.setPlaylist(likedTracks);
    audio.playIndex(0);
  }
}

// 10. PLAYLIST DETAIL PAGE ADD SONG SEARCH ACTIONS
function setupPlaylistDetailsActions() {
  DOM.deletePlaylistBtn.addEventListener('click', async () => {
    if (currentPlaylistId !== null && confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
      await deletePlaylist(currentPlaylistId);
      navigateToView('home-view');
      await reloadAppData();
    }
  });

  DOM.playlistAddSearchInput.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim().toLowerCase();
    DOM.playlistAddSearchResults.innerHTML = '';
    if (!query) return;

    const allTracks = await getAllTracks();
    const matches = allTracks.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.artist.toLowerCase().includes(query)
    ).slice(0, 5);

    const synthMatches = SYNTH_TRACKS.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.artist.toLowerCase().includes(query)
    );

    const results = [...synthMatches, ...matches];

    if (results.length === 0) {
      DOM.playlistAddSearchResults.innerHTML = `<div style="font-size:13px;color:var(--text-muted);">No matching songs found in library.</div>`;
      return;
    }

    results.forEach(track => {
      const row = document.createElement('div');
      row.className = 'add-song-row';
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="track-mini-art" style="background-image: url('${track.cover || ''}'); width:32px; height:32px;"></div>
          <div style="display:flex;flex-direction:column;">
            <span style="font-size:13.5px;font-weight:700;color:var(--text-main);">${escapeHtml(track.title)}</span>
            <span style="font-size:12px;color:var(--text-muted);">${escapeHtml(track.artist)}</span>
          </div>
        </div>
        <button class="btn btn-secondary" style="font-size:11px;padding:4px 12px;">Add</button>
      `;

      row.querySelector('button').addEventListener('click', async () => {
        const playlist = await getPlaylist(currentPlaylistId);
        if (playlist) {
          if (!playlist.trackIds.includes(track.id)) {
            playlist.trackIds.push(track.id);
            await updatePlaylist(playlist);
            DOM.playlistAddSearchInput.value = '';
            DOM.playlistAddSearchResults.innerHTML = '';
            await reloadAppData();
          }
        }
      });

      DOM.playlistAddSearchResults.appendChild(row);
    });
  }, 250));
}

// 11. PLAYLIST ADD DROPDOWN SELECT MENU
function showPlaylistSelectMenu(track, x, y) {
  activeTrackForMenu = track;
  DOM.playlistMenuOptionsContainer.innerHTML = '';

  if (playlists.length === 0) {
    DOM.playlistMenuOptionsContainer.innerHTML = `
      <div style="font-size:12px;color:var(--text-dim);padding:8px 12px;text-align:center;">
        No playlists created.
      </div>
      <button class="menu-item-option" id="menu-create-first-playlist">Create Playlist</button>
    `;
    
    DOM.playlistMenuOptionsContainer.querySelector('#menu-create-first-playlist').onclick = () => {
      hidePlaylistSelectMenu();
      showCreatePlaylistModal();
    };
  } else {
    playlists.forEach(playlist => {
      const btn = document.createElement('button');
      btn.className = 'menu-item-option';
      btn.textContent = playlist.name;
      btn.addEventListener('click', async () => {
        const p = await getPlaylist(playlist.id);
        if (p) {
          let finalId = track.id;
          
          if (String(track.id).startsWith('preview-')) {
            alert('Please click the "Save" button to download this track for offline use before adding it to your custom playlist.');
            hidePlaylistSelectMenu();
            return;
          }
          
          if (!p.trackIds.includes(finalId)) {
            p.trackIds.push(finalId);
            await updatePlaylist(p);
            alert(`Added "${track.title}" to "${playlist.name}".`);
          } else {
            alert(`"${track.title}" is already in "${playlist.name}".`);
          }
        }
        hidePlaylistSelectMenu();
        await reloadAppData();
      });
      DOM.playlistMenuOptionsContainer.appendChild(btn);
    });
  }

  DOM.addToPlaylistMenu.style.display = 'block';
  
  const menuWidth = 180;
  const menuHeight = DOM.addToPlaylistMenu.offsetHeight || 150;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let left = x;
  let top = y;

  if (x + menuWidth > windowWidth) {
    left = windowWidth - menuWidth - 16;
  }
  if (y + menuHeight > windowHeight) {
    top = windowHeight - menuHeight - 16;
  }

  DOM.addToPlaylistMenu.style.left = `${left}px`;
  DOM.addToPlaylistMenu.style.top = `${top}px`;
}

function hidePlaylistSelectMenu() {
  DOM.addToPlaylistMenu.style.display = 'none';
  activeTrackForMenu = null;
}

// 12. TOGGLE LIKED STATE ON ANY TRACK
async function toggleLikeTrack(track) {
  const allTracks = await getAllTracks();
  const dbTrack = allTracks.find(t => t.id === track.id || (track.isSynth && t.id === track.id));

  if (dbTrack) {
    dbTrack.liked = !dbTrack.liked;
    await updateTrack(dbTrack);
    
    const curPlaying = audio.getCurrentTrack();
    if (curPlaying && curPlaying.id === track.id) {
      updatePlaybarHeartIcon(dbTrack.liked);
    }
    await reloadAppData();
  } else {
    if (track.isSynth) {
      await saveTrack(null, track.title, track.artist, track.duration, null, track.id, true);
      
      const curPlaying = audio.getCurrentTrack();
      if (curPlaying && curPlaying.id === track.id) {
        updatePlaybarHeartIcon(true);
      }
      await reloadAppData();
    } else if (String(track.id).startsWith('preview-') || String(track.id).startsWith('spotify-')) {
      // Preview URLs can be downloaded
      if (track.previewUrl) {
        alert('Downloading file to save this track offline...');
        try {
          const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(track.previewUrl)}`;
          const response = await fetch(proxiedUrl);
          if (!response.ok) throw new Error('Audio fetch failed');
          const blob = await response.blob();
          
          await saveTrack(blob, track.title, track.artist, track.duration, track.cover, track.id, true);
          
          const curPlaying = audio.getCurrentTrack();
          if (curPlaying && curPlaying.id === track.id) {
            updatePlaybarHeartIcon(true);
          }
          await reloadAppData();
        } catch (err) {
          console.error(err);
          // If download fails, save just metadata as liked
          await saveTrack(null, track.title, track.artist, track.duration, track.cover, track.id, true);
          await reloadAppData();
        }
      } else {
        // Just save metadata
        await saveTrack(null, track.title, track.artist, track.duration, track.cover, track.id, true);
        await reloadAppData();
      }
    }
  }
}

// 13. COLLAPSIBLE PANEL QUEUE LIST SYNCER
function updateRightPanelQueue() {
  DOM.rightPanelQueueContainer.innerHTML = '';
  
  const currentTrack = audio.getCurrentTrack();
  const queue = audio.getCurrentQueue();
  
  if (queue.length === 0 || audio.currentIndex === -1) {
    DOM.rightPanelQueueContainer.innerHTML = `<div style="font-size:12px;color:var(--text-dim);text-align:center;padding:16px 0;">Playback queue is empty.</div>`;
    return;
  }

  const startIndex = audio.currentIndex + 1;
  const nextUp = queue.slice(startIndex, startIndex + 8);

  if (nextUp.length === 0) {
    DOM.rightPanelQueueContainer.innerHTML = `<div style="font-size:12px;color:var(--text-dim);text-align:center;padding:16px 0;">End of playback queue.</div>`;
    return;
  }

  nextUp.forEach((track, index) => {
    const div = document.createElement('div');
    div.className = 'queue-row';
    const coverSrc = track.cover || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23282828"/><circle cx="50" cy="50" r="10" fill="gray"/></svg>';
    
    div.innerHTML = `
      <div class="queue-mini-cover" style="background-image: url('${coverSrc}');"></div>
      <div class="queue-row-info">
        <span class="queue-title truncate">${escapeHtml(track.title)}</span>
        <span class="queue-artist truncate">${escapeHtml(track.artist)}</span>
      </div>
    `;

    div.addEventListener('click', () => {
      audio.playIndex(startIndex + index);
    });

    DOM.rightPanelQueueContainer.appendChild(div);
  });
}

// 14. EQUALIZER BANDS COORDINATOR
function setupEqualizerBindings() {
  DOM.eqSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const band = Number(e.target.getAttribute('data-band'));
      const gain = Number(e.target.value);
      audio.setEqualizerBand(band, gain);
      
      const label = document.getElementById(`eq-val-${band}`);
      if (label) {
        label.textContent = `${gain > 0 ? '+' : ''}${gain}dB`;
      }
      DOM.eqPresetBtns.forEach(btn => btn.classList.remove('active'));
    });
  });

  DOM.eqPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.eqPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.getAttribute('data-preset');
      const levels = audio.setEqualizerPreset(preset);

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

// 15. SETTINGS AND SYNTH CUSTOMIZATION PANEL
function setupSettingsBindings() {
  DOM.clearDbBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your entire offline music library and playlists? This cannot be undone.')) {
      const db = await indexedDB.open('SpoptifyOfflineDB', 2);
      db.onsuccess = (e) => {
        const d = e.target.result;
        const tx = d.transaction(['tracks', 'playlists'], 'readwrite');
        tx.objectStore('tracks').clear();
        tx.objectStore('playlists').clear();
        
        tx.oncomplete = async () => {
          audio.setPlaylist(SYNTH_TRACKS);
          audio.stop();
          await reloadAppData();
          alert('Local music database cleared.');
        };
      };
    }
  });

  DOM.playSynthBtn.addEventListener('click', () => {
    const currentTrack = audio.getCurrentTrack();
    
    if (currentTrack && currentTrack.id === 'synth-custom' && audio.isPlaying) {
      audio.pause();
    } else {
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
      const track = audio.getCurrentTrack();
      if (track && track.id === 'synth-custom') {
        track.title = `Live Ambient (BPM: ${bpm})`;
        DOM.playbarTitle.textContent = track.title;
        DOM.largeTitle.textContent = track.title;
        DOM.rightPanelTitle.textContent = track.title;
      }
    }
  });
}

// 16. ITUNES ONLINE SEARCH & Autocomplete
function setupOnlineSearch() {
  if (!DOM.searchOnlineInput) return;

  const performSearch = async (forcedQuery = null) => {
    if (DOM.searchOnlineSuggestions) DOM.searchOnlineSuggestions.style.display = 'none';

    const query = forcedQuery !== null ? forcedQuery.trim() : DOM.searchOnlineInput.value.trim();
    if (!query) {
      showRecommendations();
      return;
    }

    DOM.searchOnlineInput.value = query;

    if (DOM.searchOnlineLoading) DOM.searchOnlineLoading.style.display = 'flex';
    hideRecommendations();
    if (DOM.searchOnlineResults) {
      DOM.searchOnlineResults.style.display = 'none';
      DOM.searchOnlineResults.innerHTML = '';
    }

    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=30`;
      const response = await fetch(url);
      const data = await response.json();

      if (DOM.searchOnlineLoading) DOM.searchOnlineLoading.style.display = 'none';
      if (DOM.searchOnlineResults) DOM.searchOnlineResults.style.display = 'grid';

      if (data.resultCount === 0) {
        if (DOM.searchOnlineResults) {
          DOM.searchOnlineResults.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--text-muted);">
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
          <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: #ff3366;">
            <p>Search failed. Check your internet connection and try again.</p>
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

  DOM.searchOnlineInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  const genreCards = document.querySelectorAll('.genre-card');
  genreCards.forEach(card => {
    card.addEventListener('click', () => {
      const query = card.getAttribute('data-query');
      performSearch(query);
    });
  });

  const artistCards = document.querySelectorAll('.artist-circle-card');
  artistCards.forEach(card => {
    card.addEventListener('click', () => {
      const query = card.getAttribute('data-query');
      performSearch(query);
    });
  });

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

  document.addEventListener('click', (e) => {
    if (DOM.searchOnlineSuggestions && !e.target.closest('.search-bar-wrapper')) {
      DOM.searchOnlineSuggestions.style.display = 'none';
    }
  });

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
      
      const input = document.getElementById('search-online-input');
      const event = new KeyboardEvent('keypress', {'key': 'Enter'});
      input.dispatchEvent(event);
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
      
      <button class="play-hover-btn" title="Stream song">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
      
      <div class="search-track-btn-group">
        <button class="search-play-btn plus-add-to-playlist" title="Add to Playlist">
          + Add
        </button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.plus-add-to-playlist')) return;
      
      const searchTrack = {
        id: 'search-' + track.trackId,
        title: track.trackName,
        artist: track.artistName,
        duration: durationSec,
        file: null,
        isSynth: false,
        cover: hiresArtwork,
        previewUrl: track.previewUrl
      };

      audio.playTrack(searchTrack);
    });

    const addBtn = card.querySelector('.plus-add-to-playlist');
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = addBtn.getBoundingClientRect();
      const trackObj = {
        id: 'search-' + track.trackId,
        title: track.trackName,
        artist: track.artistName,
        duration: durationSec,
        cover: hiresArtwork,
        previewUrl: track.previewUrl
      };
      
      getAllTracks().then(allTracks => {
        const dbTrack = allTracks.find(t => t.title === track.trackName && t.artist === track.artistName);
        if (dbTrack) {
          trackObj.id = dbTrack.id;
        }
        showPlaylistSelectMenu(trackObj, rect.left, rect.bottom + window.scrollY);
      });
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

async function playTrackItem(track) {
  const dbTracks = await getAllTracks();
  const fullPlaylist = [...SYNTH_TRACKS, ...dbTracks];
  audio.setPlaylist(fullPlaylist);
  audio.playTrack(track);
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// 17. SPOTIFY ACCOUNT SYNC UI LOGIC
function setupSpotifyBindings() {
  if (!DOM.spotifyClientIdInput) return;

  DOM.spotifyClientIdInput.value = getSpotifyClientId();

  DOM.spotifySaveClientIdBtn.addEventListener('click', () => {
    const clientId = DOM.spotifyClientIdInput.value.trim();
    if (clientId) {
      setSpotifyClientId(clientId);
      alert('Spotify Client ID saved. Redirecting to Spotify authorization page...');
      window.location.href = getSpotifyLoginUrl();
    } else {
      alert('Please enter a valid Client ID.');
    }
  });

  DOM.spotifyDisconnectBtn.addEventListener('click', () => {
    logoutSpotify();
    updateSpotifyUIState();
    reloadAppData();
  });

  DOM.spotifySyncBtn.addEventListener('click', async () => {
    DOM.spotifySyncBtn.disabled = true;
    DOM.spotifySyncBtn.innerHTML = '<span class="spinner"></span> Syncing...';
    
    try {
      await syncSpotifyData();
      DOM.spotifySyncSuccessText.style.display = 'block';
      setTimeout(() => {
        DOM.spotifySyncSuccessText.style.display = 'none';
      }, 3000);
    } catch (err) {
      alert('Failed to sync Spotify playlists. Your access token may have expired. Reconnecting...');
      window.location.href = getSpotifyLoginUrl();
    } finally {
      DOM.spotifySyncBtn.disabled = false;
      DOM.spotifySyncBtn.textContent = 'Sync Playlists Now';
    }
  });

  updateSpotifyUIState();
}

function updateSpotifyUIState() {
  if (isSpotifyConnected()) {
    DOM.spotifyConnectForm.style.display = 'none';
    DOM.spotifyConnectedStatus.style.display = 'block';
    
    fetchSpotifyProfile().then(profile => {
      DOM.spotifyUsername.textContent = profile.display_name || profile.id;
    }).catch(err => {
      console.warn('Failed to fetch profile (token might be invalid/expired):', err);
      logoutSpotify();
      DOM.spotifyConnectForm.style.display = 'block';
      DOM.spotifyConnectedStatus.style.display = 'none';
    });
  } else {
    DOM.spotifyConnectForm.style.display = 'block';
    DOM.spotifyConnectedStatus.style.display = 'none';
  }
}

async function syncSpotifyData() {
  if (!isSpotifyConnected()) return;
  
  try {
    const spPlaylists = await fetchSpotifyPlaylists();
    const allLocalTracks = await getAllTracks();
    const allLocalPlaylists = await getAllPlaylists();
    
    // 1. Sync custom playlists
    for (const spPlaylist of spPlaylists) {
      let localPlaylist = allLocalPlaylists.find(p => p.isSpotify && p.spotifyId === spPlaylist.id);
      
      if (!localPlaylist) {
        const newId = await createPlaylist(spPlaylist.name, spPlaylist.images?.[0]?.url || null);
        localPlaylist = await getPlaylist(newId);
        localPlaylist.isSpotify = true;
        localPlaylist.spotifyId = spPlaylist.id;
      } else {
        localPlaylist.name = spPlaylist.name;
        localPlaylist.cover = spPlaylist.images?.[0]?.url || null;
      }
      
      const spTracks = await fetchSpotifyPlaylistTracks(spPlaylist.id);
      const trackIdsList = [];
      
      for (const spTrack of spTracks) {
        const dbTrack = allLocalTracks.find(t => t.id === spTrack.id);
        
        if (!dbTrack) {
          await saveTrack(null, spTrack.title, spTrack.artist, spTrack.duration, spTrack.cover, spTrack.id, false);
        }
        trackIdsList.push(spTrack.id);
      }
      
      localPlaylist.trackIds = trackIdsList;
      await updatePlaylist(localPlaylist);
    }
    
    // 2. Sync Liked Songs
    const spLikedTracks = await fetchSpotifyLikedTracks();
    for (const spTrack of spLikedTracks) {
      const dbTrack = allLocalTracks.find(t => t.id === spTrack.id);
      
      if (!dbTrack) {
        await saveTrack(null, spTrack.title, spTrack.artist, spTrack.duration, spTrack.cover, spTrack.id, true);
      } else {
        if (!dbTrack.liked) {
          dbTrack.liked = true;
          await updateTrack(dbTrack);
        }
      }
    }
    
    await reloadAppData();
    return true;
  } catch (err) {
    console.error('Error syncing Spotify playlists:', err);
    throw err;
  }
}

// 18. UTILITIES
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

// 19. ACCESS CONTROL & PASSCODE GUEST LOCK LOGIC
function checkAccessControl() {
  const isUnlocked = localStorage.getItem('spoptify_unlocked') === 'true';
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');

  if (codeParam === ACCESS_CODE) {
    localStorage.setItem('spoptify_unlocked', 'true');
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

  const settingsCodeLabel = document.getElementById('settings-access-code');
  if (settingsCodeLabel) {
    settingsCodeLabel.textContent = ACCESS_CODE;
  }

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

// 20. PWA STANDALONE INSTALLATION MANAGEMENT
let deferredPrompt = null;

function setupPwaInstallation() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButtons();
  });

  const onInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA Install Choice outcome: ${outcome}`);
      deferredPrompt = null;
      hideInstallButtons();
    } else {
      alert('The app is already installed or your browser doesn\'t support automatic prompt installation. Install it from your browser menu ("Add to Home Screen" on mobile or click the Monitor icon in your PC browser bar).');
    }
  };

  if (DOM.headerInstallBtn) DOM.headerInstallBtn.addEventListener('click', onInstallClick);
  if (DOM.settingsInstallBtn) DOM.settingsInstallBtn.addEventListener('click', onInstallClick);

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallButtons();
  });
}

function showInstallButtons() {
  if (DOM.headerInstallBtn) DOM.headerInstallBtn.style.display = 'inline-flex';
  if (DOM.settingsInstallBtn) {
    DOM.settingsInstallBtn.disabled = false;
    DOM.settingsInstallBtn.textContent = 'Install Standalone App';
  }
}

function hideInstallButtons() {
  if (DOM.headerInstallBtn) DOM.headerInstallBtn.style.display = 'none';
  if (DOM.settingsInstallBtn) {
    DOM.settingsInstallBtn.disabled = true;
    DOM.settingsInstallBtn.textContent = 'App Installed ✓';
  }
}

// 21. SERVICE WORKER CONTROL
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Spoptify Service Worker registered:', reg.scope);
          
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New update available, auto-skipping wait...');
                newWorker.postMessage({ action: 'skipWaiting' });
              }
            });
          });
        })
        .catch(err => console.error('Service Worker registration failed:', err));
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

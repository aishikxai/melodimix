import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Home, 
  Search, 
  Library, 
  Heart, 
  Plus, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX,
  Download, 
  Bookmark, 
  Trash2, 
  Music,
  FolderHeart,
  X,
  RefreshCw,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';

const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  return 'http://localhost:8000/api';
};

const API_BASE = getApiBase();

export default function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);

  // Backend Sync States
  const [library, setLibrary] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [downloadedIds, setDownloadedIds] = useState(new Set());
  const [playlistTracks, setPlaylistTracks] = useState([]);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Audio Playback States
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState('none'); // 'none' | 'one'
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Interactive UI States
  const [toasts, setToasts] = useState([]);
  const [errorBanner, setErrorBanner] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [activeDropdownTrackId, setActiveDropdownTrackId] = useState(null);

  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Refs
  const audioRef = useRef(null);

  // Greeting Message based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Toast notification manager
  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Backend API Sync
  const fetchLibrary = async () => {
    try {
      const res = await axios.get(`${API_BASE}/library`);
      setLibrary(res.data);
    } catch (err) {
      setErrorBanner('Failed to load library tracks from database.');
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await axios.get(`${API_BASE}/playlists`);
      setPlaylists(res.data);
    } catch (err) {
      setErrorBanner('Failed to load playlists.');
    }
  };

  const fetchDownloaded = async () => {
    try {
      const res = await axios.get(`${API_BASE}/downloaded`);
      setDownloadedIds(new Set(res.data));
    } catch (err) {
      console.error('Failed to fetch local downloads:', err);
    }
  };

  const fetchPlaylistTracks = async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/playlists/${id}/tracks`);
      setPlaylistTracks(res.data);
    } catch (err) {
      setErrorBanner('Failed to load playlist tracks.');
    }
  };

  // Initial Sync
  useEffect(() => {
    fetchLibrary();
    fetchPlaylists();
    fetchDownloaded();
  }, []);

  // PWA beforeinstallprompt handler
  useEffect(() => {
    // Check if the prompt was already captured globally before React loaded
    if (window.deferredInstallPrompt) {
      setDeferredPrompt(window.deferredInstallPrompt);
      setIsInstallable(true);
      console.log('Using pre-captured PWA install prompt');
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('beforeinstallprompt event fired and captured');
    };

    const handlePromptReady = (e) => {
      setDeferredPrompt(e.detail);
      setIsInstallable(true);
      console.log('PWA install prompt notification received');
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      window.deferredInstallPrompt = null;
      addToast('Melodix successfully installed as a standalone app!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('installpromptready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('installpromptready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.deferredInstallPrompt;
    if (!promptEvent) {
      addToast('Melodix is already installed or not supported for installation.', 'info');
      return;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);
    setDeferredPrompt(null);
    window.deferredInstallPrompt = null;
    setIsInstallable(false);
  };

  // Update playlist tracks whenever view changes
  useEffect(() => {
    if (currentView === 'playlist' && selectedPlaylistId !== null) {
      fetchPlaylistTracks(selectedPlaylistId);
    }
  }, [currentView, selectedPlaylistId]);

  // Audio HTML5 setup
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const onEnded = () => {
      handleTrackEnded();
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [queue, currentIndex, isRepeat, isShuffle]);

  // Handle Playback triggers
  const handleTrackEnded = () => {
    if (isRepeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    } else {
      handleNext();
    }
  };

  // Audio volume configuration
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Progress slider setInterval loop
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Search Action
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoadingSearch(true);
    setSearchError(null);
    try {
      const res = await axios.get(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
    } catch (err) {
      setSearchError('Search failed. Please check internet connection or server.');
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Save Track to Library
  const handleSaveToLibrary = async (track) => {
    const payload = {
      youtube_id: track.id || track.youtube_id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      thumbnail: track.thumbnail,
      liked: false
    };

    try {
      await axios.post(`${API_BASE}/library`, payload);
      addToast(`Saved "${track.title}" to library.`, 'success');
      fetchLibrary();
    } catch (err) {
      addToast('Failed to save track to library.', 'error');
    }
  };

  // Download Track offline
  const handleDownload = async (track) => {
    const ytId = track.id || track.youtube_id;
    try {
      addToast(`Started downloading "${track.title}"...`, 'info');
      await axios.post(`${API_BASE}/download/${ytId}`);
      // Periodically poll for downloaded status
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const checkRes = await axios.get(`${API_BASE}/downloaded`);
        const newDownloaded = new Set(checkRes.data);
        if (newDownloaded.has(ytId)) {
          setDownloadedIds(newDownloaded);
          addToast(`"${track.title}" downloaded offline.`, 'success');
          fetchLibrary();
          clearInterval(interval);
        }
        if (attempts > 30) {
          clearInterval(interval);
        }
      }, 3000);
    } catch (err) {
      addToast('Download failed.', 'error');
    }
  };

  // Toggle Like Status
  const handleToggleLike = async (track) => {
    const ytId = track.youtube_id || track.id;
    try {
      const res = await axios.patch(`${API_BASE}/library/${ytId}/like`);
      // Update local state
      setLibrary((prev) => prev.map((t) => (t.youtube_id === ytId ? res.data : t)));
      if (queue[currentIndex]?.youtube_id === ytId) {
        setQueue((prev) => prev.map((t, i) => (i === currentIndex ? { ...t, liked: res.data.liked } : t)));
      }
      addToast(res.data.liked ? 'Added to Liked Songs.' : 'Removed from Liked Songs.', 'success');
    } catch (err) {
      addToast('Failed to update liked status.', 'error');
    }
  };

  // Remove Track from Library
  const handleRemoveFromLibrary = async (track) => {
    const ytId = track.youtube_id || track.id;
    try {
      await axios.delete(`${API_BASE}/library/${ytId}`);
      addToast(`Removed "${track.title}" from library.`, 'success');
      fetchLibrary();
      fetchDownloaded();
    } catch (err) {
      addToast('Failed to remove track from library.', 'error');
    }
  };

  // Create Playlist
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      await axios.post(`${API_BASE}/playlists`, { name: newPlaylistName });
      addToast(`Playlist "${newPlaylistName}" created.`, 'success');
      setNewPlaylistName('');
      setShowPlaylistModal(false);
      fetchPlaylists();
    } catch (err) {
      addToast('Failed to create playlist.', 'error');
    }
  };

  // Delete Playlist
  const handleDeletePlaylist = async (id, name) => {
    if (!confirm(`Delete playlist "${name}"?`)) return;
    try {
      await axios.delete(`${API_BASE}/playlists/${id}`);
      addToast(`Deleted playlist "${name}".`, 'success');
      setCurrentView('home');
      fetchPlaylists();
    } catch (err) {
      addToast('Failed to delete playlist.', 'error');
    }
  };

  // Add Track to Playlist
  const handleAddTrackToPlaylist = async (playlistId, track) => {
    const ytId = track.youtube_id || track.id;
    try {
      await axios.post(`${API_BASE}/playlists/${playlistId}/tracks`, { track_id: ytId });
      addToast(`Added "${track.title}" to playlist.`, 'success');
      setActiveDropdownTrackId(null);
    } catch (err) {
      addToast('Failed to add track to playlist.', 'error');
    }
  };

  // Remove Track from Playlist
  const handleRemoveTrackFromPlaylist = async (playlistId, trackId) => {
    try {
      await axios.delete(`${API_BASE}/playlists/${playlistId}/tracks/${trackId}`);
      addToast('Track removed from playlist.', 'success');
      fetchPlaylistTracks(playlistId);
    } catch (err) {
      addToast('Failed to remove track.', 'error');
    }
  };

  // Playback Operations
  const playTrack = async (newQueue, index) => {
    setQueue(newQueue);
    setCurrentIndex(index);
    const track = newQueue[index];
    const ytId = track.youtube_id || track.id;

    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    setCurrentTime(0);

    try {
      // Fetch stream/file direct
      const streamUrl = `${API_BASE}/stream/${ytId}`;
      const res = await fetch(streamUrl);
      const contentType = res.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        audioRef.current.src = data.stream_url;
      } else {
        audioRef.current.src = streamUrl;
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      addToast('Could not play this track.', 'error');
      // Auto-advance
      setTimeout(() => handleNext(), 1000);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || currentIndex === -1) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      playTrack(queue, randomIndex);
    } else {
      const nextIndex = (currentIndex + 1) % queue.length;
      playTrack(queue, nextIndex);
    }
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    const prevIndex = currentIndex - 1 < 0 ? queue.length - 1 : currentIndex - 1;
    playTrack(queue, prevIndex);
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  // Format Time representation
  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainSecs = Math.floor(secs % 60);
    return `${mins}:${remainSecs < 10 ? '0' : ''}${remainSecs}`;
  };

  const currentTrack = currentIndex !== -1 ? queue[currentIndex] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Toast Notification Deck */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button 
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="app-container">
        {/* Sidebar Container */}
        <aside className="sidebar">
          <div className="logo-container">
            <Music className="logo-icon" size={28} />
            <span className="logo-text">Melodix</span>
          </div>

          <nav className="nav-group">
            <button 
              onClick={() => { setCurrentView('home'); setSelectedPlaylistId(null); }}
              className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
            >
              <Home size={20} />
              <span>Home</span>
            </button>
            <button 
              onClick={() => { setCurrentView('search'); setSelectedPlaylistId(null); }}
              className={`nav-link ${currentView === 'search' ? 'active' : ''}`}
            >
              <Search size={20} />
              <span>Search</span>
            </button>
            <button 
              onClick={() => { setCurrentView('library'); setSelectedPlaylistId(null); }}
              className={`nav-link ${currentView === 'library' ? 'active' : ''}`}
            >
              <Library size={20} />
              <span>Library</span>
            </button>
            <button 
              onClick={() => { setCurrentView('liked'); setSelectedPlaylistId(null); }}
              className={`nav-link ${currentView === 'liked' ? 'active' : ''}`}
            >
              <Heart size={20} />
              <span>Liked Songs</span>
            </button>
          </nav>

          <div className="playlists-section">
            <div className="playlists-header">
              <span>Playlists</span>
              <button className="new-playlist-btn" onClick={() => setShowPlaylistModal(true)}>
                <Plus size={16} />
                <span>New Playlist</span>
              </button>
            </div>

            <div className="playlists-list">
              {playlists.map((playlist) => (
                <div 
                  key={playlist.id} 
                  onClick={() => { 
                    setCurrentView('playlist'); 
                    setSelectedPlaylistId(playlist.id); 
                  }}
                  className={`playlist-link ${currentView === 'playlist' && selectedPlaylistId === playlist.id ? 'active' : ''}`}
                >
                  {playlist.name}
                </div>
              ))}
            </div>
          </div>

          {isInstallable && (
            <button className="install-app-btn" onClick={handleInstallClick}>
              <Download size={18} />
              <span>Install Standalone App</span>
            </button>
          )}
        </aside>

        {/* Main Content Pane */}
        <main className="main-content">
          {errorBanner && (
            <div className="error-banner">
              <span>{errorBanner}</span>
              <button className="error-banner-close" onClick={() => setErrorBanner(null)}>
                <X size={18} />
              </button>
            </div>
          )}

          {/* VIEW ROUTING */}
          {currentView === 'home' && (
            <div>
              <h1 className="view-header">{getGreeting()}</h1>
              
              {/* Recently Played */}
              {library.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '20px', marginBottom: '16px', fontWeight: 700 }}>Recently Saved</h2>
                  <div className="scroll-row">
                    {library.slice(0, 6).map((track, i) => (
                      <div key={track.youtube_id} className="track-card" onClick={() => playTrack(library, i)}>
                        <div className="card-art-container">
                          <img className="card-art" src={track.thumbnail} alt={track.title} />
                          <div className="card-play-overlay">
                            <Play size={20} fill="#000" />
                          </div>
                        </div>
                        <div className="card-title">{track.title}</div>
                        <div className="card-subtitle">{track.artist}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Library Grid */}
              <div>
                <h2 style={{ fontSize: '20px', marginBottom: '16px', fontWeight: 700 }}>Your Library</h2>
                {library.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', padding: '24px 0' }}>
                    Your library is empty. Search for tracks on YouTube to add them!
                  </div>
                ) : (
                  <div className="card-grid">
                    {library.map((track, i) => (
                      <div key={track.youtube_id} className="track-card" onClick={() => playTrack(library, i)}>
                        <div className="card-art-container">
                          <img className="card-art" src={track.thumbnail} alt={track.title} />
                          <div className="card-play-overlay">
                            <Play size={20} fill="#000" />
                          </div>
                        </div>
                        <div className="card-title">{track.title}</div>
                        <div className="card-subtitle">{track.artist}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === 'search' && (
            <div>
              <h1 className="view-header">Search</h1>
              <form onSubmit={handleSearch} className="search-input-wrapper">
                <Search className="search-input-icon" size={20} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  placeholder="What do you want to listen to?"
                />
              </form>

              {isLoadingSearch && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div className="spinner"></div>
                </div>
              )}

              {searchError && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p style={{ color: '#e91429', marginBottom: '12px' }}>{searchError}</p>
                  <button onClick={handleSearch} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={14} />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {!isLoadingSearch && !searchError && searchResults.length > 0 && (
                <table className="track-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Title</th>
                      <th style={{ width: '30%' }}>Artist</th>
                      <th style={{ width: '15%' }}>Duration</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((track, idx) => (
                      <tr key={track.id} className="table-row">
                        <td>
                          <div className="table-cell-title">
                            <img className="table-thumbnail" src={track.thumbnail} alt={track.title} />
                            <div className="table-text-container">
                              <span className="table-track-title">{track.title}</span>
                              {downloadedIds.has(track.id) && (
                                <span style={{ marginTop: '4px' }}>
                                  <span className="badge badge-green">Downloaded</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{track.artist}</td>
                        <td>{formatTime(track.duration)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="action-btn green" onClick={() => playTrack(searchResults, idx)} title="Play">
                              <Play size={16} fill="currentColor" />
                            </button>
                            <button className="action-btn" onClick={() => handleSaveToLibrary(track)} title="Add to Library">
                              <Bookmark size={16} />
                            </button>
                            <button className="action-btn" onClick={() => handleDownload(track)} title="Download Offline">
                              <Download size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {currentView === 'library' && (
            <div>
              <h1 className="view-header">Library</h1>
              {library.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>No tracks saved. Use Search to find tracks!</div>
              ) : (
                <table className="track-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Title</th>
                      <th style={{ width: '25%' }}>Artist</th>
                      <th style={{ width: '15%' }}>Duration</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {library.map((track, idx) => (
                      <tr key={track.youtube_id} className={`table-row ${currentTrack?.youtube_id === track.youtube_id ? 'playing' : ''}`}>
                        <td>
                          <div className="table-cell-title">
                            <img className="table-thumbnail" src={track.thumbnail} alt={track.title} />
                            <div className="table-text-container">
                              <span className="table-track-title">{track.title}</span>
                              {downloadedIds.has(track.youtube_id) && (
                                <span style={{ marginTop: '4px' }}>
                                  <span className="badge badge-green">Downloaded</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{track.artist}</td>
                        <td>{formatTime(track.duration)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button className="action-btn green" onClick={() => playTrack(library, idx)} title="Play">
                              <Play size={16} fill="currentColor" />
                            </button>
                            <button className={`action-btn ${track.liked ? 'liked' : ''}`} onClick={() => handleToggleLike(track)} style={{ color: track.liked ? 'var(--accent)' : 'inherit' }} title="Like">
                              <Heart size={16} fill={track.liked ? 'currentColor' : 'none'} />
                            </button>
                            <button className="action-btn red" onClick={() => handleRemoveFromLibrary(track)} title="Remove from Library">
                              <Trash2 size={16} />
                            </button>
                            <button className="action-btn" onClick={() => handleDownload(track)} title="Download Offline">
                              <Download size={16} />
                            </button>
                            
                            <div className="dropdown-container">
                              <button className="action-btn" onClick={() => setActiveDropdownTrackId(activeDropdownTrackId === track.youtube_id ? null : track.youtube_id)} title="Add to Playlist">
                                <MoreVertical size={16} />
                              </button>
                              {activeDropdownTrackId === track.youtube_id && (
                                <div className="dropdown-menu">
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 12px', fontWeight: 600 }}>Add to Playlist</span>
                                  {playlists.map((pl) => (
                                    <button 
                                      key={pl.id} 
                                      className="dropdown-item"
                                      onClick={() => handleAddTrackToPlaylist(pl.id, track)}
                                    >
                                      {pl.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {currentView === 'liked' && (
            <div>
              <h1 className="view-header">Liked Songs</h1>
              {library.filter(t => t.liked).length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>You haven't liked any songs yet. Click the heart icon on your tracks!</div>
              ) : (
                <table className="track-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Title</th>
                      <th style={{ width: '25%' }}>Artist</th>
                      <th style={{ width: '15%' }}>Duration</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {library.filter(t => t.liked).map((track, idx, arr) => (
                      <tr key={track.youtube_id} className={`table-row ${currentTrack?.youtube_id === track.youtube_id ? 'playing' : ''}`}>
                        <td>
                          <div className="table-cell-title">
                            <img className="table-thumbnail" src={track.thumbnail} alt={track.title} />
                            <div className="table-text-container">
                              <span className="table-track-title">{track.title}</span>
                              {downloadedIds.has(track.youtube_id) && (
                                <span style={{ marginTop: '4px' }}>
                                  <span className="badge badge-green">Downloaded</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{track.artist}</td>
                        <td>{formatTime(track.duration)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button className="action-btn green" onClick={() => playTrack(arr, idx)} title="Play">
                              <Play size={16} fill="currentColor" />
                            </button>
                            <button className="action-btn liked" onClick={() => handleToggleLike(track)} style={{ color: 'var(--accent)' }} title="Unlike">
                              <Heart size={16} fill="currentColor" />
                            </button>
                            <button className="action-btn" onClick={() => handleDownload(track)} title="Download Offline">
                              <Download size={16} />
                            </button>
                            
                            <div className="dropdown-container">
                              <button className="action-btn" onClick={() => setActiveDropdownTrackId(activeDropdownTrackId === track.youtube_id ? null : track.youtube_id)} title="Add to Playlist">
                                <MoreVertical size={16} />
                              </button>
                              {activeDropdownTrackId === track.youtube_id && (
                                <div className="dropdown-menu">
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 12px', fontWeight: 600 }}>Add to Playlist</span>
                                  {playlists.map((pl) => (
                                    <button 
                                      key={pl.id} 
                                      className="dropdown-item"
                                      onClick={() => handleAddTrackToPlaylist(pl.id, track)}
                                    >
                                      {pl.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {currentView === 'playlist' && selectedPlaylistId !== null && (
            <div>
              {playlists.filter((p) => p.id === selectedPlaylistId).map((playlist) => (
                <div key={playlist.id}>
                  <div className="playlists-container-header">
                    <div>
                      <h1 className="view-header" style={{ marginBottom: '4px' }}>{playlist.name}</h1>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{playlistTracks.length} tracks</p>
                    </div>
                    <button 
                      className="delete-playlist-btn"
                      onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                    >
                      Delete Playlist
                    </button>
                  </div>

                  {playlistTracks.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', marginTop: '24px' }}>This playlist is empty. Add songs from your Library!</div>
                  ) : (
                    <table className="track-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Title</th>
                          <th style={{ width: '30%' }}>Artist</th>
                          <th style={{ width: '15%' }}>Duration</th>
                          <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playlistTracks.map((track, idx) => (
                          <tr key={track.youtube_id} className={`table-row ${currentTrack?.youtube_id === track.youtube_id ? 'playing' : ''}`}>
                            <td>
                              <div className="table-cell-title">
                                <img className="table-thumbnail" src={track.thumbnail} alt={track.title} />
                                <div className="table-text-container">
                                  <span className="table-track-title">{track.title}</span>
                                </div>
                              </div>
                            </td>
                            <td>{track.artist}</td>
                            <td>{formatTime(track.duration)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="action-btn green" onClick={() => playTrack(playlistTracks, idx)} title="Play">
                                  <Play size={16} fill="currentColor" />
                                </button>
                                <button className="action-btn red" onClick={() => handleRemoveTrackFromPlaylist(playlist.id, track.youtube_id)} title="Remove from Playlist">
                                  <X size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Persistent Bottom Player Bar */}
      <footer className="player-bar">
        {/* Left Side Info */}
        <div className="player-left">
          {currentTrack ? (
            <>
              <img className="player-art" src={currentTrack.thumbnail} alt={currentTrack.title} />
              <div className="player-track-info">
                <span className="player-track-title">{currentTrack.title}</span>
                <span className="player-track-artist">{currentTrack.artist}</span>
              </div>
              <button 
                className={`player-like-btn ${currentTrack.liked ? 'liked' : ''}`}
                onClick={() => handleToggleLike(currentTrack)}
              >
                <Heart size={18} fill={currentTrack.liked ? 'currentColor' : 'none'} />
              </button>
            </>
          ) : (
            <>
              <div className="player-art" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#282828' }}>
                <Music size={24} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="player-track-info">
                <span className="player-track-title" style={{ color: 'var(--text-secondary)' }}>No Track Selected</span>
                <span className="player-track-artist">-</span>
              </div>
            </>
          )}
        </div>

        {/* Center Side Controls */}
        <div className="player-center">
          <div className="player-controls">
            <button 
              className={`player-btn ${isShuffle ? 'active' : ''}`} 
              onClick={() => setIsShuffle(!isShuffle)}
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>
            <button className="player-btn" onClick={handlePrev} title="Previous">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button className="player-btn play-pause-btn" onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={20} fill="#000" /> : <Play size={20} style={{ marginLeft: '2px' }} fill="#000" />}
            </button>
            <button className="player-btn" onClick={handleNext} title="Next">
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button 
              className={`player-btn ${isRepeat === 'one' ? 'active' : ''}`} 
              onClick={() => setIsRepeat(isRepeat === 'one' ? 'none' : 'one')}
              title="Repeat One"
            >
              <Repeat size={16} />
            </button>
          </div>

          <div className="player-timeline">
            <span className="time-display">{formatTime(currentTime)}</span>
            <input 
              type="range" 
              className="progress-slider"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
            />
            <span className="time-display">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Side Volume */}
        <div className="player-right">
          <div className="volume-container">
            <button className="player-btn" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input 
              type="range" 
              className="volume-slider"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
            />
          </div>
        </div>
      </footer>

      {/* Playlist Creation Dialog Modal */}
      {showPlaylistModal && (
        <div className="modal-overlay" onClick={() => setShowPlaylistModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create Playlist</h3>
            <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="text" 
                className="modal-input" 
                placeholder="My Playlist #1"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPlaylistModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

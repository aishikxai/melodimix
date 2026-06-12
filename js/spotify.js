// Spotify API Manager - Handles Implicit Grant OAuth and Web API Queries

const CLIENT_ID_KEY = 'spoptify_spotify_client_id';
const ACCESS_TOKEN_KEY = 'spoptify_spotify_access_token';
const EXPIRES_KEY = 'spoptify_spotify_expires_at';

// Get redirect URI dynamically matching host location (handles localhost and github pages)
function getRedirectUri() {
  return window.location.origin + window.location.pathname;
}

export function setSpotifyClientId(clientId) {
  if (clientId) {
    localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
  } else {
    localStorage.removeItem(CLIENT_ID_KEY);
  }
}

export function getSpotifyClientId() {
  return localStorage.getItem(CLIENT_ID_KEY) || '';
}

export function getSpotifyAccessToken() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_KEY);
  
  if (!token || !expiresAt) return null;
  
  // Check if token has expired (with 1 min buffer)
  if (Date.now() > Number(expiresAt) - 60000) {
    logoutSpotify();
    return null;
  }
  
  return token;
}

export function isSpotifyConnected() {
  return getSpotifyAccessToken() !== null;
}

export function getSpotifyLoginUrl() {
  const clientId = getSpotifyClientId();
  if (!clientId) return '';

  const redirectUri = encodeURIComponent(getRedirectUri());
  const scopes = encodeURIComponent('playlist-read-private user-library-read');
  
  return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}`;
}

export function handleSpotifyCallback() {
  const hash = window.location.hash;
  if (!hash) return false;

  const params = new URLSearchParams(hash.substring(1));
  const token = params.get('access_token');
  const expiresIn = params.get('expires_in');

  if (token && expiresIn) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    const expiresAt = Date.now() + Number(expiresIn) * 1000;
    localStorage.setItem(EXPIRES_KEY, expiresAt.toString());
    
    // Clear URL hash without reloading page
    window.history.replaceState('', document.title, window.location.pathname + window.location.search);
    return true;
  }

  return false;
}

export function logoutSpotify() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

// REST Web API request wrapper
async function spotifyFetch(endpoint) {
  const token = getSpotifyAccessToken();
  if (!token) throw new Error('Not authenticated with Spotify');

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    logoutSpotify();
    throw new Error('Spotify session expired. Please connect again.');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchSpotifyProfile() {
  return spotifyFetch('/me');
}

export async function fetchSpotifyPlaylists() {
  let playlists = [];
  let url = '/me/playlists?limit=50';
  
  while (url) {
    const data = await spotifyFetch(url.replace('https://api.spotify.com/v1', ''));
    playlists = playlists.concat(data.items);
    url = data.next; // Pagination support
  }
  
  return playlists;
}

export async function fetchSpotifyPlaylistTracks(playlistId) {
  let tracks = [];
  let url = `/playlists/${playlistId}/tracks?limit=100`;
  
  while (url) {
    const data = await spotifyFetch(url.replace('https://api.spotify.com/v1', ''));
    
    // Extract metadata
    const items = data.items.map(item => {
      if (!item.track) return null;
      
      return {
        id: 'spotify-' + item.track.id,
        title: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        album: item.track.album.name,
        duration: Math.floor(item.track.duration_ms / 1000),
        cover: item.track.album.images?.[0]?.url || null,
        previewUrl: item.track.preview_url || null,
        isSpotify: true
      };
    }).filter(Boolean);

    tracks = tracks.concat(items);
    url = data.next;
  }

  return tracks;
}

export async function fetchSpotifyLikedTracks() {
  let tracks = [];
  let url = '/me/tracks?limit=50';

  while (url) {
    const data = await spotifyFetch(url.replace('https://api.spotify.com/v1', ''));
    
    const items = data.items.map(item => {
      if (!item.track) return null;
      
      return {
        id: 'spotify-' + item.track.id,
        title: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        album: item.track.album.name,
        duration: Math.floor(item.track.duration_ms / 1000),
        cover: item.track.album.images?.[0]?.url || null,
        previewUrl: item.track.preview_url || null,
        isSpotify: true
      };
    }).filter(Boolean);

    tracks = tracks.concat(items);
    url = data.next;
  }

  return tracks;
}

const DB_NAME = 'SpoptifyOfflineDB';
const DB_VERSION = 2;
const STORE_NAME = 'tracks';
const PLAYLISTS_STORE = 'playlists';

let dbInstance = null;

function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database failed to open:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Save or update track (stores binary Blobs offline)
export async function saveTrack(file, title, artist, duration, coverUrl, customId = null, liked = false) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const track = {
      file: file || null, // Blob of the audio file or null
      title: title || 'Unknown Track',
      artist: artist || 'Unknown Artist',
      duration: duration || 0,
      cover: coverUrl || null,
      liked: !!liked,
      addedAt: Date.now()
    };

    if (customId !== null) {
      track.id = customId;
    }

    const request = store.put(track); // put will add or overwrite

    request.onsuccess = () => {
      resolve(request.result); // Returns the key/id
    };

    request.onerror = (event) => {
      console.error('Error saving track:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Update an existing track object directly (useful for liking, updating fields)
export async function updateTrack(track) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(track);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('Error updating track:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function getTrack(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    // Convert to number if it looks like a number ID
    const queryId = isNaN(id) ? id : Number(id);
    const request = store.get(queryId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export async function getAllTracks() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by added date descending
      const tracks = request.result.sort((a, b) => b.addedAt - a.addedAt);
      resolve(tracks);
    };

    request.onerror = (event) => {
      console.error('Error fetching tracks:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function deleteTrack(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const deleteId = isNaN(id) ? id : Number(id);
    const request = store.delete(deleteId);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event) => {
      console.error('Error deleting track:', event.target.error);
      reject(event.target.error);
    };
  });
}

// PLAYLISTS DATABASE CRUD OPERATIONS
export async function createPlaylist(name, cover = null) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE], 'readwrite');
    const store = transaction.objectStore(PLAYLISTS_STORE);

    const playlist = {
      name: name || 'New Playlist',
      cover: cover,
      trackIds: [], // Array of track IDs (numbers or strings)
      createdAt: Date.now()
    };

    const request = store.add(playlist);

    request.onsuccess = () => {
      resolve(request.result); // Returns the playlist key/id
    };

    request.onerror = (event) => {
      console.error('Error creating playlist:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function getAllPlaylists() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE], 'readonly');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const playlists = request.result.sort((a, b) => b.createdAt - a.createdAt);
      resolve(playlists);
    };

    request.onerror = (event) => {
      console.error('Error fetching playlists:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function getPlaylist(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE], 'readonly');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.get(Number(id));

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('Error fetching playlist:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function updatePlaylist(playlist) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE], 'readwrite');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.put(playlist);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('Error updating playlist:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function deletePlaylist(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE], 'readwrite');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.delete(Number(id));

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event) => {
      console.error('Error deleting playlist:', event.target.error);
      reject(event.target.error);
    };
  });
}

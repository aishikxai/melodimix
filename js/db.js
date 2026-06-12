const DB_NAME = 'SpoptifyOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

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
    };
  });
}

export async function saveTrack(file, title, artist, duration, coverBase64) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const track = {
      file, // Blob of the audio file
      title: title || 'Unknown Track',
      artist: artist || 'Unknown Artist',
      duration: duration || 0,
      cover: coverBase64 || null,
      addedAt: Date.now()
    };

    const request = store.add(track);

    request.onsuccess = () => {
      resolve(request.result); // Returns the generated key/id
    };

    request.onerror = (event) => {
      console.error('Error saving track:', event.target.error);
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
    const request = store.delete(Number(id));

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event) => {
      console.error('Error deleting track:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Spoptify Audio Stream Resolver - Queries Piped APIs for full-length audio

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.yt',
  'https://pipedapi.col.ooo',
  'https://piped-api.lunar.icu',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.ox.ovh'
];

async function tryFetchWithFallback(endpointGenFn) {
  let lastError = null;
  
  for (const baseUrl of PIPED_INSTANCES) {
    try {
      const url = endpointGenFn(baseUrl);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn(`Piped instance ${baseUrl} failed:`, err);
      lastError = err;
    }
  }
  
  throw lastError || new Error('All Piped instances failed');
}

export async function resolveFullTrackStream(title, artist, fallbackPreviewUrl = null) {
  try {
    const query = encodeURIComponent(`${artist} - ${title} (Official Audio)`);
    
    // 1. Search YouTube videos via Piped API
    const searchData = await tryFetchWithFallback(
      (base) => `${base}/search?q=${query}&filter=videos`
    );
    
    if (!searchData || !searchData.items || searchData.items.length === 0) {
      throw new Error('No YouTube videos found');
    }
    
    const videoId = searchData.items[0].id;
    if (!videoId) throw new Error('Invalid video ID');

    // 2. Fetch direct streams for this videoId
    const streamsData = await tryFetchWithFallback(
      (base) => `${base}/streams/${videoId}`
    );

    if (!streamsData || !streamsData.audioStreams || streamsData.audioStreams.length === 0) {
      throw new Error('No audio streams found for video');
    }

    // Sort by quality (highest bitrate first)
    const audioStreams = streamsData.audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    
    // Pick the first audio-only format
    const bestAudio = audioStreams.find(s => s.mimeType?.startsWith('audio/'));
    
    if (!bestAudio || !bestAudio.url) {
      throw new Error('No direct stream URL available');
    }

    console.log(`Successfully resolved "${title}" to full YouTube audio stream via Piped:`, bestAudio.url);
    return bestAudio.url;
  } catch (err) {
    console.error('Failed to resolve full-length stream for:', title, artist, 'using iTunes preview fallback.', err);
    return fallbackPreviewUrl; // fallback to the iTunes 30-sec preview
  }
}

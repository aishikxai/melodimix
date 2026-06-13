import { ProceduralSynth } from './synth.js';
import { resolveFullTrackStream } from './resolver.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.eqFilters = [];
    this.audioElement = new Audio();
    this.sourceNode = null;
    
    // Playback state
    this.playlist = []; // Array of track objects {id, title, artist, file (Blob), duration, cover, isSynth}
    this.currentIndex = -1;
    this.isPlaying = false;
    this.isShuffle = false;
    this.isRepeat = 'none'; // 'none' | 'one' | 'all'
    this.shuffleOrder = [];

    // Synthesizer instance
    this.synth = null;
    this.isSynthPlaying = false;

    // Callbacks for UI updates
    this.onTrackChange = null;
    this.onPlayStateChange = null;
    this.onProgressUpdate = null;
    this.onQueueUpdate = null;
    this.onPlaybarBuffering = null;

    this.audioElement.crossOrigin = 'anonymous';
    this.initAudioListeners();
  }

  // Lazy initialize AudioContext on user interaction
  initContext() {
    if (this.ctx) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256; // 128 frequency bins

    // Setup 5-band Equalizer
    // Bands: 60Hz, 250Hz, 1KHz, 4KHz, 16KHz
    const frequencies = [60, 250, 1000, 4000, 16000];
    let lastFilter = null;

    frequencies.forEach((freq, index) => {
      const filter = this.ctx.createBiquadFilter();
      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === frequencies.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.0;
      }
      filter.frequency.value = freq;
      filter.gain.value = 0; // default flat

      if (lastFilter) {
        lastFilter.connect(filter);
      }
      this.eqFilters.push(filter);
      lastFilter = filter;
    });

    // Create source from audio element
    this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);
    
    // Connect chain: Source -> EQ Filter 1 -> ... -> EQ Filter 5 -> Analyser -> Destination
    this.sourceNode.connect(this.eqFilters[0]);
    this.eqFilters[this.eqFilters.length - 1].connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Initialize procedural synthesizer
    // Connect synthesizer into the EQ filters so the equalizer and visualizer work on it!
    this.synth = new ProceduralSynth(this.ctx, this.eqFilters[0]);
  }

  initAudioListeners() {
    this.audioElement.addEventListener('timeupdate', () => {
      if (this.onProgressUpdate && !this.isSynthPlaying) {
        const current = this.audioElement.currentTime;
        const total = this.audioElement.duration || 0;
        this.onProgressUpdate(current, total);
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error('Audio element error:', e);
      this.next(); // Skip to next track on error
    });

    // Progress updates for synth loop (since it doesn't fire timeupdate events on audio element)
    setInterval(() => {
      if (this.isSynthPlaying && this.isPlaying && this.onProgressUpdate) {
        // Synthesizer is continuous, so we'll just mock a looping progress or display "Live Synth"
        // Let's pass mock running time
        if (!this.synthStartTime) this.synthStartTime = Date.now();
        const elapsed = (Date.now() - this.synthStartTime) / 1000;
        this.onProgressUpdate(elapsed % 180, 180); // loop progress bar every 3 mins
      }
    }, 250);
  }

  setEqualizerBand(index, gainValue) {
    this.initContext();
    if (this.eqFilters[index]) {
      this.eqFilters[index].gain.setValueAtTime(gainValue, this.ctx.currentTime);
    }
  }

  setEqualizerPreset(presetName) {
    // Presets definitions
    const presets = {
      flat: [0, 0, 0, 0, 0],
      pop: [-1, 2, 3, 1, -2],
      rock: [4, 2, -1, 2, 4],
      bass: [6, 4, 0, -2, -4],
      vocal: [-3, -1, 4, 3, 1],
      jazz: [3, 1, 1, 2, 2],
      electronic: [5, 2, 0, 3, 4]
    };

    const levels = presets[presetName] || presets.flat;
    levels.forEach((gain, index) => {
      this.setEqualizerBand(index, gain);
    });
    return levels;
  }

  // Playlist management
  setPlaylist(tracks) {
    this.playlist = tracks;
    this.generateShuffleOrder();
    if (this.onQueueUpdate) this.onQueueUpdate(this.getCurrentQueue());
  }

  addTrackToPlaylist(track) {
    this.playlist.push(track);
    this.generateShuffleOrder();
    if (this.onQueueUpdate) this.onQueueUpdate(this.getCurrentQueue());
  }

  removeTrackFromPlaylist(id) {
    const numericId = Number(id);
    const index = this.playlist.findIndex(t => t.id === numericId);
    if (index !== -1) {
      this.playlist.splice(index, 1);
      this.generateShuffleOrder();
      
      // If we deleted the current playing song
      if (this.currentIndex === index) {
        if (this.playlist.length > 0) {
          this.playIndex(Math.min(index, this.playlist.length - 1));
        } else {
          this.stop();
        }
      } else if (this.currentIndex > index) {
        this.currentIndex--;
      }
      
      if (this.onQueueUpdate) this.onQueueUpdate(this.getCurrentQueue());
    }
  }

  generateShuffleOrder() {
    this.shuffleOrder = Array.from({ length: this.playlist.length }, (_, i) => i);
    if (this.isShuffle) {
      for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
      }
    }
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this.generateShuffleOrder();
    // Maintain current index in shuffle order
    if (this.isShuffle && this.currentIndex !== -1) {
      const idxInShuffle = this.shuffleOrder.indexOf(this.currentIndex);
      if (idxInShuffle !== -1) {
        // Swap currently playing track to the front of the shuffle order so it plays first
        this.shuffleOrder.splice(idxInShuffle, 1);
        this.shuffleOrder.unshift(this.currentIndex);
      }
    }
  }

  toggleRepeat() {
    if (this.isRepeat === 'none') {
      this.isRepeat = 'all';
    } else if (this.isRepeat === 'all') {
      this.isRepeat = 'one';
    } else {
      this.isRepeat = 'none';
    }
    return this.isRepeat;
  }

  getCurrentQueue() {
    if (this.isShuffle) {
      return this.shuffleOrder.map(idx => this.playlist[idx]);
    }
    return this.playlist;
  }

  getCurrentTrack() {
    if (this.currentIndex >= 0 && this.currentIndex < this.playlist.length) {
      return this.playlist[this.currentIndex];
    }
    return null;
  }

  async playTrack(track) {
    this.initContext();
    
    // Find index of this track
    const index = this.playlist.findIndex(t => t.id === track.id);
    if (index !== -1) {
      this.currentIndex = index;
    } else {
      // Add it to playlist if it's not there
      this.playlist.push(track);
      this.generateShuffleOrder();
      this.currentIndex = this.playlist.length - 1;
    }

    await this.loadAndPlay(track);
  }

  async playIndex(index) {
    this.initContext();
    if (index >= 0 && index < this.playlist.length) {
      this.currentIndex = index;
      await this.loadAndPlay(this.playlist[index]);
    }
  }

  async loadAndPlay(track) {
    this.stopCurrentMedia();
    
    if (track.isSynth) {
      this.isSynthPlaying = true;
      this.synthStartTime = Date.now();
      this.isPlaying = true;
      this.synth.start();
    } else {
      this.isSynthPlaying = false;
      
      // Revoke old URL if it was created
      if (this.audioElement.src && this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      
      if (track.file) {
        const fileUrl = URL.createObjectURL(track.file);
        this.audioElement.src = fileUrl;
      } else {
        if (this.onPlaybarBuffering) {
          this.onPlaybarBuffering(true);
        }
        try {
          const resolvedUrl = await resolveFullTrackStream(track.title, track.artist, track.previewUrl || track.url);
          this.audioElement.src = resolvedUrl;
        } catch (err) {
          console.error('Failed to resolve stream for track:', track, err);
          this.audioElement.src = track.previewUrl || '';
        } finally {
          if (this.onPlaybarBuffering) {
            this.onPlaybarBuffering(false);
          }
        }
      }
      this.isPlaying = true;
      
      try {
        await this.audioElement.play();
      } catch (err) {
        console.error('Playback failed. User interaction might be required.', err);
        this.isPlaying = false;
      }
    }

    if (this.onTrackChange) this.onTrackChange(track);
    if (this.onPlayStateChange) this.onPlayStateChange(this.isPlaying);
  }

  stopCurrentMedia() {
    if (this.isSynthPlaying && this.synth) {
      this.synth.stop();
      this.isSynthPlaying = false;
    } else {
      this.audioElement.pause();
    }
  }

  play() {
    this.initContext();
    if (this.playlist.length === 0) return;
    
    if (this.currentIndex === -1) {
      this.currentIndex = 0;
    }

    const currentTrack = this.playlist[this.currentIndex];
    if (!currentTrack) return;

    if (currentTrack.isSynth) {
      this.isSynthPlaying = true;
      this.isPlaying = true;
      this.synth.start();
    } else {
      this.isSynthPlaying = false;
      this.isPlaying = true;
      this.audioElement.play().catch(err => {
        console.error('Play command failed', err);
        this.isPlaying = false;
      });
    }

    if (this.onPlayStateChange) this.onPlayStateChange(this.isPlaying);
  }

  pause() {
    this.isPlaying = false;
    this.stopCurrentMedia();
    if (this.onPlayStateChange) this.onPlayStateChange(this.isPlaying);
  }

  stop() {
    this.isPlaying = false;
    this.stopCurrentMedia();
    this.currentIndex = -1;
    if (this.onPlayStateChange) this.onPlayStateChange(this.isPlaying);
    if (this.onTrackChange) this.onTrackChange(null);
  }

  seek(percent) {
    if (this.isSynthPlaying) return; // Synth is live, cannot seek
    if (this.audioElement.duration) {
      this.audioElement.currentTime = this.audioElement.duration * percent;
    }
  }

  setVolume(volume) {
    this.audioElement.volume = volume;
    // Also scale synth volume accordingly
    if (this.synth) {
      this.synth.masterGain.gain.setValueAtTime(volume * 0.7, this.ctx.currentTime);
    }
  }

  next() {
    if (this.playlist.length === 0) return;

    if (this.isRepeat === 'one' && !this.isSynthPlaying) {
      // Repeat current track
      this.seek(0);
      this.play();
      return;
    }

    let nextIndex = this.currentIndex;

    if (this.isShuffle) {
      const curOrderIdx = this.shuffleOrder.indexOf(this.currentIndex);
      if (curOrderIdx !== -1 && curOrderIdx < this.shuffleOrder.length - 1) {
        nextIndex = this.shuffleOrder[curOrderIdx + 1];
      } else if (this.isRepeat === 'all') {
        nextIndex = this.shuffleOrder[0];
      } else {
        return; // stop playback at end of shuffle
      }
    } else {
      if (this.currentIndex < this.playlist.length - 1) {
        nextIndex = this.currentIndex + 1;
      } else if (this.isRepeat === 'all') {
        nextIndex = 0;
      } else {
        return; // stop playback
      }
    }

    this.playIndex(nextIndex);
  }

  prev() {
    if (this.playlist.length === 0) return;

    // If track is more than 3 seconds in, restart it
    if (!this.isSynthPlaying && this.audioElement.currentTime > 3.0) {
      this.seek(0);
      return;
    }

    let prevIndex = this.currentIndex;

    if (this.isShuffle) {
      const curOrderIdx = this.shuffleOrder.indexOf(this.currentIndex);
      if (curOrderIdx > 0) {
        prevIndex = this.shuffleOrder[curOrderIdx - 1];
      } else if (this.isRepeat === 'all') {
        prevIndex = this.shuffleOrder[this.shuffleOrder.length - 1];
      } else {
        prevIndex = this.shuffleOrder[0]; // loop to start of shuffle
      }
    } else {
      if (this.currentIndex > 0) {
        prevIndex = this.currentIndex - 1;
      } else if (this.isRepeat === 'all') {
        prevIndex = this.playlist.length - 1;
      } else {
        prevIndex = 0; // restart first track
      }
    }

    this.playIndex(prevIndex);
  }

  handleTrackEnded() {
    if (this.isRepeat === 'one') {
      this.seek(0);
      this.play();
    } else {
      this.next();
    }
  }

  getFrequencyData() {
    if (!this.analyser) return null;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getWaveformData() {
    if (!this.analyser) return null;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }
}

// Procedural Synthwave/Lofi Beats Generator using Web Audio API
// Runs completely offline without loading any external files.

export class ProceduralSynth {
  constructor(audioContext, destinationNode) {
    this.ctx = audioContext;
    this.dest = destinationNode;
    this.isPlaying = false;
    this.tempo = 85; // BPM
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // sec
    this.nextNoteTime = 0.0;
    this.currentStep = 0; // 0 to 15 (16th notes)
    this.timerId = null;

    // Node chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    
    // Add a simple delay effect for spacey vibe
    this.delay = this.ctx.createDelay(1.0);
    this.delay.delayTime.setValueAtTime(0.35, this.ctx.currentTime);
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    // Feedback loop for delay
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);

    // Connections
    this.masterGain.connect(this.dest);
    this.masterGain.connect(this.delay);
    this.delay.connect(this.delayGain);
    this.delayGain.connect(this.dest);

    // Musical Scale (A Minor Pentatonic/Natural Minor)
    this.scale = [110.00, 123.47, 130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
    
    // Chords (frequencies of root notes)
    // Am7, Fmaj7, Cmaj7, G6
    this.chords = [
      [220.00, 261.63, 329.63, 392.00], // Am7 (A3, C4, E4, G4)
      [174.61, 261.63, 329.63, 392.00], // Fmaj7 (F3, C4, E4, G4)
      [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
      [196.00, 246.94, 293.66, 392.00]  // G6 (G3, B3, D4, G4)
    ];

    // White Noise buffer for hats/snare
    this.noiseBuffer = this.createNoiseBuffer();
  }

  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Synthesize a Kick Drum
  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  // Synthesize a Snare Drum
  playSnare(time) {
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.ctx.createGain();
    
    // Snare tone (body)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    
    oscGain.gain.setValueAtTime(0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    // Snare snap (noise)
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseNode.start(time);
    noiseNode.stop(time + 0.3);
    
    osc.start(time);
    osc.stop(time + 0.2);
  }

  // Synthesize a Closed Hi-Hat
  playHihat(time, open = false) {
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    const duration = open ? 0.3 : 0.05;

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseNode.start(time);
    noiseNode.stop(time + duration + 0.05);
  }

  // Synthesize Bass Note
  playBass(freq, time, duration) {
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq / 2, time); // 1 octave down

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq / 2 + 1.5, time); // Slightly detuned

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, time);
    filter.frequency.exponentialRampToValueAtTime(70, time + duration);

    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.8, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + duration + 0.1);
    osc2.stop(time + duration + 0.1);
  }

  // Synthesize Chord Pad
  playPad(chordFreqs, time, duration) {
    const oscs = [];
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.linearRampToValueAtTime(800, time + duration / 2);
    filter.frequency.linearRampToValueAtTime(350, time + duration);

    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.35, time + 0.5); // Slow attack
    gain.gain.linearRampToValueAtTime(0.25, time + duration - 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    chordFreqs.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      // Slightly detune notes for warmth
      osc.frequency.setValueAtTime(freq + (index % 2 === 0 ? 0.5 : -0.5), time);
      osc.connect(filter);
      oscs.push(osc);
      osc.start(time);
      osc.stop(time + duration + 0.2);
    });

    filter.connect(gain);
    gain.connect(this.masterGain);
  }

  // Synthesize a Melodic lead note
  playMelody(freq, time, duration) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    
    // Add subtle vibrato (LFO)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 5.5; // 5.5 Hz vibrato
    lfoGain.gain.value = 4.0; // Frequency deviation

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, time);

    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.05); // Smooth attack
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
    lfo.stop(time + duration + 0.1);
  }

  // Step sequencer scheduler
  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNextStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
  }

  advanceStep() {
    const secondsPerBeat = 60.0 / this.tempo;
    const stepDuration = secondsPerBeat / 4; // 16th notes
    this.nextNoteTime += stepDuration;
    
    this.currentStep = (this.currentStep + 1) % 16;
  }

  scheduleNextStep(step, time) {
    // Current chord block (changes every 4 beats / 16 steps)
    const chordIndex = Math.floor(step / 16) % this.chords.length;
    const activeChord = this.chords[chordIndex];

    // 1. Play Drums
    // Kick on 1 and 9 (steps 0 and 8), and occasionally on 12 (step 11)
    if (step === 0 || step === 8) {
      this.playKick(time);
    } else if (step === 11 && Math.random() > 0.4) {
      this.playKick(time);
    }

    // Snare on 5 and 13 (steps 4 and 12)
    if (step === 4 || step === 12) {
      this.playSnare(time);
    }

    // Hi-hats on off-beats, triplets, or running 8th notes
    if (step % 2 === 0) {
      // 8th notes hats
      const isOpen = step === 10 && Math.random() > 0.6; // Occasionally play open hat on step 10
      this.playHihat(time, isOpen);
    } else if (Math.random() > 0.7) {
      // Add syncopated hats
      this.playHihat(time, false);
    }

    // 2. Play Bass (follows chord root note at octaves)
    // Plays long note at step 0, shorter notes elsewhere
    if (step === 0) {
      this.playBass(activeChord[0], time, 1.8);
    } else if (step === 6) {
      this.playBass(activeChord[0], time, 0.4);
    } else if (step === 8) {
      this.playBass(activeChord[0], time, 0.9);
    } else if (step === 14) {
      // Play 5th of chord on step 14
      this.playBass(activeChord[2], time, 0.3);
    }

    // 3. Play Chord Pads (every 16 steps / start of measure)
    if (step === 0) {
      this.playPad(activeChord, time, 3.8); // plays for almost the full measure
    }

    // 4. Play Lofi Lead Melody (random pentatonic improvisation)
    // Only play on steps that make a nice rhythmic flow (e.g. syncopations)
    const melodySteps = [2, 5, 8, 10, 13, 14];
    if (melodySteps.includes(step) && Math.random() > 0.5) {
      // Pick a random frequency from A minor scale (within octaves 4 and 5)
      // Higher indexes in this.scale are higher octaves
      const scaleSubset = this.scale.slice(7); // from A4 (220Hz) upwards
      const pitch = scaleSubset[Math.floor(Math.random() * scaleSubset.length)];
      
      const duration = (Math.random() > 0.5 ? 0.4 : 0.8);
      this.playMelody(pitch, time, duration);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    // Resume context if suspended (browser security)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    const runScheduler = () => {
      this.scheduler();
      this.timerId = setTimeout(runScheduler, this.lookahead);
    };

    runScheduler();
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    clearTimeout(this.timerId);
    this.timerId = null;
  }
}

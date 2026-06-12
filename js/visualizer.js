export class AudioVisualizer {
  constructor(canvasElement, audioEngine) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.audio = audioEngine;
    
    this.animationFrameId = null;
    this.style = 'circular'; // 'circular' | 'bars' | 'wave' | 'particles'
    this.themeColor = '#1db954'; // Spotify green default, can be dynamically changed
    this.themeColorGlow = 'rgba(29, 185, 84, 0.4)';
    
    // Peaks tracking for bars visualizer
    this.peaks = [];
    
    // Particle system
    this.particles = [];
    this.initParticles(60);

    // Dynamic scale for retina displays
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  setStyle(style) {
    this.style = style;
  }

  setThemeColor(hexColor) {
    this.themeColor = hexColor;
    
    // Convert hex to rgb for opacity-based glow
    let r = 29, g = 185, b = 84;
    if (hexColor.startsWith('#')) {
      const hex = hexColor.substring(1);
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    this.themeColorGlow = `rgba(${r}, ${g}, ${b}, 0.3)`;
  }

  initParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        baseRadius: Math.random() * 3 + 1,
        radius: 2,
        alpha: Math.random() * 0.5 + 0.2,
        colorIndex: Math.floor(Math.random() * 3)
      });
    }
  }

  start() {
    if (this.animationFrameId) return;
    const draw = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(draw);
    };
    draw();
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  render() {
    // Clear canvas with slight transparency for trailing motion blur
    this.ctx.fillStyle = 'rgba(10, 8, 18, 0.22)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const freqData = this.audio.getFrequencyData();
    const waveData = this.audio.getWaveformData();

    // Fallback data if audio context isn't initialized or playing
    const dummyFreq = new Uint8Array(128);
    const dummyWave = new Uint8Array(128);
    if (!freqData || !this.audio.isPlaying) {
      // Create a gentle idle wave/frequency
      const time = Date.now() * 0.003;
      for (let i = 0; i < 128; i++) {
        dummyFreq[i] = Math.max(0, (Math.sin(i * 0.1 - time) + 1) * 20 - i * 0.1);
        dummyWave[i] = 128 + Math.sin(i * 0.2 + time) * 10;
      }
    }

    const activeFreq = freqData && this.audio.isPlaying ? freqData : dummyFreq;
    const activeWave = waveData && this.audio.isPlaying ? waveData : dummyWave;

    switch (this.style) {
      case 'circular':
        this.drawCircularPulse(activeFreq);
        break;
      case 'bars':
        this.drawNeonBars(activeFreq);
        break;
      case 'wave':
        this.drawRetroWave(activeWave);
        break;
      case 'particles':
        this.drawParticles(activeFreq);
        break;
    }
  }

  // Visualizer Style 1: Circular Portal Pulse
  drawCircularPulse(freq) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    
    // Calculate average bass frequency (indices 0 to 10)
    let bassAvg = 0;
    for (let i = 0; i < 10; i++) bassAvg += freq[i];
    bassAvg /= 10;
    
    // Scale central orb based on bass
    const bassRatio = bassAvg / 255;
    const baseRadius = Math.min(this.width, this.height) * 0.15;
    const orbRadius = baseRadius + (bassRatio * 35);

    // Draw backing ambient glow
    const ambientGlow = this.ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, orbRadius * 2);
    ambientGlow.addColorStop(0, this.themeColorGlow);
    ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = ambientGlow;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, orbRadius * 2.2, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw central orb
    const centerGrad = this.ctx.createRadialGradient(cx, cy, orbRadius * 0.2, cx, cy, orbRadius);
    centerGrad.addColorStop(0, '#ffffff');
    centerGrad.addColorStop(0.3, this.themeColor);
    centerGrad.addColorStop(1, 'rgba(15, 12, 30, 0.8)');
    
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = this.themeColor;
    this.ctx.fillStyle = centerGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0; // reset shadow

    // Draw radiating frequency bars
    const barCount = 72; // Circular bars every 5 degrees
    const rStart = orbRadius + 8;
    this.ctx.lineWidth = 3.5;
    this.ctx.lineCap = 'round';

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      // Mirror frequencies so left and right look balanced
      const freqIdx = Math.floor(Math.abs(barCount / 2 - i) / (barCount / 2) * (freq.length * 0.6));
      const magnitude = (freq[freqIdx] / 255) * 80;

      const xStart = cx + Math.cos(angle) * rStart;
      const yStart = cy + Math.sin(angle) * rStart;
      const xEnd = cx + Math.cos(angle) * (rStart + magnitude);
      const yEnd = cy + Math.sin(angle) * (rStart + magnitude);

      // Create a gradient for the bar
      const barGrad = this.ctx.createLinearGradient(xStart, yStart, xEnd, yEnd);
      barGrad.addColorStop(0, this.themeColor);
      barGrad.addColorStop(1, 'rgba(230, 0, 255, 0.1)'); // Fades into pink/empty space

      this.ctx.strokeStyle = barGrad;
      this.ctx.beginPath();
      this.ctx.moveTo(xStart, yStart);
      this.ctx.lineTo(xEnd, yEnd);
      this.ctx.stroke();
    }
  }

  // Visualizer Style 2: Neon Equalizer Bars with Falling Peaks
  drawNeonBars(freq) {
    const barWidth = 6.5;
    const spacing = 4.5;
    const numBars = Math.min(128, Math.floor(this.width / (barWidth + spacing)));
    const startX = (this.width - (numBars * (barWidth + spacing))) / 2;

    this.ctx.shadowBlur = 4;
    this.ctx.shadowColor = 'rgba(0,0,0,0.5)';

    for (let i = 0; i < numBars; i++) {
      // Map bars symmetrically (highest frequencies at sides, bass in center)
      let valIdx = 0;
      const center = numBars / 2;
      if (i < center) {
        valIdx = Math.floor((i / center) * (freq.length * 0.65));
      } else {
        valIdx = Math.floor(((numBars - i) / center) * (freq.length * 0.65));
      }

      const rawVal = freq[valIdx];
      const barHeight = (rawVal / 255) * (this.height * 0.7);

      const x = startX + i * (barWidth + spacing);
      const y = this.height - barHeight - 10;

      // Track and draw peak points
      if (this.peaks[i] === undefined || barHeight > this.peaks[i]) {
        this.peaks[i] = barHeight;
      } else {
        this.peaks[i] -= 0.85; // Gravity drop
      }

      // Draw peaks
      const peakY = this.height - this.peaks[i] - 14;
      if (peakY < this.height - 10) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = this.themeColor;
        this.ctx.fillRect(x, peakY, barWidth, 3);
        this.ctx.shadowBlur = 0;
      }

      // Create neon gradient for vertical bar
      const grad = this.ctx.createLinearGradient(x, this.height - 10, x, y);
      grad.addColorStop(0, 'rgba(88, 12, 179, 0.8)'); // Deep Purple
      grad.addColorStop(0.5, this.themeColor);        // Theme Color
      grad.addColorStop(1, '#00ffff');                // Cyan peak

      this.ctx.fillStyle = grad;
      // Draw rounded bar
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, barWidth, Math.max(2, barHeight), 3);
      this.ctx.fill();
    }
  }

  // Visualizer Style 3: Retro Wave (Oscilloscope)
  drawRetroWave(wave) {
    this.ctx.lineWidth = 3.5;
    this.ctx.lineCap = 'round';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = this.themeColor;
    this.ctx.strokeStyle = this.themeColor;

    // Draw faint grid background for retro grid look
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;
    this.ctx.shadowBlur = 0;
    
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // Draw main glowing oscilliscope wave
    this.ctx.beginPath();
    const sliceWidth = this.width / wave.length;
    let x = 0;

    for (let i = 0; i < wave.length; i++) {
      const v = wave[i] / 128.0; // 0.0 to 2.0
      const y = (v * this.height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    // Set neon styling back
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, '#ff007f'); // Neon pink
    gradient.addColorStop(0.5, this.themeColor); // Spotify green or chosen accent
    gradient.addColorStop(1, '#00ffff'); // Cyan
    
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 3;
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = this.themeColor;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  // Visualizer Style 4: Interactive Energy Particles
  drawParticles(freq) {
    // Get average bass & treble levels
    let bass = 0;
    for (let i = 0; i < 8; i++) bass += freq[i];
    bass /= 8;

    let treble = 0;
    for (let i = 40; i < 70; i++) treble += freq[i];
    treble /= 30;

    const bassFactor = bass / 255;
    const trebleFactor = treble / 255;

    // Draw particles
    this.particles.forEach((p) => {
      // Modulate particle properties based on music
      p.radius = p.baseRadius * (1 + bassFactor * 2.8);
      
      // Speed up particles based on treble/tempo
      const speedScale = 1.0 + trebleFactor * 4.0;
      p.x += p.vx * speedScale;
      p.y += p.vy * speedScale;

      // Wrap-around screen bounds
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      // Draw particle with glow
      const colors = [
        this.themeColor, // Theme Color
        '#00ffff',       // Cyan
        '#ff00ff'        // Magenta
      ];
      const activeColor = colors[p.colorIndex];

      this.ctx.shadowBlur = p.radius * 2;
      this.ctx.shadowColor = activeColor;
      this.ctx.fillStyle = activeColor;
      this.ctx.globalAlpha = p.alpha + (bassFactor * 0.3);
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.globalAlpha = 1.0;
    this.ctx.shadowBlur = 0;

    // Draw connection lines between close particles for a constellations overlay
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 90) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }
  }
}

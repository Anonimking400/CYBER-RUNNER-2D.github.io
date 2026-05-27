/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private musicInterval: any = null;
  private isMusicPlaying: boolean = false;
  private tempoMultiplier: number = 1.0;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Master Volume sliders
  private valMasterVol: number = 0.5;
  private valMusicVol: number = 0.4;
  private valSfxVol: number = 0.6;
  
  // Arpeggio index for background track
  private melodyIndex: number = 0;

  constructor() {}

  // Initialize the audio context (must be called from a user gesture)
  public init() {
    if (this.ctx) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported in this browser.');
        return;
      }
      this.ctx = new AudioContextClass();
      
      // Setup audio routing
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.valMasterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.valMusicVol, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.valSfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }

  public setMasterVolume(val: number) {
    this.valMasterVol = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.valMasterVol, this.ctx.currentTime);
    }
  }

  public setMusicVolume(val: number) {
    this.valMusicVol = Math.max(0, Math.min(1, val));
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.valMusicVol, this.ctx.currentTime);
    }
  }

  public setSfxVolume(val: number) {
    this.valSfxVol = Math.max(0, Math.min(1, val));
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.valSfxVol, this.ctx.currentTime);
    }
  }

  // Trigger SFX: Hero Jump (Retro rising sweep)
  public playJump() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    // Linear rise
    osc.frequency.exponentialRampToValueAtTime(580, this.ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  // Trigger SFX: Stomp on enemy (Retro pitch-escalating bounce, very Mario!)
  public playStomp(comboCount: number = 0) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Base scale with crisp semi-tones resembling Mario stomp steps
    const scale = [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00];
    const baseFreq = scale[Math.min(scale.length - 1, comboCount)];

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.3, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.22);
  }

  // Trigger SFX: Hero Shoot laser (Retro high frequency slide down)
  public playShoot() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  // Trigger SFX: Enemy Shoot laser (Retro futuristic chirp)
  public playEnemyShoot() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  // Trigger SFX: Damage taken (Gruff noise bender)
  public playDamage() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.24);
  }

  // Trigger SFX: Enemy hit / explosion (Retro white noise or sudden sub-buzz)
  public playExplosion() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260, this.ctx.currentTime);
    // Vibrato/tremolo-like slide representing blast
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    // Fast fade
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.26);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.26);
  }

  // Trigger SFX: Power up collected (Fast arpeggios, sweet tone)
  public playPowerUp() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Major chord)
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.06 + 0.15);
      
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.15);
    });
  }

  // Trigger SFX: Level completed / Portal crossed (Triumphant sci-fi chime melody)
  public playCheckpoint() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // Triumphant theme
    const notes = [349.23, 440.00, 523.25, 587.33, 659.25, 783.99]; // F4, A4, C5, D5, E5, G5
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0.22, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  // Trigger SFX: Checkpoint activated (Flickering sweet sine rise)
  public playCheckpointActive() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5 (Bright Major)
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      
      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.05 + 0.12);
      
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.12);
    });
  }

  // Trigger SFX: Level completed! (Triumphant multi-tonal techno arpeggio)
  public playLevelComplete() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 587.33, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      
      gain.gain.setValueAtTime(0.14, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.07 + 0.22);
      
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.22);
    });
  }

  // Trigger SFX: Projectile hit (Sharp digital noise strike)
  public playProjectileHit() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Trigger SFX: Respawn from checkpoint (Pulsing cyber digital swell)
  public playCheckpointRestore() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [196.00, 261.63, 329.63, 392.00, 523.25];
    
    notes.reverse().forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      gain.gain.setValueAtTime(0.16, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.06 + 0.15);
      
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.15);
    });
  }

  // Trigger SFX: Enemy attack (Fierce sci-fi discharge)
  public playEnemyAttack() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Trigger SFX: Game Over (Descending sad 8-bit scale)
  public playGameOver() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [392.00, 349.23, 311.13, 261.63, 196.00]; // G4, F4, Eb4, C4, G3
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      
      gain.gain.setValueAtTime(0.2, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.12 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.25);
    });
  }

  // Set music tempo multiplier according to current level/gameSpeed (safeguarded against sliding resets)
  public setTempo(multiplier: number) {
    const quantized = Math.round(Math.max(0.7, Math.min(3.0, multiplier)) * 10) / 10;
    if (Math.abs(this.tempoMultiplier - quantized) >= 0.15) {
      this.tempoMultiplier = quantized;
      // Restart sequencer with updated tempo if music is active currently
      if (this.isMusicPlaying) {
        this.stopMusic();
        this.startMusic();
      }
    }
  }

  // Start background retro-synth music (Sequencer)
  public startMusic() {
    this.init();
    if (!this.ctx || !this.musicGain) return;
    if (this.isMusicPlaying) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMusicPlaying = true;
    
    // Classic retro notes list (8-step looped electronic chords & baseline)
    // C minor / Eb Major chord sequences:
    const bassline = [130.81, 130.81, 155.56, 174.61, 196.00, 196.00, 220.00, 116.54]; // C3, C3, Eb3, F3, G3, G3, A3, Bb2
    const leadline = [
      [261.63, 392.00], // C4, G4
      [261.63, 392.00], 
      [311.13, 466.16], // Eb4, Bb4
      [349.23, 523.25], // F4, C5
      [392.00, 587.33], // G4, D5
      [392.00, 587.33],
      [440.00, 659.25], // A4, E5
      [293.66, 440.00]  // D4, A4
    ];

    // Compute step rate. Standard and speeds up as multiplier rises!
    const baseStepTimeMs = 300; 
    const stepTimeMs = baseStepTimeMs / this.tempoMultiplier;

    this.musicInterval = setInterval(() => {
      if (!this.ctx || !this.musicGain) return;

      const now = this.ctx.currentTime;
      const stepIdx = this.melodyIndex % 8;

      // Ensure no double play if context got locked again
      try {
        // 1. Play Bass note (low fat triangle/square vibe)
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassline[stepIdx], now);
        
        bassGain.gain.setValueAtTime(0.18, now);
        bassGain.gain.linearRampToValueAtTime(0.01, now + (stepTimeMs / 1000) * 0.9);
        
        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        
        bassOsc.start(now);
        bassOsc.stop(now + (stepTimeMs / 1000) * 0.9);

        // 2. Play Arpeggio melody (crisp high sine sound on 2nd and 4th tempo divisions)
        if (this.melodyIndex % 2 === 0) {
          const chord = leadline[stepIdx];
          const noteFreq = chord[Math.floor(Math.random() * chord.length)];
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          
          leadOsc.type = 'sine';
          leadOsc.frequency.setValueAtTime(noteFreq, now);
          
          leadGain.gain.setValueAtTime(0.08, now);
          leadGain.gain.linearRampToValueAtTime(0.01, now + 0.12);
          
          leadOsc.connect(leadGain);
          leadGain.connect(this.musicGain);
          
          leadOsc.start(now);
          leadOsc.stop(now + 0.12);
        }
      } catch (err) {
        // Ignore silent scheduler issues
      }

      this.melodyIndex++;
    }, stepTimeMs);
  }

  // Stop background music
  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
  }
}

export const synths = new SoundSynthesizer();

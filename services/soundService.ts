
// Web Audio API & Haptics Service
// RETRO SYNTH & AMBIENT VIBES EDITION
// Procedural Sound Generation optimized for Sci-Fi Atmosphere

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterCompressor: DynamicsCompressorNode | null = null;
let globalDelay: DelayNode | null = null;
let delayGain: GainNode | null = null;

// Settings State
let isSoundEnabled = localStorage.getItem('nexus_sound_enabled') !== 'false'; // Default true
let isVibrationEnabled = localStorage.getItem('nexus_vibration_enabled') !== 'false'; // Default true

export const getSoundStatus = () => isSoundEnabled;
export const getVibrationStatus = () => isVibrationEnabled;

export const toggleSoundSystem = (enabled: boolean) => {
    isSoundEnabled = enabled;
    localStorage.setItem('nexus_sound_enabled', String(enabled));
    if (enabled) playSound('click');
};

export const toggleVibrationSystem = (enabled: boolean) => {
    isVibrationEnabled = enabled;
    localStorage.setItem('nexus_vibration_enabled', String(enabled));
    if (enabled) vibrate(50);
};

// Inicializace audio kontextu s Retro FX řetězcem
const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 1. Master Gain
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;

    // 2. Compressor (pro sjednocení hlasitosti a "punch")
    masterCompressor = audioCtx.createDynamicsCompressor();
    masterCompressor.threshold.value = -24;
    masterCompressor.knee.value = 30;
    masterCompressor.ratio.value = 12;
    masterCompressor.attack.value = 0.003;
    masterCompressor.release.value = 0.25;

    // 3. Global Delay (pro Ambient Vibe)
    globalDelay = audioCtx.createDelay(1.0);
    globalDelay.delayTime.value = 0.35; // 350ms echo
    
    delayGain = audioCtx.createGain();
    delayGain.gain.value = 0.25; // 25% wet mix (jemná ozvěna)

    // Routing:
    // Source -> MasterGain -> Compressor -> Destination
    // Source -> MasterGain -> Delay -> DelayGain -> Compressor (Feedback loop simulace)
    
    masterGain.connect(masterCompressor);
    
    // Simple Feedback Loop for Delay
    masterGain.connect(globalDelay);
    globalDelay.connect(delayGain);
    delayGain.connect(masterCompressor);
    
    masterCompressor.connect(audioCtx.destination);
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return { ctx: audioCtx, master: masterGain };
};

export const vibrate = (pattern: number | number[]) => {
  if (!isVibrationEnabled) return;
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

type SoundType = 'click' | 'scan' | 'error' | 'success' | 'heal' | 'damage' | 'message' | 'open' | 'siren' | 'gift' | 'crit' | 'miss';

export const playSound = (type: SoundType) => {
  if (!isSoundEnabled) return;
  try {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;

    const now = ctx.currentTime;

    // Helper: Create a basic synth voice
    const playSynthTone = (
        freq: number, 
        type: OscillatorType, 
        startTime: number, 
        duration: number, 
        vol: number = 0.1,
        detune: number = 0
    ) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = detune;

        // Lowpass filter for that "warm analog" sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, startTime);
        filter.Q.value = 1;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        // Envelope
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay

        osc.start(startTime);
        osc.stop(startTime + duration);
        
        return { osc, gain, filter };
    };

    switch (type) {
      case 'click': 
        // Minimalistic UI Blip (Square wave filtered)
        {
            const { filter } = playSynthTone(800, 'square', now, 0.08, 0.05);
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        }
        break;

      case 'open':
        // Retro "Power Up" Swell
        {
            // Detuned Sawtooths for fat sound
            const t1 = playSynthTone(220, 'sawtooth', now, 0.4, 0.08, -5);
            const t2 = playSynthTone(220, 'sawtooth', now, 0.4, 0.08, 5);
            
            // Filter Sweep Up
            t1.filter.frequency.setValueAtTime(100, now);
            t1.filter.frequency.exponentialRampToValueAtTime(4000, now + 0.3);
            t2.filter.frequency.setValueAtTime(100, now);
            t2.filter.frequency.exponentialRampToValueAtTime(4000, now + 0.3);
        }
        break;

      case 'scan': 
        // Data Processing Arpeggio (Computer computing)
        {
            const notes = [880, 1108, 1318, 1760]; // A Minor Pentatonicish
            notes.forEach((freq, i) => {
                const t = now + (i * 0.06);
                const { filter } = playSynthTone(freq, 'square', t, 0.05, 0.04);
                filter.frequency.value = 3000;
            });
        }
        break;

      case 'error': 
        // Low "Glitch" Bass
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter(); // Lowpass

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now); // Low A
            osc.frequency.linearRampToValueAtTime(55, now + 0.3); // Pitch Drop

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.linearRampToValueAtTime(100, now + 0.3);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(master);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.35);
        }
        break;

      case 'success': 
      case 'gift':
        // Retro Victory - Ascending Arpeggio (Fanfare)
        // Clear, positive, pleasant sine waves
        {
            // C Major Arpeggio: C5, E5, G5, C6
            const notes = [523.25, 659.25, 783.99, 1046.50]; 
            
            notes.forEach((freq, i) => {
                const t = now + (i * 0.08); // Fast strum
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                // Sine is smoother and pleasant for high notes
                osc.type = 'sine'; 
                osc.frequency.setValueAtTime(freq, t);
                
                osc.connect(gain);
                gain.connect(master);

                // Bell-like envelope
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

                osc.start(t);
                osc.stop(t + 0.6);
            });

            // Add a bass root for "weight" (Success needs impact)
            const bassOsc = ctx.createOscillator();
            const bassGain = ctx.createGain();
            const bassFilter = ctx.createBiquadFilter();

            bassOsc.type = 'triangle'; // Triangle for body
            bassOsc.frequency.setValueAtTime(261.63, now); // Middle C
            
            bassFilter.type = 'lowpass';
            bassFilter.frequency.value = 600; // Remove buzz

            bassOsc.connect(bassFilter);
            bassFilter.connect(bassGain);
            bassGain.connect(master);

            bassGain.gain.setValueAtTime(0, now);
            bassGain.gain.linearRampToValueAtTime(0.25, now + 0.05);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            bassOsc.start(now);
            bassOsc.stop(now + 0.8);
        }
        break;

      case 'heal': 
        // Ethereal Pad
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            
            // Add some noise for texture (Breath)
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 1000;
            const noiseGain = ctx.createGain();
            
            osc.connect(gain);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(gain);
            gain.connect(master);

            // Slow attack
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.8);
            gain.gain.linearRampToValueAtTime(0, now + 2.0);
            
            noiseGain.gain.value = 0.1;

            osc.start(now);
            noise.start(now);
            osc.stop(now + 2.0);
            noise.stop(now + 2.0);
        }
        break;

      case 'damage': 
        // Retro Impact / Explosion
        {
            // 1. Noise Burst (White noise filtered)
            const bufferSize = ctx.sampleRate;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(1000, now);
            noiseFilter.frequency.exponentialRampToValueAtTime(50, now + 0.4);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.8, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(master);
            noise.start(now);
            noise.stop(now + 0.4);

            // 2. Sub-bass kick
            playSynthTone(60, 'square', now, 0.3, 0.3);
        }
        break;

      case 'message': 
        // Comms Chirp (Two tone)
        {
            playSynthTone(1200, 'sine', now, 0.1, 0.05);
            playSynthTone(1800, 'sine', now + 0.1, 0.1, 0.05);
        }
        break;

      case 'siren': 
        // Dark Synthwave Alarm (Slow oscillating filter)
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.value = 150; // Low drone
            osc.detune.value = 10; // Unsettling

            filter.type = 'lowpass';
            filter.Q.value = 15; // High resonance

            // LFO for filter cutoff
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 2; // 2Hz pulse
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 600; // Filter sweep depth

            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            filter.frequency.value = 800; // Base filter freq

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(master);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
            gain.gain.linearRampToValueAtTime(0, now + 2.5);

            osc.start(now);
            lfo.start(now);
            osc.stop(now + 2.5);
            lfo.stop(now + 2.5);
        }
        break;

      case 'crit':
        // High pitched "Ping" + quick sweep
        {
            const t1 = playSynthTone(1500, 'triangle', now, 0.3, 0.2);
            t1.osc.frequency.exponentialRampToValueAtTime(3000, now + 0.1);
            playSynthTone(2000, 'sine', now + 0.05, 0.4, 0.2);
        }
        break;

      case 'miss':
        // Descending "Whomp"
        {
            const t1 = playSynthTone(400, 'sawtooth', now, 0.3, 0.1);
            t1.filter.frequency.setValueAtTime(800, now);
            t1.filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);
            t1.osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        }
        break;
    }
  } catch (e) {
    console.error("Audio Playback Failed", e);
  }
};

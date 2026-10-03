/**
 * Everything you hear is synthesized with WebAudio at runtime: no audio files.
 * Sound effects are short noise/oscillator recipes; music is a small
 * step sequencer playing procedural loops.
 */

export type SfxName =
  | 'click'
  | 'hype'
  | 'alarm'
  | 'equip'
  | 'coin'
  | 'error'
  | 'boxShake'
  | 'boxOpen'
  | 'reveal'
  | 'levelUp'
  | 'victory'
  | 'defeat'
  | 'walk'
  | 'jump'
  | 'land'
  | 'gun'
  | 'shotgun'
  | 'minigun'
  | 'cannon'
  | 'rocket'
  | 'explosion'
  | 'bigExplosion'
  | 'laser'
  | 'rail'
  | 'flame'
  | 'zap'
  | 'plasma'
  | 'swing'
  | 'hit'
  | 'stomp'
  | 'charge'
  | 'teleport'
  | 'hook'
  | 'drone'
  | 'cooldown'
  | 'overheat'
  | 'turn'
  | 'fuse'
  | 'transform'

interface ToneOpts {
  type?: OscillatorType
  freq: number
  to?: number
  dur: number
  attack?: number
  gain?: number
  delay?: number
  pan?: number
  detune?: number
}

interface NoiseOpts {
  dur: number
  gain?: number
  filter?: BiquadFilterType
  freq?: number
  to?: number
  q?: number
  attack?: number
  delay?: number
  pan?: number
}

class AudioEngine {
  ctx: AudioContext | null = null
  private master!: GainNode
  private sfxBus!: GainNode
  private musicBus!: GainNode
  private noiseBuf!: AudioBuffer
  private sfxVol = 0.7
  private musicVol = 0.45
  private musicTimer: ReturnType<typeof setInterval> | null = null
  private track: 'menu' | 'battle' | null = null
  private step = 0
  private nextTime = 0
  private lastPlayed = new Map<string, number>()

  /** Create the context on the first user gesture (browsers require it). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
      return
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      this.ctx = ctx
      this.master = ctx.createGain()
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.ratio.value = 4
      this.master.connect(comp).connect(ctx.destination)
      this.sfxBus = ctx.createGain()
      this.musicBus = ctx.createGain()
      this.sfxBus.connect(this.master)
      this.musicBus.connect(this.master)
      this.applyVolumes()
      const len = ctx.sampleRate * 2
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = this.noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      if (this.track) this.startMusic(this.track, true)
    } catch {
      this.ctx = null
    }
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVol = sfx
    this.musicVol = music
    this.applyVolumes()
  }

  private applyVolumes() {
    if (!this.ctx) return
    this.sfxBus.gain.value = this.sfxVol
    this.musicBus.gain.value = this.musicVol * 0.55
  }

  private out(pan = 0, bus?: GainNode): AudioNode {
    const ctx = this.ctx!
    if (!pan || !ctx.createStereoPanner) return bus ?? this.sfxBus
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    p.connect(bus ?? this.sfxBus)
    return p
  }

  private tone(o: ToneOpts, bus?: GainNode) {
    const ctx = this.ctx!
    const t = ctx.currentTime + (o.delay ?? 0)
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = o.type ?? 'sine'
    osc.frequency.setValueAtTime(o.freq, t)
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + o.dur)
    if (o.detune) osc.detune.value = o.detune
    const a = o.attack ?? 0.005
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
    osc.connect(g).connect(this.out(o.pan, bus))
    osc.start(t)
    osc.stop(t + o.dur + 0.02)
  }

  private noise(o: NoiseOpts, bus?: GainNode) {
    const ctx = this.ctx!
    const t = ctx.currentTime + (o.delay ?? 0)
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const g = ctx.createGain()
    let node: AudioNode = src
    if (o.filter) {
      const f = ctx.createBiquadFilter()
      f.type = o.filter
      f.frequency.setValueAtTime(o.freq ?? 1000, t)
      if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur)
      f.Q.value = o.q ?? 1
      node.connect(f)
      node = f
    }
    const a = o.attack ?? 0.004
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
    node.connect(g).connect(this.out(o.pan, bus))
    src.start(t, Math.random())
    src.stop(t + o.dur + 0.02)
  }

  play(name: SfxName, opts: { pan?: number; pitch?: number; vol?: number } = {}) {
    if (!this.ctx || this.sfxVol <= 0) return
    // Avoid stacking the same sound in the same few milliseconds.
    const now = performance.now()
    if (now - (this.lastPlayed.get(name) ?? 0) < 25) return
    this.lastPlayed.set(name, now)
    const pan = opts.pan ?? 0
    const p = opts.pitch ?? 1
    const v = opts.vol ?? 1
    switch (name) {
      case 'click':
        this.tone({ type: 'square', freq: 900 * p, to: 600 * p, dur: 0.05, gain: 0.08 * v })
        break
      case 'equip':
        this.noise({ dur: 0.08, filter: 'bandpass', freq: 2400, q: 3, gain: 0.25 * v })
        this.tone({ type: 'triangle', freq: 220, to: 440, dur: 0.12, gain: 0.15 * v, delay: 0.02 })
        break
      case 'coin':
        this.tone({ type: 'square', freq: 988, dur: 0.08, gain: 0.08 * v })
        this.tone({ type: 'square', freq: 1319, dur: 0.18, gain: 0.08 * v, delay: 0.07 })
        break
      case 'error':
        this.tone({ type: 'sawtooth', freq: 180, to: 120, dur: 0.18, gain: 0.12 * v })
        break
      case 'boxShake':
        this.noise({ dur: 0.12, filter: 'lowpass', freq: 900, gain: 0.35 * v })
        this.tone({ type: 'square', freq: 90 * p, to: 70, dur: 0.1, gain: 0.12 * v })
        break
      case 'boxOpen':
        this.noise({ dur: 0.5, filter: 'highpass', freq: 800, to: 6000, gain: 0.25 * v })
        this.tone({ type: 'triangle', freq: 330, to: 990, dur: 0.4, gain: 0.2 * v })
        break
      case 'reveal': {
        const base = 392 * p
        ;[1, 1.25, 1.5, 2].forEach((m, i) => this.tone({ type: 'triangle', freq: base * m, dur: 0.35, gain: 0.14 * v, delay: i * 0.07 }))
        break
      }
      case 'levelUp':
        ;[523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ type: 'square', freq: f, dur: 0.18, gain: 0.07 * v, delay: i * 0.08 }))
        break
      case 'victory':
        ;[392, 523, 659, 784, 659, 784, 1047].forEach((f, i) =>
          this.tone({ type: i % 2 ? 'square' : 'triangle', freq: f, dur: i === 6 ? 0.8 : 0.2, gain: 0.1 * v, delay: i * 0.13 }),
        )
        break
      case 'defeat':
        ;[392, 349, 311, 262].forEach((f, i) => this.tone({ type: 'sawtooth', freq: f, dur: 0.4, gain: 0.07 * v, delay: i * 0.22 }))
        break
      case 'walk':
        this.noise({ dur: 0.09, filter: 'lowpass', freq: 400, gain: 0.25 * v, pan })
        this.tone({ type: 'square', freq: 70, to: 50, dur: 0.07, gain: 0.08 * v, pan })
        break
      case 'jump':
        this.noise({ dur: 0.35, filter: 'bandpass', freq: 600, to: 2400, q: 1.2, gain: 0.28 * v, pan })
        break
      case 'land':
      case 'stomp':
        this.tone({ type: 'sine', freq: 120, to: 40, dur: 0.25, gain: 0.55 * v, pan })
        this.noise({ dur: 0.2, filter: 'lowpass', freq: 600, gain: 0.35 * v, pan })
        break
      case 'gun':
        this.noise({ dur: 0.12, filter: 'bandpass', freq: 1800 * p, to: 500, q: 0.8, gain: 0.45 * v, pan })
        this.tone({ type: 'square', freq: 160 * p, to: 60, dur: 0.08, gain: 0.15 * v, pan })
        break
      case 'shotgun':
        this.noise({ dur: 0.3, filter: 'lowpass', freq: 3000, to: 300, gain: 0.6 * v, pan })
        this.tone({ type: 'sine', freq: 110, to: 40, dur: 0.2, gain: 0.4 * v, pan })
        break
      case 'minigun':
        for (let i = 0; i < 7; i++) this.noise({ dur: 0.05, filter: 'bandpass', freq: 2000, q: 1, gain: 0.3 * v, delay: i * 0.045, pan })
        break
      case 'cannon':
        this.noise({ dur: 0.4, filter: 'lowpass', freq: 1500, to: 150, gain: 0.6 * v, pan })
        this.tone({ type: 'sine', freq: 90 * p, to: 30, dur: 0.35, gain: 0.6 * v, pan })
        break
      case 'rocket':
        this.noise({ dur: 0.5, filter: 'bandpass', freq: 800, to: 2500, q: 0.7, gain: 0.3 * v, pan, attack: 0.05 })
        break
      case 'explosion':
        this.noise({ dur: 0.6, filter: 'lowpass', freq: 2000 * p, to: 80, gain: 0.7 * v, pan })
        this.tone({ type: 'sine', freq: 80 * p, to: 25, dur: 0.5, gain: 0.55 * v, pan })
        break
      case 'bigExplosion':
        this.noise({ dur: 1.6, filter: 'lowpass', freq: 3000, to: 50, gain: 0.9 * v, pan })
        this.tone({ type: 'sine', freq: 60, to: 18, dur: 1.4, gain: 0.8 * v, pan })
        this.noise({ dur: 1.0, filter: 'bandpass', freq: 400, q: 0.5, gain: 0.4 * v, delay: 0.25, pan })
        break
      case 'laser':
        this.tone({ type: 'sawtooth', freq: 1800 * p, to: 200, dur: 0.28, gain: 0.18 * v, pan })
        this.tone({ type: 'square', freq: 900 * p, to: 150, dur: 0.22, gain: 0.08 * v, pan, detune: 12 })
        break
      case 'rail':
        this.tone({ type: 'sawtooth', freq: 120, to: 2400, dur: 0.15, gain: 0.15 * v, pan })
        this.noise({ dur: 0.35, filter: 'highpass', freq: 2000, gain: 0.35 * v, delay: 0.12, pan })
        this.tone({ type: 'sine', freq: 70, to: 30, dur: 0.3, gain: 0.4 * v, delay: 0.12, pan })
        break
      case 'flame':
        this.noise({ dur: 0.7, filter: 'bandpass', freq: 700, to: 300, q: 0.6, gain: 0.45 * v, pan, attack: 0.06 })
        break
      case 'zap':
        for (let i = 0; i < 4; i++)
          this.tone({ type: 'square', freq: 200 + Math.random() * 1600, dur: 0.05, gain: 0.12 * v, delay: i * 0.04, pan })
        this.noise({ dur: 0.25, filter: 'highpass', freq: 3000, gain: 0.25 * v, pan })
        break
      case 'plasma':
        this.tone({ type: 'sine', freq: 300 * p, to: 1400, dur: 0.25, gain: 0.25 * v, pan })
        this.tone({ type: 'triangle', freq: 150 * p, to: 700, dur: 0.3, gain: 0.15 * v, pan, detune: 20 })
        break
      case 'swing':
        this.noise({ dur: 0.22, filter: 'bandpass', freq: 500, to: 3000, q: 2, gain: 0.35 * v, pan })
        break
      case 'hit':
        this.noise({ dur: 0.18, filter: 'bandpass', freq: 1200 * p, q: 1.5, gain: 0.45 * v, pan })
        this.tone({ type: 'square', freq: 220 * p, to: 80, dur: 0.12, gain: 0.18 * v, pan })
        break
      case 'charge':
        this.noise({ dur: 0.6, filter: 'bandpass', freq: 300, to: 3000, q: 0.8, gain: 0.45 * v, pan, attack: 0.05 })
        this.tone({ type: 'sawtooth', freq: 80, to: 300, dur: 0.5, gain: 0.15 * v, pan })
        break
      case 'teleport':
        this.tone({ type: 'sine', freq: 200, to: 2400, dur: 0.3, gain: 0.25 * v, pan })
        this.tone({ type: 'sine', freq: 2400, to: 200, dur: 0.3, gain: 0.2 * v, delay: 0.25, pan })
        break
      case 'hook':
        for (let i = 0; i < 6; i++) this.noise({ dur: 0.04, filter: 'highpass', freq: 3500, gain: 0.2 * v, delay: i * 0.035, pan })
        this.tone({ type: 'square', freq: 400, to: 120, dur: 0.2, gain: 0.1 * v, delay: 0.2, pan })
        break
      case 'drone':
        this.tone({ type: 'sawtooth', freq: 180, to: 260, dur: 0.4, gain: 0.08 * v, pan, attack: 0.05 })
        break
      case 'cooldown':
        this.noise({ dur: 0.8, filter: 'highpass', freq: 3000, to: 1200, gain: 0.25 * v, pan, attack: 0.05 })
        break
      case 'overheat':
        ;[0, 0.22].forEach((d) => this.tone({ type: 'square', freq: 880, to: 440, dur: 0.18, gain: 0.12 * v, delay: d, pan }))
        break
      case 'hype': {
        const base = 523 * p
        ;[1, 1.26, 1.5, 2].forEach((m, i) => this.tone({ type: 'square', freq: base * m, dur: 0.12, gain: 0.06 * v, delay: i * 0.05 }))
        this.noise({ dur: 0.3, filter: 'highpass', freq: 4000, to: 9000, gain: 0.12 * v, delay: 0.12 })
        break
      }
      case 'alarm':
        ;[0, 0.28].forEach((d) => this.tone({ type: 'sawtooth', freq: 660, to: 990, dur: 0.22, gain: 0.07 * v, delay: d }))
        break
      case 'turn':
        this.tone({ type: 'triangle', freq: 660, dur: 0.08, gain: 0.08 * v })
        this.tone({ type: 'triangle', freq: 990, dur: 0.12, gain: 0.08 * v, delay: 0.07 })
        break
      case 'fuse':
        this.tone({ type: 'sine', freq: 200, to: 800, dur: 0.6, gain: 0.2 * v })
        this.noise({ dur: 0.6, filter: 'bandpass', freq: 1500, q: 4, gain: 0.15 * v })
        this.tone({ type: 'triangle', freq: 1047, dur: 0.3, gain: 0.12 * v, delay: 0.55 })
        break
      case 'transform':
        ;[262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => this.tone({ type: 'triangle', freq: f, dur: 0.5, gain: 0.08 * v, delay: i * 0.06 }))
        this.noise({ dur: 1.2, filter: 'highpass', freq: 1000, to: 8000, gain: 0.15 * v })
        break
    }
  }

  // -------------------------------------------------------------------------
  // Music: 16-step loops, 4 bars.

  startMusic(track: 'menu' | 'battle', force = false) {
    if (this.track === track && !force && this.musicTimer) return
    this.stopMusic()
    this.track = track
    if (!this.ctx) return
    this.step = 0
    this.nextTime = this.ctx.currentTime + 0.1
    this.musicTimer = setInterval(() => this.schedule(), 25)
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer)
    this.musicTimer = null
  }

  private schedule() {
    if (!this.ctx || !this.track) return
    const bpm = this.track === 'battle' ? 128 : 96
    const stepDur = 60 / bpm / 4
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime)
      this.nextTime += stepDur
      this.step = (this.step + 1) % 64
    }
  }

  private note(type: OscillatorType, freq: number, t: number, dur: number, gain: number, cutoff?: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    let node: AudioNode = osc
    if (cutoff) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(cutoff, t)
      f.frequency.exponentialRampToValueAtTime(cutoff * 0.3, t + dur)
      osc.connect(f)
      node = f
    }
    node.connect(g).connect(this.musicBus)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  private drum(kind: 'kick' | 'snare' | 'hat', t: number) {
    const ctx = this.ctx!
    if (kind === 'kick') {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.frequency.setValueAtTime(140, t)
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.15)
      g.gain.setValueAtTime(0.7, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
      osc.connect(g).connect(this.musicBus)
      osc.start(t)
      osc.stop(t + 0.3)
      return
    }
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = kind === 'hat' ? 'highpass' : 'bandpass'
    f.frequency.value = kind === 'hat' ? 7000 : 1800
    const g = ctx.createGain()
    const dur = kind === 'hat' ? 0.05 : 0.16
    g.gain.setValueAtTime(kind === 'hat' ? 0.12 : 0.35, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.musicBus)
    src.start(t, Math.random())
    src.stop(t + dur + 0.02)
  }

  private playStep(step: number, t: number) {
    const bar = Math.floor(step / 16)
    const s = step % 16
    const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
    if (this.track === 'battle') {
      // A minor drive: Am - F - C - G
      const roots = [45, 41, 48, 43]
      const r = roots[bar]
      if (s % 4 === 0 || s === 10) this.drum('kick', t)
      if (s === 4 || s === 12) this.drum('snare', t)
      if (s % 2 === 1) this.drum('hat', t)
      if (s % 2 === 0) this.note('sawtooth', hz(r - 12 + (s % 8 === 6 ? 12 : 0)), t, 0.14, 0.16, 900)
      const arp = [0, 7, 12, 15, 12, 7, 3, 7]
      if (s % 2 === 0) this.note('square', hz(r + 12 + arp[(s / 2) % 8]), t, 0.1, 0.035, 2600)
      if (s === 0) this.note('triangle', hz(r + 24), t, 0.9, 0.05)
    } else {
      // Calm hangar loop: Cmaj7 - Am7 - Fmaj7 - G
      const chords = [
        [48, 52, 55, 59],
        [45, 48, 52, 55],
        [41, 45, 48, 52],
        [43, 47, 50, 55],
      ]
      const c = chords[bar]
      if (s === 0 || s === 8) this.drum('kick', t)
      if (s === 12) this.drum('snare', t)
      if (s % 4 === 2) this.drum('hat', t)
      if (s === 0) this.note('sawtooth', hz(c[0] - 12), t, 1.2, 0.1, 500)
      if (s === 8) this.note('sawtooth', hz(c[0] - 12), t, 0.6, 0.08, 500)
      const pattern = [0, 2, 1, 3, 2, 1, 3, 2]
      if (s % 2 === 0) this.note('triangle', hz(c[pattern[(s / 2) % 8]] + 12), t, 0.3, 0.05)
      if (s === 0) for (const n of c) this.note('sine', hz(n + 12), t, 1.6, 0.025)
    }
  }
}

export const audio = new AudioEngine()

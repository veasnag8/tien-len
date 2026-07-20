'use client';

type SoundName = 'deal' | 'play' | 'pass' | 'win' | 'lose' | 'countdown';

const FREQUENCIES: Record<SoundName, number[]> = {
  deal: [440, 520],
  play: [660],
  pass: [320],
  win: [523, 659, 784],
  lose: [392, 330, 262],
  countdown: [880],
};

export class SoundManager {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  play(name: SoundName, enabled: boolean): void {
    if (!enabled) {
      return;
    }
    const ctx = this.ensure();
    if (!ctx) {
      return;
    }
    const notes = FREQUENCIES[name];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = name === 'win' ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + index * 0.08;
      osc.start(start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.stop(start + 0.22);
    });
  }
}

export const sounds = new SoundManager();

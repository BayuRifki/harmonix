const BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
const Q = 1.4;
const MIN_GAIN = -12;
const MAX_GAIN = 12;

export type EqGains = number[];

export class Equalizer {
  private filters: BiquadFilterNode[];
  private output: AudioNode | null = null;
  private gains: number[];

  constructor() {
    this.filters = [];
    this.gains = BANDS.map(() => 0);
  }

  connect(input: AudioNode, output: AudioNode): void {
    this.output = output;
    if (this.filters.length > 0) return;
    const ctx = input.context;
    let prev: AudioNode = input;
    for (const freq of BANDS) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = Q;
      filter.gain.value = 0;
      prev.connect(filter);
      prev = filter;
      this.filters.push(filter);
    }
    prev.connect(output);
  }

  setBandGain(index: number, gainDb: number): void {
    if (index < 0 || index >= this.filters.length) return;
    const clamped = Math.max(MIN_GAIN, Math.min(MAX_GAIN, gainDb));
    this.filters[index].gain.value = clamped;
    this.gains[index] = clamped;
  }

  setAllGains(gains: EqGains): void {
    if (gains.length !== this.filters.length) return;
    gains.forEach((g, i) => this.setBandGain(i, g));
  }

  getGains(): EqGains {
    return [...this.gains];
  }

  reset(): void {
    this.filters.forEach((f) => {
      f.gain.value = 0;
    });
    this.gains = this.gains.map(() => 0);
  }

  bands(): readonly number[] {
    return BANDS;
  }

  disconnect(): void {
    if (this.filters.length > 0 && this.output) {
      try {
        this.filters[this.filters.length - 1].disconnect(this.output);
      } catch {
        // ignore
      }
    }
    this.filters = [];
    this.output = null;
  }
}

export const equalizer = new Equalizer();

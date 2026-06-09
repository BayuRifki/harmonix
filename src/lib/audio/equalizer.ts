const BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
const Q = 1.4;
const MIN_GAIN = -12;
const MAX_GAIN = 12;

export type EqGains = number[];

export class Equalizer {
  private filters: BiquadFilterNode[] = [];
  private input: AudioNode | null = null;
  private output: AudioNode | null = null;
  private gains: number[] = BANDS.map(() => 0);

  bands(): readonly number[] {
    return BANDS;
  }

  isConnected(): boolean {
    return this.input !== null && this.output !== null && this.filters.length === BANDS.length;
  }

  /**
   * Returns the audio node sitting immediately before the first EQ band
   * (i.e. the signal entering the EQ chain). Used to tap a pre-EQ
   * AnalyserNode for visualization. Returns null when the EQ has not
   * been wired into the audio graph yet.
   */
  getPreEqNode(): AudioNode | null {
    return this.input;
  }

  connect(input: AudioNode, output: AudioNode): void {
    if (this.isConnected()) {
      this.disconnect();
    }
    try {
      input.disconnect(output);
    } catch {
      // no prior direct connection — fine
    }
    this.input = input;
    this.output = output;
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
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].gain.value = this.gains[i];
    }
  }

  setBandGain(index: number, gainDb: number): void {
    if (index < 0 || index >= BANDS.length) return;
    const clamped = Math.max(MIN_GAIN, Math.min(MAX_GAIN, gainDb));
    this.gains[index] = clamped;
    if (this.filters[index]) {
      this.filters[index].gain.value = clamped;
    }
  }

  setAllGains(gains: EqGains): void {
    if (gains.length !== BANDS.length) return;
    gains.forEach((g, i) => this.setBandGain(i, g));
  }

  getGains(): EqGains {
    return [...this.gains];
  }

  reset(): void {
    this.gains = this.gains.map(() => 0);
    for (const f of this.filters) {
      f.gain.value = 0;
    }
  }

  disconnect(): void {
    for (const f of this.filters) {
      try {
        f.disconnect();
      } catch {
        // ignore
      }
    }
    this.filters = [];
    this.input = null;
    this.output = null;
  }
}

export const equalizer = new Equalizer();

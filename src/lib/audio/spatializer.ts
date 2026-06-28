/**
 * HRTF spatializer + phantom center matrix.
 * Converts hard-panned stereo mixes into a binaural soundstage using HRTF convolution
 * and mid/side matrixing to extract and reposition the center channel.
 */

export class Spatializer {
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;

  // The dry/wet mix
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;

  // Mid/side matrix
  private splitter: ChannelSplitterNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private centerExtract: GainNode | null = null;
  private panner: PannerNode | null = null;

  private ctx: AudioContext | null = null;
  private intensity: number = 0; // 0 (dry) to 1 (full width)

  /**
   * Connects the spatializer between a source and a destination.
   * If already connected, it cleans up the old graph first.
   */
  connect(source: AudioNode, destination: AudioNode, ctx: AudioContext): void {
    this.disconnect();
    this.ctx = ctx;

    // Entry and exit points
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Dry path
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1.0;
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet path
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.0;

    // Split stereo to M/S
    this.splitter = ctx.createChannelSplitter(2);
    this.inputNode.connect(this.wetGain);
    this.wetGain.connect(this.splitter);

    // Center extraction (Mid = L+R)
    this.centerExtract = ctx.createGain();
    this.centerExtract.gain.value = 0.5; // -6dB to avoid clipping when summing

    // Left to mid
    this.splitter.connect(this.centerExtract, 0, 0);
    // Right to mid
    this.splitter.connect(this.centerExtract, 1, 0);

    // HRTF Panner for the center channel
    this.panner = ctx.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    // Push center slightly forward in front of the listener
    this.panner.positionZ.value = -0.5;
    this.panner.positionY.value = 0.1;

    this.centerExtract.connect(this.panner);
    this.panner.connect(this.outputNode);

    // TODO: Add side channel (L-R) processing for full width expansion
    // For now, this just extracts center and positions it via HRTF.

    // Connect IO
    source.connect(this.inputNode);
    this.outputNode.connect(destination);

    // Apply initial intensity
    this.setIntensity(this.intensity);
  }

  disconnect(): void {
    if (this.inputNode) {
      this.inputNode.disconnect();
      this.inputNode = null;
    }
    if (this.outputNode) {
      this.outputNode.disconnect();
      this.outputNode = null;
    }
    if (this.dryGain) this.dryGain.disconnect();
    if (this.wetGain) this.wetGain.disconnect();
    if (this.splitter) this.splitter.disconnect();
    if (this.merger) this.merger.disconnect();
    if (this.centerExtract) this.centerExtract.disconnect();
    if (this.panner) this.panner.disconnect();

    this.ctx = null;
  }

  setIntensity(val: number): void {
    this.intensity = Math.max(0, Math.min(1, val));
    if (!this.dryGain || !this.wetGain) return;

    // Equal power crossfade
    const angle = this.intensity * Math.PI * 0.5;
    this.dryGain.gain.setTargetAtTime(Math.cos(angle), this.ctx!.currentTime, 0.01);
    this.wetGain.gain.setTargetAtTime(Math.sin(angle), this.ctx!.currentTime, 0.01);

    // Adjust depth based on intensity
    if (this.panner) {
      this.panner.positionZ.setTargetAtTime(
        -0.5 - this.intensity * 0.5,
        this.ctx!.currentTime,
        0.01,
      );
    }
  }

  getIntensity(): number {
    return this.intensity;
  }
}

export const spatializer = new Spatializer();

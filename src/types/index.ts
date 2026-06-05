import type {
  Track,
  Album,
  Artist,
  Playlist,
  MusicSource,
  StreamInfo,
  SearchResult,
  SearchOptions,
  AuthStatus,
  EqPreset,
} from '../../electron/main/sources/types';

import {
  EQ_BAND_FREQUENCIES,
  EQ_MIN_GAIN,
  EQ_MAX_GAIN,
  FLAT_GAINS,
  clampGain,
  clampGains,
} from '../../electron/main/sources/types';

export type { Track, Album, Artist, Playlist, MusicSource, StreamInfo, SearchResult, SearchOptions, AuthStatus, EqPreset };
export { EQ_BAND_FREQUENCIES, EQ_MIN_GAIN, EQ_MAX_GAIN, FLAT_GAINS, clampGain, clampGains };

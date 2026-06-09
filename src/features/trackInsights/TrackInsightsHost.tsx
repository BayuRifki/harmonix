import { TrackInsightsPanel } from './TrackInsightsPanel';
import { useInsightsStore } from '@/stores/insightsStore';

/**
 * Wires the global `insightsStore.track` to the `TrackInsightsPanel`.
 * Mounted at the top of the app so it survives route changes.
 */
export function TrackInsightsHost(): JSX.Element {
  const track = useInsightsStore((s) => s.track);
  const close = useInsightsStore((s) => s.close);
  return <TrackInsightsPanel track={track} onClose={close} />;
}

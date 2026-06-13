import { Sparkles, Music, Smile, Frown, Coffee, Zap, Heart } from 'lucide-react';
import type { Mood } from '@/lib/recommender/mood';

interface MoodChipProps {
  mood: Mood;
  size?: 'sm' | 'md';
  className?: string;
}

interface MoodVisual {
  icon: typeof Sparkles;
  label: string;
  colorClass: string;
}

const MOOD_VISUALS: Record<Mood, MoodVisual> = {
  happy: {
    icon: Smile,
    label: 'Happy',
    colorClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  sad: { icon: Frown, label: 'Sad', colorClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  chill: {
    icon: Coffee,
    label: 'Chill',
    colorClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  hype: {
    icon: Zap,
    label: 'Hype',
    colorClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  romantic: {
    icon: Heart,
    label: 'Romantic',
    colorClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  },
  unknown: {
    icon: Music,
    label: 'Unknown',
    colorClass: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  },
};

/**
 * Small pill showing a track's detected mood.
 *
 * Used on the Discover page and (optionally) the Track Insights
 * panel. Renders nothing useful for the `unknown` mood other
 * than a muted placeholder — callers can suppress the chip
 * entirely when mood is unknown by simply not rendering this
 * component, which is the convention the Discover page follows.
 */
export function MoodChip({ mood, size = 'sm', className = '' }: MoodChipProps): JSX.Element {
  const visual = MOOD_VISUALS[mood];
  const Icon = visual.icon;
  const sizeClass = size === 'md' ? 'text-xs px-2 py-1 gap-1.5' : 'text-[10px] px-1.5 py-0.5 gap-1';
  return (
    <span
      data-testid={`mood-chip-${mood}`}
      data-mood={mood}
      className={`inline-flex items-center rounded-full border font-medium uppercase tracking-wider ${sizeClass} ${visual.colorClass} ${className}`}
    >
      <Icon size={size === 'md' ? 12 : 9} aria-hidden />
      <span>{visual.label}</span>
    </span>
  );
}

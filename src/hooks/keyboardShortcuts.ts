export const SHORTCUT_IDS = [
  'play_pause',
  'next_track',
  'prev_track',
  'volume_up',
  'volume_down',
  'mute_toggle',
  'seek_forward',
  'seek_backward',
  'shuffle_toggle',
  'repeat_cycle',
  'queue_toggle',
  'command_palette',
  'mini_player_toggle',
  'list_down',
  'list_up',
  'list_top',
  'list_bottom',
  'list_forward',
  'list_back',
  'help_overlay',
] as const;

export type ShortcutId = (typeof SHORTCUT_IDS)[number];

export interface ShortcutDefinition {
  id: ShortcutId;
  category: 'Playback' | 'Queue' | 'List' | 'UI' | 'Volume';
  keys: string[];
  label: string;
  description: string;
}

export const SHORTCUT_DEFINITIONS: Record<ShortcutId, ShortcutDefinition> = {
  play_pause: {
    id: 'play_pause',
    category: 'Playback',
    keys: ['Space'],
    label: 'Play / Pause',
    description: 'Toggle playback of the current track.',
  },
  next_track: {
    id: 'next_track',
    category: 'Playback',
    keys: ['Shift', '→'],
    label: 'Next track',
    description: 'Skip to the next track in the queue.',
  },
  prev_track: {
    id: 'prev_track',
    category: 'Playback',
    keys: ['Shift', '←'],
    label: 'Previous track',
    description: 'Restart current track or go back in the queue.',
  },
  seek_forward: {
    id: 'seek_forward',
    category: 'Playback',
    keys: ['→'],
    label: 'Seek forward',
    description: 'Move playhead 5 seconds forward.',
  },
  seek_backward: {
    id: 'seek_backward',
    category: 'Playback',
    keys: ['←'],
    label: 'Seek backward',
    description: 'Move playhead 5 seconds backward.',
  },
  shuffle_toggle: {
    id: 'shuffle_toggle',
    category: 'Playback',
    keys: ['S'],
    label: 'Shuffle',
    description: 'Toggle shuffle mode.',
  },
  repeat_cycle: {
    id: 'repeat_cycle',
    category: 'Playback',
    keys: ['R'],
    label: 'Repeat',
    description: 'Cycle through repeat modes (off, all, one).',
  },
  queue_toggle: {
    id: 'queue_toggle',
    category: 'Queue',
    keys: ['Q'],
    label: 'Queue drawer',
    description: 'Open or close the queue drawer.',
  },
  list_down: {
    id: 'list_down',
    category: 'List',
    keys: ['J'],
    label: 'Next item',
    description: 'Move selection down in the current list.',
  },
  list_up: {
    id: 'list_up',
    category: 'List',
    keys: ['K'],
    label: 'Previous item',
    description: 'Move selection up in the current list.',
  },
  list_top: {
    id: 'list_top',
    category: 'List',
    keys: ['G'],
    label: 'First item',
    description: 'Jump to the first item in the current list.',
  },
  list_bottom: {
    id: 'list_bottom',
    category: 'List',
    keys: ['Shift', 'G'],
    label: 'Last item',
    description: 'Jump to the last item in the current list.',
  },
  list_forward: {
    id: 'list_forward',
    category: 'List',
    keys: ['L'],
    label: 'Forward',
    description: 'Move to the next pane (or history forward).',
  },
  list_back: {
    id: 'list_back',
    category: 'List',
    keys: ['H'],
    label: 'Back',
    description: 'Move to the previous pane (or history back).',
  },
  volume_up: {
    id: 'volume_up',
    category: 'Volume',
    keys: ['↑'],
    label: 'Volume up',
    description: 'Increase volume by 5%.',
  },
  volume_down: {
    id: 'volume_down',
    category: 'Volume',
    keys: ['↓'],
    label: 'Volume down',
    description: 'Decrease volume by 5%.',
  },
  mute_toggle: {
    id: 'mute_toggle',
    category: 'Volume',
    keys: ['M'],
    label: 'Mute / unmute',
    description: 'Mute or restore previous volume.',
  },
  command_palette: {
    id: 'command_palette',
    category: 'UI',
    keys: ['Mod', 'K'],
    label: 'Command palette',
    description: 'Open the command palette for fast navigation.',
  },
  mini_player_toggle: {
    id: 'mini_player_toggle',
    category: 'UI',
    keys: ['Mod', 'Shift', 'M'],
    label: 'Mini-player',
    description: 'Toggle the mini-player window.',
  },
  help_overlay: {
    id: 'help_overlay',
    category: 'UI',
    keys: ['?'],
    label: 'Show shortcuts',
    description: 'Open the keyboard shortcuts help overlay.',
  },
};

export interface ShortcutCategory {
  id: ShortcutDefinition['category'];
  label: string;
}

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  { id: 'Playback', label: 'Playback' },
  { id: 'Queue', label: 'Queue' },
  { id: 'List', label: 'List navigation' },
  { id: 'Volume', label: 'Volume' },
  { id: 'UI', label: 'Interface' },
];

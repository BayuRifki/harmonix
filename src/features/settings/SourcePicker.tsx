import { useEffect, useMemo, useState } from 'react';
import { useSourcesStore } from '@/stores/sourcesStore';
import type { SourceRegistration } from '@/types/global';

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
}

const SOURCE_CONFIG_FIELDS: Record<string, ConfigField[]> = {
  spotify: [
    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Spotify app client id' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  deezer: [],
  jamendo: [
    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Defaults to public test id' },
  ],
  audius: [
    { key: 'host', label: 'Discovery Node', type: 'text', placeholder: 'https://audius.co' },
  ],
  soundcloud: [
    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Required for search' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  ytmusic: [],
  local: [],
  demo: [],
};

interface SourceConfigDialogProps {
  source: SourceRegistration;
  onClose: () => void;
  onSave: (settings: Record<string, unknown>) => Promise<void>;
  getConfig: (id: string) => Promise<Record<string, unknown>>;
}

function SourceConfigDialog({ source, onClose, onSave, getConfig }: SourceConfigDialogProps): JSX.Element {
  const fields = useMemo(() => SOURCE_CONFIG_FIELDS[source.id] ?? [], [source.id]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const cfg = await getConfig(source.id);
      const initial: Record<string, string> = {};
      for (const f of fields) {
        const v = cfg[f.key];
        initial[f.key] = typeof v === 'string' ? v : '';
      }
      setValues(initial);
      setLoaded(true);
    })();
  }, [source.id, getConfig, fields]);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const settings: Record<string, unknown> = {};
      for (const f of fields) {
        const v = values[f.key]?.trim();
        if (v) settings[f.key] = v;
      }
      await onSave(settings);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Configure ${source.name}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Configure {source.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {fields.length === 0 ? (
          <p className="text-sm text-zinc-500">This source has no configurable options.</p>
        ) : !loaded ? (
          <p className="text-sm text-zinc-500">Loading existing settings…</p>
        ) : (
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-zinc-400 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={values[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            ))}
            <p className="text-[10px] text-zinc-600 mt-2">
              Settings are stored locally and used for authentication or API access.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
          {fields.length > 0 && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SourceRowProps {
  source: SourceRegistration;
  onToggle: (id: string, enabled: boolean) => void;
  onConfigure: (source: SourceRegistration) => void;
}

function SourceRow({ source, onToggle, onConfigure }: SourceRowProps): JSX.Element {
  const caps: Array<[string, boolean]> = [
    ['Search', source.capabilities.canSearch],
    ['Stream', source.capabilities.canStream],
    ['Playlists', source.capabilities.canGetPlaylists],
    ['Liked Tracks', source.capabilities.canGetLikedTracks],
    ['Auth', source.capabilities.requiresAuth],
  ];
  const configurable = (SOURCE_CONFIG_FIELDS[source.id] ?? []).length > 0;

  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">{source.name}</span>
          <code className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
            {source.id}
          </code>
          {source.authenticated && (
            <span className="text-xs text-green-400" title="Authenticated">
              ✓
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {caps.map(([name, supported]) =>
            supported ? (
              <span
                key={name}
                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded"
              >
                {name}
              </span>
            ) : null,
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {configurable && (
          <button
            type="button"
            onClick={() => onConfigure(source)}
            className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-800"
            aria-label={`Configure ${source.name}`}
            title="Configure"
          >
            ⚙
          </button>
        )}
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={source.enabled}
            onChange={(e) => onToggle(source.id, e.target.checked)}
            className="sr-only peer"
            aria-label={`Enable ${source.name}`}
          />
          <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-brand-500 transition relative">
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition" />
          </div>
        </label>
      </div>
    </div>
  );
}

export function SourcePicker(): JSX.Element {
  const registrations = useSourcesStore((s) => s.registrations);
  const loading = useSourcesStore((s) => s.loading);
  const refresh = useSourcesStore((s) => s.refresh);
  const setEnabled = useSourcesStore((s) => s.setEnabled);
  const saveConfig = useSourcesStore((s) => s.saveConfig);
  const getConfig = useSourcesStore((s) => s.getConfig);
  const [configSource, setConfigSource] = useState<SourceRegistration | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Music Sources</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          ↻ Refresh
        </button>
      </div>
      {loading && registrations.length === 0 ? (
        <p className="text-xs text-zinc-500">Loading…</p>
      ) : registrations.length === 0 ? (
        <p className="text-xs text-zinc-500">No sources registered.</p>
      ) : (
        <div className="space-y-2">
          {registrations.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              onToggle={(id, enabled) => void setEnabled(id, enabled)}
              onConfigure={setConfigSource}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-zinc-500 mt-3">
        Toggle to enable/disable. Disabled sources will not appear in search or playback. Click ⚙ on
        a source to configure credentials.
      </p>
      {configSource && (
        <SourceConfigDialog
          source={configSource}
          getConfig={getConfig}
          onClose={() => setConfigSource(null)}
          onSave={async (settings) => {
            await saveConfig(configSource.id, settings);
          }}
        />
      )}
    </section>
  );
}

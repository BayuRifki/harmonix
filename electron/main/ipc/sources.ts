import { ipcMain } from 'electron';
import {
  getAllSources,
  getEnabledSources,
  getSource,
  listRegistrations,
} from '../sources/registry';
import { getSetting, setSetting } from '../db';
import type {
  SearchOptions,
  SearchResult,
  StreamInfo,
  Track,
  AuthStatus,
  Playlist,
} from '../sources/types';

interface SourceSettingsKey {
  enabled: string;
  config: string;
}

const DEFAULT_ENABLED_SOURCES = new Set(['ytmusic']);

function settingsKeys(sourceId: string): SourceSettingsKey {
  return {
    enabled: `source.${sourceId}.enabled`,
    config: `source.${sourceId}.config`,
  };
}

export function registerSourceHandlers(): void {
  ipcMain.handle('sources:list', async () => {
    const regs = listRegistrations();
    for (const reg of regs) {
      const src = getSource(reg.id);
      if (src) {
        const status = await src.getAuthStatus();
        reg.authenticated = status.authenticated;
      }
    }
    return regs;
  });

  ipcMain.handle('sources:list-enabled', async () => {
    return getEnabledSources().map((s) => s.id);
  });

  ipcMain.handle('sources:get', async (_evt, id: string) => {
    return getSource(id) ?? null;
  });

  ipcMain.handle('sources:set-enabled', async (_evt, payload: { id: string; enabled: boolean }) => {
    const src = getSource(payload.id);
    if (!src) throw new Error(`Source '${payload.id}' not found`);
    src.setEnabled(payload.enabled);
    const keys = settingsKeys(payload.id);
    setSetting(keys.enabled, payload.enabled ? '1' : '0');
    return { id: payload.id, enabled: payload.enabled };
  });

  ipcMain.handle('sources:load-configs', async () => {
    const migrated = getSetting('app.default_ytmusic_only_applied') === '1';
    if (!migrated) {
      for (const src of getAllSources()) {
        if (DEFAULT_ENABLED_SOURCES.has(src.id)) continue;
        setSetting(`source.${src.id}.enabled`, '0');
        src.setEnabled(false);
        src.setConfig({ enabled: false, settings: src.getConfig().settings });
      }
      setSetting('app.default_ytmusic_only_applied', '1');
    }

    const configs: Record<string, { enabled: boolean; settings: Record<string, unknown> }> = {};
    for (const src of getAllSources()) {
      const keys = settingsKeys(src.id);
      const enabledSetting = getSetting(keys.enabled);
      const configSetting = getSetting(keys.config);
      const enabled =
        enabledSetting == null ? DEFAULT_ENABLED_SOURCES.has(src.id) : enabledSetting === '1';
      const settings = configSetting ? (JSON.parse(configSetting) as Record<string, unknown>) : {};
      src.setEnabled(enabled);
      src.setConfig({ enabled, settings });
      configs[src.id] = { enabled, settings };
    }
    return configs;
  });

  ipcMain.handle(
    'sources:save-config',
    async (_evt, payload: { id: string; settings: Record<string, unknown> }) => {
      const src = getSource(payload.id);
      if (!src) throw new Error(`Source '${payload.id}' not found`);
      src.setConfig({ settings: payload.settings });
      const keys = settingsKeys(payload.id);
      setSetting(keys.config, JSON.stringify(payload.settings));
      return { id: payload.id, settings: payload.settings };
    },
  );

  ipcMain.handle(
    'sources:get-config',
    async (_evt, payload: { id: string }): Promise<Record<string, unknown>> => {
      const keys = settingsKeys(payload.id);
      const raw = getSetting(keys.config);
      if (!raw) return {};
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return {};
      }
    },
  );

  ipcMain.handle('sources:get-auth-statuses', async (): Promise<AuthStatus[]> => {
    return Promise.all(getAllSources().map((s) => s.getAuthStatus()));
  });

  ipcMain.handle(
    'sources:search',
    async (
      _evt,
      payload: { query: string; options?: SearchOptions; sourceIds?: string[] },
    ): Promise<Array<{ sourceId: string; result: SearchResult }>> => {
      const sources =
        payload.sourceIds && payload.sourceIds.length > 0
          ? payload.sourceIds
              .map((id) => getSource(id))
              .filter((s): s is NonNullable<typeof s> => !!s)
          : getEnabledSources();

      const results = await Promise.all(
        sources.map(async (src) => {
          try {
            const result = await src.search(payload.query, payload.options);
            return { sourceId: src.id, result };
          } catch (err) {
            console.warn(`[sources] Search failed for '${src.id}':`, (err as Error).message);
            return {
              sourceId: src.id,
              result: { tracks: [], albums: [], artists: [], playlists: [] },
            };
          }
        }),
      );
      return results;
    },
  );

  ipcMain.handle(
    'sources:play-track',
    async (_evt, payload: { track: Track }): Promise<StreamInfo> => {
      const src = getSource(payload.track.source);
      if (!src) throw new Error(`Source '${payload.track.source}' not found`);
      return src.getStreamUrl(payload.track);
    },
  );

  ipcMain.handle(
    'sources:user-playlists',
    async (_evt, payload: { id: string }): Promise<Playlist[]> => {
      const src = getSource(payload.id);
      if (!src) throw new Error(`Source '${payload.id}' not found`);
      if (!src.capabilities.canGetPlaylists || typeof src.getUserPlaylists !== 'function') {
        return [];
      }
      return src.getUserPlaylists();
    },
  );

  ipcMain.handle(
    'sources:liked-tracks',
    async (_evt, payload: { id: string }): Promise<Track[]> => {
      const src = getSource(payload.id);
      if (!src) throw new Error(`Source '${payload.id}' not found`);
      if (!src.capabilities.canGetLikedTracks || typeof src.getLikedTracks !== 'function') {
        return [];
      }
      return src.getLikedTracks();
    },
  );

  ipcMain.handle(
    'sources:playlist-tracks',
    async (_evt, payload: { id: string; playlistId: string }): Promise<Track[]> => {
      const src = getSource(payload.id);
      if (!src) throw new Error(`Source '${payload.id}' not found`);
      if (!src.capabilities.canGetPlaylists || typeof src.getPlaylistTracks !== 'function') {
        return [];
      }
      return src.getPlaylistTracks(payload.playlistId);
    },
  );
}

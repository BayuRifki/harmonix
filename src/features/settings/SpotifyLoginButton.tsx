import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { SpotifyLoginResult } from '@/types/global';

export function SpotifyLoginButton(): JSX.Element {
  const spotify = useAuthStore((s) => s.spotify);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const refreshSpotify = useAuthStore((s) => s.refreshSpotify);
  const loginSpotify = useAuthStore((s) => s.loginSpotify);
  const logoutSpotify = useAuthStore((s) => s.logoutSpotify);
  const [lastResult, setLastResult] = useState<SpotifyLoginResult | null>(null);

  useEffect(() => {
    void refreshSpotify();
  }, [refreshSpotify]);

  const isConnected = spotify?.authenticated === true;
  const userName = spotify?.userName;
  const isMissingConfig = userName === 'Configuration missing';

  const handleLogin = async (): Promise<void> => {
    const result = await loginSpotify();
    setLastResult(result);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-green-500">●</span> Spotify
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {isMissingConfig
              ? 'Configuration missing — see below'
              : isConnected
                ? `Connected as ${userName ?? 'User'}`
                : 'Not connected'}
          </p>
        </div>
        {isConnected ? (
          <button
            type="button"
            onClick={() => void logoutSpotify()}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition disabled:opacity-50"
          >
            {loading ? '…' : 'Disconnect'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={loading || isMissingConfig}
            className="px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-black font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              isMissingConfig
                ? 'Set SPOTIFY_CLIENT_ID in .env first'
                : 'Connect to Spotify'
            }
          >
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        )}
      </div>

      {lastResult && !lastResult.ok && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900 rounded p-2 mb-3">
          {lastResult.error}
        </div>
      )}

      {error && !lastResult && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900 rounded p-2 mb-3">
          {error}
        </div>
      )}

      {isMissingConfig && (
        <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900 rounded p-3 space-y-1">
          <p className="font-medium">Setup required:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-amber-200/80">
            <li>
              Create an app at{' '}
              <a
                href="https://developer.spotify.com/dashboard/"
                target="_blank"
                rel="noreferrer"
                className="text-amber-200 underline"
              >
                developer.spotify.com/dashboard
              </a>
            </li>
            <li>
              Add redirect URI: <code className="bg-zinc-900 px-1 rounded">http://127.0.0.1:8888/callback</code>
            </li>
            <li>
              Set <code className="bg-zinc-900 px-1 rounded">SPOTIFY_CLIENT_ID</code> in <code className="bg-zinc-900 px-1 rounded">.env</code>
            </li>
            <li>Restart the app</li>
          </ol>
        </div>
      )}

      {isConnected && (
        <p className="text-xs text-zinc-500">
          Premium users get full playback. Free users get 30-second preview clips.
        </p>
      )}
    </div>
  );
}

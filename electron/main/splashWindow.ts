import { BrowserWindow, app } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SPLASH_WIDTH = 360;
const SPLASH_HEIGHT = 360;
const LOGO_SIZE = 160;
const SPLASH_MAX_LIFETIME_MS = 15_000;

let splash: BrowserWindow | null = null;
let autoCloseTimer: NodeJS.Timeout | null = null;

function loadLogoAsDataUrl(): string {
  const candidates = [
    join(app.getAppPath(), 'public', 'logo.png'),
    join(process.resourcesPath ?? '', 'logo.png'),
  ];
  for (const path of candidates) {
    if (path && existsSync(path)) {
      const buf = readFileSync(path);
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
  }
  return '';
}

function buildSplashHtml(): string {
  const logoDataUrl = loadLogoAsDataUrl();
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';" />
    <title>Harmonix</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 100%; height: 100%; background: #0a0a0a; overflow: hidden; }
      body {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #e4e4e7; gap: 18px;
        -webkit-app-region: drag; user-select: none;
      }
      .logo-wrap {
        width: ${LOGO_SIZE}px; height: ${LOGO_SIZE}px;
        display: flex; align-items: center; justify-content: center;
        filter: drop-shadow(0 4px 28px rgba(236, 72, 153, 0.35));
        animation: pulse 2.4s ease-in-out infinite;
      }
      .logo-wrap img { width: 100%; height: 100%; object-fit: contain; display: block; }
      h1 {
        font-size: 14px; font-weight: 700; letter-spacing: 0.32em;
        background: linear-gradient(135deg, #f472b6, #ec4899, #a855f7);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .spinner {
        width: 28px; height: 28px;
        border: 2px solid rgba(236, 72, 153, 0.18);
        border-top-color: #ec4899;
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
      }
      .tagline { font-size: 11px; color: #71717a; letter-spacing: 0.18em; }
      @keyframes pulse { 0%, 100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="logo-wrap"><img id="logo" alt="" src="${logoDataUrl}" /></div>
    <h1>HARMONIX</h1>
    <div class="spinner" role="status" aria-label="Loading"></div>
    <p class="tagline">ONE PLAYER. ALL MUSIC.</p>
  </body>
</html>
`;
}

export function createSplashWindow(): BrowserWindow {
  if (splash && !splash.isDestroyed()) {
    return splash;
  }

  const html = buildSplashHtml();
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);

  splash = new BrowserWindow({
    width: SPLASH_WIDTH,
    height: SPLASH_HEIGHT,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#0a0a0a',
    show: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  void splash.loadURL(dataUrl);
  splash.once('ready-to-show', () => {
    splash?.show();
  });
  splash.on('closed', () => {
    splash = null;
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
  });

  autoCloseTimer = setTimeout(() => {
    closeSplashWindow();
  }, SPLASH_MAX_LIFETIME_MS);

  return splash;
}

export function closeSplashWindow(): void {
  if (splash && !splash.isDestroyed()) {
    splash.destroy();
  }
  splash = null;
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
}

export function isSplashWindow(win: BrowserWindow): boolean {
  return win === splash;
}

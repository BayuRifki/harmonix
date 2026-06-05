import { ipcMain } from 'electron';

export function registerIpcHandlers(): void {
  ipcMain.handle('app:get-version', () => {
    return process.env.npm_package_version ?? '0.0.1';
  });

  ipcMain.handle('app:get-platform', () => {
    return process.platform;
  });
}

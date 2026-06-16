declare function embedIconInWindowsExe(context: {
  electronPlatformName: string;
  appOutDir: string;
  packager: { appInfo: { productFilename: string } };
}): Promise<void>;
export = embedIconInWindowsExe;

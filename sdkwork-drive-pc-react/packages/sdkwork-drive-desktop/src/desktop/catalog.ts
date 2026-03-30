export const DESKTOP_COMMANDS = {
  appInfo: 'desktop_get_app_info',
  downloadsDir: 'desktop_get_downloads_dir',
  pathExists: 'desktop_path_exists',
  writeBinaryFile: 'desktop_write_binary_file',
  readBinaryFile: 'desktop_read_binary_file',
  pickFiles: 'desktop_pick_files',
  downloadToFile: 'desktop_download_to_file',
} as const;

export type DesktopCommandName =
  (typeof DESKTOP_COMMANDS)[keyof typeof DESKTOP_COMMANDS];

export const DESKTOP_EVENTS = {
  appReady: 'app://ready',
  trayNavigate: 'tray://navigate',
} as const;

export type DesktopEventName = (typeof DESKTOP_EVENTS)[keyof typeof DESKTOP_EVENTS];

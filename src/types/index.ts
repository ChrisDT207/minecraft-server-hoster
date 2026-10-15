export * from '../../electron/types';

export interface TabType {
  id: 'overview' | 'console' | 'properties' | 'mods' | 'network';
  label: string;
}

export interface ElectronAPI {
  // Server management
  getServers: () => Promise<import('../../electron/types').ServerConfig[]>;
  getServer: (id: string) => Promise<import('../../electron/types').ServerConfig | null>;
  createServer: (config: Omit<import('../../electron/types').ServerConfig, 'createdAt' | 'serverDir'>) => Promise<import('../../electron/types').ServerConfig>;
  deleteServer: (id: string, deleteFiles: boolean) => Promise<boolean>;
  openServerFolder: (id: string) => Promise<void>;
  updateServerConfig: (id: string, updates: Partial<import('../../electron/types').ServerConfig>) => Promise<import('../../electron/types').ServerConfig>;
  selectJavaFile: () => Promise<string | null>;

  // Server lifecycle
  startServer: (id: string) => Promise<boolean>;
  stopServer: (id: string) => Promise<boolean>;
  restartServer: (id: string) => Promise<boolean>;
  sendCommand: (id: string, command: string) => Promise<boolean>;
  getServerStatus: (id: string) => Promise<import('../../electron/types').ServerStatus>;

  // Console & metrics
  onConsoleOutput: (callback: (data: { serverId: string; text: string }) => void) => () => void;
  onServerStatusChange: (callback: (data: { serverId: string; status: import('../../electron/types').ServerStatus }) => void) => () => void;
  onServerStats: (callback: (data: { serverId: string; stats: import('../../electron/types').ServerStats }) => void) => () => void;

  // Versions
  fetchMinecraftVersions: (edition: import('../../electron/types').ServerEdition, loader: import('../../electron/types').ServerLoader) => Promise<import('../../electron/types').VersionOption[]>;
  fetchLoaderVersions: (loader: import('../../electron/types').ServerLoader, gameVersion: string) => Promise<import('../../electron/types').LoaderVersionOption[]>;

  // Properties
  getServerProperties: (id: string) => Promise<Record<string, string>>;
  saveServerProperties: (id: string, properties: Record<string, string>) => Promise<boolean>;

  // Mods & Plugins
  listMods: (id: string) => Promise<import('../../electron/types').ModItem[]>;
  toggleMod: (id: string, filename: string, enable: boolean) => Promise<boolean>;
  deleteMod: (id: string, filename: string) => Promise<boolean>;
  deleteMultipleMods: (id: string, filenames: string[]) => Promise<boolean>;
  uploadMod: (id: string, filePath?: string | string[]) => Promise<boolean>;
  getPathForFile?: (file: File) => string;
  searchModrinth: (query: string, loader: string, version: string, type: 'mod' | 'plugin') => Promise<import('../../electron/types').ModrinthHit[]>;
  installModrinthProject: (serverId: string, projectId: string, versionId?: string) => Promise<{ success: boolean; filename?: string; error?: string }>;

  // Network & Tunnel
  getSystemInfo: () => Promise<import('../../electron/types').SystemInfo>;
  getPlayitStatus: () => Promise<import('../../electron/types').PlayitStatus>;
  startPlayit: (port: number) => Promise<boolean>;
  stopPlayit: () => Promise<boolean>;
  onPlayitStatus: (callback: (status: import('../../electron/types').PlayitStatus) => void) => () => void;

  // Window Controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

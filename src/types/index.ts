export * from '../../electron/types';

export interface TabType {
  id: 'overview' | 'console' | 'properties' | 'players' | 'mods' | 'network';
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
  applyGamerules: (serverId: string, rules: Record<string, any>) => Promise<boolean>;
  getServerStatus: (id: string) => Promise<import('../../electron/types').ServerStatus>;

  // Player Data & Inventories
  getPlayers: (serverId: string) => Promise<import('../../electron/types').PlayerSummary[]>;
  getPlayerInventory: (serverId: string, uuid: string) => Promise<import('../../electron/types').PlayerInventoryDetails | null>;

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

  // World Import
  selectWorldFolder: () => Promise<string | null>;
  selectWorldZip: () => Promise<string | null>;
  detectSingleplayerSaves: () => Promise<import('../../electron/types').SingleplayerSave[]>;
  importWorldFromFolder: (
    serverId: string,
    folderPath: string,
    targetWorldName?: string,
    backupExisting?: boolean
  ) => Promise<{ success: boolean; worldName: string; backupName?: string }>;
  importWorldFromZip: (
    serverId: string,
    zipPath: string,
    targetWorldName?: string,
    backupExisting?: boolean
  ) => Promise<{ success: boolean; worldName: string; backupName?: string }>;

  // Save & Close and Shutdown Controls
  saveAndCloseServer: (serverId: string) => Promise<boolean>;
  scheduleShutdown: (options: {
    serverId: string;
    delayMinutes: number;
    shutdownPc: boolean;
    stopWhenEmpty: boolean;
  }) => Promise<import('../../electron/types').ShutdownStatus>;
  cancelShutdown: () => Promise<boolean>;
  getShutdownStatus: () => Promise<import('../../electron/types').ShutdownStatus>;
  onShutdownStatus: (callback: (status: import('../../electron/types').ShutdownStatus) => void) => () => void;

  // Remote Management Hub
  getRemoteHubStatus: () => Promise<import('../../electron/types').RemoteHubStatus>;
  updateRemoteHubConfig: (config: Partial<import('../../electron/types').RemoteHubConfig>) => Promise<import('../../electron/types').RemoteHubStatus>;
  regenerateRemoteHubPin: () => Promise<import('../../electron/types').RemoteHubStatus>;
  onRemoteHubStatus: (callback: (status: import('../../electron/types').RemoteHubStatus) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  ServerConfig,
  ServerStatus,
  ServerStats,
  ServerEdition,
  ServerLoader,
  PlayitStatus,
  SystemInfo,
  ModItem,
  ModrinthHit,
  VersionOption,
  LoaderVersionOption,
} from './types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Server Management
  getServers: (): Promise<ServerConfig[]> => ipcRenderer.invoke('server:getAll'),
  getServer: (id: string): Promise<ServerConfig | null> => ipcRenderer.invoke('server:get', id),
  createServer: (
    config: Omit<ServerConfig, 'createdAt' | 'serverDir'>
  ): Promise<ServerConfig> => ipcRenderer.invoke('server:create', config),
  deleteServer: (id: string, deleteFiles: boolean): Promise<boolean> =>
    ipcRenderer.invoke('server:delete', id, deleteFiles),
  openServerFolder: (id: string): Promise<void> =>
    ipcRenderer.invoke('server:openFolder', id),
  updateServerConfig: (
    id: string,
    updates: Partial<ServerConfig>
  ): Promise<ServerConfig> => ipcRenderer.invoke('server:updateConfig', id, updates),
  selectJavaFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectJava'),

  // Lifecycle
  startServer: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('server:start', id),
  stopServer: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('server:stop', id),
  restartServer: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('server:restart', id),
  sendCommand: (id: string, command: string): Promise<boolean> =>
    ipcRenderer.invoke('server:sendCommand', id, command),
  getServerStatus: (id: string): Promise<ServerStatus> =>
    ipcRenderer.invoke('server:getStatus', id),

  // Events / Listeners
  onConsoleOutput: (callback: (data: { serverId: string; text: string }) => void) => {
    const handler = (_: any, data: { serverId: string; text: string }) => callback(data);
    ipcRenderer.on('server:console', handler);
    return () => ipcRenderer.removeListener('server:console', handler);
  },
  onServerStatusChange: (
    callback: (data: { serverId: string; status: ServerStatus }) => void
  ) => {
    const handler = (_: any, data: { serverId: string; status: ServerStatus }) =>
      callback(data);
    ipcRenderer.on('server:status', handler);
    return () => ipcRenderer.removeListener('server:status', handler);
  },
  onServerStats: (
    callback: (data: { serverId: string; stats: ServerStats }) => void
  ) => {
    const handler = (_: any, data: { serverId: string; stats: ServerStats }) =>
      callback(data);
    ipcRenderer.on('server:stats', handler);
    return () => ipcRenderer.removeListener('server:stats', handler);
  },

  // Versions
  fetchMinecraftVersions: (
    edition: ServerEdition,
    loader: ServerLoader
  ): Promise<VersionOption[]> =>
    ipcRenderer.invoke('versions:getMinecraft', edition, loader),
  fetchLoaderVersions: (
    loader: ServerLoader,
    gameVersion: string
  ): Promise<LoaderVersionOption[]> =>
    ipcRenderer.invoke('versions:getLoaders', loader, gameVersion),

  // Properties
  getServerProperties: (id: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke('properties:get', id),
  saveServerProperties: (
    id: string,
    properties: Record<string, string>
  ): Promise<boolean> => ipcRenderer.invoke('properties:save', id, properties),

  // Mods & Plugins
  listMods: (id: string): Promise<ModItem[]> =>
    ipcRenderer.invoke('mods:list', id),
  toggleMod: (id: string, filename: string, enable: boolean): Promise<boolean> =>
    ipcRenderer.invoke('mods:toggle', id, filename, enable),
  deleteMod: (id: string, filename: string): Promise<boolean> =>
    ipcRenderer.invoke('mods:delete', id, filename),
  deleteMultipleMods: (id: string, filenames: string[]): Promise<boolean> =>
    ipcRenderer.invoke('mods:deleteMultiple', id, filenames),
  uploadMod: (id: string, filePath?: string | string[]): Promise<boolean> =>
    ipcRenderer.invoke('mods:upload', id, filePath),
  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return (file as any).path || '';
    }
  },
  searchModrinth: (
    query: string,
    loader: string,
    version: string,
    type: 'mod' | 'plugin'
  ): Promise<ModrinthHit[]> =>
    ipcRenderer.invoke('mods:searchModrinth', query, loader, version, type),
  installModrinthProject: (
    serverId: string,
    projectId: string,
    versionId?: string
  ): Promise<{ success: boolean; filename?: string; error?: string }> =>
    ipcRenderer.invoke('mods:installModrinth', serverId, projectId, versionId),

  // Network & System
  getSystemInfo: (): Promise<SystemInfo> => ipcRenderer.invoke('system:getInfo'),
  getPlayitStatus: (): Promise<PlayitStatus> =>
    ipcRenderer.invoke('playit:getStatus'),
  startPlayit: (port: number): Promise<boolean> =>
    ipcRenderer.invoke('playit:start', port),
  stopPlayit: (): Promise<boolean> => ipcRenderer.invoke('playit:stop'),
  onPlayitStatus: (callback: (status: PlayitStatus) => void) => {
    const handler = (_: any, status: PlayitStatus) => callback(status);
    ipcRenderer.on('playit:status', handler);
    return () => ipcRenderer.removeListener('playit:status', handler);
  },

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
});

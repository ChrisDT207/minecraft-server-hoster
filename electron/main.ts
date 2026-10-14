import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { ServerManager } from './services/serverManager';
import { VersionFetcher } from './services/versionFetcher';
import { ModrinthService } from './services/modrinthService';
import { PlayitRunner } from './services/playitRunner';
import { detectJavaInstallations } from './services/javaDetector';
import { ServerConfig, ServerEdition, ServerLoader } from './types';

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function getNetworkIps(): { localIp: string; radminIp?: string } {
  const interfaces = os.networkInterfaces();
  let localIp = '127.0.0.1';
  let radminIp: string | undefined = undefined;

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        // Detect Radmin VPN (standard 26.x.x.x block or interface name)
        if (net.address.startsWith('26.') || name.toLowerCase().includes('radmin')) {
          radminIp = net.address;
        } else if (
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.') ||
          net.address.startsWith('172.')
        ) {
          localIp = net.address;
        } else if (localIp === '127.0.0.1') {
          localIp = net.address;
        }
      }
    }
  }

  return { localIp, radminIp };
}

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    frame: false, // Frameless for modern custom titlebar
    backgroundColor: '#0c0e14',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Wire ServerManager events to renderer
  const serverManager = ServerManager.getInstance();
  serverManager.setEventCallbacks({
    onConsole: (serverId, text) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server:console', { serverId, text });
      }
    },
    onStatus: (serverId, status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server:status', { serverId, status });
      }
    },
    onStats: (serverId, stats) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server:stats', { serverId, stats });
      }
    },
  });

  // Wire Playit events
  const playit = PlayitRunner.getInstance();
  playit.setStatusListener((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('playit:status', status);
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // In production or built renderer
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------- IPC HANDLERS ---------------- //

function registerIpcHandlers() {
  const serverManager = ServerManager.getInstance();
  const playit = PlayitRunner.getInstance();

  // Server Management
  ipcMain.handle('server:getAll', () => serverManager.getServers());
  ipcMain.handle('server:get', (_, id: string) => serverManager.getServer(id));
  ipcMain.handle(
    'server:create',
    async (_, config: Omit<ServerConfig, 'createdAt' | 'serverDir'>) => {
      return await serverManager.createServer(config);
    }
  );
  ipcMain.handle(
    'server:delete',
    (_, id: string, deleteFiles: boolean) => {
      return serverManager.deleteServer(id, deleteFiles);
    }
  );
  ipcMain.handle('server:openFolder', async (_, id: string) => {
    const s = serverManager.getServer(id);
    if (s && s.serverDir) {
      await shell.openPath(s.serverDir);
    }
  });

  // Server Lifecycle
  ipcMain.handle('server:start', (_, id: string) => serverManager.startServer(id));
  ipcMain.handle('server:stop', (_, id: string) => serverManager.stopServer(id));
  ipcMain.handle('server:restart', (_, id: string) => serverManager.restartServer(id));
  ipcMain.handle('server:sendCommand', (_, id: string, cmd: string) =>
    serverManager.sendCommand(id, cmd)
  );
  ipcMain.handle('server:getStatus', (_, id: string) => serverManager.getStatus(id));

  // Versions
  ipcMain.handle(
    'versions:getMinecraft',
    (_, edition: ServerEdition, loader: ServerLoader) =>
      VersionFetcher.fetchMinecraftVersions(edition, loader)
  );
  ipcMain.handle(
    'versions:getLoaders',
    (_, loader: ServerLoader, gameVersion: string) =>
      VersionFetcher.fetchLoaderVersions(loader, gameVersion)
  );

  // Properties
  ipcMain.handle('properties:get', (_, id: string) =>
    serverManager.getServerProperties(id)
  );
  ipcMain.handle(
    'properties:save',
    (_, id: string, properties: Record<string, string>) =>
      serverManager.saveServerProperties(id, properties)
  );

  // Mods & Plugins
  ipcMain.handle('mods:list', (_, id: string) => {
    const s = serverManager.getServer(id);
    if (!s) return [];
    return ModrinthService.listInstalled(s);
  });
  ipcMain.handle('mods:toggle', (_, id: string, filename: string, enable: boolean) => {
    const s = serverManager.getServer(id);
    if (!s) return false;
    return ModrinthService.toggleMod(s, filename, enable);
  });
  ipcMain.handle('mods:delete', (_, id: string, filename: string) => {
    const s = serverManager.getServer(id);
    if (!s) return false;
    return ModrinthService.deleteMod(s, filename);
  });
  ipcMain.handle('mods:deleteMultiple', (_, id: string, filenames: string[]) => {
    const s = serverManager.getServer(id);
    if (!s) return false;
    return ModrinthService.deleteMultiple(s, filenames);
  });
  ipcMain.handle('mods:upload', async (_, id: string, filePaths?: string | string[]) => {
    const s = serverManager.getServer(id);
    if (!s) return false;

    // Handle dragged & dropped or directly provided paths
    if (filePaths) {
      const paths = (Array.isArray(filePaths) ? filePaths : [filePaths]).filter(Boolean);
      if (paths.length > 0) {
        let uploaded = 0;
        for (const p of paths) {
          if (ModrinthService.uploadMod(s, p)) {
            uploaded++;
          }
        }
        return uploaded > 0;
      }
    }

    if (!mainWindow) return false;

    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Mod or Plugin .jar / .mcpack',
      filters: [
        { name: 'Minecraft Packages', extensions: ['jar', 'mcpack', 'zip'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });

    if (!res.canceled && res.filePaths.length > 0) {
      for (const p of res.filePaths) {
        ModrinthService.uploadMod(s, p);
      }
      return true;
    }
    return false;
  });
  ipcMain.handle(
    'mods:searchModrinth',
    (_, query: string, loader: string, version: string, type: 'mod' | 'plugin') => {
      return ModrinthService.searchProjects(query, loader, version, type);
    }
  );
  ipcMain.handle(
    'mods:installModrinth',
    (_, serverId: string, projectId: string, versionId?: string) => {
      const s = serverManager.getServer(serverId);
      if (!s) return { success: false, error: 'Server not found' };
      return ModrinthService.installProject(s, projectId, versionId);
    }
  );

  // System & Network
  ipcMain.handle('system:getInfo', () => {
    const cpus = os.cpus();
    const totalMem = Math.round(os.totalmem() / (1024 * 1024));
    const freeMem = Math.round(os.freemem() / (1024 * 1024));
    const detectedJava = detectJavaInstallations();

    const { localIp, radminIp } = getNetworkIps();

    return {
      totalMemoryMb: totalMem,
      freeMemoryMb: freeMem,
      cpuModel: cpus[0]?.model || 'Unknown CPU',
      cpuCores: cpus.length,
      localIp,
      radminIp,
      detectedJava,
    };
  });

  // Playit
  ipcMain.handle('playit:getStatus', () => playit.getStatus());
  ipcMain.handle('playit:start', (_, port: number) => playit.start(port));
  ipcMain.handle('playit:stop', () => playit.stop());

  // Window frame controls
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Stop playit on exit
  PlayitRunner.getInstance().stop();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

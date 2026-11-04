import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
import { ServerManager } from './serverManager';

export interface SingleplayerSave {
  name: string;
  folderName: string;
  path: string;
  lastModified: number;
  sizeMb: number;
}

export class WorldImporter {
  private static instance: WorldImporter;

  public static getInstance(): WorldImporter {
    if (!WorldImporter.instance) {
      WorldImporter.instance = new WorldImporter();
    }
    return WorldImporter.instance;
  }

  // Detect singleplayer worlds in common Minecraft launcher directories
  public detectSingleplayerSaves(): SingleplayerSave[] {
    const results: SingleplayerSave[] = [];
    const searchDirs: string[] = [];

    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    // 1. Official Minecraft launcher
    searchDirs.push(path.join(appData, '.minecraft', 'saves'));
    // 2. Prism / MultiMC / Modrinth / CurseForge common instance save locations
    searchDirs.push(path.join(appData, 'PrismLauncher', 'instances'));
    searchDirs.push(path.join(appData, 'com.modrinth.theseus', 'profiles'));
    searchDirs.push(path.join(localAppData, 'Programs', 'Modrinth App', 'profiles'));

    for (const baseDir of searchDirs) {
      if (!fs.existsSync(baseDir)) continue;
      try {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const fullPath = path.join(baseDir, entry.name);

          // Check if this directory itself is a world (has level.dat)
          const levelDat = path.join(fullPath, 'level.dat');
          if (fs.existsSync(levelDat)) {
            const stat = fs.statSync(fullPath);
            results.push({
              name: entry.name,
              folderName: entry.name,
              path: fullPath,
              lastModified: stat.mtimeMs,
              sizeMb: Math.round(this.getFolderSize(fullPath) / (1024 * 1024)),
            });
          } else {
            // Check if it's an instance that has a 'saves' subfolder
            const subSaves = path.join(fullPath, 'saves');
            if (fs.existsSync(subSaves)) {
              try {
                const subEntries = fs.readdirSync(subSaves, { withFileTypes: true });
                for (const sub of subEntries) {
                  if (sub.isDirectory() && fs.existsSync(path.join(subSaves, sub.name, 'level.dat'))) {
                    const sPath = path.join(subSaves, sub.name);
                    const stat = fs.statSync(sPath);
                    results.push({
                      name: `${entry.name} / ${sub.name}`,
                      folderName: sub.name,
                      path: sPath,
                      lastModified: stat.mtimeMs,
                      sizeMb: Math.round(this.getFolderSize(sPath) / (1024 * 1024)),
                    });
                  }
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('Failed to read saves directory:', baseDir, err);
      }
    }

    return results.sort((a, b) => b.lastModified - a.lastModified);
  }

  // Calculate folder size in bytes
  private getFolderSize(dirPath: string): number {
    let size = 0;
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const f of files) {
        const full = path.join(dirPath, f.name);
        if (f.isDirectory()) {
          size += this.getFolderSize(full);
        } else {
          size += fs.statSync(full).size;
        }
      }
    } catch {}
    return size;
  }

  // Find the directory containing level.dat
  private findWorldRoot(sourceDir: string): string | null {
    if (fs.existsSync(path.join(sourceDir, 'level.dat'))) {
      return sourceDir;
    }
    // Search one level deep
    try {
      const items = fs.readdirSync(sourceDir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          const sub = path.join(sourceDir, item.name);
          if (fs.existsSync(path.join(sub, 'level.dat'))) {
            return sub;
          }
        }
      }
    } catch {}
    return null;
  }

  // Import from an unzipped folder
  public async importFromFolder(
    serverId: string,
    sourceFolder: string,
    targetWorldName: string = 'world',
    backupExisting: boolean = true
  ): Promise<{ success: boolean; worldName: string; backupName?: string }> {
    const sm = ServerManager.getInstance();
    const server = sm.getServer(serverId);
    if (!server) throw new Error('Server not found');

    const worldRoot = this.findWorldRoot(sourceFolder);
    if (!worldRoot) {
      throw new Error('Selected folder does not appear to be a valid Minecraft world (missing level.dat).');
    }

    const cleanWorldName = targetWorldName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'world';
    const destWorldDir = path.join(server.serverDir, cleanWorldName);

    let backupName: string | undefined = undefined;

    // Handle backup if directory exists
    if (fs.existsSync(destWorldDir)) {
      if (backupExisting) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        backupName = `${cleanWorldName}_backup_${timestamp}`;
        const backupPath = path.join(server.serverDir, backupName);
        fs.renameSync(destWorldDir, backupPath);
      } else {
        fs.rmSync(destWorldDir, { recursive: true, force: true });
      }
    }

    // Recursively copy world files
    fs.cpSync(worldRoot, destWorldDir, { recursive: true });

    // Ensure session.lock is removed if present so server can acquire it cleanly
    const lockFile = path.join(destWorldDir, 'session.lock');
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
      } catch {}
    }

    // Update level-name in server.properties
    sm.saveServerProperties(serverId, { 'level-name': cleanWorldName });

    return { success: true, worldName: cleanWorldName, backupName };
  }

  // Import from a .zip file
  public async importFromZip(
    serverId: string,
    zipPath: string,
    targetWorldName: string = 'world',
    backupExisting: boolean = true
  ): Promise<{ success: boolean; worldName: string; backupName?: string }> {
    if (!fs.existsSync(zipPath)) throw new Error('ZIP file not found.');

    const tempExtractDir = path.join(os.tmpdir(), `mcfg_world_${Date.now()}`);
    fs.mkdirSync(tempExtractDir, { recursive: true });

    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tempExtractDir, true);

      const res = await this.importFromFolder(serverId, tempExtractDir, targetWorldName, backupExisting);
      return res;
    } finally {
      // Clean up temp extraction folder
      try {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

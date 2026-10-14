import * as fs from 'fs';
import * as path from 'path';
import { ModItem, ModrinthHit, ServerConfig } from '../types';
import { VersionFetcher } from './versionFetcher';

export class ModrinthService {
  // Search Modrinth projects
  public static async searchProjects(
    query: string,
    loader: string,
    version: string,
    type: 'mod' | 'plugin'
  ): Promise<ModrinthHit[]> {
    try {
      const url = new URL('https://api.modrinth.com/v2/search');
      url.searchParams.set('query', query || '');
      url.searchParams.set('limit', '20');

      const facets: string[][] = [];

      if (type === 'plugin') {
        facets.push(['project_type:plugin']);
        if (loader === 'paper') {
          facets.push(['categories:paper', 'categories:spigot', 'categories:bukkit']);
        }
      } else {
        facets.push(['project_type:mod']);
        if (loader && loader !== 'vanilla') {
          facets.push([`categories:${loader}`]);
        }
      }

      if (version) {
        facets.push([`versions:${version}`]);
      }

      url.searchParams.set('facets', JSON.stringify(facets));

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'MC-ForgeDesk/1.0.0 (Windows Desktop Client)',
        },
      });

      if (!res.ok) {
        throw new Error(`Modrinth search failed: ${res.statusText}`);
      }

      const data: any = await res.json();
      return (data.hits || []).map((h: any) => ({
        project_id: h.project_id,
        title: h.title,
        description: h.description,
        categories: h.categories || [],
        icon_url: h.icon_url,
        author: h.author,
        downloads: h.downloads || 0,
        follows: h.follows || 0,
        project_type: h.project_type,
        date_modified: h.date_modified,
      }));
    } catch (err) {
      console.error('Error querying Modrinth:', err);
      return [];
    }
  }

  // Get mods/plugins directory for server
  public static getTargetDir(config: ServerConfig): string {
    const isPlugin = config.loader === 'paper';
    const folderName = isPlugin ? 'plugins' : 'mods';
    const dir = path.join(config.serverDir, folderName);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // List installed mods/plugins
  public static listInstalled(config: ServerConfig): ModItem[] {
    const targetDir = this.getTargetDir(config);
    if (!fs.existsSync(targetDir)) return [];

    const files = fs.readdirSync(targetDir);
    const items: ModItem[] = [];

    for (const f of files) {
      const fullPath = path.join(targetDir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) continue;

      const isJar = f.endsWith('.jar');
      const isDisabled = f.endsWith('.jar.disabled') || f.endsWith('.disabled');
      if (!isJar && !isDisabled) continue;

      const baseName = f.replace(/\.disabled$/, '');

      items.push({
        filename: f,
        name: baseName,
        enabled: isJar,
        size: stat.size,
        path: fullPath,
        modifiedAt: stat.mtimeMs,
      });
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Toggle mod enabled/disabled
  public static toggleMod(config: ServerConfig, filename: string, enable: boolean): boolean {
    const targetDir = this.getTargetDir(config);
    const currentPath = path.join(targetDir, filename);
    if (!fs.existsSync(currentPath)) return false;

    let newFilename = filename;
    if (enable && filename.endsWith('.disabled')) {
      newFilename = filename.replace(/\.disabled$/, '');
    } else if (!enable && !filename.endsWith('.disabled')) {
      newFilename = `${filename}.disabled`;
    }

    if (newFilename !== filename) {
      const newPath = path.join(targetDir, newFilename);
      fs.renameSync(currentPath, newPath);
      return true;
    }
    return false;
  }

  // Delete mod
  public static deleteMod(config: ServerConfig, filename: string): boolean {
    const targetDir = this.getTargetDir(config);
    const fullPath = path.join(targetDir, filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  // Delete multiple mods
  public static deleteMultiple(config: ServerConfig, filenames: string[]): boolean {
    const targetDir = this.getTargetDir(config);
    let count = 0;
    for (const filename of filenames) {
      const fullPath = path.join(targetDir, filename);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          count++;
        } catch {}
      }
    }
    return count > 0;
  }

  // Upload/copy mod jar to target directory
  public static uploadMod(config: ServerConfig, sourcePath: string): boolean {
    if (!fs.existsSync(sourcePath)) return false;
    const targetDir = this.getTargetDir(config);
    const destName = path.basename(sourcePath);
    const destPath = path.join(targetDir, destName);
    fs.copyFileSync(sourcePath, destPath);
    return true;
  }

  // 1-Click Install project from Modrinth
  public static async installProject(
    config: ServerConfig,
    projectId: string,
    versionId?: string
  ): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
      const targetDir = this.getTargetDir(config);
      let downloadUrl = '';
      let filename = '';

      if (versionId) {
        const res = await fetch(`https://api.modrinth.com/v2/version/${versionId}`);
        if (!res.ok) throw new Error('Failed to fetch specific version from Modrinth');
        const verData: any = await res.json();
        const file = verData.files?.[0];
        if (!file?.url) throw new Error('No files found for this version');
        downloadUrl = file.url;
        filename = file.filename;
      } else {
        // Query project versions matching server loader & version
        const url = new URL(`https://api.modrinth.com/v2/project/${projectId}/version`);
        const loaders =
          config.loader === 'paper'
            ? ['paper', 'spigot', 'bukkit']
            : [config.loader];
        url.searchParams.set('loaders', JSON.stringify(loaders));
        url.searchParams.set('game_versions', JSON.stringify([config.version]));

        const res = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'MC-ForgeDesk/1.0.0 (Windows Desktop Client)',
          },
        });

        if (!res.ok) throw new Error('Failed to fetch project versions');
        const versions: any = await res.json();

        let chosenFile = null;
        if (Array.isArray(versions) && versions.length > 0) {
          chosenFile = versions[0].files?.[0];
        } else {
          // Fallback to any latest version of project
          const allRes = await fetch(
            `https://api.modrinth.com/v2/project/${projectId}/version`
          );
          if (allRes.ok) {
            const allVer: any = await allRes.json();
            chosenFile = allVer[0]?.files?.[0];
          }
        }

        if (!chosenFile?.url) {
          throw new Error('No compatible files found for this project and server version');
        }

        downloadUrl = chosenFile.url;
        filename = chosenFile.filename;
      }

      const destPath = path.join(targetDir, filename);
      await VersionFetcher.downloadFile(downloadUrl, destPath);

      return { success: true, filename };
    } catch (err: any) {
      console.error('Failed to install project from Modrinth:', err);
      return { success: false, error: err.message || 'Unknown error' };
    }
  }
}

import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import AdmZip from 'adm-zip';
import { VersionOption, LoaderVersionOption, ServerEdition, ServerLoader } from '../types';

interface MojangManifestVersion {
  id: string;
  type: 'release' | 'snapshot';
  url: string;
  time: string;
  releaseTime: string;
}

interface MojangManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MojangManifestVersion[];
}

export class VersionFetcher {
  private static mojangManifestCache: MojangManifest | null = null;
  private static mojangCacheTime = 0;

  // 1. Fetch Mojang Manifest
  public static async getMojangManifest(): Promise<MojangManifest> {
    const now = Date.now();
    if (this.mojangManifestCache && now - this.mojangCacheTime < 1000 * 60 * 15) {
      return this.mojangManifestCache;
    }

    const res = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
    if (!res.ok) throw new Error(`Failed to fetch Mojang manifest: ${res.statusText}`);
    const data = (await res.json()) as MojangManifest;
    this.mojangManifestCache = data;
    this.mojangCacheTime = now;
    return data;
  }

  // 2. Fetch Versions for Edition / Loader
  public static async fetchMinecraftVersions(
    edition: ServerEdition,
    loader: ServerLoader
  ): Promise<VersionOption[]> {
    if (edition === 'bedrock') {
      return this.fetchBedrockVersions();
    }

    if (loader === 'paper') {
      return this.fetchPaperVersions();
    }

    if (loader === 'fabric') {
      return this.fetchFabricGameVersions();
    }

    if (loader === 'forge') {
      return this.fetchForgeGameVersions();
    }

    if (loader === 'neoforge') {
      return this.fetchNeoForgeGameVersions();
    }

    // Default Vanilla
    const manifest = await this.getMojangManifest();
    return manifest.versions.map((v) => ({
      id: v.id,
      type: v.type,
      releaseTime: v.releaseTime,
      url: v.url,
    }));
  }

  // 2a. Paper versions
  private static async fetchPaperVersions(): Promise<VersionOption[]> {
    try {
      // Use modern fill.papermc.io API
      const res = await fetch('https://fill.papermc.io/v3/projects/paper');
      if (res.ok) {
        const data: any = await res.json();
        const list: VersionOption[] = [];
        if (data.versions) {
          const versionGroups = Object.keys(data.versions);
          for (const grp of versionGroups) {
            const arr = data.versions[grp];
            if (Array.isArray(arr)) {
              for (const v of arr) {
                list.push({
                  id: v,
                  type: v.includes('-') ? 'snapshot' : 'release',
                });
              }
            }
          }
        }
        if (list.length > 0) return list;
      }
    } catch {
      // Fallback
    }

    // Fallback to Mojang list filtered to Paper-supported releases (1.8 - latest)
    const manifest = await this.getMojangManifest();
    return manifest.versions
      .filter((v) => v.type === 'release')
      .map((v) => ({
        id: v.id,
        type: 'release',
        releaseTime: v.releaseTime,
      }));
  }

  // 2b. Fabric game versions
  private static async fetchFabricGameVersions(): Promise<VersionOption[]> {
    try {
      const res = await fetch('https://meta.fabricmc.net/v2/versions/game');
      if (res.ok) {
        const data = (await res.json()) as { version: string; stable: boolean }[];
        return data.map((d) => ({
          id: d.version,
          type: d.stable ? 'release' : 'snapshot',
        }));
      }
    } catch {
      // Fallback
    }
    const manifest = await this.getMojangManifest();
    return manifest.versions.map((v) => ({
      id: v.id,
      type: v.type,
      releaseTime: v.releaseTime,
    }));
  }

  // 2c. Forge game versions
  private static async fetchForgeGameVersions(): Promise<VersionOption[]> {
    try {
      const res = await fetch(
        'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json'
      );
      if (res.ok) {
        const data: any = await res.json();
        const promos = data.promos || {};
        const versions = new Set<string>();
        for (const key of Object.keys(promos)) {
          const mc = key.replace(/-(latest|recommended)$/, '');
          if (mc) versions.add(mc);
        }
        return Array.from(versions)
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
          .map((v) => ({ id: v, type: 'release' }));
      }
    } catch {
      // Fallback
    }
    const manifest = await this.getMojangManifest();
    return manifest.versions
      .filter((v) => v.type === 'release')
      .map((v) => ({ id: v.id, type: 'release' }));
  }

  // 2d. NeoForge game versions
  private static async fetchNeoForgeGameVersions(): Promise<VersionOption[]> {
    try {
      const res = await fetch(
        'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge'
      );
      if (res.ok) {
        const data: any = await res.json();
        const versions: string[] = data.versions || [];
        const mcSet = new Set<string>();

        // NeoForge versioning: e.g. 20.4.x => MC 1.20.4, 21.0.x => MC 1.21.0, 21.1.x => MC 1.21.1, etc.
        for (const nfVer of versions) {
          const match = nfVer.match(/^(\d+)\.(\d+)/);
          if (match) {
            const major = match[1];
            const minor = match[2];
            mcSet.add(`1.${major}.${minor}`);
            mcSet.add(`1.${major}`);
          }
        }

        const sorted = Array.from(mcSet).sort((a, b) =>
          b.localeCompare(a, undefined, { numeric: true })
        );
        if (sorted.length > 0) {
          return sorted.map((v) => ({ id: v, type: 'release' }));
        }
      }
    } catch {
      // Fallback
    }
    const manifest = await this.getMojangManifest();
    return manifest.versions
      .filter((v) => v.type === 'release' && !v.id.startsWith('1.1') && !v.id.startsWith('1.20.1'))
      .map((v) => ({ id: v.id, type: 'release' }));
  }

  // 2e. Bedrock versions
  private static async fetchBedrockVersions(): Promise<VersionOption[]> {
    try {
      const res = await fetch(
        'https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main/versions.json'
      );
      if (res.ok) {
        const data: any = await res.json();
        const winVersions: string[] = data.windows?.versions || [];
        const winPreview: string[] = data.windows?.preview_versions || [];

        const list: VersionOption[] = [];
        const seen = new Set<string>();

        // Reverse to show latest first
        for (let i = winVersions.length - 1; i >= 0; i--) {
          const v = winVersions[i];
          if (!seen.has(v)) {
            seen.add(v);
            list.push({ id: v, type: 'release' });
          }
        }
        for (let i = winPreview.length - 1; i >= 0; i--) {
          const v = winPreview[i];
          if (!seen.has(v)) {
            seen.add(v);
            list.push({ id: v, type: 'snapshot' });
          }
        }
        if (list.length > 0) return list;
      }
    } catch {
      // Fallback
    }

    return [
      { id: '1.26.52.3', type: 'release' },
      { id: '1.21.60.25', type: 'release' },
      { id: '1.21.50.29', type: 'release' },
      { id: '1.21.40.25', type: 'release' },
      { id: '1.20.80.24', type: 'release' },
    ];
  }

  // 3. Fetch Loader Versions (Fabric loader, Forge build, NeoForge build)
  public static async fetchLoaderVersions(
    loader: ServerLoader,
    gameVersion: string
  ): Promise<LoaderVersionOption[]> {
    if (loader === 'fabric') {
      try {
        const res = await fetch('https://meta.fabricmc.net/v2/versions/loader');
        if (res.ok) {
          const data = (await res.json()) as { version: string; stable: boolean }[];
          return data.map((d) => ({ version: d.version, stable: d.stable }));
        }
      } catch {
        // Fallback
      }
      return [{ version: '0.16.9', stable: true }, { version: '0.16.5', stable: true }];
    }

    if (loader === 'forge') {
      try {
        const res = await fetch(
          'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json'
        );
        if (res.ok) {
          const data: any = await res.json();
          const promos = data.promos || {};
          const rec = promos[`${gameVersion}-recommended`];
          const latest = promos[`${gameVersion}-latest`];
          const options: LoaderVersionOption[] = [];
          if (rec) options.push({ version: rec, stable: true });
          if (latest && latest !== rec) options.push({ version: latest, stable: false });
          if (options.length > 0) return options;
        }
      } catch {
        // Fallback
      }
      return [{ version: 'latest', stable: true }];
    }

    if (loader === 'neoforge') {
      try {
        const res = await fetch(
          'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge'
        );
        if (res.ok) {
          const data: any = await res.json();
          const allVers: string[] = data.versions || [];
          // Filter matching MC version prefix
          const shortMc = gameVersion.replace(/^1\./, ''); // e.g. "21.4"
          const matching = allVers
            .filter((v) => v.startsWith(shortMc) || v.startsWith(gameVersion))
            .reverse();
          if (matching.length > 0) {
            return matching.map((v) => ({
              version: v,
              stable: !v.includes('beta') && !v.includes('rc'),
            }));
          }
          // Return latest 10
          return allVers
            .slice(-10)
            .reverse()
            .map((v) => ({
              version: v,
              stable: !v.includes('beta'),
            }));
        }
      } catch {
        // Fallback
      }
      return [{ version: 'latest', stable: true }];
    }

    return [];
  }

  // 4. Download file with progress callback
  public static async downloadFile(
    url: string,
    destPath: string,
    onProgress?: (percent: number, loaded: number, total: number) => void
  ): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);

    const total = parseInt(res.headers.get('content-length') || '0', 10);
    let loaded = 0;

    const fileStream = createWriteStream(destPath);
    if (!res.body) throw new Error('Response body is null');

    const reader = res.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        fileStream.write(Buffer.from(value));
        loaded += value.length;
        if (total > 0 && onProgress) {
          const percent = Math.min(100, Math.round((loaded / total) * 100));
          onProgress(percent, loaded, total);
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      fileStream.end((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // 5. Provision server files for chosen edition & loader
  public static async provisionServer(
    serverDir: string,
    edition: ServerEdition,
    loader: ServerLoader,
    gameVersion: string,
    loaderVersion?: string,
    onStatus?: (text: string) => void
  ): Promise<string> {
    fs.mkdirSync(serverDir, { recursive: true });

    if (edition === 'bedrock') {
      onStatus?.(`Downloading Bedrock Dedicated Server (${gameVersion})...`);
      const zipUrl = `https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-${gameVersion}.zip`;
      const tempZip = path.join(serverDir, 'bds_temp.zip');
      try {
        await this.downloadFile(zipUrl, tempZip);
      } catch (err) {
        // Fallback to direct azureedge url
        const altUrl = `https://minecraft.azureedge.net/bin-win/bedrock-server-${gameVersion}.zip`;
        onStatus?.(`Trying CDN fallback...`);
        await this.downloadFile(altUrl, tempZip);
      }

      onStatus?.('Extracting Bedrock server files...');
      const zip = new AdmZip(tempZip);
      zip.extractAllTo(serverDir, true);
      fs.unlinkSync(tempZip);
      onStatus?.('Bedrock server files ready.');
      return path.join(serverDir, 'bedrock_server.exe');
    }

    // Java Vanilla
    if (loader === 'vanilla') {
      onStatus?.(`Resolving Vanilla ${gameVersion} server manifest...`);
      const manifest = await this.getMojangManifest();
      const verObj = manifest.versions.find((v) => v.id === gameVersion);
      if (!verObj) throw new Error(`Version ${gameVersion} not found in Mojang manifest`);

      const vRes = await fetch(verObj.url);
      const vData: any = await vRes.json();
      const serverUrl = vData.downloads?.server?.url;
      if (!serverUrl) throw new Error(`No server jar download available for ${gameVersion}`);

      const targetJar = path.join(serverDir, 'server.jar');
      onStatus?.(`Downloading server.jar (${gameVersion})...`);
      await this.downloadFile(serverUrl, targetJar);
      onStatus?.('Vanilla server ready.');
      return targetJar;
    }

    // Java Paper
    if (loader === 'paper') {
      onStatus?.(`Resolving Paper ${gameVersion} builds...`);
      let downloadUrl = '';
      let jarName = 'paper.jar';

      try {
        const buildRes = await fetch(
          `https://fill.papermc.io/v3/projects/paper/versions/${gameVersion}`
        );
        if (buildRes.ok) {
          const buildData: any = await buildRes.json();
          const builds = buildData.builds;
          if (Array.isArray(builds) && builds.length > 0) {
            const latestBuild = builds[0];
            const detailRes = await fetch(
              `https://fill.papermc.io/v3/projects/paper/versions/${gameVersion}/builds/${latestBuild}`
            );
            if (detailRes.ok) {
              const detail: any = await detailRes.json();
              const def = detail.downloads?.['server:default'];
              if (def?.url) {
                downloadUrl = def.url;
                jarName = def.name || `paper-${gameVersion}-${latestBuild}.jar`;
              }
            }
          }
        }
      } catch {
        // Fallback
      }

      if (!downloadUrl) {
        // Fallback PaperMC download pattern
        downloadUrl = `https://api.papermc.io/v2/projects/paper/versions/${gameVersion}/builds/latest/downloads/paper-${gameVersion}.jar`;
      }

      const targetJar = path.join(serverDir, 'server.jar');
      onStatus?.(`Downloading Paper server jar...`);
      await this.downloadFile(downloadUrl, targetJar);
      onStatus?.('Paper server ready.');
      return targetJar;
    }

    // Java Fabric
    if (loader === 'fabric') {
      const lVer = loaderVersion || '0.16.9';
      const instVer = '1.0.1';
      onStatus?.(`Fetching Fabric server jar (Loader: ${lVer}, Game: ${gameVersion})...`);
      const fabricJarUrl = `https://meta.fabricmc.net/v2/versions/loader/${gameVersion}/${lVer}/${instVer}/server/jar`;

      const targetJar = path.join(serverDir, 'fabric-server-launch.jar');
      await this.downloadFile(fabricJarUrl, targetJar);
      onStatus?.('Fabric server ready.');
      return targetJar;
    }

    // Java Forge
    if (loader === 'forge') {
      const forgeVer = loaderVersion || 'latest';
      onStatus?.(`Resolving Forge installer for ${gameVersion}...`);
      const installerJar = path.join(serverDir, 'forge-installer.jar');
      const downloadUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${gameVersion}-${forgeVer}/forge-${gameVersion}-${forgeVer}-installer.jar`;

      await this.downloadFile(downloadUrl, installerJar);
      onStatus?.('Forge installer downloaded.');
      return installerJar;
    }

    // Java NeoForge
    if (loader === 'neoforge') {
      const nfVer = loaderVersion || 'latest';
      onStatus?.(`Resolving NeoForge installer for ${gameVersion} (${nfVer})...`);
      const installerJar = path.join(serverDir, 'neoforge-installer.jar');
      const downloadUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${nfVer}/neoforge-${nfVer}-installer.jar`;

      await this.downloadFile(downloadUrl, installerJar);
      onStatus?.('NeoForge installer downloaded.');
      return installerJar;
    }

    throw new Error(`Unsupported loader/edition: ${edition}/${loader}`);
  }

  // 6. Download SkinRestorer for offline/TLauncher skins
  public static async installSkinRestorer(
    serverDir: string,
    isPlugin: boolean,
    onStatus?: (text: string) => void
  ): Promise<void> {
    try {
      onStatus?.('Downloading SkinRestorer for offline skin support...');
      const res = await fetch('https://api.modrinth.com/v2/project/skinrestorer/version');
      if (!res.ok) return;
      const versions = await res.json();
      if (!Array.isArray(versions) || versions.length === 0) return;

      const file = versions[0].files?.[0];
      if (!file?.url) return;

      const targetDir = isPlugin
        ? path.join(serverDir, 'plugins')
        : path.join(serverDir, 'mods');
      fs.mkdirSync(targetDir, { recursive: true });

      const dest = path.join(targetDir, file.filename || 'SkinRestorer.jar');
      await this.downloadFile(file.url, dest);
      onStatus?.('SkinRestorer installed successfully.');
    } catch (e) {
      console.error('Failed to install SkinRestorer:', e);
    }
  }
}

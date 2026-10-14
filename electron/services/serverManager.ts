import { ChildProcess, spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import pidusage from 'pidusage';
import { ServerConfig, ServerStatus, ServerStats } from '../types';
import { VersionFetcher } from './versionFetcher';
import {
  detectJavaInstallations,
  getRecommendedJava,
  getRequiredJavaMajor,
  ensureJavaRuntime,
} from './javaDetector';

interface ActiveProcess {
  process: ChildProcess;
  config: ServerConfig;
  status: ServerStatus;
  stopTimeout?: NodeJS.Timeout;
  startTime: number;
  playersOnline: number;
  maxPlayers: number;
}

export class ServerManager {
  private static instance: ServerManager;
  private activeProcesses: Map<string, ActiveProcess> = new Map();
  private statsInterval?: NodeJS.Timeout;

  private onConsoleCallback?: (serverId: string, text: string) => void;
  private onStatusCallback?: (serverId: string, status: ServerStatus) => void;
  private onStatsCallback?: (serverId: string, stats: ServerStats) => void;

  private constructor() {
    this.startStatsMonitor();
  }

  public static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  public setEventCallbacks(callbacks: {
    onConsole?: (serverId: string, text: string) => void;
    onStatus?: (serverId: string, status: ServerStatus) => void;
    onStats?: (serverId: string, stats: ServerStats) => void;
  }) {
    this.onConsoleCallback = callbacks.onConsole;
    this.onStatusCallback = callbacks.onStatus;
    this.onStatsCallback = callbacks.onStats;
  }

  public getBaseDir(): string {
    const dir = path.join(os.homedir(), 'MC-ForgeDesk', 'servers');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // 1. Get all saved servers
  public getServers(): ServerConfig[] {
    const baseDir = this.getBaseDir();
    const servers: ServerConfig[] = [];

    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(baseDir, entry.name, 'mcfg-server.json');
          if (fs.existsSync(configPath)) {
            try {
              const content = fs.readFileSync(configPath, 'utf8');
              const cfg = JSON.parse(content) as ServerConfig;
              cfg.serverDir = path.join(baseDir, entry.name);
              servers.push(cfg);
            } catch (err) {
              console.error(`Failed to parse config for ${entry.name}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to read servers directory:', err);
    }

    return servers.sort((a, b) => b.createdAt - a.createdAt);
  }

  // 2. Get single server
  public getServer(id: string): ServerConfig | null {
    const servers = this.getServers();
    return servers.find((s) => s.id === id) || null;
  }

  // 3. Create server
  public async createServer(
    data: Omit<ServerConfig, 'createdAt' | 'serverDir'>
  ): Promise<ServerConfig> {
    const baseDir = this.getBaseDir();
    const serverDir = path.join(baseDir, data.id);
    if (fs.existsSync(serverDir)) {
      throw new Error(`A server with ID "${data.id}" already exists.`);
    }

    fs.mkdirSync(serverDir, { recursive: true });

    const config: ServerConfig = {
      ...data,
      createdAt: Date.now(),
      serverDir,
    };

    // Auto-accept EULA if checked
    if (config.eulaAccepted && config.edition === 'java') {
      fs.writeFileSync(path.join(serverDir, 'eula.txt'), 'eula=true\n', 'utf8');
    }

    // Initialize server.properties
    this.initializeServerProperties(serverDir, config);

    // Save metadata
    fs.writeFileSync(
      path.join(serverDir, 'mcfg-server.json'),
      JSON.stringify(config, null, 2),
      'utf8'
    );

    // Provision files asynchronously or synchronously
    try {
      this.emitConsole(config.id, `§a[MC-ForgeDesk] Initializing provisioning for ${config.name} (${config.loader} ${config.version})...\n`);
      await VersionFetcher.provisionServer(
        serverDir,
        config.edition,
        config.loader,
        config.version,
        config.loaderVersion,
        (msg) => {
          this.emitConsole(config.id, `§b[Provisioning] ${msg}\n`);
        }
      );

      // Offline skin fix plugin if requested
      if (config.allowOffline && config.skinRestorer) {
        const isPlugin = config.loader === 'paper';
        await VersionFetcher.installSkinRestorer(serverDir, isPlugin, (msg) => {
          this.emitConsole(config.id, `§b[SkinRestorer] ${msg}\n`);
        });
      }

      this.emitConsole(config.id, `§a[MC-ForgeDesk] Server provisioning complete! Ready to launch.\n`);
    } catch (err: any) {
      this.emitConsole(config.id, `§c[MC-ForgeDesk Error] Provisioning failed: ${err.message}\n`);
      console.error('Provisioning error:', err);
    }

    return config;
  }

  // 4. Initialize server.properties
  private initializeServerProperties(serverDir: string, config: ServerConfig) {
    if (config.edition === 'bedrock') {
      const serverPropsPath = path.join(serverDir, 'server.properties');
      const content = [
        `server-name=${config.name}`,
        `gamemode=survival`,
        `difficulty=easy`,
        `allow-cheats=true`,
        `max-players=10`,
        `online-mode=${!config.allowOffline}`,
        `server-port=${config.port}`,
        `server-portv6=${config.port + 1}`,
        `view-distance=32`,
        `tick-distance=4`,
      ].join('\n');
      fs.writeFileSync(serverPropsPath, content, 'utf8');
      return;
    }

    const serverPropsPath = path.join(serverDir, 'server.properties');
    const defaultLines = [
      `#Minecraft server properties - Generated by MC-ForgeDesk`,
      `motd=${config.name}`,
      `server-port=${config.port}`,
      `online-mode=${!config.allowOffline}`,
      `difficulty=easy`,
      `gamemode=survival`,
      `pvp=true`,
      `max-players=20`,
      `spawn-protection=16`,
      `white-list=false`,
      `enable-command-block=true`,
      `view-distance=10`,
      `simulation-distance=10`,
    ];
    fs.writeFileSync(serverPropsPath, defaultLines.join('\n') + '\n', 'utf8');
  }

  // 5. Delete server
  public deleteServer(id: string, deleteFiles: boolean): boolean {
    const active = this.activeProcesses.get(id);
    if (active && active.status === 'running') {
      this.stopServer(id);
    }

    const cfg = this.getServer(id);
    if (!cfg) return false;

    if (deleteFiles && fs.existsSync(cfg.serverDir)) {
      try {
        fs.rmSync(cfg.serverDir, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to delete server files at ${cfg.serverDir}:`, err);
      }
    } else {
      // Just delete config
      const conf = path.join(cfg.serverDir, 'mcfg-server.json');
      if (fs.existsSync(conf)) fs.unlinkSync(conf);
    }

    return true;
  }

  // 6. Start server
  public async startServer(id: string): Promise<boolean> {
    const cfg = this.getServer(id);
    if (!cfg) throw new Error(`Server ${id} not found.`);

    let active = this.activeProcesses.get(id);
    if (active && (active.status === 'running' || active.status === 'starting')) {
      return true;
    }

    this.setStatus(id, 'starting');
    this.emitConsole(id, `§6[MC-ForgeDesk] Starting server: ${cfg.name} (Port: ${cfg.port})...\n`);

    try {
      let proc: ChildProcess;

      if (cfg.edition === 'bedrock') {
        const exePath = path.join(cfg.serverDir, 'bedrock_server.exe');
        if (!fs.existsSync(exePath)) {
          throw new Error('bedrock_server.exe not found in server directory. Please check provisioning.');
        }

        proc = spawn(exePath, [], {
          cwd: cfg.serverDir,
          windowsHide: true,
          env: { ...process.env },
        });
      } else {
        // Java edition
        // Auto-accept EULA if eulaAccepted
        if (cfg.eulaAccepted) {
          const eulaPath = path.join(cfg.serverDir, 'eula.txt');
          if (!fs.existsSync(eulaPath) || !fs.readFileSync(eulaPath, 'utf8').includes('eula=true')) {
            fs.writeFileSync(eulaPath, 'eula=true\n', 'utf8');
          }
        }

        let javaBin = cfg.javaPath;
        if (!javaBin) {
          const installed = detectJavaInstallations();
          javaBin = getRecommendedJava(installed, cfg.version);

          if (!javaBin) {
            const reqMajor = getRequiredJavaMajor(cfg.version);
            this.emitConsole(
              id,
              `§e[MC-ForgeDesk] Java ${reqMajor} is required for Minecraft ${cfg.version} but was not detected.\n`
            );
            this.emitConsole(
              id,
              `§b[MC-ForgeDesk] Automatically downloading portable OpenJDK Adoptium JRE ${reqMajor}...\n`
            );
            javaBin = await ensureJavaRuntime(reqMajor, (msg) => {
              this.emitConsole(id, `§7[Adoptium JRE] ${msg}\n`);
            });
            this.emitConsole(id, `§a[MC-ForgeDesk] Portable Java ${reqMajor} ready!\n`);
          }
        }

        // Locate executable jar
        let targetJar = '';
        const candidateJars = [
          path.join(cfg.serverDir, 'fabric-server-launch.jar'),
          path.join(cfg.serverDir, 'server.jar'),
          path.join(cfg.serverDir, 'paper.jar'),
        ];

        for (const c of candidateJars) {
          if (fs.existsSync(c)) {
            targetJar = c;
            break;
          }
        }

        // Forge / NeoForge check: run.bat / run.sh or installer check
        const runBat = path.join(cfg.serverDir, 'run.bat');
        const hasRunBat = fs.existsSync(runBat);

        if (!targetJar && !hasRunBat) {
          // Check for any jar in folder
          const files = fs.readdirSync(cfg.serverDir);
          const jar = files.find((f) => f.endsWith('.jar') && !f.includes('installer'));
          if (jar) targetJar = path.join(cfg.serverDir, jar);
        }

        // JVM arguments: clean high-performance flags
        const args: string[] = [
          `-Xms${cfg.minRam}M`,
          `-Xmx${cfg.maxRam}M`,
          '-XX:+UseG1GC',
          '-XX:+ParallelRefProcEnabled',
          '-XX:MaxGCPauseMillis=200',
        ];

        if (cfg.jvmArgs) {
          const custom = cfg.jvmArgs.split(/\s+/).filter(Boolean);
          args.push(...custom);
        }

        if (hasRunBat && (cfg.loader === 'forge' || cfg.loader === 'neoforge')) {
          this.emitConsole(id, `§e[MC-ForgeDesk] Executing Forge/NeoForge run.bat launcher...\n`);
          proc = spawn('cmd.exe', ['/c', 'run.bat'], {
            cwd: cfg.serverDir,
            windowsHide: true,
          });
        } else {
          if (!targetJar) {
            throw new Error(`Server jar not found in ${cfg.serverDir}. Server may still be provisioning.`);
          }
          args.push('-jar', path.basename(targetJar), 'nogui');
          this.emitConsole(id, `§e[MC-ForgeDesk] Executing: "${javaBin}" ${args.join(' ')}\n`);

          proc = spawn(javaBin, args, {
            cwd: cfg.serverDir,
            windowsHide: true,
          });
        }
      }

      const activeRecord: ActiveProcess = {
        process: proc,
        config: cfg,
        status: 'starting',
        startTime: Date.now(),
        playersOnline: 0,
        maxPlayers: 20,
      };

      this.activeProcesses.set(id, activeRecord);

      // Handle stdout
      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.emitConsole(id, text);
        this.parseConsoleOutput(activeRecord, text);
      });

      // Handle stderr
      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.emitConsole(id, text);
        this.parseConsoleOutput(activeRecord, text);
      });

      // Handle process exit
      proc.on('close', (code) => {
        this.emitConsole(id, `§e[MC-ForgeDesk] Server process exited with code ${code}.\n`);
        if (activeRecord.stopTimeout) clearTimeout(activeRecord.stopTimeout);
        this.activeProcesses.delete(id);
        this.setStatus(id, 'stopped');
        this.onStatsCallback?.(id, {
          cpuPercent: 0,
          memoryMb: 0,
          memoryMaxMb: activeRecord.config.maxRam,
          playersOnline: 0,
          maxPlayers: activeRecord.maxPlayers || 20,
          uptimeSeconds: 0,
        });
        try {
          pidusage.clear();
        } catch {}
      });

      proc.on('error', (err) => {
        this.emitConsole(id, `§c[MC-ForgeDesk] Process error: ${err.message}\n`);
        this.activeProcesses.delete(id);
        this.setStatus(id, 'error');
        this.onStatsCallback?.(id, {
          cpuPercent: 0,
          memoryMb: 0,
          memoryMaxMb: activeRecord.config.maxRam,
          playersOnline: 0,
          maxPlayers: activeRecord.maxPlayers || 20,
          uptimeSeconds: 0,
        });
        try {
          pidusage.clear();
        } catch {}
      });

      return true;
    } catch (err: any) {
      this.emitConsole(id, `§c[MC-ForgeDesk] Launch failed: ${err.message}\n`);
      this.setStatus(id, 'error');
      return false;
    }
  }

  // 7. Stop server gracefully with 30s fallback kill
  public async stopServer(id: string): Promise<boolean> {
    const active = this.activeProcesses.get(id);
    if (!active) return false;

    this.setStatus(id, 'stopping');
    this.emitConsole(id, `§e[MC-ForgeDesk] Sending graceful stop command...\n`);

    try {
      if (active.process.stdin && !active.process.stdin.destroyed) {
        active.process.stdin.write('stop\n');
      }
    } catch {
      // Stdin write error
    }

    // Set 30s fallback kill timeout
    active.stopTimeout = setTimeout(() => {
      this.emitConsole(id, `§c[MC-ForgeDesk] Graceful stop timed out after 30s. Force terminating process...\n`);
      try {
        if (active.process.pid) {
          exec(`taskkill /F /T /PID ${active.process.pid}`);
        } else {
          active.process.kill();
        }
      } catch {
        try {
          active.process.kill('SIGKILL');
        } catch {}
      }
    }, 30000);

    return true;
  }

  // 8. Restart server
  public async restartServer(id: string): Promise<boolean> {
    await this.stopServer(id);
    // Poll until stopped, then start
    const interval = setInterval(async () => {
      const active = this.activeProcesses.get(id);
      if (!active) {
        clearInterval(interval);
        await this.startServer(id);
      }
    }, 1000);
    return true;
  }

  // 9. Send console command
  public sendCommand(id: string, command: string): boolean {
    const active = this.activeProcesses.get(id);
    if (!active || !active.process.stdin || active.process.stdin.destroyed) {
      return false;
    }

    const clean = command.trim().replace(/^\//, ''); // Strip leading slash
    this.emitConsole(id, `§7> /${clean}\n`);
    active.process.stdin.write(`${clean}\n`);
    return true;
  }

  // 10. Status
  public getStatus(id: string): ServerStatus {
    const active = this.activeProcesses.get(id);
    return active ? active.status : 'stopped';
  }

  private setStatus(id: string, status: ServerStatus) {
    const active = this.activeProcesses.get(id);
    if (active) active.status = status;
    this.onStatusCallback?.(id, status);
  }

  private emitConsole(serverId: string, text: string) {
    this.onConsoleCallback?.(serverId, text);
  }

  // Parse console text to detect server readiness and player count
  private parseConsoleOutput(active: ActiveProcess, text: string) {
    // Detect server ready: e.g. "Done (12.345s)! For help, type "help""
    if (/Done\s+\([0-9.]+s\)!/i.test(text) || /Server started\./i.test(text)) {
      if (active.status !== 'running') {
        active.status = 'running';
        this.setStatus(active.config.id, 'running');
        this.emitConsole(active.config.id, `§a[MC-ForgeDesk] Server is now ONLINE and ready for players!\n`);
      }
    }

    // Detect player join
    const joinMatch = text.match(/([a-zA-Z0-9_]{3,16})\s+joined the game/i);
    if (joinMatch) {
      active.playersOnline = Math.max(0, active.playersOnline + 1);
    }

    // Detect player leave
    const leaveMatch = text.match(/([a-zA-Z0-9_]{3,16})\s+left the game/i);
    if (leaveMatch) {
      active.playersOnline = Math.max(0, active.playersOnline - 1);
    }

    // Bedrock player count
    if (/Player connected:/i.test(text)) {
      active.playersOnline = Math.max(0, active.playersOnline + 1);
    }
    if (/Player disconnected:/i.test(text)) {
      active.playersOnline = Math.max(0, active.playersOnline - 1);
    }
  }

  // 11. Monitor memory & CPU stats
  private startStatsMonitor() {
    this.statsInterval = setInterval(() => {
      for (const [id, active] of this.activeProcesses.entries()) {
        const pid = active.process.pid;
        if (!pid) continue;

        const uptime = Math.floor((Date.now() - active.startTime) / 1000);

        pidusage(pid, (err, stats) => {
          if (err || !stats) {
            return;
          }

          const memMb = Math.round(stats.memory / (1024 * 1024));
          const cpu = Math.min(100, Math.max(0, Math.round(stats.cpu)));

          const serverStats: ServerStats = {
            cpuPercent: cpu,
            memoryMb: memMb,
            memoryMaxMb: active.config.maxRam,
            playersOnline: active.playersOnline,
            maxPlayers: active.maxPlayers || 20,
            uptimeSeconds: uptime,
          };

          this.onStatsCallback?.(id, serverStats);
        });
      }
    }, 1500);
  }

  // 12. Read server.properties
  public getServerProperties(id: string): Record<string, string> {
    const cfg = this.getServer(id);
    if (!cfg) return {};

    const propsPath = path.join(cfg.serverDir, 'server.properties');
    if (!fs.existsSync(propsPath)) return {};

    const content = fs.readFileSync(propsPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const result: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        result[key] = val;
      }
    }

    return result;
  }

  // 13. Save server.properties
  public saveServerProperties(id: string, properties: Record<string, string>): boolean {
    const cfg = this.getServer(id);
    if (!cfg) return false;

    const propsPath = path.join(cfg.serverDir, 'server.properties');
    let existingLines: string[] = [];
    if (fs.existsSync(propsPath)) {
      existingLines = fs.readFileSync(propsPath, 'utf8').split(/\r?\n/);
    }

    const updatedKeys = new Set(Object.keys(properties));
    const newLines: string[] = [];

    for (const line of existingLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        newLines.push(line);
        continue;
      }
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        if (updatedKeys.has(key)) {
          newLines.push(`${key}=${properties[key]}`);
          updatedKeys.delete(key);
        } else {
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    }

    // Append newly added keys
    for (const key of updatedKeys) {
      newLines.push(`${key}=${properties[key]}`);
    }

    fs.writeFileSync(propsPath, newLines.join('\n') + '\n', 'utf8');
    return true;
  }
}

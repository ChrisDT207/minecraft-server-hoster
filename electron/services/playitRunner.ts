import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PlayitStatus } from '../types';
import { VersionFetcher } from './versionFetcher';

export class PlayitRunner {
  private static instance: PlayitRunner;
  private process: ChildProcess | null = null;
  private logsBuffer: string[] = [];
  private status: PlayitStatus = {
    installed: false,
    running: false,
    recentLogs: [],
  };
  private onStatusChange?: (status: PlayitStatus) => void;

  private constructor() {
    this.checkInstalled();
  }

  public static getInstance(): PlayitRunner {
    if (!PlayitRunner.instance) {
      PlayitRunner.instance = new PlayitRunner();
    }
    return PlayitRunner.instance;
  }

  public setStatusListener(listener: (status: PlayitStatus) => void) {
    this.onStatusChange = listener;
  }

  private getToolsDir(): string {
    const dir = path.join(os.homedir(), 'MC-ForgeDesk', 'tools');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public getBinaryPath(): string {
    return path.join(this.getToolsDir(), 'playit.exe');
  }

  public checkInstalled(): boolean {
    const bin = this.getBinaryPath();
    const installed = fs.existsSync(bin);
    this.status.installed = installed;
    return installed;
  }

  public async ensureInstalled(onProgress?: (text: string) => void): Promise<string> {
    const bin = this.getBinaryPath();
    if (fs.existsSync(bin)) {
      this.status.installed = true;
      return bin;
    }

    onProgress?.('Downloading Playit.gg CLI runner for Windows (x86_64)...');
    // Use proven standalone CLI runner v0.15.26
    const downloadUrl =
      'https://github.com/playit-cloud/playit-agent/releases/download/v0.15.26/playit-windows-x86_64.exe';

    await VersionFetcher.downloadFile(downloadUrl, bin);
    this.status.installed = true;
    onProgress?.('Playit.gg CLI installed.');
    return bin;
  }

  public async start(targetPort: number = 25565): Promise<boolean> {
    if (this.process && this.status.running) {
      return true;
    }

    try {
      const bin = await this.ensureInstalled();

      this.logsBuffer = [];
      this.status.running = true;
      this.status.publicAddress = undefined;
      this.status.claimUrl = undefined;
      this.status.recentLogs = [];
      this.notify();

      // Launch playit CLI with --stdout for continuous log output
      this.process = spawn(bin, ['--stdout'], {
        cwd: this.getToolsDir(),
        windowsHide: true,
      });

      this.appendLog(`[Playit] Initializing CLI tunnel daemon on port ${targetPort}...`);

      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.appendLog(text);
        this.parseOutput(text);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.appendLog(text);
        this.parseOutput(text);
      });

      this.process.on('close', (code) => {
        this.appendLog(`[Playit] Process closed with exit code ${code}`);
        this.status.running = false;
        this.process = null;
        this.notify();
      });

      this.process.on('error', (err) => {
        this.appendLog(`[Playit Error] ${err.message}`);
        this.status.running = false;
        this.process = null;
        this.notify();
      });

      return true;
    } catch (err: any) {
      this.appendLog(`[Playit Error] Failed to start: ${err.message}`);
      this.status.running = false;
      this.notify();
      return false;
    }
  }

  public stop(): boolean {
    if (this.process) {
      try {
        this.process.kill('SIGINT');
      } catch {
        try {
          this.process.kill();
        } catch {}
      }
      this.process = null;
    }
    this.appendLog('[Playit] Tunnel stopped by user.');
    this.status.running = false;
    this.notify();
    return true;
  }

  public getStatus(): PlayitStatus {
    return {
      ...this.status,
      recentLogs: [...this.logsBuffer],
    };
  }

  private appendLog(text: string) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const l of lines) {
      this.logsBuffer.push(l);
      if (this.logsBuffer.length > 50) {
        this.logsBuffer.shift();
      }
    }
    this.status.latestLog = lines[lines.length - 1] || this.status.latestLog;
    this.status.recentLogs = [...this.logsBuffer];
    this.notify();
  }

  private parseOutput(text: string) {
    // 1. Claim URL: https://playit.gg/claim/[token]
    const claimMatch = text.match(/https?:\/\/(?:www\.)?playit\.gg\/claim\/[a-zA-Z0-9_-]+/i);
    if (claimMatch) {
      this.status.claimUrl = claimMatch[0];
      this.notify();
    }

    // 2. Public tunnel domain: e.g. abc-xyz.joinmc.link or ply.gg
    const addrMatch = text.match(/([a-zA-Z0-9_.-]+\.(?:joinmc\.link|ply\.gg|playit\.gg)(?::\d+)?)/i);
    if (addrMatch) {
      this.status.publicAddress = addrMatch[1];
      this.notify();
    } else {
      const tunnelLine = text.match(/tunnel\s+running:\s*([^\s=>]+)/i);
      if (tunnelLine && !this.status.publicAddress) {
        this.status.publicAddress = tunnelLine[1].trim();
        this.notify();
      }
    }
  }

  private notify() {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus());
    }
  }
}

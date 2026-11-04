import { exec } from 'child_process';
import { ServerManager } from './serverManager';

export interface ShutdownStatus {
  active: boolean;
  serverId?: string;
  shutdownPc: boolean;
  stopWhenEmpty: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  message?: string;
}

export class ShutdownManager {
  private static instance: ShutdownManager;
  private timer?: NodeJS.Timeout;
  private interval?: NodeJS.Timeout;
  private emptyCheckCount: number = 0;

  private currentStatus: ShutdownStatus = {
    active: false,
    shutdownPc: false,
    stopWhenEmpty: false,
    totalSeconds: 0,
    remainingSeconds: 0,
  };

  private onStatusChangeCallback?: (status: ShutdownStatus) => void;

  public static getInstance(): ShutdownManager {
    if (!ShutdownManager.instance) {
      ShutdownManager.instance = new ShutdownManager();
    }
    return ShutdownManager.instance;
  }

  public setStatusCallback(cb: (status: ShutdownStatus) => void) {
    this.onStatusChangeCallback = cb;
  }

  public getStatus(): ShutdownStatus {
    return { ...this.currentStatus };
  }

  // Gracefully save all world data and stop server
  public async saveAndCloseServer(serverId: string): Promise<boolean> {
    const sm = ServerManager.getInstance();
    const server = sm.getServer(serverId);
    if (!server) return false;

    try {
      // 1. Broadcast to players
      sm.sendCommand(serverId, 'say §c[MC-ForgeDesk] Saving world and stopping server...');
      // 2. Force flush save
      sm.sendCommand(serverId, 'save-all flush');
      // 3. Stop process gracefully
      await sm.stopServer(serverId);
      return true;
    } catch (err) {
      console.error('Error during saveAndCloseServer:', err);
      return false;
    }
  }

  // Schedule timer to save, close server, and optionally shut down the PC
  public scheduleShutdown(options: {
    serverId: string;
    delayMinutes: number;
    shutdownPc: boolean;
    stopWhenEmpty: boolean;
  }): ShutdownStatus {
    this.cancelShutdown(); // Cancel any existing active timer

    const { serverId, delayMinutes, shutdownPc, stopWhenEmpty } = options;
    const sm = ServerManager.getInstance();
    const totalSecs = Math.max(0, Math.round(delayMinutes * 60));

    this.currentStatus = {
      active: true,
      serverId,
      shutdownPc,
      stopWhenEmpty,
      totalSeconds: totalSecs,
      remainingSeconds: totalSecs,
    };

    this.emptyCheckCount = 0;
    this.broadcastStatus();

    // Broadcast initial warning to in-game chat
    if (totalSecs > 0) {
      sm.sendCommand(
        serverId,
        `say §e[MC-ForgeDesk] Server scheduled to ${
          shutdownPc ? 'save, stop and SHUT DOWN HOST PC' : 'save and stop'
        } in ${delayMinutes} minutes.`
      );
    } else {
      // Immediate shutdown requested
      this.executeShutdown();
      return this.getStatus();
    }

    // Ticking interval every second
    this.interval = setInterval(() => {
      this.currentStatus.remainingSeconds -= 1;

      const rem = this.currentStatus.remainingSeconds;

      // In-game warning milestones
      if (rem === 1800) {
        sm.sendCommand(serverId, 'say §e[MC-ForgeDesk] Warning: Server will shut down in 30 minutes.');
      } else if (rem === 900) {
        sm.sendCommand(serverId, 'say §e[MC-ForgeDesk] Warning: Server will shut down in 15 minutes.');
      } else if (rem === 300) {
        sm.sendCommand(serverId, 'say §e[MC-ForgeDesk] Warning: Server will shut down in 5 minutes.');
      } else if (rem === 60) {
        sm.sendCommand(serverId, 'say §c[MC-ForgeDesk] Warning: Server will shut down in 1 minute! Wrap up your tasks.');
      } else if (rem === 30 || rem === 10 || rem === 5) {
        sm.sendCommand(serverId, `say §c[MC-ForgeDesk] Final countdown: Shutting down in ${rem} seconds!`);
      }

      // Check empty server condition every 15 seconds
      if (stopWhenEmpty && rem % 15 === 0) {
        // We can check if players are 0
        // If empty for 3 minutes (12 checks of 15s), trigger early shutdown
      }

      this.broadcastStatus();

      if (this.currentStatus.remainingSeconds <= 0) {
        this.executeShutdown();
      }
    }, 1000);

    return this.getStatus();
  }

  private async executeShutdown() {
    this.clearTimers();
    const serverId = this.currentStatus.serverId;
    const shouldShutdownPc = this.currentStatus.shutdownPc;

    this.currentStatus = {
      active: false,
      shutdownPc: false,
      stopWhenEmpty: false,
      totalSeconds: 0,
      remainingSeconds: 0,
      message: shouldShutdownPc ? 'Shutting down PC now...' : 'Server stopped.',
    };
    this.broadcastStatus();

    if (serverId) {
      const sm = ServerManager.getInstance();
      sm.sendCommand(serverId, 'say §c[MC-ForgeDesk] Saving world and stopping server now. Goodbye!');
      sm.sendCommand(serverId, 'save-all flush');
      await sm.stopServer(serverId);
    }

    if (shouldShutdownPc) {
      // Execute Windows system shutdown with a 15-second grace window
      exec('shutdown /s /t 15 /c "MC-ForgeDesk: Minecraft Server saved. Host PC is shutting down."', (err) => {
        if (err) {
          console.error('Failed to trigger Windows shutdown:', err);
        }
      });
    }
  }

  // Cancel any active scheduled shutdown timer
  public cancelShutdown(): boolean {
    const wasActive = this.currentStatus.active;
    const serverId = this.currentStatus.serverId;

    this.clearTimers();

    this.currentStatus = {
      active: false,
      shutdownPc: false,
      stopWhenEmpty: false,
      totalSeconds: 0,
      remainingSeconds: 0,
      message: 'Shutdown cancelled.',
    };
    this.broadcastStatus();

    // Abort pending Windows shutdown if triggered
    exec('shutdown /a', () => {});

    if (wasActive && serverId) {
      const sm = ServerManager.getInstance();
      sm.sendCommand(serverId, 'say §a[MC-ForgeDesk] Scheduled shutdown was cancelled by host.');
    }

    return wasActive;
  }

  private clearTimers() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private broadcastStatus() {
    this.onStatusChangeCallback?.(this.getStatus());
  }
}

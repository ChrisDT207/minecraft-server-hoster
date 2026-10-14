import React from 'react';
import {
  Users,
  Activity,
  HardDrive,
  Copy,
  Check,
  FolderOpen,
  Wifi,
  Globe,
  ShieldCheck,
  Cpu,
  Clock,
} from 'lucide-react';
import { ServerConfig, ServerStatus, ServerStats, PlayitStatus } from '../types';

interface ServerOverviewProps {
  server: ServerConfig;
  status: ServerStatus;
  stats?: ServerStats;
  localIp: string;
  playitStatus?: PlayitStatus;
  onOpenFolder: () => void;
  onGoToConsole: () => void;
  onGoToTunnel: () => void;
}

export const ServerOverview: React.FC<ServerOverviewProps> = ({
  server,
  status,
  stats,
  localIp,
  playitStatus,
  onOpenFolder,
  onGoToConsole,
  onGoToTunnel,
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isProcessActive = status === 'running' || status === 'starting' || status === 'stopping';
  const isRunning = status === 'running';

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0m 00s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const memUsagePercent = stats?.memoryMb && isProcessActive
    ? Math.min(100, Math.round((stats.memoryMb / server.maxRam) * 100))
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-[#090b10]">
      {/* 1. Quick Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status & Uptime */}
        <div className="bg-[#11141c] p-4 rounded-lg border border-zinc-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                  : status === 'starting'
                  ? 'bg-amber-500 animate-pulse'
                  : status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="text-base font-bold text-zinc-100 uppercase tracking-wide">
              {status}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 mt-2 text-xs text-zinc-500 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Uptime: {isProcessActive ? formatUptime(stats?.uptimeSeconds) : 'Offline'}</span>
          </div>
        </div>

        {/* Players Online */}
        <div className="bg-[#11141c] p-4 rounded-lg border border-zinc-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Players</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {isRunning ? stats?.playersOnline || 0 : 0}{' '}
            <span className="text-sm font-normal text-zinc-500">/ {stats?.maxPlayers || 20}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {isRunning ? 'Real-time player count' : 'Start server to accept players'}
          </p>
        </div>

        {/* RAM Usage */}
        <div className="bg-[#11141c] p-4 rounded-lg border border-zinc-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">RAM Usage</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {isProcessActive ? stats?.memoryMb || 0 : 0}{' '}
            <span className="text-sm font-normal text-zinc-500">/ {server.maxRam} MB</span>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                memUsagePercent > 85 ? 'bg-rose-500' : memUsagePercent > 65 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${memUsagePercent}%` }}
            />
          </div>
        </div>

        {/* CPU Usage */}
        <div className="bg-[#11141c] p-4 rounded-lg border border-zinc-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">CPU</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {isProcessActive ? `${stats?.cpuPercent || 0}%` : '0%'}
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {isProcessActive ? (status === 'starting' ? 'Initializing engine...' : 'Real process utilization') : 'Process offline'}
          </p>
        </div>
      </div>

      {/* 2. Connection Addresses Card */}
      <div className="bg-[#11141c] rounded-lg border border-zinc-800/80 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
          Connection Addresses
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Localhost */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-xs text-zinc-400 font-medium">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Localhost (This PC)</span>
              </div>
              <p className="text-sm font-mono text-zinc-200 mt-1">
                127.0.0.1:{server.port}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(`127.0.0.1:${server.port}`, 'localhost')}
              className="mt-3 flex items-center justify-center space-x-1.5 w-full py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              {copiedField === 'localhost' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Address</span>
                </>
              )}
            </button>
          </div>

          {/* Local LAN IP */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-xs text-zinc-400 font-medium">
                <Wifi className="w-3.5 h-3.5 text-blue-400" />
                <span>Local Network (LAN)</span>
              </div>
              <p className="text-sm font-mono text-zinc-200 mt-1">
                {localIp}:{server.port}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(`${localIp}:${server.port}`, 'lan')}
              className="mt-3 flex items-center justify-center space-x-1.5 w-full py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              {copiedField === 'lan' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy LAN Address</span>
                </>
              )}
            </button>
          </div>

          {/* Public Tunnel (Playit.gg) */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-xs text-zinc-400 font-medium">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <span>Public Tunnel (.joinmc.link)</span>
              </div>
              <p className="text-sm font-mono text-zinc-200 mt-1 truncate">
                {playitStatus?.publicAddress || (playitStatus?.running ? 'Tunnel Initializing...' : 'Inactive')}
              </p>
            </div>
            {playitStatus?.publicAddress ? (
              <button
                onClick={() => copyToClipboard(playitStatus.publicAddress!, 'tunnel')}
                className="mt-3 flex items-center justify-center space-x-1.5 w-full py-1 text-xs font-medium rounded bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-700/50 transition-colors"
              >
                {copiedField === 'tunnel' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-purple-300" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Public Link</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onGoToTunnel}
                className="mt-3 flex items-center justify-center space-x-1.5 w-full py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                <span>Setup Public Tunnel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Server Configuration & Path Summary */}
      <div className="bg-[#11141c] rounded-lg border border-zinc-800/80 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
          Server Details &amp; Environment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2.5">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-500">Edition &amp; Loader</span>
              <span className="font-mono text-zinc-200 capitalize">
                {server.edition} / {server.loader}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-500">Minecraft Version</span>
              <span className="font-mono text-zinc-200">{server.version}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-500">Assigned Port</span>
              <span className="font-mono text-zinc-200">{server.port}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-500">Memory Allocation</span>
              <span className="font-mono text-zinc-200">
                {server.minRam}MB min / {server.maxRam}MB max
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-500">EULA Acceptance</span>
              <span className="font-mono text-emerald-400 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Accepted</span>
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-500">Offline / TLauncher Clients</span>
              <span
                className={`font-mono ${
                  server.allowOffline ? 'text-amber-400' : 'text-zinc-400'
                }`}
              >
                {server.allowOffline ? 'Allowed (online-mode=false)' : 'Enforce Mojang/Microsoft Auth'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-500">Skin Restoration</span>
              <span className="font-mono text-zinc-300">
                {server.skinRestorer ? 'SkinRestorer Installed' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60 items-center">
              <span className="text-zinc-500">Server Directory</span>
              <button
                onClick={onOpenFolder}
                className="flex items-center space-x-1 text-zinc-300 hover:text-white font-mono text-[11px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded transition-colors"
                title={server.serverDir}
              >
                <FolderOpen className="w-3 h-3" />
                <span>Open Folder</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Globe,
  Wifi,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Play,
  Square,
  Terminal,
  Activity,
  Key,
  Share2,
  RefreshCw,
  Power,
  Users,
  Monitor,
} from 'lucide-react';
import { ServerConfig, PlayitStatus, RemoteHubStatus } from '../types';
import { api } from '../services/apiBridge';

interface NetworkTunnelProps {
  server: ServerConfig;
  localIp: string;
  radminIp?: string;
}

export const NetworkTunnel: React.FC<NetworkTunnelProps> = ({ server, localIp, radminIp }) => {
  const [playitStatus, setPlayitStatus] = useState<PlayitStatus>({
    installed: false,
    running: false,
    recentLogs: [],
  });
  const [remoteHubStatus, setRemoteHubStatus] = useState<RemoteHubStatus | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isTogglingPlayit, setIsTogglingPlayit] = useState(false);
  const [isTogglingHub, setIsTogglingHub] = useState(false);
  const [isRegeneratingPin, setIsRegeneratingPin] = useState(false);

  const loadStatus = async () => {
    try {
      const st = await api.getPlayitStatus();
      setPlayitStatus(st);
    } catch {}

    try {
      const hub = await api.getRemoteHubStatus();
      setRemoteHubStatus(hub);
    } catch {}
  };

  useEffect(() => {
    loadStatus();
    const cleanupPlayit = api.onPlayitStatus((status) => {
      setPlayitStatus(status);
    });
    const cleanupHub = api.onRemoteHubStatus((status) => {
      setRemoteHubStatus(status);
    });

    return () => {
      cleanupPlayit?.();
      cleanupHub?.();
    };
  }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTogglePlayit = async () => {
    setIsTogglingPlayit(true);
    try {
      if (playitStatus.running) {
        await api.stopPlayit();
      } else {
        await api.startPlayit(server.port);
      }
      await loadStatus();
    } finally {
      setIsTogglingPlayit(false);
    }
  };

  const handleToggleRemoteHub = async () => {
    if (!remoteHubStatus) return;
    setIsTogglingHub(true);
    try {
      const updated = await api.updateRemoteHubConfig({ enabled: !remoteHubStatus.enabled });
      setRemoteHubStatus(updated);
    } finally {
      setIsTogglingHub(false);
    }
  };

  const handleRegeneratePin = async () => {
    setIsRegeneratingPin(true);
    try {
      const updated = await api.regenerateRemoteHubPin();
      setRemoteHubStatus(updated);
    } finally {
      setIsRegeneratingPin(false);
    }
  };

  const openClaimUrl = () => {
    if (playitStatus.claimUrl) {
      window.open(playitStatus.claimUrl, '_blank');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-[#090b10]">
      {/* ================= 1. REMOTE MANAGEMENT HUB ================= */}
      <div className="bg-[#11141c] rounded-lg border border-zinc-800/80 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Remote Management Hub (Friend Control)
              </h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  remoteHubStatus?.running
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/60'
                }`}
              >
                {remoteHubStatus?.running
                  ? `Active (Port ${remoteHubStatus.port})`
                  : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Let a friend connect to this PC remotely so they can start/stop the server, watch the console, inspect player inventories, and manage server properties while your PC is on.
            </p>
          </div>

          <button
            onClick={handleToggleRemoteHub}
            disabled={isTogglingHub}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white shadow-xs transition-colors ${
              remoteHubStatus?.enabled
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{remoteHubStatus?.enabled ? 'Disable Hub' : 'Enable Hub'}</span>
          </button>
        </div>

        {remoteHubStatus?.enabled && (
          <div className="space-y-4 pt-2 border-t border-zinc-800/60">
            {/* PIN & Connected Clients Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Access PIN Box */}
              <div className="p-3.5 bg-[#0b0d13] border border-zinc-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Remote Access PIN</span>
                  </span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-mono text-xl font-bold tracking-widest text-emerald-300">
                      {remoteHubStatus.pin}
                    </span>
                    <button
                      onClick={() => copyText(remoteHubStatus.pin, 'pin')}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      title="Copy PIN"
                    >
                      {copiedField === 'pin' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleRegeneratePin}
                  disabled={isRegeneratingPin}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors"
                  title="Generate a new 6-digit PIN"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingPin ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>

              {/* Connected Clients */}
              <div className="p-3.5 bg-[#0b0d13] border border-zinc-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Connected Remote Friends</span>
                  </span>
                  <span className="text-xl font-bold font-mono text-zinc-100 block mt-1">
                    {remoteHubStatus.connectedClients}{' '}
                    <span className="text-xs font-normal text-zinc-500">
                      {remoteHubStatus.connectedClients === 1 ? 'client connected' : 'clients connected'}
                    </span>
                  </span>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    remoteHubStatus.connectedClients > 0
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-zinc-700'
                  }`}
                />
              </div>
            </div>

            {/* Connection Links */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg space-y-3">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide block">
                How to Share with Your Friend
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Method 1: Desktop App Connection Code */}
                <div className="p-3 bg-[#0d0f15] border border-zinc-800 rounded space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400">
                      1. In MC-ForgeDesk (App-to-App)
                    </span>
                    <button
                      onClick={() => copyText(remoteHubStatus.inviteCode, 'invite')}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition-colors"
                    >
                      {copiedField === 'invite' ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Invite Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Your friend opens MC-ForgeDesk, clicks <strong>Connect Remote</strong> in the sidebar, and pastes this code:
                  </p>
                  <div className="p-1.5 bg-black/50 rounded font-mono text-[11px] text-zinc-200 truncate border border-zinc-800">
                    {remoteHubStatus.inviteCode}
                  </div>
                </div>

                {/* Method 2: Web Browser Dashboard */}
                <div className="p-3 bg-[#0d0f15] border border-zinc-800 rounded space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-400">
                      2. In Any Web Browser (No Install)
                    </span>
                    <a
                      href={remoteHubStatus.radminUrl || remoteHubStatus.localUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 hover:bg-blue-900 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Web View</span>
                    </a>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    A friend can simply open this link in Chrome, Edge, or Safari and enter PIN <strong className="text-white">{remoteHubStatus.pin}</strong>:
                  </p>
                  <div className="p-1.5 bg-black/50 rounded font-mono text-[11px] text-zinc-200 truncate border border-zinc-800">
                    {remoteHubStatus.radminUrl || remoteHubStatus.localUrl}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= 2. PUBLIC TUNNEL (PLAYIT.GG) ================= */}
      <div className="bg-[#11141c] rounded-lg border border-zinc-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Public Tunnel (Playit.gg)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Host your Minecraft server to friends across the globe with zero router port forwarding or public IP exposure.
            </p>
          </div>

          <button
            onClick={handleTogglePlayit}
            disabled={isTogglingPlayit}
            className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded text-white shadow-sm transition-colors ${
              playitStatus.running
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {playitStatus.running ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Public Tunnel</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Public Tunnel</span>
              </>
            )}
          </button>
        </div>

        {/* Tunnel Status Card */}
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Tunnel Connectivity
            </span>
            <div className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  playitStatus.running ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
                }`}
              />
              <span className="text-xs font-bold font-mono uppercase text-zinc-300">
                {playitStatus.running ? 'Active & Tunneling' : 'Tunnel Offline'}
              </span>
            </div>
          </div>

          {playitStatus.publicAddress ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/70 rounded flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block">
                  Public Minecraft Join Address:
                </span>
                <span className="font-mono text-emerald-300 font-bold text-sm block mt-0.5">
                  {playitStatus.publicAddress}
                </span>
              </div>
              <button
                onClick={() => copyText(playitStatus.publicAddress!, 'tunnel')}
                className="flex items-center space-x-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                {copiedField === 'tunnel' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Join Address</span>
                  </>
                )}
              </button>
            </div>
          ) : playitStatus.claimUrl ? (
            <div className="p-3 bg-purple-950/40 border border-purple-800/70 rounded flex items-center justify-between">
              <div>
                <span className="text-purple-300 font-semibold block text-xs">
                  Account Claim Link Required
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  Link this server runner to your free Playit.gg account to generate permanent tunnels.
                </span>
              </div>
              <button
                onClick={openClaimUrl}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                <span>Claim Account</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : playitStatus.running && !playitStatus.claimUrl ? (
            <p className="text-xs text-zinc-400">
              Connecting to Playit routing fabric and resolving tunnels...
            </p>
          ) : !playitStatus.running ? (
            <p className="text-xs text-zinc-500">
              Click &quot;Start Public Tunnel&quot; to initialize Playit CLI. The app will generate a secure public address.
            </p>
          ) : null}
        </div>

        {/* Live Tunnel Console Logs */}
        {playitStatus.running && (
          <div className="bg-[#0b0d13] border border-zinc-800/80 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/60 pb-2">
              <span className="flex items-center space-x-1.5 font-semibold uppercase tracking-wider text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>Playit CLI Live Logs</span>
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                Daemon v0.15.26
              </span>
            </div>
            <div className="font-mono text-[11px] text-zinc-300 max-h-36 overflow-y-auto space-y-1">
              {playitStatus.recentLogs && playitStatus.recentLogs.length > 0 ? (
                playitStatus.recentLogs.map((line, idx) => (
                  <div key={idx} className="leading-snug truncate">
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-zinc-600">No output yet...</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= 3. DIRECT NETWORK & RADMIN VPN ================= */}
      <div className="bg-[#11141c] rounded-lg border border-zinc-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wide flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>Direct Network &amp; Virtual LAN (Radmin VPN)</span>
          </h3>
          {radminIp && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
              Radmin VPN Detected
            </span>
          )}
        </div>

        <div className={`grid grid-cols-1 ${radminIp ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 text-xs`}>
          {/* Radmin VPN Card (if detected) */}
          {radminIp && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-800/50 rounded flex flex-col justify-between space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-emerald-400 font-semibold block">
                    Radmin VPN Direct Address
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    For friends in your Radmin room
                  </span>
                  <span className="font-mono text-emerald-300 font-bold text-sm block mt-1">
                    {radminIp}:{server.port}
                  </span>
                </div>
                <button
                  onClick={() => copyText(`${radminIp}:${server.port}`, 'radmin')}
                  className="p-1.5 rounded bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 transition-colors"
                >
                  {copiedField === 'radmin' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Local Home LAN Card */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-zinc-400 font-medium block">Home Wi-Fi / LAN IP</span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">
                  Devices on your physical home router
                </span>
                <span className="font-mono text-zinc-200 text-sm block mt-1">
                  {localIp}:{server.port}
                </span>
              </div>
              <button
                onClick={() => copyText(`${localIp}:${server.port}`, 'lan')}
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                {copiedField === 'lan' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Local Host Machine Card */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-zinc-400 font-medium block">Local Machine Address</span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">
                  For playing on this same PC
                </span>
                <span className="font-mono text-zinc-200 text-sm block mt-1">
                  127.0.0.1:{server.port}
                </span>
              </div>
              <button
                onClick={() => copyText(`127.0.0.1:${server.port}`, 'local')}
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                {copiedField === 'local' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

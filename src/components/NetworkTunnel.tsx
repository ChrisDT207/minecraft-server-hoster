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
} from 'lucide-react';
import { ServerConfig, PlayitStatus } from '../types';

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const loadStatus = async () => {
    try {
      const st = await window.electronAPI.getPlayitStatus();
      setPlayitStatus(st);
    } catch {}
  };

  useEffect(() => {
    loadStatus();
    const cleanup = window.electronAPI.onPlayitStatus((status) => {
      setPlayitStatus(status);
    });
    return () => cleanup?.();
  }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleToggleTunnel = async () => {
    setIsToggling(true);
    try {
      if (playitStatus.running) {
        await window.electronAPI.stopPlayit();
      } else {
        await window.electronAPI.startPlayit(server.port);
      }
      await loadStatus();
    } finally {
      setIsToggling(false);
    }
  };

  const openClaimUrl = () => {
    if (playitStatus.claimUrl) {
      window.open(playitStatus.claimUrl, '_blank');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-[#090b10]">
      {/* 1. Header & Quick Controls */}
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
            onClick={handleToggleTunnel}
            disabled={isToggling}
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
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  playitStatus.running
                    ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50'
                    : 'bg-zinc-600'
                }`}
              />
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide">
                {playitStatus.running ? 'Tunnel Active' : 'Tunnel Inactive'}
              </span>
            </div>
            {playitStatus.publicAddress && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                Connected
              </span>
            )}
          </div>

          {/* Claim Required Notification */}
          {playitStatus.claimUrl && !playitStatus.publicAddress && (
            <div className="p-4 bg-amber-950/40 border border-amber-700/70 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">
                  Account Claim Required to Activate Tunnel
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/60">
                  Step 1 of 1
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Open this claim link in your browser to link this hoster agent to your free Playit.gg account and assign your public <span className="font-mono text-emerald-400">.joinmc.link</span> address.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={openClaimUrl}
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Claim URL in Browser</span>
                </button>
                <button
                  onClick={() => copyText(playitStatus.claimUrl!, 'claimLink')}
                  className="flex items-center space-x-1 px-3 py-2 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  {copiedField === 'claimLink' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Assigned Domain */}
          {playitStatus.publicAddress ? (
            <div className="p-3 bg-zinc-950/80 border border-emerald-500/40 rounded flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-400 block font-medium">
                  Public Join Address (Give this to your friends):
                </span>
                <span className="text-base font-mono font-bold text-emerald-400">
                  {playitStatus.publicAddress}
                </span>
              </div>
              <button
                onClick={() => copyText(playitStatus.publicAddress!, 'playitAddr')}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                {copiedField === 'playitAddr' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
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

      {/* 2. Direct Network & Radmin VPN */}
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

      {/* 3. Safety & Networking FAQ Card */}
      <div className="bg-[#11141c] rounded-lg border border-zinc-800/80 p-5 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 uppercase tracking-wide">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>How Someone Connects (Radmin vs Public Tunnel)</span>
        </div>
        <ul className="text-xs text-zinc-400 space-y-2.5 list-disc list-inside leading-relaxed">
          <li>
            <strong className="text-emerald-400">Option 1: Radmin VPN (Zero Tunneling Needed):</strong> If both you and your friends use Radmin VPN, have them join your Radmin network room. In Minecraft, they enter your Radmin IP: <code className="text-emerald-300 font-mono">{radminIp || '26.x.x.x'}:{server.port}</code>. That&apos;s all!
          </li>
          <li>
            <strong className="text-zinc-200">Option 2: Public Tunnel (Playit.gg):</strong> If your friends don&apos;t want to install Radmin VPN, click &quot;Start Public Tunnel&quot; above. Give them your public <code className="text-emerald-400 font-mono">*.joinmc.link</code> address. They can join over the internet with zero software installed.
          </li>
          <li>
            <strong className="text-zinc-200">Playing on This Machine:</strong> If you are playing on the same computer hosting the server, enter <code className="text-zinc-200 font-mono">127.0.0.1</code> or <code className="text-zinc-200 font-mono">localhost</code> in Minecraft.
          </li>
          <li>
            <strong className="text-zinc-200">Instant TLauncher / Offline Support:</strong> If your server has Offline mode enabled, players using any Minecraft launcher can join using either the Radmin IP or the public link directly.
          </li>
        </ul>
      </div>
    </div>
  );
};

import React from 'react';
import { Plus, Server, Settings, Wifi, Copy, Check } from 'lucide-react';
import { ServerConfig, ServerStatus } from '../types';

interface SidebarProps {
  servers: ServerConfig[];
  selectedServerId: string | null;
  serverStatuses: Record<string, ServerStatus>;
  onSelectServer: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenSettingsModal: () => void;
  localIp: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  servers,
  selectedServerId,
  serverStatuses,
  onSelectServer,
  onOpenCreateModal,
  onOpenSettingsModal,
  localIp,
}) => {
  const [copiedIp, setCopiedIp] = React.useState(false);

  const handleCopyIp = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(localIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const getStatusBadge = (status: ServerStatus) => {
    switch (status) {
      case 'running':
        return <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />;
      case 'starting':
      case 'stopping':
        return <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />;
      case 'error':
        return <span className="w-2 h-2 rounded-full bg-rose-500" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-zinc-600" />;
    }
  };

  return (
    <aside className="w-64 bg-[#0d1017] border-r border-zinc-800/80 flex flex-col h-full select-none">
      {/* Top Header */}
      <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Servers
          </span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            {servers.length}
          </span>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
          title="Create New Minecraft Server"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Server</span>
        </button>
      </div>

      {/* Server List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {servers.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500">
            <Server className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
            <p>No servers configured.</p>
            <p className="mt-1 text-[11px] text-zinc-600">
              Click &quot;New Server&quot; to provision your first server.
            </p>
          </div>
        ) : (
          servers.map((server) => {
            const isSelected = server.id === selectedServerId;
            const status = serverStatuses[server.id] || 'stopped';

            return (
              <div
                key={server.id}
                onClick={() => onSelectServer(server.id)}
                className={`p-2.5 rounded border transition-colors cursor-pointer group flex flex-col space-y-1.5 ${
                  isSelected
                    ? 'bg-zinc-800/80 border-emerald-500/50 shadow-sm'
                    : 'bg-zinc-900/50 border-zinc-800/70 hover:bg-zinc-850 hover:border-zinc-700/80'
                }`}
              >
                {/* Title and Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    {getStatusBadge(status)}
                    <span className="text-xs font-medium text-zinc-200 truncate group-hover:text-white">
                      {server.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    :{server.port}
                  </span>
                </div>

                {/* Badges: Edition, Version, RAM */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 uppercase">
                    {server.loader}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400">
                    {server.version}
                  </span>
                  {server.allowOffline && (
                    <span
                      className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50"
                      title="Offline / TLauncher clients allowed"
                    >
                      Offline
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Network & Settings Footer */}
      <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/40 flex flex-col space-y-2">
        {/* Local LAN IP */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded bg-zinc-900/80 border border-zinc-800/80 text-[11px]">
          <div className="flex items-center space-x-1.5 text-zinc-400">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="font-mono text-zinc-300">{localIp}</span>
          </div>
          <button
            onClick={handleCopyIp}
            className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded transition-colors"
            title="Copy LAN IP"
          >
            {copiedIp ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettingsModal}
          className="flex items-center justify-center space-x-2 w-full py-1.5 px-3 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-zinc-400" />
          <span>Settings &amp; Environment</span>
        </button>
      </div>
    </aside>
  );
};

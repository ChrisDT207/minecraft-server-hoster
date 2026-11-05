import React from 'react';
import {
  Play,
  Square,
  RotateCw,
  FolderOpen,
  Trash2,
  Terminal,
  Sliders,
  Package,
  Globe,
  LayoutDashboard,
  Users,
  Save,
  Clock,
  Database,
  Flame,
} from 'lucide-react';
import { ServerConfig, ServerStatus, TabType, ShutdownStatus } from '../types';

interface ServerHeaderProps {
  server: ServerConfig;
  status: ServerStatus;
  activeTab: TabType['id'];
  onSelectTab: (tab: TabType['id']) => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onOpenFolder: () => void;
  onDelete: () => void;
  onOpenEditModal: () => void;
  onOpenShutdownModal?: () => void;
  onSaveAndClose?: () => void;
  onOpenImportModal?: () => void;
  shutdownStatus?: ShutdownStatus;
  onCancelShutdown?: () => void;
  isRemoteMode?: boolean;
}

export const ServerHeader: React.FC<ServerHeaderProps> = ({
  server,
  status,
  activeTab,
  onSelectTab,
  onStart,
  onStop,
  onRestart,
  onOpenFolder,
  onDelete,
  onOpenEditModal,
  onOpenShutdownModal,
  onSaveAndClose,
  onOpenImportModal,
  shutdownStatus,
  onCancelShutdown,
  isRemoteMode,
}) => {
  const isRunning = status === 'running';
  const isTransitioning = status === 'starting' || status === 'stopping';

  const tabs: TabType[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'console', label: 'Terminal / Console' },
    { id: 'properties', label: 'Configuration' },
    { id: 'players', label: 'Players & Inventory' },
    { id: 'mods', label: server.loader === 'paper' ? 'Plugins' : 'Mods' },
    { id: 'network', label: 'Public Tunnel' },
  ];

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}h ${remM}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="bg-[#0e1119] border-b border-zinc-800/80 flex flex-col select-none">
      {/* Top Banner: Name, Specs, Control Buttons */}
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left: Info */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-zinc-100">{server.name}</h1>
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 uppercase">
                {server.loader} {server.version}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                Port: {server.port}
              </span>
              <button
                type="button"
                onClick={onOpenEditModal}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 border border-zinc-700/60 hover:border-emerald-500/50 transition-colors cursor-pointer flex items-center space-x-1"
                title="Click to adjust RAM allocation and specs"
              >
                <span>RAM: {Math.round((server.maxRam / 1024) * 10) / 10}GB</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-zinc-400">
            <span className="font-mono text-zinc-500">ID: {server.id}</span>
            <span>•</span>
            <span>{server.edition === 'bedrock' ? 'Bedrock Dedicated Server' : 'Java Edition Server'}</span>
            {server.allowOffline && (
              <>
                <span>•</span>
                <span className="text-amber-400 font-medium">Offline / TLauncher Enabled</span>
              </>
            )}
            {isRemoteMode && (
              <>
                <span>•</span>
                <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Remote Sync Active</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Server Actions */}
        <div className="flex items-center space-x-2">
          {/* Start / Stop Button */}
          {!isRunning ? (
            <button
              onClick={onStart}
              disabled={isTransitioning}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white shadow-sm transition-colors ${
                isTransitioning
                  ? 'bg-amber-600/60 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{(status as string) === 'starting' ? 'Starting...' : 'Start Server'}</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              disabled={isTransitioning}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white shadow-sm transition-colors ${
                isTransitioning
                  ? 'bg-amber-600/60 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{(status as string) === 'stopping' ? 'Stopping...' : 'Stop'}</span>
            </button>
          )}

          {/* Save & Close Button */}
          {isRunning && onSaveAndClose && (
            <button
              onClick={onSaveAndClose}
              disabled={isTransitioning}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 transition-colors shadow-xs"
              title="Flushes world data to disk with save-all flush and gracefully stops the server"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Save &amp; Close</span>
            </button>
          )}

          {/* Auto Shutdown / Timer Button */}
          {onOpenShutdownModal && (
            <button
              onClick={onOpenShutdownModal}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors"
              title="Schedule automatic server close or PC shutdown with countdown timer"
            >
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Auto Shutdown</span>
            </button>
          )}

          {/* Import World Button */}
          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors"
              title="Import a Minecraft world from folder, zip, or singleplayer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import World</span>
            </button>
          )}

          {/* Restart Button */}
          <button
            onClick={onRestart}
            disabled={!isRunning || isTransitioning}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Restart Server"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>

          {/* Edit Server Specs & RAM */}
          <button
            onClick={onOpenEditModal}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors"
            title="Adjust RAM, Port, Java, and Server Settings"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edit Specs</span>
          </button>

          {/* Open Directory */}
          <button
            onClick={onOpenFolder}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors"
            title="Open Server Directory in Explorer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Files</span>
          </button>

          {/* Delete Server */}
          <button
            onClick={onDelete}
            disabled={isRunning}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 hover:border-rose-900/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Delete Server"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ACTIVE SHUTDOWN NOTIFICATION BANNER */}
      {shutdownStatus?.active && (
        <div className="px-6 py-2 bg-gradient-to-r from-rose-950/90 to-amber-950/80 border-t border-rose-800/60 flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-2 text-xs text-rose-200">
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="font-bold">
              {shutdownStatus.shutdownPc
                ? 'Scheduled Auto PC Shutdown in progress:'
                : 'Scheduled Server Close in progress:'}
            </span>
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-600/50">
              {formatSeconds(shutdownStatus.remainingSeconds)} remaining
            </span>
          </div>
          {onCancelShutdown && (
            <button
              onClick={onCancelShutdown}
              className="px-2.5 py-1 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-xs"
            >
              Cancel Shutdown
            </button>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center px-6 space-x-1 border-t border-zinc-800/60">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const getIcon = () => {
            switch (tab.id) {
              case 'overview':
                return <LayoutDashboard className="w-3.5 h-3.5" />;
              case 'console':
                return <Terminal className="w-3.5 h-3.5" />;
              case 'properties':
                return <Sliders className="w-3.5 h-3.5" />;
              case 'players':
                return <Users className="w-3.5 h-3.5" />;
              case 'mods':
                return <Package className="w-3.5 h-3.5" />;
              case 'network':
                return <Globe className="w-3.5 h-3.5" />;
            }
          };

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-2 py-2.5 px-3.5 text-xs font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-zinc-800/30'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {getIcon()}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

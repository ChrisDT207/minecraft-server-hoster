import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ServerHeader } from './components/ServerHeader';
import { ServerOverview } from './components/ServerOverview';
import { ServerConsole } from './components/ServerConsole';
import { ServerProperties } from './components/ServerProperties';
import { PlayerManager } from './components/PlayerManager';
import { ModManager } from './components/ModManager';
import { NetworkTunnel } from './components/NetworkTunnel';
import { CreateServerModal } from './components/CreateServerModal';
import { EditServerModal } from './components/EditServerModal';
import { SettingsModal } from './components/SettingsModal';
import { ImportWorldModal } from './components/ImportWorldModal';
import { ShutdownModal } from './components/ShutdownModal';
import { ConnectRemoteModal } from './components/ConnectRemoteModal';
import { EmptyState } from './components/EmptyState';
import { ServerConfig, ServerStatus, ServerStats, TabType, PlayitStatus, ShutdownStatus } from './types';
import { api, apiBridge } from './services/apiBridge';
import { Globe, Key, AlertCircle, RefreshCw, Server as ServerIcon } from 'lucide-react';

export const App: React.FC = () => {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerStatus>>({});
  const [serverStats, setServerStats] = useState<Record<string, ServerStats>>({});
  const [activeTab, setActiveTab] = useState<TabType['id']>('overview');

  const [localIp, setLocalIp] = useState<string>('127.0.0.1');
  const [radminIp, setRadminIp] = useState<string | undefined>(undefined);
  const [playitStatus, setPlayitStatus] = useState<PlayitStatus | undefined>(undefined);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShutdownModalOpen, setIsShutdownModalOpen] = useState(false);
  const [isConnectRemoteModalOpen, setIsConnectRemoteModalOpen] = useState(false);
  const [shutdownStatus, setShutdownStatus] = useState<ShutdownStatus | undefined>(undefined);

  // Remote Mode state
  const [isRemoteMode, setIsRemoteMode] = useState<boolean>(apiBridge.getMode() === 'remote');
  const [remoteAddress, setRemoteAddress] = useState<string | undefined>(
    apiBridge.getRemoteHost()?.address
  );

  // Web Browser login state (for visitors in Chrome/Edge without Electron)
  const isWebClient = typeof window !== 'undefined' && !window.electronAPI;
  const isWebAuthenticated = !isWebClient || !!apiBridge.getRemoteHost();
  const [webPin, setWebPin] = useState('');
  const [webError, setWebError] = useState<string | null>(null);
  const [webLoggingIn, setWebLoggingIn] = useState(false);

  // Load initial servers & system info
  const loadServers = async () => {
    try {
      const list = await api.getServers();
      setServers(list);

      if (list.length > 0) {
        if (!selectedServerId || !list.some((s) => s.id === selectedServerId)) {
          setSelectedServerId(list[0].id);
        }
      } else {
        setSelectedServerId(null);
      }

      // Fetch statuses for each server
      const statusMap: Record<string, ServerStatus> = {};
      for (const s of list) {
        try {
          const st = await api.getServerStatus(s.id);
          statusMap[s.id] = st;
        } catch {}
      }
      setServerStatuses(statusMap);
    } catch (err) {
      console.error('Error loading servers:', err);
    }
  };

  useEffect(() => {
    if (isWebAuthenticated) {
      loadServers();
    }

    // Load system and network info
    api.getSystemInfo().then((info) => {
      if (info?.localIp) setLocalIp(info.localIp);
      if (info?.radminIp) setRadminIp(info.radminIp);
    }).catch(() => {});

    api.getPlayitStatus().then(setPlayitStatus).catch(() => {});
    api.getShutdownStatus().then(setShutdownStatus).catch(() => {});

    // Listen to status changes
    const cleanupStatus = api.onServerStatusChange(({ serverId, status }) => {
      setServerStatuses((prev) => ({ ...prev, [serverId]: status }));
    });

    // Listen to server stats
    const cleanupStats = api.onServerStats(({ serverId, stats }) => {
      setServerStats((prev) => ({ ...prev, [serverId]: stats }));
    });

    // Listen to playit status
    const cleanupPlayit = api.onPlayitStatus((status) => {
      setPlayitStatus(status);
    });

    // Listen to shutdown timer status
    const cleanupShutdown = api.onShutdownStatus((status) => {
      setShutdownStatus(status);
    });

    // Listen to remote connection changes (switching between local & remote host)
    const cleanupConn = apiBridge.onConnectionChange(() => {
      const mode = apiBridge.getMode();
      const host = apiBridge.getRemoteHost();
      setIsRemoteMode(mode === 'remote');
      setRemoteAddress(host?.address);
      loadServers();
    });

    return () => {
      cleanupStatus?.();
      cleanupStats?.();
      cleanupPlayit?.();
      cleanupShutdown?.();
      cleanupConn?.();
    };
  }, [isWebAuthenticated]);

  const selectedServer = servers.find((s) => s.id === selectedServerId) || null;
  const currentStatus: ServerStatus = selectedServer
    ? serverStatuses[selectedServer.id] || 'stopped'
    : 'stopped';
  const currentStats = selectedServer ? serverStats[selectedServer.id] : undefined;

  // Actions
  const handleStartServer = async () => {
    if (!selectedServer) return;
    await api.startServer(selectedServer.id);
  };

  const handleStopServer = async () => {
    if (!selectedServer) return;
    await api.stopServer(selectedServer.id);
  };

  const handleRestartServer = async () => {
    if (!selectedServer) return;
    await api.restartServer(selectedServer.id);
  };

  const handleSendCommand = (cmd: string) => {
    if (!selectedServer) return;
    api.sendCommand(selectedServer.id, cmd);
  };

  const handleOpenFolder = () => {
    if (!selectedServer) return;
    api.openServerFolder(selectedServer.id);
  };

  const handleDeleteServer = async () => {
    if (!selectedServer) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete server "${selectedServer.name}"?\nThis will remove the server configuration and its files.`
    );
    if (confirmDelete) {
      await api.deleteServer(selectedServer.id, true);
      const remaining = servers.filter((s) => s.id !== selectedServer.id);
      setServers(remaining);
      setSelectedServerId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSaveAndCloseServer = async () => {
    if (!selectedServer) return;
    await api.saveAndCloseServer(selectedServer.id);
  };

  const handleCancelShutdown = async () => {
    await api.cancelShutdown();
  };

  const handleServerCreated = (newServer: ServerConfig) => {
    setServers((prev) => [newServer, ...prev]);
    setSelectedServerId(newServer.id);
    setActiveTab('overview');
  };

  const handleServerUpdated = (updatedServer: ServerConfig) => {
    setServers((prev) => prev.map((s) => (s.id === updatedServer.id ? updatedServer : s)));
  };

  const handleWebLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webPin.trim()) return;
    setWebLoggingIn(true);
    setWebError(null);
    try {
      const host = window.location.host;
      await apiBridge.connectRemote(host, webPin.trim());
    } catch (err: any) {
      setWebError(err.message || 'Authentication failed');
    } finally {
      setWebLoggingIn(false);
    }
  };

  // --- 0. BROWSER ACCESS LOGIN SCREEN (WHEN VISITED VIA CHROME/SAFARI) ---
  if (isWebClient && !isWebAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#090b10] text-zinc-100 p-4 select-none">
        <div className="bg-[#0e1119] border border-zinc-800 rounded-xl p-8 max-w-md w-full shadow-2xl space-y-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <ServerIcon className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-zinc-100">MC-ForgeDesk Remote Hub</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Connected to host at <span className="font-mono text-emerald-400">{window.location.host}</span>
            </p>
          </div>

          {webError && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/70 rounded text-xs text-rose-300 flex items-center space-x-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{webError}</span>
            </div>
          )}

          <form onSubmit={handleWebLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Enter Remote Access PIN:</span>
              </label>
              <input
                type="password"
                maxLength={10}
                value={webPin}
                onChange={(e) => setWebPin(e.target.value)}
                placeholder="6-digit Host PIN"
                className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-2 text-center text-sm font-mono tracking-widest text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={webLoggingIn || !webPin.trim()}
              className="w-full py-2.5 px-4 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-md flex items-center justify-center space-x-2 disabled:opacity-40"
            >
              {webLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Unlock Remote Dashboard</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-zinc-500">
            Ask the server host for their 6-digit Remote Access PIN displayed in their MC-ForgeDesk app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090b10] text-zinc-100 font-sans overflow-hidden">
      {/* 1. Frameless Window TitleBar (Hidden in pure web browser) */}
      {!isWebClient && <TitleBar serverCount={servers.length} />}

      {/* 2. Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          servers={servers}
          selectedServerId={selectedServerId}
          serverStatuses={serverStatuses}
          onSelectServer={setSelectedServerId}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          localIp={localIp}
          isRemoteMode={isRemoteMode}
          remoteHostAddress={remoteAddress}
          onOpenConnectRemoteModal={() => setIsConnectRemoteModalOpen(true)}
          onDisconnectRemote={() => {
            apiBridge.disconnectRemote();
            loadServers();
          }}
        />

        {/* Right Workspace */}
        <main className="flex-1 flex flex-col bg-[#090b10] overflow-hidden">
          {selectedServer ? (
            <>
              {/* Server Top Header */}
              <ServerHeader
                server={selectedServer}
                status={currentStatus}
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                onStart={handleStartServer}
                onStop={handleStopServer}
                onRestart={handleRestartServer}
                onOpenFolder={handleOpenFolder}
                onDelete={handleDeleteServer}
                onOpenEditModal={() => setIsEditModalOpen(true)}
                onOpenShutdownModal={() => setIsShutdownModalOpen(true)}
                onSaveAndClose={handleSaveAndCloseServer}
                onOpenImportModal={() => setIsImportModalOpen(true)}
                shutdownStatus={shutdownStatus}
                onCancelShutdown={handleCancelShutdown}
                isRemoteMode={isRemoteMode}
              />

              {/* Tab Views */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab === 'overview' && (
                  <ServerOverview
                    server={selectedServer}
                    status={currentStatus}
                    stats={currentStats}
                    localIp={localIp}
                    playitStatus={playitStatus}
                    onOpenFolder={handleOpenFolder}
                    onGoToConsole={() => setActiveTab('console')}
                    onGoToTunnel={() => setActiveTab('network')}
                    onGoToPlayers={() => setActiveTab('players')}
                    onOpenEditModal={() => setIsEditModalOpen(true)}
                    onOpenImportModal={() => setIsImportModalOpen(true)}
                  />
                )}
                {activeTab === 'console' && (
                  <ServerConsole
                    server={selectedServer}
                    status={currentStatus}
                    onSendCommand={handleSendCommand}
                  />
                )}
                {activeTab === 'properties' && (
                  <ServerProperties
                    server={selectedServer}
                    onOpenEditModal={() => setIsEditModalOpen(true)}
                    onOpenImportModal={() => setIsImportModalOpen(true)}
                    onServerUpdated={handleServerUpdated}
                  />
                )}
                {activeTab === 'players' && (
                  <PlayerManager
                    server={selectedServer}
                    status={currentStatus}
                  />
                )}
                {activeTab === 'mods' && (
                  <ModManager server={selectedServer} />
                )}
                {activeTab === 'network' && (
                  <NetworkTunnel server={selectedServer} localIp={localIp} radminIp={radminIp} />
                )}
              </div>
            </>
          ) : (
            <EmptyState onOpenCreateModal={() => setIsCreateModalOpen(true)} />
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateServerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onServerCreated={handleServerCreated}
      />

      {selectedServer && (
        <EditServerModal
          isOpen={isEditModalOpen}
          server={selectedServer}
          status={currentStatus}
          onClose={() => setIsEditModalOpen(false)}
          onServerUpdated={handleServerUpdated}
          onRestartServer={handleRestartServer}
        />
      )}

      {selectedServer && (
        <ImportWorldModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          server={selectedServer}
          status={currentStatus}
          onWorldImported={() => {
            loadServers();
          }}
        />
      )}

      {selectedServer && (
        <ShutdownModal
          isOpen={isShutdownModalOpen}
          onClose={() => setIsShutdownModalOpen(false)}
          server={selectedServer}
          status={currentStatus}
          shutdownStatus={shutdownStatus}
        />
      )}

      <ConnectRemoteModal
        isOpen={isConnectRemoteModalOpen}
        onClose={() => setIsConnectRemoteModalOpen(false)}
        onConnected={() => {
          loadServers();
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ServerHeader } from './components/ServerHeader';
import { ServerOverview } from './components/ServerOverview';
import { ServerConsole } from './components/ServerConsole';
import { ServerProperties } from './components/ServerProperties';
import { ModManager } from './components/ModManager';
import { NetworkTunnel } from './components/NetworkTunnel';
import { CreateServerModal } from './components/CreateServerModal';
import { SettingsModal } from './components/SettingsModal';
import { EmptyState } from './components/EmptyState';
import { ServerConfig, ServerStatus, ServerStats, TabType, PlayitStatus } from './types';

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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Load initial servers & system info
  const loadServers = async () => {
    try {
      if (window.electronAPI) {
        const list = await window.electronAPI.getServers();
        setServers(list);

        if (list.length > 0 && !selectedServerId) {
          setSelectedServerId(list[0].id);
        }

        // Fetch statuses for each server
        const statusMap: Record<string, ServerStatus> = {};
        for (const s of list) {
          const st = await window.electronAPI.getServerStatus(s.id);
          statusMap[s.id] = st;
        }
        setServerStatuses(statusMap);
      }
    } catch (err) {
      console.error('Error loading servers:', err);
    }
  };

  useEffect(() => {
    loadServers();

    if (window.electronAPI) {
      window.electronAPI.getSystemInfo().then((info) => {
        if (info.localIp) setLocalIp(info.localIp);
        if (info.radminIp) setRadminIp(info.radminIp);
      });

      window.electronAPI.getPlayitStatus().then(setPlayitStatus);

      // Listen to status changes
      const cleanupStatus = window.electronAPI.onServerStatusChange(({ serverId, status }) => {
        setServerStatuses((prev) => ({ ...prev, [serverId]: status }));
      });

      // Listen to server stats
      const cleanupStats = window.electronAPI.onServerStats(({ serverId, stats }) => {
        setServerStats((prev) => ({ ...prev, [serverId]: stats }));
      });

      // Listen to playit status
      const cleanupPlayit = window.electronAPI.onPlayitStatus((status) => {
        setPlayitStatus(status);
      });

      return () => {
        cleanupStatus?.();
        cleanupStats?.();
        cleanupPlayit?.();
      };
    }
  }, []);

  const selectedServer = servers.find((s) => s.id === selectedServerId) || null;
  const currentStatus: ServerStatus = selectedServer
    ? serverStatuses[selectedServer.id] || 'stopped'
    : 'stopped';
  const currentStats = selectedServer ? serverStats[selectedServer.id] : undefined;

  // Actions
  const handleStartServer = async () => {
    if (!selectedServer) return;
    await window.electronAPI.startServer(selectedServer.id);
  };

  const handleStopServer = async () => {
    if (!selectedServer) return;
    await window.electronAPI.stopServer(selectedServer.id);
  };

  const handleRestartServer = async () => {
    if (!selectedServer) return;
    await window.electronAPI.restartServer(selectedServer.id);
  };

  const handleSendCommand = (cmd: string) => {
    if (!selectedServer) return;
    window.electronAPI.sendCommand(selectedServer.id, cmd);
  };

  const handleOpenFolder = () => {
    if (!selectedServer) return;
    window.electronAPI.openServerFolder(selectedServer.id);
  };

  const handleDeleteServer = async () => {
    if (!selectedServer) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete server "${selectedServer.name}"?\nThis will remove the server configuration and its files.`
    );
    if (confirmDelete) {
      await window.electronAPI.deleteServer(selectedServer.id, true);
      const remaining = servers.filter((s) => s.id !== selectedServer.id);
      setServers(remaining);
      setSelectedServerId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleServerCreated = (newServer: ServerConfig) => {
    setServers((prev) => [newServer, ...prev]);
    setSelectedServerId(newServer.id);
    setActiveTab('overview');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090b10] text-zinc-100 font-sans overflow-hidden">
      {/* 1. Frameless Window TitleBar */}
      <TitleBar serverCount={servers.length} />

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
                  <ServerProperties server={selectedServer} />
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

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

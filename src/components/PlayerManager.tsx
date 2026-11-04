import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  Heart,
  Sparkles,
  Compass,
  X,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Ban,
  Send,
  AlertCircle,
  Package,
  Layers,
  Sword,
  ShieldAlert,
  Archive,
  Utensils,
  Zap,
  Check,
} from 'lucide-react';
import {
  ServerConfig,
  ServerStatus,
  PlayerSummary,
  PlayerInventoryDetails,
  PlayerItem,
} from '../types';

interface PlayerManagerProps {
  server: ServerConfig;
  status: ServerStatus;
}

export const PlayerManager: React.FC<PlayerManagerProps> = ({ server, status }) => {
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected player for inventory inspection
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [inventoryDetails, setInventoryDetails] = useState<PlayerInventoryDetails | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [activeInvTab, setActiveInvTab] = useState<'inventory' | 'ender'>('inventory');

  // Hovered item for tooltip
  const [hoveredItem, setHoveredItem] = useState<{
    item: PlayerItem;
    x: number;
    y: number;
  } | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const isRunning = status === 'running';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadPlayers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await window.electronAPI.getPlayers(server.id);
      setPlayers(list);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and periodic polling when server is running to keep inventory up-to-date
  useEffect(() => {
    loadPlayers();

    const interval = setInterval(() => {
      if (isRunning) {
        window.electronAPI.getPlayers(server.id).then((list) => {
          setPlayers(list);
        });
        if (selectedUuid) {
          window.electronAPI.getPlayerInventory(server.id, selectedUuid).then((details) => {
            if (details) setInventoryDetails(details);
          });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [server.id, isRunning, selectedUuid]);

  const handleInspectPlayer = async (uuid: string) => {
    setSelectedUuid(uuid);
    setLoadingInventory(true);
    try {
      const details = await window.electronAPI.getPlayerInventory(server.id, uuid);
      setInventoryDetails(details);
    } catch (err: any) {
      setErrorMsg(`Failed to inspect inventory: ${err.message}`);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Universal Fabric / Vanilla / Paper command execution
  const handleExecuteCommand = (cmd: string) => {
    if (!isRunning) return;
    window.electronAPI.sendCommand(server.id, cmd);
    showToast(`Executed: /${cmd}`);
  };

  const handleHealPlayer = (playerName: string) => {
    if (!isRunning) return;
    window.electronAPI.sendCommand(server.id, `effect give ${playerName} minecraft:instant_health 1 255 true`);
    window.electronAPI.sendCommand(server.id, `effect give ${playerName} minecraft:regeneration 5 5 true`);
    window.electronAPI.sendCommand(server.id, `heal ${playerName}`);
    showToast(`Healed ${playerName} to full hearts!`);
  };

  const handleFeedPlayer = (playerName: string) => {
    if (!isRunning) return;
    window.electronAPI.sendCommand(server.id, `effect give ${playerName} minecraft:saturation 5 20 true`);
    window.electronAPI.sendCommand(server.id, `feed ${playerName}`);
    showToast(`Restored hunger for ${playerName}!`);
  };

  const handleHealAndFeed = (playerName: string) => {
    if (!isRunning) return;
    window.electronAPI.sendCommand(server.id, `effect give ${playerName} minecraft:instant_health 1 255 true`);
    window.electronAPI.sendCommand(server.id, `effect give ${playerName} minecraft:saturation 5 20 true`);
    window.electronAPI.sendCommand(server.id, `effect give ${playerName} minecraft:regeneration 5 5 true`);
    window.electronAPI.sendCommand(server.id, `heal ${playerName}`);
    window.electronAPI.sendCommand(server.id, `feed ${playerName}`);
    showToast(`Fully restored Health & Hunger for ${playerName}!`);
  };

  const handleGiveFood = (playerName: string) => {
    if (!isRunning) return;
    window.electronAPI.sendCommand(server.id, `give ${playerName} minecraft:cooked_beef 64`);
    showToast(`Gave 64x Cooked Beef to ${playerName}!`);
  };

  const handleForceSaveAndRefresh = async () => {
    if (isRunning) {
      window.electronAPI.sendCommand(server.id, 'save-all flush');
      showToast('Flushed world save to disk. Refreshing player files...');
    }
    setTimeout(async () => {
      await loadPlayers();
      if (selectedUuid) {
        const details = await window.electronAPI.getPlayerInventory(server.id, selectedUuid);
        if (details) setInventoryDetails(details);
      }
    }, 600);
  };

  const filteredPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      p.uuid.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const getDimensionBadge = (dim: string) => {
    const d = dim.toLowerCase();
    if (d.includes('nether')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800/60">
          Nether
        </span>
      );
    }
    if (d.includes('end')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800/60">
          The End
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
        Overworld
      </span>
    );
  };

  const getGamemodeName = (gm: number) => {
    switch (gm) {
      case 1:
        return 'Creative';
      case 2:
        return 'Adventure';
      case 3:
        return 'Spectator';
      default:
        return 'Survival';
    }
  };

  // Helper to render an item slot
  const renderItemSlot = (
    item: PlayerItem | undefined,
    slotNumber: number,
    label?: string,
    isEnder: boolean = false
  ) => {
    const hasItem = !!item && !!item.id;
    return (
      <div
        key={slotNumber}
        onMouseEnter={(e) => {
          if (hasItem) {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoveredItem({ item, x: rect.left, y: rect.top });
          }
        }}
        onMouseLeave={() => setHoveredItem(null)}
        className={`w-11 h-11 relative rounded border flex items-center justify-center select-none transition-all ${
          isEnder
            ? 'bg-[#120d1c] border-purple-900/60 hover:border-purple-400'
            : 'bg-[#131722] border-zinc-700/80 hover:border-emerald-400/80'
        } ${hasItem ? 'cursor-pointer hover:scale-105' : 'opacity-70'}`}
      >
        {hasItem ? (
          <>
            {/* Item Representation */}
            <div className="flex flex-col items-center justify-center p-0.5 max-w-full">
              <span
                className={`text-[10px] font-bold text-center leading-tight truncate px-0.5 ${
                  item.enchantments
                    ? 'text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]'
                    : item.customName
                    ? 'text-amber-300 font-semibold italic'
                    : 'text-zinc-200'
                }`}
              >
                {item.customName || item.displayName.split(' ')[0]}
              </span>
            </div>

            {/* Stack Count Badge */}
            {item.count > 1 && (
              <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-black text-white bg-black/70 px-1 rounded-sm leading-tight">
                {item.count}
              </span>
            )}

            {/* Durability indicator bar */}
            {item.damage !== undefined && item.damage > 0 && (
              <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-black/60 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${Math.max(10, 100 - (item.damage / 1500) * 100)}%`,
                  }}
                />
              </div>
            )}
          </>
        ) : (
          label && (
            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">
              {label}
            </span>
          )
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090b10] select-none overflow-hidden">
      {/* 1. Header & Controls */}
      <div className="h-12 px-6 bg-[#0e1119] border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-zinc-100">
            Player Records &amp; Inventories
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            {players.length} Players Found
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by player or UUID..."
              className="pl-8 pr-3 py-1 bg-[#131722] border border-zinc-700/80 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500 w-56 font-mono"
            />
          </div>

          <button
            onClick={handleForceSaveAndRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded bg-emerald-700/80 hover:bg-emerald-600 text-white transition-colors border border-emerald-600/70 shadow-xs"
            title="Saves in-game state immediately (save-all flush) and re-reads player data from disk"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Force Save &amp; Refresh</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="mx-6 mt-3 p-2.5 bg-emerald-950/90 border border-emerald-600/80 rounded-md text-xs text-emerald-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMsg}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Body Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {filteredPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-lg space-y-3">
            <Users className="w-10 h-10 text-zinc-600" />
            <div>
              <p className="text-sm font-semibold text-zinc-300">
                {players.length === 0 ? 'No Player Data Found' : 'No matching players'}
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                {players.length === 0
                  ? 'Players will automatically appear here once they join the server for the first time.'
                  : 'Try adjusting your search query.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => (
              <div
                key={player.uuid}
                className="p-4 bg-[#11141c] border border-zinc-800/80 hover:border-zinc-700 rounded-lg flex flex-col justify-between space-y-3 transition-colors shadow-xs"
              >
                {/* Player Top Details */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={`https://mc-heads.net/avatar/${player.name}/44`}
                      alt={player.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://mc-heads.net/avatar/steve/44';
                      }}
                      className="w-11 h-11 rounded-md bg-zinc-900 border border-zinc-700/80 shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-zinc-100 truncate">
                        {player.name}
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-500 truncate" title={player.uuid}>
                        {player.uuid.slice(0, 16)}...
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1">
                        {getDimensionBadge(player.dimension)}
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                          {getGamemodeName(player.gamemode)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vitals Summary */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#0a0c12] rounded border border-zinc-800/60 text-xs">
                  {/* Health */}
                  <div className="flex items-center space-x-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                    <span className="font-mono text-zinc-200">
                      {player.health}/20
                    </span>
                  </div>

                  {/* Level */}
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-emerald-300 font-semibold">
                      Lvl {player.xpLevel}
                    </span>
                  </div>

                  {/* Inventory count */}
                  <div className="flex items-center space-x-1.5 justify-end">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-mono text-zinc-300">
                      {player.itemCount} Items
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {isRunning && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleHealPlayer(player.name)}
                          className="px-2 py-1 text-[11px] rounded bg-zinc-800 hover:bg-rose-950/70 text-zinc-300 hover:text-rose-400 border border-zinc-700/50 transition-colors"
                          title="Restore full health (hearts)"
                        >
                          ❤️ Heal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedPlayer(player.name)}
                          className="px-2 py-1 text-[11px] rounded bg-zinc-800 hover:bg-amber-950/70 text-zinc-300 hover:text-amber-400 border border-zinc-700/50 transition-colors"
                          title="Restore full hunger bar"
                        >
                          🍗 Feed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteCommand(`op ${player.name}`)}
                          className="px-2 py-1 text-[11px] rounded bg-zinc-800 hover:bg-emerald-950/70 text-zinc-400 hover:text-emerald-400 border border-zinc-700/50 transition-colors"
                          title="Grant Operator rights"
                        >
                          OP
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteCommand(`kick ${player.name} Kicked by admin`)}
                          className="px-2 py-1 text-[11px] rounded bg-zinc-800 hover:bg-rose-950/70 text-zinc-400 hover:text-rose-400 border border-zinc-700/50 transition-colors"
                          title="Kick player from server"
                        >
                          Kick
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInspectPlayer(player.uuid)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
                  >
                    <span>Inspect Inventory</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. INVENTORY & ENDER CHEST INSPECTOR MODAL */}
      {selectedUuid && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-[#0e1119] border border-zinc-800 rounded-lg w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-zinc-800 flex items-center justify-between bg-[#11141c]">
              <div className="flex items-center space-x-3">
                <img
                  src={`https://mc-heads.net/avatar/${inventoryDetails?.name || 'steve'}/36`}
                  alt="avatar"
                  className="w-8 h-8 rounded bg-zinc-900 border border-zinc-700 shrink-0"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-zinc-100">
                      {inventoryDetails?.name || 'Player'}
                    </h2>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700 font-bold">
                      Lvl {inventoryDetails?.xpLevel ?? 0}
                    </span>
                    {inventoryDetails?.dimension && getDimensionBadge(inventoryDetails.dimension)}
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500">
                    UUID: {inventoryDetails?.uuid} • Pos: {inventoryDetails?.pos.join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSelectedUuid(null);
                    setInventoryDetails(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Subnav: Main Inventory vs Ender Chest */}
            <div className="px-6 py-2.5 bg-[#0b0d13] border-b border-zinc-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveInvTab('inventory')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    activeInvTab === 'inventory'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Player Inventory ({inventoryDetails?.inventory.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInvTab('ender')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    activeInvTab === 'ender'
                      ? 'bg-purple-950/80 text-purple-300 border border-purple-600'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5 text-purple-400" />
                  <span>Ender Chest ({inventoryDetails?.enderChest.length || 0})</span>
                </button>
              </div>

              {isRunning && inventoryDetails && (
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <button
                    type="button"
                    onClick={() => handleHealPlayer(inventoryDetails.name)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 transition-colors shadow-xs"
                    title="Restore full hearts"
                  >
                    ❤️ Heal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedPlayer(inventoryDetails.name)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 transition-colors shadow-xs"
                    title="Restore full hunger bar"
                  >
                    🍗 Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHealAndFeed(inventoryDetails.name)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 transition-colors shadow-xs"
                    title="Max out both health & hunger"
                  >
                    ⚡ Max Out
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGiveFood(inventoryDetails.name)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
                    title="Give 64 cooked beef"
                  >
                    🥩 +64 Beef
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecuteCommand(`clear ${inventoryDetails.name}`)}
                    className="px-2.5 py-1 text-[11px] rounded bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-700/50 transition-colors"
                    title="Clear player inventory"
                  >
                    🧹 Clear
                  </button>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingInventory ? (
                <div className="flex items-center justify-center p-12 text-zinc-400 space-x-2 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading and parsing player NBT data...</span>
                </div>
              ) : activeInvTab === 'inventory' ? (
                <div className="space-y-6">
                  {/* Top Row: Armor & Offhand */}
                  <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800/80">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <span>Armor &amp; Equipment</span>
                      </span>
                      <span className="text-[11px] text-zinc-500">Slots 100-103 &amp; Offhand</span>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Helmet */}
                      {renderItemSlot(inventoryDetails?.equipment.head, 103, 'Head')}
                      {/* Chestplate */}
                      {renderItemSlot(inventoryDetails?.equipment.chest, 102, 'Chest')}
                      {/* Leggings */}
                      {renderItemSlot(inventoryDetails?.equipment.legs, 101, 'Legs')}
                      {/* Boots */}
                      {renderItemSlot(inventoryDetails?.equipment.feet, 100, 'Feet')}

                      <div className="w-px h-8 bg-zinc-800 mx-2" />

                      {/* Offhand */}
                      {renderItemSlot(inventoryDetails?.equipment.offhand, -106, 'Shield')}
                    </div>
                  </div>

                  {/* Main Inventory: 27 Slots (3 rows of 9) */}
                  <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800/80">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Package className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Main Inventory (Rows 1-3)</span>
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">Slots 9 to 35</span>
                    </div>

                    {/* 3 rows x 9 columns */}
                    <div className="grid grid-cols-9 gap-2">
                      {Array.from({ length: 27 }).map((_, idx) => {
                        const slotNum = idx + 9;
                        const item = inventoryDetails?.inventory.find((i) => i.slot === slotNum);
                        return renderItemSlot(item, slotNum);
                      })}
                    </div>
                  </div>

                  {/* Hotbar: 9 Slots (1 row of 9) */}
                  <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800/80">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Sword className="w-3.5 h-3.5 text-amber-400" />
                        <span>Hotbar (Slots 1-9)</span>
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">Slots 0 to 8</span>
                    </div>

                    {/* 1 row x 9 columns */}
                    <div className="grid grid-cols-9 gap-2">
                      {Array.from({ length: 9 }).map((_, idx) => {
                        const slotNum = idx;
                        const item = inventoryDetails?.inventory.find((i) => i.slot === slotNum);
                        return renderItemSlot(item, slotNum);
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Ender Chest Tab: 27 Slots (3 rows of 9) */
                <div className="p-5 bg-[#120d1c] rounded-lg border border-purple-900/60 space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Archive className="w-4 h-4 text-purple-400" />
                      <span>Ender Chest Storage (27 Slots)</span>
                    </span>
                    <span className="text-[11px] font-mono text-purple-400/80">
                      Private Obsidian Vault
                    </span>
                  </div>

                  <div className="grid grid-cols-9 gap-2">
                    {Array.from({ length: 27 }).map((_, idx) => {
                      const slotNum = idx;
                      const item = inventoryDetails?.enderChest.find((i) => i.slot === slotNum);
                      return renderItemSlot(item, slotNum, undefined, true);
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="h-12 px-6 border-t border-zinc-800/80 bg-[#11141c] flex items-center justify-between text-xs text-zinc-500 font-mono">
              <span>Hover over any item to inspect enchantments and stats.</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedUuid(null);
                  setInventoryDetails(null);
                }}
                className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Floating Hover Tooltip */}
          {hoveredItem && (
            <div
              className="fixed z-60 pointer-events-none p-2.5 bg-black/95 border border-zinc-700 rounded shadow-2xl max-w-xs space-y-1"
              style={{
                left: `${Math.min(window.innerWidth - 240, hoveredItem.x + 48)}px`,
                top: `${Math.max(10, hoveredItem.y - 10)}px`,
              }}
            >
              <p
                className={`text-xs font-bold ${
                  hoveredItem.item.enchantments
                    ? 'text-cyan-300'
                    : hoveredItem.item.customName
                    ? 'text-amber-300 italic'
                    : 'text-zinc-100'
                }`}
              >
                {hoveredItem.item.customName || hoveredItem.item.displayName}
              </p>
              <p className="text-[10px] font-mono text-zinc-500">
                {hoveredItem.item.id} × {hoveredItem.item.count}
              </p>

              {/* Enchantments */}
              {hoveredItem.item.enchantments && (
                <div className="pt-1 space-y-0.5 border-t border-zinc-800">
                  {hoveredItem.item.enchantments.map((e, idx) => (
                    <p key={idx} className="text-[11px] text-cyan-400 font-medium leading-tight">
                      {e.name}
                    </p>
                  ))}
                </div>
              )}

              {/* Durability */}
              {hoveredItem.item.damage !== undefined && (
                <p className="text-[10px] text-zinc-400 pt-1">
                  Damage: <strong className="text-zinc-200">{hoveredItem.item.damage}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


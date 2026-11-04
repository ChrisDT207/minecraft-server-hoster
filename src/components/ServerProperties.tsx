import React, { useEffect, useState } from 'react';
import {
  Save,
  RefreshCw,
  FileText,
  Check,
  AlertCircle,
  Sliders,
  Globe,
  Swords,
  ShieldAlert,
  Dices,
  Copy,
  Search,
  Sparkles,
  Layers,
  HeartCrack,
  Skull,
  Shield,
  Zap,
  Info,
  Gauge,
  Flame,
  Moon,
  Bed,
  Activity,
} from 'lucide-react';
import { ServerConfig } from '../types';

interface ServerPropertiesProps {
  server: ServerConfig;
  onOpenEditModal?: () => void;
  onOpenImportModal?: () => void;
  onServerUpdated?: (updated: ServerConfig) => void;
}

// Sleek segmented toggle pill to prevent native white OS dropdown bugs
const TogglePill: React.FC<{
  enabled: boolean;
  onChange: (val: boolean) => void;
  enabledLabel?: string;
  disabledLabel?: string;
  activeColor?: string;
}> = ({
  enabled,
  onChange,
  enabledLabel = 'Enabled',
  disabledLabel = 'Disabled',
  activeColor = 'bg-emerald-600',
}) => (
  <div className="flex items-center rounded-md bg-[#0a0c12] p-0.5 border border-zinc-800 shrink-0">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
        enabled
          ? `${activeColor} text-white shadow-xs`
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {enabledLabel}
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
        !enabled
          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700/60 shadow-xs'
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {disabledLabel}
    </button>
  </div>
);

export const ServerProperties: React.FC<ServerPropertiesProps> = ({
  server,
  onOpenEditModal,
  onOpenImportModal,
  onServerUpdated,
}) => {
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [initialProperties, setInitialProperties] = useState<Record<string, string>>({});
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<'visual' | 'raw'>('visual');
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'world' | 'gameplay' | 'physics' | 'mobs' | 'network'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSeed, setCopiedSeed] = useState(false);

  // Gamerules state (Minecart speed, random tick speed, keepInventory, etc.)
  const defaultGamerules = {
    minecartMaxSpeed: 8,
    randomTickSpeed: 3,
    playersSleepingPercentage: 100,
    keepInventory: false,
    mobGriefing: true,
    doFireTick: true,
    doInsomnia: true,
    ...(server.gamerules || {}),
  };

  const [gamerules, setGamerules] = useState<Record<string, any>>(defaultGamerules);
  const [initialGamerules, setInitialGamerules] = useState<Record<string, any>>(defaultGamerules);

  const loadProperties = async () => {
    try {
      const data = await window.electronAPI.getServerProperties(server.id);
      setProperties(data);
      setInitialProperties(data);

      const raw = Object.entries(data)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      setRawText(raw);
    } catch (err: any) {
      setErrorMsg('Failed to load server.properties');
    }
  };

  useEffect(() => {
    loadProperties();
    if (server.gamerules) {
      setGamerules((prev) => ({ ...prev, ...server.gamerules }));
      setInitialGamerules((prev) => ({ ...prev, ...server.gamerules }));
    }
  }, [server.id]);

  const handleChange = (key: string, value: string) => {
    setProperties((prev) => {
      const updated = { ...prev, [key]: value };
      const raw = Object.entries(updated)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      setRawText(raw);
      return updated;
    });
  };

  const handleGameruleChange = (rule: string, value: any) => {
    setGamerules((prev) => ({
      ...prev,
      [rule]: value,
    }));
  };

  const handleRawChange = (text: string) => {
    setRawText(text);
    const parsed: Record<string, string> = {};
    const lines = text.split('\n');
    for (const l of lines) {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        parsed[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
    setProperties(parsed);
  };

  const generateRandomSeed = () => {
    const high = Math.floor(Math.random() * 100000000);
    const low = Math.floor(Math.random() * 100000000);
    const sign = Math.random() > 0.5 ? '' : '-';
    const newSeed = `${sign}${high}${low}`;
    handleChange('level-seed', newSeed);
  };

  const copySeedToClipboard = () => {
    const seedVal = properties['level-seed'] || '';
    if (seedVal) {
      navigator.clipboard.writeText(seedVal);
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    }
  };

  const hasUnsavedChanges =
    JSON.stringify(properties) !== JSON.stringify(initialProperties) ||
    JSON.stringify(gamerules) !== JSON.stringify(initialGamerules);

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await window.electronAPI.saveServerProperties(server.id, properties);
      await window.electronAPI.applyGamerules(server.id, gamerules);
      setInitialProperties({ ...properties });
      setInitialGamerules({ ...gamerules });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (onServerUpdated) {
        const fresh = await window.electronAPI.getServer(server.id);
        if (fresh) onServerUpdated(fresh);
      }
    } catch (err: any) {
      setErrorMsg('Failed to save configuration: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setProperties({ ...initialProperties });
    setGamerules({ ...initialGamerules });
    const raw = Object.entries(initialProperties)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    setRawText(raw);
  };

  const matchesSearch = (textToMatch: string) => {
    if (!searchQuery.trim()) return true;
    return textToMatch.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  const currentDifficulty = properties['difficulty'] || 'easy';
  const currentGamemode = properties['gamemode'] || 'survival';
  const isHardcore = properties['hardcore'] === 'true';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090b10] select-none overflow-hidden">
      {/* 1. Action Header */}
      <div className="h-11 px-6 bg-[#0e1119] border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMode('visual')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              mode === 'visual'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Visual Form
          </button>
          <button
            onClick={() => setMode('raw')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center space-x-1 ${
              mode === 'raw'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw server.properties</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <span className="text-[11px] font-medium text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
              Unsaved changes
            </span>
          )}
          {saveSuccess && (
            <span className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/50">
              <Check className="w-3.5 h-3.5" />
              <span>Saved &amp; Synced!</span>
            </span>
          )}
          {errorMsg && (
            <span className="flex items-center space-x-1 text-xs text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded border border-rose-800/50">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </span>
          )}
          {hasUnsavedChanges && (
            <button
              onClick={handleDiscard}
              className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700/60"
              title="Discard unsaved changes"
            >
              Discard
            </button>
          )}
          <button
            onClick={loadProperties}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Reload from disk"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Banner: RAM / Host specs shortcut */}
      {onOpenEditModal && (
        <div className="bg-[#11141c] border-b border-zinc-800/80 px-6 py-2 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-2 text-zinc-400">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Engine Specs: <strong className="text-zinc-200">{server.minRam}MB</strong> min / <strong className="text-zinc-200">{server.maxRam}MB</strong> max RAM • Port: <strong className="text-zinc-200">{server.port}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenEditModal}
            className="text-emerald-400 hover:text-emerald-300 font-medium text-xs hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Adjust RAM &amp; Java Engine &rarr;</span>
          </button>
        </div>
      )}

      {/* 3. Sub-navigation / Search bar (Visual mode only) */}
      {mode === 'visual' && (
        <div className="px-6 py-2.5 bg-[#0b0e14] border-b border-zinc-800/60 flex items-center justify-between gap-4 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1">
            {[
              { id: 'all', label: 'All Settings' },
              { id: 'world', label: 'World & Seed', icon: Globe },
              { id: 'gameplay', label: 'Difficulty & Rules', icon: Swords },
              { id: 'physics', label: 'Speed & Physics', icon: Gauge },
              { id: 'mobs', label: 'Mobs & Spawns', icon: Sparkles },
              { id: 'network', label: 'Network & Limits', icon: ShieldAlert },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-zinc-800 text-emerald-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter settings..."
              className="pl-8 pr-3 py-1 bg-[#131722] border border-zinc-700/80 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500 w-48 font-mono"
            />
          </div>
        </div>
      )}

      {/* 4. Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'raw' ? (
          <div className="p-6 h-full flex flex-col">
            <div className="mb-2 text-xs text-zinc-400 flex items-center justify-between">
              <span>Direct text edit for <code className="text-zinc-300">server.properties</code>:</span>
              <span className="font-mono text-[11px] text-zinc-500">
                {rawText.split('\n').filter(Boolean).length} property lines
              </span>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => handleRawChange(e.target.value)}
              className="flex-1 w-full bg-[#0d0f15] border border-zinc-800 rounded p-4 font-mono text-xs text-zinc-200 leading-relaxed focus:outline-hidden focus:border-emerald-500 resize-none"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-5xl">
            {/* ================= SECTION 1: WORLD & SEED GENERATION ================= */}
            {(activeCategory === 'all' || activeCategory === 'world') &&
              matchesSearch('seed world level-seed level-name level-type structures nether generation') && (
                <div className="p-5 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                    <div className="flex items-center space-x-2 text-zinc-200 font-semibold uppercase tracking-wider text-xs">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>World &amp; Seed Generation</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      level-seed, level-name, level-type
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* WORLD SEED */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
                          <span>World Seed (level-seed)</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono">
                            Key Feature
                          </span>
                        </label>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={generateRandomSeed}
                            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700/60"
                            title="Generate a random Minecraft seed"
                          >
                            <Dices className="w-3.5 h-3.5 text-amber-400" />
                            <span>Randomize Seed</span>
                          </button>
                          {properties['level-seed'] && (
                            <button
                              type="button"
                              onClick={copySeedToClipboard}
                              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700/60"
                              title="Copy seed to clipboard"
                            >
                              {copiedSeed ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-zinc-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <input
                        type="text"
                        value={properties['level-seed'] || ''}
                        onChange={(e) => handleChange('level-seed', e.target.value)}
                        placeholder="Leave blank for random world generation seed..."
                        className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-hidden focus:border-emerald-500"
                      />

                      <div className="mt-2 p-2.5 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 flex items-start space-x-2">
                        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong>Seed Notice:</strong> Changing the world seed applies to newly generated chunks. To generate a <em>completely new world</em> using this seed, change the <strong>World Name</strong> below (e.g. to <code className="text-zinc-300">world-2</code>) or delete the current <code className="text-zinc-300">world/</code> directory in the server files.
                        </p>
                      </div>
                    </div>

                    {/* World Name / Folder and Generator Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/40">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          World Name / Folder (level-name)
                        </label>
                        <input
                          type="text"
                          value={properties['level-name'] || 'world'}
                          onChange={(e) => handleChange('level-name', e.target.value)}
                          placeholder="world"
                          className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                        />
                        <span className="text-[11px] text-zinc-500 block mt-1">
                          The folder name where the world saves. Changing this creates a new fresh world without deleting old worlds.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          World Type (level-type)
                        </label>
                        <select
                          value={properties['level-type'] || 'minecraft:normal'}
                          onChange={(e) => handleChange('level-type', e.target.value)}
                          className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                        >
                          <option value="minecraft:normal" className="bg-[#131722] text-zinc-100">Normal (Standard Minecraft terrain)</option>
                          <option value="minecraft:flat" className="bg-[#131722] text-zinc-100">Flat (Superflat world)</option>
                          <option value="minecraft:large_biomes" className="bg-[#131722] text-zinc-100">Large Biomes (Expanded biomes)</option>
                          <option value="minecraft:amplified" className="bg-[#131722] text-zinc-100">Amplified (Massive mountain heights)</option>
                        </select>
                        <span className="text-[11px] text-zinc-500 block mt-1">
                          Determines terrain generator algorithm for newly created chunks.
                        </span>
                      </div>
                    </div>

                    {/* Structures & Nether */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/40">
                      <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                        <div>
                          <span className="text-xs font-medium text-zinc-200 block">
                            Generate Structures (generate-structures)
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            Spawns villages, mineshafts, temples, and fortresses.
                          </span>
                        </div>
                        <TogglePill
                          enabled={properties['generate-structures'] !== 'false'}
                          onChange={(val) => handleChange('generate-structures', val ? 'true' : 'false')}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                        <div>
                          <span className="text-xs font-medium text-zinc-200 block">
                            Allow Nether Dimension (allow-nether)
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            Enables portals and travel into the Nether world.
                          </span>
                        </div>
                        <TogglePill
                          enabled={properties['allow-nether'] !== 'false'}
                          onChange={(val) => handleChange('allow-nether', val ? 'true' : 'false')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* ================= SECTION 2: DIFFICULTY & GAMEPLAY RULES ================= */}
            {(activeCategory === 'all' || activeCategory === 'gameplay') &&
              matchesSearch('difficulty peaceful easy normal hard hardcore gamemode pvp flight command') && (
                <div className="p-5 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                    <div className="flex items-center space-x-2 text-zinc-200 font-semibold uppercase tracking-wider text-xs">
                      <Swords className="w-4 h-4 text-rose-400" />
                      <span>Difficulty &amp; Core Gameplay Rules</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      difficulty, gamemode, hardcore, pvp
                    </span>
                  </div>

                  {/* DIFFICULTY SELECTOR */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-200">
                        World Difficulty
                      </label>
                      <span className="text-xs font-mono capitalize px-2 py-0.5 rounded border font-bold text-zinc-100 bg-zinc-800 border-zinc-700">
                        Current: {currentDifficulty}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        {
                          id: 'peaceful',
                          name: 'Peaceful',
                          badge: 'No Mobs',
                          color: 'border-zinc-700 hover:border-zinc-500',
                          activeColor: 'bg-zinc-800/80 border-zinc-400 text-white shadow-xs',
                          desc: 'No hostile monsters. Health auto-regenerates rapidly.',
                        },
                        {
                          id: 'easy',
                          name: 'Easy',
                          badge: 'Casual',
                          color: 'border-zinc-800 hover:border-emerald-600',
                          activeColor: 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-xs',
                          desc: 'Monsters spawn but deal low damage. Starvation stops at half health.',
                        },
                        {
                          id: 'normal',
                          name: 'Normal',
                          badge: 'Standard',
                          color: 'border-zinc-800 hover:border-blue-600',
                          activeColor: 'bg-blue-950/70 border-blue-500 text-blue-300 shadow-xs',
                          desc: 'Standard Minecraft balance. Hostile mobs deal standard damage.',
                        },
                        {
                          id: 'hard',
                          name: 'Hard',
                          badge: 'Challenging',
                          color: 'border-zinc-800 hover:border-rose-600',
                          activeColor: 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-xs',
                          desc: 'Severe damage, zombies break wooden doors, starvation can kill.',
                        },
                      ].map((d) => {
                        const isSelected = currentDifficulty === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handleChange('difficulty', d.id)}
                            className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                              isSelected ? d.activeColor : `bg-[#0d0f15] text-zinc-400 ${d.color}`
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold capitalize">{d.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <p className="text-[11px] leading-tight text-zinc-400">{d.desc}</p>
                            </div>
                            <span className="mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 self-start">
                              {d.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DEFAULT GAMEMODE */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800/40">
                    <label className="text-xs font-semibold text-zinc-200 block">
                      Default Player Gamemode
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'survival', name: 'Survival', desc: 'Gather resources, craft, and survive' },
                        { id: 'creative', name: 'Creative', desc: 'Unlimited blocks, fly and instant break' },
                        { id: 'adventure', name: 'Adventure', desc: 'Custom maps, blocks cannot be broken' },
                        { id: 'spectator', name: 'Spectator', desc: 'Fly through blocks as a ghost' },
                      ].map((gm) => {
                        const isSelected = currentGamemode === gm.id;
                        return (
                          <button
                            key={gm.id}
                            type="button"
                            onClick={() => handleChange('gamemode', gm.id)}
                            className={`p-2.5 rounded border text-left transition-colors ${
                              isSelected
                                ? 'bg-emerald-950/60 border-emerald-500 text-white font-semibold'
                                : 'bg-[#0d0f15] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold capitalize">{gm.name}</span>
                              {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                            </div>
                            <span className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                              {gm.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hardcore Mode & PvP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/40">
                    {/* Hardcore */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                      <div>
                        <span className="text-xs font-semibold text-rose-300 flex items-center space-x-1.5">
                          <Skull className="w-3.5 h-3.5 text-rose-400" />
                          <span>Hardcore Mode (hardcore)</span>
                        </span>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          One life only; locks server to Hard difficulty. Players are banned/spectate upon death.
                        </span>
                      </div>
                      <TogglePill
                        enabled={isHardcore}
                        onChange={(val) => {
                          handleChange('hardcore', val ? 'true' : 'false');
                          if (val) handleChange('difficulty', 'hard');
                        }}
                        activeColor="bg-rose-600"
                      />
                    </div>

                    {/* PvP */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                      <div>
                        <span className="text-xs font-medium text-zinc-200 block">
                          Player vs Player (pvp)
                        </span>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          Allows players to attack and deal damage to each other.
                        </span>
                      </div>
                      <TogglePill
                        enabled={properties['pvp'] !== 'false'}
                        onChange={(val) => handleChange('pvp', val ? 'true' : 'false')}
                      />
                    </div>

                    {/* Allow Flight */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                      <div>
                        <span className="text-xs font-medium text-zinc-200 block">
                          Allow Survival Flying (allow-flight)
                        </span>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          Prevents kicking players when flying with Elytra, jetpacks, or mods.
                        </span>
                      </div>
                      <TogglePill
                        enabled={properties['allow-flight'] === 'true'}
                        onChange={(val) => handleChange('allow-flight', val ? 'true' : 'false')}
                      />
                    </div>

                    {/* Command Blocks */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                      <div>
                        <span className="text-xs font-medium text-zinc-200 block">
                          Command Blocks (enable-command-block)
                        </span>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          Enables execution of redstone command blocks.
                        </span>
                      </div>
                      <TogglePill
                        enabled={properties['enable-command-block'] !== 'false'}
                        onChange={(val) => handleChange('enable-command-block', val ? 'true' : 'false')}
                      />
                    </div>
                  </div>
                </div>
              )}

            {/* ================= SECTION 3: MINECART SPEED, TICK SPEED & PHYSICS ================= */}
            {(activeCategory === 'all' || activeCategory === 'physics') &&
              matchesSearch('minecart speed tick rate randomtickspeed keepinventory sleep griefing fire insomnia') && (
                <div className="p-5 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                    <div className="flex items-center space-x-2 text-zinc-200 font-semibold uppercase tracking-wider text-xs">
                      <Gauge className="w-4 h-4 text-amber-400" />
                      <span>Speed, Physics &amp; Gameplay Gamerules</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      minecartMaxSpeed, randomTickSpeed, keepInventory
                    </span>
                  </div>

                  {/* 1. Minecart Max Speed */}
                  <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
                          <Gauge className="w-3.5 h-3.5 text-amber-400" />
                          <span>Minecart Max Speed (minecartMaxSpeed)</span>
                        </span>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          Maximum velocity of minecarts in blocks/sec (Minecraft 1.21.2+ &amp; Paper). Vanilla default is 8.
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          value={gamerules.minecartMaxSpeed ?? 8}
                          onChange={(e) => handleGameruleChange('minecartMaxSpeed', Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-[#131722] border border-zinc-700 rounded text-right font-mono text-amber-400 font-bold text-xs"
                        />
                        <span className="text-xs font-mono text-zinc-400">m/s</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={8}
                      max={128}
                      step={8}
                      value={Math.min(128, gamerules.minecartMaxSpeed ?? 8)}
                      onChange={(e) => handleGameruleChange('minecartMaxSpeed', Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
                    />

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-zinc-500 mr-1">Presets:</span>
                      {[
                        { val: 8, label: '8 (Vanilla)' },
                        { val: 16, label: '16 (2x Speed)' },
                        { val: 32, label: '32 (4x Speed)' },
                        { val: 64, label: '64 (Fast)' },
                        { val: 128, label: '128 (Hyper)' },
                        { val: 1000, label: '1000 (Max Rocket)' },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => handleGameruleChange('minecartMaxSpeed', preset.val)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                            gamerules.minecartMaxSpeed === preset.val
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Random Tick Speed & Max Tick Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Random Tick Speed */}
                    <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-zinc-200 block">
                            Random Tick Speed (randomTickSpeed)
                          </span>
                          <span className="text-[11px] text-zinc-500 block mt-0.5">
                            Controls rate of crop growth, tree growth &amp; leaf decay.
                          </span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={500}
                          value={gamerules.randomTickSpeed ?? 3}
                          onChange={(e) => handleGameruleChange('randomTickSpeed', Number(e.target.value))}
                          className="w-16 px-2 py-1 bg-[#131722] border border-zinc-700 rounded text-right font-mono text-emerald-400 font-bold text-xs"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-zinc-500 mr-1">Presets:</span>
                        {[
                          { val: 0, label: '0 (Frozen)' },
                          { val: 3, label: '3 (Default)' },
                          { val: 10, label: '10 (3x)' },
                          { val: 20, label: '20 (6x)' },
                          { val: 50, label: '50 (Fast Crop)' },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => handleGameruleChange('randomTickSpeed', preset.val)}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                              gamerules.randomTickSpeed === preset.val
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Max Tick Time (Watchdog lag protector) */}
                    <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-lg space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-zinc-200 block">
                          Watchdog Max Tick Time (max-tick-time)
                        </span>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          Maximum milliseconds before watchdog crashes a lagging server.
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 pt-1">
                        {[
                          { val: '60000', label: '60s (Default)' },
                          { val: '120000', label: '120s (Generous)' },
                          { val: '-1', label: 'Disabled (Never crash)' },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => handleChange('max-tick-time', preset.val)}
                            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                              (properties['max-tick-time'] || '60000') === preset.val
                                ? 'bg-blue-950/80 text-blue-300 border-blue-600 font-bold'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. Common Multiplayer Rules (Keep Inventory, 1-Player Sleep, Mob Griefing, Fire) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/40">
                    {/* Keep Inventory */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                      <div>
                        <span className="text-xs font-medium text-zinc-200 block">
                          Keep Inventory on Death (keepInventory)
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Players retain items and XP upon dying instead of dropping them.
                        </span>
                      </div>
                      <TogglePill
                        enabled={!!gamerules.keepInventory}
                        onChange={(val) => handleGameruleChange('keepInventory', val)}
                      />
                    </div>

                    {/* 1-Player Sleep */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                      <div>
                        <span className="text-xs font-medium text-zinc-200 block">
                          One-Player Sleep (playersSleepingPercentage)
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Allows just 1 player sleeping in a bed to skip the night to morning.
                        </span>
                      </div>
                      <TogglePill
                        enabled={Number(gamerules.playersSleepingPercentage ?? 100) <= 1}
                        onChange={(val) => handleGameruleChange('playersSleepingPercentage', val ? 0 : 100)}
                        enabledLabel="1 Player"
                        disabledLabel="All Players"
                      />
                    </div>

                    {/* Mob Griefing */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                      <div>
                        <span className="text-xs font-medium text-zinc-200 block">
                          Mob Griefing (mobGriefing)
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Creepers destroy blocks &amp; Endermen steal blocks.
                        </span>
                      </div>
                      <TogglePill
                        enabled={gamerules.mobGriefing !== false}
                        onChange={(val) => handleGameruleChange('mobGriefing', val)}
                      />
                    </div>

                    {/* Fire Spread */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                      <div>
                        <span className="text-xs font-medium text-zinc-200 block">
                          Fire Spread (doFireTick)
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Fire spreads and destroys wooden structures.
                        </span>
                      </div>
                      <TogglePill
                        enabled={gamerules.doFireTick !== false}
                        onChange={(val) => handleGameruleChange('doFireTick', val)}
                      />
                    </div>

                    {/* Phantoms / Insomnia */}
                    <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded">
                      <div>
                        <span className="text-xs font-medium text-zinc-200 block">
                          Phantom Attacks (doInsomnia)
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Phantoms spawn when players haven't slept for 3 in-game days.
                        </span>
                      </div>
                      <TogglePill
                        enabled={gamerules.doInsomnia !== false}
                        onChange={(val) => handleGameruleChange('doInsomnia', val)}
                      />
                    </div>
                  </div>
                </div>
              )}

            {/* ================= SECTION 4: MOBS & ENTITY SPAWNING ================= */}
            {(activeCategory === 'all' || activeCategory === 'mobs') &&
              matchesSearch('mobs spawn monsters animals npcs villagers hostile') && (
                <div className="p-5 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                    <div className="flex items-center space-x-2 text-zinc-200 font-semibold uppercase tracking-wider text-xs">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Mobs &amp; Entity Spawning Rules</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      spawn-monsters, spawn-animals, spawn-npcs
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Spawn Monsters */}
                    <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-200 block">
                          Hostile Monsters
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Zombies, skeletons, creepers, etc.
                        </span>
                      </div>
                      <TogglePill
                        enabled={properties['spawn-monsters'] !== 'false'}
                        onChange={(val) => handleChange('spawn-monsters', val ? 'true' : 'false')}
                      />
                    </div>

                    {/* Spawn Animals */}
                    <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-200 block">
                          Passive Animals
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Cows, pigs, sheep, chickens.
                        </span>
                      </div>
                      <TogglePill
                        enabled={properties['spawn-animals'] !== 'false'}
                        onChange={(val) => handleChange('spawn-animals', val ? 'true' : 'false')}
                      />
                    </div>

                    {/* Spawn NPCs */}
                    <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-200 block">
                          Villagers &amp; NPCs
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Trading villagers in villages.
                        </span>
                      </div>
                      <TogglePill
                        enabled={properties['spawn-npcs'] !== 'false'}
                        onChange={(val) => handleChange('spawn-npcs', val ? 'true' : 'false')}
                      />
                    </div>
                  </div>
                </div>
              )}

            {/* ================= SECTION 5: NETWORK, SECURITY & LIMITS ================= */}
            {(activeCategory === 'all' || activeCategory === 'network') &&
              matchesSearch('network port online-mode max-players whitelist view-distance motd security') && (
                <div className="p-5 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                    <div className="flex items-center space-x-2 text-zinc-200 font-semibold uppercase tracking-wider text-xs">
                      <ShieldAlert className="w-4 h-4 text-blue-400" />
                      <span>Network, Limits &amp; Security Settings</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      motd, server-port, online-mode, max-players
                    </span>
                  </div>

                  {/* MOTD */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Server MOTD (Message of the Day)
                    </label>
                    <input
                      type="text"
                      value={properties['motd'] || properties['server-name'] || ''}
                      onChange={(e) => {
                        handleChange('motd', e.target.value);
                        handleChange('server-name', e.target.value);
                      }}
                      placeholder="A Minecraft Server"
                      className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      The title &amp; description displayed in the Minecraft multiplayer server list.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/40">
                    {/* Online Mode / TLauncher */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Online Mode (Authentication)
                      </label>
                      <select
                        value={properties['online-mode'] || 'true'}
                        onChange={(e) => handleChange('online-mode', e.target.value)}
                        className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                      >
                        <option value="true" className="bg-[#131722] text-zinc-100">True (Official Mojang/Microsoft Accounts only)</option>
                        <option value="false" className="bg-[#131722] text-zinc-100">False (Allow TLauncher &amp; Offline Accounts)</option>
                      </select>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Set to False to allow cracked / offline clients to join your server.
                      </p>
                    </div>

                    {/* Server Port */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Server Port
                      </label>
                      <input
                        type="number"
                        value={properties['server-port'] || '25565'}
                        onChange={(e) => handleChange('server-port', e.target.value)}
                        className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">Default Java: 25565, Bedrock: 19132.</p>
                    </div>

                    {/* Max Players */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Max Player Slots (max-players)
                      </label>
                      <input
                        type="number"
                        value={properties['max-players'] || '20'}
                        onChange={(e) => handleChange('max-players', e.target.value)}
                        className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    {/* Whitelist */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Enforce Whitelist (white-list)
                      </label>
                      <select
                        value={properties['white-list'] || 'false'}
                        onChange={(e) => handleChange('white-list', e.target.value)}
                        className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                      >
                        <option value="false" className="bg-[#131722] text-zinc-100">Disabled (Open to all)</option>
                        <option value="true" className="bg-[#131722] text-zinc-100">Enabled (Only whitelisted players)</option>
                      </select>
                    </div>

                    {/* View Distance */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        View Distance (Chunks)
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={32}
                        value={properties['view-distance'] || '10'}
                        onChange={(e) => handleChange('view-distance', e.target.value)}
                        className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    {/* Simulation Distance */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Simulation Distance (Chunks)
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={32}
                        value={properties['simulation-distance'] || '10'}
                        onChange={(e) => handleChange('simulation-distance', e.target.value)}
                        className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    {/* Spawn Protection */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Spawn Protection Radius (Blocks)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={properties['spawn-protection'] || '16'}
                        onChange={(e) => handleChange('spawn-protection', e.target.value)}
                        className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                      />
                      <span className="text-[11px] text-zinc-500 block mt-1">
                        Set to 0 to disable spawn area protection for non-OPs.
                      </span>
                    </div>

                    {/* Force Gamemode */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Force Default Gamemode (force-gamemode)
                      </label>
                      <select
                        value={properties['force-gamemode'] || 'false'}
                        onChange={(e) => handleChange('force-gamemode', e.target.value)}
                        className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                      >
                        <option value="false" className="bg-[#131722] text-zinc-100">Disabled (Remember player's last gamemode)</option>
                        <option value="true" className="bg-[#131722] text-zinc-100">Enabled (Force default gamemode on rejoin)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

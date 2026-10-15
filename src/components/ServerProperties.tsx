import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, FileText, Check, AlertCircle, Sliders } from 'lucide-react';
import { ServerConfig } from '../types';

interface ServerPropertiesProps {
  server: ServerConfig;
  onOpenEditModal?: () => void;
}

export const ServerProperties: React.FC<ServerPropertiesProps> = ({ server, onOpenEditModal }) => {
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<'visual' | 'raw'>('visual');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadProperties = async () => {
    try {
      const data = await window.electronAPI.getServerProperties(server.id);
      setProperties(data);

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

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await window.electronAPI.saveServerProperties(server.id, properties);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setErrorMsg('Failed to save server.properties');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090b10] select-none">
      {/* Action Header */}
      <div className="h-11 px-6 bg-[#0e1119] border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMode('visual')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              mode === 'visual'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Visual Form
          </button>
          <button
            onClick={() => setMode('raw')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center space-x-1 ${
              mode === 'raw'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw server.properties</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {saveSuccess && (
            <span className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/50">
              <Check className="w-3.5 h-3.5" />
              <span>Saved! Restart server to apply.</span>
            </span>
          )}
          {errorMsg && (
            <span className="flex items-center space-x-1 text-xs text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded border border-rose-800/50">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </span>
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

      {/* Engine & Host Settings Banner */}
      {onOpenEditModal && (
        <div className="bg-[#11141c] border-b border-zinc-800/80 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-zinc-400">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Engine Allocation: <strong className="text-zinc-200">{server.minRam}MB</strong> min / <strong className="text-zinc-200">{server.maxRam}MB</strong> max RAM • Port: <strong className="text-zinc-200">{server.port}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenEditModal}
            className="text-emerald-400 hover:text-emerald-300 font-medium text-xs hover:underline flex items-center space-x-1"
          >
            <span>Adjust RAM, Port &amp; Java Specs &rarr;</span>
          </button>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {mode === 'raw' ? (
          <textarea
            value={rawText}
            onChange={(e) => handleRawChange(e.target.value)}
            className="w-full h-full bg-[#11141c] border border-zinc-800 p-4 rounded-lg font-mono text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/80 resize-none"
            spellCheck={false}
          />
        ) : (
          <div className="max-w-3xl space-y-5">
            {/* MOTD */}
            <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800 space-y-2">
              <label className="block text-xs font-semibold text-zinc-200 uppercase tracking-wide">
                Server MOTD (Message of the Day)
              </label>
              <input
                type="text"
                value={properties['motd'] || ''}
                onChange={(e) => handleChange('motd', e.target.value)}
                placeholder="A Minecraft Server"
                className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-zinc-500">
                The description displayed in the Minecraft multiplayer server list.
              </p>
            </div>

            {/* Core Gameplay Grid */}
            <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wide">
                Gameplay Rules
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gamemode */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Default Gamemode
                  </label>
                  <select
                    value={properties['gamemode'] || 'survival'}
                    onChange={(e) => handleChange('gamemode', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="survival">Survival</option>
                    <option value="creative">Creative</option>
                    <option value="adventure">Adventure</option>
                    <option value="spectator">Spectator</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={properties['difficulty'] || 'easy'}
                    onChange={(e) => handleChange('difficulty', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="peaceful">Peaceful</option>
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* PvP */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Player vs Player (PvP)
                  </label>
                  <select
                    value={properties['pvp'] || 'true'}
                    onChange={(e) => handleChange('pvp', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>

                {/* Command Blocks */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Command Blocks
                  </label>
                  <select
                    value={properties['enable-command-block'] || 'true'}
                    onChange={(e) => handleChange('enable-command-block', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Network & Players Grid */}
            <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wide">
                Network &amp; Security
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Online Mode / TLauncher */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Online Mode (Authentication)
                  </label>
                  <select
                    value={properties['online-mode'] || 'true'}
                    onChange={(e) => handleChange('online-mode', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="true">True (Official Mojang/Microsoft Accounts only)</option>
                    <option value="false">False (Allow TLauncher &amp; Offline Accounts)</option>
                  </select>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Set to &quot;False&quot; to allow cracked / TLauncher players to join.
                  </p>
                </div>

                {/* Server Port */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Server Port
                  </label>
                  <input
                    type="number"
                    value={properties['server-port'] || '25565'}
                    onChange={(e) => handleChange('server-port', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Default Java: 25565, Bedrock: 19132.</p>
                </div>

                {/* Max Players */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Max Player Slots
                  </label>
                  <input
                    type="number"
                    value={properties['max-players'] || '20'}
                    onChange={(e) => handleChange('max-players', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Whitelist */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Enforce Whitelist
                  </label>
                  <select
                    value={properties['white-list'] || 'false'}
                    onChange={(e) => handleChange('white-list', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="false">Disabled (Open to all)</option>
                    <option value="true">Enabled (Only whitelisted players)</option>
                  </select>
                </div>

                {/* View Distance */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    View Distance (Chunks)
                  </label>
                  <input
                    type="number"
                    value={properties['view-distance'] || '10'}
                    onChange={(e) => handleChange('view-distance', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Simulation Distance */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Simulation Distance (Chunks)
                  </label>
                  <input
                    type="number"
                    value={properties['simulation-distance'] || '10'}
                    onChange={(e) => handleChange('simulation-distance', e.target.value)}
                    className="w-full bg-[#0d0f15] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

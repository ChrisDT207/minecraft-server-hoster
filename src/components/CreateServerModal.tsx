import React, { useEffect, useState } from 'react';
import {
  X,
  Server,
  Cpu,
  ShieldCheck,
  Check,
  Loader2,
  HardDrive,
  Info,
  Layers,
} from 'lucide-react';
import {
  ServerEdition,
  ServerLoader,
  VersionOption,
  LoaderVersionOption,
  ServerConfig,
} from '../types';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerCreated: (server: ServerConfig) => void;
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen,
  onClose,
  onServerCreated,
}) => {
  // Form fields
  const [name, setName] = useState('My Minecraft Server');
  const [id, setId] = useState('mc-server-1');
  const [edition, setEdition] = useState<ServerEdition>('java');
  const [loader, setLoader] = useState<ServerLoader>('paper');
  const [version, setVersion] = useState<string>('');
  const [loaderVersion, setLoaderVersion] = useState<string>('');
  const [ramGb, setRamGb] = useState<number>(4);
  const [port, setPort] = useState<number>(25565);
  const [eulaAccepted, setEulaAccepted] = useState<boolean>(true);
  const [allowOffline, setAllowOffline] = useState<boolean>(false);
  const [skinRestorer, setSkinRestorer] = useState<boolean>(true);

  // Dynamic live versions
  const [gameVersions, setGameVersions] = useState<VersionOption[]>([]);
  const [loaderVersions, setLoaderVersions] = useState<LoaderVersionOption[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingLoaders, setLoadingLoaders] = useState(false);

  // Creation & Provisioning status
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-slug ID from name
  const handleNameChange = (val: string) => {
    setName(val);
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setId(slug || 'server');
  };

  // Fetch live game versions whenever edition or loader changes
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    const fetchVersions = async () => {
      setLoadingVersions(true);
      setErrorMsg(null);
      try {
        const list = await window.electronAPI.fetchMinecraftVersions(edition, loader);
        if (!isCancelled) {
          setGameVersions(list);
          if (list.length > 0) {
            setVersion(list[0].id);
          }
        }
      } catch (err: any) {
        if (!isCancelled) setErrorMsg(`Failed to fetch live versions: ${err.message}`);
      } finally {
        if (!isCancelled) setLoadingVersions(false);
      }
    };

    fetchVersions();

    return () => {
      isCancelled = true;
    };
  }, [edition, loader, isOpen]);

  // Fetch loader versions (e.g. Fabric, Forge, NeoForge)
  useEffect(() => {
    if (!isOpen || !version || loader === 'vanilla' || loader === 'paper' || edition === 'bedrock') {
      setLoaderVersions([]);
      setLoaderVersion('');
      return;
    }

    let isCancelled = false;

    const fetchLoaders = async () => {
      setLoadingLoaders(true);
      try {
        const list = await window.electronAPI.fetchLoaderVersions(loader, version);
        if (!isCancelled) {
          setLoaderVersions(list);
          if (list.length > 0) {
            setLoaderVersion(list[0].version);
          }
        }
      } catch {
        // Ignored
      } finally {
        if (!isCancelled) setLoadingLoaders(false);
      }
    };

    fetchLoaders();

    return () => {
      isCancelled = true;
    };
  }, [loader, version, isOpen, edition]);

  // Adjust defaults when edition changes
  const handleEditionChange = (newEdition: ServerEdition) => {
    setEdition(newEdition);
    if (newEdition === 'bedrock') {
      setLoader('bedrock');
      setPort(19132);
    } else {
      setLoader('paper');
      setPort(25565);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !id || !version) return;

    setIsCreating(true);
    setErrorMsg(null);
    setStatusMessage('Scaffolding directory & downloading server binaries...');

    try {
      const created = await window.electronAPI.createServer({
        id,
        name,
        edition,
        loader,
        version,
        loaderVersion: loaderVersion || undefined,
        port: Number(port) || (edition === 'bedrock' ? 19132 : 25565),
        minRam: Math.round((ramGb * 1024) / 2),
        maxRam: Math.round(ramGb * 1024),
        allowOffline,
        skinRestorer: allowOffline && skinRestorer,
        eulaAccepted,
      });

      onServerCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Server creation failed');
    } finally {
      setIsCreating(false);
      setStatusMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#0e1119] border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="h-12 px-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-zinc-100">
              Create New Minecraft Server
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* 1. Name and ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Server Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Survival SMP"
                required
                className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Folder ID (auto-slugged)
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="survival-smp"
                required
                className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 2. Edition Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Edition
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleEditionChange('java')}
                className={`p-3 rounded border text-left flex flex-col space-y-1 transition-colors ${
                  edition === 'java'
                    ? 'bg-emerald-950/30 border-emerald-500 text-white'
                    : 'bg-[#131722] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Java Edition</span>
                  {edition === 'java' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Vanilla, Paper plugins, Fabric, Forge &amp; NeoForge mods.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleEditionChange('bedrock')}
                className={`p-3 rounded border text-left flex flex-col space-y-1 transition-colors ${
                  edition === 'bedrock'
                    ? 'bg-emerald-950/30 border-emerald-500 text-white'
                    : 'bg-[#131722] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Bedrock Edition (BDS)</span>
                  {edition === 'bedrock' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Official Mojang Bedrock Dedicated Server (Windows/Mobile/Console).
                </p>
              </button>
            </div>
          </div>

          {/* 3. Loader Selector (Java only) */}
          {edition === 'java' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Server Software / Mod Loader
              </label>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {[
                  { id: 'paper', name: 'PaperMC', desc: 'High performance plugins' },
                  { id: 'fabric', name: 'Fabric', desc: 'Lightweight modern mods' },
                  { id: 'neoforge', name: 'NeoForge', desc: 'Next-gen modding' },
                  { id: 'forge', name: 'Forge', desc: 'Classic mod loader' },
                  { id: 'vanilla', name: 'Vanilla', desc: 'Official Mojang server' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLoader(item.id as ServerLoader)}
                    className={`p-2.5 rounded border text-center flex flex-col items-center justify-center space-y-0.5 transition-colors ${
                      loader === item.id
                        ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#131722] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className="text-[10px] text-zinc-500 line-clamp-1">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Live Version Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                <span>Minecraft Version (Live Manifest)</span>
                {loadingVersions && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
              </label>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={loadingVersions || gameVersions.length === 0}
                className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                {gameVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id} {v.type === 'snapshot' ? '(Snapshot/Beta)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Loader Version if applicable */}
            {(loader === 'fabric' || loader === 'forge' || loader === 'neoforge') && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                  <span>{loader} Version</span>
                  {loadingLoaders && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
                </label>
                <select
                  value={loaderVersion}
                  onChange={(e) => setLoaderVersion(e.target.value)}
                  disabled={loadingLoaders || loaderVersions.length === 0}
                  className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  {loaderVersions.map((lv) => (
                    <option key={lv.version} value={lv.version}>
                      {lv.version} {lv.stable ? '(Recommended)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Port */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10))}
                className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 5. RAM Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-zinc-300">
                RAM Allocation: {ramGb} GB ({ramGb * 1024} MB)
              </label>
              <div className="flex space-x-1.5">
                {[2, 4, 6, 8, 12, 16].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setRamGb(g)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                      ramGb === g
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {g}GB
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={32}
              step={1}
              value={ramGb}
              onChange={(e) => setRamGb(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* 6. Offline / TLauncher Toggle & SkinRestorer */}
          <div className="p-4 bg-[#131722] border border-zinc-800 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">
                  Allow Offline / TLauncher Clients
                </span>
                <span className="text-[11px] text-zinc-400">
                  Sets <code className="text-amber-400 font-mono">online-mode=false</code> so non-premium/cracked players can connect.
                </span>
              </div>
              <input
                type="checkbox"
                checked={allowOffline}
                onChange={(e) => setAllowOffline(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 cursor-pointer"
              />
            </div>

            {allowOffline && edition === 'java' && (
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-300 block">
                    Install SkinRestorer Plugin
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Fixes missing skins for offline players and allows custom skin setting via /skin command.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={skinRestorer}
                  onChange={(e) => setSkinRestorer(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* 7. EULA Agreement */}
          <div className="flex items-center space-x-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              id="eula-check"
              checked={eulaAccepted}
              onChange={(e) => setEulaAccepted(e.target.checked)}
              required
              className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="eula-check" className="cursor-pointer">
              I accept the official{' '}
              <a
                href="https://www.minecraft.net/en-us/eula"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Minecraft End User License Agreement (EULA)
              </a>
            </label>
          </div>

          {/* Provisioning status progress indicator */}
          {isCreating && (
            <div className="p-3 bg-zinc-900 border border-emerald-500/40 rounded flex items-center space-x-3 text-xs text-zinc-300">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name || !id || !version}
              className="px-5 py-2 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning Server...</span>
                </>
              ) : (
                <span>Create &amp; Provision Server</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Download,
  Trash2,
  UploadCloud,
  Check,
  Package,
  Layers,
  AlertCircle,
  ExternalLink,
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ServerConfig, ModItem, ModrinthHit } from '../types';

interface ModManagerProps {
  server: ServerConfig;
}

export const ModManager: React.FC<ModManagerProps> = ({ server }) => {
  const isPlugin = server.loader === 'paper';
  const typeLabel = isPlugin ? 'Plugin' : 'Mod';

  const [activeSubTab, setActiveSubTab] = useState<'installed' | 'search'>('installed');
  const [installedMods, setInstalledMods] = useState<ModItem[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);

  // Multi-selection state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ModrinthHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const selectAllRef = useRef<HTMLInputElement>(null);

  const loadInstalled = async () => {
    setLoadingInstalled(true);
    try {
      const items = await window.electronAPI.listMods(server.id);
      setInstalledMods(items);
      // Clean up selected files that were removed
      const currentNames = new Set(items.map((i) => i.filename));
      setSelectedFiles((prev) => {
        const next = new Set<string>();
        for (const name of prev) {
          if (currentNames.has(name)) next.add(name);
        }
        return next;
      });
    } catch {
      // Ignored
    } finally {
      setLoadingInstalled(false);
    }
  };

  useEffect(() => {
    loadInstalled();
  }, [server.id]);

  // Sync indeterminate state for the "Select All" checkbox
  const isAllSelected = installedMods.length > 0 && selectedFiles.size === installedMods.length;
  const isSomeSelected = selectedFiles.size > 0 && selectedFiles.size < installedMods.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  // Selection handlers
  const handleToggleSelect = (filename: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(installedMods.map((m) => m.filename)));
    }
  };

  const handleToggle = async (filename: string, currentEnabled: boolean) => {
    await window.electronAPI.toggleMod(server.id, filename, !currentEnabled);
    loadInstalled();
  };

  const handleDelete = async (filename: string) => {
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
      await window.electronAPI.deleteMod(server.id, filename);
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
      loadInstalled();
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    const count = selectedFiles.size;
    if (confirm(`Are you sure you want to delete ${count} selected ${typeLabel.toLowerCase()}(s)?\nThis cannot be undone.`)) {
      await window.electronAPI.deleteMultipleMods(server.id, Array.from(selectedFiles));
      setSelectedFiles(new Set());
      setActionNotice(`Deleted ${count} ${typeLabel.toLowerCase()}(s).`);
      loadInstalled();
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const paths: string[] = [];
    for (const f of files) {
      let p = '';
      if (window.electronAPI.getPathForFile) {
        p = window.electronAPI.getPathForFile(f);
      }
      if (!p && (f as any).path) {
        p = (f as any).path;
      }
      if (p && (p.toLowerCase().endsWith('.jar') || p.toLowerCase().endsWith('.mcpack') || p.toLowerCase().endsWith('.zip'))) {
        paths.push(p);
      }
    }

    if (paths.length === 0) {
      setActionNotice('Please drop valid .jar or .mcpack files.');
      return;
    }

    setActionNotice(`Adding ${paths.length} file(s)...`);
    const ok = await window.electronAPI.uploadMod(server.id, paths);
    if (ok) {
      setActionNotice(`Successfully added ${paths.length} file(s)!`);
      loadInstalled();
    } else {
      setActionNotice('Failed to upload dropped file(s).');
    }
  };

  const handleUploadClick = async () => {
    const success = await window.electronAPI.uploadMod(server.id);
    if (success) {
      loadInstalled();
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSearching(true);
    setActionNotice(null);
    try {
      const hits = await window.electronAPI.searchModrinth(
        searchQuery,
        server.loader,
        server.version,
        isPlugin ? 'plugin' : 'mod'
      );
      setSearchResults(hits);
    } catch (err: any) {
      setActionNotice(`Search error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInstallProject = async (hit: ModrinthHit) => {
    setInstallingId(hit.project_id);
    setActionNotice(null);
    try {
      const res = await window.electronAPI.installModrinthProject(
        server.id,
        hit.project_id
      );
      if (res.success) {
        setActionNotice(`Successfully installed "${hit.title}" (${res.filename})!`);
        loadInstalled();
      } else {
        setActionNotice(`Failed to install: ${res.error || 'No compatible build found'}`);
      }
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    } finally {
      setInstallingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full bg-[#090b10] select-none relative"
    >
      {/* Sub-tab navigation */}
      <div className="h-11 px-6 bg-[#0e1119] border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('installed')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeSubTab === 'installed'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Installed {typeLabel}s ({installedMods.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('search');
              if (searchResults.length === 0) handleSearch();
            }}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeSubTab === 'search'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Browse Modrinth</span>
          </button>
        </div>

        {/* Upload or Notice */}
        <div className="flex items-center space-x-3">
          {actionNotice && (
            <span className="text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center space-x-1">
              <span>{actionNotice}</span>
            </span>
          )}
          <button
            onClick={handleUploadClick}
            className="flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700/60"
            title={`Select .jar files to copy into /${isPlugin ? 'plugins' : 'mods'}`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload .jar</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSubTab === 'installed' ? (
          <div className="space-y-4">
            {/* Drag & Drop Zone */}
            <div
              onClick={handleUploadClick}
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-950/30 scale-[1.008] shadow-lg shadow-emerald-500/10'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40'
              }`}
            >
              <UploadCloud
                className={`w-8 h-8 mb-2 transition-colors ${
                  isDragging ? 'text-emerald-400 animate-bounce' : 'text-zinc-500'
                }`}
              />
              <p className={`text-xs font-medium ${isDragging ? 'text-emerald-300' : 'text-zinc-300'}`}>
                {isDragging
                  ? `Drop files here to install into /${isPlugin ? 'plugins' : 'mods'}`
                  : `Drag and drop .${isPlugin ? 'jar' : 'jar / .mcpack'} files here or click to browse`}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Target: /servers/{server.id}/{isPlugin ? 'plugins' : 'mods'}/
              </p>
            </div>

            {/* Multi-Selection Action Bar (Shown when items are selected) */}
            {selectedFiles.size > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex items-center justify-between shadow-sm animate-fadeIn">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-semibold text-emerald-400">
                    {selectedFiles.size} of {installedMods.length} selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedFiles(new Set())}
                    className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedFiles.size})</span>
                  </button>
                </div>
              </div>
            )}

            {/* List Table */}
            {installedMods.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No {typeLabel.toLowerCase()}s installed yet. Browse Modrinth or drop .jar files above.
              </div>
            ) : (
              <div className="bg-[#11141c] border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                      {/* Select All Checkbox */}
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                          title={isAllSelected ? 'Deselect all' : 'Select all'}
                        />
                      </th>
                      <th className="py-2.5 px-3 w-20 text-center">Enabled</th>
                      <th className="py-2.5 px-4">Filename</th>
                      <th className="py-2.5 px-4 w-28">Size</th>
                      <th className="py-2.5 px-4 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {installedMods.map((mod) => {
                      const isSelected = selectedFiles.has(mod.filename);
                      return (
                        <tr
                          key={mod.filename}
                          className={`transition-colors ${
                            isSelected ? 'bg-zinc-850/80' : 'hover:bg-zinc-850/40'
                          }`}
                        >
                          {/* Row Selection Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(mod.filename)}
                              className="rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                              title="Select for batch action"
                            />
                          </td>

                          {/* Enable/Disable Toggle */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleToggle(mod.filename, mod.enabled)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                                mod.enabled
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900'
                                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700/60 hover:bg-zinc-750'
                              }`}
                              title={mod.enabled ? 'Click to disable (.disabled)' : 'Click to enable'}
                            >
                              {mod.enabled ? 'ON' : 'OFF'}
                            </button>
                          </td>

                          {/* Filename */}
                          <td className="py-2.5 px-4 font-mono">
                            <span className={mod.enabled ? 'text-zinc-200' : 'text-zinc-500 line-through'}>
                              {mod.filename}
                            </span>
                          </td>

                          {/* Size */}
                          <td className="py-2.5 px-4 font-mono text-zinc-500">
                            {formatFileSize(mod.size)}
                          </td>

                          {/* Individual Delete Action */}
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => handleDelete(mod.filename)}
                              className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                              title={`Delete ${mod.filename}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Modrinth Search Tab */
          <div className="space-y-4">
            {/* Search Input Bar */}
            <form onSubmit={handleSearch} className="flex items-center space-x-2">
              <div className="flex-1 flex items-center bg-[#11141c] border border-zinc-800 rounded px-3 py-2 text-xs">
                <Search className="w-4 h-4 text-zinc-500 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${typeLabel}s on Modrinth (filtered for ${server.loader} ${server.version})...`}
                  className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((hit) => {
                const isInstalling = installingId === hit.project_id;
                return (
                  <div
                    key={hit.project_id}
                    className="p-4 bg-[#11141c] border border-zinc-800/80 rounded-lg flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start space-x-3">
                      {hit.icon_url ? (
                        <img
                          src={hit.icon_url}
                          alt={hit.title}
                          className="w-10 h-10 rounded object-cover border border-zinc-700/60 bg-zinc-900"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-zinc-100 truncate">
                            {hit.title}
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            by {hit.author}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                          {hit.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                      <div className="flex items-center space-x-1.5 overflow-hidden">
                        {(hit.categories || []).slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 uppercase"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => handleInstallProject(hit)}
                        disabled={isInstalling}
                        className="flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded bg-emerald-600/90 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 shadow-sm"
                      >
                        <Download className="w-3 h-3" />
                        <span>{isInstalling ? 'Installing...' : '1-Click Install'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

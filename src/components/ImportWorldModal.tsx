import React, { useEffect, useState } from 'react';
import {
  FolderArchive,
  FolderOpen,
  FileArchive,
  HardDrive,
  Check,
  AlertTriangle,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Database,
} from 'lucide-react';
import { ServerConfig, ServerStatus, SingleplayerSave } from '../types';

interface ImportWorldModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: ServerConfig;
  status: ServerStatus;
  onWorldImported?: (worldName: string) => void;
}

export const ImportWorldModal: React.FC<ImportWorldModalProps> = ({
  isOpen,
  onClose,
  server,
  status,
  onWorldImported,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'singleplayer'>('browse');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'folder' | 'zip'>('folder');
  const [targetWorldName, setTargetWorldName] = useState<string>('world');
  const [backupExisting, setBackupExisting] = useState<boolean>(true);

  // Singleplayer saves detection
  const [detectedSaves, setDetectedSaves] = useState<SingleplayerSave[]>([]);
  const [loadingSaves, setLoadingSaves] = useState(false);
  const [selectedSave, setSelectedSave] = useState<SingleplayerSave | null>(null);

  // Import operation state
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsImporting(false);
      // Fetch server properties level-name if possible, fallback to 'world'
      window.electronAPI.getServerProperties(server.id).then((props) => {
        if (props['level-name']) {
          setTargetWorldName(props['level-name']);
        }
      }).catch(() => {});

      loadSingleplayerSaves();
    }
  }, [isOpen, server.id]);

  const loadSingleplayerSaves = async () => {
    setLoadingSaves(true);
    try {
      const saves = await window.electronAPI.detectSingleplayerSaves();
      setDetectedSaves(saves);
    } catch (err: any) {
      console.warn('Failed to detect singleplayer saves:', err);
    } finally {
      setLoadingSaves(false);
    }
  };

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    setErrorMsg(null);
    try {
      const folderPath = await window.electronAPI.selectWorldFolder();
      if (folderPath) {
        setSelectedPath(folderPath);
        setSelectedType('folder');
        setSelectedSave(null);
        // Suggest world name based on folder name
        const folderName = folderPath.replace(/[\\/]$/, '').split(/[\\/]/).pop();
        if (folderName) setTargetWorldName(folderName);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to select folder');
    }
  };

  const handleSelectZip = async () => {
    setErrorMsg(null);
    try {
      const zipPath = await window.electronAPI.selectWorldZip();
      if (zipPath) {
        setSelectedPath(zipPath);
        setSelectedType('zip');
        setSelectedSave(null);
        // Suggest world name based on zip filename without extension
        const fileName = zipPath.split(/[\\/]/).pop()?.replace(/\.zip$/i, '');
        if (fileName) setTargetWorldName(fileName);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to select zip');
    }
  };

  const handleChooseSingleplayerSave = (save: SingleplayerSave) => {
    setSelectedSave(save);
    setSelectedPath(save.path);
    setSelectedType('folder');
    setTargetWorldName(save.folderName);
  };

  const handleExecuteImport = async () => {
    if (!selectedPath) {
      setErrorMsg('Please select a world folder, ZIP file, or singleplayer world first.');
      return;
    }

    if (!targetWorldName.trim()) {
      setErrorMsg('Please enter a target world name.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let res;
      if (selectedType === 'zip') {
        res = await window.electronAPI.importWorldFromZip(
          server.id,
          selectedPath,
          targetWorldName.trim(),
          backupExisting
        );
      } else {
        res = await window.electronAPI.importWorldFromFolder(
          server.id,
          selectedPath,
          targetWorldName.trim(),
          backupExisting
        );
      }

      if (res.success) {
        setSuccessMsg(
          `World "${res.worldName}" imported successfully!${
            res.backupName ? ` (Backup created: ${res.backupName})` : ''
          }`
        );
        onWorldImported?.(res.worldName);
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import world.');
    } finally {
      setIsImporting(false);
    }
  };

  const isRunning = status === 'running';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#0e1119] border border-zinc-800 rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 border-b border-zinc-800 flex items-center justify-between bg-[#11141c]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Import Minecraft World
              </h2>
              <p className="text-[11px] text-zinc-400">
                Import external maps or singleplayer saves into{' '}
                <span className="font-semibold text-emerald-400">{server.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 py-2.5 bg-[#0b0d13] border-b border-zinc-800 flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === 'browse'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Browse Folder or .ZIP Archive</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('singleplayer')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === 'singleplayer'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-purple-400" />
            <span>Detected Singleplayer Saves ({detectedSaves.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded text-xs text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded text-xs text-emerald-200 flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Running Server Warning */}
          {isRunning && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-xs text-amber-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold">Server is currently running!</span>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  Importing a world will update server files and change the world name. You should stop or restart the server after importing for Minecraft to load the new map.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: BROWSE FOLDER / ZIP */}
          {activeTab === 'browse' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="p-4 rounded-lg border border-zinc-800 hover:border-emerald-600/70 bg-[#11141c] hover:bg-[#131824] transition-all flex flex-col items-center justify-center text-center space-y-2 cursor-pointer group"
                >
                  <div className="p-2.5 rounded-full bg-emerald-950/70 text-emerald-400 group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-100 block">
                      Select World Folder
                    </span>
                    <span className="text-[11px] text-zinc-500 block">
                      Folder containing level.dat and region chunks
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleSelectZip}
                  className="p-4 rounded-lg border border-zinc-800 hover:border-purple-600/70 bg-[#11141c] hover:bg-[#151222] transition-all flex flex-col items-center justify-center text-center space-y-2 cursor-pointer group"
                >
                  <div className="p-2.5 rounded-full bg-purple-950/70 text-purple-400 group-hover:scale-110 transition-transform">
                    <FileArchive className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-100 block">
                      Select World .ZIP File
                    </span>
                    <span className="text-[11px] text-zinc-500 block">
                      Downloaded map archive (.zip)
                    </span>
                  </div>
                </button>
              </div>

              {selectedPath && (
                <div className="p-3 bg-[#0a0c12] border border-zinc-800 rounded flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                      Selected {selectedType === 'zip' ? 'Archive' : 'Folder'}:
                    </span>
                    <p className="text-xs font-mono text-zinc-200 truncate mt-0.5">
                      {selectedPath}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                    {selectedType.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SINGLEPLAYER SAVES */}
          {activeTab === 'singleplayer' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Detected singleplayer worlds from your local Minecraft installations:
                </span>
                <button
                  type="button"
                  onClick={loadSingleplayerSaves}
                  disabled={loadingSaves}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingSaves ? 'animate-spin' : ''}`} />
                  <span>Rescan</span>
                </button>
              </div>

              {loadingSaves ? (
                <div className="flex items-center justify-center p-8 text-zinc-400 space-x-2 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Scanning %APPDATA%/.minecraft/saves...</span>
                </div>
              ) : detectedSaves.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs">
                  No singleplayer worlds found in standard Minecraft save directories.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {detectedSaves.map((save) => {
                    const isSelected = selectedSave?.path === save.path;
                    return (
                      <div
                        key={save.path}
                        onClick={() => handleChooseSingleplayerSave(save)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-xs'
                            : 'bg-[#11141c] border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          {save.icon ? (
                            <img
                              src={save.icon}
                              alt="World Icon"
                              className="w-10 h-10 rounded border border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-500 shrink-0">
                              <HardDrive className="w-5 h-5 text-emerald-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate text-zinc-100">
                              {save.name}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500 block truncate">
                              Folder: {save.folderName}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              Last Played: {new Date(save.lastModified).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="p-1 rounded-full bg-emerald-500 text-black shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* WORLD IMPORT SETTINGS */}
          <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-3">
            <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider block">
              Import Settings
            </span>

            {/* Target World Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Target World Name (Folder name in server directory)
              </label>
              <input
                type="text"
                value={targetWorldName}
                onChange={(e) => setTargetWorldName(e.target.value)}
                className="w-full bg-[#131722] border border-zinc-700/80 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                placeholder="e.g., world, custom_survival, adventure_map"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                This updates the <code className="text-emerald-400">level-name</code> in server.properties so the server boots into this world.
              </span>
            </div>

            {/* Backup Checkbox */}
            <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={backupExisting}
                onChange={(e) => setBackupExisting(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-200 block">
                  Automatically back up existing world first
                </span>
                <span className="text-[11px] text-zinc-500 block">
                  Creates a safe backup folder with a timestamp before overwriting.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-zinc-800/80 bg-[#11141c] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={!selectedPath || isImporting}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importing World Data...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Import World</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


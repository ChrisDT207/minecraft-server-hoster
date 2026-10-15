import React, { useEffect, useState } from 'react';
import {
  X,
  Sliders,
  HardDrive,
  Cpu,
  Server,
  Coffee,
  RotateCw,
  Check,
  AlertTriangle,
  FolderOpen,
  Shield,
  Layers,
} from 'lucide-react';
import { ServerConfig, ServerStatus, SystemInfo } from '../types';

interface EditServerModalProps {
  isOpen: boolean;
  server: ServerConfig;
  status: ServerStatus;
  onClose: () => void;
  onServerUpdated: (updatedServer: ServerConfig) => void;
  onRestartServer?: () => void;
}

export const EditServerModal: React.FC<EditServerModalProps> = ({
  isOpen,
  server,
  status,
  onClose,
  onServerUpdated,
  onRestartServer,
}) => {
  // Editable state initialized from existing server
  const [name, setName] = useState(server.name);
  const [port, setPort] = useState(server.port);
  const [maxRamGb, setMaxRamGb] = useState(Math.round((server.maxRam / 1024) * 10) / 10);
  const [minRamGb, setMinRamGb] = useState(Math.round((server.minRam / 1024) * 10) / 10);
  const [autoMinRam, setAutoMinRam] = useState(
    server.minRam === Math.round(server.maxRam / 2) || server.minRam === server.maxRam
  );
  const [allowOffline, setAllowOffline] = useState(server.allowOffline);
  const [skinRestorer, setSkinRestorer] = useState(server.skinRestorer);
  const [javaMode, setJavaMode] = useState<'auto' | 'detected' | 'custom'>(
    server.javaPath ? 'custom' : 'auto'
  );
  const [selectedJavaPath, setSelectedJavaPath] = useState(server.javaPath || '');
  const [jvmArgs, setJvmArgs] = useState(server.jvmArgs || '');

  // System info for hardware context and Java detection
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state whenever the modal opens or the active server changes
  useEffect(() => {
    if (isOpen) {
      setName(server.name);
      setPort(server.port);
      const maxG = Math.round((server.maxRam / 1024) * 10) / 10;
      const minG = Math.round((server.minRam / 1024) * 10) / 10;
      setMaxRamGb(maxG);
      setMinRamGb(minG);
      setAutoMinRam(server.minRam === Math.round(server.maxRam / 2));
      setAllowOffline(server.allowOffline);
      setSkinRestorer(server.skinRestorer);
      setJavaMode(server.javaPath ? 'custom' : 'auto');
      setSelectedJavaPath(server.javaPath || '');
      setJvmArgs(server.jvmArgs || '');
      setErrorMsg(null);
      setSaveSuccess(false);

      if (window.electronAPI) {
        window.electronAPI.getSystemInfo().then(setSysInfo);
      }
    }
  }, [isOpen, server]);

  if (!isOpen) return null;

  const isRunning = status === 'running';
  const totalHostRamGb = sysInfo ? Math.round(sysInfo.totalMemoryMb / 1024) : 16;
  const sliderMax = Math.max(16, totalHostRamGb);

  const ramPresets = [2, 4, 6, 8, 12, 16];

  const handleMaxRamChange = (val: number) => {
    setMaxRamGb(val);
    if (autoMinRam) {
      setMinRamGb(Math.max(1, Math.round((val / 2) * 10) / 10));
    } else if (minRamGb > val) {
      setMinRamGb(val);
    }
  };

  const handleBrowseJava = async () => {
    try {
      const chosen = await window.electronAPI.selectJavaFile();
      if (chosen) {
        setSelectedJavaPath(chosen);
        setJavaMode('custom');
      }
    } catch (err: any) {
      setErrorMsg('Failed to open file picker: ' + err.message);
    }
  };

  const executeSave = async (restartAfter: boolean = false) => {
    setSaving(true);
    setErrorMsg(null);

    const calculatedMaxRam = Math.round(maxRamGb * 1024);
    const calculatedMinRam = autoMinRam
      ? Math.round((maxRamGb * 1024) / 2)
      : Math.min(calculatedMaxRam, Math.round(minRamGb * 1024));

    try {
      const updated = await window.electronAPI.updateServerConfig(server.id, {
        name: name.trim() || server.name,
        port: Number(port) || server.port,
        maxRam: calculatedMaxRam,
        minRam: calculatedMinRam,
        allowOffline,
        skinRestorer: allowOffline && skinRestorer,
        javaPath: javaMode === 'auto' ? undefined : selectedJavaPath.trim() || undefined,
        jvmArgs: jvmArgs.trim() || undefined,
      });

      onServerUpdated(updated);
      setSaveSuccess(true);

      if (restartAfter && onRestartServer) {
        setTimeout(async () => {
          onRestartServer();
          onClose();
        }, 300);
      } else {
        setTimeout(() => {
          onClose();
        }, 400);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update server configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#0e1119] border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-12 px-6 border-b border-zinc-800/80 flex items-center justify-between bg-[#11141c]">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-zinc-100">
              Edit Server Configuration
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 uppercase">
              {server.loader} {server.version}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Running warning banner */}
        {isRunning && (
          <div className="bg-amber-950/40 border-b border-amber-800/50 px-6 py-2.5 flex items-center space-x-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Server is currently <strong>running</strong>. Memory, Port, and Java changes will take effect after restarting the server.
            </span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-zinc-300">
          {errorMsg && (
            <div className="p-3 rounded bg-rose-950/50 border border-rose-800/60 text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Server Identity & Network Port */}
          <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-4">
            <div className="flex items-center space-x-2 text-zinc-200 font-semibold uppercase tracking-wide">
              <Server className="w-4 h-4 text-blue-400" />
              <span>Identity &amp; Network Port</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 font-medium mb-1.5">
                  Server Display Name (MOTD)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Minecraft Server"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded text-zinc-100 focus:outline-hidden focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1.5">
                  Assigned Server Port
                </label>
                <input
                  type="number"
                  min={1024}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded text-zinc-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Automatically syncs with <code className="text-zinc-400">server.properties</code>
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Memory (RAM) Allocation */}
          <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-zinc-200 font-semibold uppercase tracking-wide">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Memory Allocation (RAM)</span>
              </div>
              <div className="text-zinc-400 font-mono text-[11px]">
                Host RAM: <strong className="text-zinc-200">{totalHostRamGb} GB</strong>
                {sysInfo?.freeMemoryMb ? ` (${Math.round(sysInfo.freeMemoryMb / 1024)} GB Free)` : ''}
              </div>
            </div>

            {/* Slider & Value Display */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-zinc-400 font-medium">Maximum Memory (-Xmx):</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={1}
                    max={sliderMax}
                    step={0.5}
                    value={maxRamGb}
                    onChange={(e) => handleMaxRamChange(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700/80 rounded text-right font-mono text-emerald-400 font-bold focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="font-semibold text-zinc-400">GB</span>
                  <span className="text-zinc-500 font-mono text-[11px]">
                    ({Math.round(maxRamGb * 1024)} MB)
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={Math.min(32, sliderMax)}
                step={0.5}
                value={maxRamGb}
                onChange={(e) => handleMaxRamChange(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-zinc-500 mr-1">Presets:</span>
                {ramPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleMaxRamChange(preset)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                      maxRamGb === preset
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {preset} GB
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum RAM Setting */}
            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoMinRam"
                  checked={autoMinRam}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoMinRam(checked);
                    if (checked) {
                      setMinRamGb(Math.max(1, Math.round((maxRamGb / 2) * 10) / 10));
                    }
                  }}
                  className="rounded bg-zinc-900 border-zinc-700 text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="autoMinRam" className="text-zinc-400 cursor-pointer">
                  Auto-set Initial Heap (-Xms) to 50% of Max RAM ({Math.max(1, Math.round((maxRamGb / 2) * 10) / 10)} GB)
                </label>
              </div>

              {!autoMinRam && (
                <div className="flex items-center space-x-1.5 font-mono">
                  <span className="text-zinc-500 text-[11px]">Min:</span>
                  <input
                    type="number"
                    min={0.5}
                    max={maxRamGb}
                    step={0.5}
                    value={minRamGb}
                    onChange={(e) => setMinRamGb(Number(e.target.value))}
                    className="w-16 px-1.5 py-0.5 bg-zinc-900 border border-zinc-700/80 rounded text-right text-zinc-300 text-xs focus:outline-hidden"
                  />
                  <span className="text-zinc-500 text-[11px]">GB</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Player Authentication & Skins */}
          <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-3">
            <div className="flex items-center space-x-2 text-zinc-200 font-semibold uppercase tracking-wide">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Player Authentication &amp; Skins</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-zinc-200 font-medium block">
                  Allow Offline / TLauncher Clients
                </span>
                <span className="text-[11px] text-zinc-500 block">
                  Sets <code className="text-zinc-400">online-mode=false</code> so players without official Mojang accounts can connect.
                </span>
              </div>
              <input
                type="checkbox"
                checked={allowOffline}
                onChange={(e) => {
                  setAllowOffline(e.target.checked);
                  if (!e.target.checked) setSkinRestorer(false);
                }}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-600 focus:ring-0 cursor-pointer"
              />
            </div>

            {allowOffline && server.edition === 'java' && (
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                <div>
                  <span className="text-zinc-300 font-medium block">
                    Install &amp; Maintain SkinRestorer
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Restores player custom skins and capes in offline mode.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={skinRestorer}
                  onChange={(e) => setSkinRestorer(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-600 focus:ring-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Section 4: Java Runtime & JVM Flags (Java Edition only) */}
          {server.edition === 'java' && (
            <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-4">
              <div className="flex items-center space-x-2 text-zinc-200 font-semibold uppercase tracking-wide">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Java Runtime Environment &amp; JVM Flags</span>
              </div>

              {/* Java Selection Mode */}
              <div className="space-y-2">
                <label className="block text-zinc-400 font-medium">Java Runtime Version</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setJavaMode('auto');
                      setSelectedJavaPath('');
                    }}
                    className={`py-1.5 px-3 rounded border text-xs font-medium transition-colors ${
                      javaMode === 'auto'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700/60 hover:bg-zinc-800'
                    }`}
                  >
                    Auto Recommended
                  </button>
                  <button
                    type="button"
                    onClick={() => setJavaMode('detected')}
                    className={`py-1.5 px-3 rounded border text-xs font-medium transition-colors ${
                      javaMode === 'detected'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700/60 hover:bg-zinc-800'
                    }`}
                  >
                    Detected System Java
                  </button>
                  <button
                    type="button"
                    onClick={() => setJavaMode('custom')}
                    className={`py-1.5 px-3 rounded border text-xs font-medium transition-colors ${
                      javaMode === 'custom'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700/60 hover:bg-zinc-800'
                    }`}
                  >
                    Custom Executable
                  </button>
                </div>
              </div>

              {/* Detected Java Dropdown */}
              {javaMode === 'detected' && (
                <div className="space-y-1.5">
                  <label className="block text-zinc-400 text-[11px]">Select Detected Runtime:</label>
                  <select
                    value={selectedJavaPath}
                    onChange={(e) => setSelectedJavaPath(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">-- Choose installed Java --</option>
                    {sysInfo?.detectedJava.map((j, idx) => (
                      <option key={idx} value={j.path}>
                        Java {j.major} ({j.version}) — {j.path}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Path Input with Browse */}
              {javaMode === 'custom' && (
                <div className="space-y-1.5">
                  <label className="block text-zinc-400 text-[11px]">Custom java.exe Path:</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={selectedJavaPath}
                      onChange={(e) => setSelectedJavaPath(e.target.value)}
                      placeholder="C:\Program Files\Java\jdk-21\bin\java.exe"
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseJava}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 text-xs font-medium transition-colors flex items-center space-x-1"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Browse...</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Custom JVM Arguments */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                <label className="block text-zinc-400 font-medium">Custom JVM Arguments</label>
                <input
                  type="text"
                  value={jvmArgs}
                  onChange={(e) => setJvmArgs(e.target.value)}
                  placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                />
                <span className="text-[11px] text-zinc-500 block">
                  Additional flags passed directly to Java runtime upon startup.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-14 px-6 border-t border-zinc-800/80 bg-[#11141c] flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">
            {saveSuccess ? (
              <span className="text-emerald-400 flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Configuration saved successfully!</span>
              </span>
            ) : isRunning ? (
              <span>Restart required for RAM/port/Java changes.</span>
            ) : (
              <span>Changes apply on next server launch.</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            >
              Cancel
            </button>

            {isRunning && onRestartServer && (
              <button
                type="button"
                onClick={() => executeSave(true)}
                disabled={saving}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Save &amp; Restart</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => executeSave(false)}
              disabled={saving}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

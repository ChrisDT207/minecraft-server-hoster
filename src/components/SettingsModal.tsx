import React, { useEffect, useState } from 'react';
import {
  X,
  Settings,
  Cpu,
  HardDrive,
  FolderOpen,
  Coffee,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { SystemInfo } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    window.electronAPI?.getSystemInfo().then(setSysInfo);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#0e1119] border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-12 px-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-zinc-100">
              System Settings &amp; Environment
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* 1. Hardware Overview */}
          <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800 space-y-3">
            <h3 className="font-semibold text-zinc-200 uppercase tracking-wide flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Host Machine Specifications</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-zinc-400">
              <div>
                <span className="text-zinc-500 block">CPU Processor:</span>
                <span className="text-zinc-200 font-medium">
                  {sysInfo?.cpuModel} ({sysInfo?.cpuCores} Cores)
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">System RAM:</span>
                <span className="text-zinc-200 font-medium font-mono">
                  {sysInfo ? Math.round(sysInfo.totalMemoryMb / 1024) : 0} GB Total ({sysInfo?.freeMemoryMb} MB free)
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Primary Network IP:</span>
                <span className="text-zinc-200 font-medium font-mono">{sysInfo?.localIp}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Operating System:</span>
                <span className="text-zinc-200 font-medium">Windows (x64)</span>
              </div>
            </div>
          </div>

          {/* 2. Java Environments */}
          <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-200 uppercase tracking-wide flex items-center space-x-2">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Detected Java Runtimes</span>
              </h3>
              <a
                href="https://adoptium.net/temurin/releases/"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <span>Download Java (Adoptium)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {sysInfo?.detectedJava && sysInfo.detectedJava.length > 0 ? (
              <div className="space-y-2">
                {sysInfo.detectedJava.map((j, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-between font-mono"
                  >
                    <div>
                      <span className="text-zinc-200 font-bold block">
                        Java {j.major} ({j.version})
                      </span>
                      <span className="text-zinc-500 text-[11px] truncate max-w-md block">
                        {j.path}
                      </span>
                    </div>
                    {j.isDefault && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        Default PATH
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded text-amber-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No global Java binary found in PATH.</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Bedrock servers will work out-of-the-box. For Java servers, we recommend installing Eclipse Temurin OpenJDK 21 or 17 from Adoptium.
                  </p>
                </div>
              </div>
            )}

            {/* Java Compatibility Helper */}
            <div className="text-[11px] text-zinc-500 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-400 font-semibold block mb-1">
                Minecraft Java Requirements:
              </span>
              <ul className="list-disc list-inside space-y-0.5">
                <li>MC 1.20.5 - 1.21.x: Java 21</li>
                <li>MC 1.18 - 1.20.4: Java 17</li>
                <li>MC 1.17: Java 16</li>
                <li>MC 1.16.5 and older: Java 8</li>
              </ul>
            </div>
          </div>

          {/* 3. Server Storage Location */}
          <div className="p-4 bg-[#11141c] rounded-lg border border-zinc-800 space-y-2">
            <h3 className="font-semibold text-zinc-200 uppercase tracking-wide">
              Server Storage Directory
            </h3>
            <p className="text-zinc-400 text-xs">
              All servers, world data, plugins, and configurations are stored in your home directory:
            </p>
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-zinc-300 flex items-center justify-between">
              <span>~/MC-ForgeDesk/servers/</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-6 border-t border-zinc-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

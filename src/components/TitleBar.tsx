import React from 'react';
import { Minus, Square, X, Server } from 'lucide-react';

interface TitleBarProps {
  serverCount?: number;
}

export const TitleBar: React.FC<TitleBarProps> = ({ serverCount = 0 }) => {
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow?.();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow?.();
  };

  return (
    <header className="h-9 bg-[#090b10] border-b border-zinc-800/80 flex items-center justify-between px-3 select-none titlebar-drag z-50">
      {/* Left: Brand */}
      <div className="flex items-center space-x-2 titlebar-no-drag">
        <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
          <Server className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-zinc-200">
          MC-ForgeDesk
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
          v1.0.0
        </span>
      </div>

      {/* Center: Subtle Title */}
      <div className="text-[11px] text-zinc-500 font-medium">
        Minecraft Server Manager &amp; Hoster
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center space-x-1 titlebar-no-drag">
        <button
          onClick={handleMinimize}
          className="w-7 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors"
          title="Minimize"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors"
          title="Maximize"
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-rose-600 transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

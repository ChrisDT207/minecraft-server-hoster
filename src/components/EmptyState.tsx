import React from 'react';
import { Server, Plus, Shield, Globe, Terminal, Cpu } from 'lucide-react';

interface EmptyStateProps {
  onOpenCreateModal: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onOpenCreateModal }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#090b10] select-none text-center">
      <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-black/40">
        <Server className="w-8 h-8" />
      </div>

      <h2 className="text-lg font-bold text-zinc-100">
        Welcome to MC-ForgeDesk
      </h2>
      <p className="text-xs text-zinc-400 max-w-md mt-1.5 leading-relaxed">
        Pragmatic desktop Minecraft server manager for Windows. Provision Paper, Fabric, Forge, NeoForge, Vanilla, and Bedrock servers with live version manifests and instant public tunnels.
      </p>

      <button
        onClick={onOpenCreateModal}
        className="mt-6 flex items-center space-x-2 px-5 py-2.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Create Your First Server</span>
      </button>

      {/* Feature Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 max-w-2xl text-left">
        <div className="p-3 bg-[#11141c] border border-zinc-800/80 rounded-lg">
          <Terminal className="w-4 h-4 text-emerald-400 mb-1.5" />
          <h4 className="text-xs font-semibold text-zinc-200">Interactive xterm.js</h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">Live stdin/stdout terminal with ANSI color support.</p>
        </div>

        <div className="p-3 bg-[#11141c] border border-zinc-800/80 rounded-lg">
          <Globe className="w-4 h-4 text-purple-400 mb-1.5" />
          <h4 className="text-xs font-semibold text-zinc-200">Playit.gg Tunnels</h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">Instant public .joinmc.link without opening router ports.</p>
        </div>

        <div className="p-3 bg-[#11141c] border border-zinc-800/80 rounded-lg">
          <Shield className="w-4 h-4 text-amber-400 mb-1.5" />
          <h4 className="text-xs font-semibold text-zinc-200">TLauncher / Offline</h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">One-click offline mode with SkinRestorer plugin.</p>
        </div>

        <div className="p-3 bg-[#11141c] border border-zinc-800/80 rounded-lg">
          <Cpu className="w-4 h-4 text-blue-400 mb-1.5" />
          <h4 className="text-xs font-semibold text-zinc-200">Live Manifests</h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">Always fetch latest releases from Mojang &amp; PaperMC.</p>
        </div>
      </div>
    </div>
  );
};

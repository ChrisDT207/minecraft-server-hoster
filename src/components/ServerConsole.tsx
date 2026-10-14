import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Send, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { ServerConfig, ServerStatus } from '../types';

interface ServerConsoleProps {
  server: ServerConfig;
  status: ServerStatus;
  onSendCommand: (command: string) => void;
}

export const ServerConsole: React.FC<ServerConsoleProps> = ({
  server,
  status,
  onSendCommand,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);

  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  // Initialize xterm
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#090b10',
        foreground: '#e2e8f0',
        cursor: '#10b981',
        selectionBackground: '#2d3748',
        black: '#1a202c',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f1f5f9',
        brightBlack: '#475569',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#eab308',
        brightBlue: '#3b82f6',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#ffffff',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontSize: 12.5,
      lineHeight: 1.35,
      cursorBlink: true,
      convertEol: true,
      disableStdin: true, // We have our own command input box
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonInstance.current = fitAddon;

    term.writeln(`\x1b[36m[MC-ForgeDesk Console] Initialized for ${server.name} (${server.version})\x1b[0m`);
    term.writeln(`\x1b[90mType commands in the input below. Type 'help' for server commands.\x1b[0m`);
    term.writeln('');

    // Listen to incoming console events from Electron
    const cleanup = window.electronAPI?.onConsoleOutput((data) => {
      if (data.serverId === server.id) {
        // Translate Minecraft formatting code § to ANSI
        let formatted = data.text
          .replace(/§0/g, '\x1b[30m')
          .replace(/§1/g, '\x1b[34m')
          .replace(/§2/g, '\x1b[32m')
          .replace(/§3/g, '\x1b[36m')
          .replace(/§4/g, '\x1b[31m')
          .replace(/§5/g, '\x1b[35m')
          .replace(/§6/g, '\x1b[33m')
          .replace(/§7/g, '\x1b[37m')
          .replace(/§8/g, '\x1b[90m')
          .replace(/§9/g, '\x1b[94m')
          .replace(/§a/g, '\x1b[92m')
          .replace(/§b/g, '\x1b[96m')
          .replace(/§c/g, '\x1b[91m')
          .replace(/§d/g, '\x1b[95m')
          .replace(/§e/g, '\x1b[93m')
          .replace(/§f/g, '\x1b[97m')
          .replace(/§r/g, '\x1b[0m');

        term.write(formatted);
      }
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {}
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cleanup?.();
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [server.id]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cmd = inputCommand.trim();
    if (!cmd) return;

    onSendCommand(cmd);
    setHistory((prev) => [cmd, ...prev]);
    setHistoryIdx(-1);
    setInputCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIdx < history.length - 1) {
        const nextIdx = historyIdx + 1;
        setHistoryIdx(nextIdx);
        setInputCommand(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const prevIdx = historyIdx - 1;
        setHistoryIdx(prevIdx);
        setInputCommand(history[prevIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputCommand('');
      }
    }
  };

  const handleQuickCommand = (cmd: string) => {
    onSendCommand(cmd);
    setHistory((prev) => [cmd, ...prev]);
  };

  const handleClear = () => {
    xtermInstance.current?.clear();
  };

  const isRunning = status === 'running';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090b10] select-none">
      {/* Console Utility Toolbar */}
      <div className="h-9 px-4 bg-[#0e1119] border-b border-zinc-800/80 flex items-center justify-between">
        {/* Quick Commands */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <span className="text-[11px] text-zinc-500 font-medium mr-1">Quick Actions:</span>
          {['list', 'time set day', 'weather clear', 'save-all', 'toggledownfall'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleQuickCommand(cmd)}
              disabled={!isRunning}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              /{cmd}
            </button>
          ))}
        </div>

        {/* Clear Console */}
        <button
          onClick={handleClear}
          className="flex items-center space-x-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
          title="Clear Terminal View"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      {/* Terminal View Container */}
      <div className="flex-1 p-2 bg-[#090b10] overflow-hidden relative">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Command Input Box */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-[#0d1017] border-t border-zinc-800/80 flex items-center space-x-2"
      >
        <div className="flex-1 flex items-center bg-[#131722] border border-zinc-700/80 focus-within:border-emerald-500/80 rounded px-3 py-1.5 transition-colors">
          <span className="text-emerald-400 font-mono text-sm mr-2 select-none">&gt;</span>
          <input
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isRunning && status !== 'starting'}
            placeholder={
              isRunning
                ? "Enter console command (e.g. 'op steve', 'whitelist add alex', 'say Hello world')..."
                : "Server is offline. Start server to enter live console commands."
            }
            className="flex-1 bg-transparent text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!isRunning || !inputCommand.trim()}
          className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};

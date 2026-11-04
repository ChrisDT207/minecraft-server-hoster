import React, { useState } from 'react';
import {
  Power,
  Clock,
  AlertTriangle,
  X,
  Check,
  MonitorOff,
  Server as ServerIcon,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { ServerConfig, ServerStatus, ShutdownStatus } from '../types';

interface ShutdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: ServerConfig;
  status: ServerStatus;
  shutdownStatus?: ShutdownStatus;
}

export const ShutdownModal: React.FC<ShutdownModalProps> = ({
  isOpen,
  onClose,
  server,
  status,
  shutdownStatus,
}) => {
  const [shutdownPc, setShutdownPc] = useState(true);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);
  const [customMinutes, setCustomMinutes] = useState<string>('45');
  const [isCustom, setIsCustom] = useState(false);
  const [stopWhenEmpty, setStopWhenEmpty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isRunning = status === 'running';
  const isScheduled = !!shutdownStatus?.active;

  const handleStartShutdown = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const minutes = isCustom
        ? Math.max(0, parseInt(customMinutes, 10) || 0)
        : selectedMinutes;

      // If 0 minutes and not shutting down PC, just execute immediate save & close
      if (minutes === 0 && !shutdownPc) {
        await window.electronAPI.saveAndCloseServer(server.id);
        onClose();
        return;
      }

      await window.electronAPI.scheduleShutdown({
        serverId: server.id,
        delayMinutes: minutes,
        shutdownPc,
        stopWhenEmpty,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to schedule shutdown');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShutdown = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await window.electronAPI.cancelShutdown();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel shutdown');
    } finally {
      setLoading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}h ${remM}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#0e1119] border border-zinc-800 rounded-lg w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 border-b border-zinc-800 flex items-center justify-between bg-[#11141c]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-rose-950/70 border border-rose-800/60 text-rose-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Save &amp; Close / Auto-Shutdown Scheduler
              </h2>
              <p className="text-[11px] text-zinc-400">
                Target Server:{' '}
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

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded text-xs text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ACTIVE SHUTDOWN TIMER BANNER */}
          {isScheduled && (
            <div className="p-4 bg-gradient-to-r from-rose-950/80 to-amber-950/60 border border-rose-700/80 rounded-lg space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-rose-300 font-bold text-sm">
                  <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>Countdown Timer In Progress</span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-600/50">
                  {formatSeconds(shutdownStatus?.remainingSeconds || 0)}
                </span>
              </div>

              <div className="text-xs text-zinc-300 space-y-1">
                <p>
                  • Action:{' '}
                  <strong className="text-white">
                    {shutdownStatus?.shutdownPc
                      ? 'Save, Close Server and Shut Down Windows PC'
                      : 'Save and Close Server Only'}
                  </strong>
                </p>
                <p className="text-[11px] text-zinc-400">
                  World data will be flushed to disk with <code className="text-emerald-400">save-all flush</code> before closing.
                  In-game warnings are continuously broadcasted to connected players.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleCancelShutdown}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-md flex items-center space-x-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel Scheduled Shutdown</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: CHOOSE TARGET ACTION */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider block">
              1. Select Action
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Server Only */}
              <button
                type="button"
                onClick={() => setShutdownPc(false)}
                className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  !shutdownPc
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 shadow-xs'
                    : 'bg-[#11141c] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <ServerIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-100">
                      Save &amp; Close Server
                    </span>
                  </div>
                  {!shutdownPc && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Flushes world state and terminates server process. PC stays powered on.
                </p>
              </button>

              {/* Option B: Server + Shut Down PC */}
              <button
                type="button"
                onClick={() => setShutdownPc(true)}
                className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  shutdownPc
                    ? 'bg-rose-950/60 border-rose-500 text-rose-200 shadow-xs'
                    : 'bg-[#11141c] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <MonitorOff className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-zinc-100">
                      Save &amp; Shut Down PC
                    </span>
                  </div>
                  {shutdownPc && <Check className="w-4 h-4 text-rose-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Flushes world state, closes server, and powers off the computer safely.
                </p>
              </button>
            </div>
          </div>

          {/* STEP 2: COUNTDOWN TIMER PRESETS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider block">
                2. Timer / Countdown
              </label>
              <span className="text-[11px] font-mono text-zinc-400 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>
                  {isCustom
                    ? `${customMinutes || 0} Minutes`
                    : selectedMinutes === 0
                    ? 'Execute Now'
                    : `${selectedMinutes} Minutes`}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { label: 'Now (Immediate)', val: 0 },
                { label: '15 Minutes', val: 15 },
                { label: '30 Minutes', val: 30 },
                { label: '45 Minutes', val: 45 },
                { label: '1 Hour', val: 60 },
                { label: '2 Hours', val: 120 },
                { label: '4 Hours', val: 240 },
              ].map((preset) => {
                const active = !isCustom && selectedMinutes === preset.val;
                return (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      setIsCustom(false);
                      setSelectedMinutes(preset.val);
                    }}
                    className={`px-3 py-2 rounded text-xs font-semibold transition-colors border ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-[#11141c] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {/* Custom Minutes Option */}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`px-3 py-2 rounded text-xs font-semibold transition-colors border ${
                  isCustom
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-[#11141c] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                Custom...
              </button>
            </div>

            {/* Custom Minutes Input */}
            {isCustom && (
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded flex items-center space-x-3 mt-2">
                <span className="text-xs text-zinc-300 font-medium">Minutes:</span>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-28 bg-[#131722] border border-zinc-700 rounded px-2.5 py-1 text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                  placeholder="Minutes"
                />
                <span className="text-[11px] text-zinc-500">
                  (e.g., 90 for 1 hour 30 min)
                </span>
              </div>
            )}
          </div>

          {/* STEP 3: AUTOMATION SAFEGUARDS */}
          <div className="p-3.5 bg-[#11141c] rounded-lg border border-zinc-800/80 space-y-2">
            <span className="text-xs font-semibold text-zinc-300 block">
              Safety &amp; In-Game Notifications
            </span>
            <div className="space-y-1.5 text-xs text-zinc-400">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="rounded border-zinc-700 text-emerald-500"
                />
                <span className="text-zinc-300">
                  Broadcast automatic countdown warnings to in-game chat (at 30m, 15m, 5m, 1m, 30s, 10s)
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopWhenEmpty}
                  onChange={(e) => setStopWhenEmpty(e.target.checked)}
                  className="rounded border-zinc-700 text-emerald-500"
                />
                <span>
                  Shut down sooner if all players leave the server
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-zinc-800/80 bg-[#11141c] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleStartShutdown}
              disabled={loading || (!isRunning && !shutdownPc)}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded text-white shadow-md transition-all ${
                shutdownPc
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Power className="w-4 h-4" />
              <span>
                {shutdownPc ? 'Start Shutdown Countdown' : 'Save & Close Server'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


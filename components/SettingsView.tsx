
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Volume2, VolumeX, Vibrate, VibrateOff, LogOut, ChevronRight, ArrowLeft, Shield, Maximize, Minimize, RefreshCw } from 'lucide-react';
import ManualView from './ManualView';

interface SettingsViewProps {
  onBack: () => void;
  onLogout: () => void;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onToggleSound: () => void;
  onToggleVibration: () => void;
  userEmail: string | null;
  onHardReset?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  onBack, onLogout, soundEnabled, vibrationEnabled, onToggleSound, onToggleVibration, userEmail,
  onHardReset
}) => {
  const [showManual, setShowManual] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    // Initial check
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  if (showManual) return <ManualView onBack={() => setShowManual(false)} />;

  return (
    <motion.div
      {...({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 } } as any)}
      className="flex flex-col h-full bg-[#0a0b0d] relative overflow-hidden"
    >
      {/* Background Dots */}
      <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="flex items-center gap-4 p-6 pb-4 relative z-10 flex-shrink-0">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full text-zinc-400 active:scale-90 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-black uppercase tracking-tighter">Systém_Nastavení</h2>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 relative z-10">
        <div className="space-y-4">
          <div className="p-4 tactical-card border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-signal-cyan/10 rounded-lg text-signal-cyan">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Aktivní_Uživatel</p>
                <p className="text-sm font-mono font-bold text-white">{userEmail || 'GUEST'}</p>
              </div>
            </div>
          </div>

          {/* ADMIN ACCOUNTS SECTION */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div className="h-[1px] flex-1 bg-white/5"></div>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Admin_Účty</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="p-4 tactical-card border-white/5 bg-white/[0.01] flex items-center gap-4 opacity-60">
                <div className="p-2 bg-zinc-800 rounded-lg">
                  <Shield className="w-4 h-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Test Admin</p>
                  <p className="text-xs font-mono text-zinc-500">test@nexus.cz</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowManual(true)}
            className="w-full p-4 tactical-card border-white/10 bg-white/5 flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <BookOpen className="w-5 h-5 text-signal-amber" />
              <span className="text-sm font-bold uppercase tracking-wider">Taktický_Manuál</span>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-signal-amber transition-colors" />
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onToggleSound}
              className={`p-4 tactical-card border-white/10 flex flex-col items-center gap-3 transition-all active:scale-95 ${soundEnabled ? 'bg-signal-cyan/5 border-signal-cyan/30' : 'bg-white/5 opacity-50'}`}
            >
              {soundEnabled ? <Volume2 className="w-6 h-6 text-signal-cyan" /> : <VolumeX className="w-6 h-6 text-zinc-500" />}
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">{soundEnabled ? 'Zvuk_ZAP' : 'Zvuk_VYP'}</span>
            </button>

            <button
              onClick={onToggleVibration}
              className={`p-4 tactical-card border-white/10 flex flex-col items-center gap-3 transition-all active:scale-95 ${vibrationEnabled ? 'bg-signal-cyan/5 border-signal-cyan/30' : 'bg-white/5 opacity-50'}`}
            >
              {vibrationEnabled ? <Vibrate className="w-6 h-6 text-signal-cyan" /> : <VibrateOff className="w-6 h-6 text-zinc-500" />}
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">{vibrationEnabled ? 'Haptika_ZAP' : 'Haptika_VYP'}</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className={`col-span-2 p-4 tactical-card border-white/10 flex flex-col items-center gap-3 transition-all active:scale-95 ${isFullscreen ? 'bg-signal-cyan/5 border-signal-cyan/30' : 'bg-white/5 opacity-50'}`}
            >
              {isFullscreen ? <Minimize className="w-6 h-6 text-signal-cyan" /> : <Maximize className="w-6 h-6 text-zinc-500" />}
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">{isFullscreen ? 'Fullscreen_ZAP' : 'Fullscreen_VYP'}</span>
            </button>
          </div>

          {/* HARD RESET BUTTON */}
          {onHardReset && (
            <button
              onClick={onHardReset}
              className="w-full p-4 border border-orange-500/30 bg-orange-950/20 rounded-xl flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-orange-900/30"
            >
              <div className="flex items-center gap-4">
                <RefreshCw className="w-5 h-5 text-orange-500" />
                <div className="text-left">
                  <span className="text-sm font-black uppercase tracking-wider block text-orange-500">Vynutit Synchronizaci</span>
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tight">Oprava chyb (Smaže cache, stáhne DB)</span>
                </div>
              </div>
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full mt-4 p-4 border border-signal-hazard/30 bg-signal-hazard/10 rounded-xl flex items-center justify-center gap-3 text-signal-hazard font-black uppercase text-xs tracking-[0.3em] active:scale-[0.95] transition-all"
          >
            <LogOut className="w-5 h-5" />
            Odpojit_ze_Sektoru
          </button>
        </div>
      </div>

      <div className="text-center py-4 px-6 relative z-10 flex-shrink-0">
        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Nexus_Companion v1.4.1<br />Build_120FPS_Stable</p>
      </div>
    </motion.div>
  );
};

export default SettingsView;

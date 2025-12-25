import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, ShieldAlert, Cpu } from 'lucide-react';
import { playSound, vibrate } from '../services/soundService';

interface StartupBootProps {
  onComplete: () => void;
}

const StartupBoot: React.FC<StartupBootProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'init' | 'boot' | 'complete'>('init');
  const [progress, setProgress] = useState(0);

  // Automatic transition from init to boot
  useEffect(() => {
    const timer = setTimeout(() => {
        handleStart();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setPhase('boot');
    playSound('open');
    vibrate([40, 40]);
  };

  useEffect(() => {
    if (phase === 'boot') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setPhase('complete');
              playSound('success');
              vibrate([100, 50, 100]);
              setTimeout(onComplete, 1400);
            }, 500);
            return 100;
          }
          return prev + 2;
        });
      }, 35);
      return () => clearInterval(interval);
    }
  }, [phase]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0b0d] flex flex-col items-center justify-center font-sans overflow-hidden p-6">
      <AnimatePresence mode="wait">
        {phase === 'init' && (
          <motion.div 
            key="init"
            {...({ initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, y: 20 } } as any)}
            className="flex flex-col items-center gap-10 text-center"
          >
            <div className="relative">
              <motion.div 
                {...({
                  animate: { scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] },
                  transition: { repeat: Infinity, duration: 2.5 }
                } as any)}
                className="absolute inset-0 bg-[#00f2ff]/20 blur-3xl rounded-full"
              />
              <div className="w-24 h-24 border-2 border-[#ff9d00] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,157,0,0.25)] relative z-10 bg-[#0a0b0d]">
                <Power className="w-10 h-10 text-[#ff9d00]" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h2 className="text-[#00f2ff] font-mono text-[9px] uppercase tracking-[0.4em] mb-2 font-bold opacity-80">NEXUS // JÁDRO_SÍTĚ</h2>
                <h1 className="text-3xl font-black uppercase tracking-tighter chromatic-text leading-none">Systém_Připraven</h1>
              </div>
              <div className="text-signal-cyan font-mono text-[9px] uppercase tracking-[0.2em] font-black animate-pulse opacity-50">
                Navazování spojení...
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'boot' && (
          <motion.div 
            key="boot"
            {...({ initial: { opacity: 0 }, animate: { opacity: 1 } } as any)}
            className="w-full max-w-[280px] flex flex-col items-center gap-8"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <Cpu className="w-12 h-12 text-[#00f2ff] animate-pulse" />
              <span className="text-[#00f2ff] font-mono text-[10px] uppercase tracking-[0.3em] font-black">Probouzení_Sítě</span>
            </div>
            
            <div className="w-full space-y-3">
              <div className="flex justify-between font-mono text-[10px] text-[#ff9d00] font-bold">
                <span>ZAVÁDĚNÍ_PROTOKOLŮ</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  {...({ initial: { width: 0 }, animate: { width: `${progress}%` } } as any)}
                  className="h-full bg-gradient-to-r from-[#ff9d00] to-[#fff] shadow-[0_0_10px_rgba(255,157,0,0.8)]"
                />
              </div>
            </div>

            <div className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em] text-center leading-relaxed font-bold">
              Načítání_Taktických_Vrstev...<br/>
              Kalibrace_Signální_Matice...
            </div>
          </motion.div>
        )}

        {phase === 'complete' && (
          <motion.div 
            key="complete"
            {...({ initial: { scale: 1.1, opacity: 0 }, animate: { scale: 1, opacity: 1 } } as any)}
            className="flex flex-col items-center gap-6"
          >
            <div className="p-8 tactical-card border-[#00f2ff] shadow-[0_0_50px_rgba(0,242,255,0.15)] bg-black/80">
              <div className="corner-accent top-left !border-4"></div>
              <div className="corner-accent bottom-right !border-4"></div>
              <ShieldAlert className="w-16 h-16 text-[#00f2ff]" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-[0.1em] chromatic-text">Autorizováno</h2>
              <p className="text-[#00f2ff] font-mono text-[11px] uppercase tracking-[0.3em] font-black opacity-80">Jednotka_Aktivní_V_Sektoru</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StartupBoot;
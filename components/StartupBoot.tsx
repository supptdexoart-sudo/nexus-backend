
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Fingerprint, Activity, Power } from 'lucide-react';
import { playSound } from '../services/soundService';

interface StartupBootProps {
  onComplete: () => void;
}

const StartupBoot: React.FC<StartupBootProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const bootSequence = [
    { progress: 5, text: "INICIALIZACE JÁDRA..." },
    { progress: 15, text: "KONTROLA INTEGRITY PAMĚTI... OK" },
    { progress: 25, text: "NAČÍTÁNÍ MODULŮ ROZHRANÍ..." },
    { progress: 40, text: "NAVÁZÁNÍ SPOJENÍ S NEXUS SÍTÍ..." },
    { progress: 55, text: "OVĚŘENÍ BIOMETRICKÝCH DAT..." },
    { progress: 70, text: "DEKÓDOVÁNÍ PROTOKOLŮ ŠIFROVÁNÍ..." },
    { progress: 85, text: "SYNCHRONIZACE S MATEŘSKOU LODÍ..." },
    { progress: 95, text: "FINALIZACE NASTAVENÍ..." },
    { progress: 100, text: "SYSTÉM PŘIPRAVEN." }
  ];

  useEffect(() => {
    let currentIndex = 0;

    const runSequence = async () => {
      // Initial delay
      await new Promise(r => setTimeout(r, 500));

      const interval = setInterval(() => {
        if (currentIndex >= bootSequence.length) {
          clearInterval(interval);
          setTimeout(onComplete, 800);
          return;
        }

        const item = bootSequence[currentIndex];
        setProgress(item.progress);
        setLog(prev => [...prev.slice(-6), `> ${item.text} `]);
        playSound('click'); // Boot sequence sound

        currentIndex++;
      }, 300); // Speed of boot sequence
    };

    runSequence();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center text-white overflow-hidden p-8 font-mono">
      {/* CRT Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      <div className="absolute inset-0 pointer-events-none scanlines"></div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/80"></div>

      {/* Main Content */}
      <div className="max-w-md w-full relative z-10 flex flex-col items-center">
        {/* Logo / Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-12 flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-arc-yellow/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 animate-[pulse_3s_infinite]"></div>
            <Power className="w-10 h-10 text-arc-yellow" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-[0.3em] text-white text-center leading-none mb-1">
            NEXUS<span className="text-arc-yellow">LINK</span>
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.5em]">Taktický Terminál v2.1</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-900 mb-8 relative overflow-hidden">
          <motion.div
            className="h-full bg-arc-yellow shadow-[0_0_15px_rgba(249,212,35,0.6)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}% ` }}
            transition={{ ease: "linear" }}
          />
        </div>

        {/* Terminal Log */}
        <div className="w-full font-mono text-xs space-y-1 h-32 flex flex-col justify-end border-l-2 border-white/10 pl-4">
          {log.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-zinc-400 uppercase tracking-wide"
            >
              {i === log.length - 1 ? <span className="text-arc-yellow font-bold blink">{line}_</span> : line}
            </motion.div>
          ))}
        </div>

        {/* Footer Status Indicators */}
        <div className="mt-12 grid grid-cols-3 gap-8 w-full border-t border-white/5 pt-6">
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck className={`w - 4 h - 4 ${progress > 30 ? 'text-arc-cyan' : 'text-zinc-700'} `} />
            <span className={`text - [9px] uppercase tracking - widest ${progress > 30 ? 'text-white' : 'text-zinc-700'} `}>Zabezpečení</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Activity className={`w - 4 h - 4 ${progress > 60 ? 'text-arc-cyan' : 'text-zinc-700'} `} />
            <span className={`text - [9px] uppercase tracking - widest ${progress > 60 ? 'text-white' : 'text-zinc-700'} `}>Spojení</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Fingerprint className={`w - 4 h - 4 ${progress > 80 ? 'text-arc-cyan' : 'text-zinc-700'} `} />
            <span className={`text - [9px] uppercase tracking - widest ${progress > 80 ? 'text-white' : 'text-zinc-700'} `}>Identita</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 text-[8px] text-zinc-700 uppercase tracking-[0.3em]">
        System Initialization Sequence // ID: 8X-299A
      </div>
    </div>
  );
};

export default StartupBoot;
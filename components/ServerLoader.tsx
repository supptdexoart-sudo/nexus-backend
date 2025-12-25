import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server, RefreshCw, PowerOff, ShieldCheck, WifiOff } from 'lucide-react';
import * as apiService from '../services/apiService';

interface ServerLoaderProps {
  onConnected: () => void;
  onSwitchToOffline: () => void;
}

const loadingTexts = [
  "Inicializace protokolu...",
  "Hledání signálu Nexus...",
  "Propojování.##.%./*_#..",
  "Ověřování integrity dat...",
  "Navazování zabezpečeného spojení..."
];

const ServerLoader: React.FC<ServerLoaderProps> = ({ onConnected, onSwitchToOffline }) => {
  const [textIndex, setTextIndex] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    const textInterval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      clearInterval(textInterval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkConnection = async () => {
      if (!isMounted) return;

      // Pokud je prohlížeč v offline režimu, rovnou přepneme UI
      if (!navigator.onLine) {
        setIsTakingLong(true);
        return;
      }

      try {
        const isOnline = await apiService.checkHealth();
        if (isOnline && isMounted) {
          onConnected();
          return;
        }
      } catch (e) {
        console.log("Čekám na signál ze sektoru...");
      }

      if (isMounted) {
        setAttempt(prev => prev + 1);
        if (attempt > 3) setIsTakingLong(true); // Zkráceno čekání pro lepší UX
        timeoutId = setTimeout(checkConnection, 2500);
      }
    };

    checkConnection();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [onConnected, attempt]);

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#222 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>
      
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        <div className="relative mb-12">
            <motion.div 
                {...({
                    animate: { scale: [1, 2.5], opacity: [0.5, 0] },
                    transition: { duration: 2, repeat: Infinity, ease: "easeOut" }
                } as any)}
                className={`absolute inset-0 ${isOffline ? 'bg-amber-500/20' : 'bg-neon-blue/20'} rounded-full blur-md`}
            />

            <div className={`relative w-24 h-24 bg-zinc-900 rounded-2xl border ${isOffline ? 'border-amber-500/50' : 'border-zinc-700'} flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.2)]`}>
                {isOffline ? <WifiOff className="w-10 h-10 text-amber-500" /> : <Server className="w-10 h-10 text-neon-blue" />}
                <div className="absolute -top-1 -right-1">
                    <span className="relative flex h-3 w-3">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOffline ? 'bg-amber-500' : 'bg-green-500'} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${isOffline ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                    </span>
                </div>
            </div>
        </div>

        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mb-6 relative">
            <motion.div 
                {...({
                    animate: { x: ['-100%', '100%'] },
                    transition: { duration: 1.5, repeat: Infinity, ease: "linear" }
                } as any)}
                className={`absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent ${isOffline ? 'via-amber-500' : 'via-neon-blue'} to-transparent`}
            />
        </div>

        <h2 className="text-xl font-display font-bold uppercase tracking-widest mb-2 text-center">
            {isOffline ? 'OFFLINE_REŽIM' : 'PŘIPOJOVÁNÍ'}
        </h2>
        <motion.p 
            key={textIndex}
            {...({ initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -5 } } as any)}
            className="text-xs text-zinc-500 font-mono uppercase tracking-wider text-center h-4"
        >
            {isOffline ? "Lokální protokoly aktivní" : loadingTexts[textIndex]}
        </motion.p>

        <div className="mt-8 flex gap-4 text-[10px] text-zinc-600 font-mono uppercase">
            <div className="flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isOffline ? '' : 'animate-spin'}`} />
                <span>{isOffline ? 'Senzory vypnuty' : `Pokus #${attempt}`}</span>
            </div>
            <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-green-500" />
                <span>Local_Vault OK</span>
            </div>
        </div>

        {isTakingLong && (
            <motion.button
                {...({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } } as any)}
                onClick={onSwitchToOffline}
                className="mt-12 py-4 px-8 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 rounded-xl flex items-center gap-3 text-xs font-black uppercase tracking-widest text-amber-500 hover:text-white transition-all shadow-[0_0_20px_rgba(245,158,11,0.1)]"
            >
                <PowerOff className="w-5 h-5" />
                Aktivovat Offline Nasazení
            </motion.button>
        )}
      </div>
    </div>
  );
};

export default ServerLoader;
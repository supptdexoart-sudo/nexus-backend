
import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCcw, Server } from 'lucide-react';
import * as apiService from '../services/apiService';
import { motion } from 'framer-motion';

interface ServerLoaderProps {
  onConnected: () => void;
  onSwitchToOffline: () => void;
}

const ServerLoader: React.FC<ServerLoaderProps> = ({ onConnected, onSwitchToOffline }) => {
  const [status, setStatus] = useState<'checking' | 'error'>('checking');

  const checkConnection = async () => {
    setStatus('checking');
    const isHealthy = await apiService.checkHealth();
    if (isHealthy) {
      onConnected();
    } else {
      setStatus('error');
    }
  };

  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>

      <div className="max-w-xs w-full text-center relative z-10">
        {status === 'checking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="w-20 h-20 border-2 border-arc-cyan/30 rounded-full flex items-center justify-center animate-[spin_3s_linear_infinite]">
                <div className="w-16 h-16 border-t-2 border-arc-cyan rounded-full"></div>
              </div>
              <Server className="w-8 h-8 text-arc-cyan absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest mb-1">Navazování Spojení</h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">Ověřování integrity signálu...</p>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-24 h-24 bg-red-900/10 border border-red-500/50 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
              <WifiOff className="w-10 h-10 text-red-500" />
            </div>

            <div>
              <h2 className="text-xl font-black text-red-500 uppercase tracking-tighter mb-2">Chyba Připojení</h2>
              <p className="text-xs text-zinc-400 font-bold leading-relaxed">
                Nepodařilo se navázat spojení se serverem.<br />Zkontrolujte signál nebo spusťte lokální protokol.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full mt-4">
              <button
                onClick={checkConnection}
                className="py-4 bg-white text-black font-black uppercase text-xs tracking-widest active:bg-zinc-200 transition-colors flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCcw className="w-4 h-4" /> ZKUSIT ZNOVU
              </button>
              <button
                onClick={onSwitchToOffline}
                className="py-4 bg-zinc-900 text-arc-cyan font-black uppercase text-xs tracking-widest border border-arc-cyan/30 active:bg-arc-cyan/10 transition-colors active:scale-95"
              >
                SPUSTIT LOKÁLNÍ PROTOKOL
              </button>
              <button
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="py-2 text-zinc-600 font-bold uppercase text-[8px] tracking-[0.2em] hover:text-white transition-colors"
              >
                VYČISTIT ARCHIVY (LOGOUT)
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-8 text-[9px] text-zinc-800 font-black uppercase tracking-[0.5em]">Nexus Uplink // Secure Channel</div>
    </div>
  );
};

export default ServerLoader;
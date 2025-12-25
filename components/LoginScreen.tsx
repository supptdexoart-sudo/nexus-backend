
import React, { useState } from 'react';
import { User, ArrowRight, ShieldCheck, AlertTriangle, Check, ShieldAlert, Cpu, Database, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import * as apiService from '../services/apiService';
import ServerLoader from './ServerLoader';
import { playSound, vibrate } from '../services/soundService';

interface LoginScreenProps {
  onLogin: (email: string, nickname?: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [guestNickname, setGuestNickname] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guest Login Logic
  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestNickname.trim().length < 3) {
        setError("Identifikátor (Nick) musí mít alespoň 3 znaky.");
        vibrate(100);
        playSound('error');
        return;
    }
    setError(null);
    setShowConsentModal(true);
  };

  const confirmGuestLogin = () => {
    setShowConsentModal(false);
    playSound('click');
    
    // Uložíme nick do localStorage pro jistotu, ale hlavně ho předáme nahoru
    localStorage.setItem('nexus_nickname_guest', guestNickname.toUpperCase());
    
    setIsConnecting(true);
    // Simulace načítání pro efekt
    setTimeout(() => {
        onLogin('guest', guestNickname.toUpperCase()); 
    }, 1500);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
      if (credentialResponse.credential) {
          setIsConnecting(true);
          setError(null);
          playSound('click');
          try {
              const result = await apiService.loginWithGoogle(credentialResponse.credential);
              vibrate([50, 50]);
              onLogin(result.email);
          } catch (err: any) {
              setIsConnecting(false);
              console.error("Google Login Error:", err);
              
              let msg = "Chyba Google ověření.";
              if (err.message && err.message.includes('Failed to fetch')) {
                  msg = "Nelze se spojit se serverem (Backend spí nebo blokován).";
              } else if (err.message) {
                  msg = `Server Error: ${err.message}`;
              }
              setError(msg);
              playSound('error');
          }
      }
  };

  if (isConnecting) return <ServerLoader onConnected={() => {}} onSwitchToOffline={() => { setIsConnecting(false); setError("Odkaz přerušen."); }} />;

  return (
    <div className="h-screen w-screen bg-[#0a0b0d] flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      {/* Background Dots */}
      <div className="absolute inset-0 pointer-events-none opacity-5 z-0" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="flex justify-between w-full p-8 font-mono text-[10px] text-signal-cyan">
           <span>SIGNÁL: VYHLEDÁVÁNÍ...</span>
           <span>POZ: HLAVNÍ_BRÁNA</span>
        </div>
      </div>

      <motion.div 
        {...({ initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } } as any)}
        className="w-full max-w-sm z-10"
      >
        <div className="text-center mb-10">
           <div className="relative inline-block mb-8">
              <div className="w-24 h-24 tactical-card flex items-center justify-center border-signal-cyan/40 bg-black/40">
                <div className="corner-accent top-left !border-2"></div>
                <div className="corner-accent bottom-right !border-2"></div>
                <ShieldAlert className="w-12 h-12 text-signal-cyan" />
              </div>
           </div>
           <h1 className="text-5xl font-black text-white tracking-tighter uppercase mb-2 chromatic-text">Nexus_Auth</h1>
           <p className="text-signal-cyan font-mono text-[10px] uppercase tracking-[0.5em] font-black">Hybridní desková hra</p>
        </div>

        {/* SECTION 1: GOOGLE LOGIN (FULL ACCOUNT) */}
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-green-500">Doporučeno: Cloud Save (Všechna zařízení)</span>
            </div>
            <div className="flex flex-col justify-center gap-2">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google Login selhal na úrovni klienta.")}
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    text="signin_with"
                    width="100%"
                />
            </div>
        </div>

        {/* DIVIDER */}
        <div className="flex items-center gap-4 mb-8">
             <div className="h-px bg-white/10 flex-1"></div>
             <span className="text-[10px] text-white/30 uppercase font-mono tracking-widest font-black">NEBO HOST (LOCAL SAVE)</span>
             <div className="h-px bg-white/10 flex-1"></div>
        </div>

        {/* SECTION 2: GUEST NICKNAME FORM */}
        <form onSubmit={handleGuestSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em] ml-1 font-mono flex justify-between">
                <span>Identifikace Jednotky</span>
                <span className="text-zinc-500 flex items-center gap-1"><Save className="w-3 h-3"/> Ukládání v prohlížeči</span>
            </label>
            <div className="tactical-card p-0 overflow-hidden border-white/10 focus-within:border-white/40 transition-colors bg-white/5">
              <div className="flex items-center px-5 py-5 gap-4">
                <User className="w-6 h-6 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={guestNickname}
                  onChange={(e) => setGuestNickname(e.target.value)}
                  className="w-full bg-transparent text-white placeholder-white/20 focus:outline-none font-mono text-sm uppercase font-bold"
                  placeholder="ZADEJTE PŘEZDÍVKU..."
                  maxLength={12}
                />
              </div>
            </div>
          </div>
            
          {error && (
              <div className="p-4 bg-signal-hazard/10 border border-signal-hazard/40 text-signal-hazard text-[11px] uppercase font-black tracking-widest text-center animate-pulse">
                  <AlertTriangle className="w-4 h-4 inline mr-2 mb-0.5" /> {error}
              </div>
          )}

          <button type="submit" className="w-full py-5 border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95">
              <Cpu className="w-4 h-4 text-zinc-500" />
              Vstoupit jako Host
              <ArrowRight className="w-4 h-4 text-zinc-500" />
          </button>
        </form>

      </motion.div>

      {/* CONSENT MODAL FOR GUEST */}
      <AnimatePresence>
      {showConsentModal && (
        <div className="fixed inset-0 z-[200] bg-[#0a0b0d]/95 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              {...({
                initial: { scale: 0.96, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0.96, opacity: 0 }
              } as any)}
              className="tactical-card w-full max-w-sm border-zinc-700 p-0 overflow-hidden bg-black/90 shadow-2xl"
            >
                <div className="bg-zinc-900 p-8 border-b border-white/10 flex items-center gap-6">
                    <ShieldCheck className="w-12 h-12 text-zinc-500" />
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Lokální Profil</h3>
                      <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] font-black mt-2">Database Access: OK</p>
                    </div>
                </div>
                <div className="p-8 space-y-6 text-[12px] text-white/70 leading-relaxed font-sans">
                    <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-sm">
                      <p className="text-blue-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2 text-xs"><Database className="w-4 h-4" /> Status: Online</p>
                      <p>Jako <span className="text-white font-bold">HOST</span> máte přístup k databázi karet a online funkcím. Váš inventář se však ukládá pouze do <span className="text-white font-bold">tohoto zařízení</span>.</p>
                    </div>
                    <ul className="space-y-4 font-bold text-zinc-400">
                        <li className="flex gap-4"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /><span>Přístup k Master Databázi karet.</span></li>
                        <li className="flex gap-4"><AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" /><span>Žádná synchronizace mezi zařízeními (Cloud Save).</span></li>
                    </ul>
                </div>
                <div className="p-8 bg-black border-t border-white/10 flex flex-col gap-3">
                    <button onClick={confirmGuestLogin} className="button-primary w-full py-4 text-xs !bg-zinc-200 !text-black">Rozumím, Spustit Misi</button>
                    <button onClick={() => setShowConsentModal(false)} className="w-full py-3 text-zinc-500 hover:text-white text-[10px] uppercase font-black tracking-[0.2em] transition-colors">Zpět</button>
                </div>
            </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default LoginScreen;

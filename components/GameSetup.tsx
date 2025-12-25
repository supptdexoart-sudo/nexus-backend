
import React, { useState } from 'react';
import { User, Hash, ArrowRight, Gamepad2, Loader2, Users, Sword, Wand2, Footprints, Cross, Lock, Eye, EyeOff, AlertTriangle, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { PlayerClass } from '../types';

interface GameSetupProps {
  initialNickname: string;
  onConfirmSetup: (nickname: string, playerClass: PlayerClass, roomId: string | 'create' | 'solo' | 'solo-online', password?: string) => Promise<void>;
  isGuest: boolean;
}

const GameSetup: React.FC<GameSetupProps> = ({ initialNickname, onConfirmSetup, isGuest }) => {
  // Pokud máme initialNickname (z Guest loginu), začneme rovnou výběrem třídy
  const [step, setStep] = useState<'nickname' | 'class' | 'action' | 'join'>(initialNickname ? 'class' : 'nickname');
  const [nickname, setNickname] = useState(initialNickname || '');
  const [selectedClass, setSelectedClass] = useState<PlayerClass | null>(null);
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Password State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);

  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim().length >= 3) {
      setStep('class');
    }
  };

  const handleClassSelect = (pClass: PlayerClass) => {
      setSelectedClass(pClass);
      
      // Pokud je to Guest (Offline), přeskočíme menu a jdeme rovnou do SOLO OFFLINE
      if (isGuest) {
          setIsLoading(true);
          onConfirmSetup(nickname, pClass, 'solo').catch(() => setIsLoading(false));
      } else {
          setTimeout(() => setStep('action'), 300);
      }
  };

  const handleAction = async (action: 'create' | 'join_mode' | 'solo' | 'solo-online') => {
    if (!selectedClass) return;
    
    if (action === 'join_mode') {
      setPassword(''); 
      setError(null);
      setStep('join');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
        const pass = (action === 'create' && isPrivateRoom) ? password : undefined;
        await onConfirmSetup(nickname, selectedClass, action, pass);
    } catch (e: any) {
        setIsLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !selectedClass) return;
    
    setIsLoading(true);
    setError(null);
    try {
        await onConfirmSetup(nickname, selectedClass, roomId.toUpperCase().trim(), password || undefined);
    } catch (err: any) {
        console.error("Join failed:", err);
        setError(err.message || "Nepodařilo se připojit. Zkontrolujte ID místnosti.");
        setIsLoading(false);
    }
  };

  const classes = [
      { id: PlayerClass.WARRIOR, icon: <Sword className="w-6 h-6"/>, desc: "Mistr boje zblízka. Vysoká odolnost.", color: "text-red-500", border: "border-red-500" },
      { id: PlayerClass.MAGE, icon: <Wand2 className="w-6 h-6"/>, desc: "Vidí magické aury a skryté zprávy.", color: "text-blue-400", border: "border-blue-400" },
      { id: PlayerClass.ROGUE, icon: <Footprints className="w-6 h-6"/>, desc: "Najde loot tam, kde ostatní vidí stín.", color: "text-green-500", border: "border-green-500" },
      { id: PlayerClass.CLERIC, icon: <Cross className="w-6 h-6"/>, desc: "Léčitel a ochránce před temnotou.", color: "text-yellow-500", border: "border-yellow-500" },
  ];

  if (isLoading && isGuest) {
      return (
          <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
              <p className="text-white font-mono text-xs uppercase tracking-widest">Generování offline prostředí...</p>
          </div>
      );
  }

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-start p-6 pt-12 relative overflow-hidden overflow-y-auto no-scrollbar">
        {/* Background Dots */}
        <div className="absolute inset-0 pointer-events-none opacity-5 z-0" 
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        </div>

        {/* Decorative Background */}
        <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-signal-cyan/5 to-transparent"></div>
             <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-signal-amber/5 to-transparent"></div>
        </div>

        <motion.div 
            key={step}
            {...({ initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } } as any)}
            className="w-full max-w-sm relative z-10 pb-10"
        >
            {/* --- STEP 1: NICKNAME --- */}
            {step === 'nickname' && (
                <div className="text-center mt-20">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700 shadow-xl">
                        <User className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Identifikace</h2>
                    <p className="text-zinc-400 text-sm mb-8 font-bold tracking-tight">Zadejte svou herní přezdívku.</p>
                    
                    <form onSubmit={handleNicknameSubmit}>
                        <input 
                            type="text" 
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Přezdívka..."
                            className="w-full bg-zinc-900 border border-zinc-700 p-4 rounded-xl text-white font-display text-center text-lg focus:border-signal-cyan outline-none mb-4 uppercase font-bold"
                            maxLength={12}
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            disabled={nickname.length < 3}
                            className="button-primary w-full py-5 text-sm"
                        >
                            Pokračovat
                        </button>
                    </form>
                </div>
            )}

            {/* --- STEP 2: CLASS SELECTION --- */}
            {step === 'class' && (
                <div className="flex flex-col h-full">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter">Zvolte Třídu</h2>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Vaše role ovlivní herní mechaniky.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1 no-scrollbar">
                        {classes.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => handleClassSelect(c.id)}
                                className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${selectedClass === c.id ? `bg-zinc-900 ${c.border}` : 'bg-black border-zinc-800 hover:border-zinc-700'}`}
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className={`p-3 rounded-lg bg-zinc-900 ${c.color} border border-white/5`}>
                                        {c.icon}
                                    </div>
                                    <div>
                                        <h3 className={`font-black uppercase tracking-widest ${c.color}`}>{c.id}</h3>
                                        <p className="text-[11px] text-zinc-300 font-bold leading-tight mt-1">{c.desc}</p>
                                    </div>
                                </div>
                                {selectedClass === c.id && (
                                    <motion.div {...({ layoutId: "class-highlight" } as any)} className={`absolute inset-0 opacity-10 ${c.color.replace('text-', 'bg-')}`} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* --- STEP 3: ACTION CHOICE --- */}
            {step === 'action' && !isGuest && (
                <div className="flex flex-col gap-4">
                    <div className="text-center mb-6">
                        <button onClick={() => setStep('class')} className="text-[10px] text-zinc-500 uppercase tracking-widest hover:text-white mb-2 font-bold underline underline-offset-4">Změnit Třídu</button>
                        <h2 className="text-3xl font-black text-white uppercase tracking-wider">PŘÍPRAVA</h2>
                        <div className="flex justify-center items-center gap-2 mt-2">
                            <span className="text-white font-bold tracking-tight">{nickname}</span>
                            <span className="text-zinc-600">•</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-signal-cyan uppercase font-black tracking-widest`}>{selectedClass}</span>
                        </div>
                    </div>

                    {/* CREATE ROOM */}
                    <div className="p-5 bg-zinc-900/90 border-2 border-zinc-800 hover:border-signal-cyan rounded-2xl transition-all shadow-xl backdrop-blur-sm">
                        <div onClick={() => !isPrivateRoom && handleAction('create')} className={`cursor-pointer ${isPrivateRoom ? '' : 'flex flex-col'}`}>
                            <div className="flex items-center gap-4 mb-2">
                                <Users className="w-7 h-7 text-signal-cyan" />
                                <div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Založit_Sektor</h3>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Nová místnost pro skupinu.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Lock className="w-3 h-3"/> Soukromý_Sektor</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isPrivateRoom} onChange={(e) => {setIsPrivateRoom(e.target.checked); if(!e.target.checked) setPassword('');}}/>
                                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-signal-cyan"></div>
                                </label>
                            </div>
                            
                            {isPrivateRoom && (
                                <div className="animate-in slide-in-from-top-2 bg-black/40 p-3 rounded-lg border border-white/5">
                                    <input 
                                        type="text" 
                                        placeholder="Vstupní klíč..."
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-transparent p-2 text-white text-sm outline-none focus:border-signal-cyan font-mono uppercase font-bold"
                                    />
                                </div>
                            )}

                            {isPrivateRoom && (
                                <button 
                                    onClick={() => handleAction('create')}
                                    disabled={isLoading || (isPrivateRoom && password.length < 3)}
                                    className="w-full py-4 bg-zinc-900 border-2 border-signal-cyan/50 text-signal-cyan font-black uppercase rounded-xl text-xs mt-2 disabled:opacity-50 tracking-[0.2em] shadow-[0_0_20px_rgba(0,242,255,0.15)] active:scale-95 transition-transform"
                                >
                                    Inicializovat Soukromý Sektor
                                </button>
                            )}
                        </div>
                    </div>

                    {/* JOIN ROOM */}
                    <button 
                        onClick={() => handleAction('join_mode')}
                        disabled={isLoading}
                        className="group relative overflow-hidden w-full p-5 bg-zinc-900/80 border-2 border-zinc-800 hover:border-signal-amber rounded-2xl text-left transition-all active:scale-[0.98] shadow-lg"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-signal-amber/10 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
                        <Hash className="w-7 h-7 text-signal-amber mb-2 relative z-10" />
                        <h3 className="text-lg font-bold text-white relative z-10 uppercase tracking-tighter">Vstoupit do Sektoru</h3>
                        <p className="text-[10px] text-zinc-400 mt-1 relative z-10 font-bold uppercase tracking-wider">Připojit se k existující jednotce.</p>
                    </button>

                    {/* SOLO ONLINE */}
                    <button 
                        onClick={() => handleAction('solo-online')}
                        disabled={isLoading}
                        className="group relative overflow-hidden w-full p-5 bg-zinc-900/80 border-2 border-zinc-800 hover:border-white rounded-2xl text-left transition-all active:scale-[0.98] shadow-lg"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
                        <Globe className="w-7 h-7 text-white mb-2 relative z-10" />
                        <h3 className="text-lg font-bold text-white relative z-10 uppercase tracking-tighter">Samostatná_Mise (Online)</h3>
                        <p className="text-[10px] text-zinc-400 mt-1 relative z-10 font-bold uppercase tracking-wider">Solo hra se synchronizací Vaultu.</p>
                    </button>

                    <div className="mt-2 flex items-center gap-4">
                         <div className="h-px bg-zinc-800 flex-1"></div>
                         <span className="text-[10px] text-zinc-600 uppercase font-black">Nebo</span>
                         <div className="h-px bg-zinc-800 flex-1"></div>
                    </div>

                    <button 
                        onClick={() => handleAction('solo')}
                        className="w-full py-3 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                    >
                        <Gamepad2 className="w-4 h-4" /> Samostatná_Mise (Offline)
                    </button>
                </div>
            )}

            {/* --- STEP 4: JOIN INPUT --- */}
            {step === 'join' && !isGuest && (
                <div className="text-center mt-10">
                    <button onClick={() => setStep('action')} className="text-zinc-500 text-[10px] font-black uppercase mb-6 hover:text-white tracking-widest underline underline-offset-4">← Zpět do Lobby</button>
                    
                    <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest">Připojení k Sektoru</h2>
                    
                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-xs text-center mb-4 font-bold animate-pulse flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleJoinSubmit} className="space-y-4">
                        <div>
                            <input 
                                type="text" 
                                value={roomId}
                                onChange={(e) => {
                                    setRoomId(e.target.value);
                                    if(error) setError(null);
                                }}
                                placeholder="A1B2C"
                                className="w-full bg-black border border-zinc-700 p-6 rounded-xl text-white font-mono text-center text-3xl uppercase focus:border-signal-amber outline-none tracking-[0.5em]"
                                maxLength={5}
                                autoFocus
                            />
                            <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">Unikátní Kód Sektoru</p>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-zinc-600" />
                            </div>
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Přístupový klíč (pokud je vyžadován)"
                                className="w-full bg-zinc-900 border border-zinc-700 p-4 pl-10 pr-10 rounded-xl text-white outline-none focus:border-signal-amber text-sm font-bold uppercase"
                            />
                             <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading || roomId.length < 1}
                            className="button-primary w-full py-5 text-sm !bg-signal-amber shadow-none"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Navázat Spojení"} <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </form>
                </div>
            )}

        </motion.div>
    </div>
  );
};

export default GameSetup;

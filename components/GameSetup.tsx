
import React, { useState } from 'react';
import { User, Hash, ArrowRight, Gamepad2, Loader2, Users, Lock, Eye, EyeOff, AlertTriangle, Globe, Camera, Heart, Swords, Shield, Fuel, Coins, Wind } from 'lucide-react';
import { motion } from 'framer-motion';
import { PlayerClass, Character } from '../types';
import * as apiService from '../services/apiService';
import Scanner from './Scanner';

interface GameSetupProps {
    initialNickname: string;
    onConfirmSetup: (nickname: string, playerClass: PlayerClass, roomId: string | 'create' | 'solo' | 'solo-online', password?: string, character?: Character | null) => Promise<void>;
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

    // Character Selection State
    const [characterId, setCharacterId] = useState('');
    const [loadedCharacter, setLoadedCharacter] = useState<Character | null>(null);
    const [isLoadingCharacter, setIsLoadingCharacter] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

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
            await onConfirmSetup(nickname, selectedClass, action, pass, loadedCharacter);
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
            await onConfirmSetup(nickname, selectedClass, roomId.toUpperCase().trim(), password || undefined, loadedCharacter);
        } catch (err: any) {
            console.error("Join failed:", err);
            setError(err.message || "Nepodařilo se připojit. Zkontrolujte ID místnosti.");
            setIsLoading(false);
        }
    };



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
            <div className="fixed inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            {/* Decorative Background */}
            <div className="fixed inset-0 pointer-events-none">
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

                {/* --- STEP 2: CHARACTER SELECTION (QR / MANUAL) --- */}
                {step === 'class' && (
                    <div className="flex flex-col h-full">
                        <div className="text-center mb-10">
                            <div className="w-20 h-20 bg-signal-cyan/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-signal-cyan/20 shadow-[0_0_20px_rgba(0,242,255,0.1)]">
                                <Gamepad2 className="w-10 h-10 text-signal-cyan" />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Vybral sis postavu?</h2>
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                                Naskenuj její <span className="text-signal-cyan">QR kód</span> ze spodu figurky!
                            </p>
                        </div>

                        <div className="space-y-6">
                            {/* QR Scanner Button (Primary Action) */}
                            <button
                                onClick={() => setShowScanner(true)}
                                className="w-full py-8 bg-signal-cyan text-black rounded-2xl font-black uppercase text-sm active:scale-95 transition-all flex flex-col items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,242,255,0.3)] hover:shadow-[0_0_40px_rgba(0,242,255,0.5)] cursor-pointer"
                            >
                                <Camera className="w-8 h-8" />
                                <span className="tracking-[0.2em]">Spustit Skener</span>
                            </button>

                            <div className="relative py-4 flex items-center gap-4">
                                <div className="h-px bg-zinc-700 flex-1"></div>
                                <span className="text-[10px] text-zinc-300 uppercase font-black tracking-widest bg-zinc-950 px-2 relative z-10">Nebo zadej kód ručně</span>
                                <div className="h-px bg-zinc-700 flex-1"></div>
                            </div>

                            {/* Manual Entry */}
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={characterId}
                                        onChange={(e) => setCharacterId(e.target.value.toUpperCase())}
                                        placeholder="NAPŘ. CHAR-001"
                                        className="flex-1 bg-zinc-900 border-2 border-zinc-700 px-4 py-4 rounded-xl text-white font-mono uppercase text-sm focus:border-signal-cyan outline-none transition-colors placeholder:opacity-30"
                                        maxLength={10}
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!characterId.trim()) return;
                                            setIsLoadingCharacter(true);
                                            setError(null);
                                            try {
                                                const char = await apiService.getCharacterById(characterId.trim());
                                                if (char) {
                                                    setLoadedCharacter(char);
                                                    setSelectedClass(char.name as any);
                                                    setError('');
                                                    setShowSuccess(true);
                                                    setTimeout(() => {
                                                        setShowSuccess(false);
                                                        setStep('action');
                                                    }, 2500);
                                                } else {
                                                    setError('Postava nenalezena! Zkontrolujte ID.');
                                                }
                                            } catch (e) {
                                                console.error("Load character error:", e);
                                                setError('Chyba při komunikaci se serverem.');
                                            } finally {
                                                setIsLoadingCharacter(false);
                                            }
                                        }}
                                        disabled={!characterId.trim() || isLoadingCharacter}
                                        className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold uppercase text-xs transition-colors disabled:opacity-30 flex items-center justify-center min-w-[100px]"
                                    >
                                        {isLoadingCharacter ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Načíst'}
                                    </button>
                                </div>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-xs text-red-500 text-center font-bold uppercase tracking-wider"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </div>
                        </div>

                        {/* Scanner Modal Overlay */}
                        {showScanner && (
                            <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[110] bg-gradient-to-b from-black to-transparent">
                                    <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Scanner Active</span>
                                    <button
                                        onClick={() => setShowScanner(false)}
                                        className="px-6 py-2 bg-red-500/20 border border-red-500/50 text-red-500 rounded-full font-black uppercase text-[10px] active:scale-95 transition-all"
                                    >
                                        Zrušit
                                    </button>
                                </div>

                                <Scanner
                                    onScanCode={async (code) => {
                                        if (code.toUpperCase().startsWith('CHAR-')) {
                                            setShowScanner(false);
                                            setCharacterId(code.toUpperCase());
                                            setIsLoadingCharacter(true);
                                            setError(null);
                                            try {
                                                const char = await apiService.getCharacterById(code.toUpperCase());
                                                if (char) {
                                                    setLoadedCharacter(char);
                                                    setSelectedClass(char.name as any);
                                                    setShowSuccess(true);
                                                    setTimeout(() => {
                                                        setShowSuccess(false);
                                                        setStep('action');
                                                    }, 2500);
                                                } else {
                                                    setError('Postava nenalezena!');
                                                }
                                            } catch (e) {
                                                setError('Chyba při načítání postavy.');
                                            } finally {
                                                setIsLoadingCharacter(false);
                                            }
                                        } else {
                                            // Optional: visual feedback for invalid code without closing scanner
                                            console.warn("Invalid QR code:", code);
                                        }
                                    }}
                                    isAIThinking={isLoadingCharacter}
                                    isPaused={false}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* --- STEP 3: ACTION CHOICE --- */}
                {step === 'action' && (
                    <div className="flex flex-col gap-4">
                        <div className="text-center mb-6">
                            <button
                                onClick={() => { setStep('class'); setLoadedCharacter(null); setCharacterId(''); }}
                                className="px-3 py-1 bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-400 uppercase tracking-widest active:text-white mb-4 font-bold rounded-lg hover:border-signal-cyan transition-colors"
                            >
                                ← Změnit {loadedCharacter ? 'Postavu' : 'Třídu'}
                            </button>
                            <h2 className="text-3xl font-black text-white uppercase tracking-wider">PŘÍPRAVA</h2>
                            <div className="flex justify-center items-center gap-2 mt-2">
                                <span className="text-white font-bold tracking-tight">{nickname}</span>
                                <span className="text-zinc-600">•</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-signal-cyan uppercase font-black tracking-widest`}>{selectedClass}</span>
                            </div>
                            {loadedCharacter && (
                                <div className="mt-4 p-4 bg-zinc-900/50 border border-signal-cyan/30 rounded-xl">
                                    <p className="text-xs text-signal-cyan uppercase font-bold mb-2">Vlastní postava</p>
                                    <p className="text-sm text-zinc-400 mb-3">{loadedCharacter.description}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                                            <Heart className="w-4 h-4 text-red-500 mb-1" />
                                            <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none">HP</div>
                                            <div className="text-lg font-mono font-black text-white leading-none">{loadedCharacter.baseStats.hp}</div>
                                        </div>
                                        <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                                            <Swords className="w-4 h-4 text-orange-500 mb-1" />
                                            <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none">DMG</div>
                                            <div className="text-lg font-mono font-black text-white leading-none">{loadedCharacter.baseStats.damage}</div>
                                        </div>
                                        <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                                            <Shield className="w-4 h-4 text-blue-400 mb-1" />
                                            <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none">ARM</div>
                                            <div className="text-lg font-mono font-black text-white leading-none">{loadedCharacter.baseStats.armor}</div>
                                        </div>

                                        <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                                            <Fuel className="w-4 h-4 text-amber-500 mb-1" />
                                            <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none">FUEL</div>
                                            <div className="text-lg font-mono font-black text-white leading-none">{loadedCharacter.baseStats.fuel || 0}</div>
                                        </div>
                                        <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                                            <Coins className="w-4 h-4 text-yellow-500 mb-1" />
                                            <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none">GOLD</div>
                                            <div className="text-lg font-mono font-black text-white leading-none">{loadedCharacter.baseStats.gold || 0}</div>
                                        </div>
                                        <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                                            <Wind className="w-4 h-4 text-cyan-400 mb-1" />
                                            <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none">O2</div>
                                            <div className="text-lg font-mono font-black text-white leading-none">{loadedCharacter.baseStats.oxygen || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CREATE ROOM */}
                        <div className="p-5 bg-zinc-900/90 border-2 border-zinc-800 active:border-signal-cyan rounded-2xl transition-all shadow-xl backdrop-blur-sm">
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
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Lock className="w-3 h-3" /> Soukromý_Sektor</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isPrivateRoom} onChange={(e) => { setIsPrivateRoom(e.target.checked); if (!e.target.checked) setPassword(''); }} />
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
                            className="group relative overflow-hidden w-full p-5 bg-zinc-900/80 border-2 border-zinc-800 active:border-signal-amber rounded-2xl text-left transition-all active:scale-[0.98] shadow-lg"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-signal-amber/10 to-transparent translate-x-[-100%] group-active:translate-x-0 transition-transform duration-500"></div>
                            <Hash className="w-7 h-7 text-signal-amber mb-2 relative z-10" />
                            <h3 className="text-lg font-bold text-white relative z-10 uppercase tracking-tighter">Vstoupit do Sektoru</h3>
                            <p className="text-[10px] text-zinc-400 mt-1 relative z-10 font-bold uppercase tracking-wider">Připojit se k existující jednotce.</p>
                        </button>

                        {/* SOLO ONLINE */}
                        <button
                            onClick={() => handleAction('solo-online')}
                            disabled={isLoading}
                            className="group relative overflow-hidden w-full p-5 bg-zinc-900/80 border-2 border-zinc-800 active:border-white rounded-2xl text-left transition-all active:scale-[0.98] shadow-lg"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent translate-x-[-100%] group-active:translate-x-0 transition-transform duration-500"></div>
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
                            className="w-full py-4 bg-zinc-950 border border-zinc-800 text-zinc-400 active:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 rounded-xl hover:bg-zinc-900"
                        >
                            <Gamepad2 className="w-5 h-5 text-zinc-600" />
                            <span>Samostatná_Mise (Offline)</span>
                        </button>
                    </div>
                )}

                {/* --- STEP 4: JOIN INPUT --- */}
                {step === 'join' && (
                    <div className="text-center mt-10">
                        <button onClick={() => setStep('action')} className="text-zinc-500 text-[10px] font-black uppercase mb-6 active:text-white tracking-widest underline underline-offset-4">← Zpět do Lobby</button>

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
                                        if (error) setError(null);
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
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 active:text-white"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || roomId.length < 1}
                                className="button-primary w-full py-5 text-sm !bg-signal-amber shadow-none"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Navázat Spojení"} <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                        </form>
                    </div>
                )}

            </motion.div>

            {/* Success Overlay */}
            {showSuccess && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center"
                >
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-zinc-900 border-2 border-signal-cyan rounded-2xl p-8 text-center shadow-2xl"
                    >
                        <div className="w-16 h-16 bg-signal-cyan rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Postava načtena!</h3>
                        <p className="text-sm text-signal-cyan font-bold mb-4">{loadedCharacter?.name}</p>

                        {loadedCharacter?.perks && loadedCharacter.perks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10 text-left">
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Aktivní bonusy:</p>
                                <div className="space-y-1">
                                    {loadedCharacter.perks.map((p: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 text-[11px]">
                                            <div className="w-1 h-1 bg-signal-cyan rounded-full" />
                                            <span className="text-white font-bold">{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default GameSetup;

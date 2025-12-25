
import React, { useState } from 'react';
import { GameEvent, PlayerClass, Stat } from '../../types';
import { Zap, Skull, Dice5, Keyboard, Activity, Check, ShieldAlert, Fingerprint, Box, ArrowRight, Coins, ShieldCheck, LockOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, vibrate } from '../../services/soundService';

interface TrapCardProps {
    event: GameEvent;
    onClose: () => void;
    onPlayerDamage?: (amount: number) => void;
    playerClass?: PlayerClass | null;
    onClaimLoot?: (stats: Stat[]) => void;
}

export const TrapCard: React.FC<TrapCardProps> = ({ event, onClose, onPlayerDamage, playerClass, onClaimLoot }) => {
    const [trapStatus, setTrapStatus] = useState<'active' | 'success' | 'fail' | 'claimed'>('active');
    
    // Dice State
    const [isRolling, setIsRolling] = useState(false);
    const [diceValues, setDiceValues] = useState<[number, number] | null>(null);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualRollValue, setManualRollValue] = useState<string>('');

    // ROBUST CONFIG MERGE
    const config = {
        difficulty: event.trapConfig?.difficulty ?? 10,
        damage: event.trapConfig?.damage ?? 20,
        disarmClass: event.trapConfig?.disarmClass || 'ANY',
        successMessage: event.trapConfig?.successMessage || "Past zneškodněna.",
        failMessage: event.trapConfig?.failMessage || "Past sklapla!",
        trapType: event.trapConfig?.trapType || "NÁSTRAHA",
        loot: event.trapConfig?.loot || [] 
    };
    
    const canDisarm = playerClass && config.disarmClass === playerClass;
    const trapTypeLabel = config.trapType || "NEZNÁMÁ HROZBA";

    const handleDisarm = () => {
        setTrapStatus('success');
        playSound('success');
        vibrate([50, 50, 50]);
    };

    const handleClaim = () => {
        if (trapStatus !== 'success') return;
        
        if (config.loot && config.loot.length > 0 && onClaimLoot) {
            onClaimLoot(config.loot);
        }
        
        setTrapStatus('claimed');
        playSound('open');
        setTimeout(onClose, 800);
    };

    const handleVirtualRoll = () => {
        if (isRolling || trapStatus !== 'active') return;
        setIsRolling(true);
        setShowManualInput(false);
        playSound('scan');

        let rolls = 0;
        const interval = setInterval(() => {
            setDiceValues([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
            rolls++;
            if (rolls > 10) {
                clearInterval(interval);
                finalizeRoll();
            }
        }, 50);
    };

    const handleManualSubmit = () => {
        const val = parseInt(manualRollValue);
        if (isNaN(val) || val < 2 || val > 12) {
            playSound('error');
            return;
        }
        setShowManualInput(false);
        const d1 = Math.floor(val / 2);
        const d2 = val - d1;
        setDiceValues([d1, d2]);
        finalizeRoll(val);
    };

    const finalizeRoll = (manualTotal?: number) => {
        let total = 0;
        if (manualTotal !== undefined) {
            total = manualTotal;
        } else {
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            setDiceValues([d1, d2]);
            total = d1 + d2;
        }

        setIsRolling(false);
        
        if (total >= config.difficulty) {
            // SUCCESS
            setTrapStatus('success');
            playSound('success');
            vibrate([50, 50]);
        } else {
            // FAIL
            setTrapStatus('fail');
            playSound('error');
            vibrate([200, 100, 200]);
            
            // Apply Damage
            if (onPlayerDamage && config.damage > 0) {
                setTimeout(() => {
                    onPlayerDamage(-config.damage);
                }, 500);
            }
            
            // Auto close/resolve a bit later so player sees the result
            setTimeout(onClose, 2500);
        }
    };

    return (
        <div className="space-y-4">
            {/* --- STATUS HEADER --- */}
            <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${
                trapStatus === 'active' ? 'bg-orange-950/30 border-orange-500/50' :
                trapStatus === 'success' || trapStatus === 'claimed' ? 'bg-green-950/30 border-green-500' :
                'bg-red-950/30 border-red-600'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full border ${
                        trapStatus === 'active' ? 'bg-orange-500/10 border-orange-500 text-orange-500' :
                        trapStatus === 'success' || trapStatus === 'claimed' ? 'bg-green-500/10 border-green-500 text-green-500' :
                        'bg-red-500/10 border-red-500 text-red-500'
                    }`}>
                        {trapStatus === 'active' ? <Zap className="w-6 h-6 animate-pulse" /> : 
                         trapStatus === 'success' || trapStatus === 'claimed' ? <Check className="w-6 h-6" /> : 
                         <ShieldAlert className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest ${
                            trapStatus === 'active' ? 'text-orange-500' :
                            trapStatus === 'success' || trapStatus === 'claimed' ? 'text-green-500' : 'text-red-500'
                        }`}>
                            {trapStatus === 'active' ? 'DETEKOVÁNA HROZBA' : 
                             trapStatus === 'success' ? 'PAST ZNEŠKODNĚNA' : 
                             trapStatus === 'claimed' ? 'HOTOVO' : 'PAST SPUŠTĚNA'}
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">
                            {trapStatus === 'active' ? trapTypeLabel : (trapStatus === 'success' ? config.successMessage : config.failMessage)}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- CHALLENGE INFO --- */}
            {trapStatus === 'active' && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/60 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center gap-1">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Obtížnost (Cíl)</span>
                        <div className={`text-3xl font-black font-mono flex items-center gap-2 ${canDisarm ? 'text-green-500' : 'text-white'}`}>
                            {canDisarm ? <LockOpen className="w-5 h-5"/> : <Activity className="w-5 h-5 text-zinc-600"/>} 
                            {canDisarm ? '0' : `${config.difficulty}+`}
                        </div>
                    </div>
                    <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl flex flex-col items-center justify-center gap-1">
                        <span className="text-[9px] text-red-400 uppercase font-bold tracking-widest">Riziko (DMG)</span>
                        <div className="text-3xl font-black text-red-500 font-mono flex items-center gap-2">
                            <Skull className="w-5 h-5"/> -{config.damage}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUCCESS REWARD SCREEN --- */}
            {trapStatus === 'success' && (
                <div className="animate-in zoom-in duration-300 space-y-4">
                    <div className="bg-green-950/20 border border-green-500/30 p-4 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-20">
                            <Coins className="w-16 h-16 text-green-500" />
                        </div>
                        
                        <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-3 border-b border-green-500/30 pb-2">
                            Odměna za zneškodnění (Loot)
                        </p>
                        
                        {config.loot && config.loot.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 relative z-10">
                                {config.loot.map((stat, i) => (
                                    <div key={i} className="bg-black p-3 rounded border border-green-900 flex justify-between items-center shadow-lg">
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                                        <span className="text-lg font-mono font-black text-green-500">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-zinc-500 italic py-4 text-center">Žádná dodatečná odměna. Past se jen vypne.</p>
                        )}
                    </div>

                    <button 
                        onClick={handleClaim}
                        className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {config.loot && config.loot.length > 0 ? (
                            <>VYZVEDNOUT A ULOŽIT <Box className="w-4 h-4" /></>
                        ) : (
                            <>POKRAČOVAT <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            )}

            {/* --- MAIN ACTION AREA (ACTIVE) --- */}
            {trapStatus === 'active' && (
                <div className="bg-black border border-white/10 rounded-xl p-4 relative overflow-hidden">
                    
                    {/* EXPERT BYPASS UI */}
                    {canDisarm ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3 mb-4 bg-green-900/10 p-3 rounded-lg border border-green-500/20">
                                <ShieldCheck className="w-8 h-8 text-green-400" />
                                <div>
                                    <h4 className="text-xs font-black text-green-400 uppercase tracking-widest">Autorizace Přijata: {playerClass}</h4>
                                    <p className="text-[10px] text-zinc-400 font-mono leading-tight mt-1">
                                        Tvůj výcvik ti umožňuje tento mechanismus bezpečně obejít. Kostky nejsou potřeba.
                                    </p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleDisarm}
                                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-pulse"
                            >
                                <Fingerprint className="w-5 h-5" />
                                BEZPEČNĚ ZNEŠKODNIT
                            </button>
                        </div>
                    ) : (
                        // STANDARD ROLL UI
                        <>
                            {/* MANUAL INPUT OVERLAY */}
                            <AnimatePresence>
                                {showManualInput && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center p-4 space-y-3"
                                    >
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Zadejte součet 2 kostek</h4>
                                        <input 
                                            type="number" 
                                            autoFocus
                                            value={manualRollValue}
                                            onChange={(e) => setManualRollValue(e.target.value)}
                                            placeholder="2-12"
                                            className="w-24 bg-zinc-900 border border-zinc-700 p-3 text-center text-xl font-bold text-white rounded-xl outline-none focus:border-orange-500"
                                        />
                                        <div className="flex gap-2 w-full">
                                            <button onClick={() => setShowManualInput(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-bold text-[10px] uppercase rounded-lg">Zrušit</button>
                                            <button onClick={handleManualSubmit} className="flex-1 py-3 bg-orange-600 text-white font-bold text-[10px] uppercase rounded-lg">Potvrdit</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* DICE ANIMATION */}
                            <AnimatePresence>
                                {isRolling && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.5 }} 
                                        animate={{ opacity: 1, scale: 1 }} 
                                        exit={{ opacity: 0, scale: 1.5 }}
                                        className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center gap-4"
                                    >
                                        <div className="text-center">
                                            <div className="flex gap-2 justify-center mb-2">
                                                <Dice5 className="w-12 h-12 text-white animate-spin" />
                                                <Dice5 className="w-12 h-12 text-white animate-spin" style={{ animationDirection: 'reverse' }} />
                                            </div>
                                            <span className="text-2xl font-black text-white font-mono tracking-widest">
                                                {diceValues ? `${diceValues[0]} + ${diceValues[1]}` : '? + ?'}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-3 text-center">
                                Zvolte metodu ověření
                            </p>

                            <div className="flex gap-2 h-20">
                                <button 
                                    onClick={() => setShowManualInput(true)}
                                    disabled={isRolling}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-[10px] tracking-[0.1em] rounded-xl flex flex-col items-center justify-center gap-2 border border-zinc-600 active:scale-95 transition-all group"
                                >
                                    <Keyboard className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                                    <span>ZADAT HOD (FYZICKÉ KOSTKY)</span>
                                </button>

                                <button 
                                    onClick={handleVirtualRoll}
                                    disabled={isRolling}
                                    className="w-24 bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95 transition-all flex flex-col items-center justify-center border border-orange-400"
                                >
                                    <Dice5 className="w-8 h-8" />
                                    <span className="text-[8px] font-bold mt-1">VIRTUÁLNÍ</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

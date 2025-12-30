import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Skull, Sword, Clock, Trophy } from 'lucide-react';
import { RaidState } from '../types';
import * as apiService from '../services/apiService';
import { playSound, vibrate } from '../services/soundService';

interface BossRaidScreenProps {
    roomId: string;
    playerNickname: string;
    raidState: RaidState;
    members: { name: string, hp: number }[];
    onClose?: () => void; // For admin or manual close
}

const BossRaidScreen: React.FC<BossRaidScreenProps> = ({ roomId, playerNickname, raidState, members, onClose }) => {
    const [damageInput, setDamageInput] = useState<string>('');
    const [isAttacking, setIsAttacking] = useState(false);
    const [localLog, setLocalLog] = useState<string[]>([]);

    // Auto-scroll log
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (raidState.combatLog) {
            setLocalLog(raidState.combatLog);
        }
    }, [raidState.combatLog]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [localLog]);

    const currentPlayerTurn = members[raidState.turnIndex]?.name;
    const isMyTurn = currentPlayerTurn === playerNickname;
    const isVictory = raidState.currentHp <= 0;

    const handleAttack = async () => {
        if (!isMyTurn || !damageInput) return;

        const dmg = parseInt(damageInput);
        if (isNaN(dmg) || dmg < 0) return;

        setIsAttacking(true);
        playSound('scan');
        vibrate([50, 50]);

        try {
            await apiService.attackRaidBoss(roomId, dmg, playerNickname);
            setDamageInput('');
        } catch (e) {
            console.error("Attack failed", e);
        } finally {
            setIsAttacking(false);
        }
    };

    const handleCloseRaid = async () => {
        if (confirm("Opravdu ukončit tento Raid pro celou místnost?")) {
            await apiService.endRaid(roomId);
            if (onClose) onClose();
        }
    };

    return (
        <motion.div
            {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)}
            className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4 overflow-hidden"
        >
            {/* Background Pulse Effect */}
            <div className={`absolute inset-0 pointer-events-none opacity-20 ${isMyTurn ? 'bg-red-900 animate-pulse' : 'bg-black'}`}></div>

            <div className="w-full max-w-lg relative z-10 flex flex-col h-full max-h-[90vh]">

                {/* BOSS HEADER */}
                <div className="text-center mb-6">
                    <motion.div
                        {...({
                            animate: { scale: isMyTurn ? [1, 1.1, 1] : 1 },
                            transition: { repeat: Infinity, duration: 2 }
                        } as any)}
                        className="w-24 h-24 bg-red-950 rounded-full border-4 border-red-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_50px_rgba(220,38,38,0.5)]"
                    >
                        <Skull className="w-12 h-12 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-display font-black text-red-500 uppercase tracking-widest drop-shadow-md">
                        {raidState.bossName}
                    </h1>
                    <div className="text-xs font-mono text-red-400 bg-red-900/30 px-3 py-1 rounded-full inline-block mt-2 border border-red-800">
                        RAID BOSS • ID: {raidState.bossId}
                    </div>
                </div>

                {/* HP BAR */}
                <div className="mb-8 px-4">
                    <div className="flex justify-between text-white font-bold mb-2 font-mono">
                        <span>HP</span>
                        <span>{raidState.currentHp} / {raidState.maxHp}</span>
                    </div>
                    <div className="h-6 bg-zinc-900 rounded-full border-2 border-zinc-700 overflow-hidden relative">
                        <motion.div
                            className="h-full bg-gradient-to-r from-red-600 to-red-800"
                            {...({
                                initial: { width: '100%' },
                                animate: { width: `${(raidState.currentHp / raidState.maxHp) * 100}%` },
                                transition: { type: 'spring', damping: 20 }
                            } as any)}
                        />
                    </div>
                </div>

                {/* VICTORY SCREEN */}
                {isVictory ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-500">
                        <Trophy className="w-24 h-24 text-yellow-500 animate-bounce" />
                        <h2 className="text-4xl font-display font-black text-yellow-500">VÍTĚZSTVÍ!</h2>
                        <p className="text-zinc-400">Boss byl poražen. Tým přežil.</p>
                        <button
                            onClick={handleCloseRaid}
                            className="px-8 py-4 bg-yellow-600 active:bg-yellow-500 text-black font-bold uppercase rounded-xl shadow-lg mt-8 active:scale-95 transition-transform"
                        >
                            Zavřít Raid
                        </button>
                    </div>
                ) : (
                    <>
                        {/* TURN INDICATOR */}
                        <div className="bg-zinc-900/80 border border-zinc-700 p-4 rounded-xl mb-4 text-center">
                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Na tahu je</p>
                            <div className="flex items-center justify-center gap-2">
                                {isMyTurn ? (
                                    <span className="text-2xl font-display font-bold text-green-500 animate-pulse">TY! (ÚTOČ)</span>
                                ) : (
                                    <>
                                        <Clock className="w-5 h-5 text-zinc-400" />
                                        <span className="text-2xl font-display font-bold text-white">{currentPlayerTurn || '...'}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* COMBAT LOG */}
                        <div className="flex-1 bg-black/50 border border-zinc-800 rounded-xl p-4 overflow-y-auto mb-4 font-mono text-xs space-y-1 shadow-inner">
                            {localLog.length === 0 && <p className="text-zinc-600 text-center italic">Souboj začíná...</p>}
                            {localLog.map((log, i) => (
                                <div key={i} className={log.includes('DMG') ? 'text-red-400' : 'text-zinc-300'}>
                                    {log}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>

                        {/* CONTROLS */}
                        <div className="mt-auto">
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Hodnota útoku..."
                                    value={damageInput}
                                    onChange={(e) => setDamageInput(e.target.value)}
                                    disabled={!isMyTurn || isAttacking}
                                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-center text-white font-bold text-xl outline-none focus:border-red-500 disabled:opacity-50"
                                />
                                <button
                                    onClick={handleAttack}
                                    disabled={!isMyTurn || !damageInput || isAttacking}
                                    className="flex-1 bg-red-600 active:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold uppercase rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <Sword className="w-6 h-6" /> {isAttacking ? '...' : 'ÚTOK'}
                                </button>
                            </div>

                            <button onClick={onClose} className="w-full mt-4 py-2 text-zinc-600 text-xs uppercase active:text-white">
                                Minimalizovat (Běží na pozadí)
                            </button>
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default BossRaidScreen;
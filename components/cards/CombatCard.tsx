
import React, { useState, useEffect, useRef } from 'react';
import { GameEvent, GameEventType, Stat } from '../../types';
import { Swords, Skull, Dice5, Keyboard, Package, Shield, Wind, Heart, Check, X, Trophy, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, vibrate } from '../../services/soundService';

interface CombatCardProps {
    event: GameEvent;
    onClose: () => void;
    onPlayerDamage?: (amount: number) => void;
    playerHp?: number;
    playerArmor?: number; // ADDED
    onArmorChange?: (amount: number) => void; // ADDED
    inventory?: GameEvent[];
    onUseItem?: (item: GameEvent) => void;
    onClaimLoot?: (stats: Stat[]) => void;
}

export const CombatCard: React.FC<CombatCardProps> = ({
    event,
    onClose,
    onPlayerDamage,
    playerHp = 100,
    playerArmor = 0,
    onArmorChange,
    inventory,
    onUseItem,
    onClaimLoot
}) => {
    // --- STATE ---
    const [combatLog, setCombatLog] = useState<string[]>(["Nepřítel detekován. Připravte se k boji."]);
    const [enemyCurrentHp, setEnemyCurrentHp] = useState<number>(0);
    const [enemyMaxHp, setEnemyMaxHp] = useState<number>(0);

    // Dice & Logic
    const [isRolling, setIsRolling] = useState(false);
    const [diceValues, setDiceValues] = useState<[number, number] | null>(null);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualRollValue, setManualRollValue] = useState<string>('');

    // Inventory
    const [showCombatInventory, setShowCombatInventory] = useState(false);
    const [previewItem, setPreviewItem] = useState<GameEvent | null>(null);

    // Flee Mechanic
    const [fleeAttempted, setFleeAttempted] = useState(false);
    const [isFleeing, setIsFleeing] = useState(false);

    // Loot Claim State
    const [isLootClaimed, setIsLootClaimed] = useState(false);

    const logEndRef = useRef<HTMLDivElement>(null);

    // --- INIT ---
    useEffect(() => {
        const hpStat = event.stats?.find(s => ['HP', 'ZDRAVÍ'].includes(s.label.toUpperCase()))?.value;
        const hp = parseInt(String(hpStat)) || 50;
        setEnemyCurrentHp(hp);
        setEnemyMaxHp(hp);
    }, [event]);

    // Auto-scroll
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [combatLog]);

    // --- CALCULATIONS ---
    const getFleeChance = () => {
        // Robust check: lowercase + fallback
        const r = (event.rarity || 'Common').toLowerCase();
        switch (r) {
            case 'legendary': return 10;
            case 'epic': return 40;
            case 'rare': return 60;
            default: return 80; // Common
        }
    };

    const getEnemyStats = () => {
        const def = parseInt(String(event.stats?.find(s => s.label.toUpperCase() === 'DEF')?.value || '0'));
        const atk = parseInt(String(event.stats?.find(s => s.label.toUpperCase() === 'ATK')?.value || '10'));
        return { def, atk };
    };

    const getLootStats = (): Stat[] => {
        const stats: Stat[] = event.enemyLoot?.lootStats || [];
        if (stats.length === 0 && event.enemyLoot) {
            if (event.enemyLoot.goldReward) stats.push({ label: 'ZLATO', value: `+${event.enemyLoot.goldReward}` });
        }
        return stats;
    };

    // --- ACTIONS ---

    const handleFlee = () => {
        if (fleeAttempted || isFleeing || enemyCurrentHp <= 0) return;

        setIsFleeing(true);
        setFleeAttempted(true);

        const chance = getFleeChance();
        // Use 1-100 integer for clearer logic
        const roll = Math.floor(Math.random() * 100) + 1;

        setCombatLog(prev => [...prev, `POKUS O ÚTĚK (Šance ${chance}%)...`]);
        playSound('scan');

        setTimeout(() => {
            // Success if roll is less than or equal to chance (e.g. roll 80 vs chance 80 is success)
            if (roll <= chance) {
                playSound('open');
                setCombatLog(prev => [...prev, `ÚSPĚCH! (Hod: ${roll}) Unikl jsi z boje.`]);
                setTimeout(onClose, 800);
            } else {
                playSound('error');
                vibrate(100);
                setCombatLog(prev => [...prev, `SELHÁNÍ! (Hod: ${roll}) Nepřítel blokuje ústup.`]);
                setIsFleeing(false);
                triggerEnemyAttack(true);
            }
        }, 1500);
    };

    const handleAttack = () => {
        if (isRolling || enemyCurrentHp <= 0 || isFleeing) return;
        setIsRolling(true);
        setShowManualInput(false);
        playSound('scan');

        let rolls = 0;
        const interval = setInterval(() => {
            setDiceValues([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
            rolls++;
            if (rolls > 10) {
                clearInterval(interval);
                resolveCombatRound();
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
        resolveCombatRound(val);
    };

    const resolveCombatRound = (manualTotal?: number) => {
        let d1 = 0, d2 = 0, totalRoll = 0;
        if (manualTotal !== undefined) {
            totalRoll = manualTotal;
            d1 = Math.floor(manualTotal / 2);
            d2 = manualTotal - d1;
        } else {
            d1 = Math.floor(Math.random() * 6) + 1;
            d2 = Math.floor(Math.random() * 6) + 1;
            totalRoll = d1 + d2;
        }

        setDiceValues([d1, d2]);

        const { def } = getEnemyStats();

        // CHECK IF PLAYER BREAKS ENEMY DEFENSE
        const breakChance = event.combatConfig?.defBreakChance || 0;
        let enemyDefBroken = false;

        if (breakChance > 0) {
            const roll = Math.random() * 100;
            if (roll < breakChance) {
                enemyDefBroken = true;
            }
        }

        const isCrit = totalRoll === 12;
        const isMiss = totalRoll === 2;

        // If defense is broken, ignore enemy DEF
        const effectiveDef = enemyDefBroken ? 0 : def;

        let playerDmg = Math.max(0, totalRoll - effectiveDef);
        if (isCrit) playerDmg *= 2;
        if (isMiss) playerDmg = 0;

        if (playerDmg > 0) {
            setEnemyCurrentHp(prev => Math.max(0, prev - playerDmg));

            if (enemyDefBroken) {
                setCombatLog(prev => [...prev, `🎯 PENETRACE OBRANY! (Ignorováno ${def} DEF)`]);
                playSound('crit'); // Reuse crit sound for nice effect
            }

            if (isCrit) {
                playSound('crit');
                vibrate([50, 50, 50, 100]);
                setCombatLog(prev => [...prev, `KRITICKÝ ZÁSAH! (12) -> ${playerDmg} DMG`]);
            } else {
                playSound('damage');
                vibrate(20);
                setCombatLog(prev => [...prev, `ÚTOK: Hod ${totalRoll} vs ${enemyDefBroken ? '0 (BROKEN)' : def} DEF -> ${playerDmg} DMG`]);
            }
        } else {
            playSound('miss');
            vibrate(50);
            setCombatLog(prev => [...prev, `MINUTÍ: Hod ${totalRoll} neprošel přes obranu.`]);
        }

        setTimeout(() => {
            if (enemyCurrentHp - playerDmg > 0) {
                triggerEnemyAttack();
            } else {
                setCombatLog(prev => [...prev, `CÍL ELIMINOVÁN.`]);
                playSound('success');
            }
            setIsRolling(false);
            setManualRollValue('');
        }, 1000);
    };

    const triggerEnemyAttack = (isFreeHit: boolean = false) => {
        const { atk } = getEnemyStats();
        let dmgToDeal = Math.max(0, atk);

        if (dmgToDeal > 0) {
            const hitType = isFreeHit ? 'NEPŘÍTEL (VOLNÝ ÚTOK)' : 'NEPŘÍTEL';

            // FPS ARMOR LOGIC
            // 1. Damage Armor first
            if (playerArmor > 0) {
                const absorbed = Math.min(playerArmor, dmgToDeal);
                dmgToDeal -= absorbed;

                // Update Armor
                if (onArmorChange) onArmorChange(-absorbed);

                setCombatLog(prev => [...prev, `🛡️ ŠTÍT ZASAŽEN: -${absorbed} Armor`]);
                playSound('error'); // Metallic impact
            }

            // 2. Damage HP if anything left
            if (dmgToDeal > 0) {
                if (onPlayerDamage) onPlayerDamage(-dmgToDeal);
                setCombatLog(prev => [...prev, `${hitType}: Zásah za ${dmgToDeal} HP!`]);
                // Sound handled by app hook generally, but we can vibrate here
                vibrate([100]);
            } else {
                setCombatLog(prev => [...prev, `${hitType}: Útok plně pohlcen štítem!`]);
            }
        }
    };

    // --- ITEM USAGE ---
    const confirmUseItem = () => {
        if (!previewItem) return;

        const dmgStat = previewItem.stats?.find(s => ['DMG', 'ATK', 'POŠKOZENÍ'].some(k => s.label.toUpperCase().includes(k)));
        if (dmgStat) {
            const dmgVal = parseInt(String(dmgStat.value).replace(/[^0-9-]/g, ''));
            if (dmgVal > 0) {
                setEnemyCurrentHp(prev => Math.max(0, prev - dmgVal));
                setCombatLog(prev => [...prev, `POUŽIT PŘEDMĚT: ${previewItem.title} -> ${dmgVal} DMG!`]);
                playSound('damage');
                vibrate(50);

                if (enemyCurrentHp - dmgVal <= 0) {
                    setTimeout(() => {
                        setCombatLog(prev => [...prev, `CÍL ELIMINOVÁN PŘEDMĚTEM.`]);
                        playSound('success');
                    }, 500);
                }
            }
        }

        if (onUseItem) {
            onUseItem(previewItem);
        }

        setPreviewItem(null);
    };

    const handleClaimClick = () => {
        if (isLootClaimed) return;
        setIsLootClaimed(true);
        const rewards = getLootStats();
        if (onClaimLoot) {
            onClaimLoot(rewards);
        }
        playSound('success');
        vibrate([50, 50, 100]);
        setTimeout(onClose, 1000);
    };

    const combatInventory = inventory?.filter(i => {
        if (i.resourceConfig?.isResourceContainer) return false;
        if (i.type !== GameEventType.ITEM && i.type !== 'PŘEDMĚT' as GameEventType) return false;
        return true;
    }) || [];

    const { atk, def } = getEnemyStats();
    const isVictory = enemyCurrentHp <= 0;
    const hasWeakness = event.combatConfig?.defBreakChance && event.combatConfig.defBreakChance > 0;

    // --- VICTORY SCREEN ---
    if (isVictory) {
        const rewards = getLootStats();
        return (
            <div className="flex flex-col items-center justify-center p-6 space-y-6 animate-in zoom-in duration-500 text-center">
                <Trophy className="w-24 h-24 text-yellow-500 animate-bounce drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                <div className="space-y-2">
                    <h2 className="text-3xl font-display font-black text-yellow-500 uppercase tracking-widest">VÍTĚZSTVÍ</h2>
                    <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Nepřítel poražen. Kořist dostupná.</p>
                </div>

                <div className="w-full bg-zinc-900/80 border border-yellow-500/30 rounded-xl p-4 space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] border-b border-zinc-800 pb-2 mb-2">Nalezené Suroviny & Data</h3>
                    {rewards.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {rewards.map((stat, idx) => (
                                <div key={idx} className="bg-black p-2 rounded border border-zinc-800 flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase">{stat.label}</span>
                                    <span className="text-sm font-mono font-black text-yellow-500">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-600 italic">Žádná kořist nalezena.</p>
                    )}
                </div>

                <button
                    onClick={handleClaimClick}
                    disabled={isLootClaimed}
                    className={`w-full py-4 font-black uppercase text-sm tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${isLootClaimed ? 'bg-green-600 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-black active:scale-95'}`}
                >
                    {isLootClaimed ? (
                        <><Check className="w-5 h-5" /> VYZVEDNUTO</>
                    ) : (
                        <><Package className="w-5 h-5" /> VYZVEDNOUT KOŘIST</>
                    )}
                </button>
            </div>
        );
    }

    // --- COMBAT UI ---
    return (
        <div className="space-y-4">
            {/* --- HP BARS --- */}
            <div className="flex gap-2">
                {/* PLAYER STATUS */}
                <div className="flex-1 p-3 bg-zinc-900/50 border border-zinc-700 rounded-xl flex flex-col justify-end relative">
                    <div className="flex justify-between items-end mb-1 relative z-10">
                        <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-1">
                            TY
                        </span>
                        <div className="text-right">
                            {playerArmor > 0 && (
                                <div className="flex items-center justify-end gap-1 text-zinc-400 mb-0.5">
                                    <Shield className="w-3 h-3" />
                                    <span className="text-[9px] font-mono font-bold">{playerArmor}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-end gap-1 text-red-500">
                                <Heart className="w-3 h-3 fill-current" />
                                <span className="text-[10px] font-mono font-bold">{playerHp} HP</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {/* Armor Bar */}
                        {playerArmor > 0 && (
                            <div className="h-1 bg-black rounded-full overflow-hidden border border-zinc-700">
                                <motion.div
                                    className="h-full bg-zinc-400"
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${Math.min(100, playerArmor)}%` }}
                                />
                            </div>
                        )}
                        {/* HP Bar */}
                        <div className="h-1.5 bg-black rounded-full overflow-hidden border border-red-900/50">
                            <motion.div
                                className="h-full bg-red-600"
                                initial={{ width: "100%" }}
                                animate={{ width: `${Math.min(100, playerHp)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* ENEMY STATUS */}
                <div className="flex-1 p-3 bg-red-950/30 border border-red-500/30 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-black uppercase text-red-400 tracking-widest flex items-center gap-1">
                            <Skull className="w-3 h-3" /> Nepřítel
                        </span>
                        <span className="text-[10px] font-mono font-bold text-white">{enemyCurrentHp} HP</span>
                    </div>
                    <div className="h-1.5 bg-black rounded-full overflow-hidden border border-red-900/50 mt-auto">
                        <motion.div
                            className="h-full bg-red-600"
                            initial={{ width: "100%" }}
                            animate={{ width: `${(enemyCurrentHp / enemyMaxHp) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* --- ENEMY STATS --- */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/40 border border-zinc-800 p-2 rounded flex justify-between items-center">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Enemy Útok (ATK)</span>
                    <span className="text-sm font-black text-orange-500">{atk}</span>
                </div>
                <div className="bg-black/40 border border-zinc-800 p-2 rounded flex justify-between items-center relative overflow-hidden">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Enemy Obrana (DEF)</span>
                    <span className={`text-sm font-black text-blue-400 ${hasWeakness ? 'pr-6' : ''}`}>{def}</span>
                    {/* Weakness Indicator */}
                    {hasWeakness && (
                        <div className="absolute right-0 top-0 bottom-0 bg-green-900/50 w-6 flex items-center justify-center border-l border-green-500/50" title={`Weakness: ${event.combatConfig?.defBreakChance}%`}>
                            <Crosshair className="w-3 h-3 text-green-500 animate-pulse" />
                        </div>
                    )}
                </div>
            </div>

            {/* --- MAIN COMBAT AREA --- */}
            <div className="bg-black border border-white/10 rounded-xl p-4 relative overflow-hidden">
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
                                className="w-24 bg-zinc-900 border border-zinc-700 p-3 text-center text-xl font-bold text-white rounded-xl outline-none focus:border-signal-cyan"
                            />
                            <div className="flex gap-2 w-full">
                                <button onClick={() => setShowManualInput(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-bold text-[10px] uppercase rounded-lg">Zrušit</button>
                                <button onClick={handleManualSubmit} className="flex-1 py-3 bg-green-600 text-white font-bold text-[10px] uppercase rounded-lg">Potvrdit</button>
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

                {/* LOG */}
                <div className="h-24 overflow-y-auto no-scrollbar space-y-1 font-mono text-[9px] text-zinc-400 mb-3 border-b border-zinc-800 pb-2">
                    {combatLog.length === 0 ? (
                        <span className="italic opacity-50">Zahajte útok...</span>
                    ) : (
                        combatLog.map((log, i) => (
                            <div key={i} className={
                                log.includes('KRITICKÝ') || log.includes('PENETRACE') ? 'text-yellow-400 font-bold' :
                                    log.includes('NEPŘÍTEL') ? 'text-red-400' :
                                        log.includes('POUŽIT') ? 'text-cyan-400' :
                                            log.includes('ÚSPĚCH') ? 'text-green-400' :
                                                log.includes('SELHÁNÍ') ? 'text-red-500' :
                                                    log.includes('ŠTÍT') ? 'text-zinc-200' :
                                                        'text-zinc-300'
                            }>
                                {log}
                            </div>
                        ))
                    )}
                    <div ref={logEndRef} />
                </div>

                <div className="flex gap-2 h-16">
                    {/* MANUAL INPUT - BIGGER PRIORITY */}
                    <button
                        onClick={() => setShowManualInput(true)}
                        disabled={isRolling || isFleeing}
                        className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-[10px] tracking-[0.1em] rounded-xl flex items-center justify-center gap-2 border border-zinc-600 active:scale-95 transition-all"
                    >
                        <Keyboard className="w-5 h-5 text-zinc-400" />
                        <span>ZADAT HOD</span>
                    </button>

                    {/* VIRTUAL DICE - SMALLER SQUARE */}
                    <button
                        onClick={handleAttack}
                        disabled={isRolling || isFleeing}
                        className="w-20 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] active:scale-95 transition-all flex flex-col items-center justify-center border border-red-400"
                    >
                        <Dice5 className="w-8 h-8" />
                    </button>
                </div>

                <button
                    onClick={handleFlee}
                    disabled={isRolling || fleeAttempted || isFleeing}
                    className={`w-full py-2 mt-2 bg-zinc-900 border border-zinc-700 text-zinc-400 font-bold uppercase text-[9px] tracking-widest rounded-lg flex items-center justify-center gap-2 ${fleeAttempted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800 hover:text-white'}`}
                >
                    <Wind className="w-3 h-3" />
                    {fleeAttempted ? 'ÚTĚK SELHAL' : `POKUSIT SE UTÉCT (${getFleeChance()}%)`}
                </button>
            </div>

            {/* --- BACKPACK SUPPORT --- */}
            {inventory && inventory.length > 0 && (
                <div className="mt-2">
                    <button
                        onClick={() => { setShowCombatInventory(!showCombatInventory); setPreviewItem(null); }}
                        className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold uppercase text-[9px] tracking-widest rounded-lg flex items-center justify-center gap-2"
                    >
                        <Package className="w-3 h-3" /> {showCombatInventory ? 'Zavřít Batoh' : 'Podpora z Batohu'}
                    </button>

                    <AnimatePresence>
                        {showCombatInventory && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-black/40 rounded-lg border border-zinc-800 mt-2"
                            >
                                {/* ITEM LIST OR PREVIEW */}
                                {previewItem ? (
                                    <div className="p-3 bg-zinc-900/80">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-white font-bold text-xs uppercase">{previewItem.title}</h4>
                                            <button onClick={() => setPreviewItem(null)}><X className="w-4 h-4 text-zinc-500" /></button>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 italic mb-3">{previewItem.description}</p>

                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {previewItem.stats?.map((s, i) => (
                                                <span key={i} className="text-[9px] bg-black border border-zinc-700 px-2 py-1 rounded text-zinc-300 font-mono">
                                                    {s.label}: {s.value}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => setPreviewItem(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded">Zpět</button>
                                            <button onClick={confirmUseItem} className="flex-1 py-2 bg-green-600 text-white text-[10px] font-bold uppercase rounded hover:bg-green-500">POUŽÍT</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 p-2 max-h-40 overflow-y-auto">
                                        {combatInventory.map(item => {
                                            const hpStat = item.stats?.find(s => ['HP', 'ZDRAVÍ', 'HEAL'].some(k => s.label.toUpperCase().includes(k)));
                                            const dmgStat = item.stats?.find(s => ['DMG', 'ATK', 'POŠKOZENÍ'].some(k => s.label.toUpperCase().includes(k)));
                                            const armorStat = item.stats?.find(s => ['ARMOR', 'ŠTÍT', 'BRNĚNÍ'].some(k => s.label.toUpperCase().includes(k)));

                                            if (!hpStat && !dmgStat && !armorStat && !item.isConsumable) return null;

                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setPreviewItem(item)}
                                                    className="flex flex-col items-start p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-left active:scale-95 transition-all"
                                                >
                                                    <span className="text-[9px] font-bold text-white uppercase line-clamp-1">{item.title}</span>
                                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                        {dmgStat && <span className="text-[8px] font-mono text-orange-400 bg-orange-950/30 px-1 rounded flex items-center gap-0.5"><Swords className="w-2 h-2" /> {dmgStat.value}</span>}
                                                        {hpStat && <span className="text-[8px] font-mono text-green-400 bg-green-950/30 px-1 rounded flex items-center gap-0.5"><Heart className="w-2 h-2" /> {hpStat.value}</span>}
                                                        {armorStat && <span className="text-[8px] font-mono text-zinc-300 bg-zinc-700/50 px-1 rounded flex items-center gap-0.5"><Shield className="w-2 h-2" /> {armorStat.value}</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {combatInventory.length === 0 && <p className="col-span-2 text-center text-[9px] text-zinc-600 italic py-2">Žádné bojové předměty.</p>}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

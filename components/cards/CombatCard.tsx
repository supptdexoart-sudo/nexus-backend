
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
    playerArmor?: number;
    onArmorChange?: (amount: number) => void;
    inventory?: GameEvent[];
    onUseItem?: (item: GameEvent) => void;
    onClaimLoot?: (stats: Stat[]) => void;
    activeCharacter?: any | null; // ADDED for combat perks
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
    onClaimLoot,
    activeCharacter
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

    // --- COMBAT PERKS ---
    const getCombatPerks = () => {
        if (!activeCharacter?.perks) return { flatDamage: 0, armorBonus: 0 };

        let flatDamage = 0;
        let armorBonus = 0;

        activeCharacter.perks.forEach((perk: any) => {
            if (perk.effect.condition === 'combat') {
                const stat = perk.effect.stat;
                const modifier = perk.effect.modifier;

                if (stat === 'damage') {
                    flatDamage += modifier;
                }
                if (stat === 'armor') armorBonus += modifier;
            }
        });

        return { flatDamage, armorBonus };
    };

    const combatPerks = getCombatPerks();

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

    // Apply armor bonus at combat start
    useEffect(() => {
        if (combatPerks.armorBonus > 0 && onArmorChange) {
            onArmorChange(combatPerks.armorBonus);
            setCombatLog(prev => [...prev, `🛡️ ARMOR BONUS: +${combatPerks.armorBonus} z combat perků`]);
        }
    }, []); // Empty dependency array - run only once at mount

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

        // Calculate base damage
        let baseDamage = Math.max(0, totalRoll - effectiveDef);

        // Apply flat combat perks
        let playerDmg = baseDamage + combatPerks.flatDamage;

        // Apply crit multiplier AFTER all bonuses
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
            <div className="flex flex-col items-center justify-center p-6 space-y-6 animate-in zoom-in duration-500 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-arc-yellow/5 animate-pulse"></div>

                <Trophy className="w-24 h-24 text-arc-yellow drop-shadow-[0_0_20px_rgba(249,212,35,0.6)]" strokeWidth={1} />
                <div className="space-y-2 relative z-10">
                    <h2 className="text-4xl font-display font-black text-arc-yellow uppercase tracking-tighter">CÍL ELIMINOVÁN</h2>
                    <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em]">Hrozba neutralizována // Sektor zajištěn</p>
                </div>

                <div className="w-full bg-black/80 border border-arc-yellow/30 p-1 space-y-1 relative z-10">
                    <div className="bg-arc-yellow/10 p-2 flex items-center justify-between border-b border-arc-yellow/10">
                        <span className="text-[10px] font-black uppercase text-arc-yellow tracking-[0.2em]">Data Scan Result</span>
                        <span className="text-[9px] font-mono text-zinc-500">Hash: {event.id.slice(-6)}</span>
                    </div>
                    {rewards.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1 p-2">
                            {rewards.map((stat, idx) => (
                                <div key={idx} className="bg-arc-panel p-3 border border-white/5 flex items-center justify-between group hover:border-arc-yellow/30 transition-colors">
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{stat.label}</span>
                                    <span className="text-base font-mono font-bold text-arc-yellow">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-600 font-mono p-4">/// Žádná využitelná data nenalezena ///</p>
                    )}
                </div>

                <button
                    onClick={handleClaimClick}
                    disabled={isLootClaimed}
                    className={`w-full py-5 font-black uppercase text-sm tracking-[0.2em] relative group overflow-hidden transition-all ${isLootClaimed ? 'bg-green-600 text-white' : 'bg-arc-yellow hover:bg-white hover:text-black text-black'}`}
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 100%, 5% 100%, 0 85%)' }}
                >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                        {isLootClaimed ? (
                            <><Check className="w-5 h-5" /> DATA ULOŽENA</>
                        ) : (
                            <><Package className="w-5 h-5" /> VYZVEDNOUT KOŘIST</>
                        )}
                    </div>
                </button>
            </div>
        );
    }

    // --- COMBAT UI ---
    return (
        <div className="space-y-1">
            {/* --- HP BARS --- */}
            <div className="flex gap-2 h-20">
                {/* PLAYER STATUS */}
                <div className="flex-1 p-3 bg-arc-panel border-l-2 border-l-arc-cyan border-y border-r border-white/5 flex flex-col justify-end relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1">
                        <span className="text-[7px] font-black uppercase text-zinc-600 tracking-widest">SYS.OVR</span>
                    </div>

                    <div className="flex justify-between items-end mb-2 relative z-10">
                        <span className="text-[10px] font-display font-bold uppercase text-arc-cyan tracking-widest flex items-center gap-1 shadow-[0_0_10px_rgba(0,242,255,0.2)]">
                            TY
                        </span>
                        <div className="text-right">
                            {playerArmor > 0 && (
                                <div className="flex items-center justify-end gap-1 text-zinc-400 mb-0.5">
                                    <span className="text-[9px] font-mono">{playerArmor} ARM</span>
                                </div>
                            )}
                            <div className="flex items-center justify-end gap-1 text-red-500">
                                <span className="text-base font-mono font-black tracking-tighter">{playerHp}</span>
                                <span className="text-[8px] font-bold">HP</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {/* Armor Bar - Segmented style */}
                        {playerArmor > 0 && (
                            <div className="h-1 w-full bg-black/50 flex gap-[1px]">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className={`h-full flex-1 ${i < (playerArmor / 5) ? 'bg-zinc-400' : 'bg-zinc-900'}`} />
                                ))}
                            </div>
                        )}
                        {/* HP Bar */}
                        <div className="h-1.5 w-full bg-black/50 relative overflow-hidden">
                            <motion.div
                                className="h-full bg-red-600 shadow-[0_0_8px_red]"
                                initial={{ width: "100%" }}
                                animate={{ width: `${Math.min(100, playerHp)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* ENEMY STATUS */}
                <div className="flex-1 p-3 bg-red-950/10 border-r-2 border-r-red-500/50 border-y border-l border-white/5 flex flex-col justify-end relative overflow-hidden">
                    <div className="absolute top-0 left-0 p-1">
                        <span className="text-[7px] font-black uppercase text-red-900/50 tracking-widest">HOSTILE</span>
                    </div>

                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-display font-bold uppercase text-red-500 tracking-widest flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                            <Skull className="w-3 h-3" /> CÍL
                        </span>
                        <span className="text-base font-mono font-black text-white tracking-tighter">{enemyCurrentHp} <span className="text-[8px] font-bold text-zinc-500">HP</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-black/50 relative overflow-hidden">
                        <motion.div
                            className="h-full bg-red-600"
                            initial={{ width: "100%" }}
                            animate={{ width: `${(enemyCurrentHp / enemyMaxHp) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* --- ENEMY STATS --- */}
            <div className="grid grid-cols-2 gap-1 my-2">
                <div className="bg-black/40 border border-white/5 p-2 flex justify-between items-center group">
                    <span className="text-[8px] text-zinc-600 uppercase font-black tracking-widest group-hover:text-zinc-400 transition-colors">ATK POWER</span>
                    <span className="text-sm font-mono font-black text-orange-500">{atk}</span>
                </div>
                <div className="bg-black/40 border border-white/5 p-2 flex justify-between items-center relative overflow-hidden group">
                    <span className="text-[8px] text-zinc-600 uppercase font-black tracking-widest group-hover:text-zinc-400 transition-colors">DEFENSE</span>
                    <span className={`text-sm font-mono font-black text-blue-400 ${hasWeakness ? 'pr-6' : ''}`}>{def}</span>
                    {hasWeakness && (
                        <div className="absolute right-0 top-0 bottom-0 bg-green-500/10 w-6 flex items-center justify-center border-l border-green-500/20">
                            <Crosshair className="w-3 h-3 text-green-500 animate-pulse" />
                        </div>
                    )}
                </div>
            </div>

            {/* --- PERKS --- */}
            {(combatPerks.flatDamage > 0 || combatPerks.armorBonus > 0) && (
                <div className="flex items-center gap-2 px-2 py-1 bg-green-500/5 border-l-2 border-green-500/50">
                    <Swords className="w-3 h-3 text-green-500" />
                    <span className="text-[8px] font-black uppercase text-green-500 tracking-widest mr-2">ACTIVE PERKS</span>
                    {combatPerks.flatDamage > 0 && <span className="text-[9px] text-green-300 font-mono">+{combatPerks.flatDamage}DMG</span>}
                    {combatPerks.armorBonus > 0 && <span className="text-[9px] text-zinc-400 font-mono">+{combatPerks.armorBonus}ARM</span>}
                </div>
            )}

            {/* --- MAIN COMBAT AREA (TERMINAL) --- */}
            <div className="bg-black border border-white/10 p-0 relative overflow-hidden min-h-[220px] flex flex-col">
                {/* TERMINAL HEADER */}
                <div className="h-6 bg-white/5 border-b border-white/5 flex items-center px-2 justify-between">
                    <span className="text-[8px] font-mono text-zinc-600">trm_link_v9.0</span>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
                    </div>
                </div>

                {/* DICE ANIMATION */}
                <AnimatePresence>
                    {isRolling && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <div className="flex gap-4">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}>
                                    <Dice5 className="w-8 h-8 text-white/50" />
                                </motion.div>
                            </div>
                            <span className="text-4xl font-display font-black text-white tracking-widest animate-pulse">
                                {diceValues ? `${diceValues[0] + diceValues[1]}` : '...'}
                            </span>
                            <span className="text-[9px] font-mono text-arc-yellow uppercase">Calculating trajectory...</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MANUAL INPUT OVERLAY */}
                <AnimatePresence>
                    {showManualInput && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center p-6 space-y-4"
                        >
                            <h4 className="text-xs font-black text-arc-yellow uppercase tracking-widest">Manual Override</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-500 font-mono">[</span>
                                <input
                                    type="number"
                                    autoFocus
                                    value={manualRollValue}
                                    onChange={(e) => setManualRollValue(e.target.value)}
                                    placeholder="00"
                                    className="w-20 bg-transparent border-b-2 border-arc-yellow text-center text-3xl font-mono text-white outline-none placeholder:text-zinc-800"
                                />
                                <span className="text-zinc-500 font-mono">]</span>
                            </div>
                            <div className="flex gap-2 w-full pt-2">
                                <button onClick={() => setShowManualInput(false)} className="flex-1 py-3 text-zinc-500 hover:text-white font-mono text-[10px] uppercase transition-colors">Abort</button>
                                <button onClick={handleManualSubmit} className="flex-1 py-3 bg-arc-yellow text-black font-black text-[10px] uppercase tracking-widest hover:bg-white transition-colors">Execute</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* LOG */}
                <div className="flex-1 overflow-y-auto w-full p-3 font-mono text-[10px] space-y-1.5 custom-scrollbar">
                    <AnimatePresence initial={false}>
                        {combatLog.map((log, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={i}
                                className={`border-l-2 pl-2 ${log.includes('KRITICKÝ') || log.includes('PENETRACE') ? 'border-arc-yellow text-arc-yellow font-bold' :
                                        log.includes('NEPŘÍTEL') ? 'border-red-500 text-red-400' :
                                            log.includes('POUŽIT') ? 'border-arc-cyan text-arc-cyan' :
                                                log.includes('ÚSPĚCH') ? 'border-green-500 text-green-400' :
                                                    log.includes('SELHÁNÍ') ? 'border-red-500 text-red-500' :
                                                        log.includes('ŠTÍT') ? 'border-zinc-500 text-zinc-400' :
                                                            'border-zinc-800 text-zinc-500'
                                    }`}>
                                <span className="mr-2 opacity-30 select-none">{(i + 1).toString().padStart(2, '0')}</span>
                                {log}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={logEndRef} />
                </div>

                {/* CONTROLS */}
                <div className="p-2 bg-white/[0.02] border-t border-white/5 flex gap-2">
                    <button
                        onClick={() => setShowManualInput(true)}
                        disabled={isRolling || isFleeing}
                        className="w-12 h-12 flex items-center justify-center border border-white/10 text-zinc-500 hover:text-white hover:border-white/30 transition-all custom-hover"
                        title="Manual Input"
                    >
                        <Keyboard className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleAttack}
                        disabled={isRolling || isFleeing}
                        className="flex-1 bg-arc-yellow text-black font-display font-black text-lg uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(249,212,35,0.4)] flex items-center justify-center gap-2 clip-path-button"
                    >
                        <Dice5 className="w-5 h-5" /> ÚTOK
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center px-1">
                <button
                    onClick={handleFlee}
                    disabled={isRolling || fleeAttempted || isFleeing}
                    className={`text-[9px] font-mono uppercase tracking-widest flex items-center gap-2 ${fleeAttempted ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-400 hover:text-white transition-colors'}`}
                >
                    <Wind className="w-3 h-3" />
                    {fleeAttempted ? 'ÚTĚK NENÍ MOŽNÝ' : `ÚSTUP (${getFleeChance()}%)`}
                </button>

                {inventory && inventory.length > 0 && (
                    <button
                        onClick={() => { setShowCombatInventory(!showCombatInventory); setPreviewItem(null); }}
                        className="text-[9px] font-mono uppercase tracking-widest flex items-center gap-2 text-arc-cyan hover:text-white transition-colors"
                    >
                        <Package className="w-3 h-3" /> {showCombatInventory ? 'ZAVŘÍT INVENTÁŘ' : 'PODPORA'}
                    </button>
                )}
            </div>

            {/* --- BACKPACK OVERLAY --- */}
            <AnimatePresence>
                {inventory && inventory.length > 0 && showCombatInventory && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-black border border-zinc-800"
                    >
                        {/* ITEM LIST OR PREVIEW */}
                        {previewItem ? (
                            <div className="p-3 bg-zinc-900/50">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-white font-bold text-xs uppercase">{previewItem.title}</h4>
                                    <button onClick={() => setPreviewItem(null)}><X className="w-4 h-4 text-zinc-500" /></button>
                                </div>
                                <p className="text-[10px] text-zinc-400 italic mb-3 font-mono">{previewItem.description}</p>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    {previewItem.stats?.map((s, i) => (
                                        <span key={i} className="text-[9px] bg-black border border-zinc-800 px-2 py-1 text-zinc-300 font-mono">
                                            {s.label}: {s.value}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => setPreviewItem(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase hover:bg-zinc-700">Zrušit</button>
                                    <button onClick={confirmUseItem} className="flex-1 py-2 bg-arc-cyan text-black text-[10px] font-bold uppercase hover:bg-white">POUŽÍT</button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-1 p-1 max-h-40 overflow-y-auto">
                                {combatInventory.map(item => {
                                    const hpStat = item.stats?.find(s => ['HP', 'ZDRAVÍ', 'HEAL'].some(k => s.label.toUpperCase().includes(k)));
                                    const dmgStat = item.stats?.find(s => ['DMG', 'ATK', 'POŠKOZENÍ'].some(k => s.label.toUpperCase().includes(k)));
                                    const armorStat = item.stats?.find(s => ['ARMOR', 'ŠTÍT', 'BRNĚNÍ'].some(k => s.label.toUpperCase().includes(k)));

                                    if (!hpStat && !dmgStat && !armorStat && !item.isConsumable) return null;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setPreviewItem(item)}
                                            className="flex flex-col items-start p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-left transition-all group"
                                        >
                                            <span className="text-[9px] font-bold text-zinc-300 group-hover:text-white uppercase line-clamp-1">{item.title}</span>
                                            <div className="flex items-center gap-1 mt-1 flex-wrap opacity-70 group-hover:opacity-100">
                                                {dmgStat && <span className="text-[8px] font-mono text-orange-400 flex items-center gap-0.5"><Swords className="w-2 h-2" /> {dmgStat.value}</span>}
                                                {hpStat && <span className="text-[8px] font-mono text-green-400 flex items-center gap-0.5"><Heart className="w-2 h-2" /> {hpStat.value}</span>}
                                                {armorStat && <span className="text-[8px] font-mono text-blue-300 flex items-center gap-0.5"><Shield className="w-2 h-2" /> {armorStat.value}</span>}
                                            </div>
                                        </button>
                                    );
                                })}
                                {combatInventory.length === 0 && <p className="col-span-2 text-center text-[9px] text-zinc-600 italic py-2">Žádné použitelné předměty.</p>}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

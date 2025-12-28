
import React, { useState, useEffect } from 'react';
import { GameEvent, GameEventType, DilemmaOption, Stat, PlayerClass } from '../types';
import { X, Info, Trash2, Skull, Crown, ShoppingBag, Zap, Swords, Coins, Heart, Scan, Map, CornerDownRight, Satellite, Radio, Hammer, Box, Globe, Rocket, Ban, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, vibrate } from '../services/soundService';
import { CombatCard } from './cards/CombatCard';
import { TrapCard } from './cards/TrapCard';

interface EventCardProps {
    event: GameEvent;
    onClose: () => void;
    onSave?: () => Promise<void> | void;
    onDiscard?: () => Promise<void> | void;
    onResolveDilemma?: (option: DilemmaOption, result: 'success' | 'fail') => void;
    onUse?: () => Promise<void> | void;
    isSaved?: boolean;
    isAdmin?: boolean;
    onPlayerDamage?: (amount: number) => void;
    playerHp?: number;
    playerArmor?: number;
    onArmorChange?: (amount: number) => void;
    playerClass?: PlayerClass | null;
    inventory?: GameEvent[];
    onUseItem?: (item: GameEvent) => void;
    onClaimLoot?: (stats: Stat[]) => void;
    activeCharacter?: any | null; // ADDED for combat perks
}

const EventCard: React.FC<EventCardProps> = ({
    event,
    onClose,
    onSave,
    onDiscard,
    onUse,
    onResolveDilemma,
    isSaved,
    onPlayerDamage,
    playerHp,
    playerArmor,
    onArmorChange,
    playerClass,
    inventory,
    onUseItem,
    onClaimLoot,
    activeCharacter
}) => {
    const [dilemmaStep, setDilemmaStep] = useState<'CHOICE' | 'RESULT'>('CHOICE');
    const [selectedOption, setSelectedOption] = useState<DilemmaOption | null>(null);
    const [dilemmaOutcome, setDilemmaOutcome] = useState<'success' | 'fail'>('success');

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [expandedStat, setExpandedStat] = useState<string | null>(null);

    useEffect(() => {
        playSound('open');
    }, [event]);

    // Is this a Combat or Trap Event?
    const isCombat = event.type === GameEventType.ENCOUNTER || event.type === GameEventType.BOSS;
    const isTrap = event.type === GameEventType.TRAP;

    // Hide Save button for Combat/Trap events
    const allowSave = !isCombat && !isTrap;

    const handleStatClick = (label: string) => {
        setExpandedStat(expandedStat === label ? null : label);
        playSound('click');
        vibrate(10);
    };

    const getStatColor = (label: string) => {
        const l = label.toUpperCase();
        if (['HP', 'ZDRAVÍ', 'HEAL', 'HEALTH'].some(k => l.includes(k))) return 'text-green-400';
        if (['DMG', 'ATK', 'ÚTOK', 'UTOK', 'ATTACK'].some(k => l.includes(k))) return 'text-signal-hazard';
        if (['GOLD', 'MINCE', 'KREDITY', 'CREDITS'].some(k => l.includes(k))) return 'text-signal-amber';
        return 'text-white';
    };

    const getStatDescription = (label: string, value: string | number) => {
        const l = label.toUpperCase();
        const v = String(value);
        const isPositive = v.includes('+') || (!v.includes('-') && parseInt(v) > 0);

        if (['HP', 'ZDRAVÍ', 'HEAL', 'HEALTH'].some(k => l.includes(k))) {
            return isPositive ? `Okamžitě obnovuje ${v} jednotek biologické integrity.` : `Způsobuje přímé poškození tkání ve výši ${v} HP.`;
        }
        if (['DMG', 'ATK', 'ÚTOK', 'UTOK', 'ATTACK'].some(k => l.includes(k))) {
            return `Zvyšuje sílu příštího úderu nebo automatického útoku o ${v}.`;
        }
        if (['GOLD', 'MINCE', 'KREDITY', 'CREDITS'].some(k => l.includes(k))) {
            return `Transakční kredity v hodnotě ${v} byly připsány do tvého účtu.`;
        }
        if (['ARMOR', 'OBRANA', 'BRNĚNÍ'].some(k => l.includes(k))) {
            return `Zvyšuje tvou statickou ochranu o ${v}. Snižuje příchozí DMG.`;
        }
        return `Speciální modifikátor sektoru ovlivňující parametr ${label} o ${v}.`;
    };

    const handleDilemmaChoice = (option: DilemmaOption) => {
        setSelectedOption(option);

        // RNG Logic
        const roll = Math.random() * 100;
        const isSuccess = roll < (option.successChance ?? 100);
        const outcome = isSuccess ? 'success' : 'fail';

        setDilemmaOutcome(outcome);
        setDilemmaStep('RESULT');

        if (isSuccess) {
            playSound('success');
            vibrate([50, 50]);
        } else {
            playSound('error');
            vibrate([100, 100]);
        }

        if (onResolveDilemma) onResolveDilemma(option, outcome);
    };

    const handleDiscardClick = () => {
        if (showDeleteConfirm && onDiscard) {
            onDiscard();
            playSound('error');
            onClose(); // Auto close after delete
        } else {
            setShowDeleteConfirm(true);
            vibrate(20);
        }
    };

    const getTheme = (type: GameEventType, rarity: string) => {
        if (type === GameEventType.BOSS) return {
            bg: 'bg-black',
            border: 'border-signal-hazard',
            text: 'text-signal-hazard',
            accent: 'bg-signal-hazard',
            icon: <Crown className="w-8 h-8 text-signal-hazard" />
        };
        if (type === GameEventType.SPACE_STATION) return {
            bg: 'bg-black',
            border: 'border-signal-cyan',
            text: 'text-signal-cyan',
            accent: 'bg-signal-cyan',
            icon: <Satellite className="w-8 h-8 text-signal-cyan" />
        };
        if (type === GameEventType.PLANET) return {
            bg: 'bg-black',
            border: 'border-indigo-400',
            text: 'text-indigo-400',
            accent: 'bg-indigo-500',
            icon: <Globe className="w-8 h-8 text-indigo-400" />
        };
        if (type === GameEventType.TRAP) return {
            bg: 'bg-black',
            border: 'border-orange-500',
            text: 'text-orange-500',
            accent: 'bg-orange-500',
            icon: <Zap className="w-8 h-8 text-orange-500" />
        };
        if (type === GameEventType.MERCHANT) return {
            bg: 'bg-black',
            border: 'border-signal-amber',
            text: 'text-signal-amber',
            accent: 'bg-signal-amber',
            icon: <ShoppingBag className="w-8 h-8 text-signal-amber" />
        };
        if (type === GameEventType.ENCOUNTER) return {
            bg: 'bg-black',
            border: 'border-red-500',
            text: 'text-red-500',
            accent: 'bg-red-500',
            icon: <Swords className="w-8 h-8 text-red-500" />
        };
        if (type === GameEventType.DILEMA) return {
            bg: 'bg-black',
            border: 'border-purple-400',
            text: 'text-purple-400',
            accent: 'bg-purple-500',
            icon: <Map className="w-8 h-8 text-purple-400" />
        };
        const rarityColors: Record<string, string> = {
            'Legendary': 'border-signal-amber text-signal-amber',
            'Epic': 'border-purple-400 text-purple-400',
            'Rare': 'border-signal-cyan text-signal-cyan',
            'Common': 'border-white/20 text-zinc-400'
        };
        return {
            bg: 'bg-black',
            border: rarityColors[rarity] || rarityColors['Common'],
            text: rarityColors[rarity]?.split(' ')[1] || 'text-zinc-400',
            accent: rarityColors[rarity]?.split(' ')[1].replace('text-', 'bg-') || 'bg-white',
            icon: <Scan className="w-8 h-8" />
        };
    };

    const theme = getTheme(event.type, event.rarity);
    const isDilemma = event.type === GameEventType.DILEMA;

    const renderStatExplain = (label: string, value: string | number) => (
        <AnimatePresence>
            {expandedStat === label && (
                <motion.div
                    {...({
                        initial: { height: 0, opacity: 0 },
                        animate: { height: 'auto', opacity: 1 },
                        exit: { height: 0, opacity: 0 }
                    } as any)}
                    className="overflow-hidden"
                >
                    <div className="mt-2 p-2 bg-white/5 border-l-2 border-arc-cyan text-[10px] text-zinc-400 font-mono italic">
                        {getStatDescription(label, value)}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    const renderPlanetContent = () => (
        <div className="space-y-4">
            <div className="p-4 bg-indigo-950/10 border-l-2 border-indigo-500 flex items-start gap-4 sticky-card relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-20"><Rocket className="w-16 h-16 text-indigo-500" /></div>
                <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1">
                        NAVIGAČNÍ DATA
                    </h4>
                    <p className="text-xs text-zinc-400 font-mono leading-relaxed relative z-10">
                        Uložte tuto kartu do batohu pro odemčení nové destinace.
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
                <div className="bg-white/5 p-2 flex flex-col border border-white/5">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">ID SEKTORU</span>
                    <span className="text-white font-mono text-sm">{event.planetConfig?.planetId || 'N/A'}</span>
                </div>
                <div className="bg-white/5 p-2 flex flex-col border border-white/5">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">TYP UDÁLOSTI</span>
                    <span className="text-white font-mono text-sm">{event.planetConfig?.landingEventType || 'NEZNÁMÝ'}</span>
                </div>
            </div>
        </div>
    );

    const renderStationContent = () => (
        <div className="space-y-4">
            <div className="bg-cyan-950/10 border border-signal-cyan/30 p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2 text-signal-cyan">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest">SPOJENÍ SE STANICÍ NAVÁZÁNO</span>
                </div>
                <p className="text-xs text-zinc-400 font-mono mb-4 text-justify border-l border-white/10 pl-2">
                    {event.stationConfig?.welcomeMessage || 'Vítejte na palubě. Systémy jsou funkční.'}
                </p>

                <div className="space-y-1">
                    <div className="flex justify-between items-center bg-black/40 p-2 border-b border-white/10">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Kyslík (O2)</span>
                        <span className="text-signal-cyan font-mono text-xs">{event.stationConfig?.refillO2 ? 'DOPLNĚNÍ OK' : '---'}</span>
                    </div>

                    <div className="flex justify-between items-center bg-black/40 p-2 border-b border-white/10">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Oprava Pláště</span>
                        <span className="text-green-500 font-mono text-xs">+{event.stationConfig?.repairAmount || 30} HP</span>
                    </div>

                    <div className="flex justify-between items-center bg-black/40 p-2 border-b border-white/10">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Palivo</span>
                        <span className="text-signal-amber font-mono text-xs">+{event.stationConfig?.fuelReward || 50} PALIVA</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMerchantContent = () => (
        <div className="space-y-4">
            <div className="bg-yellow-900/5 border border-signal-amber/30 p-4 text-center relative">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-signal-amber"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-signal-amber"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-signal-amber"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-signal-amber"></div>

                <p className="text-[10px] uppercase font-bold text-signal-amber mb-2 tracking-widest">SIGNÁL OBCHODNÍKA</p>
                <div className="text-xs text-zinc-400 font-mono">"{event.description}"</div>
            </div>
            <div className="bg-black/40 border border-white/5 p-3">
                <h4 className="text-[9px] font-black text-zinc-600 uppercase mb-3 tracking-widest">SLEVOVÉ PROTOKOLY</h4>
                <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between"><span className="text-red-400">WARRIOR</span><span className="text-white">-{event.tradeConfig?.warriorDiscount || 10}%</span></div>
                    <div className="flex justify-between"><span className="text-blue-400">MAGE</span><span className="text-white">-{event.tradeConfig?.mageDiscount || 25}%</span></div>
                    <div className="flex justify-between"><span className="text-yellow-500">CLERIC</span><span className="text-white">-{event.tradeConfig?.clericDiscount || 45}%</span></div>
                </div>
            </div>
        </div>
    );

    const renderItemContent = () => (
        <div className="space-y-4">
            {/* SELL ONLY WARNING */}
            {event.isSellOnly && (
                <div className="bg-red-950/10 border border-red-500/30 p-3 flex items-start gap-4 mb-2">
                    <Ban className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                        <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-1">
                            NEPOUŽITELNÝ PŘEDMĚT
                        </h4>
                        <p className="text-[9px] text-zinc-500 font-mono leading-tight">
                            Určeno pouze pro prodej. Žádná bojová hodnota.
                        </p>
                    </div>
                </div>
            )}

            {/* RESOURCE CONTAINER DISPLAY */}
            {event.resourceConfig?.isResourceContainer && (
                <div className="bg-orange-950/10 border border-orange-500/30 p-4 flex items-center gap-4 mb-4 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-10"><Box className="w-24 h-24 text-orange-500" /></div>
                    <div className="p-2 border border-orange-500/50">
                        <Hammer className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1">
                            {event.resourceConfig.customLabel || 'SUROVINA'}
                        </h4>
                        <p className="text-xl font-mono font-bold text-white uppercase leading-none">
                            {event.resourceConfig.resourceName} <span className="text-orange-500 text-sm">x{event.resourceConfig.resourceAmount}</span>
                        </p>
                    </div>
                </div>
            )}

            {event.stats && event.stats.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {event.stats.map((stat, idx) => (
                        <div key={idx} className="flex flex-col group">
                            <motion.button
                                onClick={() => handleStatClick(stat.label)}
                                className={`bg-white/5 border p-2 flex flex-col items-start transition-all hover:bg-white/10 ${expandedStat === stat.label ? 'border-signal-cyan bg-signal-cyan/5' : 'border-white/10'}`}
                            >
                                <span className="text-[8px] uppercase font-black text-zinc-500 tracking-widest mb-1 group-hover:text-zinc-300">{stat.label}</span>
                                <span className={`text-xl font-black font-mono ${getStatColor(stat.label)}`}>{stat.value}</span>
                            </motion.button>
                            {renderStatExplain(stat.label, stat.value)}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-between items-center bg-black/60 px-3 py-2 border-t border-white/10 mt-2">
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">TRŽNÍ HODNOTA</span>
                <div className="flex items-center gap-2 text-signal-amber"><Coins className="w-3 h-3" /><span className="font-mono font-bold text-sm">{event.price ?? 50}</span></div>
            </div>
        </div>
    );

    return (
        <motion.div
            {...({
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
                transition: { duration: 0.2 }
            } as any)}
            className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
        >
            <motion.div
                {...({
                    initial: { scale: 0.95, opacity: 0, y: 20 },
                    animate: { scale: 1, opacity: 1, y: 0 },
                    exit: { scale: 0.95, opacity: 0, y: 20 },
                    transition: { type: 'spring', damping: 25, stiffness: 300 }
                } as any)}
                className={`w-full max-w-sm bg-black border ${theme.border} relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] min-h-[50vh] max-h-[90vh]`}
            >

                {/* DECORATIVE CORNERS */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/20 pointer-events-none z-20"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/20 pointer-events-none z-20"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/20 pointer-events-none z-20"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/20 pointer-events-none z-20"></div>
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-20"></div>

                {/* HEADER */}
                <div className="relative p-5 z-10 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`flex items-center gap-2 ${theme.text}`}>
                            {theme.icon}
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isDilemma ? 'DILEMA' : event.type}</span>
                        </div>
                        <button onClick={onClose} className="p-2 text-zinc-600 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <h2 className={`text-2xl font-display font-black uppercase tracking-tighter leading-none ${theme.text} mb-2`}>{event.title}</h2>
                    {!isDilemma && (
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 ${theme.accent} rounded-full animate-pulse`}></div>
                            <span className="text-[8px] font-mono text-zinc-500 uppercase">{event.rarity || 'COMMON'} TŘÍDA</span>
                        </div>
                    )}
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 relative z-10">

                    {/* Main Description */}
                    <div className="mb-6 pl-3 border-l-2 border-white/10">
                        <p className="text-xs text-zinc-400 font-mono leading-relaxed">"{event.description}"</p>
                    </div>

                    {!isDilemma && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* TRAP COMPONENT */}
                            {event.type === GameEventType.TRAP && (
                                <TrapCard
                                    event={event}
                                    onClose={onClose}
                                    onPlayerDamage={onPlayerDamage}
                                    playerClass={playerClass}
                                    onClaimLoot={onClaimLoot}
                                />
                            )}

                            {/* COMBAT COMPONENT */}
                            {isCombat && (
                                <CombatCard
                                    event={event}
                                    onClose={onClose}
                                    playerHp={playerHp}
                                    playerArmor={playerArmor}
                                    onArmorChange={onArmorChange}
                                    onPlayerDamage={onPlayerDamage}
                                    inventory={inventory}
                                    onUseItem={onUseItem}
                                    onClaimLoot={onClaimLoot}
                                    activeCharacter={activeCharacter}
                                />
                            )}

                            {event.type === GameEventType.MERCHANT && renderMerchantContent()}
                            {event.type === GameEventType.PLANET && renderPlanetContent()}
                            {/* Fallback to renderItemContent if type is ITEM or undefined/generic */}
                            {(event.type === GameEventType.ITEM || event.type === 'PŘEDMĚT' as GameEventType) && renderItemContent()}
                            {event.type === GameEventType.SPACE_STATION && renderStationContent()}
                        </div>
                    )}

                    {/* NEW DILEMMA UI */}
                    {isDilemma && dilemmaStep === 'CHOICE' && (
                        <div className="space-y-3 mt-2">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-500/20">
                                <AlertTriangle className="w-3 h-3 text-purple-500" />
                                <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest">VYŽADOVÁNA VOLBA</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {event.dilemmaOptions?.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleDilemmaChoice(opt)}
                                        className="group relative overflow-hidden bg-purple-900/5 hover:bg-purple-900/20 border border-purple-500/20 hover:border-purple-500 transition-all text-left"
                                    >
                                        <div className="p-4 relative z-10 flex justify-between items-center">
                                            <div>
                                                <span className="text-[9px] font-mono text-zinc-500 group-hover:text-purple-400 uppercase block mb-1">MOŽNOST {String.fromCharCode(65 + i)}</span>
                                                <span className="text-xs font-bold text-zinc-200 group-hover:text-white uppercase tracking-wider">{opt.label}</span>
                                            </div>
                                            {opt.successChance !== undefined && opt.successChance < 100 && (
                                                <div className="text-[9px] font-mono text-purple-500 border border-purple-500/30 px-2 py-1 bg-black">{opt.successChance}% ŠANCE</div>
                                            )}
                                        </div>
                                        <div className="absolute inset-y-0 left-0 w-0.5 bg-purple-500/0 group-hover:bg-purple-500 transition-colors"></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isDilemma && dilemmaStep === 'RESULT' && (
                        <div className="space-y-4 mt-2 animate-in fade-in duration-300">
                            <div className={`p-4 border-l-2 ${dilemmaOutcome === 'success' ? 'border-green-500 bg-green-900/5' : 'border-red-500 bg-red-900/5'}`}>
                                <div className={`flex items-center gap-2 mb-2 ${dilemmaOutcome === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                    {dilemmaOutcome === 'success' ? <Info className="w-4 h-4" /> : <Skull className="w-4 h-4" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{dilemmaOutcome === 'success' ? 'ÚSPĚCH' : 'NEÚSPĚCH'}</span>
                                </div>
                                <p className="text-xs text-white font-mono leading-relaxed">
                                    {dilemmaOutcome === 'success' ? selectedOption?.consequenceText : selectedOption?.failMessage || "Akce selhala."}
                                </p>
                            </div>

                            {/* Rewards / Damage */}
                            <div className="flex flex-wrap gap-2">
                                {dilemmaOutcome === 'success' && selectedOption?.rewards?.map((rew, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-black border border-green-500/30 text-green-400 font-mono text-xs">
                                        {rew.type === 'HP' ? <Heart className="w-3 h-3" /> : rew.type === 'GOLD' ? <Coins className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                        <span>+{rew.value} {rew.type}</span>
                                    </div>
                                ))}
                                {dilemmaOutcome === 'success' && !selectedOption?.rewards && selectedOption?.effectType && selectedOption.effectType !== 'none' && (
                                    <div className={`flex items-center gap-2 px-3 py-2 bg-black border font-mono text-xs ${(selectedOption.effectValue ?? 0) > 0 ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                                        <span>{(selectedOption.effectValue ?? 0) > 0 ? '+' : ''}{selectedOption.effectValue} {selectedOption.effectType.toUpperCase()}</span>
                                    </div>
                                )}
                                {dilemmaOutcome === 'fail' && selectedOption?.failDamage ? (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-black border border-red-500/30 text-red-400 font-mono text-xs">
                                        <Skull className="w-3 h-3" />
                                        <span>-{selectedOption.failDamage} HP</span>
                                    </div>
                                ) : null}
                            </div>

                            {/* PHYSICAL INSTRUCTION */}
                            {selectedOption?.physicalInstruction && (
                                <div className="mt-4 p-3 bg-signal-amber/5 border-t border-signal-amber/20">
                                    <div className="flex items-center gap-2 text-signal-amber mb-1">
                                        <CornerDownRight className="w-4 h-4" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">FYZICKÁ INTERAKCE</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-300 font-mono uppercase">
                                        {selectedOption.physicalInstruction}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 border-t border-white/5 bg-white/[0.02] flex flex-col gap-2 relative z-10">
                    <div className="flex gap-2">
                        {/* USE BUTTON */}
                        {onUse && dilemmaStep !== 'RESULT' && !isDilemma && !event.resourceConfig?.isResourceContainer && !event.isSellOnly && !isCombat && !isTrap && event.type !== GameEventType.PLANET && (
                            <button onClick={onUse} className={`flex-1 py-4 text-black font-black uppercase text-[11px] tracking-[0.2em] font-display hover:brightness-125 transition-all text-center clip-path-button ${theme.accent}`}>
                                {event.type === GameEventType.MERCHANT ? 'OTEVŘÍT OBCHOD' :
                                    event.type === GameEventType.SPACE_STATION ? 'DOKOVAT & ZÁSOBIT' : 'POUŽÍT PŘEDMĚT'}
                            </button>
                        )}
                        {dilemmaStep === 'RESULT' && isDilemma && (
                            <button onClick={onClose} className="w-full py-4 bg-white text-black font-black uppercase text-[11px] tracking-[0.2em] hover:bg-zinc-200 transition-all text-center clip-path-button flex items-center justify-center gap-2">
                                POKRAČOVAT <ChevronRight className="w-4 h-4" />
                            </button>
                        )}

                        {allowSave && onSave && !isSaved ? (
                            <button onClick={onSave} className={`flex-1 py-4 border font-black uppercase text-[11px] tracking-[0.2em] font-display hover:bg-white/10 transition-all text-center clip-path-button flex items-center justify-center gap-2 ${event.resourceConfig?.isResourceContainer ? 'border-orange-500 text-orange-500' : 'border-white/20 text-white'}`}>
                                {event.resourceConfig?.isResourceContainer ? <><Hammer className="w-4 h-4" /> TĚŽIT</> : 'ULOŽIT DO BATOHU'}
                            </button>
                        ) : (
                            isSaved && !isCombat && !isTrap && (event.resourceConfig?.isResourceContainer || event.type === GameEventType.PLANET || event.isSellOnly) && (
                                <div className="flex-1 py-4 border border-white/10 text-zinc-600 font-black uppercase text-[11px] tracking-[0.2em] text-center cursor-default bg-black">
                                    V BATOHU
                                </div>
                            )
                        )}
                    </div>
                    {isSaved && onDiscard && !isDilemma && !isCombat && !isTrap && (
                        <button onClick={handleDiscardClick} className={`w-full py-3 border font-black uppercase text-[10px] tracking-[0.2em] font-mono text-center flex items-center justify-center gap-2 hover:bg-red-900/20 transition-all ${showDeleteConfirm ? 'border-red-500 text-red-500' : 'border-white/5 text-zinc-600 hover:text-red-500'}`}>
                            {showDeleteConfirm ? 'POTVRDIT VYHOZENÍ' : 'VYHODIT PŘEDMĚT'} <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default EventCard;

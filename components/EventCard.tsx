
import React, { useState, useEffect } from 'react';
import { GameEvent, GameEventType, DilemmaOption, Stat, PlayerClass } from '../types';
import { X, Info, Trash2, Skull, Crown, ShoppingBag, Zap, Shield, Swords, Coins, Heart, Cross, Wand2, Sword, Scan, Map, Compass, Navigation, ArrowRight, CornerDownRight, Percent, Satellite, Wind, Radio, Hammer, Box, Fuel, Globe, Rocket, Ban } from 'lucide-react';
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
        if (['MANA', 'ENERGIE', 'ENERGY'].some(k => l.includes(k))) return 'text-signal-cyan';
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
        if (['MANA', 'ENERGIE', 'ENERGY'].some(k => l.includes(k))) {
            return `Obnovuje ${v} jednotek energie pro použití schopností nebo svitků.`;
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
            bg: 'bg-gradient-to-b from-red-950/90 to-black',
            border: 'border-red-600 shadow-[0_0_60px_rgba(220,38,38,0.4)]',
            text: 'text-red-500',
            accent: 'bg-red-600',
            icon: <Crown className="w-8 h-8 text-red-500" />
        };
        if (type === GameEventType.SPACE_STATION) return {
            bg: 'bg-gradient-to-b from-slate-900/90 to-black',
            border: 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.2)]',
            text: 'text-cyan-400',
            accent: 'bg-cyan-500',
            icon: <Satellite className="w-8 h-8 text-cyan-400" />
        };
        if (type === GameEventType.PLANET) return {
            bg: 'bg-gradient-to-b from-indigo-950/90 to-black',
            border: 'border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.2)]',
            text: 'text-indigo-400',
            accent: 'bg-indigo-500',
            icon: <Globe className="w-8 h-8 text-indigo-400" />
        };
        if (type === GameEventType.TRAP) return {
            bg: 'bg-gradient-to-b from-orange-950/90 to-black',
            border: 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)]',
            text: 'text-orange-500',
            accent: 'bg-orange-500',
            icon: <Zap className="w-8 h-8 text-orange-500" />
        };
        if (type === GameEventType.MERCHANT) return {
            bg: 'bg-gradient-to-b from-yellow-950/90 to-black',
            border: 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]',
            text: 'text-yellow-500',
            accent: 'bg-yellow-500',
            icon: <ShoppingBag className="w-8 h-8 text-yellow-500" />
        };
        if (type === GameEventType.ENCOUNTER) return {
            bg: 'bg-gradient-to-b from-rose-950/90 to-black',
            border: 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)]',
            text: 'text-rose-500',
            accent: 'bg-rose-500',
            icon: <Swords className="w-8 h-8 text-rose-500" />
        };
        if (type === GameEventType.DILEMA) return {
            bg: 'bg-[#0a0b0d]',
            border: 'border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.2)]',
            text: 'text-purple-400',
            accent: 'bg-purple-500',
            icon: <Map className="w-8 h-8 text-purple-400" />
        };
        const rarityColors: Record<string, string> = {
            'Legendary': 'border-signal-amber text-signal-amber shadow-[0_0_30px_rgba(255,157,0,0.3)]',
            'Epic': 'border-purple-400 text-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.3)]',
            'Rare': 'border-signal-cyan text-signal-cyan shadow-[0_0_20px_rgba(0,242,255,0.2)]',
            'Common': 'border-white/30 text-white/60'
        };
        return {
            bg: 'bg-[#0a0b0d]',
            border: rarityColors[rarity] || rarityColors['Common'],
            text: rarityColors[rarity]?.split(' ')[1] || 'text-white',
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
                    <div className="mt-2 p-2 bg-black/60 border border-white/10 rounded-lg text-[10px] text-zinc-300 leading-tight italic">
                        {getStatDescription(label, value)}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    const renderPlanetContent = () => (
        <div className="space-y-4">
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-black border border-indigo-500/50 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                    <Rocket className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1">
                        Navigační Data
                    </h4>
                    <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                        Uložte tuto kartu do batohu. Odemkne vám novou destinaci v navigačním systému lodi.
                    </p>
                </div>
            </div>
            <div className="bg-black/40 border border-white/5 p-3 rounded-lg flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Sektor ID</span>
                <span className="text-white font-mono font-bold">{event.planetConfig?.planetId || 'N/A'}</span>
            </div>
            <div className="bg-black/40 border border-white/5 p-3 rounded-lg flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Typ Eventu</span>
                <span className="text-white font-mono font-bold">{event.planetConfig?.landingEventType || 'UNKNOWN'}</span>
            </div>
        </div>
    );

    const renderStationContent = () => (
        <div className="space-y-4">
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-cyan-400">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Stanice Online</span>
                </div>
                <p className="text-xs text-zinc-300 italic mb-4">"{event.stationConfig?.welcomeMessage || 'Vítejte na palubě. Systémy jsou funkční.'}"</p>

                <div className="space-y-2">
                    <div className="flex justify-between items-center bg-black/40 p-3 rounded border border-green-500/20">
                        <div className="flex items-center gap-2">
                            <Wind className="w-4 h-4 text-cyan-300" />
                            <span className="text-[10px] font-bold text-zinc-300 uppercase">Kyslík (O2)</span>
                        </div>
                        <div className="text-green-500 font-mono text-xs font-bold flex items-center gap-1 uppercase">
                            {event.stationConfig?.refillO2 ? 'DOPLNĚNÍ NA 100%' : '---'}
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-black/40 p-3 rounded border border-green-500/20">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-slate-300" />
                            <span className="text-[10px] font-bold text-zinc-300 uppercase">Oprava Pláště</span>
                        </div>
                        <div className="text-green-500 font-mono text-xs font-bold flex items-center gap-1">
                            +{event.stationConfig?.repairAmount || 30} HP
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-black/40 p-3 rounded border border-green-500/20">
                        <div className="flex items-center gap-2">
                            <Fuel className="w-4 h-4 text-orange-400" />
                            <span className="text-[10px] font-bold text-zinc-300 uppercase">Doplnění Paliva</span>
                        </div>
                        <div className="text-green-500 font-mono text-xs font-bold flex items-center gap-1">
                            +{event.stationConfig?.fuelReward || 50}
                        </div>
                    </div>
                </div>
            </div>
            <p className="text-[9px] text-green-500 text-center uppercase font-bold">Odměna za přistání na stanici</p>
        </div>
    );

    const renderMerchantContent = () => (
        <div className="space-y-4">
            <div className="bg-yellow-900/10 border border-yellow-700/30 p-4 rounded-lg text-center">
                <p className="text-[10px] uppercase font-bold text-yellow-500 mb-2">Obchodní Status</p>
                <div className="text-xs text-zinc-300 italic">"{event.description}"</div>
            </div>
            <div className="bg-black/40 border border-zinc-800 rounded-lg p-3">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-3 border-b border-zinc-800 pb-1">Třídní Slevy & Bonusy</h4>
                <div className="space-y-2">
                    <div className="flex justify-between items-center"><div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase"><Sword className="w-3 h-3" /> Válečník</div><div className="text-white font-mono text-xs">{event.tradeConfig?.warriorDiscount || 10}% SLEVA</div></div>
                    <div className="flex justify-between items-center"><div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase"><Wand2 className="w-3 h-3" /> Mág (Svitky)</div><div className="text-white font-mono text-xs">{event.tradeConfig?.mageDiscount || 25}% SLEVA</div></div>
                    <div className="flex justify-between items-center"><div className="flex items-center gap-2 text-yellow-500 text-[10px] font-bold uppercase"><Cross className="w-3 h-3" /> Kněz (Heal)</div><div className="text-white font-mono text-xs">{event.tradeConfig?.clericDiscount || 45}% SLEVA</div></div>
                </div>
            </div>
        </div>
    );

    const renderItemContent = () => (
        <div className="space-y-4">
            <p className="text-[8px] text-white/30 uppercase font-black tracking-widest flex items-center gap-2 mb-2">
                <Info className="w-3 h-3" /> Klikni na stat pro vysvětlení vlivu
            </p>

            {/* SELL ONLY WARNING */}
            {event.isSellOnly && (
                <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-xl flex items-center gap-4 mb-4">
                    <div className="p-3 bg-black border border-red-500/50 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                        <Ban className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-1 flex items-center gap-2">
                            JEN PRO PRODEJ
                        </h4>
                        <p className="text-[8px] text-zinc-400 font-mono leading-relaxed">
                            Tento předmět nemá žádnou funkční hodnotu. Lze jej pouze prodat obchodníkům za kredity.
                        </p>
                    </div>
                </div>
            )}

            {/* RESOURCE CONTAINER DISPLAY */}
            {event.resourceConfig?.isResourceContainer && (
                <div className="bg-orange-950/20 border border-orange-500/30 p-4 rounded-xl flex items-center gap-4 mb-4">
                    <div className="p-3 bg-black border border-orange-500/50 rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.15)]">
                        <Hammer className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1 flex items-center gap-2">
                            <Box className="w-3 h-3" /> {event.resourceConfig.customLabel || 'Surovina k Těžbě'}
                        </h4>
                        <p className="text-lg font-mono font-bold text-white uppercase leading-none">
                            {event.resourceConfig.resourceName} <span className="text-orange-500 text-sm">x{event.resourceConfig.resourceAmount}</span>
                        </p>
                        <p className="text-[8px] text-zinc-500 font-mono mt-1">Lze použít pro crafting nebo prodej.</p>
                    </div>
                </div>
            )}

            {event.stats && event.stats.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {event.stats.map((stat, idx) => (
                        <div key={idx} className="flex flex-col">
                            <motion.button
                                onClick={() => handleStatClick(stat.label)}
                                className={`bg-white/5 border p-3 rounded-xl flex flex-col items-center transition-all ${expandedStat === stat.label ? 'border-signal-cyan bg-signal-cyan/5' : 'border-white/10'}`}
                            >
                                <span className="text-[9px] uppercase font-bold text-zinc-400">{stat.label}</span>
                                <span className={`text-lg font-black font-mono ${getStatColor(stat.label)}`}>{stat.value}</span>
                            </motion.button>
                            {renderStatExplain(stat.label, stat.value)}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-between items-center bg-zinc-900 p-3 rounded-lg border border-zinc-700">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Tržní Hodnota</span>
                <div className="flex items-center gap-2 text-yellow-500"><Coins className="w-4 h-4" /><span className="font-mono font-bold text-lg">{event.price ?? 50}</span></div>
            </div>
        </div>
    );

    return (
        <motion.div {...({ initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 1.05, y: -20 } } as any)} className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
            <div className={`w-full max-w-sm ${theme.bg} border-2 ${theme.border} relative overflow-hidden flex flex-col shadow-2xl rounded-3xl max-h-[90vh]`}>

                {/* HEADER */}
                <div className="relative p-6 pb-4 z-10">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm ${theme.text}`}>{theme.icon}</div>
                        <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors bg-black/20 rounded-full"><X className="w-6 h-6" /></button>
                    </div>
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-[0.3em] block mb-1 flex items-center gap-2 ${event.dilemmaScope === 'GLOBAL' ? 'text-purple-400 animate-pulse' : 'text-white/30'}`}>
                        {isDilemma ? (event.dilemmaScope === 'GLOBAL' ? <><Globe className="w-3 h-3" /> GLOBÁLNÍ KŘIŽOVATKA</> : 'TAKTICKÉ ROZHODNUTÍ') : `${event.type}`}
                    </span>
                    <h2 className={`text-3xl font-black uppercase tracking-tighter leading-none font-sans ${theme.text} drop-shadow-md`}>{event.title}</h2>

                    {!isDilemma && (
                        <div className={`inline-block mt-2 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest border rounded ${theme.border} ${theme.text} bg-black/40`}>{event.rarity}</div>
                    )}
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 relative z-10">

                    {/* Main Description */}
                    <div className="mb-6 relative">
                        <div className={`absolute top-0 left-0 w-1 h-full ${theme.accent} opacity-50`} />
                        <p className="pl-4 text-xs text-zinc-300 italic leading-relaxed font-serif opacity-90">"{event.description}"</p>
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
                                    onClaimLoot={onClaimLoot} // PASSED
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
                        <div className="space-y-4 mt-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Compass className="w-4 h-4 text-purple-400 animate-pulse" />
                                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">Analýza Rozcestí</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {event.dilemmaOptions?.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleDilemmaChoice(opt)}
                                        className="relative group p-0 overflow-hidden rounded-xl border border-purple-500/30 bg-purple-900/10 hover:border-purple-400 hover:bg-purple-900/20 transition-all active:scale-[0.98]"
                                    >
                                        <div className="absolute top-0 right-0 p-2 opacity-50">
                                            <Navigation className="w-12 h-12 text-purple-500/20 group-hover:text-purple-400/30 transition-colors" />
                                        </div>
                                        <div className="p-4 flex flex-col items-start relative z-10">
                                            <div className="flex justify-between w-full">
                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-purple-300">TRASA {String.fromCharCode(65 + i)}</span>
                                                {opt.successChance !== undefined && opt.successChance < 100 && (
                                                    <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-1"><Percent className="w-3 h-3" /> {opt.successChance}%</span>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold text-white uppercase tracking-wider text-left w-full">{opt.label}</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500/20 group-hover:bg-purple-400 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isDilemma && dilemmaStep === 'RESULT' && (
                        <div className="space-y-6 mt-4 animate-in slide-in-from-right-8 duration-300">

                            {/* Consequence Block */}
                            <div className={`p-5 rounded-2xl border relative overflow-hidden ${dilemmaOutcome === 'success' ? 'bg-purple-900/20 border-purple-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full pointer-events-none" />
                                <div className={`flex items-center gap-2 mb-3 ${dilemmaOutcome === 'success' ? 'text-purple-400' : 'text-red-400'}`}>
                                    {dilemmaOutcome === 'success' ? <Info className="w-4 h-4" /> : <Skull className="w-4 h-4" />}
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{dilemmaOutcome === 'success' ? 'Taktický Důsledek' : 'Selhání Operace'}</span>
                                </div>
                                <p className="text-sm text-white font-medium leading-relaxed">
                                    {dilemmaOutcome === 'success' ? selectedOption?.consequenceText : selectedOption?.failMessage || "Akce selhala."}
                                </p>

                                {/* Rewards / Damage Pills */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {dilemmaOutcome === 'success' && selectedOption?.rewards?.map((rew, idx) => (
                                        <div key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-green-500/10 border-green-500/30 text-green-400">
                                            {rew.type === 'HP' ? <Heart className="w-3 h-3" /> : rew.type === 'GOLD' ? <Coins className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                            <span>+{rew.value} {rew.type}</span>
                                        </div>
                                    ))}
                                    {/* Backward compatibility for old effectType - FIXED TS ERROR HERE */}
                                    {dilemmaOutcome === 'success' && !selectedOption?.rewards && selectedOption?.effectType && selectedOption.effectType !== 'none' && (
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${(selectedOption.effectValue ?? 0) > 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                            {selectedOption.effectType === 'hp' ? <Heart className="w-3 h-3" /> : <Coins className="w-3 h-3" />}
                                            <span>{(selectedOption.effectValue ?? 0) > 0 ? '+' : ''}{selectedOption.effectValue} {selectedOption.effectType.toUpperCase()}</span>
                                        </div>
                                    )}

                                    {dilemmaOutcome === 'fail' && selectedOption?.failDamage ? (
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-red-500/10 border-red-500/30 text-red-400">
                                            <Skull className="w-3 h-3" />
                                            <span>-{selectedOption.failDamage} HP</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* PHYSICAL BOARD INSTRUCTION - Highlighted */}
                            {selectedOption?.physicalInstruction && (
                                <div className="relative">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-signal-amber to-transparent opacity-30 blur rounded-lg" />
                                    <div className="relative bg-black border-l-4 border-signal-amber p-4 rounded-r-xl">
                                        <div className="flex items-center gap-2 text-signal-amber mb-2">
                                            <CornerDownRight className="w-5 h-5" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Rozkaz pro Desku</span>
                                        </div>
                                        <p className="text-xs text-white font-mono font-bold leading-relaxed uppercase">
                                            {selectedOption.physicalInstruction}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 bg-black/60 border-t border-white/5 flex flex-col gap-2 relative z-10 backdrop-blur-md">
                    <div className="flex gap-3">
                        {/* USE BUTTON - HIDDEN IF SELL ONLY OR PLANET OR COMBAT OR TRAP (Handled internally) */}
                        {onUse && dilemmaStep !== 'RESULT' && !isDilemma && !event.resourceConfig?.isResourceContainer && !event.isSellOnly && !isCombat && !isTrap && event.type !== GameEventType.PLANET && (
                            <button onClick={onUse} className={`flex-1 py-4 text-black font-black uppercase text-[11px] tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all font-mono rounded-xl shadow-lg ${theme.accent}`}>
                                {event.type === GameEventType.MERCHANT ? 'OTEVŘÍT OBCHOD' :
                                    event.type === GameEventType.SPACE_STATION ? 'Dokovat a Doplnit' : 'Použít'}
                            </button>
                        )}
                        {dilemmaStep === 'RESULT' && isDilemma && (
                            <button onClick={onClose} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-[11px] tracking-[0.2em] active:scale-95 transition-all rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
                                Pokračovat v Misi <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {/* Trap/Combat close buttons handled internally but allowSave acts as fallback or secondary */}

                        {allowSave && onSave && !isSaved ? (
                            <button onClick={onSave} className={`flex-1 py-4 border ${event.resourceConfig?.isResourceContainer ? 'border-orange-500 text-orange-500 bg-orange-950/20 hover:bg-orange-900/40' : 'border-white/20 text-white hover:bg-white/5'} font-black uppercase text-[11px] tracking-[0.2em] active:scale-95 transition-all font-mono rounded-xl flex items-center justify-center gap-2`}>
                                {event.resourceConfig?.isResourceContainer ? <><Hammer className="w-4 h-4" /> Vytěžit</> : 'Uložit'}
                            </button>
                        ) : (
                            // If saved and no use button (resource or Planet or Sell Only), show "Owned" or discard option
                            // HIDE FOR COMBAT/TRAP TOO
                            isSaved && !isCombat && !isTrap && (event.resourceConfig?.isResourceContainer || event.type === GameEventType.PLANET || event.isSellOnly) && (
                                <div className="flex-1 py-4 border border-white/10 bg-white/5 text-zinc-500 font-black uppercase text-[11px] tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 cursor-default">
                                    <Box className="w-4 h-4" /> VLASTNĚNO
                                </div>
                            )
                        )}
                    </div>
                    {isSaved && onDiscard && !isDilemma && !isCombat && !isTrap && (
                        <button onClick={handleDiscardClick} className={`w-full py-3 border ${showDeleteConfirm ? 'bg-red-900/80 border-red-500 text-white' : 'border-white/5 bg-transparent text-zinc-500'} font-black uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all font-mono rounded-xl flex items-center justify-center gap-2`}>
                            <Trash2 className="w-3 h-3" /> {showDeleteConfirm ? 'POTVRDIT ZAHOZENÍ' : 'Zahodit'}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default EventCard;

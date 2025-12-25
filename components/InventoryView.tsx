
import React, { useState, useMemo } from 'react';
import { GameEvent, GameEventType, PlayerClass } from '../types';
import { Box, ShoppingBag, BookOpen, Crown, RefreshCw, Loader2, Database, Swords, ArrowDownAZ, Star, Target, ArrowLeftRight, X, Zap, Satellite, Hammer, Filter, Layers, Copy, FlaskConical, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, vibrate } from '../services/soundService';

interface InventoryViewProps {
    inventory: GameEvent[];
    loadingInventory: boolean;
    isRefreshing: boolean;
    isAdmin: boolean;
    isNight: boolean;
    adminNightOverride: boolean | null;
    playerClass: PlayerClass | null;
    giftTarget: string | null;
    onRefresh: () => void;
    onItemClick: (event: GameEvent) => void;
    onTransferItem?: (itemId: string, targetNickname: string) => void;
    userNickname?: string;
    roomMembers?: {name: string, hp: number}[];
    isTestMode?: boolean; // New prop
}

type SortMode = 'DEFAULT' | 'RARITY' | 'SPECIALIZATION';
type FilterCategory = 'ALL' | 'RESOURCES' | 'ITEMS' | 'OTHERS';

// Extended type for stacked items display
interface StackedGameEvent extends GameEvent {
    _stackQty: number; // For non-resources (e.g. 5x Potion)
    _virtualStack: boolean;
}

const getRarityConfig = (rarity: string, type: string) => {
    if (type === GameEventType.BOSS) return { border: 'border-signal-hazard shadow-[0_0_15px_rgba(255,60,60,0.3)]', text: 'text-signal-hazard', label: 'BOSS_LEVEL' };
    if (type === GameEventType.SPACE_STATION) return { border: 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]', text: 'text-cyan-400', label: 'ORBITÁLNÍ' };
    if (type === GameEventType.PLANET) return { border: 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]', text: 'text-indigo-400', label: 'NAVIGAČNÍ DATA' };
    
    const r = (rarity || 'Common').toLowerCase();
    switch (r) {
        case 'legendary': return { border: 'border-signal-amber shadow-[0_0_15px_rgba(255,157,0,0.4)]', text: 'text-signal-amber', label: 'LEGENDÁRNÍ' };
        case 'epic': return { border: 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]', text: 'text-purple-400', label: 'EPICKÉ' };
        case 'rare': return { border: 'border-signal-cyan shadow-[0_0_10px_rgba(0,242,255,0.2)]', text: 'text-signal-cyan', label: 'VZÁCNÉ' };
        default: return { border: 'border-white/20', text: 'text-white/40', label: 'BĚŽNÉ' };
    }
};

const getEventIcon = (type: GameEventType, isResource: boolean) => {
    if (isResource) return <Hammer className="w-4 h-4" />;
    switch (type) {
        case GameEventType.BOSS: return <Crown className="w-4 h-4" />;
        case GameEventType.ITEM: return <Box className="w-4 h-4" />;
        case GameEventType.MERCHANT: return <ShoppingBag className="w-4 h-4" />;
        case GameEventType.TRAP: return <Swords className="w-4 h-4" />;
        case GameEventType.ENCOUNTER: return <Swords className="w-4 h-4" />;
        case GameEventType.SPACE_STATION: return <Satellite className="w-4 h-4" />;
        case GameEventType.PLANET: return <Globe className="w-4 h-4" />;
        default: return <BookOpen className="w-4 h-4" />;
    }
};

const InventoryView: React.FC<InventoryViewProps> = ({
    inventory, loadingInventory, isRefreshing, playerClass,
    onRefresh, onItemClick, isTestMode
}) => {
    const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
    const [sortMode, setSortMode] = useState<SortMode>('DEFAULT');
    
    // Comparison State
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<GameEvent[]>([]);

    const handleCardClick = (event: GameEvent) => {
        if (isCompareMode) {
            playSound('click');
            vibrate(10);
            if (selectedForCompare.some(i => i.id === event.id)) {
                setSelectedForCompare(prev => prev.filter(i => i.id !== event.id));
            } else if (selectedForCompare.length < 2) {
                setSelectedForCompare(prev => [...prev, event]);
            }
            return;
        }
        playSound('click');
        onItemClick(event);
    };

    const toggleCompareMode = () => {
        setIsCompareMode(!isCompareMode);
        setSelectedForCompare([]);
        playSound(isCompareMode ? 'click' : 'open');
        vibrate(20);
    };

    const sortedAndFilteredInventory = useMemo(() => {
        // 1. STACKING LOGIC
        const stackedMap = new Map<string, StackedGameEvent>();

        // Zde jsme dříve filtrovali PLANET. Nyní zobrazujeme vše.
        const visibleInventory = inventory;

        visibleInventory.forEach(item => {
            const isResource = !!item.resourceConfig?.isResourceContainer;
            const groupKey = isResource 
                ? `RES-${item.resourceConfig!.resourceName}`
                : `ITEM-${item.title}-${item.type}-${item.rarity}`;

            if (stackedMap.has(groupKey)) {
                const existing = stackedMap.get(groupKey)!;
                if (isResource) {
                    existing.resourceConfig!.resourceAmount += item.resourceConfig!.resourceAmount;
                } else {
                    existing._stackQty += 1;
                }
            } else {
                const clone: StackedGameEvent = { 
                    ...item, 
                    _stackQty: 1, 
                    _virtualStack: true,
                    resourceConfig: item.resourceConfig ? { ...item.resourceConfig } : undefined
                };
                stackedMap.set(groupKey, clone);
            }
        });

        let result = Array.from(stackedMap.values());
        
        // 2. FILTERING
        if (selectedCategory === 'RESOURCES') {
            result = result.filter(i => i.resourceConfig?.isResourceContainer);
        } else if (selectedCategory === 'ITEMS') {
            result = result.filter(i => (i.type === GameEventType.ITEM || i.type === 'PŘEDMĚT' as GameEventType) && !i.resourceConfig?.isResourceContainer);
        } else if (selectedCategory === 'OTHERS') {
            // Přidáme PLANET do kategorie Ostatní
            const otherTypes = [GameEventType.ENCOUNTER, GameEventType.TRAP, GameEventType.DILEMA, GameEventType.BOSS, GameEventType.SPACE_STATION, GameEventType.PLANET];
            result = result.filter(i => otherTypes.includes(i.type));
        }

        // 3. SORTING
        if (sortMode === 'RARITY') {
            const power: Record<string, number> = { 'legendary': 3, 'epic': 2, 'rare': 1, 'common': 0 };
            result.sort((a, b) => {
                const rarityA = (a.rarity || 'Common').toLowerCase();
                const rarityB = (b.rarity || 'Common').toLowerCase();
                return (power[rarityB] || 0) - (power[rarityA] || 0);
            });
        } else if (sortMode === 'SPECIALIZATION' && playerClass) {
            result.sort((a, b) => {
                const aHasClass = a.classVariants && a.classVariants[playerClass] ? 1 : 0;
                const bHasClass = b.classVariants && b.classVariants[playerClass] ? 1 : 0;
                return bHasClass - aHasClass;
            });
        } else {
            result.sort((a, b) => {
                const aRes = a.resourceConfig?.isResourceContainer ? 1 : 0;
                const bRes = b.resourceConfig?.isResourceContainer ? 1 : 0;
                if (aRes !== bRes) return bRes - aRes; 
                return 0; 
            });
            result.reverse(); 
        }
        return result;
    }, [inventory, selectedCategory, sortMode, playerClass]);

    const sortOptions = [
        { id: 'DEFAULT', label: 'VÝCHOZÍ', icon: ArrowDownAZ },
        { id: 'RARITY', label: 'VZÁCNOST', icon: Star },
        { id: 'SPECIALIZATION', label: 'TŘÍDA', icon: Target },
    ];

    const filterOptions = [
        { id: 'ALL', label: 'VŠE', icon: Layers },
        { id: 'RESOURCES', label: 'SUROVINY', icon: Hammer },
        { id: 'ITEMS', label: 'VYBAVENÍ', icon: Box },
        { id: 'OTHERS', label: 'OSTATNÍ', icon: Filter },
    ];

    // --- RENDER COMPARISON MODAL ---
    const renderComparisonOverlay = () => {
        if (selectedForCompare.length !== 2) return null;
        const [itemA, itemB] = selectedForCompare;
        
        const allStatLabels = Array.from(new Set([
            ...(itemA.stats || []).map(s => s.label),
            ...(itemB.stats || []).map(s => s.label)
        ]));

        const parseVal = (v: string | number) => {
            const n = parseInt(String(v).replace(/[^0-9-]/g, ''));
            return isNaN(n) ? 0 : n;
        };

        return (
            <motion.div {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)} className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl p-6 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black uppercase text-signal-cyan chromatic-text">Taktické Srovnání</h2>
                        <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Analýza_Assetů_v1.0</p>
                    </div>
                    <button onClick={() => setSelectedForCompare([])} className="p-3 bg-white/5 rounded-full text-zinc-400 hover:text-white"><X className="w-6 h-6"/></button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        {[itemA, itemB].map((item, idx) => {
                            const config = getRarityConfig(item.rarity, item.type);
                            return (
                                <div key={idx} className={`p-4 tactical-card bg-white/5 border-t-4 ${config.border}`}>
                                    <div className={`mb-2 ${config.text}`}>{getEventIcon(item.type, !!item.resourceConfig?.isResourceContainer)}</div>
                                    <h3 className="text-xs font-black uppercase text-white truncate leading-tight">{item.title}</h3>
                                    <p className="text-[8px] text-zinc-500 font-mono mt-1">{config.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/10 pb-2">
                            <Zap className="w-3 h-3" /> Parametry_Modulů
                        </div>
                        
                        {allStatLabels.map(label => {
                            const valA = itemA.stats?.find(s => s.label === label)?.value || '---';
                            const valB = itemB.stats?.find(s => s.label === label)?.value || '---';
                            const numA = parseVal(valA);
                            const numB = parseVal(valB);

                            return (
                                <div key={label} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                                    <div className="text-center mb-2">
                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 relative">
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-white/10" />
                                        <div className={`text-center font-mono font-black text-lg ${numA > numB ? 'text-signal-cyan' : numA < numB ? 'text-zinc-600' : 'text-white'}`}>
                                            {valA}
                                            {numA > numB && <div className="text-[8px] text-signal-cyan/50 mt-1">▲ LEPŠÍ</div>}
                                        </div>
                                        <div className={`text-center font-mono font-black text-lg ${numB > numA ? 'text-signal-cyan' : numB < numA ? 'text-zinc-600' : 'text-white'}`}>
                                            {valB}
                                            {numB > numA && <div className="text-[8px] text-signal-cyan/50 mt-1">▲ LEPŠÍ</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button onClick={() => setSelectedForCompare([])} className="w-full py-5 bg-signal-cyan text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl mt-6 shadow-[0_0_30px_rgba(0,242,255,0.2)]">
                    Ukončit_Analýzu
                </button>
            </motion.div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col p-6 bg-[#0a0b0d] overflow-hidden relative">
            {/* Background Dots */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0" 
                 style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-20">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white font-sans chromatic-text leading-none">MŮJ BATOH</h2>
                    <div className="flex items-center gap-3 mt-1.5">
                        {isTestMode ? (
                            <>
                                <FlaskConical className="w-4 h-4 text-orange-500 animate-pulse" />
                                <span className="text-[10px] text-orange-500 font-mono font-bold uppercase tracking-[0.4em]">TESTOVACÍ_PROFIL</span>
                            </>
                        ) : (
                            <>
                                <Database className="w-4 h-4 text-signal-cyan/50" />
                                <span className="text-[10px] text-white/40 font-mono font-bold uppercase tracking-[0.4em]">Osobní_Zásoby</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={toggleCompareMode}
                        className={`p-3 tactical-card transition-all active:scale-90 border-2 ${isCompareMode ? 'bg-signal-cyan border-signal-cyan text-black' : 'bg-white/5 border-white/10 text-signal-cyan'}`}
                        title="Srovnání Assetů"
                    >
                        <ArrowLeftRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => onRefresh()} disabled={isRefreshing} className="p-3 tactical-card bg-white/5 border-white/10 hover:border-signal-cyan transition-all active:scale-90 disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 text-signal-cyan ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Warning Banner for Test Mode */}
            {isTestMode && (
                <div className="mb-4 bg-orange-950/30 border border-orange-500/50 p-2 rounded text-center relative z-20">
                    <p className="text-[9px] text-orange-500 font-bold uppercase tracking-widest">
                        POZOR: Operujete v testovacím trezoru. Data zde neovlivňují Master Databázi.
                    </p>
                </div>
            )}

            {isCompareMode && (
                <motion.div {...({ initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } } as any)} className="mb-4 p-3 bg-signal-cyan/10 border border-signal-cyan/30 rounded-xl flex items-center justify-between relative z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-signal-cyan rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-signal-cyan uppercase tracking-widest">
                            {selectedForCompare.length === 0 ? 'Vyberte první asset...' : 
                             selectedForCompare.length === 1 ? 'Vyberte druhý asset z Batohu' : 'Analýza připravena'}
                        </span>
                    </div>
                    {selectedForCompare.length > 0 && (
                        <button onClick={() => setSelectedForCompare([])} className="text-[9px] font-black text-zinc-500 uppercase underline">Reset</button>
                    )}
                </motion.div>
            )}

            {/* FILTER CATEGORIES */}
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1 relative z-20">
                {filterOptions.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => {
                            setSelectedCategory(opt.id as FilterCategory);
                            playSound('click');
                        }}
                        className={`px-4 py-2.5 rounded-lg flex items-center gap-2 border transition-all whitespace-nowrap ${
                            selectedCategory === opt.id
                            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:border-white/30'
                        }`}
                    >
                        <opt.icon className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                    </button>
                ))}
            </div>

            {/* SORT OPTIONS */}
            <div className="flex gap-2 mb-4 relative z-20">
                {sortOptions.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => {
                            setSortMode(opt.id as SortMode);
                            playSound('click');
                        }}
                        className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 border rounded transition-all ${
                            sortMode === opt.id 
                            ? 'bg-signal-cyan/20 border-signal-cyan text-signal-cyan shadow-[0_0_10px_rgba(0,242,255,0.2)]' 
                            : 'bg-white/5 border-white/10 text-white/40'
                        }`}
                    >
                        <opt.icon className="w-3.5 h-3.5" />
                        <span className="text-[7px] font-black uppercase tracking-widest">{opt.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pb-24 no-scrollbar relative z-10">
                {loadingInventory ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-signal-cyan" />
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Prohledávám Batoh...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {sortedAndFilteredInventory.length === 0 ? (
                            <div className="col-span-2 flex flex-col items-center justify-center py-10 opacity-50">
                                <Box className="w-12 h-12 text-zinc-600 mb-2" />
                                <span className="text-xs font-mono uppercase text-zinc-500 font-bold">Kategorie je prázdná</span>
                            </div>
                        ) : (
                            sortedAndFilteredInventory.map((item) => {
                                const isResource = !!item.resourceConfig?.isResourceContainer;
                                const config = isResource 
                                    ? { border: 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]', text: 'text-orange-500', label: 'SUROVINA' }
                                    : getRarityConfig(item.rarity, item.type);
                                
                                const isSelected = selectedForCompare.some(i => i.id === item.id);
                                const stackedItem = item as StackedGameEvent;
                                
                                return (
                                    <motion.div 
                                        key={item.id} 
                                        onClick={() => handleCardClick(item)}
                                        {...({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } } as any)}
                                        className={`tactical-card h-48 flex flex-col justify-between p-4 bg-black/40 border-t-2 ${config.border} active:scale-95 transition-transform group relative ${isSelected ? 'scale-90 border-2 border-signal-cyan ring-4 ring-signal-cyan/20' : ''} ${isResource ? 'bg-orange-950/10' : ''}`}
                                    >
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-signal-cyan/10 flex items-center justify-center z-10">
                                                <div className="bg-signal-cyan text-black p-2 rounded-full shadow-[0_0_20px_#00f2ff]">
                                                    <ArrowLeftRight className="w-6 h-6" />
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between items-start">
                                            <div className={`${config.text}`}>{getEventIcon(item.type, isResource)}</div>
                                            
                                            {isResource && (
                                                <div className="text-xs font-mono font-bold text-orange-500 bg-orange-950/50 px-2 py-0.5 rounded border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                                                    x{item.resourceConfig?.resourceAmount || 1}
                                                </div>
                                            )}

                                            {!isResource && stackedItem._stackQty > 1 && (
                                                <div className="flex items-center gap-1 text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)] border border-red-400">
                                                    <Copy className="w-3 h-3" />
                                                    <span>x{stackedItem._stackQty}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-[10px] uppercase line-clamp-2 transition-colors ${isResource ? 'text-orange-100 group-hover:text-orange-400' : 'text-white group-hover:text-signal-cyan'}`}>{item.title}</h3>
                                            <p className="text-[8px] text-zinc-500 font-mono mt-1">{config.label}</p>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {renderComparisonOverlay()}
            </AnimatePresence>
        </div>
    );
};

export default InventoryView;

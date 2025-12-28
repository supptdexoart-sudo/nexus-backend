

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEvent, PlayerClass } from '../types';
import {
    Coins, X, ShoppingCart, Recycle, Hammer,
    Package, AlertTriangle, Search, Filter, ArrowRight,
    Trash2, DollarSign, Activity, Shield, Heart, Swords
} from 'lucide-react';
import { playSound, vibrate } from '../services/soundService';

interface StationMarketProps {
    onClose: () => void;
    masterCatalog: GameEvent[];
    inventory: GameEvent[];
    playerGold: number;
    playerClass: PlayerClass | null;
    onBuy: (item: GameEvent, price: number) => void;
    onRecycle: (itemToRecycle: GameEvent, rewards: { resource: GameEvent, amount: number }[]) => void;
}

const StationMarket: React.FC<StationMarketProps> = ({
    onClose, masterCatalog, inventory, playerGold, playerClass, onBuy, onRecycle
}) => {
    const [mode, setMode] = useState<'BUY' | 'RECYCLE'>('BUY');
    const [selectedItem, setSelectedItem] = useState<GameEvent | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [filterType, setFilterType] = useState<string>('ALL');

    useEffect(() => {
        playSound('open');
    }, []);

    // --- LOGIC ---

    // 1. Calculate Sale Rolls ONCE per catalog load
    const saleRolls = useMemo(() => {
        const rolls: Record<string, boolean> = {};
        masterCatalog.forEach(item => {
            if (item.marketConfig?.saleChance) {
                const roll = Math.random() * 100;
                rolls[item.id] = roll <= item.marketConfig.saleChance;
            }
        });
        return rolls;
    }, [masterCatalog]);

    const itemsForSale = useMemo(() => {
        let items = masterCatalog.filter(item => item.marketConfig?.enabled);
        if (filterType !== 'ALL') {
            items = items.filter(i => i.type === filterType);
        }
        return items;
    }, [masterCatalog, filterType]);

    const recyclableItems = useMemo(() => {
        return inventory.filter(item =>
            item.marketConfig?.recyclingOutput && item.marketConfig.recyclingOutput.length > 0
        );
    }, [inventory]);

    const getPriceInfo = (item: GameEvent) => {
        // 1. Base Price (Tržní hodnota z karty)
        const standardPrice = item.price ?? 100;

        let currentPrice = standardPrice;
        let discountLabel = null;

        // 2. Sale Event Logic (Chance %)
        const isOnSale = saleRolls[item.id] || false;

        if (isOnSale) {
            // If sale is active, use Override Price from Market Config if set
            if (item.marketConfig?.marketPrice && item.marketConfig.marketPrice > 0) {
                currentPrice = item.marketConfig.marketPrice;
            } else {
                // Fallback: If no override set but sale triggered, give 30% off
                currentPrice = Math.floor(standardPrice * 0.7);
            }
        }

        // 3. Class Modifiers (Multipliers on top of current price)
        if (playerClass && item.marketConfig?.classModifiers) {
            const mod = item.marketConfig.classModifiers.find(m => m.playerClass === playerClass);
            if (mod) {
                currentPrice = Math.floor(currentPrice * mod.priceMultiplier);
                if (mod.priceMultiplier < 1) discountLabel = `BONUS: ${playerClass} `;
                else if (mod.priceMultiplier > 1) discountLabel = `PŘIRÁŽKA: ${playerClass} `;
            }
        }

        // Ensure price is at least 1
        const finalPrice = Math.max(1, currentPrice);

        return { finalPrice, basePrice: standardPrice, discountLabel, isOnSale };
    };

    const getRecycleRewards = (item: GameEvent) => {
        if (!item.marketConfig?.recyclingOutput) return [];
        return item.marketConfig.recyclingOutput.map(out => {
            const resourceTemplate = masterCatalog.find(
                i => (i.resourceConfig?.isResourceContainer && i.resourceConfig.resourceName === out.resourceName) || i.title === out.resourceName
            );
            if (!resourceTemplate) return null;
            return { resource: resourceTemplate, amount: out.amount };
        }).filter((r): r is { resource: GameEvent, amount: number } => r !== null);
    };

    const handleTransaction = () => {
        if (!selectedItem || isProcessing) return;

        setIsProcessing(true);
        if (mode === 'BUY') {
            const { finalPrice } = getPriceInfo(selectedItem);
            if (playerGold < finalPrice) {
                playSound('error'); setIsProcessing(false); return;
            }
            playSound('success'); vibrate([50, 50]);
            setTimeout(() => {
                onBuy(selectedItem, finalPrice);
                setIsProcessing(false);
                setSelectedItem(null);
            }, 1000);
        } else {
            const rewards = getRecycleRewards(selectedItem);
            playSound('damage'); vibrate([100, 50, 200]);
            setTimeout(() => {
                onRecycle(selectedItem, rewards);
                setIsProcessing(false);
                setSelectedItem(null);
                playSound('success');
            }, 1500);
        }
    };

    const getStatIcon = (label: string) => {
        const l = label.toUpperCase();
        if (l.includes('HP') || l.includes('ZDRAVÍ')) return <Heart className="w-3 h-3 text-red-500" />;
        if (l.includes('DMG') || l.includes('ÚTOK')) return <Swords className="w-3 h-3 text-orange-500" />;
        if (l.includes('DEF') || l.includes('OBRANA')) return <Shield className="w-3 h-3 text-slate-300" />;
        return <Activity className="w-3 h-3 text-zinc-400" />;
    };

    // Color Theme: Yellow/Amber for Commerce
    const themeColor = 'text-yellow-500';
    const borderColor = 'border-yellow-500/30';
    const bgColor = 'bg-yellow-950/20';

    return (
        <div className="fixed inset-0 z-[250] bg-zinc-950 text-white flex flex-col font-sans overflow-hidden">

            {/* --- HEADER --- */}
            <header className={`bg - zinc - 900 border - b ${borderColor} p - 4 flex justify - between items - center relative overflow - hidden`}>
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, #eab308 10px, #eab308 20px)' }}>
                </div>

                <div className={`flex items - center gap - 3 relative z - 10 ${themeColor} `}>
                    <div className={`p - 2 ${bgColor} border ${borderColor} rounded`}>
                        <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-widest leading-none text-white">Obchodní Terminál</h1>
                        <p className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-400">SEKTOR MARKET_V2</p>
                    </div>
                </div>

                <button onClick={onClose} className="p-2 relative z-10 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors">
                    <X className="w-6 h-6 text-zinc-400" />
                </button>
            </header>

            {/* --- TOP BAR (Stats & Tabs) --- */}
            <div className="flex flex-col border-b border-zinc-800">
                <div className="flex items-center justify-between p-4 bg-zinc-900/50">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black border border-yellow-500/30 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        <span className="text-xl font-mono font-bold text-white">{playerGold}</span>
                    </div>

                    <div className="flex bg-black rounded-lg p-1 border border-zinc-800">
                        <button
                            onClick={() => { setMode('BUY'); playSound('click'); }}
                            className={`px - 6 py - 2 rounded - md text - xs font - bold uppercase tracking - wider transition - all ${mode === 'BUY' ? 'bg-yellow-600 text-black shadow-lg' : 'text-zinc-500 hover:text-white'} `}
                        >
                            Nákup
                        </button>
                        <button
                            onClick={() => { setMode('RECYCLE'); playSound('click'); }}
                            className={`px - 6 py - 2 rounded - md text - xs font - bold uppercase tracking - wider transition - all ${mode === 'RECYCLE' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'} `}
                        >
                            Drtička
                        </button>
                    </div>
                </div>

                {/* Filter Bar (Only for Buy Mode) */}
                {mode === 'BUY' && (
                    <div className="flex gap-2 p-2 px-4 bg-black overflow-x-auto no-scrollbar border-b border-zinc-800">
                        <Filter className="w-4 h-4 text-zinc-600 my-auto mr-2" />
                        {['ALL', 'PŘEDMĚT', 'SUROVINA'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterType(f)}
                                className={`px - 3 py - 1 rounded text - [10px] font - bold uppercase border transition - colors whitespace - nowrap ${filterType === f ? 'border-yellow-500 text-yellow-500 bg-yellow-950/20' : 'border-zinc-800 text-zinc-500'} `}
                            >
                                {f === 'ALL' ? 'Vše' : f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* --- MAIN CONTENT (GRID) --- */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 relative">

                {mode === 'BUY' ? (
                    itemsForSale.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30">
                            <ShoppingCart className="w-16 h-16 mb-4 text-zinc-500" />
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sklad vyprodán</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {itemsForSale.map(item => {
                                const { finalPrice, basePrice, discountLabel, isOnSale } = getPriceInfo(item);
                                const canAfford = playerGold >= finalPrice;
                                const isDiscounted = finalPrice < basePrice;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => { setSelectedItem(item); playSound('click'); }}
                                        className={`relative flex flex - col text - left p - 3 rounded - xl border transition - all active: scale - 95 group ${canAfford ? 'bg-zinc-900 border-zinc-800 hover:border-yellow-500/50' : 'bg-zinc-900/50 border-red-900/30 opacity-70'} `}
                                    >
                                        {isOnSale && (
                                            <div className="absolute top-2 right-2 bg-pink-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse shadow-[0_0_10px_#db2777]">
                                                AKCE
                                            </div>
                                        )}

                                        <div className="mb-2 p-3 bg-black rounded-lg border border-zinc-800 self-start group-hover:border-yellow-500/30 transition-colors">
                                            <Package className={`w - 6 h - 6 ${canAfford ? 'text-zinc-200' : 'text-red-900'} `} />
                                        </div>

                                        <div className="flex-1 w-full">
                                            <h4 className="text-xs font-bold text-white uppercase line-clamp-1 mb-1">{item.title}</h4>

                                            {/* STATS DISPLAY IN GRID */}
                                            {item.stats && item.stats.length > 0 && (
                                                <div className="grid grid-cols-1 gap-1 mb-2">
                                                    {item.stats.slice(0, 3).map((stat, i) => (
                                                        <div key={i} className="flex items-center justify-between text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                            <span className="text-zinc-400 font-bold uppercase flex items-center gap-1">
                                                                {getStatIcon(stat.label)} {stat.label.substring(0, 3)}
                                                            </span>
                                                            <span className="text-white font-mono font-bold">{stat.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-2 border-t border-zinc-800 w-full">
                                            {discountLabel && <span className="text-[8px] text-green-500 font-bold uppercase block mb-1">{discountLabel}</span>}

                                            <div className="flex items-end justify-between">
                                                <div className={`flex items - center gap - 1 font - mono font - bold ${canAfford ? 'text-yellow-500' : 'text-red-500'} `}>
                                                    <span>{finalPrice}</span>
                                                    <Coins className="w-3 h-3" />
                                                </div>

                                                {/* Original Price (Crossed Out) */}
                                                {isDiscounted && (
                                                    <span className="text-[9px] text-zinc-600 line-through decoration-red-500 font-mono">
                                                        {basePrice}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )
                ) : (
                    // RECYCLE MODE (Unchanged)
                    <div className="space-y-3">
                        <div className="p-3 bg-orange-900/10 border border-orange-500/20 rounded-lg flex items-center gap-3 mb-4">
                            <Recycle className="w-5 h-5 text-orange-500" />
                            <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                                Vložte nepotřebné předměty do drtičky a získejte suroviny pro výrobu.
                            </p>
                        </div>

                        {recyclableItems.length === 0 ? (
                            <div className="text-center py-10 opacity-30">
                                <Search className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-xs font-bold uppercase">Žádný recyklovatelný odpad</p>
                            </div>
                        ) : (
                            recyclableItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => { setSelectedItem(item); playSound('click'); }}
                                    className="w-full flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 rounded-xl transition-all active:scale-95 group text-left"
                                >
                                    <div className="p-2 bg-black border border-zinc-700 rounded text-zinc-500 group-hover:text-orange-500 transition-colors">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-white uppercase">{item.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {getRecycleRewards(item).map((rew, i) => (
                                                <span key={i} className="text-[9px] bg-orange-950/30 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">
                                                    +{rew.amount} {rew.resource.title}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-orange-500" />
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* --- DETAIL / CONFIRMATION MODAL --- */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className={`bg - zinc - 900 border w - full max - w - sm rounded - 2xl p - 6 relative shadow - 2xl flex flex - col ${mode === 'BUY' ? 'border-yellow-500/50' : 'border-orange-500/50'} `}
                        >
                            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>

                            <div className="flex flex-col items-center text-center mb-6">
                                <div className={`w - 20 h - 20 bg - black border - 2 rounded - xl flex items - center justify - center mb - 4 ${mode === 'BUY' ? 'border-yellow-500/30 text-yellow-500' : 'border-orange-500/30 text-orange-500'} `}>
                                    {mode === 'BUY' ? <Package className="w-10 h-10" /> : <Trash2 className="w-10 h-10" />}
                                </div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-1">{selectedItem.title}</h2>
                                <p className="text-[10px] font-mono text-zinc-500 uppercase">{selectedItem.type}</p>
                            </div>

                            {/* Details based on mode */}
                            {mode === 'BUY' ? (
                                <div className="space-y-4">
                                    {/* Stats Detail */}
                                    {selectedItem.stats && selectedItem.stats.length > 0 && (
                                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 mb-2">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2 flex items-center gap-1"><Activity className="w-3 h-3" /> Statistiky Assetu</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedItem.stats.map((stat, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-black px-2 py-1 rounded">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                                                            {getStatIcon(stat.label)} {stat.label}
                                                        </span>
                                                        <span className="text-xs font-mono font-bold text-white">{stat.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-zinc-400 uppercase">Cena</span>
                                            {getPriceInfo(selectedItem).finalPrice < getPriceInfo(selectedItem).basePrice && (
                                                <span className="text-[10px] text-zinc-600 line-through decoration-red-500 font-mono">
                                                    {getPriceInfo(selectedItem).basePrice} GOLD
                                                </span>
                                            )}
                                        </div>
                                        <div className={`flex items - center gap - 2 text - xl font - mono font - black ${playerGold >= getPriceInfo(selectedItem).finalPrice ? 'text-yellow-500' : 'text-red-500'} `}>
                                            {getPriceInfo(selectedItem).finalPrice} <Coins className="w-5 h-5" />
                                        </div>
                                    </div>
                                    {playerGold < getPriceInfo(selectedItem).finalPrice && (
                                        <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase justify-center bg-red-950/20 p-2 rounded">
                                            <AlertTriangle className="w-3 h-3" /> Nedostatek prostředků
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2 mb-4">
                                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-2 border-b border-orange-500/20 pb-1">Získáte suroviny:</p>
                                    {getRecycleRewards(selectedItem).map((rew, i) => (
                                        <div key={i} className="flex justify-between items-center bg-orange-900/10 p-2 rounded border border-orange-500/20">
                                            <span className="text-xs text-zinc-300 font-mono">{rew.resource.title}</span>
                                            <span className="text-sm font-black text-white">x{rew.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={handleTransaction}
                                disabled={isProcessing || (mode === 'BUY' && playerGold < getPriceInfo(selectedItem).finalPrice)}
                                className={`w - full py - 4 mt - 6 font - black uppercase text - xs tracking - [0.2em] rounded - xl flex items - center justify - center gap - 2 transition - all ${isProcessing
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : mode === 'BUY'
                                            ? (playerGold >= getPriceInfo(selectedItem).finalPrice ? 'bg-yellow-600 hover:bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')
                                            : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    } `}
                            >
                                {isProcessing ? (
                                    <span className="animate-pulse">Zpracování...</span>
                                ) : mode === 'BUY' ? (
                                    <>
                                        {playerGold >= getPriceInfo(selectedItem).finalPrice ? 'POTVRDIT NÁKUP' : 'NEDOSTATEK KREDITŮ'}
                                        <DollarSign className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        ROZEMLÍT PŘEDMĚT <Hammer className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default StationMarket;

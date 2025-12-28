
import React, { useState } from 'react';
import { GameEvent, Stat, PlayerClass } from '../../types';
import { Box, Heart, Swords, Shield, Coins, Wind, Trash2, Fuel, Hammer, Scroll, Plus, Clock, ShoppingCart, Recycle, Users, Tags, X, Ban, Settings, Check } from 'lucide-react';

interface ItemPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
    masterCatalog?: GameEvent[];
}

const ItemPanel: React.FC<ItemPanelProps> = ({ event, onUpdate, masterCatalog = [] }) => {

    // Local state for adding ingredients
    const [selectedIngredient, setSelectedIngredient] = useState('');
    const [ingredientAmount, setIngredientAmount] = useState(1);

    // Local state for recycling output
    const [selectedRecycleRes, setSelectedRecycleRes] = useState('');
    const [recycleAmount, setRecycleAmount] = useState(1);

    // Local state for market class deal
    const [selectedMarketClass, setSelectedMarketClass] = useState<PlayerClass | ''>('');
    const [classPriceMultiplier, setClassPriceMultiplier] = useState(0.8);

    const addQuickStat = (label: string, value: string = '+10') => {
        const currentStats = [...(event.stats || [])];
        if (currentStats.some(s => s.label.toUpperCase() === label.toUpperCase())) return;
        onUpdate({ stats: [...currentStats, { label, value }] });
    };

    const updateStat = (idx: number, field: keyof Stat, value: string) => {
        const newStats = [...(event.stats || [])];
        newStats[idx] = { ...newStats[idx], [field]: value };
        onUpdate({ stats: newStats });
    };

    const removeStat = (idx: number) => {
        onUpdate({ stats: (event.stats || []).filter((_, i) => i !== idx) });
    };

    const updateResourceConfig = (field: string, value: any) => {
        onUpdate({
            resourceConfig: {
                ...(event.resourceConfig || {
                    isResourceContainer: false,
                    resourceName: 'Kovový šrot',
                    resourceAmount: 1
                }),
                [field]: value
            }
        });
    };

    const updateCraftingConfig = (field: string, value: any) => {
        onUpdate({
            craftingRecipe: {
                ...(event.craftingRecipe || {
                    enabled: false,
                    requiredResources: [],
                    craftingTimeSeconds: 60
                }),
                [field]: value
            }
        });
    };

    const updateMarketConfig = (field: string, value: any) => {
        onUpdate({
            marketConfig: {
                ...(event.marketConfig || {
                    enabled: false,
                    marketPrice: undefined,
                    saleChance: 0,
                    classModifiers: [],
                    recyclingOutput: []
                }),
                [field]: value
            }
        });
    };

    const addIngredient = () => {
        if (!selectedIngredient) return;
        const currentIngredients = event.craftingRecipe?.requiredResources || [];
        if (currentIngredients.some(i => i.resourceName === selectedIngredient)) return;

        updateCraftingConfig('requiredResources', [
            ...currentIngredients,
            { resourceName: selectedIngredient, amount: ingredientAmount }
        ]);
        setIngredientAmount(1);
    };

    const removeIngredient = (index: number) => {
        const currentIngredients = event.craftingRecipe?.requiredResources || [];
        updateCraftingConfig('requiredResources', currentIngredients.filter((_, i) => i !== index));
    };

    // MARKET HELPERS
    const addRecycleOutput = () => {
        if (!selectedRecycleRes) return;
        const currentRecycling = event.marketConfig?.recyclingOutput || [];
        if (currentRecycling.some(r => r.resourceName === selectedRecycleRes)) return;

        updateMarketConfig('recyclingOutput', [
            ...currentRecycling,
            { resourceName: selectedRecycleRes, amount: recycleAmount }
        ]);
        setRecycleAmount(1);
    };

    const removeRecycleOutput = (index: number) => {
        const currentRecycling = event.marketConfig?.recyclingOutput || [];
        updateMarketConfig('recyclingOutput', currentRecycling.filter((_, i) => i !== index));
    };

    const addClassModifier = () => {
        if (!selectedMarketClass) return;
        const currentModifiers = event.marketConfig?.classModifiers || [];
        if (currentModifiers.some(m => m.playerClass === selectedMarketClass)) return;

        updateMarketConfig('classModifiers', [
            ...currentModifiers,
            { playerClass: selectedMarketClass, priceMultiplier: classPriceMultiplier }
        ]);
        setSelectedMarketClass('');
        setClassPriceMultiplier(0.8);
    };

    const removeClassModifier = (index: number) => {
        const currentModifiers = event.marketConfig?.classModifiers || [];
        updateMarketConfig('classModifiers', currentModifiers.filter((_, i) => i !== index));
    };

    const availableResources = masterCatalog.filter(
        item => item.resourceConfig?.isResourceContainer
    );

    const quickOptions = [
        { label: 'HP', icon: Heart, color: 'text-red-500' },
        { label: 'DMG', icon: Swords, color: 'text-orange-500' },
        { label: 'ARMOR', icon: Shield, color: 'text-zinc-200' },
        { label: 'PALIVO', icon: Fuel, color: 'text-orange-500' },
        { label: 'ZLATO', icon: Coins, color: 'text-yellow-500' },
        { label: 'KYSLÍK', icon: Wind, color: 'text-cyan-400' },
    ];

    return (
        <div className="space-y-6 bg-black border border-white/10 p-6 relative shadow-lg">
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                <Settings className="w-32 h-32 text-white" />
            </div>

            {/* HEADER */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
                <div className="p-2 bg-arc-cyan/10 border border-arc-cyan/30">
                    <Box className="w-5 h-5 text-arc-cyan" />
                </div>
                <div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-0.5">KONFIGURAČNÍ_PANEL</span>
                    <h3 className="text-xl font-display font-black uppercase tracking-wider text-white">Parametry Majetku</h3>
                </div>
            </div>

            {/* Consumable & Sell Only Checkboxes - ARC STYLE */}
            <div className="grid grid-cols-2 gap-4">
                <label className={`relative group cursor-pointer border p-4 transition-all ${event.isConsumable ? 'bg-arc-yellow/10 border-arc-yellow/50' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${event.isConsumable ? 'bg-arc-yellow border-arc-yellow text-black' : 'border-zinc-600'}`}>
                            {event.isConsumable && <Check className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${event.isConsumable ? 'text-arc-yellow' : 'text-zinc-400'}`}>SPOTŘEBNÍ</span>
                            <span className="text-[8px] font-mono text-zinc-600 uppercase">Předmět na jedno použití</span>
                        </div>
                    </div>
                    <input type="checkbox" checked={event.isConsumable} onChange={(e) => onUpdate({ isConsumable: e.target.checked })} className="hidden" />
                </label>

                <label className={`relative group cursor-pointer border p-4 transition-all ${event.isSellOnly ? 'bg-red-500/10 border-red-500/50' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${event.isSellOnly ? 'bg-red-500 border-red-500 text-black' : 'border-zinc-600'}`}>
                            {event.isSellOnly && <Ban className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${event.isSellOnly ? 'text-red-500' : 'text-zinc-400'}`}>POUZE_K_PRODEJI</span>
                            <span className="text-[8px] font-mono text-zinc-600 uppercase">Nemá žádné funkční využití</span>
                        </div>
                    </div>
                    <input type="checkbox" checked={event.isSellOnly} onChange={(e) => onUpdate({ isSellOnly: e.target.checked })} className="hidden" />
                </label>
            </div>

            {/* PRICE CONFIG */}
            <div className="bg-arc-panel/30 border border-white/5 p-4 relative group hover:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-arc-yellow/50"></div>
                <div className="flex items-center gap-2 mb-3 text-arc-yellow">
                    <Coins className="w-4 h-4" />
                    <label className="text-[10px] font-black uppercase tracking-widest">TRŽNÍ_HODNOTA</label>
                </div>
                <div className="relative">
                    <input
                        type="number"
                        value={event.price || 0}
                        onChange={(e) => onUpdate({ price: parseInt(e.target.value) })}
                        className="w-full bg-black border border-zinc-800 p-3 text-white font-mono text-lg font-bold outline-none focus:border-arc-yellow transition-all"
                    />
                    <span className="absolute right-4 top-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest pointer-events-none">KREDITY</span>
                </div>
            </div>

            {/* MARKET & RECYCLING CONFIG */}
            <div className={`border p-4 transition-all duration-300 ${event.marketConfig?.enabled ? 'bg-indigo-950/10 border-indigo-500/30' : 'bg-black border-zinc-800'}`}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className={`w-4 h-4 ${event.marketConfig?.enabled ? 'text-indigo-400' : 'text-zinc-600'}`} />
                        <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${event.marketConfig?.enabled ? 'text-indigo-400' : 'text-zinc-600'}`}>TRŽNÍ_MODUL</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={event.marketConfig?.enabled || false} onChange={(e) => updateMarketConfig('enabled', e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                {event.marketConfig?.enabled && (
                    <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2">

                        {/* 1. Market Specifics */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] text-indigo-400/70 uppercase font-bold tracking-widest mb-2 block">Přebití pevné ceny</label>
                                <input
                                    type="number"
                                    placeholder="VÝCHOZÍ"
                                    value={event.marketConfig.marketPrice || ''}
                                    onChange={(e) => updateMarketConfig('marketPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="w-full bg-black border border-indigo-500/30 p-2 text-white text-xs font-mono outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-indigo-400/70 uppercase font-bold tracking-widest mb-2 flex items-center gap-1"><Tags className="w-3 h-3" /> Šance na slevu</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={event.marketConfig.saleChance || 0}
                                        onChange={(e) => updateMarketConfig('saleChance', parseInt(e.target.value))}
                                        className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <span className="text-indigo-400 font-mono text-xs w-8 text-right">{event.marketConfig.saleChance || 0}%</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Class Modifiers */}
                        <div className="bg-black/40 p-4 border border-indigo-500/20 relative">
                            <label className="text-[9px] text-indigo-400 uppercase font-bold tracking-widest mb-3 flex items-center gap-2"><Users className="w-3 h-3" /> Úpravy tříd</label>

                            <div className="flex gap-0 mb-4 items-center border border-zinc-700">
                                <select
                                    value={selectedMarketClass}
                                    onChange={(e) => setSelectedMarketClass(e.target.value as PlayerClass)}
                                    className="flex-[2] bg-black text-zinc-300 text-xs font-mono p-2 outline-none border-r border-zinc-700"
                                >
                                    <option value="">-- VYBERTE TŘÍDU --</option>
                                    {Object.values(PlayerClass).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select
                                    value={classPriceMultiplier}
                                    onChange={(e) => setClassPriceMultiplier(parseFloat(e.target.value))}
                                    className="flex-1 bg-black text-zinc-300 text-xs font-mono p-2 outline-none border-r border-zinc-700"
                                >
                                    <option value={0.5}>-50% (SALE)</option>
                                    <option value={0.8}>-20% (SALE)</option>
                                    <option value={1.2}>+20% (MARKUP)</option>
                                    <option value={1.5}>+50% (MARKUP)</option>
                                </select>
                                <button type="button" onClick={addClassModifier} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {event.marketConfig.classModifiers?.map((mod, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-indigo-900/20 pl-2 pr-1 py-1 border border-indigo-500/20 text-[10px]">
                                        <span className="text-indigo-200 font-bold uppercase">{mod.playerClass}</span>
                                        <span className={`font-mono ${mod.priceMultiplier < 1 ? 'text-green-400' : 'text-red-400'}`}>
                                            {mod.priceMultiplier < 1 ? `-${Math.round((1 - mod.priceMultiplier) * 100)}%` : `+${Math.round((mod.priceMultiplier - 1) * 100)}%`}
                                        </span>
                                        <button onClick={() => removeClassModifier(idx)} className="ml-1 p-0.5 text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Recycling Configuration */}
                        <div className="bg-black/40 p-4 border border-orange-500/20 relative">
                            <label className="text-[9px] text-orange-400 uppercase font-bold tracking-widest mb-3 flex items-center gap-2"><Recycle className="w-3 h-3" /> Výstup recyklace</label>

                            <div className="flex gap-0 mb-4 items-center border border-zinc-700">
                                <select
                                    value={selectedRecycleRes}
                                    onChange={(e) => setSelectedRecycleRes(e.target.value)}
                                    className="flex-[2] bg-black text-zinc-300 text-xs font-mono p-2 outline-none border-r border-zinc-700"
                                >
                                    <option value="">-- VYBERTE SUROVINU --</option>
                                    {availableResources.map(res => (
                                        <option key={res.id} value={res.resourceConfig?.resourceName || res.title}>
                                            {res.resourceConfig?.resourceName || res.title}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={recycleAmount}
                                    onChange={(e) => setRecycleAmount(parseInt(e.target.value))}
                                    className="w-16 bg-black text-zinc-300 text-xs text-center font-mono p-2 outline-none border-r border-zinc-700"
                                />
                                <button type="button" onClick={addRecycleOutput} className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {event.marketConfig.recyclingOutput?.map((out, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-orange-900/20 pl-2 pr-1 py-1 border border-orange-500/20 text-[10px]">
                                        <span className="text-orange-300 font-bold uppercase flex items-center gap-1"><Hammer className="w-3 h-3" /> {out.resourceName}</span>
                                        <span className="font-mono font-bold text-white">x{out.amount}</span>
                                        <button onClick={() => removeRecycleOutput(idx)} className="ml-1 p-0.5 text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Resource Configuration - IS IT A RESOURCE? */}
            <div className={`border p-4 transition-all duration-300 ${event.resourceConfig?.isResourceContainer ? 'bg-orange-950/10 border-orange-500/30' : 'bg-black border-zinc-800'}`}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Hammer className={`w-4 h-4 ${event.resourceConfig?.isResourceContainer ? 'text-orange-500' : 'text-zinc-600'}`} />
                        <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${event.resourceConfig?.isResourceContainer ? 'text-orange-500' : 'text-zinc-600'}`}>TYP_SUROVINY</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={event.resourceConfig?.isResourceContainer || false} onChange={(e) => updateResourceConfig('isResourceContainer', e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                </div>

                {event.resourceConfig?.isResourceContainer && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-[2fr_1fr] gap-4">
                            <div>
                                <label className="text-[9px] text-orange-400/70 uppercase font-bold tracking-widest mb-2 block">ID Suroviny</label>
                                <input
                                    type="text"
                                    value={event.resourceConfig.resourceName || ''}
                                    onChange={(e) => updateResourceConfig('resourceName', e.target.value)}
                                    className="w-full bg-black border border-orange-500/30 p-2 text-white text-xs font-mono outline-none focus:border-orange-500"
                                    placeholder="KOVOVÝ_ŠROT"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-orange-400/70 uppercase font-bold tracking-widest mb-2 block">Množství</label>
                                <input
                                    type="number"
                                    value={event.resourceConfig.resourceAmount || 1}
                                    onChange={(e) => updateResourceConfig('resourceAmount', parseInt(e.target.value))}
                                    className="w-full bg-black border border-orange-500/30 p-2 text-white text-xs font-mono text-center outline-none focus:border-orange-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] text-orange-400/70 uppercase font-bold tracking-widest mb-2 block">Inventory Label</label>
                            <input
                                type="text"
                                value={event.resourceConfig.customLabel || ''}
                                onChange={(e) => updateResourceConfig('customLabel', e.target.value)}
                                className="w-full bg-black border border-orange-500/30 p-2 text-white text-xs font-mono outline-none focus:border-orange-500"
                                placeholder="Raw Material (Default)"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* CRAFTING RECIPE CONFIGURATION - IS IT CRAFTABLE? */}
            <div className={`border p-4 transition-all duration-300 ${event.craftingRecipe?.enabled ? 'bg-teal-950/10 border-teal-500/30' : 'bg-black border-zinc-800'}`}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Scroll className={`w-4 h-4 ${event.craftingRecipe?.enabled ? 'text-teal-400' : 'text-zinc-600'}`} />
                        <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${event.craftingRecipe?.enabled ? 'text-teal-400' : 'text-zinc-600'}`}>MODUL_PLÁNKŮ</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={event.craftingRecipe?.enabled || false} onChange={(e) => updateCraftingConfig('enabled', e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                </div>

                {event.craftingRecipe?.enabled && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">

                        {/* 1. Global Crafting Time */}
                        <div className="bg-black/40 p-3 border border-teal-500/20 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-teal-400">
                                <Clock className="w-4 h-4" />
                                <label className="text-[9px] uppercase font-bold tracking-widest">DOBA_PRODUKCE (SEC)</label>
                            </div>
                            <input
                                type="number"
                                value={event.craftingRecipe.craftingTimeSeconds || 60}
                                onChange={(e) => updateCraftingConfig('craftingTimeSeconds', parseInt(e.target.value))}
                                className="w-20 bg-black border border-teal-500/30 p-1 text-white text-xs font-mono text-center outline-none focus:border-teal-500"
                            />
                        </div>

                        {/* 2. Add Ingredient Form */}
                        <div className="p-3 bg-zinc-900/30 border border-zinc-700">
                            <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-2">PŘIDAT KOMPONENT</label>
                            <div className="flex gap-0 mb-4 items-center border border-zinc-700">
                                <select
                                    value={selectedIngredient}
                                    onChange={(e) => setSelectedIngredient(e.target.value)}
                                    className="flex-[2] bg-black text-zinc-300 text-xs font-mono p-2 outline-none border-r border-zinc-700"
                                >
                                    <option value="">-- VYBERTE --</option>
                                    {availableResources.map(res => (
                                        <option key={res.id} value={res.resourceConfig?.resourceName || res.title}>
                                            {res.resourceConfig?.resourceName || res.title}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={ingredientAmount}
                                    onChange={(e) => setIngredientAmount(parseInt(e.target.value))}
                                    className="w-16 bg-black text-zinc-300 text-xs text-center font-mono p-2 outline-none border-r border-zinc-700"
                                />
                                <button
                                    type="button"
                                    onClick={addIngredient}
                                    className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* 3. Ingredients List Table */}
                        <div className="space-y-2">
                            {event.craftingRecipe.requiredResources?.length === 0 && (
                                <p className="text-[10px] text-zinc-600 italic text-center py-2 uppercase">ŽÁDNÉ KOMPONENTY NEJSOU VYŽADOVÁNY</p>
                            )}
                            {event.craftingRecipe.requiredResources?.map((ing, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-black p-2 border border-teal-500/20 hover:border-teal-500/50 transition-colors">
                                    <div className="flex-1">
                                        <span className="text-[8px] font-bold text-zinc-500 block uppercase tracking-widest">KOMPONENT</span>
                                        <span className="text-xs text-white font-mono">{ing.resourceName}</span>
                                    </div>
                                    <div className="px-3 border-l border-zinc-800">
                                        <span className="text-[8px] font-bold text-zinc-500 block uppercase tracking-widest">MNŽ</span>
                                        <span className="text-xs text-teal-400 font-mono font-bold">x{ing.amount}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeIngredient(idx)}
                                        className="text-zinc-600 hover:text-red-500 transition-colors p-2"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* STATS CONFIG */}
            <div className="bg-arc-panel/30 border border-white/5 p-4">
                <label className="text-[9px] text-zinc-400 uppercase font-black tracking-widest mb-4 block">AKTIVNÍ_MODIFIKÁTORY</label>

                <div className="flex flex-wrap gap-2 mb-4">
                    {quickOptions.map(opt => (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={() => addQuickStat(opt.label)}
                            className={`flex items-center gap-1.5 px-2 py-1 border border-zinc-800 hover:border-white bg-black transition-all active:scale-95`}
                        >
                            <opt.icon className={`w-3 h-3 ${opt.color}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-white`}>{opt.label}</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {event.stats?.map((stat, idx) => {
                        return (
                            <div key={idx} className="flex gap-0 items-stretch bg-black border border-zinc-800 hover:border-zinc-600 transition-colors">
                                <input
                                    value={stat.label}
                                    onChange={(e) => updateStat(idx, 'label', e.target.value)}
                                    className="w-24 bg-transparent border-r border-zinc-800 p-2 text-[10px] font-bold text-zinc-400 placeholder-zinc-700 outline-none uppercase font-mono focus:text-white focus:bg-white/5 transition-colors"
                                    placeholder="TAG"
                                />
                                <input
                                    value={stat.value}
                                    onChange={(e) => updateStat(idx, 'value', e.target.value)}
                                    className="flex-1 bg-transparent px-3 py-2 text-xs text-white font-mono placeholder-zinc-700 outline-none focus:bg-white/5 transition-colors"
                                    placeholder="VALUE"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeStat(idx)}
                                    className="px-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-colors border-l border-zinc-800"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ItemPanel;

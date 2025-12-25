
import React, { useState } from 'react';
import { GameEvent, Stat, PlayerClass } from '../../types';
import { Box, Heart, Swords, Shield, Zap, Coins, Sparkles, Wind, Trash2, Fuel, Hammer, Scroll, Plus, Clock, ShoppingCart, Recycle, Users, Tags, X, Ban } from 'lucide-react';

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
        { label: 'MANA', icon: Zap, color: 'text-cyan-400' },
        { label: 'PALIVO', icon: Fuel, color: 'text-orange-500' },
        { label: 'ZLATO', icon: Coins, color: 'text-yellow-500' },
        { label: 'KYSLÍK', icon: Wind, color: 'text-cyan-400' },
    ];

    return (
        <div className="space-y-6 bg-zinc-900/50 p-5 border border-zinc-700 relative rounded-xl">
            <div className="flex items-center gap-2 text-yellow-500 border-b border-zinc-700 pb-3">
                <Box className="w-5 h-5"/>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Konfigurace_Assetu:</h3>
            </div>

            {/* Consumable & Sell Only Checkboxes */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-black border border-zinc-700 rounded-lg overflow-hidden transition-colors hover:border-yellow-500">
                    <label className="flex items-center gap-4 p-4 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                        <input 
                            type="checkbox" 
                            checked={event.isConsumable} 
                            onChange={(e) => onUpdate({ isConsumable: e.target.checked })} 
                            className="w-6 h-6 rounded border-zinc-700 bg-zinc-900 text-yellow-500 focus:ring-yellow-500 accent-yellow-500" 
                        />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${event.isConsumable ? 'text-yellow-500' : 'text-white'}`}>
                                Spotřebovatelný
                            </span>
                            <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tight">
                                Zmizí po použití
                            </span>
                        </div>
                    </label>
                </div>

                <div className="bg-black border border-zinc-700 rounded-lg overflow-hidden transition-colors hover:border-red-500">
                    <label className="flex items-center gap-4 p-4 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                        <input 
                            type="checkbox" 
                            checked={event.isSellOnly} 
                            onChange={(e) => onUpdate({ isSellOnly: e.target.checked })} 
                            className="w-6 h-6 rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-red-500 accent-red-500" 
                        />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${event.isSellOnly ? 'text-red-500' : 'text-white'}`}>
                                <Ban className="w-3 h-3"/> Jen pro Prodej
                            </span>
                            <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tight">
                                Nelze použít, jen prodat
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            {/* PRICE CONFIG */}
            <div className="bg-black border border-zinc-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-yellow-500">
                    <Coins className="w-4 h-4"/>
                    <label className="text-[9px] font-bold uppercase tracking-widest">Tržní Hodnota (Cena)</label>
                </div>
                <div className="relative">
                    <input 
                        type="number" 
                        value={event.price || 0} 
                        onChange={(e) => onUpdate({ price: parseInt(e.target.value) })} 
                        className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white font-mono text-sm focus:border-yellow-500 outline-none rounded" 
                    />
                    <span className="absolute right-3 top-3 text-[10px] text-zinc-500 font-bold">GOLD</span>
                </div>
            </div>

            {/* NEW: MARKET & RECYCLING CONFIG */}
            <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${event.marketConfig?.enabled ? 'bg-indigo-950/20 border-indigo-500/50' : 'bg-black border-zinc-700'}`}>
                <label className="flex items-center gap-4 p-4 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={event.marketConfig?.enabled || false} 
                        onChange={(e) => updateMarketConfig('enabled', e.target.checked)} 
                        className="w-5 h-5 rounded border-zinc-600 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 accent-indigo-500" 
                    />
                    <div className="flex flex-col">
                        <span className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${event.marketConfig?.enabled ? 'text-indigo-400' : 'text-zinc-400'}`}>
                            <ShoppingCart className="w-3 h-3" /> Konfigurace Tržiště & Recyklace
                        </span>
                    </div>
                </label>

                {event.marketConfig?.enabled && (
                    <div className="p-4 pt-0 space-y-5 animate-in slide-in-from-top-2">
                        
                        {/* 1. Market Specifics */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[8px] text-indigo-300 uppercase font-bold tracking-widest mb-1 block">Override Tržní Ceny (Volitelné)</label>
                                <input 
                                    type="number" 
                                    placeholder="Standardní cena (zleva)"
                                    value={event.marketConfig.marketPrice || ''} 
                                    onChange={(e) => updateMarketConfig('marketPrice', e.target.value ? parseInt(e.target.value) : undefined)} 
                                    className="w-full bg-black border border-indigo-500/30 p-2 text-white text-xs font-mono outline-none focus:border-indigo-500 rounded"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] text-indigo-300 uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><Tags className="w-3 h-3"/> Šance na Akci (%)</label>
                                <input 
                                    type="range" 
                                    min="0" max="100"
                                    value={event.marketConfig.saleChance || 0} 
                                    onChange={(e) => updateMarketConfig('saleChance', parseInt(e.target.value))} 
                                    className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-1"
                                />
                                <div className="text-right text-[10px] font-mono text-indigo-400">{event.marketConfig.saleChance || 0}%</div>
                            </div>
                        </div>

                        {/* 2. Class Modifiers */}
                        <div className="bg-black/40 p-3 rounded border border-indigo-500/20">
                            <label className="text-[8px] text-indigo-300 uppercase font-bold tracking-widest mb-2 flex items-center gap-1"><Users className="w-3 h-3"/> Třídní Slevy / Přirážky</label>
                            
                            <div className="flex gap-2 mb-2">
                                <select 
                                    value={selectedMarketClass}
                                    onChange={(e) => setSelectedMarketClass(e.target.value as PlayerClass)}
                                    className="flex-[2] bg-black border border-zinc-600 text-white text-xs font-mono p-1.5 rounded outline-none focus:border-indigo-500"
                                >
                                    <option value="">-- Třída --</option>
                                    {Object.values(PlayerClass).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select 
                                    value={classPriceMultiplier}
                                    onChange={(e) => setClassPriceMultiplier(parseFloat(e.target.value))}
                                    className="flex-1 bg-black border border-zinc-600 text-white text-xs font-mono p-1.5 rounded outline-none"
                                >
                                    <option value={0.5}>-50% (Sleva)</option>
                                    <option value={0.8}>-20% (Sleva)</option>
                                    <option value={1.2}>+20% (Dražší)</option>
                                    <option value={1.5}>+50% (Dražší)</option>
                                </select>
                                <button type="button" onClick={addClassModifier} className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 rounded">
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="space-y-1">
                                {event.marketConfig.classModifiers?.map((mod, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-indigo-900/20 px-2 py-1 rounded text-[10px] text-zinc-300 border border-indigo-500/10">
                                        <span>{mod.playerClass}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={mod.priceMultiplier < 1 ? 'text-green-400' : 'text-red-400'}>
                                                {mod.priceMultiplier < 1 ? `SLEVA ${Math.round((1-mod.priceMultiplier)*100)}%` : `PŘIRÁŽKA ${Math.round((mod.priceMultiplier-1)*100)}%`}
                                            </span>
                                            <button onClick={() => removeClassModifier(idx)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Recycling Configuration */}
                        <div className="bg-black/40 p-3 rounded border border-orange-500/20">
                            <label className="text-[8px] text-orange-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-1"><Recycle className="w-3 h-3"/> Výstup Recyklace</label>
                            
                            <div className="flex gap-2 mb-2">
                                <select 
                                    value={selectedRecycleRes}
                                    onChange={(e) => setSelectedRecycleRes(e.target.value)}
                                    className="flex-[2] bg-black border border-zinc-600 text-white text-xs font-mono p-1.5 rounded outline-none focus:border-orange-500"
                                >
                                    <option value="">-- Surovina --</option>
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
                                    className="w-12 bg-black border border-zinc-600 text-white text-xs text-center font-mono p-1.5 rounded outline-none focus:border-orange-500"
                                />
                                <button type="button" onClick={addRecycleOutput} className="bg-orange-600 hover:bg-orange-500 text-white px-2 rounded">
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="space-y-1">
                                {event.marketConfig.recyclingOutput?.map((out, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-orange-900/20 px-2 py-1 rounded text-[10px] text-zinc-300 border border-orange-500/10">
                                        <span className="flex items-center gap-1"><Hammer className="w-3 h-3 text-orange-500"/> {out.resourceName}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-white">x{out.amount}</span>
                                            <button onClick={() => removeRecycleOutput(idx)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Resource Configuration - IS IT A RESOURCE? */}
            <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${event.resourceConfig?.isResourceContainer ? 'bg-orange-950/20 border-orange-500/50' : 'bg-black border-zinc-700'}`}>
                <label className="flex items-center gap-4 p-4 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={event.resourceConfig?.isResourceContainer || false} 
                        onChange={(e) => updateResourceConfig('isResourceContainer', e.target.checked)} 
                        className="w-5 h-5 rounded border-zinc-600 bg-zinc-900 text-orange-500 focus:ring-orange-500 accent-orange-500" 
                    />
                    <div className="flex flex-col">
                        <span className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${event.resourceConfig?.isResourceContainer ? 'text-orange-500' : 'text-zinc-400'}`}>
                            <Hammer className="w-3 h-3" /> Je to Surovina?
                        </span>
                    </div>
                </label>

                {event.resourceConfig?.isResourceContainer && (
                    <div className="p-4 pt-0 space-y-3 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-[2fr_1fr] gap-3">
                            <div>
                                <label className="text-[8px] text-orange-400/70 uppercase font-bold tracking-widest mb-1 block">Název Suroviny (ID pro crafting)</label>
                                <input 
                                    type="text" 
                                    value={event.resourceConfig.resourceName || ''} 
                                    onChange={(e) => updateResourceConfig('resourceName', e.target.value)} 
                                    className="w-full bg-black border border-orange-500/30 p-2 text-white text-xs font-mono outline-none focus:border-orange-500 rounded"
                                    placeholder="např. Kovový šrot"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] text-orange-400/70 uppercase font-bold tracking-widest mb-1 block">Množství v balíku</label>
                                <input 
                                    type="number" 
                                    value={event.resourceConfig.resourceAmount || 1} 
                                    onChange={(e) => updateResourceConfig('resourceAmount', parseInt(e.target.value))} 
                                    className="w-full bg-black border border-orange-500/30 p-2 text-white text-xs font-mono text-center outline-none focus:border-orange-500 rounded"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[8px] text-orange-400/70 uppercase font-bold tracking-widest mb-1 block">Vlastní nápis v Batohu</label>
                            <input 
                                type="text" 
                                value={event.resourceConfig.customLabel || ''} 
                                onChange={(e) => updateResourceConfig('customLabel', e.target.value)} 
                                className="w-full bg-black border border-orange-500/30 p-2 text-white text-xs font-mono outline-none focus:border-orange-500 rounded"
                                placeholder="Výchozí: Surovina k Těžbě"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* CRAFTING RECIPE CONFIGURATION - IS IT CRAFTABLE? */}
            <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${event.craftingRecipe?.enabled ? 'bg-cyan-950/20 border-cyan-500/50' : 'bg-black border-zinc-700'}`}>
                <label className="flex items-center gap-4 p-4 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={event.craftingRecipe?.enabled || false} 
                        onChange={(e) => updateCraftingConfig('enabled', e.target.checked)} 
                        className="w-5 h-5 rounded border-zinc-600 bg-zinc-900 text-cyan-500 focus:ring-cyan-500 accent-cyan-500" 
                    />
                    <div className="flex flex-col">
                        <span className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${event.craftingRecipe?.enabled ? 'text-cyan-500' : 'text-zinc-400'}`}>
                            <Scroll className="w-3 h-3" /> Povolit Výrobu (Recept)
                        </span>
                    </div>
                </label>

                {event.craftingRecipe?.enabled && (
                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2">
                        
                        {/* 1. Global Crafting Time */}
                        <div className="bg-black/40 p-3 rounded border border-cyan-500/20 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-cyan-400">
                                <Clock className="w-4 h-4" />
                                <label className="text-[10px] uppercase font-bold tracking-widest">Doba výroby (sekundy)</label>
                            </div>
                            <input 
                                type="number" 
                                value={event.craftingRecipe.craftingTimeSeconds || 60} 
                                onChange={(e) => updateCraftingConfig('craftingTimeSeconds', parseInt(e.target.value))} 
                                className="w-20 bg-black border border-cyan-500/30 p-2 text-white text-xs font-mono text-center outline-none focus:border-cyan-500 rounded"
                            />
                        </div>

                        {/* 2. Add Ingredient Form */}
                        <div className="p-3 bg-zinc-900/50 rounded border border-zinc-700">
                            <label className="text-[8px] text-zinc-400 uppercase font-bold tracking-widest block mb-2">Přidat Ingredienci</label>
                            <div className="flex gap-2">
                                <select 
                                    value={selectedIngredient}
                                    onChange={(e) => setSelectedIngredient(e.target.value)}
                                    className="flex-[2] bg-black border border-zinc-600 text-white text-xs font-mono p-2 rounded outline-none focus:border-cyan-500"
                                >
                                    <option value="">-- Vyberte Surovinu --</option>
                                    {availableResources.map(res => (
                                        <option key={res.id} value={res.resourceConfig?.resourceName || res.title}>
                                            {res.resourceConfig?.resourceName || res.title} ({res.id})
                                        </option>
                                    ))}
                                </select>
                                <input 
                                    type="number"
                                    placeholder="Ks"
                                    value={ingredientAmount}
                                    onChange={(e) => setIngredientAmount(parseInt(e.target.value))}
                                    className="w-14 bg-black border border-zinc-600 text-white text-xs text-center font-mono p-2 rounded outline-none focus:border-cyan-500"
                                />
                                <button 
                                    type="button" 
                                    onClick={addIngredient}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 rounded flex items-center justify-center"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* 3. Ingredients List Table */}
                        <div className="space-y-2">
                            <label className="text-[8px] text-cyan-400/70 uppercase font-bold tracking-widest block">Seznam Požadovaných Surovin:</label>
                            
                            {event.craftingRecipe.requiredResources?.length === 0 && (
                                <p className="text-[10px] text-zinc-600 italic text-center py-2">Žádné suroviny. Předmět půjde vyrobit zdarma.</p>
                            )}

                            {event.craftingRecipe.requiredResources?.map((ing, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-black p-2 border border-cyan-500/20 rounded hover:border-cyan-500/50 transition-colors">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wide">Surovina</span>
                                        <span className="text-xs text-white font-mono">{ing.resourceName}</span>
                                    </div>
                                    <div className="px-3 border-l border-zinc-800">
                                        <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wide">Množství</span>
                                        <span className="text-xs text-cyan-400 font-mono font-bold">x{ing.amount}</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => removeIngredient(idx)} 
                                        className="text-red-500 hover:text-red-400 p-2 ml-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* STATS CONFIG */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-[8px] text-zinc-400 uppercase font-bold tracking-widest">Aktivní_stats na kartě:</label>
                </div>

                <div className="flex flex-wrap gap-2">
                    {quickOptions.map(opt => (
                        <button 
                        key={opt.label} 
                        type="button" 
                        onClick={() => addQuickStat(opt.label)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 hover:border-yellow-500 transition-all active:scale-95 bg-black rounded`}
                        >
                            <opt.icon className={`w-3 h-3 ${opt.color}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-tighter text-zinc-200`}>{opt.label}</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                    {event.stats?.map((stat, idx) => {
                        const labelUpper = stat.label.toUpperCase();
                        const foundOption = quickOptions.find(o => 
                            labelUpper.includes(o.label) || 
                            (o.label === 'ARMOR' && labelUpper.includes('ARMOR')) ||
                            (o.label === 'KYSLÍK' && labelUpper.includes('OXYGEN')) ||
                            (o.label === 'HP' && (labelUpper.includes('HEALTH') || labelUpper.includes('ŽIVOT'))) ||
                            (o.label === 'PALIVO' && (labelUpper.includes('FUEL') || labelUpper.includes('PALIVO')))
                        );

                        return (
                            <div key={idx} className="flex gap-2 items-center bg-black p-2 border border-zinc-700 rounded animate-in slide-in-from-left-2 duration-200">
                                <div className={`p-2 border border-zinc-800 bg-zinc-900 rounded`}>
                                    {foundOption ? <foundOption.icon className={`w-4 h-4 ${foundOption.color}`} /> : <Sparkles className="w-4 h-4 text-zinc-400" />}
                                </div>
                                <input 
                                value={stat.label} 
                                onChange={(e) => updateStat(idx, 'label', e.target.value)} 
                                className="w-24 bg-zinc-900 border border-zinc-700 p-2 text-[10px] font-bold text-white placeholder-zinc-600 outline-none uppercase font-mono rounded focus:border-yellow-500" 
                                placeholder="TAG" 
                                />
                                <input 
                                value={stat.value} 
                                onChange={(e) => updateStat(idx, 'value', e.target.value)} 
                                className="flex-1 bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:border-yellow-500 outline-none rounded" 
                                placeholder="HODNOTA (+/-)" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => removeStat(idx)} 
                                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
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

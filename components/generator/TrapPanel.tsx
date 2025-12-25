
import React from 'react';
import { GameEvent, PlayerClass, Stat } from '../../types';
import { Zap, Coins, Plus, Trash2, Tag, Heart, Fuel, Wind, Swords, Shield } from 'lucide-react';

interface TrapPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
}

const TrapPanel: React.FC<TrapPanelProps> = ({ event, onUpdate }) => {
    
    const updateTrapConfig = (field: string, value: any) => {
        onUpdate({
            trapConfig: {
                ...(event.trapConfig || { 
                    difficulty: 10, 
                    damage: 20, 
                    disarmClass: PlayerClass.ROGUE, 
                    successMessage: "Past zneškodněna.", 
                    failMessage: "Past sklapla!",
                    loot: []
                }),
                [field]: value
            }
        });
    };

    // --- LOOT MANAGEMENT ---
    const addLoot = (label: string = 'ZLATO', value: string = '+10') => {
        const currentConfig = event.trapConfig || {
            difficulty: 10, 
            damage: 20, 
            disarmClass: PlayerClass.ROGUE, 
            successMessage: "Past zneškodněna.", 
            failMessage: "Past sklapla!",
            loot: []
        };
        
        const currentLoot = currentConfig.loot || [];
        
        onUpdate({
            trapConfig: {
                ...currentConfig,
                loot: [...currentLoot, { label, value }]
            }
        });
    };

    const updateLootStat = (idx: number, field: keyof Stat, value: string) => {
        const currentLoot = [...(event.trapConfig?.loot || [])];
        if (currentLoot[idx]) {
            currentLoot[idx] = { ...currentLoot[idx], [field]: value };
            updateTrapConfig('loot', currentLoot);
        }
    };

    const removeLootStat = (idx: number) => {
        const currentLoot = (event.trapConfig?.loot || []).filter((_, i) => i !== idx);
        updateTrapConfig('loot', currentLoot);
    };

    const quickLootOptions = [
        { label: 'HP', icon: Heart, color: 'text-red-500' },
        { label: 'DMG', icon: Swords, color: 'text-orange-500' },
        { label: 'ARMOR', icon: Shield, color: 'text-zinc-200' },
        { label: 'MANA', icon: Zap, color: 'text-cyan-400' },
        { label: 'PALIVO', icon: Fuel, color: 'text-orange-500' },
        { label: 'ZLATO', icon: Coins, color: 'text-yellow-500' },
        { label: 'KYSLÍK', icon: Wind, color: 'text-cyan-400' },
    ];

    return (
        <div className="space-y-4 bg-arc-panel p-5 border border-arc-red/30 text-white shadow-[0_0_20px_rgba(239,68,68,0.1)] rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-arc-red border-b border-arc-red/20 pb-2">
                <Zap className="w-5 h-5"/>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest">Nástraha_konfigurace:</h3>
            </div>
            
            {/* TYPE SPECIFICATION */}
            <div className="bg-black/40 p-3 rounded border border-white/5">
                <label className="text-[8px] text-zinc-400 uppercase font-bold tracking-widest flex items-center gap-1 mb-2">
                    <Tag className="w-3 h-3"/> Specifikace / Typ Pasti
                </label>
                <input 
                    type="text" 
                    value={event.trapConfig?.trapType ?? ''} 
                    onChange={(e) => updateTrapConfig('trapType', e.target.value)} 
                    placeholder="Např. MECHANICKÁ, BIOLOGICKÁ, HACKING..."
                    className="w-full bg-black border border-zinc-700 p-2 text-white text-xs font-mono outline-none focus:border-arc-red rounded" 
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest">Obtížnost (Hod kostkou):</label>
                    <input 
                        type="number" 
                        value={event.trapConfig?.difficulty ?? 10} 
                        onChange={(e) => updateTrapConfig('difficulty', parseInt(e.target.value))} 
                        className="w-full bg-black border border-arc-red/40 p-3 text-white font-mono text-sm rounded focus:border-arc-red outline-none" 
                    />
                </div>
                <div>
                    <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest">DMG po selhání:</label>
                    <input 
                        type="number" 
                        value={event.trapConfig?.damage ?? 20} 
                        onChange={(e) => updateTrapConfig('damage', parseInt(e.target.value))} 
                        className="w-full bg-black border border-arc-red/40 p-3 text-arc-red font-mono text-sm rounded focus:border-arc-red outline-none" 
                    />
                </div>
            </div>
            
            <div>
                <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest">Expert na zneškodnění (Bonus Class):</label>
                <select 
                    value={event.trapConfig?.disarmClass ?? 'ANY'} 
                    onChange={(e) => updateTrapConfig('disarmClass', e.target.value)} 
                    className="w-full bg-black border border-arc-border p-3 text-white text-xs font-mono uppercase focus:ring-1 focus:ring-arc-yellow outline-none rounded"
                >
                    <option value="ANY" className="bg-arc-panel text-white">KDOKOLIV (Bez bonusu)</option>
                    {Object.values(PlayerClass).map(c => <option key={c} value={c} className="bg-arc-panel text-white">{c}</option>)}
                </select>
            </div>

            {/* MESSAGES CONFIG */}
            <div className="grid grid-cols-1 gap-2">
                <div>
                    <label className="text-[8px] text-green-500 uppercase font-bold tracking-widest">Zpráva při úspěchu:</label>
                    <input 
                        type="text" 
                        value={event.trapConfig?.successMessage ?? "Past zneškodněna."} 
                        onChange={(e) => updateTrapConfig('successMessage', e.target.value)} 
                        className="w-full bg-black border border-green-500/30 p-2 text-zinc-300 text-xs font-mono rounded" 
                    />
                </div>
                <div>
                    <label className="text-[8px] text-red-500 uppercase font-bold tracking-widest">Zpráva při selhání:</label>
                    <input 
                        type="text" 
                        value={event.trapConfig?.failMessage ?? "Past sklapla!"} 
                        onChange={(e) => updateTrapConfig('failMessage', e.target.value)} 
                        className="w-full bg-black border border-red-500/30 p-2 text-zinc-300 text-xs font-mono rounded" 
                    />
                </div>
            </div>

            {/* REWARD CONFIG */}
            <div className="bg-arc-yellow/5 border border-arc-yellow/20 p-3 rounded-xl mt-2">
                <div className="flex justify-between items-center mb-4">
                    <label className="text-[9px] text-arc-yellow uppercase font-bold tracking-widest flex items-center gap-2">
                        <Coins className="w-3 h-3"/> Odměna za zneškodnění (Loot)
                    </label>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {quickLootOptions.map(opt => (
                        <button 
                            key={opt.label} 
                            type="button" 
                            onClick={() => addLoot(opt.label, '+10')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 hover:border-arc-yellow transition-all active:scale-95 bg-black rounded`}
                        >
                            <opt.icon className={`w-3 h-3 ${opt.color}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-tighter text-zinc-200`}>{opt.label}</span>
                        </button>
                    ))}
                    <button 
                        type="button" 
                        onClick={() => addLoot('JINÉ', '+1')}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 hover:border-white transition-all active:scale-95 bg-black rounded"
                    >
                        <Plus className="w-3 h-3 text-zinc-400" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter text-zinc-400">Vlastní</span>
                    </button>
                </div>

                <div className="space-y-2">
                    {(!event.trapConfig?.loot || event.trapConfig.loot.length === 0) && (
                        <p className="text-[9px] text-zinc-500 italic text-center py-2">Žádná odměna. Past se jen vypne.</p>
                    )}
                    {event.trapConfig?.loot?.map((stat, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-black p-2 border border-zinc-700 rounded animate-in slide-in-from-left-2">
                            <input 
                                value={stat.label} 
                                onChange={(e) => updateLootStat(idx, 'label', e.target.value)} 
                                className="w-24 bg-zinc-900 border border-zinc-600 p-2 text-[10px] font-bold text-arc-yellow uppercase font-mono rounded outline-none" 
                                placeholder="TYP" 
                            />
                            <input 
                                value={stat.value} 
                                onChange={(e) => updateLootStat(idx, 'value', e.target.value)} 
                                className="flex-1 bg-zinc-900 border border-zinc-600 px-3 py-2 text-xs text-white font-mono outline-none rounded" 
                                placeholder="HODNOTA" 
                            />
                            <button 
                                type="button" 
                                onClick={() => removeLootStat(idx)} 
                                className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TrapPanel;

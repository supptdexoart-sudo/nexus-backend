
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
        { label: 'PALIVO', icon: Fuel, color: 'text-orange-500' },
        { label: 'ZLATO', icon: Coins, color: 'text-yellow-500' },
        { label: 'KYSLÍK', icon: Wind, color: 'text-cyan-400' },
    ];

    return (
        <div className="bg-black border border-white/10 p-6 relative shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                <Zap className="w-24 h-24 text-arc-red" />
            </div>

            <div className="flex items-center gap-3 mb-6 border-b border-arc-red/20 pb-4">
                <div className="p-2 border border-arc-red text-arc-red">
                    <Zap className="w-5 h-5" />
                </div>
                <div>
                    <span className="text-[9px] font-mono text-red-800 uppercase tracking-widest block mb-0.5">PROTOKOL_NEBEZPEČÍ</span>
                    <h3 className="text-xl font-display font-black uppercase tracking-widest text-white">Specifikace Pasti</h3>
                </div>
            </div>

            {/* TYPE SPECIFICATION */}
            <div className="p-4 bg-zinc-900/30 border-l-2 border-arc-red mb-6">
                <label className="text-[9px] text-zinc-400 uppercase font-black tracking-widest flex items-center gap-2 mb-2">
                    <Tag className="w-3 h-3" /> Klasifikace Nebezpečí
                </label>
                <input
                    type="text"
                    value={event.trapConfig?.trapType ?? ''}
                    onChange={(e) => updateTrapConfig('trapType', e.target.value)}
                    placeholder="např. MECHANICKÁ, BIOLOGICKÁ, DIGITÁLNÍ..."
                    className="w-full bg-black border-b border-zinc-700 py-2 text-white text-sm font-mono outline-none focus:border-arc-red placeholder-zinc-800 uppercase"
                />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-black border border-zinc-800 p-3 hover:border-white transition-colors">
                    <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-2">OBTÍŽNOST ODSTRANĚNÍ (D20)</label>
                    <input
                        type="number"
                        value={event.trapConfig?.difficulty ?? 10}
                        onChange={(e) => updateTrapConfig('difficulty', parseInt(e.target.value))}
                        className="w-full bg-transparent text-white font-mono text-2xl font-bold outline-none"
                    />
                </div>
                <div className="bg-black border border-zinc-800 p-3 hover:border-red-500 transition-colors">
                    <label className="text-[9px] text-red-500 uppercase font-black tracking-widest block mb-2">POŠKOZENÍ PŘI SELHÁNÍ</label>
                    <input
                        type="number"
                        value={event.trapConfig?.damage ?? 20}
                        onChange={(e) => updateTrapConfig('damage', parseInt(e.target.value))}
                        className="w-full bg-transparent text-red-500 font-mono text-2xl font-bold outline-none"
                    />
                </div>
            </div>

            <div className="mb-6">
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-2">SPECIALISTA (BONUSOVÁ TŘÍDA)</label>
                <div className="bg-black border border-zinc-800 p-1">
                    <select
                        value={event.trapConfig?.disarmClass ?? 'ANY'}
                        onChange={(e) => updateTrapConfig('disarmClass', e.target.value)}
                        className="w-full bg-black text-white text-xs font-mono uppercase p-2 outline-none"
                    >
                        <option value="ANY">ŽÁDNÁ (STANDARDNÍ OBTÍŽNOST)</option>
                        {Object.values(PlayerClass).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* MESSAGES CONFIG */}
            <div className="space-y-4 mb-6">
                <div className="bg-green-950/10 border-l-2 border-green-500 pl-3 py-2">
                    <label className="text-[9px] text-green-500 uppercase font-bold tracking-widest block mb-1">ZPRÁVA PŘI ÚSPĚCHU</label>
                    <input
                        type="text"
                        value={event.trapConfig?.successMessage ?? "Past zneškodněna."}
                        onChange={(e) => updateTrapConfig('successMessage', e.target.value)}
                        className="w-full bg-transparent text-zinc-300 text-xs font-mono outline-none"
                    />
                </div>
                <div className="bg-red-950/10 border-l-2 border-red-500 pl-3 py-2">
                    <label className="text-[9px] text-red-500 uppercase font-bold tracking-widest block mb-1">ZPRÁVA PŘI SELHÁNÍ</label>
                    <input
                        type="text"
                        value={event.trapConfig?.failMessage ?? "Past sklapla!"}
                        onChange={(e) => updateTrapConfig('failMessage', e.target.value)}
                        className="w-full bg-transparent text-zinc-300 text-xs font-mono outline-none"
                    />
                </div>
            </div>

            {/* REWARD CONFIG */}
            <div className="bg-arc-yellow/5 border border-arc-yellow/20 p-4 relative">
                <div className="flex justify-between items-center mb-4">
                    <label className="text-[9px] text-arc-yellow uppercase font-black tracking-widest flex items-center gap-2">
                        <Coins className="w-3 h-3" /> ODMĚNA ZA ODSTRANĚNÍ (LOOT)
                    </label>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {quickLootOptions.map(opt => (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={() => addLoot(opt.label, '+10')}
                            className={`flex items-center gap-1.5 px-2 py-1 border border-zinc-800 bg-black hover:border-white transition-all active:scale-95`}
                        >
                            <opt.icon className={`w-3 h-3 ${opt.color}`} />
                            <span className={`text-[8px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-white`}>{opt.label}</span>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => addLoot('JINÉ', '+1')}
                        className="flex items-center gap-1.5 px-2 py-1 border border-zinc-800 bg-black hover:border-white transition-all active:scale-95"
                    >
                        <Plus className="w-3 h-3 text-zinc-400" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">CUSTOM</span>
                    </button>
                </div>

                <div className="space-y-2">
                    {(!event.trapConfig?.loot || event.trapConfig.loot.length === 0) && (
                        <p className="text-[9px] text-zinc-600 italic text-center py-2 uppercase">NEJSOU KONFIGUROVÁNY ŽÁDNÉ ODMĚNY</p>
                    )}
                    {event.trapConfig?.loot?.map((stat, idx) => (
                        <div key={idx} className="flex gap-0 items-center bg-black border border-zinc-700 hover:border-arc-yellow transition-colors">
                            <input
                                value={stat.label}
                                onChange={(e) => updateLootStat(idx, 'label', e.target.value)}
                                className="w-24 bg-transparent border-r border-zinc-700 p-2 text-[10px] font-black text-arc-yellow uppercase font-mono outline-none"
                                placeholder="TYPE"
                            />
                            <input
                                value={stat.value}
                                onChange={(e) => updateLootStat(idx, 'value', e.target.value)}
                                className="flex-1 bg-transparent px-3 py-2 text-xs text-white font-mono outline-none"
                                placeholder="VALUE"
                            />
                            <button
                                type="button"
                                onClick={() => removeLootStat(idx)}
                                className="p-2 text-zinc-600 hover:text-red-500 transition-colors border-l border-zinc-700"
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

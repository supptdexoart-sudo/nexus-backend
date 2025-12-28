
import React from 'react';
import { GameEvent, Stat } from '../../types';
import { Coins, Heart, Fuel, Wind, Sparkles, Trash2, Plus, Box } from 'lucide-react';

interface EnemyLootPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
}

const EnemyLootPanel: React.FC<EnemyLootPanelProps> = ({ event, onUpdate }) => {

    const lootStats = event.enemyLoot?.lootStats || [];

    const updateLoot = (updates: any) => {
        onUpdate({
            enemyLoot: {
                ...(event.enemyLoot || {}),
                ...updates
            }
        });
    };

    const addLootStat = (label: string, value: string = '+10') => {
        if (lootStats.some(s => s.label.toUpperCase() === label.toUpperCase())) return;
        updateLoot({ lootStats: [...lootStats, { label, value }] });
    };

    const updateLootStat = (idx: number, field: keyof Stat, value: string) => {
        const newStats = [...lootStats];
        newStats[idx] = { ...newStats[idx], [field]: value };
        updateLoot({ lootStats: newStats });
    };

    const removeLootStat = (idx: number) => {
        updateLoot({ lootStats: lootStats.filter((_, i) => i !== idx) });
    };

    const quickOptions = [
        { label: 'ZLATO', icon: Coins, color: 'text-yellow-500' },
        { label: 'HP', icon: Heart, color: 'text-red-500' },
        { label: 'PALIVO', icon: Fuel, color: 'text-orange-500' },
        { label: 'O2', icon: Wind, color: 'text-cyan-400' },
    ];

    return (
        <div className="mt-6 bg-black border border-white/10 p-5 relative shadow-lg">
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Box className="w-16 h-16 text-arc-yellow" />
            </div>

            <h4 className="text-[10px] font-black text-arc-yellow uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-arc-yellow/20 pb-2">
                <Coins className="w-4 h-4" /> VICTORY REWARDS (LOOT)
            </h4>

            <div className="space-y-4">
                {/* Legacy Drop Chance */}
                <div className="flex items-center justify-between bg-zinc-900/30 p-3 border-l-2 border-arc-yellow">
                    <label className="text-[8px] text-zinc-400 uppercase font-black tracking-widest">ITEM DROP PROBABILITY %</label>
                    <input
                        type="number"
                        min="0" max="100"
                        value={event.enemyLoot?.dropItemChance ?? 0}
                        onChange={(e) => updateLoot({ dropItemChance: parseInt(e.target.value) })}
                        className="w-16 bg-black border border-zinc-700 p-1 text-white text-sm text-center font-bold font-mono outline-none focus:border-arc-yellow"
                    />
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                    {quickOptions.map(opt => (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={() => addLootStat(opt.label)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 hover:border-white transition-all active:scale-95 bg-black group`}
                        >
                            <opt.icon className={`w-3 h-3 ${opt.color} opacity-70 group-hover:opacity-100`} />
                            <span className={`text-[8px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white`}>{opt.label}</span>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => addLootStat('CUSTOM')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 hover:border-white transition-all active:scale-95 bg-black group`}
                    >
                        <Plus className="w-3 h-3 text-zinc-400 group-hover:text-white" />
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white">CUSTOM</span>
                    </button>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                    {lootStats.length === 0 && (
                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-center py-4 border border-dashed border-zinc-900">NO REWARDS CONFIGURED</p>
                    )}

                    {lootStats.map((stat, idx) => {
                        const labelUpper = stat.label.toUpperCase();
                        const foundOption = quickOptions.find(o => labelUpper.includes(o.label));

                        return (
                            <div key={idx} className="flex gap-0 items-center bg-black border border-zinc-800 hover:border-arc-yellow transition-colors group">
                                <div className={`p-2.5 border-r border-zinc-800 bg-zinc-900/50`}>
                                    {foundOption ? <foundOption.icon className={`w-4 h-4 ${foundOption.color}`} /> : <Sparkles className="w-4 h-4 text-zinc-400" />}
                                </div>
                                <input
                                    value={stat.label}
                                    onChange={(e) => updateLootStat(idx, 'label', e.target.value)}
                                    className="w-24 bg-transparent border-r border-zinc-800 p-2.5 text-[10px] font-black text-white placeholder-zinc-600 outline-none uppercase font-mono"
                                    placeholder="TAG"
                                />
                                <input
                                    value={stat.value}
                                    onChange={(e) => updateLootStat(idx, 'value', e.target.value)}
                                    className="flex-1 bg-transparent px-3 py-2.5 text-xs text-arc-yellow font-mono placeholder-zinc-700 outline-none font-bold"
                                    placeholder="VALUE"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeLootStat(idx)}
                                    className="p-2.5 text-zinc-600 hover:text-red-500 hover:bg-white/5 transition-colors border-l border-zinc-800"
                                    title="Remove"
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

export default EnemyLootPanel;

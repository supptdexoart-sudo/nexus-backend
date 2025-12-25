
import React from 'react';
import { GameEvent, Stat } from '../../types';
import { Coins, Heart, Zap, Fuel, Wind, Sparkles, Trash2 } from 'lucide-react';

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
        { label: 'MANA', icon: Zap, color: 'text-cyan-400' },
        { label: 'PALIVO', icon: Fuel, color: 'text-orange-500' },
        { label: 'O2', icon: Wind, color: 'text-cyan-200' },
    ];

    return (
        <div className="mt-4 bg-arc-panel p-5 border border-arc-yellow/20 text-white rounded-xl">
            <h4 className="text-[10px] font-bold text-arc-yellow uppercase tracking-widest mb-4 flex items-center gap-2">
                <Coins className="w-4 h-4"/> Odměna po boji (Vyzvednutí):
            </h4>

            <div className="space-y-4">
                {/* Legacy Drop Chance */}
                <div className="flex items-center gap-2 mb-4 bg-black/40 p-2 rounded border border-white/5">
                    <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest">Šance na Drop Předmětu % (Volitelné)</label>
                    <input 
                        type="number" 
                        value={event.enemyLoot?.dropItemChance ?? 0} 
                        onChange={(e) => updateLoot({ dropItemChance: parseInt(e.target.value) })} 
                        className="w-16 bg-black border border-arc-border p-1 text-white text-xs text-center font-mono rounded" 
                    />
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                    {quickOptions.map(opt => (
                        <button 
                            key={opt.label} 
                            type="button" 
                            onClick={() => addLootStat(opt.label)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 hover:border-yellow-500 transition-all active:scale-95 bg-black rounded`}
                        >
                            <opt.icon className={`w-3 h-3 ${opt.color}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-tighter text-zinc-200`}>{opt.label}</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                    {lootStats.length === 0 && (
                        <p className="text-[10px] text-zinc-500 italic text-center py-4">Žádná garantovaná odměna. Přidejte staty výše.</p>
                    )}
                    
                    {lootStats.map((stat, idx) => {
                        const labelUpper = stat.label.toUpperCase();
                        const foundOption = quickOptions.find(o => labelUpper.includes(o.label));

                        return (
                            <div key={idx} className="flex gap-2 items-center bg-black p-2 border border-zinc-700 rounded animate-in slide-in-from-left-2 duration-200">
                                <div className={`p-2 border border-zinc-800 bg-zinc-900 rounded`}>
                                    {foundOption ? <foundOption.icon className={`w-4 h-4 ${foundOption.color}`} /> : <Sparkles className="w-4 h-4 text-zinc-400" />}
                                </div>
                                <input 
                                    value={stat.label} 
                                    onChange={(e) => updateLootStat(idx, 'label', e.target.value)} 
                                    className="w-24 bg-zinc-900 border border-zinc-700 p-2 text-[10px] font-bold text-white placeholder-zinc-600 outline-none uppercase font-mono rounded focus:border-yellow-500" 
                                    placeholder="TAG" 
                                />
                                <input 
                                    value={stat.value} 
                                    onChange={(e) => updateLootStat(idx, 'value', e.target.value)} 
                                    className="flex-1 bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:border-yellow-500 outline-none rounded" 
                                    placeholder="HODNOTA (+/-)" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => removeLootStat(idx)} 
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

export default EnemyLootPanel;

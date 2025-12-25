
import React from 'react';
import { GameEvent } from '../../types';
import { Moon, Trash2 } from 'lucide-react';

interface NightVariantPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
}

const NightVariantPanel: React.FC<NightVariantPanelProps> = ({ event, onUpdate }) => {
    
    const updateNightConfig = (updates: any) => {
        onUpdate({
            timeVariant: {
                ...(event.timeVariant || { enabled: false, nightStats: [] }),
                ...updates
            }
        });
    };

    const addNightStat = () => {
        const stats = [...(event.timeVariant?.nightStats || [])];
        stats.push({ label: 'NIGHT_MOD', value: '+5' });
        updateNightConfig({ nightStats: stats });
    };

    const updateNightStat = (index: number, field: 'label' | 'value', value: string) => {
        const stats = [...(event.timeVariant?.nightStats || [])];
        if(stats[index]) {
            stats[index] = { ...stats[index], [field]: value };
            updateNightConfig({ nightStats: stats });
        }
    };

    const removeNightStat = (index: number) => {
        const stats = (event.timeVariant?.nightStats || []).filter((_, i) => i !== index);
        updateNightConfig({ nightStats: stats });
    };

    return (
        <div className={`mt-6 p-5 border rounded-xl transition-all ${event.timeVariant?.enabled ? 'bg-indigo-950/30 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-white/10 opacity-70'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-400">
                    <Moon className="w-5 h-5" />
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest">Noční_Protokol_v2.0</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={event.timeVariant?.enabled || false} 
                        onChange={(e) => updateNightConfig({ enabled: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
            </div>

            {event.timeVariant?.enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-[8px] text-indigo-300 uppercase font-bold tracking-widest mb-1 block">Název karty v noci (Override):</label>
                            <input 
                                value={event.timeVariant.nightTitle || ''} 
                                onChange={(e) => updateNightConfig({ nightTitle: e.target.value })}
                                placeholder="Ponechte prázdné pro původní"
                                className="w-full bg-black border border-indigo-900/50 p-3 text-white text-sm outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-[8px] text-indigo-300 uppercase font-bold tracking-widest mb-1 block">Popis karty v noci (Override):</label>
                            <textarea 
                                value={event.timeVariant.nightDescription || ''} 
                                onChange={(e) => updateNightConfig({ nightDescription: e.target.value })}
                                placeholder="Ponechte prázdné pro původní"
                                className="w-full bg-black border border-indigo-900/50 p-3 text-zinc-300 text-xs font-mono outline-none focus:border-indigo-500"
                                rows={2}
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[8px] text-indigo-300 uppercase font-bold tracking-widest">Noční_Statistiky (Nahrazují původní):</label>
                            <button 
                                type="button"
                                onClick={addNightStat}
                                className="text-[8px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 font-bold uppercase"
                            >
                                + PŘIDAT NOČNÍ STAT
                            </button>
                        </div>
                        {event.timeVariant.nightStats?.map((stat, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-black/40 p-2 border border-indigo-900/30">
                                <input 
                                    value={stat.label} 
                                    onChange={(e) => updateNightStat(idx, 'label', e.target.value)}
                                    className="w-20 bg-transparent border-none p-1 text-[9px] font-bold text-indigo-300 uppercase font-mono"
                                    placeholder="TAG"
                                />
                                <input 
                                    value={stat.value} 
                                    onChange={(e) => updateNightStat(idx, 'value', e.target.value)}
                                    className="flex-1 bg-indigo-950/40 border border-indigo-900/50 px-2 py-1 text-xs text-white font-mono focus:border-indigo-400 outline-none"
                                    placeholder="HODNOTA"
                                />
                                <button 
                                    type="button"
                                    onClick={() => removeNightStat(idx)}
                                    className="text-red-500 p-1 hover:text-red-400"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NightVariantPanel;

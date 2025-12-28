
import React from 'react';
import { GameEvent, GameEventType } from '../../types';
import { Moon, Trash2, Clock } from 'lucide-react';

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
        if (stats[index]) {
            stats[index] = { ...stats[index], [field]: value };
            updateNightConfig({ nightStats: stats });
        }
    };

    const removeNightStat = (index: number) => {
        const stats = (event.timeVariant?.nightStats || []).filter((_, i) => i !== index);
        updateNightConfig({ nightStats: stats });
    };

    return (
        <div className={`mt-6 p-4 border transition-all relative ${event.timeVariant?.enabled ? 'bg-indigo-950/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-zinc-900/30 border-zinc-800 opacity-60'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 border ${event.timeVariant?.enabled ? 'border-indigo-500 text-indigo-400' : 'border-zinc-600 text-zinc-600'}`}>
                        <Moon className="w-4 h-4" />
                    </div>
                    <div>
                        <span className={`text-[8px] font-mono uppercase tracking-widest block mb-0.5 ${event.timeVariant?.enabled ? 'text-indigo-500' : 'text-zinc-500'}`}>TEMPORAL_SHIFT</span>
                        <h3 className={`text-sm font-black uppercase tracking-widest ${event.timeVariant?.enabled ? 'text-white' : 'text-zinc-400'}`}>Night Protocol v2.0</h3>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={event.timeVariant?.enabled || false}
                        onChange={(e) => updateNightConfig({ enabled: e.target.checked })}
                    />
                    <div className="w-8 h-4 bg-zinc-900 peer-focus:outline-none border border-zinc-700 peer peer-checked:border-indigo-500 peer-checked:bg-indigo-900/50 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-zinc-500 after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-indigo-400"></div>
                </label>
            </div>

            {event.timeVariant?.enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border-t border-indigo-500/10 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black border border-zinc-800 p-2 group hover:border-indigo-500 transition-colors">
                            <label className="text-[8px] text-zinc-500 group-hover:text-indigo-400 uppercase font-black tracking-widest mb-1 block">TITLE OVERRIDE</label>
                            <input
                                value={event.timeVariant.nightTitle || ''}
                                onChange={(e) => updateNightConfig({ nightTitle: e.target.value })}
                                placeholder="UNCHANGED"
                                className="w-full bg-transparent text-white text-xs font-bold outline-none placeholder-zinc-800"
                            />
                        </div>
                        <div className="bg-black border border-zinc-800 p-2 group hover:border-indigo-500 transition-colors">
                            <label className="text-[8px] text-zinc-500 group-hover:text-indigo-400 uppercase font-black tracking-widest mb-1 block">TYPE OVERRIDE</label>
                            <select
                                value={event.timeVariant.nightType || ''}
                                onChange={(e) => updateNightConfig({ nightType: e.target.value ? e.target.value as any : undefined })}
                                className="w-full bg-transparent text-white text-xs font-mono uppercase outline-none"
                            >
                                <option value="">UNCHANGED</option>
                                {Object.values(GameEventType).map((t) => (
                                    <option key={t} value={t} className="bg-black">{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black border border-zinc-800 p-2 group hover:border-indigo-500 transition-colors">
                            <label className="text-[8px] text-zinc-500 group-hover:text-indigo-400 uppercase font-black tracking-widest mb-1 block">FLAVOR TEXT OVERRIDE</label>
                            <input
                                value={event.timeVariant.nightFlavorText || ''}
                                onChange={(e) => updateNightConfig({ nightFlavorText: e.target.value })}
                                placeholder="..."
                                className="w-full bg-transparent text-zinc-400 italic text-xs outline-none placeholder-zinc-800"
                            />
                        </div>
                        <div className="bg-black border border-zinc-800 p-2 group hover:border-indigo-500 transition-colors">
                            <label className="text-[8px] text-zinc-500 group-hover:text-indigo-400 uppercase font-black tracking-widest mb-1 block">RARITY OVERRIDE</label>
                            <select
                                value={event.timeVariant.nightRarity || ''}
                                onChange={(e) => updateNightConfig({ nightRarity: e.target.value ? e.target.value as any : undefined })}
                                className="w-full bg-transparent text-white text-xs font-mono outline-none"
                            >
                                <option value="">UNCHANGED</option>
                                {['Common', 'Rare', 'Epic', 'Legendary'].map(r => (
                                    <option key={r} value={r} className="bg-black">{r.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-black border border-zinc-800 p-2 group hover:border-indigo-500 transition-colors">
                        <label className="text-[8px] text-zinc-500 group-hover:text-indigo-400 uppercase font-black tracking-widest mb-1 block">DESCRIPTION OVERRIDE</label>
                        <textarea
                            value={event.timeVariant.nightDescription || ''}
                            onChange={(e) => updateNightConfig({ nightDescription: e.target.value })}
                            placeholder="UNCHANGED"
                            className="w-full bg-transparent text-zinc-300 text-xs font-mono outline-none resize-none placeholder-zinc-800"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[8px] text-indigo-300 uppercase font-black tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" /> NIGHT STATS (REPLACES ORIGINALS)
                            </label>
                            <button
                                type="button"
                                onClick={addNightStat}
                                className="text-[8px] bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 px-2 py-1 border border-indigo-500/30 font-bold uppercase transition-colors"
                            >
                                + ADD STAT
                            </button>
                        </div>

                        {event.timeVariant.nightStats?.length === 0 && (
                            <div className="text-zinc-700 text-[9px] uppercase font-bold text-center py-2 border border-dashed border-zinc-800">
                                NO NIGHT STATS
                            </div>
                        )}

                        {event.timeVariant.nightStats?.map((stat, idx) => (
                            <div key={idx} className="flex gap-0 items-center bg-black border border-zinc-800 hover:border-indigo-500 transition-colors">
                                <input
                                    value={stat.label}
                                    onChange={(e) => updateNightStat(idx, 'label', e.target.value)}
                                    className="w-20 bg-transparent border-r border-zinc-800 p-2 text-[9px] font-black text-indigo-300 uppercase font-mono outline-none"
                                    placeholder="TAG"
                                />
                                <input
                                    value={stat.value}
                                    onChange={(e) => updateNightStat(idx, 'value', e.target.value)}
                                    className="flex-1 bg-transparent px-2 py-2 text-xs text-white font-mono outline-none focus:bg-white/5"
                                    placeholder="VAL"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeNightStat(idx)}
                                    className="text-zinc-600 p-2 hover:text-red-500 transition-colors border-l border-zinc-800"
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


import React from 'react';
import { GameEvent, DilemmaOption, DilemmaReward } from '../../types';
import { Split, User, Globe, X, Percent, Skull, Plus } from 'lucide-react';

interface DilemmaPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
}

const DilemmaPanel: React.FC<DilemmaPanelProps> = ({ event, onUpdate }) => {

    const addDilemmaOption = () => {
        const newOption: DilemmaOption = {
            label: `Volba ${(event.dilemmaOptions?.length || 0) + 1}`,
            successChance: 100,
            consequenceText: 'Úspěch!',
            rewards: [],
            failMessage: 'Nezdařilo se.',
            failDamage: 0,
            physicalInstruction: ''
        };
        onUpdate({
            dilemmaOptions: [...(event.dilemmaOptions || []), newOption]
        });
    };

    const updateOption = (index: number, updates: Partial<DilemmaOption>) => {
        const updatedOptions = [...(event.dilemmaOptions || [])];
        updatedOptions[index] = { ...updatedOptions[index], ...updates };
        onUpdate({ dilemmaOptions: updatedOptions });
    };

    const removeDilemmaOption = (index: number) => {
        onUpdate({
            dilemmaOptions: (event.dilemmaOptions || []).filter((_, i) => i !== index)
        });
    };

    // Reward Management Helpers
    const addReward = (optIndex: number) => {
        const options = [...(event.dilemmaOptions || [])];
        if (!options[optIndex].rewards) {
            options[optIndex].rewards = [];
        }
        options[optIndex].rewards!.push({ type: 'GOLD', value: 10 });
        onUpdate({ dilemmaOptions: options });
    };

    const updateReward = (optIndex: number, rewIndex: number, field: keyof DilemmaReward, value: any) => {
        const options = [...(event.dilemmaOptions || [])];
        if (options[optIndex].rewards) {
            options[optIndex].rewards![rewIndex] = { ...options[optIndex].rewards![rewIndex], [field]: value };
            onUpdate({ dilemmaOptions: options });
        }
    };

    const removeReward = (optIndex: number, rewIndex: number) => {
        const options = [...(event.dilemmaOptions || [])];
        if (options[optIndex].rewards) {
            options[optIndex].rewards = options[optIndex].rewards!.filter((_, i) => i !== rewIndex);
            onUpdate({ dilemmaOptions: options });
        }
    };

    return (
        <div className="bg-gradient-to-br from-purple-900/30 to-black border border-purple-700 rounded-xl p-5 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
            <div className="flex items-center gap-3 mb-4 text-neon-purple border-b border-purple-900/50 pb-2">
                <Split className="w-6 h-6" />
                <h3 className="font-display font-bold uppercase tracking-widest">Editor Křižovatky</h3>
            </div>

            {/* DILEMMA SCOPE */}
            <div className="mb-6 p-3 bg-black/40 rounded border border-purple-500/30 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Dosah Dilematu</span>
                    <span className="text-[10px] text-zinc-500">Kdo má toto dilema řešit?</span>
                </div>
                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-700">
                    <button
                        type="button"
                        onClick={() => onUpdate({ dilemmaScope: 'INDIVIDUAL' })}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-2 transition-all ${event.dilemmaScope === 'INDIVIDUAL' ? 'bg-purple-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <User className="w-3 h-3" /> Jen Hráč
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate({ dilemmaScope: 'GLOBAL' })}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-2 transition-all ${event.dilemmaScope === 'GLOBAL' ? 'bg-purple-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <Globe className="w-3 h-3" /> Všichni
                    </button>
                </div>
            </div>

            {/* OPTIONS LIST */}
            <div className="space-y-6">
                {event.dilemmaOptions?.map((opt, idx) => (
                    <div key={idx} className="bg-black/40 border border-purple-500/30 rounded-xl overflow-hidden animate-in slide-in-from-left-4">
                        
                        {/* Option Header */}
                        <div className="bg-purple-900/20 p-3 border-b border-purple-500/20 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px] font-black uppercase">Volba {String.fromCharCode(65+idx)}</span>
                                <input
                                    value={opt.label}
                                    onChange={(e) => updateOption(idx, { label: e.target.value })}
                                    placeholder="Název akce (např. Zaútočit)"
                                    className="bg-transparent border-b border-transparent hover:border-purple-500/50 focus:border-purple-500 text-white font-bold text-sm outline-none px-1"
                                />
                            </div>
                            <button onClick={() => removeDilemmaOption(idx)} className="text-red-500 hover:text-red-400 p-1"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-4 space-y-6">
                            
                            {/* 1. SUCCESS CHANCE */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                    <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> Šance na úspěch</span>
                                    <span className={opt.successChance < 100 ? 'text-orange-400' : 'text-green-400'}>{opt.successChance}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="100" step="5"
                                    value={opt.successChance}
                                    onChange={(e) => updateOption(idx, { successChance: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>

                            {/* 2. SUCCESS OUTCOME */}
                            <div className="grid grid-cols-1 gap-4 p-3 bg-green-900/10 border border-green-500/20 rounded-lg">
                                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Při Úspěchu</span>
                                <textarea
                                    value={opt.consequenceText}
                                    onChange={(e) => updateOption(idx, { consequenceText: e.target.value })}
                                    placeholder="Příběhový text při úspěchu..."
                                    className="w-full bg-black/50 border border-green-900/50 rounded p-2 text-zinc-300 text-xs focus:border-green-500 outline-none"
                                    rows={2}
                                />
                                
                                {/* REWARDS LIST */}
                                <div className="space-y-2">
                                    {opt.rewards?.map((rew, rIdx) => (
                                        <div key={rIdx} className="flex gap-2 items-center">
                                            <select 
                                                value={rew.type}
                                                onChange={(e) => updateReward(idx, rIdx, 'type', e.target.value)}
                                                className="bg-black border border-zinc-700 text-white text-[10px] p-1.5 rounded uppercase font-bold outline-none"
                                            >
                                                <option value="GOLD">Gold</option>
                                                <option value="HP">HP</option>
                                                <option value="MANA">Mana</option>
                                            </select>
                                            <input 
                                                type="number"
                                                value={rew.value}
                                                onChange={(e) => updateReward(idx, rIdx, 'value', parseInt(e.target.value))}
                                                className="w-16 bg-black border border-zinc-700 text-white text-[10px] p-1.5 rounded font-mono"
                                                placeholder="Val"
                                            />
                                            <button onClick={() => removeReward(idx, rIdx)} className="text-zinc-600 hover:text-red-500"><X className="w-3 h-3"/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => addReward(idx)} className="text-[9px] font-bold text-green-400 hover:text-green-300 flex items-center gap-1 uppercase tracking-wider">
                                        <Plus className="w-3 h-3" /> Přidat Odměnu
                                    </button>
                                </div>
                            </div>

                            {/* 3. FAIL OUTCOME (Only if chance < 100) */}
                            {opt.successChance < 100 && (
                                <div className="grid grid-cols-1 gap-4 p-3 bg-red-900/10 border border-red-500/20 rounded-lg animate-in fade-in">
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><Skull className="w-3 h-3"/> Při Neúspěchu</span>
                                    <textarea
                                        value={opt.failMessage || ''}
                                        onChange={(e) => updateOption(idx, { failMessage: e.target.value })}
                                        placeholder="Příběhový text při selhání..."
                                        className="w-full bg-black/50 border border-red-900/50 rounded p-2 text-zinc-300 text-xs focus:border-red-500 outline-none"
                                        rows={2}
                                    />
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] text-red-400 uppercase font-bold">Poškození (DMG):</label>
                                        <input
                                            type="number"
                                            value={opt.failDamage || 0}
                                            onChange={(e) => updateOption(idx, { failDamage: parseInt(e.target.value) })}
                                            className="w-20 bg-black/50 border border-red-900/50 rounded p-1.5 text-red-500 text-xs font-mono font-bold"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 4. BOARD INSTRUCTION */}
                            <div className="p-3 bg-yellow-900/10 border border-yellow-700/30 rounded-lg">
                                <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest block mb-2">Instrukce pro desku (Volitelné)</span>
                                <textarea
                                    value={opt.physicalInstruction || ''}
                                    onChange={(e) => updateOption(idx, { physicalInstruction: e.target.value })}
                                    placeholder="Např: Posuň figurku o 3 pole zpět..."
                                    className="w-full bg-black/50 border border-yellow-900/50 rounded p-2 text-yellow-200 text-xs font-mono focus:border-yellow-500 outline-none"
                                    rows={1}
                                />
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            <button type="button" onClick={addDilemmaOption} className="w-full mt-6 py-3 bg-purple-600 hover:bg-purple-500 text-black font-black uppercase text-xs rounded-xl shadow-lg shadow-purple-500/20 transition-all">
                + Přidat Novou Cestu
            </button>
        </div>
    );
};

export default DilemmaPanel;

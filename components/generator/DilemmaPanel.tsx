
import React from 'react';
import { GameEvent, DilemmaOption, DilemmaReward } from '../../types';
import { Split, User, Globe, X, Percent, Skull, AlertTriangle, ArrowRight } from 'lucide-react';

interface DilemmaPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
}

const DilemmaPanel: React.FC<DilemmaPanelProps> = ({ event, onUpdate }) => {

    const addDilemmaOption = () => {
        const newOption: DilemmaOption = {
            label: `OPTION ${(event.dilemmaOptions?.length || 0) + 1}`,
            successChance: 100,
            consequenceText: 'Mission Successful.',
            rewards: [],
            failMessage: 'Mission Failed.',
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
        <div className="bg-black border border-white/10 p-6 relative shadow-lg">
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Split className="w-32 h-32 text-purple-500" />
            </div>

            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <div className="p-2 border border-purple-500 text-purple-500">
                    <Split className="w-6 h-6" />
                </div>
                <div>
                    <span className="text-[9px] font-mono text-purple-800 uppercase tracking-widest block mb-0.5">NARRATIVE_BRANCHING</span>
                    <h3 className="text-xl font-display font-black uppercase tracking-widest text-white">Dilemma Editor</h3>
                </div>
            </div>

            {/* DILEMMA SCOPE */}
            <div className="mb-6 p-4 bg-zinc-900/30 border-l-2 border-purple-500 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">DECISION SCOPE</span>
                    <span className="text-[9px] text-zinc-500 font-mono">Select target audience validation</span>
                </div>
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={() => onUpdate({ dilemmaScope: 'INDIVIDUAL' })}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${event.dilemmaScope === 'INDIVIDUAL' ? 'bg-purple-600 text-black border-purple-600' : 'bg-black text-zinc-500 border-zinc-800 hover:border-white'}`}
                    >
                        <User className="w-3 h-3" /> Solo
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate({ dilemmaScope: 'GLOBAL' })}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${event.dilemmaScope === 'GLOBAL' ? 'bg-purple-600 text-black border-purple-600' : 'bg-black text-zinc-500 border-zinc-800 hover:border-white'}`}
                    >
                        <Globe className="w-3 h-3" /> Global
                    </button>
                </div>
            </div>

            {/* OPTIONS LIST */}
            <div className="space-y-6">
                {event.dilemmaOptions?.map((opt, idx) => (
                    <div key={idx} className="bg-black border border-purple-500/20 hover:border-purple-500/50 transition-colors relative group">

                        {/* Option Header */}
                        <div className="bg-purple-950/10 p-3 border-b border-purple-500/10 flex justify-between items-center">
                            <div className="flex items-center gap-3 w-full">
                                <span className="text-[9px] font-mono font-bold text-purple-500 bg-black px-2 py-1 border border-purple-900">OPT_0{idx + 1}</span>
                                <input
                                    value={opt.label}
                                    onChange={(e) => updateOption(idx, { label: e.target.value })}
                                    placeholder="ENTER OPTION LABEL"
                                    className="bg-transparent text-white font-bold text-sm uppercase tracking-wider outline-none w-full placeholder-zinc-700"
                                />
                            </div>
                            <button onClick={() => removeDilemmaOption(idx)} className="text-zinc-600 hover:text-red-500 p-2"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-4 space-y-6">

                            {/* 1. SUCCESS CHANCE */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                    <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> SUCCESS_PROBABILITY</span>
                                    <span className={`font-mono ${opt.successChance < 100 ? 'text-orange-400' : 'text-green-400'}`}>{opt.successChance}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="100" step="5"
                                    value={opt.successChance}
                                    onChange={(e) => updateOption(idx, { successChance: parseInt(e.target.value) })}
                                    className="w-full h-1 bg-zinc-800 rounded-none appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 2. SUCCESS OUTCOME */}
                                <div className="space-y-3">
                                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-2 border-b border-green-900/30 pb-1">
                                        <AlertTriangle className="w-3 h-3" /> ON SUCCESS
                                    </span>
                                    <textarea
                                        value={opt.consequenceText}
                                        onChange={(e) => updateOption(idx, { consequenceText: e.target.value })}
                                        placeholder="Narrative outcome..."
                                        className="w-full bg-black border border-green-900/30 p-2 text-zinc-300 text-xs font-mono focus:border-green-500 outline-none resize-none"
                                        rows={3}
                                    />

                                    {/* REWARDS LIST */}
                                    <div className="space-y-1">
                                        {opt.rewards?.map((rew, rIdx) => (
                                            <div key={rIdx} className="flex gap-0 items-center border border-zinc-800">
                                                <select
                                                    value={rew.type}
                                                    onChange={(e) => updateReward(idx, rIdx, 'type', e.target.value)}
                                                    className="bg-black text-zinc-400 text-[10px] uppercase font-bold px-2 py-1 outline-none border-r border-zinc-800 focus:text-white"
                                                >
                                                    <option value="HP">HP RECOVERY</option>
                                                    <option value="GOLD">CREDITS</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    value={rew.value}
                                                    onChange={(e) => updateReward(idx, rIdx, 'value', parseInt(e.target.value))}
                                                    className="w-12 bg-black text-white text-[10px] p-1 text-center font-mono outline-none"
                                                    placeholder="Val"
                                                />
                                                <button onClick={() => removeReward(idx, rIdx)} className="ml-auto px-2 text-zinc-600 hover:text-red-500"><X className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => addReward(idx)} className="w-full py-1 text-[9px] font-bold text-green-500 border border-dashed border-green-900/50 hover:bg-green-900/10 uppercase tracking-wider mt-2">
                                            + ADD REWARD
                                        </button>
                                    </div>
                                </div>

                                {/* 3. FAIL OUTCOME (Only if chance < 100) */}
                                <div className={`space-y-3 transition-opacity ${opt.successChance === 100 ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 border-b border-red-900/30 pb-1">
                                        <Skull className="w-3 h-3" /> ON FAILURE
                                    </span>
                                    <textarea
                                        value={opt.failMessage || ''}
                                        onChange={(e) => updateOption(idx, { failMessage: e.target.value })}
                                        placeholder="Failure narrative..."
                                        className="w-full bg-black border border-red-900/30 p-2 text-zinc-300 text-xs font-mono focus:border-red-500 outline-none resize-none"
                                        rows={3}
                                    />
                                    <div className="flex items-center justify-between bg-red-950/10 p-2 border border-red-900/20">
                                        <label className="text-[9px] text-red-400 uppercase font-bold">DAMAGE PENALTY:</label>
                                        <input
                                            type="number"
                                            value={opt.failDamage || 0}
                                            onChange={(e) => updateOption(idx, { failDamage: parseInt(e.target.value) })}
                                            className="w-16 bg-black border border-red-900/50 text-center text-red-500 text-xs font-mono font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. BOARD INSTRUCTION */}
                            <div className="pt-4 border-t border-zinc-800/50">
                                <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest block mb-2">PHYSICAL_BOARD_ACTION (OPTIONAL)</label>
                                <div className="bg-yellow-900/5 border border-yellow-700/20 p-2 flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4 text-yellow-600" />
                                    <input
                                        value={opt.physicalInstruction || ''}
                                        onChange={(e) => updateOption(idx, { physicalInstruction: e.target.value })}
                                        placeholder="e.g. Move token 3 spaces back..."
                                        className="w-full bg-transparent text-yellow-500 text-xs font-mono placeholder-yellow-900/50 outline-none"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            <button type="button" onClick={addDilemmaOption} className="w-full mt-6 py-4 bg-purple-900/20 border border-purple-500/50 hover:bg-purple-900/40 text-purple-400 font-black uppercase text-xs tracking-[0.2em] transition-all clip-path-button">
                + INITIALIZE NEW PATH
            </button>
        </div>
    );
};

export default DilemmaPanel;

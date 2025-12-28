
import React from 'react';
import { GameEvent, GameEventType, BossPhase } from '../../types';
import { Crown, Heart, Swords, Shield, Zap, X, Skull, Dice5, Wind, Target } from 'lucide-react';

interface CombatPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
}

const CombatPanel: React.FC<CombatPanelProps> = ({ event, onUpdate }) => {
    const isBoss = event.type === GameEventType.BOSS;
    const isTrap = event.type === GameEventType.TRAP;
    const fleeChance = (() => { switch (event.rarity) { case 'Legendary': return 10; case 'Epic': return 30; case 'Rare': return 50; default: return 80; } })();

    const getSpecificStatValue = (label: string): string => {
        return event.stats?.find(s => s.label === label)?.value.toString() || '';
    };

    const setSpecificStat = (label: string, value: string) => {
        const currentStats = event.stats ? [...event.stats] : [];
        const filteredStats = currentStats.filter(s => s.label !== label);
        if (value && value !== '0') {
            filteredStats.unshift({ label, value });
        }
        onUpdate({ stats: filteredStats });
    };

    const updateCombatConfig = (field: string, value: any) => {
        onUpdate({
            combatConfig: {
                ...(event.combatConfig || { defBreakChance: 0 }),
                [field]: value
            }
        });
    };

    // Boss Phase Logic
    const addBossPhase = () => {
        const newPhase: BossPhase = {
            name: 'Nová Fáze',
            description: 'Boss se rozzuří...',
            triggerType: 'HP_PERCENT',
            triggerValue: 50,
            damageBonus: 5
        };
        onUpdate({ bossPhases: [...(event.bossPhases || []), newPhase] });
    };

    const updateBossPhase = (index: number, field: keyof BossPhase, value: any) => {
        const updatedPhases = [...(event.bossPhases || [])];
        updatedPhases[index] = { ...updatedPhases[index], [field]: value };
        onUpdate({ bossPhases: updatedPhases });
    };

    const removeBossPhase = (index: number) => {
        onUpdate({ bossPhases: (event.bossPhases || []).filter((_, i) => i !== index) });
    };

    if (isBoss) {
        return (
            <div className="bg-black border border-red-500/50 p-6 relative shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                <div className="flex items-center gap-3 mb-6 text-red-500 border-b border-red-900/50 pb-4">
                    <Crown className="w-8 h-8" />
                    <div>
                        <span className="text-[10px] font-mono text-red-800 uppercase tracking-widest block mb-0.5">ELITE_THREAT_DETECTED</span>
                        <h3 className="text-xl font-display font-black uppercase tracking-widest">Ultimate Boss</h3>
                    </div>
                </div>

                {/* Base Stats */}
                <div className="grid grid-cols-3 gap-0 border border-red-900/50 mb-6 bg-red-950/10">
                    <div className="p-4 text-center border-r border-red-900/50">
                        <Heart className="w-5 h-5 text-red-500 mx-auto mb-2" />
                        <label className="block text-[9px] font-black uppercase text-red-900 mb-1">HEALTH_POOL</label>
                        <input type="number" value={getSpecificStatValue('HP')} onChange={(e) => setSpecificStat('HP', e.target.value)} placeholder="HP" className="w-full bg-transparent text-center text-white font-black font-mono text-2xl outline-none" />
                    </div>
                    <div className="p-4 text-center border-r border-red-900/50">
                        <Swords className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                        <label className="block text-[9px] font-black uppercase text-orange-900 mb-1">STRIKE_FORCE</label>
                        <input type="number" value={getSpecificStatValue('ATK')} onChange={(e) => setSpecificStat('ATK', e.target.value)} placeholder="ATK" className="w-full bg-transparent text-center text-white font-black font-mono text-2xl outline-none" />
                    </div>
                    <div className="p-4 text-center">
                        <Shield className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                        <label className="block text-[9px] font-black uppercase text-blue-900 mb-1">MITIGATION</label>
                        <input type="number" value={getSpecificStatValue('DEF')} onChange={(e) => setSpecificStat('DEF', e.target.value)} placeholder="DEF" className="w-full bg-transparent text-center text-white font-black font-mono text-2xl outline-none" />
                    </div>
                </div>

                {/* Phases */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-red-900/30 pb-2"><Zap className="w-4 h-4" /> COMBAT_PHASES</h4>
                    {event.bossPhases?.map((phase, idx) => (
                        <div key={idx} className="bg-black border-l-2 border-red-500 pl-4 py-2 pr-2 relative group hover:bg-white/5 transition-colors">
                            <button type="button" onClick={() => removeBossPhase(idx)} className="absolute top-2 right-2 text-zinc-600 hover:text-red-500"><X className="w-4 h-4" /></button>
                            <div className="grid grid-cols-[2fr_1fr] gap-4 mb-2">
                                <div>
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">PHASE NAME</label>
                                    <input
                                        placeholder="Enter Phase Name"
                                        value={phase.name}
                                        onChange={(e) => updateBossPhase(idx, 'name', e.target.value)}
                                        className="bg-transparent border-b border-zinc-800 w-full text-white text-sm font-bold uppercase outline-none focus:border-red-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-zinc-500 uppercase font-bold mb-1">TRIGGER @ HP%</span>
                                    <input
                                        type="number"
                                        value={phase.triggerValue}
                                        onChange={(e) => updateBossPhase(idx, 'triggerValue', parseInt(e.target.value))}
                                        className="bg-zinc-900 border border-zinc-700 w-16 text-center text-white font-mono text-sm p-1 outline-none focus:border-red-500"
                                    />
                                </div>
                            </div>
                            <div className="mb-2">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">TACTICAL DESCRIPTION</label>
                                <textarea
                                    placeholder="Describe boss behavior..."
                                    value={phase.description}
                                    onChange={(e) => updateBossPhase(idx, 'description', e.target.value)}
                                    className="w-full bg-transparent text-zinc-400 text-xs font-mono outline-none resize-none"
                                    rows={2}
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-red-950/20 p-2 inline-block border border-red-900/30">
                                <span className="text-[9px] text-red-400 uppercase font-bold">ENRAGE BONUS DMG:</span>
                                <input
                                    type="number"
                                    value={phase.damageBonus}
                                    onChange={(e) => updateBossPhase(idx, 'damageBonus', parseInt(e.target.value))}
                                    className="w-12 bg-transparent text-red-500 font-mono text-sm font-black text-center outline-none"
                                />
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addBossPhase} className="w-full py-3 bg-red-950/20 border border-red-900 text-red-500 font-black uppercase text-xs tracking-widest hover:bg-red-900/40 transition-colors clip-path-button">
                        + INITIALIZE NEW PHASE
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-black border border-white/10 p-5 relative shadow-lg">
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Skull className="w-24 h-24 text-white" />
            </div>

            <div className="flex items-center gap-3 mb-6 text-white border-b border-white/10 pb-4">
                <div className={`p-2 border ${isTrap ? 'border-arc-yellow text-arc-yellow' : 'border-red-500 text-red-500'}`}>
                    <Skull className="w-6 h-6" />
                </div>
                <div>
                    <span className={`text-[9px] font-mono uppercase tracking-widest block mb-0.5 ${isTrap ? 'text-arc-yellow' : 'text-red-500'}`}>{isTrap ? 'HAZARD_CONFIG' : 'HOSTILE_CONFIG'}</span>
                    <h3 className="text-xl font-display font-black uppercase tracking-widest">{isTrap ? "Trap Parameters" : "Enemy Stats"}</h3>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* HP */}
                <div className="bg-black border border-zinc-800 p-2 flex flex-col group hover:border-red-500 transition-colors">
                    <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest mb-1 flex items-center gap-1 group-hover:text-red-500">
                        <Heart className="w-3 h-3" /> {isTrap ? "DIFFICULTY" : "HP"}
                    </label>
                    <input
                        type="number"
                        placeholder="50"
                        value={getSpecificStatValue('HP')}
                        onChange={(e) => setSpecificStat('HP', e.target.value)}
                        className="bg-transparent text-white font-mono text-xl font-bold outline-none placeholder-zinc-800"
                    />
                </div>

                {/* ATK */}
                <div className="bg-black border border-zinc-800 p-2 flex flex-col group hover:border-orange-500 transition-colors">
                    <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest mb-1 flex items-center gap-1 group-hover:text-orange-500">
                        <Swords className="w-3 h-3" /> {isTrap ? "DMG" : "ATK"}
                    </label>
                    <input
                        type="number"
                        placeholder="10"
                        value={getSpecificStatValue('ATK')}
                        onChange={(e) => setSpecificStat('ATK', e.target.value)}
                        className="bg-transparent text-white font-mono text-xl font-bold outline-none placeholder-zinc-800"
                    />
                </div>

                {/* DEF */}
                <div className="bg-black border border-zinc-800 p-2 flex flex-col group hover:border-blue-500 transition-colors">
                    <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest mb-1 flex items-center gap-1 group-hover:text-blue-500">
                        <Shield className="w-3 h-3" /> {isTrap ? "RESIST" : "DEF"}
                    </label>
                    <input
                        type="number"
                        placeholder="0"
                        value={getSpecificStatValue('DEF')}
                        onChange={(e) => setSpecificStat('DEF', e.target.value)}
                        className="bg-transparent text-white font-mono text-xl font-bold outline-none placeholder-zinc-800"
                    />
                </div>
            </div>

            {/* DEFENSE BREAK CHANCE (PLAYER VS ENEMY) */}
            {!isTrap && (
                <div className="mb-6 bg-green-950/10 border-l-2 border-green-500 p-4">
                    <label className="text-[10px] uppercase font-bold text-green-500 flex items-center gap-2 mb-2 tracking-widest">
                        <Target className="w-4 h-4" /> WEAKNESS PROBABILITY
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0" max="100"
                            value={event.combatConfig?.defBreakChance || 0}
                            onChange={(e) => updateCombatConfig('defBreakChance', parseInt(e.target.value))}
                            className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                        <div className="bg-black border border-green-900 px-3 py-1 text-green-400 font-mono font-bold text-lg">
                            {event.combatConfig?.defBreakChance || 0}%
                        </div>
                    </div>
                </div>
            )}

            {/* HELP TEXT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                <div>
                    <h4 className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><Dice5 className="w-3 h-3" /> COMBAT MECHANICS</h4>
                    <ul className="text-zinc-600 space-y-1 text-[10px] font-mono border-l border-zinc-800 pl-2">
                        <li>ARMOR absorbs damage first.</li>
                        <li>DEF reduces incoming damage.</li>
                        <li>Weakness ignores Enemy DEF.</li>
                    </ul>
                </div>
                {!isTrap && (
                    <div>
                        <h4 className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><Wind className="w-3 h-3" /> ESCAPE PROBABILITY</h4>
                        <div className="flex items-center justify-between bg-black border border-zinc-900 p-2">
                            <span className="text-zinc-600 text-[10px] uppercase">Based on <span className="text-white">{event.rarity}</span> rarity</span>
                            <span className={`font-mono font-bold ${fleeChance < 30 ? 'text-red-500' : 'text-green-500'}`}>{fleeChance}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CombatPanel;

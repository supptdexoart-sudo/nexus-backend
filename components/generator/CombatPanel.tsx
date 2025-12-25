
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
            <div className="bg-gradient-to-br from-red-950 to-black border-2 border-red-800 rounded-xl p-6 shadow-[0_0_50px_rgba(153,27,27,0.3)]">
                <div className="flex items-center gap-3 mb-6 text-red-600 border-b border-red-900 pb-4">
                    <Crown className="w-8 h-8" />
                    <h3 className="text-xl font-display font-black uppercase tracking-widest">Ultimátní Boss</h3>
                </div>

                {/* Base Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-red-900/20 p-3 rounded border border-red-800 text-center">
                        <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                        <input type="number" value={getSpecificStatValue('HP')} onChange={(e) => setSpecificStat('HP', e.target.value)} placeholder="HP" className="w-full bg-transparent text-center text-white font-bold font-mono outline-none" />
                    </div>
                    <div className="bg-orange-900/20 p-3 rounded border border-orange-800 text-center">
                        <Swords className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                        <input type="number" value={getSpecificStatValue('ATK')} onChange={(e) => setSpecificStat('ATK', e.target.value)} placeholder="ATK" className="w-full bg-transparent text-center text-white font-bold font-mono outline-none" />
                    </div>
                    <div className="bg-blue-900/20 p-3 rounded border border-blue-800 text-center">
                        <Shield className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <input type="number" value={getSpecificStatValue('DEF')} onChange={(e) => setSpecificStat('DEF', e.target.value)} placeholder="DEF" className="w-full bg-transparent text-center text-white font-bold font-mono outline-none" />
                    </div>
                </div>

                {/* Phases */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest flex items-center gap-2"><Zap className="w-4 h-4" /> Fáze Boje</h4>
                    {event.bossPhases?.map((phase, idx) => (
                        <div key={idx} className="bg-black/60 border border-red-800/50 p-4 rounded-lg relative">
                            <button type="button" onClick={() => removeBossPhase(idx)} className="absolute top-2 right-2 text-red-500"><X className="w-4 h-4" /></button>
                            <div className="grid grid-cols-2 gap-4 mb-2">
                                <input
                                    placeholder="Název Fáze"
                                    value={phase.name}
                                    onChange={(e) => updateBossPhase(idx, 'name', e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm font-bold"
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500 uppercase">Spustit při % HP:</span>
                                    <input
                                        type="number"
                                        value={phase.triggerValue}
                                        onChange={(e) => updateBossPhase(idx, 'triggerValue', parseInt(e.target.value))}
                                        className="w-16 bg-zinc-900 border border-zinc-700 rounded p-2 text-white font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <textarea
                                placeholder="Popis schopnosti bosse v této fázi..."
                                value={phase.description}
                                onChange={(e) => updateBossPhase(idx, 'description', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-400 text-xs mb-2"
                                rows={2}
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold">Bonusové Poškození:</span>
                                <input
                                    type="number"
                                    value={phase.damageBonus}
                                    onChange={(e) => updateBossPhase(idx, 'damageBonus', parseInt(e.target.value))}
                                    className="w-20 bg-red-900/20 border border-red-800 rounded p-1 text-red-400 font-mono text-sm"
                                />
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addBossPhase} className="w-full py-3 bg-red-900/30 border border-red-600 text-red-400 font-bold uppercase rounded hover:bg-red-900/50 transition-colors">
                        + Přidat Fázi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-red-950/40 to-black border border-red-900 rounded-xl p-5 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
            <div className="flex items-center gap-3 mb-4 text-red-500 border-b border-red-900/50 pb-2">
                <Skull className="w-6 h-6" />
                <h3 className="font-display font-bold uppercase tracking-widest">Konfigurace {isTrap ? "Pasti" : "Nepřítele"}</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                {/* HP */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-500" /> {isTrap ? "Obtížnost" : "Zdraví (HP)"}
                    </label>
                    <input
                        type="number"
                        placeholder="50"
                        value={getSpecificStatValue('HP')}
                        onChange={(e) => setSpecificStat('HP', e.target.value)}
                        className="bg-black border border-zinc-800 rounded p-2 text-white font-mono focus:border-red-500 outline-none"
                    />
                </div>

                {/* ATK */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                        <Swords className="w-3 h-3 text-orange-500" /> {isTrap ? "Poškození" : "Útok (ATK)"}
                    </label>
                    <input
                        type="number"
                        placeholder="10"
                        value={getSpecificStatValue('ATK')}
                        onChange={(e) => setSpecificStat('ATK', e.target.value)}
                        className="bg-black border border-zinc-800 rounded p-2 text-white font-mono focus:border-orange-500 outline-none"
                    />
                </div>

                {/* DEF */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-blue-500" /> {isTrap ? "Odolnost" : "Obrana (DEF)"}
                    </label>
                    <input
                        type="number"
                        placeholder="0"
                        value={getSpecificStatValue('DEF')}
                        onChange={(e) => setSpecificStat('DEF', e.target.value)}
                        className="bg-black border border-zinc-800 rounded p-2 text-white font-mono focus:border-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* DEFENSE BREAK CHANCE (PLAYER VS ENEMY) */}
            {!isTrap && (
                <div className="mb-4 bg-green-900/10 p-3 rounded border border-green-900/30">
                    <label className="text-[10px] uppercase font-bold text-green-400 flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4" /> % Šance na rozbití obrany nepřítele (Weakness)
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0" max="100"
                            value={event.combatConfig?.defBreakChance || 0}
                            onChange={(e) => updateCombatConfig('defBreakChance', parseInt(e.target.value))}
                            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                        <span className="text-sm font-mono font-bold text-white w-12 text-right">
                            {event.combatConfig?.defBreakChance || 0}%
                        </span>
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-1 leading-tight">
                        Šance pro <strong>HRÁČE</strong>, že při útoku zcela ignoruje obranu tohoto nepřítele (Critical Weakness).
                    </p>
                </div>
            )}

            {/* HELP TEXT */}
            <div className="flex flex-col sm:flex-row gap-4 text-xs bg-black/40 p-3 rounded border border-zinc-800/50">
                <div className="flex-1">
                    <h4 className="font-bold text-zinc-400 mb-1 flex items-center gap-1"><Dice5 className="w-3 h-3" /> Mechanika Souboje</h4>
                    <ul className="text-zinc-600 space-y-1 list-disc pl-3">
                        <li>Hráč má štíty (ARMOR), které se ničí jako první.</li>
                        <li>Nepřítel má DEF, která snižuje DMG hráče.</li>
                        <li>Weakness = Šance hráče ignorovat DEF nepřítele.</li>
                    </ul>
                </div>
                {!isTrap && (
                    <div className="flex-1 border-l border-zinc-800 pl-4">
                        <h4 className="font-bold text-zinc-400 mb-1 flex items-center gap-1"><Wind className="w-3 h-3" /> Šance na Útěk</h4>
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-500">Závisí na vzácnosti:</span>
                            <span className={`font-mono font-bold ${fleeChance < 30 ? 'text-red-500' : 'text-green-500'}`}>{fleeChance}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CombatPanel;

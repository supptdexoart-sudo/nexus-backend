import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { Character, CharacterPerk } from '../../types';

interface CharacterCreatorProps {
    character: Character | null;
    onSave: (character: Character) => Promise<void>;
    onClose: () => void;
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ character, onSave, onClose }) => {
    const [formData, setFormData] = useState<Character>(character || {
        characterId: '',
        adminEmail: '',
        name: '',
        description: '',
        imageUrl: '',
        baseStats: {
            hp: 100,
            mana: 100,
            armor: 0,
            damage: 10,
            critChance: 5,
            speed: 50
        },
        perks: [],
        timeVariant: {
            enabled: false,
            nightModifiers: {
                statChanges: [],
                additionalPerks: []
            }
        }
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleStatChange = (stat: keyof Character['baseStats'], value: number) => {
        setFormData(prev => ({
            ...prev,
            baseStats: { ...prev.baseStats, [stat]: value }
        }));
    };

    const addPerk = () => {
        setFormData(prev => ({
            ...prev,
            perks: [...prev.perks, {
                name: '',
                description: '',
                effect: {
                    stat: 'damage',
                    modifier: 0,
                    isPercentage: false,
                    condition: 'always'
                }
            }]
        }));
    };

    const updatePerk = (index: number, perk: CharacterPerk) => {
        setFormData(prev => ({
            ...prev,
            perks: prev.perks.map((p, i) => i === index ? perk : p)
        }));
    };

    const removePerk = (index: number) => {
        setFormData(prev => ({
            ...prev,
            perks: prev.perks.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('Jméno postavy je povinné!');
            return;
        }
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-y-auto">
            <div className="min-h-screen p-6 pt-36 pb-32">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black uppercase tracking-wider text-white">
                            {character ? 'Upravit postavu' : 'Nová postava'}
                        </h2>
                        <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    {/* Basic Info */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-6">
                        <h3 className="text-sm font-black uppercase text-signal-cyan mb-4">Základní informace</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Jméno postavy *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white outline-none focus:border-signal-cyan"
                                    placeholder="např. Temný rytíř"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Popis</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white outline-none focus:border-signal-cyan h-24 resize-none"
                                    placeholder="Popis postavy..."
                                />
                            </div>
                            {character && (
                                <div className="text-xs text-zinc-500 font-mono">
                                    ID: {character.characterId}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Base Stats */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-6">
                        <h3 className="text-sm font-black uppercase text-signal-cyan mb-4">Základní statistiky</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(formData.baseStats).map(([stat, value]) => (
                                <div key={stat}>
                                    <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">
                                        {stat === 'hp' ? 'HP' :
                                            stat === 'mana' ? 'Mana' :
                                                stat === 'armor' ? 'Armor' :
                                                    stat === 'damage' ? 'Damage' :
                                                        stat === 'critChance' ? 'Crit %' :
                                                            'Speed'}
                                    </label>
                                    <input
                                        type="number"
                                        value={value}
                                        onChange={(e) => handleStatChange(stat as keyof Character['baseStats'], parseInt(e.target.value) || 0)}
                                        className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-signal-cyan"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Perks */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black uppercase text-signal-cyan">Výhody / Nevýhody</h3>
                            <button
                                onClick={addPerk}
                                className="flex items-center gap-2 px-3 py-2 bg-signal-cyan text-black rounded-lg text-xs font-bold uppercase hover:bg-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Přidat
                            </button>
                        </div>
                        <div className="space-y-4">
                            {formData.perks.map((perk, index) => (
                                <div key={index} className="bg-black/50 border border-zinc-700 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-xs font-bold text-zinc-500">Perk #{index + 1}</span>
                                        <button
                                            onClick={() => removePerk(index)}
                                            className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            value={perk.name}
                                            onChange={(e) => updatePerk(index, { ...perk, name: e.target.value })}
                                            placeholder="Název perku"
                                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm outline-none focus:border-signal-cyan"
                                        />
                                        <input
                                            type="text"
                                            value={perk.description}
                                            onChange={(e) => updatePerk(index, { ...perk, description: e.target.value })}
                                            placeholder="Popis"
                                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm outline-none focus:border-signal-cyan"
                                        />
                                        <select
                                            value={perk.effect.stat}
                                            onChange={(e) => updatePerk(index, { ...perk, effect: { ...perk.effect, stat: e.target.value } })}
                                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm outline-none focus:border-signal-cyan"
                                        >
                                            <option value="damage">Damage</option>
                                            <option value="hp">HP</option>
                                            <option value="armor">Armor</option>
                                            <option value="mana">Mana</option>
                                            <option value="critChance">Crit Chance</option>
                                            <option value="speed">Speed</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={perk.effect.modifier}
                                                onChange={(e) => updatePerk(index, { ...perk, effect: { ...perk.effect, modifier: parseFloat(e.target.value) || 0 } })}
                                                placeholder="Hodnota"
                                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm outline-none focus:border-signal-cyan"
                                            />
                                            <select
                                                value={perk.effect.isPercentage ? 'percent' : 'absolute'}
                                                onChange={(e) => updatePerk(index, { ...perk, effect: { ...perk.effect, isPercentage: e.target.value === 'percent' } })}
                                                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm outline-none focus:border-signal-cyan"
                                            >
                                                <option value="absolute">+/-</option>
                                                <option value="percent">%</option>
                                            </select>
                                        </div>
                                        <select
                                            value={perk.effect.condition || 'always'}
                                            onChange={(e) => updatePerk(index, { ...perk, effect: { ...perk.effect, condition: e.target.value as any } })}
                                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm outline-none focus:border-signal-cyan md:col-span-2"
                                        >
                                            <option value="always">Vždy</option>
                                            <option value="night">V noci</option>
                                            <option value="day">Ve dne</option>
                                            <option value="combat">V boji</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {formData.perks.length === 0 && (
                                <div className="text-center py-8 text-zinc-600 text-sm">
                                    Zatím žádné perky. Klikni na "Přidat" pro vytvoření.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Day/Night Variant */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <input
                                type="checkbox"
                                checked={formData.timeVariant?.enabled || false}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    timeVariant: {
                                        ...formData.timeVariant!,
                                        enabled: e.target.checked
                                    }
                                })}
                                className="w-5 h-5"
                            />
                            <h3 className="text-sm font-black uppercase text-signal-cyan">Noční režim</h3>
                        </div>
                        {formData.timeVariant?.enabled && (
                            <div className="text-xs text-zinc-400 bg-black/30 p-3 rounded-lg">
                                <p className="mb-2">Noční režim je aktivní. Postava bude mít speciální vlastnosti během noci.</p>
                                <p className="text-zinc-500">Tip: Přidej perky s podmínkou "V noci" pro noční bonusy.</p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-signal-cyan text-black rounded-xl font-black uppercase hover:bg-white transition-colors disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            {isSaving ? 'Ukládám...' : 'Uložit postavu'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-4 bg-zinc-800 text-white rounded-xl font-black uppercase hover:bg-zinc-700 transition-colors"
                        >
                            Zrušit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterCreator;

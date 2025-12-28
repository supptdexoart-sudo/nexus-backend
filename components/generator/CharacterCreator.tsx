import React, { useState } from 'react';
import { X, Plus, Trash2, Save, User, FileText, Zap, Shield, Swords, Heart, Moon } from 'lucide-react';
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
            armor: 0,
            damage: 10
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
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md overflow-hidden">

            {/* BACKGROUND GRIDS */}
            <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            <div className="w-full max-w-5xl h-[90vh] bg-black border border-white/10 flex flex-col relative shadow-2xl overflow-hidden">

                {/* HEADER */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-arc-cyan/10 border border-arc-cyan/30">
                            <User className="w-5 h-5 text-arc-cyan" />
                        </div>
                        <div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">DATABASE_ENTRY_EDITOR</span>
                            <h2 className="text-2xl font-display font-black uppercase tracking-wider text-white leading-none">
                                {character ? 'EDITOVAŤ PROFIL' : 'NOVÝ OPERÁTOR'}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-zinc-900 border border-zinc-700 hover:border-white hover:bg-zinc-800 transition-colors group">
                        <X className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                    {/* Basic Info */}
                    <div className="bg-arc-panel/50 border border-white/5 p-6 relative group hover:border-white/10 transition-colors">
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20"></div>
                        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-2">
                            <FileText className="w-4 h-4 text-arc-cyan" />
                            <h3 className="text-xs font-black uppercase text-arc-cyan tracking-[0.2em]">IDENTITY_DATA</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[9px] font-bold uppercase text-zinc-500 tracking-widest mb-2">Code Name (Jméno) *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black border border-zinc-800 p-3 text-white font-mono text-sm outline-none focus:border-arc-cyan focus:bg-arc-cyan/5 transition-all"
                                    placeholder="Enter Designation..."
                                />
                            </div>
                            {character && (
                                <div>
                                    <label className="block text-[9px] font-bold uppercase text-zinc-500 tracking-widest mb-2">System ID</label>
                                    <div className="w-full bg-black/50 border border-zinc-900 p-3 text-zinc-600 font-mono text-xs select-all">
                                        {character.characterId}
                                    </div>
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <label className="block text-[9px] font-bold uppercase text-zinc-500 tracking-widest mb-2">Service Record (Popis)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-black border border-zinc-800 p-3 text-white font-mono text-sm outline-none focus:border-arc-cyan focus:bg-arc-cyan/5 transition-all h-24 resize-none"
                                    placeholder="Enter biographical data..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Base Stats */}
                    <div className="bg-arc-panel/50 border border-white/5 p-6 relative hover:border-white/10 transition-colors">
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20"></div>
                        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-2">
                            <Zap className="w-4 h-4 text-arc-yellow" />
                            <h3 className="text-xs font-black uppercase text-arc-yellow tracking-[0.2em]">COMBAT_PARAMETERS</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { id: 'hp', label: 'HIT POINTS', icon: Heart, color: 'text-red-500' },
                                { id: 'armor', label: 'ARMOR PLATING', icon: Shield, color: 'text-zinc-400' },
                                { id: 'damage', label: 'DAMAGE OUTPUT', icon: Swords, color: 'text-arc-yellow' }
                            ].map((stat) => (
                                <div key={stat.id} className="bg-black/40 border border-white/5 p-3 flex items-center justify-between group focus-within:border-white/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 bg-black border border-zinc-800 ${stat.color}`}>
                                            <stat.icon className="w-4 h-4" />
                                        </div>
                                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest group-hover:text-zinc-300 transition-colors">
                                            {stat.label}
                                        </label>
                                    </div>
                                    <input
                                        type="number"
                                        value={(formData.baseStats as any)[stat.id]}
                                        onChange={(e) => handleStatChange(stat.id as keyof Character['baseStats'], parseInt(e.target.value) || 0)}
                                        className={`w-20 bg-transparent border-b border-zinc-800 text-right text-lg font-mono font-bold text-white outline-none focus:border-${stat.id === 'damage' ? 'arc-yellow' : stat.id === 'hp' ? 'red-500' : 'white'}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Perks */}
                    <div className="bg-arc-panel/50 border border-white/5 p-6 relative hover:border-white/10 transition-colors">
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20"></div>
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-2">
                            <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-teal-400" />
                                <h3 className="text-xs font-black uppercase text-teal-400 tracking-[0.2em]">SPECIAL_ABILITIES</h3>
                            </div>
                            <button
                                onClick={addPerk}
                                className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold uppercase hover:bg-teal-500 hover:text-black transition-all"
                            >
                                <Plus className="w-3 h-3" /> Add Module
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.perks.map((perk, index) => (
                                <div key={index} className="bg-black/60 border border-white/10 p-4 relative group hover:border-teal-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[9px] font-mono font-bold text-zinc-600 bg-black px-1 border border-zinc-800">MODULE_0{index + 1}</span>
                                        <button
                                            onClick={() => removePerk(index)}
                                            className="p-1 text-zinc-600 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <input
                                            type="text"
                                            value={perk.name}
                                            onChange={(e) => updatePerk(index, { ...perk, name: e.target.value })}
                                            placeholder="MODULE NAME"
                                            className="bg-transparent border-b border-zinc-800 py-1 text-sm font-bold text-white uppercase placeholder-zinc-700 outline-none focus:border-teal-500"
                                        />
                                        <div className="flex gap-2">
                                            <select
                                                value={perk.effect.stat}
                                                onChange={(e) => updatePerk(index, { ...perk, effect: { ...perk.effect, stat: e.target.value } })}
                                                className="bg-black border border-zinc-800 text-[10px] text-zinc-300 font-mono uppercase px-2 py-1 outline-none focus:border-teal-500"
                                            >
                                                <option value="damage">DMG MOD</option>
                                                <option value="hp">HP MOD</option>
                                                <option value="armor">ARMOR MOD</option>
                                            </select>
                                            <input
                                                type="number"
                                                value={perk.effect.modifier}
                                                onChange={(e) => updatePerk(index, { ...perk, effect: { ...perk.effect, modifier: parseFloat(e.target.value) || 0 } })}
                                                className="w-20 bg-black border border-zinc-800 text-[10px] text-white font-mono text-center px-1 outline-none focus:border-teal-500"
                                                placeholder="VAL"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                                        <input
                                            type="text"
                                            value={perk.description}
                                            onChange={(e) => updatePerk(index, { ...perk, description: e.target.value })}
                                            placeholder="EFFECT DESCRIPTION"
                                            className="bg-transparent border-b border-zinc-800 py-1 text-xs text-zinc-400 font-mono placeholder-zinc-700 outline-none focus:border-teal-500"
                                        />
                                        <select
                                            value={perk.effect.condition || 'always'}
                                            onChange={(e) => updatePerk(index, { ...perk, effect: { ...perk.effect, condition: e.target.value as any } })}
                                            className="bg-black border border-zinc-800 text-[10px] text-zinc-300 font-mono uppercase px-2 py-1 outline-none focus:border-teal-500"
                                        >
                                            <option value="always">ALWAYS ACTIVE</option>
                                            <option value="night">NIGHT ONLY</option>
                                            <option value="day">DAY ONLY</option>
                                            <option value="combat">COMBAT ONLY</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {formData.perks.length === 0 && (
                                <div className="text-center py-6 border border-dashed border-zinc-800">
                                    <p className="text-[10px] text-zinc-600 font-mono uppercase">NO MODULES INSTALLED</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Day/Night Variant */}
                    <div className={`border p-6 transition-all duration-300 ${formData.timeVariant?.enabled ? 'bg-indigo-950/10 border-indigo-500/30' : 'bg-black/50 border-zinc-800'}`}>
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <div className={`p-2 rounded border transition-colors ${formData.timeVariant?.enabled ? 'bg-indigo-500 text-black border-indigo-500' : 'bg-black border-zinc-700 text-zinc-600 group-hover:text-indigo-500'}`}>
                                <Moon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <span className={`text-xs font-black uppercase tracking-[0.2em] block mb-1 ${formData.timeVariant?.enabled ? 'text-indigo-400' : 'text-zinc-500'}`}>
                                    NIGHT_OPS_MODE
                                </span>
                                <span className="text-[10px] font-mono text-zinc-600">
                                    Enable specific modifiers during night cycle
                                </span>
                            </div>
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
                                className="hidden"
                            />
                            <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formData.timeVariant?.enabled ? 'bg-indigo-500' : 'bg-zinc-800'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${formData.timeVariant?.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </label>
                    </div>

                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-6 border-t border-white/10 bg-white/[0.02] flex gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-transparent border border-zinc-700 text-zinc-400 font-black uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-black hover:border-white transition-all flex items-center gap-2"
                    >
                        <X className="w-4 h-4" /> ABORT
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-4 bg-arc-cyan/90 hover:bg-arc-cyan text-black font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2 clip-path-button disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'PROCESSING...' : 'SAVE CONFIGURATION'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CharacterCreator;


import React from 'react';
import { GameEvent, GameEventType } from '../../types';
import { Globe, MapPin, Layers, Plus, Trash2, ArrowRight } from 'lucide-react';

interface PlanetPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
    masterCatalog: GameEvent[]; // Přidáno pro výběr
}

const PlanetPanel: React.FC<PlanetPanelProps> = ({ event, onUpdate, masterCatalog }) => {
    
    const updatePlanetConfig = (field: string, value: any) => {
        onUpdate({
            planetConfig: {
                ...(event.planetConfig || { 
                    planetId: 'p1', 
                    landingEventType: GameEventType.ENCOUNTER,
                    phases: []
                }),
                [field]: value
            }
        });
    };

    const addPhase = () => {
        const currentPhases = event.planetConfig?.phases || [];
        updatePlanetConfig('phases', [...currentPhases, '']);
    };

    const updatePhase = (index: number, eventId: string) => {
        const currentPhases = [...(event.planetConfig?.phases || [])];
        currentPhases[index] = eventId;
        updatePlanetConfig('phases', currentPhases);
    };

    const removePhase = (index: number) => {
        const currentPhases = (event.planetConfig?.phases || []).filter((_, i) => i !== index);
        updatePlanetConfig('phases', currentPhases);
    };

    // Filter available cards (NO PLANETS allowed inside a planet)
    const availableCards = masterCatalog.filter(i => i.type !== GameEventType.PLANET);

    return (
        <div className="space-y-4 bg-arc-panel p-5 border border-indigo-500/30 text-white shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            <div className="flex items-center gap-2 mb-2 text-indigo-400 border-b border-indigo-500/20 pb-2">
                <Globe className="w-5 h-5"/>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest">Konfigurace Planety (Kampaň):</h3>
            </div>
            
            <div className="mb-6">
                <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest flex items-center gap-1 mb-2"><MapPin className="w-3 h-3"/> Cílová Planeta (UI):</label>
                <select 
                    value={event.planetConfig?.planetId ?? 'p1'} 
                    onChange={(e) => updatePlanetConfig('planetId', e.target.value)} 
                    className="w-full bg-black border border-indigo-500/30 p-3 text-white text-xs font-mono focus:border-indigo-500 outline-none rounded"
                >
                    <option value="p1">p1 (Terra Nova - Obyvatelná)</option>
                    <option value="p2">p2 (Kepler-186f - Ledová)</option>
                    <option value="p3">p3 (Mars Outpost - Kolonie)</option>
                    <option value="p4">p4 (Black Nebula - Anomálie)</option>
                </select>
            </div>

            {/* PHASES EDITOR */}
            <div className="bg-black/40 border border-indigo-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-4 h-4"/> Fáze Mise (Vlny)
                    </label>
                    <span className="text-[8px] font-mono text-zinc-500">{event.planetConfig?.phases?.length || 0} Fází</span>
                </div>

                <div className="space-y-3">
                    {event.planetConfig?.phases?.map((phaseId, idx) => (
                        <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-left-2">
                            <div className="w-6 h-6 flex items-center justify-center bg-indigo-900/50 rounded text-[9px] font-bold text-indigo-300 shrink-0 border border-indigo-500/30">
                                {idx + 1}
                            </div>
                            <div className="flex-1 relative">
                                <select 
                                    value={phaseId} 
                                    onChange={(e) => updatePhase(idx, e.target.value)} 
                                    className="w-full bg-zinc-900 border border-zinc-700 p-2 text-white text-xs font-mono outline-none focus:border-indigo-500 rounded pl-2 pr-8 appearance-none"
                                >
                                    <option value="">-- Vyberte Kartu --</option>
                                    {availableCards.map(item => (
                                        <option key={item.id} value={item.id}>
                                            [{item.type}] {item.title}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                            <button 
                                onClick={() => removePhase(idx)}
                                className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {(!event.planetConfig?.phases || event.planetConfig.phases.length === 0) && (
                        <div className="text-center p-4 border border-dashed border-zinc-800 rounded-lg text-zinc-600 text-[10px] uppercase font-bold">
                            Žádné fáze. Planeta bude neaktivní.
                        </div>
                    )}
                </div>

                <button 
                    type="button" 
                    onClick={addPhase} 
                    className="w-full mt-4 py-3 bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600/20 text-indigo-400 font-bold uppercase text-[10px] tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                    <Plus className="w-4 h-4" /> Přidat Fázi (Krok)
                </button>
            </div>
            
            <p className="text-[9px] text-zinc-500 italic mt-2 border-t border-zinc-800 pt-2 leading-relaxed">
                Každý "Skok" v lodi spotřebuje palivo a posune hráče na další fázi v seznamu. Po dokončení poslední fáze je planeta dobyta.
            </p>
        </div>
    );
};

export default PlanetPanel;


import React from 'react';
import { GameEvent, GameEventType } from '../../types';
import { Globe, MapPin, Layers, Trash2, ArrowRight } from 'lucide-react';

interface PlanetPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
    masterCatalog: GameEvent[];
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
        <div className="bg-black border border-white/10 p-6 relative shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Globe className="w-32 h-32 text-indigo-500" />
            </div>

            <div className="flex items-center gap-3 mb-6 border-b border-indigo-500/20 pb-4">
                <div className="p-2 border border-indigo-500 text-indigo-500">
                    <Globe className="w-6 h-6" />
                </div>
                <div>
                    <span className="text-[9px] font-mono text-indigo-300 uppercase tracking-widest block mb-0.5">PLANETARY_SURVEY</span>
                    <h3 className="text-xl font-display font-black uppercase tracking-widest text-white">Campaign Config</h3>
                </div>
            </div>

            <div className="mb-6 p-4 bg-indigo-950/10 border-l-2 border-indigo-500">
                <label className="text-[9px] text-indigo-300 uppercase font-black tracking-widest flex items-center gap-2 mb-2">
                    <MapPin className="w-3 h-3" /> TARGET PLANET (UI OVERRIDE)
                </label>
                <select
                    value={event.planetConfig?.planetId ?? 'p1'}
                    onChange={(e) => updatePlanetConfig('planetId', e.target.value)}
                    className="w-full bg-black border border-indigo-900/50 p-3 text-white text-xs font-mono uppercase focus:border-indigo-500 outline-none"
                >
                    <option value="p1">P1 (TERRA NOVA - HABITABLE)</option>
                    <option value="p2">P2 (KEPLER-186F - SCORCHED)</option>
                    <option value="p3">P3 (MARS OUTPOST - COLONY)</option>
                    <option value="p4">P4 (BLACK NEBULA - ANOMALY)</option>
                </select>
            </div>

            {/* PHASES EDITOR */}
            <div className="bg-black border border-indigo-500/20 p-4 relative">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                    <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-4 h-4" /> MISSION PHASES (STAGES)
                    </label>
                    <span className="text-[10px] font-mono font-bold text-white bg-indigo-900/50 px-2 py-0.5 border border-indigo-500/30">{event.planetConfig?.phases?.length || 0} PHASES</span>
                </div>

                <div className="space-y-2">
                    {event.planetConfig?.phases?.map((phaseId, idx) => (
                        <div key={idx} className="flex items-center gap-0 animate-in slide-in-from-left-2 group">
                            <div className="w-8 h-10 flex items-center justify-center bg-indigo-950/30 border border-indigo-500/30 text-[10px] font-black text-indigo-400 shrink-0">
                                0{idx + 1}
                            </div>
                            <div className="flex-1 relative">
                                <select
                                    value={phaseId}
                                    onChange={(e) => updatePhase(idx, e.target.value)}
                                    className="w-full h-10 bg-black border-y border-zinc-800 p-2 text-white text-xs font-mono uppercase outline-none focus:border-indigo-500 focus:border-x appearance-none pl-3 cursor-pointer hover:bg-zinc-900"
                                >
                                    <option value="">-- SELECT ENCOUNTER --</option>
                                    {availableCards.map(item => (
                                        <option key={item.id} value={item.id}>
                                            [{item.type}] {item.title}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                            <button
                                onClick={() => removePhase(idx)}
                                className="h-10 w-10 flex items-center justify-center border border-zinc-800 border-l-0 text-zinc-600 hover:text-red-500 hover:bg-red-950/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {(!event.planetConfig?.phases || event.planetConfig.phases.length === 0) && (
                        <div className="text-center p-6 border border-dashed border-zinc-800 text-zinc-600 text-[10px] uppercase font-bold tracking-widest">
                            NO PHASES DEFINED. PLANET INACTIVE.
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={addPhase}
                    className="w-full mt-4 py-3 bg-indigo-900/20 border border-indigo-500/30 hover:bg-indigo-900/40 text-indigo-300 font-black uppercase text-[10px] tracking-[0.2em] transition-all clip-path-button"
                >
                    + ADD PHASE STEP
                </button>
            </div>

            <p className="text-[10px] font-mono text-zinc-600 mt-4 border-t border-zinc-800 pt-3 leading-relaxed">
                <span className="text-indigo-500 font-bold">NOTE:</span> Each "Jump" consumes fuel and advances player to the next phase index. Completing all phases conquers the planet.
            </p>
        </div>
    );
};

export default PlanetPanel;

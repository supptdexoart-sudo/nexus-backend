import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Fuel, Shield, Navigation, AlertTriangle, Crosshair, ChevronRight, Lock, Map, Check, Layers } from 'lucide-react';
import { playSound, vibrate } from '../services/soundService';
import { GameEvent, GameEventType } from '../types';

const PLANETS_DB = [
    { id: 'p1', name: 'Terra Nova', distance: '12 AU', danger: 'Nízká', type: 'Obyvatelná', color: 'text-green-400', border: 'border-green-500/30' },
    { id: 'p2', name: 'Kepler-186f', distance: '450 LY', danger: 'Střední', type: 'Exoplaneta', color: 'text-blue-400', border: 'border-blue-500/30' },
    { id: 'p3', name: 'Mars Outpost', distance: '0.5 AU', danger: 'Vysoká', type: 'Kolonie', color: 'text-red-400', border: 'border-red-500/30' },
    { id: 'p4', name: 'Black Nebula', distance: 'Unknown', danger: 'Extrémní', type: 'Anomálie', color: 'text-purple-400', border: 'border-purple-500/30' }
];

interface SpaceshipViewProps {
    playerFuel: number;
    inventory: GameEvent[];
    onPlanetLand: (planetId: string, eventType: GameEventType) => void; // Used for triggering event
    onFuelConsume: (amount: number) => void;
    // New prop to update planet progress
    onProgressPlanet?: (navCardId: string) => void;
    masterCatalog?: GameEvent[]; // Need catalog to lookup phase cards
}

const SpaceshipView: React.FC<SpaceshipViewProps> = ({ playerFuel, inventory, onPlanetLand, onFuelConsume, onProgressPlanet, masterCatalog = [] }) => {
    const [hull] = useState(100);
    const [shields] = useState(60);
    const [isTraveling, setIsTraveling] = useState(false);
    const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);

    useEffect(() => {
        playSound('open');
    }, []);

    // Unlock logic + Phase Logic
    const unlockedPlanets = PLANETS_DB.map(dbPlanet => {
        const unlockCard = inventory.find(i => i.type === GameEventType.PLANET && i.planetConfig?.planetId === dbPlanet.id);

        // Parse Phases
        const phases = unlockCard?.planetConfig?.phases || [];
        const currentPhaseIndex = unlockCard?.planetProgress || 0;
        const totalPhases = phases.length;
        const isComplete = totalPhases > 0 && currentPhaseIndex >= totalPhases;

        // Determine Next Event ID
        let nextEventId: string | null = null;
        if (phases.length > 0 && currentPhaseIndex < phases.length) {
            nextEventId = phases[currentPhaseIndex];
        } else {
            // Fallback for legacy or no phases
            nextEventId = unlockCard?.planetConfig?.landingEventId || null;
        }

        return {
            ...dbPlanet,
            isUnlocked: !!unlockCard,
            navCardId: unlockCard?.id,
            phases,
            currentPhaseIndex,
            totalPhases,
            isComplete,
            nextEventId,
            fallbackEventType: unlockCard?.planetConfig?.landingEventType || GameEventType.ENCOUNTER
        };
    });

    const selectedPlanetData = unlockedPlanets.find(p => p.id === selectedPlanetId);

    const handleTravel = () => {
        if (!selectedPlanetData || !selectedPlanetData.isUnlocked) return;
        if (selectedPlanetData.isComplete) {
            playSound('error');
            return;
        }

        const FUEL_COST = 20;

        if (playerFuel < FUEL_COST) {
            playSound('error');
            vibrate(100);
            return;
        }

        setIsTraveling(true);
        playSound('scan');
        vibrate([50, 100, 200, 50, 100]);

        onFuelConsume(-FUEL_COST);

        setTimeout(() => {
            setIsTraveling(false);
            playSound('success');
            vibrate(50);

            // 1. TRIGGER EVENT
            // If nextEventId exists (from phases or legacy link), find that card and trigger it
            if (selectedPlanetData.nextEventId) {
                const targetCard = masterCatalog.find(i => i.id === selectedPlanetData.nextEventId);
                if (targetCard) {
                    // Logic handles specific phase selection implicitly via onPlanetLand/Logic combination or we could force it here.
                    // For now, let generic handler proceed.
                }
            }

            // Trigger generic land (logic will handle specific phase card selection if I update logic)
            onPlanetLand(selectedPlanetData.id, selectedPlanetData.fallbackEventType);

            // 2. UPDATE PROGRESS
            if (selectedPlanetData.navCardId && selectedPlanetData.phases.length > 0 && onProgressPlanet) {
                onProgressPlanet(selectedPlanetData.navCardId);
            }

        }, 3500);
    };

    return (
        <div className="h-full w-full bg-[#0a0b0d] flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="p-6 pb-2 border-b border-white/10 bg-black/50 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-signal-cyan/10 rounded-lg border border-signal-cyan/30">
                        <Rocket className="w-6 h-6 text-signal-cyan" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-white font-display chromatic-text">Moje Loď</h2>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.3em]">Interceptor Class V-2</p>
                    </div>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 relative z-10">

                {/* Ship Visual */}
                <div className="relative aspect-video bg-zinc-900/50 rounded-2xl border border-white/10 overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-signal-cyan/10 via-transparent to-transparent opacity-50" />

                    <div className="absolute inset-0 flex items-center justify-center">
                        <Rocket className={`w-32 h-32 text-zinc-700 transition-all duration-1000 ${isTraveling ? 'animate-pulse text-signal-cyan translate-y-[-10px]' : ''}`} />
                    </div>

                    {isTraveling && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                            <div className="text-center w-full px-10">
                                <div className="text-signal-cyan font-mono text-xs uppercase tracking-widest animate-pulse mb-2">
                                    Cestování hyperprostorem...
                                </div>
                                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-signal-cyan"
                                        initial={{ width: 0 }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 3.5, ease: "linear" }}
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest">
                                    Destinace: {selectedPlanetData?.name}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent flex justify-between items-end">
                        <div className="flex gap-4">
                            <div>
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 uppercase font-bold mb-1"><Shield className="w-3 h-3 text-cyan-400" /> Štíty</div>
                                <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-400" style={{ width: `${shields}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 uppercase font-bold mb-1"><AlertTriangle className="w-3 h-3 text-red-500" /> Trup</div>
                                <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-white" style={{ width: `${hull}%` }} />
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5 text-[10px] text-zinc-400 uppercase font-bold mb-1"><Fuel className="w-3 h-3 text-signal-amber" /> Palivo</div>
                            <span className="text-xl font-mono font-bold text-signal-amber">{playerFuel}%</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Section */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Navigation className="w-4 h-4 text-signal-cyan" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Navigace Sektoru</h3>
                    </div>

                    <div className="space-y-3">
                        {unlockedPlanets.map(planet => (
                            <button
                                key={planet.id}
                                disabled={!planet.isUnlocked || isTraveling}
                                onClick={() => { setSelectedPlanetId(planet.id); playSound('click'); }}
                                className={`w-full p-4 rounded-xl border flex flex-col gap-3 transition-all active:scale-[0.98] relative overflow-hidden ${!planet.isUnlocked
                                    ? 'bg-black/40 border-zinc-800 opacity-60 grayscale'
                                    : selectedPlanetId === planet.id
                                        ? `bg-zinc-800 ${planet.border} ring-1 ring-white/20`
                                        : 'bg-black/40 border-white/5 active:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-black ${planet.isUnlocked ? planet.border : 'border-zinc-700'}`}>
                                            {planet.isUnlocked ? (
                                                <GlobeIcon className={`w-5 h-5 ${planet.color}`} />
                                            ) : (
                                                <Lock className="w-4 h-4 text-zinc-600" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                {planet.name}
                                                {!planet.isUnlocked && <span className="text-[8px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">ZAMČENO</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 ${planet.isUnlocked ? planet.color : 'text-zinc-600'} font-mono uppercase`}>
                                                    {planet.isUnlocked ? planet.type : 'Neznámá Data'}
                                                </span>
                                                <span className="text-[9px] text-zinc-500 font-mono">{planet.distance}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedPlanetId === planet.id && planet.isUnlocked && <ChevronRight className="w-5 h-5 text-white animate-pulse" />}
                                </div>

                                {/* PHASE PROGRESS BAR */}
                                {planet.isUnlocked && planet.phases.length > 0 && (
                                    <div className="w-full bg-black/50 p-2 rounded-lg border border-white/5 flex items-center gap-3">
                                        <Layers className="w-3 h-3 text-zinc-500" />
                                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${planet.isComplete ? 'bg-green-500' : 'bg-signal-cyan'}`}
                                                style={{ width: `${Math.min(100, (planet.currentPhaseIndex / planet.totalPhases) * 100)}%` }}
                                            />
                                        </div>
                                        <span className={`text-[9px] font-mono font-bold ${planet.isComplete ? 'text-green-500' : 'text-zinc-400'}`}>
                                            {planet.isComplete ? 'DOKONČENO' : `${planet.currentPhaseIndex}/${planet.totalPhases}`}
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {!unlockedPlanets.some(p => p.isUnlocked) && (
                        <div className="mt-4 p-3 bg-zinc-900/50 border border-white/5 rounded-lg flex items-start gap-3">
                            <Map className="w-4 h-4 text-zinc-500 mt-0.5" />
                            <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                                Pro odemčení destinací naskenujte <span className="text-white font-bold">Navigační Karty (QR)</span>.
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                {selectedPlanetId && selectedPlanetData?.isUnlocked && (
                    <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
                        {selectedPlanetData.isComplete ? (
                            <div className="w-full py-4 bg-green-900/20 border border-green-500/30 rounded-xl flex items-center justify-center gap-2 text-green-500 font-bold uppercase text-xs tracking-widest">
                                <Check className="w-4 h-4" /> Planeta Dobyta
                            </div>
                        ) : (
                            <button
                                disabled={isTraveling || playerFuel < 20}
                                onClick={handleTravel}
                                className={`w-full py-4 font-black uppercase text-xs tracking-[0.2em] rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 ${playerFuel < 20
                                    ? 'bg-red-900/50 text-red-500 border border-red-900 cursor-not-allowed'
                                    : 'bg-white text-black active:bg-signal-cyan border border-white/50 active:scale-95 transition-transform'
                                    }`}
                            >
                                {isTraveling ? (
                                    <>Iniciace Motorů...</>
                                ) : playerFuel < 20 ? (
                                    <>Nedostatek Paliva (20%)</>
                                ) : (
                                    <><Crosshair className="w-4 h-4" /> Zahájit Skok (-20% Paliva)</>
                                )}
                            </button>
                        )}
                    </div>
                )}

            </div>

            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>
        </div>
    );
};

const GlobeIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" x2="22" y1="12" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

export default SpaceshipView;

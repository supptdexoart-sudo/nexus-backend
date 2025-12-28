
import React from 'react';
import { GameEvent } from '../../types';
import { Satellite, Wind, Shield, Fuel, Radio } from 'lucide-react';

interface SpaceStationPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
}

const SpaceStationPanel: React.FC<SpaceStationPanelProps> = ({ event, onUpdate }) => {

    const updateConfig = (field: string, value: any) => {
        onUpdate({
            stationConfig: {
                ...(event.stationConfig || {
                    fuelReward: 50,
                    repairAmount: 30,
                    refillO2: true,
                    welcomeMessage: "Vítejte na palubě."
                }),
                [field]: value
            }
        });
    };

    return (
        <div className="bg-black border border-white/10 p-6 relative shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Satellite className="w-32 h-32 text-cyan-400" />
            </div>

            <div className="flex items-center gap-3 mb-6 border-b border-cyan-500/20 pb-4">
                <div className="p-2 border border-cyan-500 text-cyan-400">
                    <Satellite className="w-6 h-6" />
                </div>
                <div>
                    <span className="text-[9px] font-mono text-cyan-700 uppercase tracking-widest block mb-0.5">DOKOVACÍ_ROZHRANÍ</span>
                    <h3 className="text-xl font-display font-black uppercase tracking-widest text-white">Konf. Stanice</h3>
                </div>
            </div>

            <div className="mb-6">
                <label className="text-[9px] text-zinc-400 uppercase font-black tracking-widest flex items-center gap-2 mb-2"><Radio className="w-3 h-3" /> UVÍTACÍ ZPRÁVA</label>
                <div className="relative">
                    <input
                        type="text"
                        value={event.stationConfig?.welcomeMessage ?? "Vítejte na palubě."}
                        onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                        className="w-full bg-black border border-cyan-500/30 p-3 text-cyan-400 text-xs font-mono focus:border-cyan-400 outline-none pl-8"
                        placeholder="Systémy online..."
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-black border border-zinc-800 p-3 hover:border-orange-500 transition-colors group">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2 mb-2 group-hover:text-orange-500">
                        <Fuel className="w-3 h-3 text-orange-500" /> ODMĚNA PALIVA
                    </label>
                    <input
                        type="number"
                        value={event.stationConfig?.fuelReward ?? 50}
                        onChange={(e) => updateConfig('fuelReward', parseInt(e.target.value))}
                        className="w-full bg-transparent text-white font-mono text-2xl font-bold text-center outline-none"
                    />
                </div>
                <div className="bg-black border border-zinc-800 p-3 hover:border-blue-500 transition-colors group">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2 mb-2 group-hover:text-blue-500">
                        <Shield className="w-3 h-3 text-blue-500" /> OPRAVA TRUPU (+HP)
                    </label>
                    <input
                        type="number"
                        value={event.stationConfig?.repairAmount ?? 30}
                        onChange={(e) => updateConfig('repairAmount', parseInt(e.target.value))}
                        className="w-full bg-transparent text-white font-mono text-2xl font-bold text-center outline-none"
                    />
                </div>
            </div>

            <div className="bg-cyan-950/10 border border-cyan-500/20 p-4 flex items-center justify-between group hover:bg-cyan-950/20 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-none border border-cyan-500/30">
                        <Wind className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-cyan-300 tracking-widest">SERVIS DOPLNĚNÍ KYSLÍKU</span>
                        <span className="text-[9px] font-mono text-cyan-600">Obnoví kyslík hráčů na 100%</span>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={event.stationConfig?.refillO2 ?? true}
                        onChange={(e) => updateConfig('refillO2', e.target.checked)}
                    />
                    <div className="w-8 h-4 bg-zinc-900 peer-focus:outline-none border border-zinc-700 peer peer-checked:border-cyan-400 peer-checked:bg-cyan-900/50 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-zinc-500 after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-cyan-400"></div>
                </label>
            </div>
        </div>
    );
};

export default SpaceStationPanel;

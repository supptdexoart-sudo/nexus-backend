
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
        <div className="space-y-4 bg-arc-panel p-5 border border-cyan-500/30 text-white shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <div className="flex items-center gap-2 mb-2 text-cyan-400 border-b border-cyan-500/20 pb-2">
                <Satellite className="w-5 h-5"/>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest">Konfigurace Stanice:</h3>
            </div>
            
            <div>
                <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest flex items-center gap-1 mb-1"><Radio className="w-3 h-3"/> Uvítací Zpráva:</label>
                <input 
                    type="text" 
                    value={event.stationConfig?.welcomeMessage ?? "Vítejte na palubě."} 
                    onChange={(e) => updateConfig('welcomeMessage', e.target.value)} 
                    className="w-full bg-black border border-cyan-500/30 p-2 text-white text-xs font-mono" 
                    placeholder="Systémy online..."
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest flex items-center gap-1 mb-1"><Fuel className="w-3 h-3 text-orange-500"/> Palivo (Darování)</label>
                    <input 
                        type="number" 
                        value={event.stationConfig?.fuelReward ?? 50} 
                        onChange={(e) => updateConfig('fuelReward', parseInt(e.target.value))} 
                        className="w-full bg-black border border-cyan-500/30 p-2 text-white font-mono text-sm text-center" 
                    />
                </div>
                <div>
                    <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest flex items-center gap-1 mb-1"><Shield className="w-3 h-3 text-slate-300"/> Oprava Lodi (+HP)</label>
                    <input 
                        type="number" 
                        value={event.stationConfig?.repairAmount ?? 30} 
                        onChange={(e) => updateConfig('repairAmount', parseInt(e.target.value))} 
                        className="w-full bg-black border border-cyan-500/30 p-2 text-white font-mono text-sm text-center" 
                    />
                </div>
            </div>

            <div className="bg-black/40 border border-cyan-500/20 p-3 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-cyan-200" />
                    <span className="text-[10px] uppercase font-bold text-zinc-300">Doplnit Kyslík (100%)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={event.stationConfig?.refillO2 ?? true} 
                        onChange={(e) => updateConfig('refillO2', e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
            </div>
        </div>
    );
};

export default SpaceStationPanel;

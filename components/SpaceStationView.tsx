
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEvent, PlayerClass } from '../types';
import {
    LogOut, Satellite, Activity, Shield, Wind,
    CheckCircle, Fuel, ArrowUpCircle, Hammer, Globe, Construction, Check, ShoppingCart
} from 'lucide-react';
import { playSound } from '../services/soundService';
import StationMarket from './StationMarket'; // Imported
import * as apiService from '../services/apiService'; // For buying/recycling persistence

interface SpaceStationViewProps {
    station: GameEvent;
    onLeave: () => void;
    onClaimRewards?: (station: GameEvent) => void;
    inventory?: GameEvent[];
    masterCatalog?: GameEvent[];
    playerGold?: number; // Added prop
    playerClass?: PlayerClass | null; // Added prop
    // Handlers for updating inventory locally (passed from useGameLogic logic basically)
    onInventoryUpdate?: () => void; // Trigger refresh
    onGoldChange?: (amount: number) => void; // Added for deducting gold
}


const SpaceStationView: React.FC<SpaceStationViewProps> = ({
    station, onLeave, onClaimRewards, inventory = [], masterCatalog = [],
    playerGold = 0, playerClass = null, onInventoryUpdate, onGoldChange
}) => {
    const [bootSequence, setBootSequence] = useState(true);
    const [showConfirmLeave, setShowConfirmLeave] = useState(false);
    const [constructionMessage, setConstructionMessage] = useState<string | null>(null);
    const [rewardsClaimed, setRewardsClaimed] = useState(false);

    // Views State
    const [showMarket, setShowMarket] = useState(false);

    useEffect(() => {
        playSound('open');
        const timer = setTimeout(() => setBootSequence(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleClaim = () => {
        if (!rewardsClaimed && onClaimRewards) {
            onClaimRewards(station);
            setRewardsClaimed(true);
        }
    };

    const handleUndockClick = () => {
        playSound('click');
        setShowConfirmLeave(true);
    };

    const confirmUndock = () => {
        setShowConfirmLeave(false);
        onLeave();
    };

    const handleUnderConstruction = (feature: string) => {
        playSound('error');
        setConstructionMessage(feature);
        setTimeout(() => setConstructionMessage(null), 2000);
    };

    // Helper to determine which email bucket to use
    const getTargetEmail = () => {
        return localStorage.getItem('nexus_current_user');
    };

    // --- MARKETPLACE LOGIC WRAPPERS ---

    const handleBuyItem = async (item: GameEvent, price: number) => {
        try {
            const targetEmail = getTargetEmail();
            if (targetEmail) {
                console.log(`[MARKET] Buying ${item.title} for ${price} gold. Target: ${targetEmail}`);

                // 1. Deduct Gold (Update global state)
                if (onGoldChange) {
                    onGoldChange(-Math.abs(price));
                }

                // 2. Save Item to correct inventory (Test or Live)
                await apiService.saveCard(targetEmail, { ...item, id: `BOUGHT-${Date.now()}` });

                // 3. Refresh Inventory UI
                if (onInventoryUpdate) onInventoryUpdate();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRecycleItem = async (itemToRecycle: GameEvent, rewards: { resource: GameEvent, amount: number }[]) => {
        try {
            const targetEmail = getTargetEmail();
            if (targetEmail) {
                // 1. Delete Item from correct inventory
                await apiService.deleteCard(targetEmail, itemToRecycle.id);

                // 2. Add Resources to correct inventory
                for (const reward of rewards) {
                    const resItem = {
                        ...reward.resource,
                        id: `RES-${Date.now()}-${Math.random()}`,
                        resourceConfig: {
                            ...reward.resource.resourceConfig!,
                            resourceAmount: reward.amount
                        }
                    };
                    await apiService.saveCard(targetEmail, resItem);
                }

                if (onInventoryUpdate) onInventoryUpdate();
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (bootSequence) {
        return (
            <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center font-mono">
                <div className="text-center space-y-4">
                    <Satellite className="w-16 h-16 text-cyan-500 animate-pulse mx-auto" />
                    <div className="space-y-1">
                        <p className="text-xs text-cyan-500 uppercase tracking-[0.2em] font-bold">Iniciace Servisních Protokolů...</p>
                        <p className="text-xl text-white font-black uppercase tracking-widest">{station.title}</p>
                    </div>
                    <div className="w-48 h-1 bg-zinc-800 rounded-full mx-auto overflow-hidden">
                        <motion.div
                            className="h-full bg-cyan-500"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#050608] text-white overflow-hidden flex flex-col font-sans"
        >
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{ backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            {/* HEADER */}
            <header className="relative z-10 bg-black/60 backdrop-blur-md border-b border-white/10 p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-cyan-950/30 border border-cyan-500/50 rounded-lg flex items-center justify-center">
                        <Satellite className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">{station.title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-mono text-cyan-500/80 uppercase tracking-widest">Připojení Stabilní • ID: {station.id}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Lokální Čas</p>
                        <p className="text-sm font-mono font-bold text-zinc-300">{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
            </header>

            {/* MAIN DASHBOARD */}
            <main className="flex-1 relative z-10 p-6 overflow-y-auto no-scrollbar pb-32">

                {/* Welcome Message */}
                <div className="mb-8 p-6 bg-gradient-to-r from-cyan-900/20 to-transparent border-l-4 border-cyan-500 rounded-r-xl">
                    <h2 className="text-lg font-bold text-cyan-100 mb-1">Diagnostika lodi.</h2>
                    <p className="text-sm text-cyan-400/60 font-mono">"{station.stationConfig?.welcomeMessage || 'Dostupné servisní úkony nalezeny.'}"</p>
                </div>

                {/* REWARDS STATUS & CLAIM BUTTON */}
                <div className="space-y-4 mb-8">
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Dostupný Servis
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {station.stationConfig?.refillO2 && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`p-5 rounded-xl flex items-center gap-4 border transition-colors ${rewardsClaimed ? 'bg-green-900/20 border-green-500/50' : 'bg-black/40 border-white/10'}`}
                            >
                                <div className={`p-3 rounded-full ${rewardsClaimed ? 'bg-green-900/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                    <Wind className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Podpora Života</p>
                                    <p className="text-lg font-black text-white uppercase">Doplnění O2</p>
                                </div>
                                {rewardsClaimed && <CheckCircle className="w-6 h-6 text-green-500 ml-auto" />}
                            </motion.div>
                        )}

                        {station.stationConfig?.fuelReward && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`p-5 rounded-xl flex items-center gap-4 border transition-colors ${rewardsClaimed ? 'bg-green-900/20 border-green-500/50' : 'bg-black/40 border-white/10'}`}
                            >
                                <div className={`p-3 rounded-full ${rewardsClaimed ? 'bg-green-900/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                    <Fuel className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Tankování</p>
                                    <p className="text-lg font-black text-white uppercase">+{station.stationConfig.fuelReward} Paliva</p>
                                </div>
                                {rewardsClaimed && <CheckCircle className="w-6 h-6 text-green-500 ml-auto" />}
                            </motion.div>
                        )}

                        {station.stationConfig?.repairAmount && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`p-5 rounded-xl flex items-center gap-4 border transition-colors ${rewardsClaimed ? 'bg-green-900/20 border-green-500/50' : 'bg-black/40 border-white/10'}`}
                            >
                                <div className={`p-3 rounded-full ${rewardsClaimed ? 'bg-green-900/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Opravy</p>
                                    <p className="text-lg font-black text-white uppercase">+{station.stationConfig.repairAmount} HP/Hull</p>
                                </div>
                                {rewardsClaimed && <CheckCircle className="w-6 h-6 text-green-500 ml-auto" />}
                            </motion.div>
                        )}
                    </div>

                    <button
                        onClick={handleClaim}
                        disabled={rewardsClaimed}
                        className={`w-full py-5 font-black uppercase text-sm tracking-[0.3em] rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg ${rewardsClaimed
                            ? 'bg-green-600 text-white cursor-default'
                            : 'bg-white text-black active:bg-cyan-400 active:scale-95'
                            }`}
                    >
                        {rewardsClaimed ? (
                            <>
                                <Check className="w-5 h-5" /> SERVISNÍ ÚKONY DOKONČENY
                            </>
                        ) : (
                            <>
                                <Activity className="w-5 h-5" /> PROVÉST KOMPLETNÍ SERVIS
                            </>
                        )}
                    </button>
                </div>

                {/* STATION SERVICES MENU */}
                <div className="mb-8">
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Doplňkové Služby
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setShowMarket(true)} className="bg-zinc-900/50 border border-white/5 active:bg-zinc-800 p-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 group">
                            <ShoppingCart className="w-6 h-6 text-zinc-500 group-active:text-cyan-400 transition-colors" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-active:text-white">Tržiště & Scrap</span>
                        </button>
                        <button onClick={() => handleUnderConstruction('Výroba')} className="bg-zinc-900/50 border border-white/5 active:bg-zinc-800 p-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 group">
                            <Hammer className="w-6 h-6 text-zinc-500 group-active:text-orange-500 transition-colors" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-active:text-white">Výroba (Factory)</span>
                        </button>
                        <button onClick={() => handleUnderConstruction('Loděnice')} className="bg-zinc-900/50 border border-white/5 active:bg-zinc-800 p-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 group">
                            <ArrowUpCircle className="w-6 h-6 text-zinc-500 group-active:text-signal-cyan transition-colors" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-active:text-white">Vylepšit Loď</span>
                        </button>
                        <button onClick={() => handleUnderConstruction('Kartografie')} className="bg-zinc-900/50 border border-white/5 active:bg-zinc-800 p-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 group">
                            <Globe className="w-6 h-6 text-zinc-500 group-active:text-purple-500 transition-colors" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-active:text-white">Registr Planet</span>
                        </button>
                    </div>
                </div>

                {/* SEPARATOR LINE */}
                <div className="w-full h-0.5 bg-signal-amber mb-6 shadow-[0_0_10px_#ff9d00]" />

                {/* SYSTEM LOGS */}
                <div className="pt-2">
                    <h3 className="text-xs font-black text-signal-amber uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Protokol Údržby
                    </h3>
                    <div className="font-mono text-[10px] text-zinc-500 space-y-1.5 p-4 bg-black/40 rounded-xl border border-white/5">
                        <p className="flex gap-2"><span className="text-zinc-700">08:00</span> <span>&gt; Navázáno spojení s centrálním serverem...</span></p>
                        <p className="flex gap-2"><span className="text-zinc-700">08:01</span> <span>&gt; Autorizace jednotky: ÚSPĚCH</span></p>
                        <p className="flex gap-2 text-green-500"><span className="text-green-900">08:02</span> <span>&gt; Zahájení automatických oprav...</span></p>
                        <p className="flex gap-2 text-green-500"><span className="text-green-900">08:05</span> <span>&gt; Doplnění zásob...</span></p>
                        <p className="flex gap-2"><span className="text-zinc-700">08:10</span> <span>&gt; Odpojení servisních ramen.</span></p>
                        <p className="flex gap-2 animate-pulse text-signal-cyan"><span className="text-cyan-900">08:11</span> <span>&gt; Připraveno k odletu.</span></p>
                    </div>
                </div>

            </main>

            {/* FOOTER */}
            <footer className="relative z-10 p-6 bg-black/80 backdrop-blur-xl border-t border-white/10">
                <button
                    onClick={handleUndockClick}
                    className="w-full py-4 bg-cyan-600/10 active:bg-cyan-600/20 border border-cyan-600/30 text-cyan-400 font-black uppercase text-sm tracking-[0.3em] rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_20px_rgba(8,145,178,0.2)]"
                >
                    <LogOut className="w-5 h-5" />
                    Opustit Stanici (Undock)
                </button>
            </footer>

            {/* CONFIRMATION MODAL */}
            <AnimatePresence>
                {showConfirmLeave && (
                    <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-xs text-center shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-signal-cyan"></div>
                            <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-500 border border-cyan-500/30">
                                <LogOut className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Opustit Dok?</h3>
                            <p className="text-xs text-zinc-400 mb-6 font-mono leading-relaxed">
                                Opravdu chcete opustit stanici? Ujistěte se, že máte doplněno palivo a zásoby.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowConfirmLeave(false)} className="py-3 bg-zinc-800 text-zinc-400 font-bold uppercase text-[10px] rounded-lg active:bg-zinc-700 transition-colors transition-transform active:scale-95">
                                    Zůstat
                                </button>
                                <button onClick={confirmUndock} className="py-3 bg-cyan-600 text-white font-bold uppercase text-[10px] rounded-lg active:bg-cyan-500 transition-colors transition-transform active:scale-95 shadow-lg shadow-cyan-500/20">
                                    Odletět
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CONSTRUCTION TOAST */}
            <AnimatePresence>
                {constructionMessage && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-black/90 border border-orange-500/50 px-6 py-3 rounded-full shadow-[0_0_30px_rgba(249,115,22,0.3)] flex items-center gap-3"
                    >
                        <Construction className="w-5 h-5 text-orange-500 animate-pulse" />
                        <span className="text-xs font-bold text-orange-500 uppercase tracking-widest whitespace-nowrap">
                            Modul {constructionMessage} ve výstavbě
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* MARKET VIEW OVERLAY */}
            <AnimatePresence>
                {showMarket && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[250]"
                    >
                        <StationMarket
                            onClose={() => setShowMarket(false)}
                            masterCatalog={masterCatalog}
                            inventory={inventory}
                            playerGold={playerGold}
                            playerClass={playerClass}
                            onBuy={(item, price) => { handleBuyItem(item, price); }}
                            onRecycle={(item, rewards) => { handleRecycleItem(item, rewards); }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
};

export default SpaceStationView;

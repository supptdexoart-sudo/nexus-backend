
import React, { useState, useEffect, useMemo } from 'react';
import { GameEvent, GameEventType, PlayerClass } from '../types';
import { Download, RotateCcw, QrCode, Trash2, Upload, AlertTriangle, Save, Skull, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, vibrate } from '../services/soundService';
import * as apiService from '../services/apiService';

// Import modular panels
import MerchantPanel from './generator/MerchantPanel';
import DilemmaPanel from './generator/DilemmaPanel';
import CombatPanel from './generator/CombatPanel';
import ItemPanel from './generator/ItemPanel';
import TrapPanel from './generator/TrapPanel';
import EnemyLootPanel from './generator/EnemyLootPanel';
import NightVariantPanel from './generator/NightVariantPanel';
import SpaceStationPanel from './generator/SpaceStationPanel';
import PlanetPanel from './generator/PlanetPanel';

interface GeneratorProps {
    onSaveCard: (event: GameEvent) => void;
    userEmail: string;
    initialData?: GameEvent | null;
    onClearData?: () => void;
    onDelete?: (id: string) => void;
    masterCatalog?: GameEvent[];
}

const initialEventState: GameEvent = {
    id: '',
    title: '',
    description: '',
    type: GameEventType.ITEM,
    rarity: 'Common',
    flavorText: '',
    stats: [],
    isShareable: true,
    isConsumable: true,
    isSellOnly: false,
    canBeSaved: true,
    price: 0,
    trapConfig: { difficulty: 10, damage: 20, disarmClass: PlayerClass.ROGUE, successMessage: "Past zneškodněna.", failMessage: "Past sklapla!" },
    enemyLoot: { goldReward: 20, dropItemChance: 0 },
    timeVariant: { enabled: false, nightStats: [] },
    stationConfig: { fuelReward: 50, repairAmount: 30, refillO2: true, welcomeMessage: "Vítejte na palubě." },
    resourceConfig: { isResourceContainer: false, resourceName: 'Surovina', resourceAmount: 1, customLabel: 'Surovina k Těžbě' },
    craftingRecipe: { enabled: false, requiredResources: [], craftingTimeSeconds: 60 },
    planetConfig: { planetId: 'p1', landingEventType: GameEventType.ENCOUNTER, phases: [] }
};

const ID_PREFIXES: Record<string, string> = {
    [GameEventType.ITEM]: 'PRE-',
    [GameEventType.ENCOUNTER]: 'SET-',
    [GameEventType.TRAP]: 'NAS-',
    [GameEventType.MERCHANT]: 'OBCH-',
    [GameEventType.DILEMA]: 'DIL-',
    [GameEventType.BOSS]: 'BOSS-',
    [GameEventType.SPACE_STATION]: 'VS-',
    [GameEventType.PLANET]: 'PLA-',
};

const Generator: React.FC<GeneratorProps> = ({ onSaveCard, userEmail, initialData, onClearData, onDelete, masterCatalog = [] }) => {
    const [newEvent, setNewEvent] = useState<GameEvent>(initialEventState);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPurgeModal, setShowPurgeModal] = useState(false);

    const isIdDuplicate = useMemo(() => {
        if (!newEvent.id) return false;
        if (isEditingMode && initialData?.id === newEvent.id) return false;
        return masterCatalog.some(item => item.id.toLowerCase() === newEvent.id.toLowerCase());
    }, [newEvent.id, masterCatalog, isEditingMode, initialData]);

    useEffect(() => {
        if (initialData) {
            setNewEvent({
                ...initialEventState,
                ...initialData,
                price: (initialData.price !== undefined && initialData.price !== null) ? initialData.price : initialEventState.price,
                resourceConfig: {
                    isResourceContainer: initialData.resourceConfig?.isResourceContainer ?? false,
                    resourceName: initialData.resourceConfig?.resourceName ?? 'Surovina',
                    resourceAmount: initialData.resourceConfig?.resourceAmount ?? 1,
                    customLabel: initialData.resourceConfig?.customLabel
                },
                craftingRecipe: {
                    enabled: initialData.craftingRecipe?.enabled ?? false,
                    requiredResources: initialData.craftingRecipe?.requiredResources ?? [],
                    craftingTimeSeconds: initialData.craftingRecipe?.craftingTimeSeconds ?? 60
                },
                planetConfig: {
                    planetId: initialData.planetConfig?.planetId ?? 'p1',
                    landingEventType: initialData.planetConfig?.landingEventType ?? GameEventType.ENCOUNTER,
                    landingEventId: initialData.planetConfig?.landingEventId,
                    phases: initialData.planetConfig?.phases ?? []
                },
                isSellOnly: initialData.isSellOnly ?? false
            });
            setIsEditingMode(true);
        } else {
            const prefix = ID_PREFIXES[GameEventType.ITEM];
            const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
            setNewEvent({ ...initialEventState, id: `${prefix}${randomSuffix}` });
            setIsEditingMode(false);
        }
    }, [initialData]);

    const updateEvent = (updates: Partial<GameEvent>) => setNewEvent(prev => ({ ...prev, ...updates }));
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => updateEvent({ [e.target.name]: e.target.value });

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as GameEventType;
        if (!isEditingMode) {
            const prefix = ID_PREFIXES[newType] || 'GEN-';
            const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
            updateEvent({ type: newType, id: `${prefix}${randomSuffix}` });
        } else {
            updateEvent({ type: newType });
        }
    };

    const handleDeleteClick = () => {
        if (!onDelete || !newEvent.id) return;
        playSound('error');
        vibrate(50);
        setShowDeleteModal(true);
    };

    const handlePurgeClick = () => {
        if (!newEvent.id) return;
        playSound('siren');
        vibrate([100, 100, 100]);
        setShowPurgeModal(true);
    };

    const confirmDelete = () => {
        if (onDelete && newEvent.id) {
            onDelete(newEvent.id);
            setShowDeleteModal(false);
        }
    };

    const confirmPurge = async () => {
        if (!newEvent.id) return;
        try {
            await apiService.purgeItemFromAllUsers(newEvent.id);
            setFeedback({ message: 'GLOBAL PURGE COMPLETE.', type: 'success' });
            playSound('damage');
            if (onDelete) onDelete(newEvent.id);
            setShowPurgeModal(false);
        } catch (e: any) {
            setFeedback({ message: `Purge Error: ${e.message}`, type: 'error' });
        }
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            await apiService.downloadBackup();
            setFeedback({ message: 'Backup Encrypted & Downloaded.', type: 'success' });
            playSound('success');
        } catch (e) {
            setFeedback({ message: 'Backup Failed.', type: 'error' });
            playSound('error');
        } finally {
            setIsBackingUp(false);
        }
    };

    const getQrUrl = (id: string, type: GameEventType) => {
        if (!id) return '';
        const colorMap: Record<string, string> = {
            [GameEventType.BOSS]: 'ff3b30',
            [GameEventType.TRAP]: 'f5c518',
            [GameEventType.ENCOUNTER]: 'ff3b30',
            [GameEventType.DILEMA]: '9333ea',
            [GameEventType.MERCHANT]: 'f5c518',
            [GameEventType.ITEM]: '007aff',
            [GameEventType.SPACE_STATION]: '22d3ee',
            [GameEventType.PLANET]: '6366f1'
        };
        const color = colorMap[type] || 'ffffff';
        return `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&color=${color}&bgcolor=0a0a0c&margin=20&data=${encodeURIComponent(id)}`;
    };

    const currentQrUrl = getQrUrl(newEvent.id, newEvent.type);

    const handleDownloadQr = async () => {
        if (!currentQrUrl || !newEvent.id) {
            setFeedback({ message: 'Missing Identifier.', type: 'error' });
            return;
        }
        setIsDownloading(true);
        try {
            const response = await fetch(currentQrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const safeTitle = newEvent.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'unnamed_asset';
            link.download = `nexus_${newEvent.type.toLowerCase()}_${safeTitle}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            setFeedback({ message: 'QR Code Cached.', type: 'success' });
        } catch (e) {
            setFeedback({ message: 'Download Protocol Error.', type: 'error' });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userEmail || !newEvent.id) { setFeedback({ message: 'Identifier Missing.', type: 'error' }); return; }
        if (isIdDuplicate) { setFeedback({ message: 'CRITICAL ERROR: ID CONFLICT', type: 'error' }); playSound('error'); return; }

        try {
            const eventToSave = { ...newEvent };
            if (userEmail === 'zbynekbal97@gmail.com') eventToSave.qrCodeUrl = currentQrUrl;
            await onSaveCard(eventToSave);
            setFeedback({ message: 'Data Synced to Mainframe.', type: 'success' });
            if (!isEditingMode) {
                const prefix = ID_PREFIXES[GameEventType.ITEM];
                const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
                setNewEvent({ ...initialEventState, id: `${prefix}${randomSuffix}` });
            }
        } catch (e: any) { setFeedback({ message: e.message, type: 'error' }); }
    };

    return (
        <div className="h-full overflow-y-auto p-6 pb-24 no-scrollbar bg-black text-white relative">
            {/* Background Dots */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            <div className="flex items-center justify-between mb-8 sticky top-0 bg-black/95 backdrop-blur z-20 pb-4 border-b border-white/10 pt-2">
                <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-0.5">MODUL FABRIKACE</span>
                    <h1 className="text-2xl font-black uppercase tracking-widest text-white">
                        {isEditingMode ? 'Upravit' : 'Vytvořit'} <span className="text-arc-yellow">Asset</span>
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleBackup}
                        className="p-3 bg-black border border-blue-500 text-blue-500 hover:bg-blue-500/10 active:scale-95 transition-all"
                        title="Stáhnout zálohu DB"
                    >
                        {isBackingUp ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                    {isEditingMode && (
                        <button type="button" onClick={handlePurgeClick} className="p-3 bg-black border border-red-600 text-red-600 hover:bg-red-600/20 active:scale-95 transition-all animate-pulse" title="GLOBÁLNÍ ČISTKA">
                            <Skull className="w-5 h-5" />
                        </button>
                    )}
                    {isEditingMode && onDelete && (
                        <button type="button" onClick={handleDeleteClick} className="p-3 bg-black border border-red-900/50 text-red-500 hover:bg-red-900/20 active:scale-95 transition-all">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    {isEditingMode && (
                        <button type="button" onClick={onClearData} className="p-3 bg-black border border-white/20 text-arc-yellow hover:bg-arc-yellow/10 active:scale-95 transition-all">
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="bg-black p-6 border border-white/10 space-y-6 relative shadow-lg">
                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/30"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/30"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/30"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/30"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                            <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-2 block">UNIKÁTNÍ ID (GENEROVÁNO)</label>
                            <div className="relative group">
                                <input
                                    name="id"
                                    value={newEvent.id}
                                    onChange={handleChange}
                                    placeholder="NXS-001"
                                    className={`w-full bg-black border p-4 text-white font-mono uppercase outline-none text-sm transition-colors ${isIdDuplicate ? 'border-red-500 focus:border-red-600 text-red-500' : 'border-zinc-800 focus:border-arc-yellow'}`}
                                    required
                                    readOnly={isEditingMode}
                                />
                                {isIdDuplicate && (
                                    <div className="absolute right-4 top-4 animate-pulse">
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    </div>
                                )}
                            </div>
                            {isIdDuplicate && (
                                <p className="text-[9px] text-red-500 font-bold uppercase mt-2 tracking-widest flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> KONFLIKT ID V DATABÁZI
                                </p>
                            )}
                            {!isIdDuplicate && newEvent.id.length > 3 && (
                                <p className="text-[9px] text-green-500 font-bold uppercase mt-2 tracking-widest flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> ID DOSTUPNÉ
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-2 block">TYP PŘEDMĚTU</label>
                            <div className="bg-black border border-zinc-800 p-1 hover:border-white/30 transition-colors">
                                <select name="type" value={newEvent.type} onChange={handleTypeChange} className="w-full bg-black text-white font-mono uppercase outline-none text-sm p-3 cursor-pointer">
                                    {Object.values(GameEventType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-2 block">NÁZEV PŘEDMĚTU</label>
                        <div className="grid grid-cols-[1fr_auto] gap-4">
                            <input name="title" value={newEvent.title} onChange={handleChange} placeholder="VLOŽTE NÁZEV" className="bg-black border border-zinc-800 p-4 text-white font-bold uppercase focus:border-arc-yellow outline-none text-sm tracking-wide" required />
                            <div className="bg-black border border-zinc-800 p-1 w-32">
                                <select name="rarity" value={newEvent.rarity} onChange={handleChange} className="w-full h-full bg-black text-[10px] text-zinc-200 font-mono uppercase outline-none px-2 cursor-pointer">
                                    {['Common', 'Rare', 'Epic', 'Legendary'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-2 block">TECHNICKÝ POPIS</label>
                        <textarea name="description" value={newEvent.description} onChange={handleChange} placeholder="Analýza..." rows={3} className="w-full bg-black border border-zinc-800 p-4 text-zinc-300 text-xs font-mono focus:border-arc-yellow outline-none resize-none" required />
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {newEvent.type === GameEventType.ITEM && <ItemPanel event={newEvent} onUpdate={updateEvent} masterCatalog={masterCatalog} />}
                    {newEvent.type === GameEventType.TRAP && <TrapPanel event={newEvent} onUpdate={updateEvent} />}
                    {(newEvent.type === GameEventType.ENCOUNTER || newEvent.type === GameEventType.BOSS) && (
                        <>
                            <CombatPanel event={newEvent} onUpdate={updateEvent} />
                            {newEvent.type === GameEventType.ENCOUNTER && <EnemyLootPanel event={newEvent} onUpdate={updateEvent} />}
                        </>
                    )}
                    {newEvent.type === GameEventType.MERCHANT && <MerchantPanel event={newEvent} onUpdate={updateEvent} />}
                    {newEvent.type === GameEventType.SPACE_STATION && <SpaceStationPanel event={newEvent} onUpdate={updateEvent} />}
                    {newEvent.type === GameEventType.PLANET && <PlanetPanel event={newEvent} onUpdate={updateEvent} masterCatalog={masterCatalog} />}
                    {newEvent.type === GameEventType.DILEMA && <DilemmaPanel event={newEvent} onUpdate={updateEvent} />}

                    <NightVariantPanel event={newEvent} onUpdate={updateEvent} />
                </div>

                <div className="flex items-center gap-6 bg-black p-6 border border-white/10 relative shadow-lg">
                    <div className="bg-white p-2 border border-zinc-800 shrink-0">
                        {newEvent.id ? (
                            <img src={currentQrUrl} alt="QR" className="w-24 h-24 object-contain" /> // Removed invert for better scanning
                        ) : (
                            <div className="w-24 h-24 flex items-center justify-center bg-zinc-900 border border-zinc-800">
                                <QrCode className="w-10 h-10 text-zinc-700" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.3em] mb-1">OPTICKÁ DATOVÁ MATICE</p>
                            <p className="text-[10px] text-zinc-300 font-mono truncate max-w-[120px]">{newEvent.id || 'ČEKÁM NA ID'}</p>
                        </div>

                        <button
                            type="button"
                            onClick={handleDownloadQr}
                            disabled={!newEvent.id || isDownloading}
                            className={`w-full py-3 px-4 text-[10px] uppercase font-bold flex items-center justify-center gap-2 border transition-all ${!newEvent.id ? 'text-zinc-700 border-zinc-800 cursor-not-allowed' : 'text-arc-yellow border-arc-yellow hover:bg-arc-yellow hover:text-black'}`}
                        >
                            {isDownloading ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            {isDownloading ? 'STAHUJI...' : 'STÁHNOUT PNG'}
                        </button>
                    </div>
                </div>

                {feedback.message && (
                    <div className={`p-4 border font-mono text-[10px] uppercase tracking-widest text-center animate-pulse ${feedback.type === 'success' ? 'text-arc-yellow border-arc-yellow/30 bg-arc-yellow/5' : 'text-arc-red border-arc-red/30 bg-arc-red/5'}`}>
                        {'>'} {feedback.message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isIdDuplicate}
                    className={`w-full py-6 font-black uppercase text-sm tracking-[0.4em] transition-all shadow-[0_0_30px_rgba(255,157,0,0.1)] flex items-center justify-center gap-3 clip-path-button ${isIdDuplicate ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' : 'bg-arc-yellow text-black hover:bg-white'}`}
                >
                    <Upload className="w-5 h-5" />
                    {isEditingMode ? 'SYNCHRONIZOVAT ZMĚNY' : 'NAHRÁT DO DATABÁZE'}
                </button>
            </form>

            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)}
                        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-6"
                    >
                        <motion.div
                            {...({ initial: { scale: 0.9, y: 20 }, animate: { scale: 1, y: 0 } } as any)}
                            className="bg-black border-2 border-red-600 w-full max-w-xs shadow-[0_0_60px_rgba(220,38,38,0.4)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse"></div>
                            <div className="p-6 text-center space-y-4">
                                <div className="flex justify-center mb-4">
                                    <div className="p-4 bg-red-600/10 rounded-full border border-red-600/50">
                                        <AlertTriangle className="w-12 h-12 text-red-600" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter">DESTRUKCE DAT</h3>
                                    <p className="text-[10px] text-red-600/60 font-mono mt-1 font-bold tracking-widest">LOKÁLNÍ & MASTER ODSTRANĚNÍ</p>
                                </div>
                                <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                                    Smazat tento asset z katalogu? Hráči o něj přijdou.
                                </p>
                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="py-3 bg-zinc-900 text-zinc-400 font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-colors border border-zinc-800"
                                    >
                                        ZRUŠIT
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="py-3 bg-red-600 text-black font-black uppercase text-[10px] tracking-widest hover:bg-red-500 transition-colors shadow-lg animate-pulse"
                                    >
                                        SMAZAT
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* GLOBAL PURGE MODAL */}
            <AnimatePresence>
                {showPurgeModal && (
                    <motion.div
                        {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)}
                        className="fixed inset-0 z-[250] bg-red-950/90 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <motion.div
                            {...({ initial: { scale: 0.9, y: 20 }, animate: { scale: 1, y: 0 } } as any)}
                            className="bg-black border-4 border-red-600 w-full max-w-sm shadow-[0_0_100px_rgba(220,38,38,0.8)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-600 animate-pulse"></div>
                            <div className="p-8 text-center space-y-6">
                                <div className="flex justify-center mb-4">
                                    <div className="p-6 bg-red-600 rounded-none border-4 border-black animate-bounce">
                                        <Skull className="w-16 h-16 text-black" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-red-600 uppercase tracking-tighter">GLOBÁLNÍ ČISTKA</h3>
                                    <p className="text-xs text-white font-mono mt-2 font-bold tracking-[0.2em] bg-red-600 px-2 py-1 inline-block">ADMIN PŘÍSTUP: ÚROVEŇ 5</p>
                                </div>
                                <p className="text-sm text-red-200 font-bold leading-relaxed border-y border-red-900/50 py-4">
                                    NEVRATNÁ AKCE.<br /><br />
                                    1. Smazání z Master Databáze.<br />
                                    2. <span className="text-white underline">VYNUCENÉ SMAZÁNÍ</span> ze VŠECH inventářů.
                                </p>
                                <div className="grid grid-cols-1 gap-3 mt-6">
                                    <button
                                        onClick={confirmPurge}
                                        className="py-5 bg-red-600 text-black font-black uppercase text-sm tracking-[0.3em] hover:bg-white transition-colors shadow-xl"
                                    >
                                        SPUSTIT ČISTKU
                                    </button>
                                    <button
                                        onClick={() => setShowPurgeModal(false)}
                                        className="py-4 bg-transparent text-zinc-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors"
                                    >
                                        ZRUŠIT
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Generator;


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
// import CharacterCreator from './generator/CharacterCreator';
// import CharacterList from './generator/CharacterList';
// import { Character } from '../types';

interface GeneratorProps {
    onSaveCard: (event: GameEvent) => void;
    userEmail: string;
    initialData?: GameEvent | null;
    onClearData?: () => void;
    onDelete?: (id: string) => void;
    masterCatalog?: GameEvent[]; // Added
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
    isConsumable: true, // DEFAULT TRUE FOR SAFETY
    isSellOnly: false, // NOVÉ
    canBeSaved: true,
    price: 0,
    trapConfig: { difficulty: 10, damage: 20, disarmClass: PlayerClass.ROGUE, successMessage: "Past zneškodněna.", failMessage: "Past sklapla!" },
    enemyLoot: { goldReward: 20, dropItemChance: 0 }, // REMOVED XP
    timeVariant: { enabled: false, nightStats: [] },
    stationConfig: { fuelReward: 50, repairAmount: 30, refillO2: true, welcomeMessage: "Vítejte na palubě." },
    resourceConfig: { isResourceContainer: false, resourceName: 'Surovina', resourceAmount: 1, customLabel: 'Surovina k Těžbě' },
    craftingRecipe: { enabled: false, requiredResources: [], craftingTimeSeconds: 60 },
    planetConfig: { planetId: 'p1', landingEventType: GameEventType.ENCOUNTER, phases: [] }
};

// Mapování typů na prefixy ID (Bez diakritiky pro bezpečnost QR kódů)
const ID_PREFIXES: Record<string, string> = {
    [GameEventType.ITEM]: 'PRE-',        // PŘE-dmět
    [GameEventType.ENCOUNTER]: 'SET-',   // SET-kání
    [GameEventType.TRAP]: 'NAS-',        // NÁS-traha
    [GameEventType.MERCHANT]: 'OBCH-',   // OBCH-odník
    [GameEventType.DILEMA]: 'DIL-',      // DIL-ema
    [GameEventType.BOSS]: 'BOSS-',       // BOSS
    [GameEventType.SPACE_STATION]: 'VS-',// V-esmírná S-tanice
    [GameEventType.PLANET]: 'PLA-',      // PLA-neta
};

const Generator: React.FC<GeneratorProps> = ({ onSaveCard, userEmail, initialData, onClearData, onDelete, masterCatalog = [] }) => {
    const [newEvent, setNewEvent] = useState<GameEvent>(initialEventState);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPurgeModal, setShowPurgeModal] = useState(false); // FOR GLOBAL PURGE

    // Character Management State
    // Character Management State
    // const [viewMode, setViewMode] = useState<'cards' | 'characters'>('cards');
    // const [characters, setCharacters] = useState<Character[]>([]);
    // const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
    // const [showCharacterCreator, setShowCharacterCreator] = useState(false);

    // Validace ID v reálném čase
    const isIdDuplicate = useMemo(() => {
        if (!newEvent.id) return false;
        // Pokud editujeme, ignorujeme shodu s vlastní "starou" verzí (pokud se ID nezměnilo)
        if (isEditingMode && initialData?.id === newEvent.id) return false;

        // Hledáme v katalogu
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
                    phases: initialData.planetConfig?.phases ?? [] // FIX: Nyní načítáme i fáze
                },
                isSellOnly: initialData.isSellOnly ?? false
            });
            setIsEditingMode(true);
        } else {
            // Při startu nového (pokud nejsme v editaci), vygenerujeme první ID
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

        // Generování nového ID při změně typu
        // Pouze pokud NEJDE o editaci existující karty (abychom omylem nepřepsali ID existující karty při změně typu)
        // NEBO pokud uživatel tvoří novou kartu
        if (!isEditingMode) {
            const prefix = ID_PREFIXES[newType] || 'GEN-';
            const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
            updateEvent({ type: newType, id: `${prefix}${randomSuffix}` });
        } else {
            // V edit módu změníme jen typ
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
            setFeedback({ message: 'GLOBÁLNÍ VYHLAZENÍ DOKONČENO.', type: 'success' });
            playSound('damage');
            if (onDelete) onDelete(newEvent.id); // Also remove from local/master
            setShowPurgeModal(false);
        } catch (e: any) {
            setFeedback({ message: `Chyba vyhlazení: ${e.message}`, type: 'error' });
        }
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            await apiService.downloadBackup();
            setFeedback({ message: 'Záloha stažena.', type: 'success' });
            playSound('success');
        } catch (e) {
            setFeedback({ message: 'Chyba zálohování.', type: 'error' });
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
            setFeedback({ message: 'Identifikátor chybí.', type: 'error' });
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
            setFeedback({ message: 'Identifikátor stažen do lokální cache.', type: 'success' });
        } catch (e) {
            setFeedback({ message: 'Chyba protokolu stahování.', type: 'error' });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userEmail || !newEvent.id) { setFeedback({ message: 'Zadejte ID assetu.', type: 'error' }); return; }
        if (isIdDuplicate) { setFeedback({ message: 'CHYBA: Toto ID již existuje!', type: 'error' }); playSound('error'); return; }

        try {
            const eventToSave = { ...newEvent };
            if (userEmail === 'zbynekbal97@gmail.com') eventToSave.qrCodeUrl = currentQrUrl;
            await onSaveCard(eventToSave);
            setFeedback({ message: 'Data synchronizována se serverem.', type: 'success' });
            if (!isEditingMode) {
                // Reset to default item
                const prefix = ID_PREFIXES[GameEventType.ITEM];
                const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
                setNewEvent({ ...initialEventState, id: `${prefix}${randomSuffix}` });
            }
        } catch (e: any) { setFeedback({ message: e.message, type: 'error' }); }
    };

    return (
        <div className="h-full overflow-y-auto p-6 pb-24 no-scrollbar bg-arc-bg text-white relative">
            {/* Background Dots */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            <div className="flex items-center justify-between mb-8 sticky top-0 bg-arc-bg/95 backdrop-blur z-20 pb-4 border-b border-arc-border">
                <h1 className="text-2xl font-bold uppercase tracking-tighter text-white">
                    {isEditingMode ? 'Editovat' : 'FABRIKACE'} <span className="text-arc-yellow">Assetu</span>
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleBackup}
                        className="p-2 bg-black border border-blue-500 text-blue-500 hover:bg-blue-500/10 active:scale-95 transition-all"
                        title="Stáhnout Zálohu DB"
                    >
                        {isBackingUp ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                    {isEditingMode && (
                        <button type="button" onClick={handlePurgeClick} className="p-2 bg-black border border-red-600 text-red-600 hover:bg-red-600/20 active:scale-95 transition-all animate-pulse" title="GLOBÁLNÍ VYHLAZENÍ">
                            <Skull className="w-5 h-5" />
                        </button>
                    )}
                    {isEditingMode && onDelete && (
                        <button type="button" onClick={handleDeleteClick} className="p-2 bg-black border border-red-900/50 text-red-500 hover:bg-red-900/20 active:scale-95 transition-all">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    {isEditingMode && (
                        <button type="button" onClick={onClearData} className="p-2 bg-black border border-arc-border text-arc-yellow hover:bg-arc-yellow/10 active:scale-95 transition-all">
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                <div className="bg-arc-panel p-6 border border-arc-border space-y-6 relative bracket-tl bracket-tr">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="relative">
                            <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest mb-1 block">ID_KARTY (jedinečné!):</label>
                            <div className="relative">
                                <input
                                    name="id"
                                    value={newEvent.id}
                                    onChange={handleChange}
                                    placeholder="NXS-001"
                                    className={`w-full bg-black border p-3 text-white font-mono uppercase outline-none text-sm transition-colors ${isIdDuplicate ? 'border-red-500 focus:border-red-600 text-red-500' : 'border-arc-border focus:border-arc-yellow'}`}
                                    required
                                    readOnly={isEditingMode}
                                />
                                {isIdDuplicate && (
                                    <div className="absolute right-3 top-3 animate-pulse">
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    </div>
                                )}
                            </div>
                            {isIdDuplicate && (
                                <p className="text-[9px] text-red-500 font-bold uppercase mt-1 tracking-widest flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> ID již existuje v databázi!
                                </p>
                            )}
                            {!isIdDuplicate && newEvent.id.length > 3 && (
                                <p className="text-[9px] text-green-500 font-bold uppercase mt-1 tracking-widest flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> ID Dostupné
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest mb-1 block">TYP_karty:</label>
                            <select name="type" value={newEvent.type} onChange={handleTypeChange} className="w-full bg-black border border-arc-border p-3 text-white font-mono uppercase focus:border-arc-yellow outline-none text-sm">
                                {Object.values(GameEventType).map(t => <option key={t} value={t} className="bg-arc-panel text-white">{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest mb-1 block">Název_karty:</label>
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                            <input name="title" value={newEvent.title} onChange={handleChange} placeholder="NÁZEV ASSETU" className="bg-black border border-arc-border p-3 text-white font-bold uppercase focus:border-arc-yellow outline-none text-sm" required />
                            <select name="rarity" value={newEvent.rarity} onChange={handleChange} className="bg-black border border-arc-border p-3 text-[10px] text-zinc-200 font-mono uppercase outline-none">
                                {['Common', 'Rare', 'Epic', 'Legendary'].map(r => <option key={r} value={r} className="bg-arc-panel text-white">{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[8px] text-zinc-300 uppercase font-bold tracking-widest mb-1 block">Popis_karty:</label>
                        <textarea name="description" value={newEvent.description} onChange={handleChange} placeholder="Analýza objektu..." rows={3} className="w-full bg-black border border-arc-border p-3 text-zinc-100 text-xs font-mono focus:border-arc-yellow outline-none" required />
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* ITEM CONFIGURATION */}
                    {newEvent.type === GameEventType.ITEM && (
                        <ItemPanel event={newEvent} onUpdate={updateEvent} masterCatalog={masterCatalog} />
                    )}

                    {/* TRAP CONFIGURATION */}
                    {newEvent.type === GameEventType.TRAP && (
                        <TrapPanel event={newEvent} onUpdate={updateEvent} />
                    )}

                    {/* COMBAT CONFIGURATION (ENCOUNTER / BOSS) */}
                    {(newEvent.type === GameEventType.ENCOUNTER || newEvent.type === GameEventType.BOSS) && (
                        <>
                            <CombatPanel event={newEvent} onUpdate={updateEvent} />
                            {newEvent.type === GameEventType.ENCOUNTER && (
                                <EnemyLootPanel event={newEvent} onUpdate={updateEvent} />
                            )}
                        </>
                    )}

                    {/* MERCHANT CONFIGURATION */}
                    {newEvent.type === GameEventType.MERCHANT && (
                        <MerchantPanel event={newEvent} onUpdate={updateEvent} />
                    )}

                    {/* SPACE STATION CONFIGURATION */}
                    {newEvent.type === GameEventType.SPACE_STATION && (
                        <SpaceStationPanel event={newEvent} onUpdate={updateEvent} />
                    )}

                    {/* PLANET CONFIGURATION */}
                    {newEvent.type === GameEventType.PLANET && (
                        <PlanetPanel event={newEvent} onUpdate={updateEvent} masterCatalog={masterCatalog} />
                    )}

                    {/* DILEMMA CONFIGURATION */}
                    {newEvent.type === GameEventType.DILEMA && (
                        <DilemmaPanel event={newEvent} onUpdate={updateEvent} />
                    )}

                    {/* NIGHT VARIANT CONFIGURATION (Available for all types) */}
                    <NightVariantPanel event={newEvent} onUpdate={updateEvent} />
                </div>

                <div className="flex items-center gap-6 bg-black p-6 border border-arc-border relative bracket-bl bracket-br">
                    <div className="bg-white p-2 border border-zinc-800 shrink-0">
                        {newEvent.id ? (
                            <img src={currentQrUrl} alt="QR" className="w-24 h-24 object-contain invert" />
                        ) : (
                            <div className="w-24 h-24 flex items-center justify-center bg-zinc-900 border border-zinc-800">
                                <QrCode className="w-10 h-10 text-zinc-700" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <p className="text-[8px] text-zinc-300 font-bold uppercase tracking-[0.3em] mb-1">QR kod karty!:</p>
                            <p className="text-[10px] text-zinc-200 font-mono truncate max-w-[120px]">{newEvent.id || 'WAITING_FOR_ID'}</p>
                        </div>

                        <button
                            type="button"
                            onClick={handleDownloadQr}
                            disabled={!newEvent.id || isDownloading}
                            className={`w-full py-3 px-4 text-[10px] uppercase font-bold flex items-center justify-center gap-2 border-2 transition-all ${!newEvent.id ? 'text-zinc-700 border-zinc-800 cursor-not-allowed' : 'text-arc-yellow border-arc-yellow hover:bg-arc-yellow hover:text-black'}`}
                        >
                            {isDownloading ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            {isDownloading ? 'Stahování...' : 'Uložit_PNG_Kód'}
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
                    className={`w-full py-6 border-2 font-black uppercase text-sm tracking-[0.4em] transition-all shadow-[0_0_30px_rgba(255,157,0,0.3)] rounded-xl flex items-center justify-center gap-3 ${isIdDuplicate ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-signal-amber border-signal-amber/50 text-black hover:bg-white hover:text-black'}`}
                >
                    <Upload className="w-5 h-5" />
                    {isEditingMode ? 'Synchronizovat_Změny' : 'Nahrát kartu do databáze!'}
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
                                    <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter">Destrukce Dat</h3>
                                    <p className="text-[10px] text-red-600/60 font-mono mt-1 font-bold tracking-widest">Smazat pouze z Master DB</p>
                                </div>
                                <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                                    Smaže kartu z katalogu. <br />Hráči, kteří ji už mají, o ni nepřijdou.
                                </p>
                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="py-3 bg-zinc-900 text-zinc-400 font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-colors border border-zinc-800"
                                    >
                                        Zrušit
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="py-3 bg-red-600 text-black font-black uppercase text-[10px] tracking-widest hover:bg-red-500 transition-colors shadow-lg animate-pulse"
                                    >
                                        Smazat
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
                                    <div className="p-6 bg-red-600 rounded-full border-4 border-black animate-bounce">
                                        <Skull className="w-16 h-16 text-black" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-red-600 uppercase tracking-tighter">GLOBÁLNÍ VYHLAZENÍ</h3>
                                    <p className="text-xs text-white font-mono mt-2 font-bold tracking-[0.2em] bg-red-600 px-2 py-1 inline-block">ADMIN OVERRIDE: LEVEL 5</p>
                                </div>
                                <p className="text-sm text-red-200 font-bold leading-relaxed border-y border-red-900/50 py-4">
                                    TATO AKCE JE NEVRATNÁ.<br /><br />
                                    1. Smaže kartu z Master Databáze.<br />
                                    2. <span className="text-white underline">NÁSILÍM ODSTRANÍ</span> kartu z batohu VŠECH hráčů na serveru.
                                </p>
                                <div className="grid grid-cols-1 gap-3 mt-6">
                                    <button
                                        onClick={confirmPurge}
                                        className="py-5 bg-red-600 text-black font-black uppercase text-sm tracking-[0.3em] hover:bg-white transition-colors shadow-xl"
                                    >
                                        PROVÉST VYHLAZENÍ
                                    </button>
                                    <button
                                        onClick={() => setShowPurgeModal(false)}
                                        className="py-4 bg-transparent text-zinc-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors"
                                    >
                                        Zrušit Protokol
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

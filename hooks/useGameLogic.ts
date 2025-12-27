import { useState, useEffect, useRef } from 'react';
import * as apiService from '../services/apiService';
import { GameEvent, GameEventType, PlayerClass, RoomState, DilemmaOption } from '../types';
import { playSound, toggleSoundSystem, toggleVibrationSystem, vibrate } from '../services/soundService';

const ADMIN_EMAIL = 'zbynekbal97@gmail.com';
const TEST_ACCOUNT_EMAIL = 'test1@nexus.cz'; // Pro wipe testovacích dat

// Helper to determine day/night based on real time
const isNightTime = () => {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 6;
};

// --- LOGIC HOOK ---
export enum Tab {
    SCANNER = 'scanner',
    INVENTORY = 'inventory',
    MERCHANT = 'merchant',
    GENERATOR = 'generator',
    CHARACTERS = 'characters',
    DATABASE = 'database',
    ROOM = 'room',
    SETTINGS = 'settings',
    SPACESHIP = 'spaceship'
}

export const useGameLogic = () => {
    // --- STATE ---
    const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('nexus_current_user'));
    const [isAdmin, setIsAdmin] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [isTestMode, setIsTestMode] = useState(false);

    const [isServerReady, setIsServerReady] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isNight, setIsNight] = useState(isNightTime());
    const [adminNightOverride, setAdminNightOverride] = useState<boolean | null>(null);

    // Game Stats
    // const [playerHP, setPlayerHP] = useState(100); // Internal state - REMOVED (Build Fix)
    const [playerHp, setPlayerHp] = useState(100); // Public state (renaming consistency)
    const [playerMana, setPlayerMana] = useState(100);
    const [playerFuel, setPlayerFuel] = useState(100);
    const [playerGold, setPlayerGold] = useState(0);
    const [playerArmor, setPlayerArmor] = useState(0);
    const [playerOxygen, setPlayerOxygen] = useState(100);
    const [playerClass, setPlayerClass] = useState<PlayerClass | null>(null);
    const [activeCharacter, setActiveCharacter] = useState<any | null>(null);

    // UI State

    const [activeTab, setActiveTab] = useState<string>('scanner');
    const [notification, setNotification] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    useEffect(() => {
        if (notification) console.log("%c[NEXUS NOTIF]", "color: #00f2ff; font-weight: bold", notification.message);
    }, [notification]);

    const [scanLog, setScanLog] = useState<string[]>([]);
    const [isAIThinking, setIsAIThinking] = useState(false);
    const [screenFlash, setScreenFlash] = useState<'red' | 'green' | 'blue' | null>(null);

    // Settings
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [vibrationEnabled, setVibrationEnabled] = useState(true);

    // Events & Inventory
    const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
    const [inventory, setInventory] = useState<GameEvent[]>([]);
    const [masterCatalog, setMasterCatalog] = useState<GameEvent[]>([]);
    const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null); // For Generator

    // Multiplayer State
    const [roomState, setRoomState] = useState<RoomState>({
        id: '',
        isInRoom: false,
        members: [],
        messages: [],
        nickname: '',
        isNicknameSet: false,
        isGameStarted: false,
        roundNumber: 0,
        turnIndex: 0,
        turnOrder: [],
        readyForNextRound: [],
        host: '',
        activeTrades: [] // NEW
    });
    // Trade State
    const [activeTrade, setActiveTrade] = useState<any | null>(null);

    const [isSoloMode, setIsSoloMode] = useState(false);
    const [giftTarget, setGiftTarget] = useState<string>(''); // Email receiver

    // Turn Management
    const isMyTurn = roomState.isInRoom && roomState.isGameStarted && roomState.turnOrder[roomState.turnIndex] === roomState.nickname;
    const isBlocked = roomState.isInRoom && (!roomState.isGameStarted || !isMyTurn);
    const [showRoundEndAlert, setShowRoundEndAlert] = useState(false);
    const [showEndTurnPrompt, setShowEndTurnPrompt] = useState(false);

    // Complex Interactions
    const [isDocking, setIsDocking] = useState(false);
    const [activeStation, setActiveStation] = useState<GameEvent | null>(null);
    const [activeMerchant, setActiveMerchant] = useState<GameEvent | null>(null);

    const prevMembersRef = useRef<any[]>([]);
    const playerHpRef = useRef(playerHp);
    const hasNotifiedStartRef = useRef(false);
    const hasNotifiedTurnRef = useRef(false);
    const prevTurnIndexRef = useRef<number>(-1);
    const lastSetEventTimeRef = useRef<number>(0);

    // ... (useEffect refs updates unchanged)
    // ... (Initialization unchanged)
    // ... (Recovery Validation unchanged)
    // ... (Persistence unchanged)
    // ... (Actions, Logs, TestMode unchanged)
    // ... (Refresh DB, Save/Delete/Craft handlers unchanged)

    // --- TRADE V2 HANDLERS ---

    // OLD SWAP (Deprecated but kept for manual local test or fallback)
    const handleSwapItems = async (makerEmail: string, takerEmail: string, makerItemId: string, takerItemId: string) => {
        try {
            const result = await apiService.swapItems(makerEmail, takerEmail, makerItemId, takerItemId);
            setNotification({ id: 'swap-ok', message: 'Výměna úspěšná.', type: 'success' });
            playSound('success');
            if (isGuest) { /* Guest Logic kept as is in old impl */ }
            else { handleRefreshDatabase(); }
        } catch (e) {
            setNotification({ id: 'swap-err', message: 'Výměna selhala.', type: 'error' });
            playSound('error');
        }
    }

    const handleInitTrade = async (targetNick: string, item: GameEvent) => {
        if (!roomState.id || !roomState.nickname || !userEmail) return;
        try {
            await apiService.initTrade(roomState.id, userEmail, roomState.nickname, targetNick, item);
        } catch (e: any) {
            setNotification({ id: 'trade-init-err', message: e.message, type: 'error' });
        }
    };

    const handleCancelTrade = async () => {
        if (!roomState.id || !activeTrade) return;
        try {
            await apiService.cancelTrade(roomState.id, activeTrade.id);
            setActiveTrade(null);
        } catch (e) { console.warn("Cancel trade failed", e); }
    };

    const handleConfirmTrade = async (isConfirmed: boolean) => {
        if (!roomState.id || !activeTrade || !userEmail) return;
        try {
            const res = await apiService.confirmTrade(roomState.id, activeTrade.id, userEmail, isConfirmed);
            if (res.success && res.status === 'COMPLETED') {
                playSound('success');
                setNotification({ id: 'trade-done', message: 'Obchod dokončen!', type: 'success' });
                setActiveTrade(null);
                handleRefreshDatabase();
            }
        } catch (e) { console.warn("Confirm trade failed", e); }
    };

    const handleTradeSelectOffer = async (item: GameEvent) => {
        if (!roomState.id || !activeTrade || !userEmail) return;
        try {
            await apiService.updateTrade(roomState.id, activeTrade.id, userEmail, item);
        } catch (e) { console.warn("Update trade failed", e); }
    };

    // --- GAMEPLAY HANDLERS ---
    const handleHpChange = (amount: number) => {
        setPlayerHp(prev => {
            const newVal = Math.min(150, Math.max(0, prev + amount)); // Using 150 as theoretical max or logic specific
            if (newVal < prev) {
                setScreenFlash('red');
                vibrate(200);
            } else if (newVal > prev) {
                setScreenFlash('green');
            }
            // Sync immediately to room
            if (roomState.isInRoom && roomState.id) {
                apiService.updatePlayerStatus(roomState.id, roomState.nickname, newVal);
            }
            return newVal;
        });
        setTimeout(() => setScreenFlash(null), 300);
    };

    const handleManaChange = (amount: number) => setPlayerMana(prev => Math.min(100, Math.max(0, prev + amount)));
    const handleFuelChange = (amount: number) => setPlayerFuel(prev => Math.min(100, Math.max(0, prev + amount)));
    const handleGoldChange = (amount: number) => setPlayerGold(prev => Math.max(0, prev + amount));

    // --- CRAFTING & PROGRESS ---
    const handleCraftItem = async (_recipeId: string, ingredients: string[], result: GameEvent) => {
        // Simple craft: remove ingredients, add result
        // Verify ingredients existence
        const hasAll = ingredients.every(ingId => inventory.some(i => i.id === ingId));
        if (!hasAll && !isTestMode) {
            setNotification({ id: 'craft-err', message: 'Chybí suroviny!', type: 'error' });
            return;
        }

        if (!isTestMode) {
            for (const ingId of ingredients) {
                // Find instance to remove
                const toRemove = inventory.find(i => i.id === ingId);
                if (toRemove) await handleDeleteEvent(toRemove.id);
            }
        }

        await handleSaveEvent(result, true);
        playSound('success');
        setNotification({ id: 'craft-ok', message: `Vyrobeno: ${result.title}`, type: 'success' });
    };

    const handlePlanetProgress = async (navCardId: string) => {
        setIsRefreshing(true);
        try {
            const card = inventory.find(i => i.id === navCardId);
            if (!card) return;
            const nextProgress = (card.planetProgress || 0) + 1;
            const updatedCard = { ...card, planetProgress: nextProgress };
            await handleSaveEvent(updatedCard, false);
            setNotification({ id: 'scan-prog-' + Date.now(), message: `Postup v sektoru: ${nextProgress}`, type: 'success' });
        } catch (e) {
            console.error("Planet progress failed", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleWipeTestVault = async () => {
        if (!isAdmin) return;
        if (!confirm("OPRAVDU SMAZAT CELÝ TESTOVACÍ BATOH (test1@nexus.cz)? Tuto akci nelze vzít zpět.")) return;

        setIsRefreshing(true);
        playSound('error');
        try {
            // Fetch current full test inventory to get IDs
            const currentInv = await apiService.getInventory(TEST_ACCOUNT_EMAIL);

            // Delete all items one by one (API doesn't have wipe endpoint yet, safer this way for now)
            await Promise.all(currentInv.map(item => apiService.deleteCard(TEST_ACCOUNT_EMAIL, item.id)));

            // Clear local
            setInventory([]);
            localStorage.setItem(`nexus_inv_${TEST_ACCOUNT_EMAIL}`, JSON.stringify([]));

            setNotification({ id: 'wipe-ok', message: 'Testovací batoh byl kompletně vymazán.', type: 'success' });
            playSound('success');
        } catch (e) {
            setNotification({ id: 'wipe-err', message: 'Chyba při mazání testovacích dat.', type: 'error' });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleHardReset = async () => {
        if (isGuest) {
            if (!confirm("VAROVÁNÍ: Jste v režimu Host. Vynucená synchronizace SMAŽE všechna lokální data a nenávratně ztratíte inventář. Pokračovat?")) {
                return;
            }
            setInventory([]);
            localStorage.removeItem('nexus_inv_guest');
            localStorage.removeItem('nexus_master_catalog');
            setNotification({ id: 'hard-reset', message: 'Lokální data smazána.', type: 'info' });
            window.location.reload();
        }
        await handleRefreshDatabase();
    };

    // Apply character perks based on conditions
    const applyCharacterPerks = (character: any, currentIsNight: boolean) => {
        if (!character || !character.perks) return { hp: 0, mana: 0, armor: 0, damage: 0, critChance: 0 };

        let bonuses = { hp: 0, mana: 0, armor: 0, damage: 0, critChance: 0 };

        character.perks.forEach((perk: any) => {
            const condition = perk.effect.condition || 'always';
            let shouldApply = false;

            switch (condition) {
                case 'always':
                    shouldApply = true;
                    break;
                case 'night':
                    shouldApply = currentIsNight;
                    break;
                case 'day':
                    shouldApply = !currentIsNight;
                    break;
                case 'combat':
                    // Combat perks will be applied during combat events
                    shouldApply = false;
                    break;
            }

            if (shouldApply) {
                const stat = perk.effect.stat;
                const modifier = perk.effect.modifier;
                const isPercentage = perk.effect.isPercentage;

                if (bonuses.hasOwnProperty(stat)) {
                    if (isPercentage) {
                        // Percentage bonuses will be applied after base stats
                        bonuses[stat as keyof typeof bonuses] += modifier;
                    } else {
                        bonuses[stat as keyof typeof bonuses] += modifier;
                    }
                }
            }
        });

        return bonuses;
    };

    const handleGameSetup = async (nickname: string, pClass: PlayerClass, roomId: string | 'create' | 'solo' | 'solo-online', password?: string, character?: any) => {
        localStorage.setItem(`nexus_nickname_${userEmail}`, nickname);
        localStorage.setItem(`nexus_class_${userEmail || 'guest'}`, pClass);
        setPlayerClass(pClass);

        // Apply character stats if custom character is provided
        if (character) {
            setActiveCharacter(character);

            // Apply base stats
            let finalHp = character.baseStats.hp;
            let finalMana = character.baseStats.mana;
            let finalArmor = character.baseStats.armor;

            // Apply perks
            const perkBonuses = applyCharacterPerks(character, isNight);
            finalHp += perkBonuses.hp;
            finalMana += perkBonuses.mana;
            finalArmor += perkBonuses.armor;

            setPlayerHp(finalHp);
            setPlayerMana(finalMana);
            setPlayerArmor(finalArmor);
            // Store character for later use (perks, etc.)
            localStorage.setItem(`nexus_character_${userEmail}`, JSON.stringify(character));

            // Show perks notification for game start
            const activePerks = character.perks?.filter((p: any) => {
                const cond = p.effect.condition || 'always';
                return cond === 'always' || (cond === 'night' && isNight) || (cond === 'day' && !isNight);
            }) || [];

            if (activePerks.length > 0) {
                const perkList = activePerks.map((p: any) => p.name).join(', ');
                // Delay notification until game transition completes
                setTimeout(() => {
                    setNotification({
                        id: 'char-init-' + Date.now(),
                        type: 'success',
                        message: `Postava ${character.name} připravena! Aktivní perky: ${perkList}`
                    });
                    playSound('success');
                }, 1500);
            }
        }

        try {
            if (roomId === 'solo') {
                setIsSoloMode(true);
                localStorage.setItem('nexus_solo_mode', 'true');
                localStorage.setItem('nexus_is_in_room', 'false');
                setRoomState(prev => ({ ...prev, nickname, isNicknameSet: true, isInRoom: false, id: '' }));
                addToLog(`Systém aktivován. Batoh připraven, ${nickname}.`);
                return;
            }

            let finalRoomId = '';
            let isHost = false;

            if (roomId === 'create' || roomId === 'solo-online') {
                finalRoomId = (roomId === 'solo-online' ? 'SOLO-' : '') + Math.random().toString(36).substring(2, 7).toUpperCase();
                await apiService.createRoom(finalRoomId, nickname, userEmail || 'guest', password);
                isHost = true;
            } else {
                finalRoomId = roomId.toUpperCase();
                await apiService.joinRoom(finalRoomId, nickname, playerHp, password, userEmail || undefined);
            }

            setRoomState(prev => ({
                ...prev,
                id: finalRoomId,
                nickname,
                isNicknameSet: true,
                isInRoom: true,
                host: isHost ? nickname : prev.host,
                members: isHost ? [{ name: nickname, email: userEmail || 'guest', hp: 100, isReady: false }] : prev.members
            }));

            localStorage.setItem('nexus_last_room_id', finalRoomId);
            localStorage.setItem('nexus_is_in_room', 'true');
            setIsSoloMode(roomId === 'solo-online');
            localStorage.setItem('nexus_solo_mode', roomId === 'solo-online' ? 'true' : 'false');

            if (roomId === 'solo-online') {
                setTimeout(async () => {
                    try { await apiService.startGame(finalRoomId); } catch (e) { console.error("Auto-start failed", e); }
                }, 1000);
            }

            addToLog(`${roomId === 'create' ? 'Sektor založen' : 'Vstup do sektoru'}: ${finalRoomId} `);

        } catch (e: any) {
            setNotification({ id: 'room-err', type: 'error', message: e.message });
            throw e;
        }
    };

    const handleLeaveRoom = async () => {
        if (roomState.id && roomState.nickname) {
            await apiService.leaveRoom(roomState.id, roomState.nickname);
        }
        setRoomState(prev => ({ ...prev, isInRoom: false, id: '' }));
        localStorage.removeItem('nexus_last_room_id');
        localStorage.removeItem('nexus_is_in_room');
        setIsSoloMode(true);
        localStorage.setItem('nexus_solo_mode', 'true');
        setScanLog([]);
    };

    const handleExitToMenu = async () => {
        if (roomState.id && roomState.nickname) {
            try { await apiService.leaveRoom(roomState.id, roomState.nickname); } catch (e) { console.warn("Leave room failed", e); }
        }
        setRoomState(prev => ({ ...prev, isInRoom: false, id: '', isNicknameSet: false }));
        localStorage.removeItem('nexus_last_room_id');
        localStorage.removeItem('nexus_is_in_room');
        setIsSoloMode(false);
        localStorage.setItem('nexus_solo_mode', 'false');
        setScanLog([]);
    };

    const handleToggleReady = async () => {
        if (!roomState.id || !roomState.nickname) return;
        const myMember = roomState.members.find(m => m.name === roomState.nickname);
        const newState = !myMember?.isReady;
        try {
            await apiService.toggleReady(roomState.id, roomState.nickname, newState);
            // Optimistic update
            setRoomState(prev => ({
                ...prev,
                members: prev.members.map(m => m.name === prev.nickname ? { ...m, isReady: newState } : m)
            }));
            playSound('success');
        } catch (e) {
            console.error("Ready toggle failed", e);
        }
    };

    const handleSendMessage = async (text: string) => {
        if (!roomState.id || !roomState.nickname) return;
        try {
            await apiService.sendMessage(roomState.id, roomState.nickname, text);
        } catch (e) { console.warn("Message failed", e); }
    };

    const handleInspectItem = async (itemId: string) => {
        setIsAIThinking(true);
        try {
            let item: GameEvent | null | undefined = masterCatalog.find(i => i.id === itemId);
            if (!item) {
                item = await apiService.getCardById(ADMIN_EMAIL, itemId);
            }
            if (item) {
                setCurrentEvent(getAdjustedItem(item, isNight, playerClass));
                addToLog(`Inspekce: ${item.title} `);
            } else {
                setNotification({ id: 'inspect-err', type: 'error', message: "Data assetu nelze dekódovat." });
            }
        } catch (e) {
            setNotification({ id: 'inspect-err', type: 'error', message: "Chyba spojení s Batohem." });
        } finally {
            setIsAIThinking(false);
        }
    };

    // --- POLLING & SYNC ---
    useEffect(() => {
        if (activeTab === Tab.ROOM && roomState.isInRoom && roomState.id && isServerReady) {
            const sync = async () => {
                try {
                    const status = await apiService.getRoomStatus(roomState.id);
                    const messages = await apiService.getRoomMessages(roomState.id);
                    setRoomState(prev => ({
                        ...prev, members: status.members, turnOrder: status.turnOrder, turnIndex: status.turnIndex,
                        messages, isGameStarted: status.isGameStarted, roundNumber: status.roundNumber,
                        readyForNextRound: status.readyForNextRound, host: status.host
                    }));
                } catch (e) { }
            };
            sync();

            // Extra sync check specifically requested by user ("vždy když se zobrazí okno tým")
            const t = setTimeout(sync, 300);
            return () => clearTimeout(t);
        }
    }, [activeTab, roomState.isInRoom, roomState.id, isServerReady]);

    useEffect(() => {
        if (!roomState.isInRoom || !roomState.id || !isServerReady) return;
        const pollInterval = setInterval(async () => {
            try {
                const status = await apiService.getRoomStatus(roomState.id);
                const messages = await apiService.getRoomMessages(roomState.id);
                prevMembersRef.current = status.members;

                // Check if I was kicked
                const stillMember = status.members.some((m: any) => m.name === roomState.nickname);
                if (!stillMember && roomState.isInRoom) {
                    setNotification({ id: 'kicked', type: 'error', message: '🚫 Byl jsi vyhozen ze sektoru.' });
                    handleLeaveRoom();
                    return;
                }

                if (status.isGameStarted && !hasNotifiedStartRef.current) {
                    setNotification({ id: 'game-start', type: 'success', message: '🚀 MISE ZAHÁJENA! Sektor byl uzamčen.' });
                    playSound('success');
                    hasNotifiedStartRef.current = true;
                }

                // Check for turn change
                const newTurnPlayer = status.turnOrder?.[status.turnIndex];
                const currentTurnIndex = status.turnIndex;

                // Pokud se změnil turnIndex, resetujeme notifikaci
                if (currentTurnIndex !== prevTurnIndexRef.current) {
                    hasNotifiedTurnRef.current = false;
                    prevTurnIndexRef.current = currentTurnIndex;

                    // Pokud je to můj tah, zobrazíme notifikaci
                    if (status.isGameStarted && newTurnPlayer === roomState.nickname) {
                        setNotification({ id: 'your-turn-' + Date.now(), type: 'warning', message: '⚠️ JSI NA TAHU!' });
                        playSound('open');
                        vibrate([100, 50, 100]);
                        hasNotifiedTurnRef.current = true;
                    }
                }

                setRoomState(prev => ({
                    ...prev, members: status.members, turnIndex: status.turnIndex, messages, isGameStarted: status.isGameStarted,
                    roundNumber: status.roundNumber, turnOrder: status.turnOrder, readyForNextRound: status.readyForNextRound, host: status.host
                }));

                // NEW: Global Encounter Sync
                if (status.activeEncounter) {
                    // If we are not currently viewing this specific encounter, Open it
                    if (!currentEvent || currentEvent.id !== status.activeEncounter.id) {
                        const syncedEvent = getAdjustedItem(status.activeEncounter, isNight, playerClass);
                        setCurrentEvent(syncedEvent);
                        lastSetEventTimeRef.current = Date.now();
                        playSound('error');
                        vibrate([200, 100, 200]);
                    }
                }
                // REMOVED: Auto-close logic on null encounter. 
                // As requested, players should close global cards manually to avoid race conditions and ensure they can react.

                await apiService.updatePlayerStatus(roomState.id, roomState.nickname, playerHpRef.current);
            } catch (e: any) {
                if (e.message?.includes('404') || e.message?.includes('Sektor nenalezen')) {
                    console.warn("Room lost: redirecting to setup");
                    setRoomState(prev => ({ ...prev, isInRoom: false, id: '' }));
                    localStorage.setItem('nexus_is_in_room', 'false');
                }
            }
        }, 1500); // Increased polling speed for better team sync
        return () => clearInterval(pollInterval);
    }, [roomState.isInRoom, roomState.id, roomState.nickname, isGuest, isServerReady, currentEvent]);

    const handleKickPlayer = async (targetName: string) => {
        if (roomState.host !== roomState.nickname) return;
        try {
            await apiService.adminAction(roomState.id, targetName, 'kick', null);
            setNotification({ id: 'kick-ok', type: 'success', message: `${targetName} byl odstraněn.` });
            playSound('success');
            // Refresh local state immediately
            const status = await apiService.getRoomStatus(roomState.id);
            setRoomState(prev => ({ ...prev, members: status.members, turnOrder: status.turnOrder }));
        } catch (e) {
            console.error("Kick failed", e);
        }
    };

    const handleStartGame = async () => {
        if (roomState.host !== roomState.nickname) return;
        try {
            await apiService.startGame(roomState.id);
            // Optimistic start
            setRoomState(prev => ({ ...prev, isGameStarted: true }));
            playSound('success');
        } catch (e) {
            console.error("Start game failed", e);
        }
    };

    // --- MOVED OUT OF HANDLE START GAME ---
    const handleScanCode = async (code: string) => {
        if (isBlocked && !code.startsWith('friend:')) {
            const msg = !roomState.isGameStarted ? "MISE NEZAČALA: Čekejte na hostitele." : "NEMŮŽEŠ SKENOVAT: Nejseš na tahu!";
            setNotification({ id: 'block', type: 'error', message: msg });
            vibrate([100, 50, 100]);
            playSound('error');
            return;
        }

        if (playerFuel <= 0 && !code.startsWith('friend:')) {
            setNotification({ id: 'no-fuel', type: 'error', message: "NEDOSTATEK PALIVA: Loď nemůže manévrovat (skenovat)." });
            playSound('error');
            vibrate([200, 200, 200]);
            return;
        }

        setIsAIThinking(true);
        vibrate(50);
        playSound('scan');

        // Check if it's a character QR code
        if (code.toUpperCase().startsWith('CHAR-')) {
            try {
                const character = await apiService.getCharacterById(code.toUpperCase());
                if (character) {
                    setActiveCharacter(character);

                    // Apply base stats
                    let finalHp = character.baseStats.hp;
                    let finalMana = character.baseStats.mana;
                    let finalArmor = character.baseStats.armor;

                    // Apply perks
                    const perkBonuses = applyCharacterPerks(character, isNight);
                    finalHp += perkBonuses.hp;
                    finalMana += perkBonuses.mana;
                    finalArmor += perkBonuses.armor;

                    setPlayerHp(finalHp);
                    setPlayerMana(finalMana);
                    setPlayerArmor(finalArmor);
                    setPlayerClass(character.name as any);
                    localStorage.setItem(`nexus_character_${userEmail}`, JSON.stringify(character));

                    // Visual feedback
                    setScreenFlash('blue');

                    // Enhanced notification with perk info
                    const activePerks = character.perks?.filter((p: any) => {
                        const cond = p.effect.condition || 'always';
                        return cond === 'always' || (cond === 'night' && isNight) || (cond === 'day' && !isNight);
                    }) || [];

                    const perkList = activePerks.map((p: any) => p.name).join(', ');
                    const message = activePerks.length > 0
                        ? `Postava ${character.name} aktivována! Aktivní perky: ${perkList}`
                        : `Postava ${character.name} aktivována! (Žádné aktivní perky)`;

                    // Set notification and clear flash in next ticks
                    setTimeout(() => {
                        setScreenFlash(null);
                        setNotification({
                            id: `char-loaded-${Date.now()}`,
                            type: 'success',
                            message
                        });
                        playSound('success');
                        addToLog(`Postava aktivována: ${character.name}`);
                    }, 300);

                    setIsAIThinking(false);
                    return;
                }
            } catch (e) {
                console.error('Character load failed:', e);
            }
        }

        const localItem = inventory.find(i => {
            const baseId = i.id.split('__')[0];
            return baseId.toLowerCase() === code.toLowerCase() || i.id.toLowerCase() === code.toLowerCase();
        });

        if (localItem) {
            handleFoundItem(localItem, 'scanner');
            return;
        }

        const vaultItem = masterCatalog.find(i => i.id.toLowerCase() === code.toLowerCase());
        if (vaultItem) {
            handleFoundItem(vaultItem, 'scanner');
            return;
        }

        if (navigator.onLine) {
            try {
                const cloudItem = await apiService.getCardById(ADMIN_EMAIL, code);
                if (cloudItem) {
                    handleFoundItem(cloudItem, 'scanner');
                    return;
                }
            } catch (e) { /* Silent ID check fail */ }
        }

        setIsAIThinking(false);
        setNotification({ id: 'not-found-' + Date.now(), type: 'error', message: 'ID karty nenalezeno.' });
        playSound('error');
    };

    const handleFoundItem = (item: GameEvent, source: 'scanner' | 'inventory' | null = null) => {
        if (source === 'scanner') {
            handleFuelChange(-5);
            addToLog(`Manévr lodi: -5 % Paliva`);
        }

        const adjusted = getAdjustedItem(item, isNight, playerClass);

        if (adjusted.type === GameEventType.SPACE_STATION && source === 'scanner') {
            setIsAIThinking(false);
            setIsDocking(true);
            setCurrentEvent(adjusted);
            lastSetEventTimeRef.current = Date.now();
            return;
        }

        setCurrentEvent(adjusted);
        lastSetEventTimeRef.current = Date.now();

        // NEW: Broadcast if Global Dilemma
        if (adjusted.type === GameEventType.DILEMA && adjusted.dilemmaScope === 'GLOBAL' && roomState.isInRoom) {
            apiService.setRoomEncounter(roomState.id, item); // Send RAW item to server
        }

        addToLog(source === 'scanner' ? `Skenováno: ${adjusted.title} ` : `Zobrazeno: ${adjusted.title} `);
        setIsAIThinking(false);
    };

    const handleDockingComplete = () => {
        setIsDocking(false);
        if (currentEvent && currentEvent.type === GameEventType.SPACE_STATION) {
            setActiveStation(currentEvent);
            setCurrentEvent(null);
            addToLog(`Dokováno: ${currentEvent.title} `);
            playSound('success');
        }
    };

    const closeEvent = (forceEndTurn = false) => {
        if (currentEvent?.dilemmaScope === 'GLOBAL' && roomState.isInRoom) {
            apiService.setRoomEncounter(roomState.id, null);
        }

        const wasMyTurn = isMyTurn && roomState.isGameStarted;

        setCurrentEvent(null);

        if (forceEndTurn === true && wasMyTurn) {
            handleEndTurn();
        }
    };

    const handleUseEvent = async (event: GameEvent) => {
        if (isBlocked) {
            const msg = !roomState.isGameStarted ? "MISE NEZAČALA: Čekejte na hostitele." : "NEMŮŽEŠ HRÁT: Nejseš na tahu!";
            setNotification({ id: 'block-use', type: 'error', message: msg });
            return;
        }

        if (event.isSellOnly) {
            setNotification({ id: 'sell-only', message: 'Tento předmět nelze použít, pouze prodat.', type: 'error' });
            return;
        }

        // HANDLE MERCHANT OPENING
        if (event.type === GameEventType.MERCHANT) {
            setActiveMerchant(event);
            closeEvent();
            playSound('open');
            return;
        }

        let effectApplied = false;

        if (event.stats && event.stats.length > 0) {
            event.stats.forEach(stat => {
                const rawValue = String(stat.value);
                const numericPart = rawValue.replace(/[^0-9-]/g, '');
                const val = parseInt(numericPart);
                const label = String(stat.label).toUpperCase().trim();

                if (!isNaN(val) && val !== 0) {
                    if (['HP', 'ZDRAVÍ', 'HEAL'].some(k => label.includes(k))) { handleHpChange(val); effectApplied = true; }
                    else if (['MANA', 'ENERGIE'].some(k => label.includes(k))) { handleManaChange(val); effectApplied = true; }
                    else if (['PALIVO', 'FUEL'].some(k => label.includes(k))) { handleFuelChange(val); effectApplied = true; }
                    else if (['GOLD', 'ZLATO'].some(k => label.includes(k))) { handleGoldChange(val); effectApplied = true; }
                    else if (['O2', 'KYSLÍK'].some(k => label.includes(k))) { setPlayerOxygen(prev => Math.min(100, Math.max(0, prev + val))); effectApplied = true; }
                    else if (['ARMOR', 'BRNĚNÍ'].some(k => label.includes(k))) { setPlayerArmor(prev => Math.max(0, prev + val)); effectApplied = true; }
                }
            });
        }

        if (effectApplied) {
            playSound('heal');
            setNotification({ id: 'use-success-' + Date.now(), message: 'Předmět použit.', type: 'success' });
            if (event.isConsumable) {
                await handleDeleteEvent(event.id);
            }
            closeEvent(true); // End turn for used items
        } else {
            if (event.isConsumable) {
                await handleDeleteEvent(event.id);
                setNotification({ id: 'consumed', message: 'Předmět spotřebován.', type: 'info' });
                closeEvent(true); // End turn for consumed items
            } else {
                setNotification({ id: 'no-effect', message: 'Tento předmět nemá žádný okamžitý efekt.', type: 'info' });
                vibrate(50);
            }
        }
    };

    const handleResolveDilemma = (option: DilemmaOption, result: 'success' | 'fail') => {
        if (result === 'success') {
            option.rewards?.forEach(reward => {
                if (reward.type === 'HP') handleHpChange(reward.value);
                if (reward.type === 'MANA') handleManaChange(reward.value);
                if (reward.type === 'GOLD') handleGoldChange(reward.value);
            });
            if (option.effectType === 'hp') handleHpChange(option.effectValue || 0);
        } else {
            if (option.failDamage) handleHpChange(-option.failDamage);
        }
    };

    const handleEndTurn = async () => {
        if (roomState.id) {
            try { await apiService.nextTurn(roomState.id); setShowEndTurnPrompt(false); } catch (e) { console.error("Next turn fail", e); }
        }
    };

    const handleLeaveStation = () => {
        setActiveStation(null);
        playSound('open');
    };

    const handleClaimStationRewards = (station: GameEvent) => {
        if (station.stationConfig) {
            if (station.stationConfig.fuelReward) handleFuelChange(station.stationConfig.fuelReward);
            if (station.stationConfig.repairAmount) handleHpChange(station.stationConfig.repairAmount);
            if (station.stationConfig.refillO2) setPlayerOxygen(100);
            playSound('success');
            setNotification({ id: 'station-reward', type: 'success', message: 'Servis dokončen.' });
        }
    };

    const handleAcknowledgeRound = async () => {
        if (roomState.id && roomState.nickname) {
            try { await apiService.acknowledgeRoundEnd(roomState.id, roomState.nickname); setShowRoundEndAlert(false); } catch (e) { console.warn("Ack round fail", e); }
        }
    };

    // --- MERCHANT ACTIONS ---
    const handleBuyItem = async (item: GameEvent) => {
        handleGoldChange(-(item.price || 0));
        await handleSaveEvent(item, false); // Save to inventory
        playSound('success');
        setNotification({ id: 'buy-success', type: 'success', message: `Zakoupeno: ${item.title} ` });
    };

    const handleSellItem = async (item: GameEvent, price: number) => {
        handleGoldChange(price);
        await handleDeleteEvent(item.id); // Remove from inventory
        playSound('success');
        setNotification({ id: 'sell-success', type: 'success', message: `Prodáno: ${item.title} (+${price} G)` });
    };

    return {
        const gStatus = !email.includes('@');
        setIsGuest(gStatus);
            setIsServerReady(gStatus); // Auto-ready for guests, others wait for health check or loader
    },
        handleLogout: () => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); },
            handleScanCode,
            handleSaveEvent, handlePlanetProgress,
            handleDeleteEvent, handleUseEvent, handleRefreshDatabase, handleGameSetup, handleLeaveRoom, handleKickPlayer, handleExitToMenu,
            handleResolveDilemma,
            handleEndTurn, handleSendMessage, closeEvent, handleHpChange, handleManaChange, handleGoldChange, handleFuelChange,
            handleOpenInventoryItem: (item: GameEvent) => {
                if (isAdmin && !isTestMode) {
                    setEditingEvent(item);
                    setActiveTab(Tab.GENERATOR);
                } else {
                    setCurrentEvent(item);
                }
            },
                getAdjustedItem, handleSwapItems, soundEnabled, vibrationEnabled,
                handleToggleSound: () => { toggleSoundSystem(!soundEnabled); setSoundEnabled(!soundEnabled); },
                    handleToggleVibration: () => { toggleVibrationSystem(!vibrationEnabled); setVibrationEnabled(!vibrationEnabled); },
                        handleInspectItem,
                        handleCraftItem,
                        handleHardReset,

                        handleWipeTestVault, // EXPORTED FOR SETTINGS
                        scanLog,
                        isTestMode,
                        toggleTestMode,
                        handleToggleReady, // EXPORT
                        handleSwitchToOffline: () => {
                            setIsGuest(true);
                            setIsServerReady(true); // Treat as ready for offline
                            setNotification({ id: 'offline-mode-' + Date.now(), message: 'Nouzový režim AKTIVNÍ (Offline)', type: 'warning' });
                        }
};
};

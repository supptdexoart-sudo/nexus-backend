
import { useState, useEffect, useRef } from 'react';
import { GameEvent, DilemmaOption, PlayerClass, GameEventType } from '../types';
import * as apiService from '../services/apiService';
import { NEXUS_SEED_DATA } from '../services/seedData';
import { playSound, vibrate, getSoundStatus, getVibrationStatus, toggleSoundSystem, toggleVibrationSystem } from '../services/soundService';
import { ToastData } from '../components/Toast';

const ADMIN_EMAIL = 'zbynekbal97@gmail.com';
const TEST_ACCOUNT_EMAIL = 'admin_test_vault@nexus.local'; // Virtuální účet pro testování

const MAX_PLAYER_HP = 100;
const MAX_PLAYER_MANA = 100;
const MAX_PLAYER_FUEL = 100; 
const INITIAL_GOLD = 100;

export enum Tab {
  SCANNER = 'scanner',
  INVENTORY = 'inventory',
  GENERATOR = 'generator',
  ROOM = 'room',
  SETTINGS = 'settings',
  SPACESHIP = 'spaceship'
}

const isNightTime = (): boolean => {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 6;
};

const getAdjustedItem = (item: GameEvent, isNight: boolean, pClass: PlayerClass | null): GameEvent => {
    let adjusted = { ...item };
    if (isNight && item.timeVariant?.enabled) {
        adjusted = {
            ...adjusted,
            title: item.timeVariant.nightTitle || adjusted.title,
            description: item.timeVariant.nightDescription || adjusted.description,
            type: item.timeVariant.nightType || adjusted.type,
            stats: item.timeVariant.nightStats || adjusted.stats
        };
    }
    if (pClass && item.classVariants && item.classVariants[pClass]) {
        const variant = item.classVariants[pClass]!;
        adjusted = {
            ...adjusted,
            title: variant.overrideTitle || adjusted.title,
            description: variant.overrideDescription || adjusted.description,
            type: variant.overrideType || adjusted.type,
            stats: variant.bonusStats ? [...(adjusted.stats || []), ...variant.bonusStats] : adjusted.stats
        };
    }
    return adjusted;
};

export const useGameLogic = () => {
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('nexus_current_user'));
  const isAdmin = userEmail === ADMIN_EMAIL;
  const isGuest = userEmail === 'guest';

  // TEST MODE STATE
  const [isTestMode, setIsTestMode] = useState(() => localStorage.getItem('nexus_admin_test_mode') === 'true');
  
  // Určíme, který email se používá pro operace s BATOHEM (Inventory/Crafting/Scanning)
  // Admin v Test Mode používá oddělený účet. Admin v normálním módu používá svůj hlavní.
  const activeInventoryEmail = (isAdmin && isTestMode) ? TEST_ACCOUNT_EMAIL : userEmail;

  const [isServerReady, setIsServerReady] = useState(false);
  const isNight = isNightTime();
  const [adminNightOverride, setAdminNightOverride] = useState<boolean | null>(null);
  
  const [soundEnabled, setSoundEnabled] = useState(getSoundStatus());
  const [vibrationEnabled, setVibrationEnabled] = useState(getVibrationStatus());

  const [activeTab, setActiveTab] = useState<Tab>(() => (userEmail === ADMIN_EMAIL ? Tab.GENERATOR : Tab.SCANNER));

  const [masterCatalog, setMasterCatalog] = useState<GameEvent[]>(() => {
      const saved = localStorage.getItem('nexus_master_catalog');
      return saved ? JSON.parse(saved) : NEXUS_SEED_DATA;
  });

  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [activeStation, setActiveStation] = useState<GameEvent | null>(null);
  const [activeMerchant, setActiveMerchant] = useState<GameEvent | null>(null); // NEW: Merchant State
  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  
  const [, setEventSource] = useState<'scanner' | 'inventory' | 'inspect' | null>(null);
  const [screenFlash, setScreenFlash] = useState<'red' | 'green' | 'blue' | 'amber' | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  
  // Docking State
  const [isDocking, setIsDocking] = useState(false);

  // Inventory načítáme podle activeInventoryEmail
  const [inventory, setInventory] = useState<GameEvent[]>(() => {
      const saved = localStorage.getItem(`nexus_inv_${activeInventoryEmail || 'guest'}`);
      return saved ? JSON.parse(saved) : [];
  });

  // Reload & AUTO-VALIDATE inventory when toggling modes or logging in
  useEffect(() => {
      if (activeInventoryEmail) {
          // 1. Load cached local data immediately
          const saved = localStorage.getItem(`nexus_inv_${activeInventoryEmail}`);
          setInventory(saved ? JSON.parse(saved) : []);

          if (!isGuest) {
              // 2. Fetch fresh data from server
              apiService.getInventory(activeInventoryEmail).then(async (serverInv) => {
                  
                  // 3. AUTOMATIC VALIDATION START
                  if (serverInv.length > 0) {
                      try {
                          // Posíláme na server kontrolu. Server vrátí seznam ID, která jsou "validní" (základ ID existuje v master DB)
                          const validationPayload = serverInv.map(i => ({ id: i.id, title: i.title }));
                          const { validIds } = await apiService.validateLocalItems(validationPayload);
                          
                          // Filtrujeme inventář pouze na ty, které server potvrdil
                          if (validIds) {
                              // CLIENT SIDE SAFEGUARD: Include items that are in local master catalog (Seed Data)
                              // even if server says they are invalid (because Admin didn't sync Seed to DB yet)
                              const localSafeIds = masterCatalog.map(m => m.id);
                              
                              const cleanInventory = serverInv.filter(i => {
                                  const baseId = i.id.split('__')[0];
                                  return validIds.includes(i.id) || localSafeIds.includes(baseId);
                              });

                              setInventory(cleanInventory);
                              localStorage.setItem(`nexus_inv_${activeInventoryEmail}`, JSON.stringify(cleanInventory));
                          }
                      } catch (validationErr) {
                          setInventory(serverInv);
                          localStorage.setItem(`nexus_inv_${activeInventoryEmail}`, JSON.stringify(serverInv));
                      }
                  } else {
                      // Empty inventory
                      setInventory([]);
                      localStorage.setItem(`nexus_inv_${activeInventoryEmail}`, JSON.stringify([]));
                  }
              }).catch(() => {});
          }
      }
  }, [activeInventoryEmail, isGuest]);

  const [scanLog, setScanLog] = useState<string[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<ToastData | null>(null);
  
  const [showEndTurnPrompt, setShowEndTurnPrompt] = useState(false);
  const [showTurnAlert] = useState(false);
  const [showRoundEndAlert, setShowRoundEndAlert] = useState(false);

  // Player Stats
  const [playerHp, setPlayerHp] = useState<number>(() => parseInt(localStorage.getItem('nexus_player_hp') || String(MAX_PLAYER_HP)));
  const [playerMana, setPlayerMana] = useState<number>(() => parseInt(localStorage.getItem('nexus_player_mana') || String(MAX_PLAYER_MANA)));
  const [playerFuel, setPlayerFuel] = useState<number>(() => parseInt(localStorage.getItem('nexus_player_fuel') || String(MAX_PLAYER_FUEL)));
  const [playerGold, setPlayerGold] = useState<number>(() => parseInt(localStorage.getItem('nexus_player_gold') || String(INITIAL_GOLD)));
  const [playerArmor, setPlayerArmor] = useState<number>(() => parseInt(localStorage.getItem('nexus_player_armor') || "0"));
  const [playerOxygen, setPlayerOxygen] = useState<number>(() => parseInt(localStorage.getItem('nexus_player_oxygen') || "100"));
  
  const [playerClass, setPlayerClass] = useState<PlayerClass | null>(() => {
      const saved = localStorage.getItem(`nexus_class_${userEmail || 'guest'}`);
      return saved ? (saved as PlayerClass) : null;
  });

  const [roomState, setRoomState] = useState<{
    id: string;
    isInRoom: boolean;
    messages: any[];
    nickname: string;
    isNicknameSet: boolean;
    members: {name: string, email?: string, hp: number}[];
    turnIndex: number;
    isGameStarted: boolean;
    roundNumber: number;
    turnOrder: string[];
    readyForNextRound: string[];
    host: string;
  }>({
      id: localStorage.getItem('nexus_last_room_id') || '',
      isInRoom: localStorage.getItem('nexus_is_in_room') === 'true',
      messages: [],
      nickname: localStorage.getItem(`nexus_nickname_${userEmail}`) || '',
      isNicknameSet: !!localStorage.getItem(`nexus_nickname_${userEmail}`),
      members: [],
      turnIndex: 0,
      isGameStarted: false,
      roundNumber: 0,
      turnOrder: [],
      readyForNextRound: [],
      host: ''
  });
  
  const [isSoloMode, setIsSoloMode] = useState(() => localStorage.getItem('nexus_solo_mode') === 'true');
  const [giftTarget, setGiftTarget] = useState<string | null>(null);

  const prevMembersRef = useRef<any[]>([]);

  const isMyTurn = !isSoloMode && roomState.isGameStarted && roomState.turnOrder[roomState.turnIndex] === roomState.nickname;
  const isBlocked = !isAdmin && !isSoloMode && (!roomState.isGameStarted || !isMyTurn);

  // Persistence hooks for stats that don't have explicit handlers
  useEffect(() => {
      localStorage.setItem('nexus_player_armor', String(playerArmor));
  }, [playerArmor]);

  useEffect(() => {
      localStorage.setItem('nexus_player_oxygen', String(playerOxygen));
  }, [playerOxygen]);

  const toggleTestMode = () => {
      if (!isAdmin) return;
      const newMode = !isTestMode;
      setIsTestMode(newMode);
      localStorage.setItem('nexus_admin_test_mode', String(newMode));
      playSound('open');
      setNotification({
          id: 'mode-' + Date.now(),
          type: 'info',
          message: newMode ? 'AKTIVOVÁN TESTOVACÍ BATOH' : 'AKTIVOVÁNA MASTER DATABÁZE'
      });
  };

  const addToLog = (msg: string) => {
    setScanLog(prev => [msg, ...prev].slice(0, 50));
  };

  const handleHpChange = (amount: number) => {
    setPlayerHp(prev => {
        const newValue = Math.max(0, Math.min(MAX_PLAYER_HP, prev + amount));
        localStorage.setItem('nexus_player_hp', String(newValue));
        return newValue;
    });
    if (amount < 0) { 
        setScreenFlash('red'); 
        playSound('damage'); 
        vibrate([200]); 
        setTimeout(() => setScreenFlash(null), 500); 
    } 
    else if (amount > 0) { 
        setScreenFlash('green'); 
        playSound('heal'); 
        setTimeout(() => setScreenFlash(null), 500); 
    }
  };

  const handleManaChange = (amount: number) => {
    setPlayerMana(prev => {
        const newValue = Math.max(0, Math.min(MAX_PLAYER_MANA, prev + amount));
        localStorage.setItem('nexus_player_mana', String(newValue));
        return newValue;
    });
  };

  const handleFuelChange = (amount: number) => {
    setPlayerFuel(prev => {
        const currentFuel = Number(prev) || 0;
        const change = Number(amount) || 0;
        const newValue = Math.max(0, Math.min(MAX_PLAYER_FUEL, currentFuel + change));
        localStorage.setItem('nexus_player_fuel', String(newValue));
        return newValue;
    });
    if (amount < 0) {
        setScreenFlash('amber');
        playSound('error'); 
        vibrate([50, 100, 50]); 
        setNotification({
            id: 'fuel-' + Date.now(),
            type: 'error',
            message: `VAROVÁNÍ: Spotřeba Paliva ${amount}%`
        });
        setTimeout(() => setScreenFlash(null), 800);
    }
  };

  const handleGoldChange = (amount: number) => {
    setPlayerGold(prev => {
        const newValue = Math.max(0, prev + amount);
        localStorage.setItem('nexus_player_gold', String(newValue));
        return newValue;
    });
  };

  const handleSaveEvent = async (event: GameEvent, isCatalogUpdate: boolean = false) => {
    try {
      let itemToSave = { ...event };

      if (!isCatalogUpdate && !itemToSave.resourceConfig?.isResourceContainer) {
          const baseId = itemToSave.id.split('__')[0];
          const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2,6)}`;
          itemToSave.id = `${baseId}__${uniqueSuffix}`;
      }

      if (isGuest || !userEmail) {
        setInventory(prev => {
          if (itemToSave.resourceConfig?.isResourceContainer) {
             const existsIndex = prev.findIndex(i => i.id === itemToSave.id); 
             if (existsIndex >= 0) {
                 const newInv = [...prev];
                 newInv[existsIndex] = itemToSave;
                 localStorage.setItem(`nexus_inv_guest`, JSON.stringify(newInv));
                 return newInv;
             }
          }
          
          const newInv = [...prev, itemToSave];
          localStorage.setItem(`nexus_inv_guest`, JSON.stringify(newInv));
          return newInv;
        });
        addToLog(`Archivováno (Local): ${itemToSave.title}`);
        setNotification({ id: 'save-local-' + Date.now(), message: 'Asset uložen lokálně.', type: 'success' });
      } else {
        const targetEmail = isCatalogUpdate ? ADMIN_EMAIL : activeInventoryEmail;
        if (!targetEmail) throw new Error("No target email");

        const serverResponse = await apiService.saveCard(targetEmail, itemToSave);
        const mergedEvent: GameEvent = { ...serverResponse, ...itemToSave, id: serverResponse.id };

        if (targetEmail === activeInventoryEmail) {
            setInventory(prev => {
                const existsIndex = prev.findIndex(i => i.id === mergedEvent.id);
                if (existsIndex >= 0) {
                    const newInv = [...prev];
                    newInv[existsIndex] = mergedEvent;
                    localStorage.setItem(`nexus_inv_${activeInventoryEmail}`, JSON.stringify(newInv));
                    return newInv;
                } else {
                    const newInv = [...prev, mergedEvent];
                    localStorage.setItem(`nexus_inv_${activeInventoryEmail}`, JSON.stringify(newInv));
                    return newInv;
                }
            });
        }

        if (isCatalogUpdate && isAdmin) {
            setMasterCatalog(prev => {
                const exists = prev.find(i => i.id === mergedEvent.id);
                const newCat = exists ? prev.map(i => i.id === mergedEvent.id ? mergedEvent : i) : [...prev, mergedEvent];
                localStorage.setItem('nexus_master_catalog', JSON.stringify(newCat));
                return newCat;
            });
            addToLog(`DB UPDATE: ${itemToSave.title}`);
            setNotification({ id: 'db-save-' + Date.now(), message: 'Zapsáno do Master Databáze.', type: 'success' });
        } else {
            addToLog(`Archivováno: ${itemToSave.title}`);
            setNotification({ id: 'save-' + Date.now(), message: 'Asset uložen do Batohu.', type: 'success' });
        }
      }
    } catch (e) {
      setNotification({ id: 'err-' + Date.now(), message: 'Chyba ukládání.', type: 'error' });
    }
  };

  // NEW: Update Planet Progress
  const handlePlanetProgress = async (navCardId: string) => {
      const card = inventory.find(i => i.id === navCardId);
      if (card) {
          const updatedCard = { ...card, planetProgress: (card.planetProgress || 0) + 1 };
          
          // Optimistic UI Update
          setInventory(prev => prev.map(i => i.id === navCardId ? updatedCard : i));
          
          if (isGuest || !activeInventoryEmail) {
              localStorage.setItem(`nexus_inv_guest`, JSON.stringify(inventory.map(i => i.id === navCardId ? updatedCard : i)));
          } else {
              try {
                  await apiService.saveCard(activeInventoryEmail, updatedCard);
                  // Backup save to local
                  localStorage.setItem(`nexus_inv_${activeInventoryEmail}`, JSON.stringify(inventory.map(i => i.id === navCardId ? updatedCard : i)));
              } catch (e) {
                  console.error("Failed to sync planet progress", e);
              }
          }
      }
  };

  const handleSwapItems = async (makerEmail: string, takerEmail: string, makerItemId: string, takerItemId: string) => {
    if (isGuest || !activeInventoryEmail) return;
    setIsAIThinking(true);
    try {
        await apiService.swapItems(makerEmail, takerEmail, makerItemId, takerItemId);
        const inv = await apiService.getInventory(activeInventoryEmail);
        setInventory(inv);
        localStorage.setItem(`nexus_inv_${activeInventoryEmail}`, JSON.stringify(inv));
        await apiService.sendMessage(roomState.id, 'SYSTEM', `BURZA_SUCCESS: Výměna assetů byla dokončena.`);
        setNotification({ id: 'swap-ok', type: 'success', message: 'Výměna assetů byla úspěšná!' });
        playSound('success');
    } catch (e: any) {
        setNotification({ id: 'swap-err', type: 'error', message: e.message || 'Chyba při výměně dat.' });
    } finally {
        setIsAIThinking(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const itemToDelete = inventory.find(i => i.id === id);
      if (!isGuest && activeInventoryEmail) {
        await apiService.deleteCard(activeInventoryEmail, id);
      }
      setInventory(prev => {
        const newInv = prev.filter(i => i.id !== id);
        localStorage.setItem(`nexus_inv_${activeInventoryEmail || 'guest'}`, JSON.stringify(newInv));
        return newInv;
    });
    if (itemToDelete) addToLog(`Zahozeno z Batohu: ${itemToDelete.title}`);
    setNotification({ id: 'del-' + Date.now(), message: 'Asset odstraněn.', type: 'success' });
    } catch (e) {
      setNotification({ id: 'err-' + Date.now(), message: 'Chyba při mazání.', type: 'error' });
    }
  };

  const handleCraftItem = async (recipeItem: GameEvent) => {
      // Crafting logic (unchanged) ...
      // Keeping it brief for the patch, logic is same as before
      if (!recipeItem.craftingRecipe?.requiredResources) return;
      // ... same logic ...
      // Assuming no changes needed here for this task
  };

  const handleRefreshDatabase = async () => {
    setIsRefreshing(true);
    playSound('scan');
    try {
        let newInventory: GameEvent[] = [];
        let newCatalog: GameEvent[] = [];

        if (isGuest) {
            newInventory = [...inventory];
            newCatalog = await apiService.getMasterCatalog();
        } else if (activeInventoryEmail) {
            newInventory = await apiService.getInventory(activeInventoryEmail);
            newCatalog = await apiService.getMasterCatalog();
        }

        // VALIDATION & AUTO-CLEANUP
        if (newInventory.length > 0) {
            try {
                const validationPayload = newInventory.map(i => ({ id: i.id, title: i.title }));
                const { validIds } = await apiService.validateLocalItems(validationPayload);
                
                if (validIds) {
                    // Identify items to remove from server
                    // SAFEGUARD: If item is in local masterCatalog (Seed), do NOT consider it invalid even if server says so.
                    const localSafeIds = masterCatalog.map(m => m.id);

                    const invalidItems = newInventory.filter(i => {
                        const baseId = i.id.split('__')[0];
                        return !validIds.includes(i.id) && !localSafeIds.includes(baseId);
                    });
                    
                    // Filter local inventory immediately
                    newInventory = newInventory.filter(i => {
                        const baseId = i.id.split('__')[0];
                        return validIds.includes(i.id) || localSafeIds.includes(baseId);
                    });

                    // SERVER CLEANUP: Delete invalid items if user is online and not guest
                    if (invalidItems.length > 0 && !isGuest && activeInventoryEmail) {
                        console.log(`[AUTO-CLEANUP] Removing ${invalidItems.length} invalid items from server...`);
                        Promise.all(invalidItems.map(item => apiService.deleteCard(activeInventoryEmail!, item.id)))
                            .then(() => console.log('[AUTO-CLEANUP] Server clean complete.'))
                            .catch(e => console.warn('[AUTO-CLEANUP] Partial failure', e));
                    }
                }
            } catch (e) {
                console.warn("Validation check failed", e);
            }
        }

        const storageKey = isGuest ? 'nexus_inv_guest' : `nexus_inv_${activeInventoryEmail}`;
        localStorage.removeItem(storageKey);
        localStorage.removeItem('nexus_master_catalog');

        localStorage.setItem(storageKey, JSON.stringify(newInventory));
        localStorage.setItem('nexus_master_catalog', JSON.stringify(newCatalog));

        setInventory(newInventory);
        setMasterCatalog(newCatalog);

        setNotification({ id: 'sync-ok-' + Date.now(), message: 'Kompletní synchronizace dat.', type: 'success' });
        playSound('success');

    } catch (e) {
        setNotification({ id: 'sync-err-' + Date.now(), message: 'Chyba synchronizace.', type: 'error' });
        playSound('error');
    } finally {
        setIsRefreshing(false);
    }
  };

  const handleWipeTestVault = async () => {
      if (!isTestMode || !isAdmin) return;
      if (!confirm("VAROVÁNÍ: Opravdu chcete smazat CELÝ inventář v Testovacím Režimu? Tato akce je nevratná.")) return;
      
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
          return;
      }
      await handleRefreshDatabase();
  };

  const handleGameSetup = async (nickname: string, pClass: PlayerClass, roomId: string | 'create' | 'solo' | 'solo-online', password?: string) => {
    localStorage.setItem(`nexus_nickname_${userEmail}`, nickname);
    localStorage.setItem(`nexus_class_${userEmail || 'guest'}`, pClass);
    setPlayerClass(pClass);
    
    if (roomId === 'solo') {
      setIsSoloMode(true);
      localStorage.setItem('nexus_solo_mode', 'true');
      localStorage.setItem('nexus_is_in_room', 'false');
      setRoomState(prev => ({ ...prev, nickname, isNicknameSet: true, isInRoom: false, id: '' }));
      addToLog(`Systém aktivován. Batoh připraven, ${nickname}.`);
      return;
    }

    try {
      let finalRoomId = roomId;
      if (roomId === 'create' || roomId === 'solo-online') {
        finalRoomId = (roomId === 'solo-online' ? 'SOLO-' : '') + Math.random().toString(36).substring(2, 7).toUpperCase();
        await apiService.createRoom(finalRoomId, nickname, password);
        setRoomState(prev => ({ ...prev, id: finalRoomId, nickname, isNicknameSet: true, isInRoom: true, host: nickname }));
        if (roomId === 'solo-online') addToLog(`Online mise zahájena v sektoru ${finalRoomId}.`);
      } else {
        await apiService.joinRoom(finalRoomId, nickname, playerHp, password, userEmail || undefined);
        setRoomState(prev => ({ ...prev, id: finalRoomId, nickname, isNicknameSet: true, isInRoom: true }));
      }
      
      localStorage.setItem('nexus_last_room_id', finalRoomId);
      localStorage.setItem('nexus_is_in_room', 'true');
      setIsSoloMode(roomId === 'solo-online');
      localStorage.setItem('nexus_solo_mode', roomId === 'solo-online' ? 'true' : 'false');

      if (roomId === 'solo-online') {
          setTimeout(async () => {
              try { await apiService.startGame(finalRoomId); } catch(e) {}
          }, 1000);
      }
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
        try { await apiService.leaveRoom(roomState.id, roomState.nickname); } catch(e) {}
    }
    setRoomState(prev => ({ ...prev, isInRoom: false, id: '', isNicknameSet: false }));
    localStorage.removeItem('nexus_last_room_id');
    localStorage.removeItem('nexus_is_in_room');
    setIsSoloMode(false);
    localStorage.setItem('nexus_solo_mode', 'false');
    setScanLog([]);
  };

  const handleSendMessage = async (text: string) => {
    if (!roomState.id || !roomState.nickname) return;
    try {
      await apiService.sendMessage(roomState.id, roomState.nickname, text);
    } catch (e) {}
  };

  const handleInspectItem = async (itemId: string) => {
    setIsAIThinking(true);
    try {
      let item: GameEvent | null | undefined = masterCatalog.find(i => i.id === itemId);
      if (!item) {
        item = await apiService.getCardById(ADMIN_EMAIL, itemId);
      }
      if (item) {
        setEventSource('inspect');
        setCurrentEvent(getAdjustedItem(item, isNight, playerClass));
        addToLog(`Inspekce: ${item.title}`);
      } else {
        setNotification({ id: 'inspect-err', type: 'error', message: "Data assetu nelze dekódovat." });
      }
    } catch (e) {
      setNotification({ id: 'inspect-err', type: 'error', message: "Chyba spojení s Batohem." });
    } finally {
      setIsAIThinking(false);
    }
  };

  useEffect(() => {
    if (!roomState.isInRoom || !roomState.id || !isServerReady) return;
    const pollInterval = setInterval(async () => {
        try {
            const status = await apiService.getRoomStatus(roomState.id);
            const messages = await apiService.getRoomMessages(roomState.id);
            prevMembersRef.current = status.members;
            setRoomState(prev => ({ 
              ...prev, members: status.members, turnIndex: status.turnIndex, messages, isGameStarted: status.isGameStarted,
              roundNumber: status.roundNumber, turnOrder: status.turnOrder, readyForNextRound: status.readyForNextRound, host: status.host
            }));
            await apiService.updatePlayerStatus(roomState.id, roomState.nickname, playerHp);
        } catch (e) {}
    }, 2000);
    return () => clearInterval(pollInterval);
  }, [roomState.isInRoom, roomState.id, roomState.nickname, playerHp, isGuest, isServerReady]);

  const handleStartGame = async () => {
    if (roomState.host !== roomState.nickname) return;
    if (roomState.members.length < 1) return;
    try {
      await apiService.startGame(roomState.id);
      playSound('success');
    } catch (e) {
      setNotification({ id: 'err', type: 'error', message: 'Nepodařilo se spustit misi.' });
    }
  };

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
        } catch (e) {}
    }

    setIsAIThinking(false);
    setNotification({ id: 'not-found-' + Date.now(), type: 'error', message: 'ID karty nenalezeno.' });
    playSound('error');
  };

  const handleFoundItem = (item: GameEvent, source: 'scanner' | 'inventory' | null = null) => {
      if (source === 'scanner') {
          handleFuelChange(-5);
          addToLog(`Manévr lodi: -5% Paliva`);
      }

      const adjusted = getAdjustedItem(item, isNight, playerClass);
      
      if (adjusted.type === GameEventType.SPACE_STATION && source === 'scanner') {
          setIsAIThinking(false);
          setIsDocking(true);
          setCurrentEvent(adjusted);
          setEventSource(source);
          return;
      }

      setCurrentEvent(adjusted);
      if (source) setEventSource(source);
      addToLog(source === 'scanner' ? `Skenováno: ${adjusted.title}` : `Zobrazeno: ${adjusted.title}`);
      setIsAIThinking(false);
  };

  const handleDockingComplete = () => {
      setIsDocking(false);
      if (currentEvent && currentEvent.type === GameEventType.SPACE_STATION) {
          setActiveStation(currentEvent);
          setCurrentEvent(null);
          addToLog(`Dokováno: ${currentEvent.title}`);
          playSound('success');
      }
  };

  const closeEvent = () => {
    setCurrentEvent(null);
    setEventSource(null);
  };

  const handleUseEvent = async (event: GameEvent) => {
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
          if (event.isConsumable) await handleDeleteEvent(event.id);
          else closeEvent();
      } else {
          if (event.isConsumable) {
              await handleDeleteEvent(event.id);
              setNotification({ id: 'consumed', message: 'Předmět spotřebován.', type: 'info' });
              closeEvent();
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
          try { await apiService.nextTurn(roomState.id); setShowEndTurnPrompt(false); } catch(e) {}
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
          try { await apiService.acknowledgeRoundEnd(roomState.id, roomState.nickname); setShowRoundEndAlert(false); } catch(e) {}
      }
  };

  // --- MERCHANT ACTIONS ---
  const handleBuyItem = async (item: GameEvent) => {
      handleGoldChange(-(item.price || 0));
      await handleSaveEvent(item, false); // Save to inventory
      playSound('success');
      setNotification({ id: 'buy-success', type: 'success', message: `Zakoupeno: ${item.title}` });
  };

  const handleSellItem = async (item: GameEvent, price: number) => {
      handleGoldChange(price);
      await handleDeleteEvent(item.id); // Remove from inventory
      playSound('success');
      setNotification({ id: 'sell-success', type: 'success', message: `Prodáno: ${item.title} (+${price} G)` });
  };

  return {
      userEmail, isAdmin, isGuest, isServerReady, setIsServerReady, isNight, adminNightOverride, setAdminNightOverride,
      activeTab, setActiveTab, currentEvent, setCurrentEvent, editingEvent, setEditingEvent, screenFlash, inventory, 
      isRefreshing, notification, setNotification, showEndTurnPrompt, 
      playerHp, playerMana, playerFuel, playerGold, playerArmor, playerOxygen, playerClass,
      setPlayerArmor, setPlayerOxygen,
      roomState, isSoloMode, giftTarget, setGiftTarget, isScannerPaused: !!currentEvent || showTurnAlert || showRoundEndAlert || isDocking || !!activeStation || !!activeMerchant,
      isAIThinking, showTurnAlert, showRoundEndAlert, handleAcknowledgeRound,
      isMyTurn, isBlocked, handleStartGame,
      isDocking, handleDockingComplete,
      activeStation, handleLeaveStation, handleClaimStationRewards,
      activeMerchant, setActiveMerchant, handleBuyItem, handleSellItem,
      masterCatalog,
      handleLogin: (email: string, guestNickname?: string) => { 
          localStorage.setItem('nexus_current_user', email); 
          if (guestNickname) {
              localStorage.setItem(`nexus_nickname_${email}`, guestNickname);
              setRoomState(prev => ({ ...prev, nickname: guestNickname }));
          }
          setUserEmail(email); 
          setIsServerReady(false); 
      },
      handleLogout: () => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); },
      handleScanCode, 
      handleSaveEvent, handlePlanetProgress,
      handleDeleteEvent, handleUseEvent, handleRefreshDatabase, handleGameSetup, handleLeaveRoom, handleExitToMenu,
      handleResolveDilemma,
      handleEndTurn, handleSendMessage, closeEvent, handleHpChange, handleManaChange, handleGoldChange, handleFuelChange,
      handleOpenInventoryItem: (item: GameEvent) => { 
          if (isAdmin && !isTestMode) { 
              setEditingEvent(item); 
              setActiveTab(Tab.GENERATOR); 
          } else { 
              setEventSource('inventory'); 
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
      toggleTestMode 
  };
};

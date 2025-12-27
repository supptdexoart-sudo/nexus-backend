
import React, { useState, useEffect, Suspense, lazy, ReactNode, ErrorInfo, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLogic, Tab } from './hooks/useGameLogic';
import Scanner from './components/Scanner';
import LoginScreen from './components/LoginScreen';
import StartupBoot from './components/StartupBoot';
import GameSetup from './components/GameSetup';
import Toast from './components/Toast';
import EventCard from './components/EventCard';
import DockingAnimation from './components/DockingAnimation';
import SpaceStationView from './components/SpaceStationView';
import MerchantScreen from './components/MerchantScreen'; // IMPORTED
import ServerLoader from './components/ServerLoader';
import {
  Scan, Box, Hammer, Users, Settings as SettingsIcon,
  Sun, Moon, Heart, Zap, Coins, Shield,
  Wind, Loader2, AlertTriangle, Rocket, Fuel, Database, FlaskConical, UserCircle, Activity
} from 'lucide-react';
import { playSound, vibrate } from './services/soundService';
import { GameEventType, GameEvent, Stat } from './types';

const inventoryImport = () => import('./components/InventoryView');
const generatorImport = () => import('./components/Generator');
const characterManagementImport = () => import('./components/CharacterManagement');
const roomImport = () => import('./components/Room');
const settingsImport = () => import('./components/SettingsView');
const spaceshipImport = () => import('./components/SpaceshipView');

const InventoryView = lazy(inventoryImport);
const Generator = lazy(generatorImport);
const CharacterManagement = lazy(characterManagementImport);
const Room = lazy(roomImport);
const SettingsView = lazy(settingsImport);
const SpaceshipView = lazy(spaceshipImport);

interface ModuleErrorBoundaryProps {
  children?: ReactNode;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
}

class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  state: ModuleErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ModuleErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ModuleErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black p-10 text-center">
          <div className="w-16 h-16 bg-red-950/20 border border-red-500/50 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Chyba_Segmentu</h2>
          <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-8 leading-relaxed">
            Nepodařilo se stáhnout herní modul.<br />Možná ztráta signálu se sektorem.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="button-primary py-4 px-10 text-[10px]"
          >
            Restartovat HUD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TabLoader = () => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-black gap-4">
    <div className="relative">
      <Loader2 className="w-12 h-12 text-signal-cyan animate-spin opacity-50" />
      <motion.div
        {...({
          animate: { scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] },
          transition: { duration: 1.5, repeat: Infinity }
        } as any)}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-2 h-2 bg-signal-cyan rounded-full shadow-[0_0_10px_#00f2ff]" />
      </motion.div>
    </div>
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-black text-signal-cyan uppercase tracking-[0.4em] animate-pulse">Synchronizace_Dat</span>
      <span className="text-[8px] font-mono text-zinc-600 uppercase mt-1">Stahování_Segmentu...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const logic = useGameLogic();
  const [bootComplete, setBootComplete] = useState(() => sessionStorage.getItem('nexus_boot_done') === 'true');
  const [batteryLevel, setBatteryLevel] = useState(0.85);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (bootComplete && logic.userEmail && isOnline) {
      inventoryImport().catch(() => { });
      roomImport().catch(() => { });
      spaceshipImport().catch(() => { });
      if (logic.isAdmin) {
        generatorImport().catch(() => { });
        if (logic.userEmail === 'zbynekbal97@gmail.com') {
          characterManagementImport().catch(() => { });
        }
      }
      settingsImport().catch(() => { });
    }
  }, [bootComplete, logic.userEmail, isOnline, logic.isAdmin]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => setBatteryLevel(battery.level);
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        return () => battery.removeEventListener('levelchange', updateBattery);
      });
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleBootComplete = () => {
    setBootComplete(true);
    sessionStorage.setItem('nexus_boot_done', 'true');
  };

  const handleDayNightClick = () => {
    playSound('message');
    vibrate(15);
    const isNight = logic.isNight;
    const title = isNight ? "NOČNÍ PROTOKOL AKTIVNÍ" : "DENNÍ PROTOKOL AKTIVNÍ";
    const timeRange = isNight ? "20:00 — 06:00" : "06:00 — 20:00";
    const desc = isNight
      ? "Zvýšená aktivita biotických hrozeb. Noční varianty karet mají bonus k poškození (+5 DMG). Viditelnost skeneru omezena."
      : "Stabilní atmosférické podmínky. Standardní loot tabulky a bezpečné obchodní trasy. Bonus k regeneraci kyslíku.";

    logic.setNotification({
      id: 'cycle-' + Date.now(),
      message: `${title}\nČas: ${timeRange}\n\n${desc}`,
      type: 'info'
    });
  };

  const handleClaimLoot = (stats: Stat[]) => {
    let claimedCount = 0;
    stats.forEach(stat => {
      const rawValue = String(stat.value);
      const numericPart = rawValue.replace(/[^0-9-]/g, '');
      const val = parseInt(numericPart);
      const label = String(stat.label).toUpperCase().trim();

      if (!isNaN(val) && val !== 0) {
        if (['HP', 'ZDRAVÍ', 'HEAL'].some(k => label.includes(k))) { logic.handleHpChange(val); claimedCount++; }
        else if (['MANA', 'ENERGIE'].some(k => label.includes(k))) { logic.handleManaChange(val); claimedCount++; }
        else if (['PALIVO', 'FUEL'].some(k => label.includes(k))) { logic.handleFuelChange(val); claimedCount++; }
        else if (['GOLD', 'ZLATO', 'MINCE'].some(k => label.includes(k))) { logic.handleGoldChange(val); claimedCount++; }
        else if (['O2', 'KYSLÍK'].some(k => label.includes(k))) { logic.setPlayerOxygen(prev => Math.min(100, Math.max(0, prev + val))); claimedCount++; }
        else if (['ARMOR', 'BRNĚNÍ'].some(k => label.includes(k))) { logic.setPlayerArmor(prev => Math.max(0, prev + val)); claimedCount++; }
      }
    });

    if (claimedCount > 0) {
      logic.setNotification({ id: 'loot-claim-' + Date.now(), type: 'success', message: 'Kořist byla úspěšně připsána.' });
    }
  };

  const handleArmorChange = (amount: number) => {
    logic.setPlayerArmor(prev => Math.max(0, prev + amount));
  };

  const handlePlanetLand = (planetId: string, eventType: GameEventType) => {
    console.log(`Landing on ${planetId}. Default Type: ${eventType}`);

    const navDataCard = logic.inventory.find(i => i.type === GameEventType.PLANET && i.planetConfig?.planetId === planetId);

    if (navDataCard?.planetConfig?.phases && navDataCard.planetConfig.phases.length > 0) {
      const currentPhaseIndex = navDataCard.planetProgress || 0;
      if (currentPhaseIndex < navDataCard.planetConfig.phases.length) {
        const phaseEventId = navDataCard.planetConfig.phases[currentPhaseIndex];
        const phaseCard = logic.masterCatalog.find(e => e.id === phaseEventId);

        if (phaseCard) {
          logic.setCurrentEvent({ ...phaseCard });
          return;
        }
      }
    }

    if (navDataCard?.planetConfig?.landingEventId) {
      const specificEvent = logic.masterCatalog.find(e => e.id === navDataCard.planetConfig!.landingEventId);
      if (specificEvent) {
        logic.setCurrentEvent({ ...specificEvent, id: `LIVE-${Date.now()}` });
        return;
      }
    }

    const possibleEvents = logic.masterCatalog.filter(e => e.type === eventType);

    let eventToTrigger: GameEvent | null = null;
    if (possibleEvents.length > 0) {
      const randomIndex = Math.floor(Math.random() * possibleEvents.length);
      eventToTrigger = { ...possibleEvents[randomIndex], id: `LANDING-${Date.now()}` };
    } else {
      eventToTrigger = {
        id: `GEN-${Date.now()}`,
        title: `Průzkum Sektoru`,
        description: `Narazili jste na neznámou aktivitu typu ${eventType}.`,
        type: eventType,
        rarity: 'Common',
        stats: [],
        isConsumable: false
      } as GameEvent;
    }

    logic.setCurrentEvent(eventToTrigger);
  };

  if (!bootComplete) return <StartupBoot onComplete={handleBootComplete} />;
  if (!logic.userEmail) return <LoginScreen onLogin={logic.handleLogin} />;

  return (
    <div className={`h-screen w-screen bg-black overflow-hidden flex flex-col font-sans text-white relative`}>

      <AnimatePresence>
        {logic.notification && (
          <div className="fixed inset-0 z-[20000] pointer-events-none">
            <Toast data={logic.notification} onClose={() => logic.setNotification(null)} />
          </div>
        )}
      </AnimatePresence>

      {!logic.isServerReady && !logic.isGuest ? (
        <ServerLoader onConnected={() => logic.setIsServerReady(true)} onSwitchToOffline={logic.handleSwitchToOffline} />
      ) : (!logic.roomState.isNicknameSet || !logic.playerClass) ? (
        <GameSetup initialNickname={logic.roomState.nickname} onConfirmSetup={logic.handleGameSetup} isGuest={logic.isGuest} />
      ) : (
        <>
          <AnimatePresence>
            {logic.screenFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 z-[999] pointer-events-none mix-blend-overlay ${logic.screenFlash === 'red' ? 'bg-red-600/40' :
                  logic.screenFlash === 'green' ? 'bg-green-500/30' :
                    logic.screenFlash === 'blue' ? 'bg-blue-500/30' :
                      'bg-orange-500/50'
                  }`}
              />
            )}
          </AnimatePresence>

          <div className="h-36 bg-zinc-950/95 border-b border-white/10 flex flex-col z-[100] shadow-[0_5px_20px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between px-4 py-1 border-b border-white/5 bg-white/[0.01] relative">
              <div className="flex items-center gap-2">
                <div className={`w-1 h-1 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500 shadow-[0_0_8px_red] animate-ping'}`} />

                {logic.isAdmin && (
                  <div className={`ml-2 px-2 py-0.5 rounded border-[0.5px] text-[6px] font-black uppercase tracking-wider flex items-center gap-1 ${logic.isTestMode
                    ? 'border-orange-500/50 text-orange-500 bg-orange-950/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                    : 'border-purple-500/50 text-purple-400 bg-purple-950/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                    }`}>
                    {logic.isTestMode ? <FlaskConical className="w-2 h-2" /> : <Database className="w-2 h-2" />}
                    {logic.isTestMode ? 'TEST_ENV' : 'LIVE_DB'}
                  </div>
                )}
              </div>

              {/* TURN INDICATOR - Center */}
              {logic.roomState.isInRoom && logic.roomState.isGameStarted && (
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full border animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.1)] ${logic.isMyTurn
                    ? 'bg-green-500/10 border-green-500/50 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                    : 'bg-signal-amber/10 border-signal-amber/30 text-signal-amber'
                    }`}>
                    {logic.isMyTurn ? (
                      <Activity className="w-2 h-2 text-green-500 animate-pulse" />
                    ) : (
                      <Loader2 className="w-2 h-2 text-signal-amber animate-spin" />
                    )}
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                      {logic.isMyTurn ? 'JSI NA TAHU' : `NA TAHU: ${logic.roomState.turnOrder[logic.roomState.turnIndex] || '---'}`}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={handleDayNightClick} className="flex items-center gap-1.5 active:scale-95 transition-transform">
                  {logic.isNight ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-signal-amber" />}
                  <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest">{logic.isNight ? 'Night_Cycle' : 'Day_Cycle'}</span>
                </button>
                <div className="w-8 h-1.5 bg-white/5 relative rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-signal-amber shadow-[0_0_50px_#ff9d00]" style={{ width: `${batteryLevel * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-1 p-1 bg-black/40">
              <div className="flex-1 grid grid-cols-3 gap-1">
                <StatSlot icon={<Heart className="w-4 h-4" />} value={logic.playerHp} max={150} color="#ef4444" label="HP" />
                <StatSlot icon={<Zap className="w-4 h-4" />} value={logic.playerMana} max={100} color="#00f2ff" label="MANA" />
                <StatSlot icon={<Fuel className="w-4 h-4" />} value={logic.playerFuel} max={100} color="#f97316" label="PALIVO" />
              </div>
              <div className="flex-1 grid grid-cols-3 gap-1">
                <StatSlot icon={<Coins className="w-4 h-4" />} value={logic.playerGold} color="#fbbf24" label="GOLD" />
                <StatSlot icon={<Shield className="w-4 h-4" />} value={logic.playerArmor} color="#a1a1aa" label="ARMOR" />
                <StatSlot icon={<Wind className="w-4 h-4" />} value={logic.playerOxygen} max={100} color="#22d3ee" label="O2" />
              </div>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <ModuleErrorBoundary>
              <Suspense fallback={<TabLoader />}>
                {logic.activeTab === Tab.SCANNER && (
                  <div className="absolute inset-0 bg-black">
                    <Scanner onScanCode={logic.handleScanCode} isAIThinking={logic.isAIThinking} isPaused={logic.isScannerPaused} />
                  </div>
                )}

                {logic.activeTab === Tab.INVENTORY && (
                  <div className="absolute inset-0 bg-black">
                    <InventoryView
                      inventory={logic.inventory} loadingInventory={false} isRefreshing={logic.isRefreshing}
                      isAdmin={logic.isAdmin} isNight={logic.isNight} adminNightOverride={logic.adminNightOverride}
                      playerClass={logic.playerClass} giftTarget={logic.giftTarget} onRefresh={logic.handleRefreshDatabase}
                      onItemClick={logic.handleOpenInventoryItem} isTestMode={logic.isTestMode}
                      getAdjustedItem={logic.getAdjustedItem}
                    />
                  </div>
                )}

                {logic.activeTab === Tab.GENERATOR && (
                  <div className="absolute inset-0 bg-black">
                    <Generator
                      onSaveCard={(e) => { logic.handleSaveEvent(e, true); }}
                      userEmail={logic.userEmail || ''} initialData={logic.editingEvent}
                      onClearData={() => logic.setEditingEvent(null)} onDelete={(id) => { logic.handleDeleteEvent(id); }}
                      masterCatalog={logic.masterCatalog}
                    />
                  </div>
                )}

                {logic.activeTab === Tab.ROOM && (
                  <div className="absolute inset-0 bg-black">
                    <Room
                      roomState={logic.roomState} inventory={logic.inventory} playerHp={logic.playerHp} scanLog={logic.scanLog}
                      onExitToMenu={logic.handleExitToMenu} onSendMessage={logic.handleSendMessage} onStartGame={logic.handleStartGame}
                      onInspectItem={logic.handleInspectItem} onSwapItems={logic.handleSwapItems} userEmail={logic.userEmail || undefined}
                      playerClass={logic.playerClass} onToggleReady={logic.handleToggleReady}
                      onKickPlayer={logic.handleKickPlayer}
                      activeCharacter={logic.activeCharacter}
                      isNight={logic.isNight}
                      activeTrade={logic.activeTrade}
                      onInitTrade={logic.handleInitTrade}
                      onCancelTrade={logic.handleCancelTrade}
                      onConfirmTrade={logic.handleConfirmTrade}
                      onTradeSelectOffer={logic.handleTradeSelectOffer}
                    />
                  </div>
                )}

                {logic.activeTab === Tab.SETTINGS && (
                  <div className="absolute inset-0 bg-black">
                    <SettingsView
                      onBack={() => logic.setActiveTab(Tab.SCANNER)} onLogout={logic.handleLogout}
                      soundEnabled={logic.soundEnabled} vibrationEnabled={logic.vibrationEnabled}
                      onToggleSound={logic.handleToggleSound} onToggleVibration={logic.handleToggleVibration} userEmail={logic.userEmail}
                      isAdmin={logic.isAdmin} isTestMode={logic.isTestMode} onToggleTestMode={logic.toggleTestMode}
                      onHardReset={logic.handleHardReset} onWipeTestVault={logic.handleWipeTestVault}
                    />
                  </div>
                )}

                {logic.activeTab === Tab.SPACESHIP && (
                  <div className="absolute inset-0 bg-black">
                    <SpaceshipView
                      playerFuel={logic.playerFuel}
                      inventory={logic.inventory}
                      onPlanetLand={handlePlanetLand}
                      onFuelConsume={(amount) => logic.handleFuelChange(amount)}
                      onProgressPlanet={(id) => { logic.handlePlanetProgress(id); }}
                      masterCatalog={logic.masterCatalog}
                    />
                  </div>
                )}

                {logic.activeTab === Tab.CHARACTERS && (
                  <div className="absolute inset-0 bg-black">
                    <CharacterManagement userEmail={logic.userEmail || ''} />
                  </div>
                )}
              </Suspense>
            </ModuleErrorBoundary>
          </div>

          <div className="h-20 bg-zinc-950 border-t-2 border-signal-cyan/40 flex items-center justify-around px-2 pb-2 relative z-50 shadow-[0_-12px_35px_rgba(0,242,255,0.25)]">
            <NavButton active={logic.activeTab === Tab.SCANNER} onClick={() => logic.setActiveTab(Tab.SCANNER)} icon={<Scan />} label="Sken" />
            <NavButton active={logic.activeTab === Tab.INVENTORY} onClick={() => logic.setActiveTab(Tab.INVENTORY)} icon={<Box />} label={(logic.isAdmin && !logic.isTestMode) ? "Databáze" : "Batoh"} />
            <NavButton active={logic.activeTab === Tab.SPACESHIP} onClick={() => logic.setActiveTab(Tab.SPACESHIP)} icon={<Rocket />} label="Loď" />
            {(logic.isAdmin && !logic.isTestMode) && <NavButton active={logic.activeTab === Tab.GENERATOR} onClick={() => logic.setActiveTab(Tab.GENERATOR)} icon={<Hammer />} label="Fab" />}
            {(logic.userEmail === 'zbynekbal97@gmail.com' && !logic.isTestMode) && <NavButton active={logic.activeTab === Tab.CHARACTERS} onClick={() => logic.setActiveTab(Tab.CHARACTERS)} icon={<UserCircle />} label="Postavy" />}
            <NavButton active={logic.activeTab === Tab.ROOM} onClick={() => logic.setActiveTab(Tab.ROOM)} icon={<Users />} label="Tým" />
            <NavButton active={logic.activeTab === Tab.SETTINGS} onClick={() => logic.setActiveTab(Tab.SETTINGS)} icon={<SettingsIcon />} label="Sys" />
          </div>

          <AnimatePresence>
            {logic.isDocking && (
              <DockingAnimation onComplete={logic.handleDockingComplete} />
            )}
          </AnimatePresence>

          {/* MERCHANT SCREEN OVERLAY */}
          <AnimatePresence>
            {logic.activeMerchant && (
              <MerchantScreen
                merchant={logic.activeMerchant}
                userGold={logic.playerGold}
                // IMPORTANT: If in Test Mode, look up items in Test Vault. Otherwise use live admin vault.
                adminEmail={logic.isTestMode ? 'test1@nexus.cz' : 'zbynekbal97@gmail.com'}
                inventory={logic.inventory}
                playerClass={logic.playerClass}
                onClose={() => logic.setActiveMerchant(null)}
                onBuy={logic.handleBuyItem}
                onSell={logic.handleSellItem}
                onAddFreeItem={(item) => logic.handleSaveEvent(item, false)} // Helper for Rogue Steal
                masterCatalog={logic.masterCatalog} // PASSED TO FIX ITEM LOOKUP
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {logic.activeStation && (
              <SpaceStationView
                station={logic.activeStation}
                onLeave={logic.handleLeaveStation}
                onClaimRewards={logic.handleClaimStationRewards}
                inventory={logic.inventory}
                masterCatalog={logic.masterCatalog}
                onCraft={(item) => { logic.handleCraftItem(item.id, [], item); }}
                playerGold={logic.playerGold}
                playerClass={logic.playerClass}
                onInventoryUpdate={logic.handleRefreshDatabase}
                isAdmin={logic.isAdmin}
                isTestMode={logic.isTestMode}
                onGoldChange={logic.handleGoldChange}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {logic.currentEvent && !logic.isDocking && !logic.activeStation && !logic.activeMerchant && (
              <EventCard
                event={logic.currentEvent}
                onClose={() => logic.closeEvent()}
                onSave={() => { logic.handleSaveEvent(logic.currentEvent!, false); }}
                onUse={() => { logic.handleUseEvent(logic.currentEvent!); }}
                onDiscard={() => { logic.handleDeleteEvent(logic.currentEvent!.id); }}
                onResolveDilemma={logic.handleResolveDilemma}
                isSaved={logic.inventory.some(i => i.id === logic.currentEvent?.id)}
                onPlayerDamage={logic.handleHpChange}
                playerHp={logic.playerHp}
                playerArmor={logic.playerArmor} // Added
                onArmorChange={handleArmorChange} // Added 
                playerClass={logic.playerClass} // PASSED HERE
                inventory={logic.inventory}
                onUseItem={(item) => logic.handleUseEvent(item)}
                onClaimLoot={handleClaimLoot}
              />
            )}
          </AnimatePresence>
        </>
      )}

      <style>{`
        .stat-glow-box {
          box-shadow: inset 0 0 10px var(--slot-color-alpha);
          border-color: var(--slot-color-border);
        }
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div >
  );
};

const StatSlot: React.FC<{ icon: React.ReactNode, value: number, max?: number, color: string, label: string }> = ({ icon, value, max, color, label }) => {
  const percent = max ? Math.min(100, Math.max(0, (value / max) * 100)) : 100;

  return (
    <div className="relative overflow-hidden rounded-md bg-zinc-950/80 border border-white/5 flex flex-col items-center justify-center py-1 h-[48px] group">
      {/* Ambient Backlight */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ backgroundColor: color }} />

      <div className="flex flex-col items-center gap-0.5 z-10 relative w-full px-2">
        <div className="flex items-end justify-center gap-1.5 w-full">
          <div className="mb-0.5 opacity-80" style={{ color }}>{icon}</div>
          <span className="font-mono font-black text-lg leading-none text-white tracking-tighter" style={{ textShadow: `0 0 10px ${color}40` }}>
            {value}
          </span>
        </div>
        <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
      </div>

      {/* Progress Line */}
      {max && (
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
          <div
            className="h-full transition-all duration-700 ease-out relative"
            style={{ width: `${percent}%`, backgroundColor: color }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white opacity-50 blur-[1px]" />
          </div>
        </div>
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-signal-cyan scale-110' : 'text-zinc-500'}`}>
    <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-signal-cyan/10 border border-signal-cyan/20' : ''}`}>{icon}</div>
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;

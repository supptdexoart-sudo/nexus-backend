
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
import MerchantScreen from './components/MerchantScreen';
import ServerLoader from './components/ServerLoader';
import {
  Scan, Box, Users, Settings as SettingsIcon,
  Sun, Moon, Heart, Coins, Shield,
  Wind, Loader2, AlertTriangle, Rocket, Fuel, Activity
} from 'lucide-react';
import { playSound, vibrate } from './services/soundService';
import { GameEventType, GameEvent, Stat, SectorEvent } from './types';

// Lazy Loads
const inventoryImport = () => import('./components/InventoryView');
const roomImport = () => import('./components/Room');
const settingsImport = () => import('./components/SettingsView');
const spaceshipImport = () => import('./components/SpaceshipView');

const InventoryView = lazy(inventoryImport);
const Room = lazy(roomImport);
const SettingsView = lazy(settingsImport);
const SpaceshipView = lazy(spaceshipImport);

// --- ERROR BOUNDARY ---
interface ModuleErrorBoundaryProps { children?: ReactNode; }
interface ModuleErrorBoundaryState { hasError: boolean; }

class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  state: ModuleErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ModuleErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("ModuleErrorBoundary caught an error", error, errorInfo); }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
          <div className="w-16 h-16 bg-red-950/20 border border-red-500/50 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">CHYBA PROTOKOLU</h2>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-8 leading-relaxed">
            CRITICAL_FAILURE: MODULE_LOAD<br />Spojení se sektorem ztraceno.
          </p>
          <button onClick={() => window.location.reload()} className="py-4 px-10 bg-red-600 text-black font-black uppercase text-xs hover:bg-white transition-colors">
            RESTARTOVAT SYSTÉM
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- TAB LOADER ---
const TabLoader = () => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-black gap-6 relative">
    {/* Ambient Glow */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,242,255,0.03)_0%,transparent_70%)] pointer-events-none" />

    <div className="relative">
      <Loader2 className="w-16 h-16 text-arc-yellow animate-spin opacity-80" style={{ animationDuration: '1.5s' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-arc-cyan shadow-[0_0_15px_#00f2ff] animate-pulse" />
      </div>
      {/* Outer Ring */}
      <div className="absolute inset-0 border-2 border-arc-cyan/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
    </div>

    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-black text-arc-yellow uppercase tracking-[0.2em] animate-pulse">SYNCHRONIZACE</span>
      <div className="h-[2px] w-24 bg-zinc-800 relative overflow-hidden rounded-full">
        <div className="absolute inset-0 bg-gradient-to-r from-arc-cyan via-arc-yellow to-arc-cyan animate-progress origin-left" />
      </div>
      <span className="text-[10px] font-mono text-zinc-600 uppercase mt-1">NAČÍTÁNÍ_DAT...</span>
    </div>
  </div>
);

// --- MAIN APP ---
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
      settingsImport().catch(() => { });
    }
  }, [bootComplete, logic.userEmail, isOnline]);

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
        else if (['PALIVO', 'FUEL'].some(k => label.includes(k))) { logic.handleFuelChange(val); claimedCount++; }
        else if (['GOLD', 'ZLATO', 'MINCE'].some(k => label.includes(k))) { logic.handleGoldChange(val); claimedCount++; }
        else if (['O2', 'KYSLÍK'].some(k => label.includes(k))) { logic.setPlayerOxygen(prev => Math.min(100, Math.max(0, prev + val))); claimedCount++; }
        else if (['ARMOR', 'BRNĚNÍ'].some(k => label.includes(k))) { logic.handleArmorChange(val); claimedCount++; }
      }
    });

    if (claimedCount > 0) {
      logic.setNotification({ id: 'loot-claim-' + Date.now(), type: 'success', message: 'Kořist byla připsána do inventáře.' });
    }
  };

  const handlePlanetLand = (planetId: string, eventType: GameEventType) => {
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
    <div className={`h-screen w-screen bg-transparent overflow-hidden flex flex-col font-sans text-[#e0e0e0] relative`}>
      {/* Effects are now global in index.html */}


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

          <div className="bg-black/80 border-b border-white/10 flex flex-col z-[100] shadow-lg backdrop-blur-md relative">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 ${isOnline ? 'bg-arc-cyan shadow-[0_0_8px_#00f2ff]' : 'bg-red-500 animate-ping'}`} />
                <span className="text-[10px] font-mono tracking-widest text-zinc-500">NEXUS_LINK // v2.1</span>
              </div>

              {/* Removed Absolute Turn Indicator - Moved to Stats Grid */}

              <div className="flex items-center gap-4">
                <button onClick={handleDayNightClick} className="flex items-center gap-2 active:scale-95 transition-transform group">
                  <div className={`p-1 border ${logic.isNight ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-arc-yellow/50 bg-arc-yellow/10'}`}>
                    {logic.isNight ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-arc-yellow" />}
                  </div>
                </button>
                <div className="w-12 h-1 bg-zinc-800 relative overflow-hidden">
                  <div className="h-full bg-arc-yellow" style={{ width: `${batteryLevel * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="flex-1 flex flex-col gap-[1px] bg-black/50 p-[1px]">
              <div className="flex-1 grid grid-cols-3 gap-[1px]">
                <StatSlot icon={<Heart className="w-3.5 h-3.5" />} value={logic.playerHp} max={150} color="#ef4444" label="ZDRAVÍ" />
                <StatSlot icon={<Fuel className="w-3.5 h-3.5" />} value={logic.playerFuel} max={100} color="#f97316" label="PALIVO" />
                <StatSlot icon={<Coins className="w-3.5 h-3.5" />} value={logic.playerGold} color="#F9D423" label="KREDITY" />
              </div>
              <div className="flex-1 grid grid-cols-3 gap-[1px]">
                <StatSlot icon={<Shield className="w-3.5 h-3.5" />} value={logic.playerArmor} color="#a1a1aa" label="OBRANA" />

                {/* Center Slot: Turn Indicator */}
                {logic.roomState.isInRoom && logic.roomState.isGameStarted ? (
                  <div className={`relative overflow-hidden bg-black/80 border border-white/5 flex flex-col items-center justify-center py-2 h-[52px] group transition-colors hover:bg-white/5 ${logic.isMyTurn ? 'border-arc-yellow/30 bg-arc-yellow/5' : ''}`}>
                    <div className="flex flex-col items-center gap-0 z-10 relative w-full px-2">
                      <div className={`flex items-center justify-center gap-2 w-full ${logic.isMyTurn ? 'text-arc-yellow' : 'text-zinc-600'}`}>
                        {logic.isMyTurn ? <Activity className="w-3.5 h-3.5 animate-pulse" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span className="font-black text-sm leading-none tracking-wide uppercase truncate max-w-[100px]">
                          {logic.isMyTurn ? 'JSI NA TAHU' : (logic.roomState.turnOrder[logic.roomState.turnIndex] || '---')}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-1">HERNÍ TAH</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/40 flex items-center justify-center">
                    <span className="text-[8px] font-mono tracking-widest text-zinc-700">ČEKÁM NA HRU</span>
                  </div>
                )}

                <StatSlot icon={<Wind className="w-3.5 h-3.5" />} value={logic.playerOxygen} max={100} color="#00F2FF" label="KYSLÍK" />
              </div>
            </div>
          </div>

          <SectorEventBanner event={logic.roomState.activeSectorEvent} />

          <div className="flex-1 relative overflow-hidden flex flex-col">
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
                      isNight={logic.isNight}
                      playerClass={logic.playerClass} giftTarget={logic.giftTarget} onRefresh={logic.handleRefreshDatabase}
                      onItemClick={logic.handleOpenInventoryItem}
                      getAdjustedItem={logic.getAdjustedItem}
                    />
                  </div>
                )}



                {logic.activeTab === Tab.ROOM && (
                  <div className="absolute inset-0 bg-transparent">
                    <Room
                      roomState={logic.roomState} inventory={logic.inventory} scanLog={logic.scanLog}
                      onExitToMenu={logic.handleExitToMenu} onSendMessage={logic.handleSendMessage} onStartGame={logic.handleStartGame}
                      userEmail={logic.userEmail || undefined}
                      onToggleReady={logic.handleToggleReady}
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
                  <div className="absolute inset-0 bg-transparent">
                    <SettingsView
                      onBack={() => logic.setActiveTab(Tab.SCANNER)} onLogout={logic.handleLogout}
                      soundEnabled={logic.soundEnabled} vibrationEnabled={logic.vibrationEnabled}
                      onToggleSound={logic.handleToggleSound} onToggleVibration={logic.handleToggleVibration} userEmail={logic.userEmail}
                      onHardReset={logic.handleHardReset} onTriggerSectorEvent={logic.handleTriggerSectorEvent}
                    />
                  </div>
                )}

                {logic.activeTab === Tab.SPACESHIP && (
                  <div className="absolute inset-0 bg-transparent">
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


              </Suspense>
            </ModuleErrorBoundary>
          </div>

          {/* BOTTOM NAVIGATION - REDESIGNED WITH FLOATING SCANNER */}
          <div className="h-16 bg-black/10 backdrop-blur-sm border-t border-white/10 relative z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
            {/* Sci-Fi Edge Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10"></div>
              <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black/90 via-black/40 to-transparent z-10"></div>
              <div className="absolute left-0 top-1 bottom-1 w-[1px] bg-arc-cyan/40 shadow-[0_0_15px_#00f2ff] animate-pulse z-20"></div>
              <div className="absolute right-0 top-1 bottom-1 w-[1px] bg-arc-cyan/40 shadow-[0_0_15px_#00f2ff] animate-pulse z-20"></div>
            </div>

            {/* Navigation Buttons Container */}
            <div className="h-full flex items-center justify-around px-6">
              {/* Left Group - Closer to center */}
              <div className="flex gap-1">
                <NavButton active={logic.activeTab === Tab.INVENTORY} onClick={() => logic.setActiveTab(Tab.INVENTORY)} icon={<Box />} label="BATOH" />
                <NavButton active={logic.activeTab === Tab.SPACESHIP} onClick={() => logic.setActiveTab(Tab.SPACESHIP)} icon={<Rocket />} label="LOĎ" />
              </div>

              {/* Right Group - Closer to center */}
              <div className="flex gap-1">
                <NavButton active={logic.activeTab === Tab.ROOM} onClick={() => logic.setActiveTab(Tab.ROOM)} icon={<Users />} label="TÝM" />
                <NavButton active={logic.activeTab === Tab.SETTINGS} onClick={() => logic.setActiveTab(Tab.SETTINGS)} icon={<SettingsIcon />} label="SYS" />
              </div>
            </div>

            <button
              onClick={() => logic.setActiveTab(Tab.SCANNER)}
              className={`absolute left-1/2 -translate-x-1/2 -top-6 w-[68px] h-[68px] rounded-full transition-all duration-300 group ${logic.activeTab === Tab.SCANNER
                ? 'bg-gradient-to-br from-arc-cyan via-arc-yellow to-arc-cyan shadow-[0_8px_32px_rgba(0,242,255,0.5),0_0_60px_rgba(249,212,35,0.3)]'
                : 'bg-gradient-to-br from-zinc-900 to-black shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
                }`}
            >
              <div className={`absolute inset-0 rounded-full transition-all duration-300 ${logic.activeTab === Tab.SCANNER
                ? 'border-2 border-arc-yellow animate-pulse'
                : 'border border-white/20 group-hover:border-arc-cyan/50'
                }`}></div>

              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-arc-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${logic.activeTab === Tab.SCANNER ? 'text-black scale-110' : 'text-arc-cyan group-hover:rotate-180'
                }`}>
                <Scan size={28} strokeWidth={logic.activeTab === Tab.SCANNER ? 3 : 2} />
              </div>

              {logic.activeTab === Tab.SCANNER && (
                <div className="absolute inset-0 rounded-full border-2 border-arc-yellow animate-ping opacity-75"></div>
              )}
            </button>



            {/* VARIANT B: HEXAGON */}
            {/* <button
              onClick={() => logic.setActiveTab(Tab.SCANNER)}
              className="absolute left-1/2 -translate-x-1/2 -top-7 w-[72px] h-[72px] transition-all duration-300 group"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <div className={`w-full h-full transition-all ${logic.activeTab === Tab.SCANNER
                  ? 'bg-arc-yellow shadow-[0_0_40px_rgba(249,212,35,0.6)]'
                  : 'bg-black border-2 border-arc-cyan/30 group-hover:border-arc-cyan'
                }`}>
                <div className="w-full h-full flex items-center justify-center">
                  <Scan size={28} className={logic.activeTab === Tab.SCANNER ? 'text-black' : 'text-arc-cyan'} strokeWidth={2.5} />
                </div>
              </div>

              {logic.activeTab === Tab.SCANNER && (
                <div className="absolute inset-0 border-2 border-arc-yellow/50 animate-pulse" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
              )}
            </button> */}

            {/* VARIANT C: ELEVATED SQUARE - Active */}
            {/* <button
              onClick={() => logic.setActiveTab(Tab.SCANNER)}
              className={`absolute left-1/2 -translate-x-1/2 -top-5 w-16 h-16 rounded-2xl transition-all duration-300 group ${logic.activeTab === Tab.SCANNER
                  ? 'bg-gradient-to-br from-arc-cyan to-black shadow-[0_4px_12px_rgba(0,242,255,0.3),0_8px_24px_rgba(0,0,0,0.4),0_12px_40px_rgba(0,242,255,0.2)] scale-105'
                  : 'bg-gradient-to-br from-zinc-900 to-black shadow-[0_4px_12px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)] hover:scale-105'
                }`}
            >
              <div className={`absolute inset-0 rounded-2xl border transition-all ${logic.activeTab === Tab.SCANNER ? 'border-arc-cyan' : 'border-white/10 group-hover:border-arc-cyan/50'
                }`}></div>

              <div className="absolute inset-0 flex items-center justify-center">
                <Scan size={26} className={logic.activeTab === Tab.SCANNER ? 'text-arc-cyan' : 'text-zinc-400 group-hover:text-arc-cyan'} strokeWidth={2} />
              </div>
            </button> */}

            {/* VARIANT D: DIAMOND - Uncomment to use */}
            {/* <button
              onClick={() => logic.setActiveTab(Tab.SCANNER)}
              className={`absolute left-1/2 -translate-x-1/2 -top-6 w-[70px] h-[70px] rotate-45 transition-all duration-300 group ${
                logic.activeTab === Tab.SCANNER
                  ? 'bg-black border-2 border-arc-yellow shadow-[0_0_40px_rgba(249,212,35,0.5)]'
                  : 'bg-zinc-900 border border-white/20 group-hover:border-arc-cyan/50'
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center -rotate-45">
                <Scan size={28} className={logic.activeTab === Tab.SCANNER ? 'text-arc-yellow animate-pulse' : 'text-arc-cyan'} strokeWidth={2.5} />
              </div>
              
              {logic.activeTab === Tab.SCANNER && (
                <>
                  <div className="absolute -inset-1 border border-arc-yellow/30 animate-ping"></div>
                  <div className="absolute top-0 left-0 w-1 h-1 bg-arc-yellow rounded-full"></div>
                  <div className="absolute top-0 right-0 w-1 h-1 bg-arc-yellow rounded-full"></div>
                  <div className="absolute bottom-0 left-0 w-1 h-1 bg-arc-yellow rounded-full"></div>
                  <div className="absolute bottom-0 right-0 w-1 h-1 bg-arc-yellow rounded-full"></div>
                </>
              )}
            </button> */}
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
                adminEmail={logic.userEmail || ''}
                inventory={logic.inventory}
                playerClass={logic.playerClass}
                onClose={() => logic.setActiveMerchant(null)}
                onBuy={logic.handleBuyItem}
                onSell={logic.handleSellItem}
                masterCatalog={logic.masterCatalog}
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
                playerGold={logic.playerGold}
                playerClass={logic.playerClass}
                onInventoryUpdate={logic.handleRefreshDatabase}
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
                playerArmor={logic.playerArmor}
                onArmorChange={logic.handleArmorChange}
                playerClass={logic.playerClass}
                inventory={logic.inventory}
                onUseItem={(item) => logic.handleUseEvent(item)}
                onClaimLoot={handleClaimLoot}
                activeCharacter={logic.activeCharacter}
                isNight={logic.isNight}
              />
            )}
          </AnimatePresence>
        </>
      )}

      <style>{`
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
    <div className="relative overflow-hidden bg-black/80 border border-white/5 flex flex-col items-center justify-center py-2 h-[52px] group transition-colors hover:bg-white/5">
      {/* Ambient Backlight */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ backgroundColor: color }} />

      <div className="flex flex-col items-center gap-0 z-10 relative w-full px-2">
        <div className="flex items-center justify-center gap-2 w-full">
          <div className="opacity-70 group-hover:opacity-100 transition-opacity" style={{ color }}>{icon}</div>
          <span className="font-black text-xl leading-none text-white tracking-wide">
            {value}
          </span>
        </div>
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">{label}</span>
      </div>

      {/* Progress Line */}
      {max && (
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 group w-14">
    <div className={`p-2 transition-all duration-200 ${active
      ? 'text-arc-yellow bg-arc-yellow/10 border border-arc-yellow shadow-[0_0_15px_rgba(249,212,35,0.15)]'
      : 'text-zinc-500 group-hover:text-zinc-300 border border-transparent'
      }`}>
      {React.cloneElement(icon as React.ReactElement, { size: 18, strokeWidth: active ? 2.5 : 2 })}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-wider transition-colors ${active ? 'text-arc-yellow' : 'text-zinc-600'}`}>
      {label}
    </span>
  </button>
);

const SectorEventBanner: React.FC<{ event?: SectorEvent }> = ({ event }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!event || !event.type || event.expiresAt <= Date.now()) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, event.expiresAt - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [event]);

  if (!event || !event.type || timeLeft <= 0) return null;

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isMagnetic = event.type === 'MAGNETIC_STORM';

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className={`relative overflow-hidden border-b border-white/10 ${isMagnetic ? 'bg-red-950/20' : 'bg-arc-cyan/5'}`}
    >
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded bg-zinc-950 border ${isMagnetic ? 'border-red-500 text-red-500' : 'border-arc-cyan text-arc-cyan'}`}>
            <AlertTriangle className={`w-4 h-4 ${isMagnetic ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h4 className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${isMagnetic ? 'text-red-500' : 'text-arc-cyan'}`}>
              SEKTOROVÁ ANOMÁLIE: {isMagnetic ? 'MAGNETICKÁ BOUŘE' : event.type}
            </h4>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">
              Iniciátor: <span className="text-white">{event.initiator}</span> // Končí za: <span className="font-bold text-white font-mono">{formatTime(timeLeft)}</span>
            </p>
          </div>
        </div>
        {isMagnetic && (
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-red-500/80 uppercase animate-pulse">ŠTÍTY_DEAKTIVOVÁNY</span>
          </div>
        )}
      </div>

      {/* Progress bar background animation */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 overflow-hidden">
        <div className={`absolute inset-0 translate-x-[-100%] animate-slide-right ${isMagnetic ? 'bg-gradient-to-r from-transparent via-red-600 to-transparent' : 'bg-gradient-to-r from-transparent via-arc-cyan to-transparent'}`} style={{ animationDuration: '3s', animationIterationCount: 'infinite' }} />
      </div>
    </motion.div>
  );
};

export default App;

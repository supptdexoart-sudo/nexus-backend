
import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, User, Play, Lock, TrendingUp, Package, X, Search, Handshake, Plus, Hash, Globe, Activity, History, Sword, Wand2, Footprints, Cross } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, vibrate } from '../services/soundService';
import { GameEvent, PlayerClass, RoomState } from '../types';

interface RoomProps {
    roomState: RoomState;
    inventory: GameEvent[];
    playerHp?: number;
    scanLog?: string[];
    onExitToMenu: () => void;
    onSendMessage: (text: string) => void;
    onStartGame?: () => void;
    onInspectItem?: (itemId: string) => void;
    onSwapItems?: (makerEmail: string, takerEmail: string, makerItemId: string, takerItemId: string) => void;
    userEmail?: string;
    playerClass?: PlayerClass | null;
    onToggleReady?: () => void;
    activeCharacter?: any | null;
    isNight?: boolean;
}

const getClassIcon = (pClass: string) => {
    switch (pClass) {
        case PlayerClass.WARRIOR: return <Sword className="w-3 h-3" />;
        case PlayerClass.MAGE: return <Wand2 className="w-3 h-3" />;
        case PlayerClass.ROGUE: return <Footprints className="w-3 h-3" />;
        case PlayerClass.CLERIC: return <Cross className="w-3 h-3" />;
        default: return <User className="w-3 h-3" />;
    }
};

const Room: React.FC<RoomProps> = ({
    roomState, inventory, playerHp, scanLog = [], onExitToMenu, onSendMessage, onStartGame, onInspectItem, onSwapItems, userEmail, playerClass, onToggleReady,
    activeCharacter, isNight
}) => {
    const [activeTab, setActiveTab] = useState<'chat' | 'party' | 'trade'>('party');
    const [newMessage, setNewMessage] = useState('');
    const [isPickingForTrade, setIsPickingForTrade] = useState(false);
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
    const [showCharDetails, setShowCharDetails] = useState(false);

    const [tradeResponseContext, setTradeResponseContext] = useState<{ makerNick: string, makerEmail: string, makerItemId: string, makerItemTitle: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);
    const isHost = roomState.host === roomState.nickname;
    const isSolo = !roomState.isInRoom || roomState.id.startsWith('SOLO-');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [roomState.messages, activeTab, scanLog]);

    const handleSendClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage('');
        playSound('message');
    };

    const handleCreateOffer = () => {
        setIsPickingForTrade(true);
        playSound('open');
        vibrate(30);
    };

    const handleSelectItemForTrade = (item: GameEvent) => {
        onSendMessage(`[NABÍDKA] ${item.title} (ID: ${item.id}) (EMAIL: ${userEmail})`);
        setIsPickingForTrade(false);
        playSound('success');
        vibrate([40, 40]);
    };

    const parseTradeData = (text: string) => {
        const idMatch = text.match(/\(ID: (.*?)\)/);
        const emailMatch = text.match(/\(EMAIL: (.*?)\)/);
        const title = text.replace('[NABÍDKA] ', '').split(' (ID:')[0];
        return { id: idMatch ? idMatch[1] : null, email: emailMatch ? emailMatch[1] : null, title };
    };

    const handleInspectOffer = (text: string) => {
        const data = parseTradeData(text);
        if (data.id && onInspectItem) {
            onInspectItem(data.id);
            playSound('scan');
        }
    };

    const handleRespondToOffer = (sender: string, text: string) => {
        const data = parseTradeData(text);
        if (data.id && data.email) {
            setTradeResponseContext({
                makerNick: sender,
                makerEmail: data.email,
                makerItemId: data.id,
                makerItemTitle: data.title
            });
            playSound('open');
            vibrate(30);
        }
    };

    const handleConfirmSwap = (takerItem: GameEvent) => {
        if (tradeResponseContext && onSwapItems && userEmail) {
            onSwapItems(tradeResponseContext.makerEmail, userEmail, tradeResponseContext.makerItemId, takerItem.id);
            setTradeResponseContext(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950 overflow-hidden relative">
            {/* Background Dots */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            <div className="bg-black/80 backdrop-blur-md border-b border-zinc-800 relative z-10">
                <div className="flex justify-between items-center p-3 pb-1">
                    <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                        <User className="w-3 h-3 text-zinc-400" />
                        <span className="text-xs font-mono text-zinc-100 font-bold">{roomState.nickname}</span>
                    </div>
                    <button
                        onClick={() => setShowLeaveConfirmation(true)}
                        className="flex items-center gap-1 text-red-500 px-2 py-1 bg-red-900/10 rounded border border-red-900/20 active:scale-90 transition-all"
                    >
                        <Trash2 className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase">{isSolo ? 'Ukončit Solo' : 'Opustit'}</span>
                    </button>
                </div>

                {/* TAB BAR - Skrytý v Solo režimu */}
                {!isSolo && (
                    <div className="flex px-2">
                        <button onClick={() => setActiveTab('party')} className={`flex-1 py-3 text-xs font-bold uppercase border-b-2 transition-colors ${activeTab === 'party' ? 'border-signal-amber text-white' : 'border-transparent text-zinc-400'}`}>
                            Jednotka ({roomState.members?.length ?? 0})
                        </button>
                        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-xs font-bold uppercase border-b-2 transition-colors ${activeTab === 'chat' ? 'border-signal-amber text-white' : 'border-transparent text-zinc-400'}`}>
                            Spojení
                        </button>
                        <button onClick={() => setActiveTab('trade')} className={`flex-1 py-3 text-xs font-bold uppercase border-b-2 transition-colors ${activeTab === 'trade' ? 'border-signal-amber text-white' : 'border-transparent text-zinc-400'}`}>
                            Burza
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
                {activeTab === 'party' && (
                    <div className="p-3 space-y-3">
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 relative overflow-hidden">
                            {/* Status Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-6">
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border ${roomState.isGameStarted || isSolo ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}`}>
                                    <Lock className="w-2.5 h-2.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                        {isSolo ? 'NEZÁVISLÁ_JEDNOTKA' : roomState.isGameStarted ? 'MISE_PROBÍHÁ' : 'SYSTÉM_PŘIPRAVEN'}
                                    </span>
                                </div>

                                {!isSolo && isHost && (
                                    <div className="bg-signal-amber/10 text-signal-amber px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-signal-amber/30">
                                        AUTORITA_SEKTORU
                                    </div>
                                )}
                                {!isSolo && !isHost && roomState.host && (
                                    <div className="bg-zinc-800 text-zinc-500 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-zinc-700">
                                        Hostitel: {roomState.host}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-[0.2em] block mb-1">Označení_Sektoru</span>
                                    <span className="text-xl font-mono font-black text-white leading-tight">{isSolo ? 'LOKÁLNÍ_BATOH' : roomState.id}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-[0.2em] block mb-1">Cyklus</span>
                                    <span className="text-3xl font-mono font-black text-signal-cyan leading-none">{isSolo ? 1 : roomState.roundNumber}</span>
                                </div>
                            </div>

                            {!isSolo && !roomState.isGameStarted && (
                                <div className="mt-6 flex gap-2">
                                    {onToggleReady && (
                                        <button
                                            onClick={onToggleReady}
                                            className={`flex-1 py-4 font-black uppercase rounded-xl transition-all active:scale-95 border ${(roomState.members || []).find(m => m.name === roomState.nickname)?.isReady
                                                ? 'bg-green-500/10 border-green-500 text-green-500'
                                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                                                }`}
                                        >
                                            {(roomState.members || []).find(m => m.name === roomState.nickname)?.isReady ? 'JSME PŘIPRAVENI' : 'POTVRDIT PŘIPRAVENOST'}
                                        </button>
                                    )}

                                    {isHost && (
                                        <button
                                            onClick={onStartGame}
                                            disabled={!(roomState.members || []).every(m => m.isReady)}
                                            className={`flex-1 py-4 font-black uppercase rounded-xl flex items-center justify-center gap-3 transition-transform shadow-[0_0_20px_rgba(255,157,0,0.3)] active:scale-95 cursor-pointer ${(roomState.members || []).length > 0 && (roomState.members || []).every(m => m.isReady)
                                                ? 'bg-signal-amber text-black opacity-100'
                                                : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed shadow-none'
                                                }`}
                                        >
                                            <Play className="w-5 h-5 fill-current" />
                                            START
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] pl-1">Aktivní_Jednotky_V_Dosahu</h3>

                            {isSolo ? (
                                <div className="bg-black border border-signal-cyan/30 bg-signal-cyan/5 p-4 rounded-xl flex items-center gap-4 shadow-[inset_0_0_20px_rgba(0,242,255,0.05)]">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border-2 border-signal-cyan bg-signal-cyan/10 text-signal-cyan">
                                        {roomState.nickname.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-2">
                                            <button
                                                onClick={() => {
                                                    if (activeCharacter) setShowCharDetails(true);
                                                    else playSound('error');
                                                }}
                                                className="flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all group cursor-help"
                                            >
                                                <span className="font-black text-white uppercase tracking-wider group-hover:text-signal-cyan transition-colors">{roomState.nickname}</span>
                                                {playerClass && (
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">
                                                        {getClassIcon(playerClass)}
                                                        <span className="text-[8px] font-mono text-zinc-400 uppercase font-bold">{playerClass}</span>
                                                    </div>
                                                )}
                                            </button>
                                            <div className="flex items-center gap-1.5">
                                                <Activity className="w-3 h-3 text-signal-hazard" />
                                                <span className="font-mono font-black text-sm text-white">{playerHp ?? 100} HP</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                                            <motion.div
                                                {...({ initial: { width: 0 }, animate: { width: `${playerHp ?? 100}%` } } as any)}
                                                className={`h-full transition-all duration-500 ${(playerHp ?? 100) < 30 ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-signal-cyan shadow-[0_0_10px_rgba(0,242,255,0.3)]'}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                roomState.members?.map((member, idx) => {
                                    const isMe = member.name === roomState.nickname;
                                    const isTurn = roomState.isGameStarted && roomState.turnOrder[roomState.turnIndex] === member.name;
                                    return (
                                        <div key={idx} className={`bg-black border p-4 rounded-xl flex items-center gap-4 transition-all ${isMe ? 'border-signal-cyan/30 bg-signal-cyan/5 shadow-[inset_0_0_20px_rgba(0,242,255,0.05)]' : 'border-zinc-800'} ${isTurn ? 'ring-2 ring-signal-amber border-signal-amber bg-signal-amber/5 animate-pulse' : ''}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${isMe ? 'border-signal-cyan bg-signal-cyan/10 text-signal-cyan' : isTurn ? 'border-signal-amber bg-signal-amber/10 text-signal-amber' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}>
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    {isMe ? (
                                                        <button
                                                            onClick={() => {
                                                                if (activeCharacter) setShowCharDetails(true);
                                                                else playSound('error');
                                                            }}
                                                            className="flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all group cursor-help text-left"
                                                        >
                                                            <span className="font-bold text-sm text-white group-hover:text-signal-cyan transition-colors">{member.name}</span>
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/50 rounded border border-white/10">
                                                                <span className="text-[7px] font-mono text-zinc-400 uppercase font-bold">{playerClass}</span>
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-zinc-200">{member.name}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3">
                                                        {!roomState.isGameStarted && (
                                                            <div className={`w-3 h-3 rounded-full border ${member.isReady ? 'bg-green-500 border-green-400 shadow-[0_0_8px_lime]' : 'bg-transparent border-zinc-600'}`} />
                                                        )}
                                                        <span className={`font-mono font-bold text-xs ${member.hp < 30 ? 'text-red-500' : 'text-green-500'}`}>{member.hp} HP</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-500 ${member.hp < 30 ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]'}`} style={{ width: `${Math.min(100, Math.max(0, member.hp))}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {isSolo && (
                            <div className="mt-8 space-y-4">
                                <div className="flex items-center gap-2 pl-1 mb-2">
                                    <History className="w-4 h-4 text-signal-cyan" />
                                    <h3 className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em]">Průzkumný_Deník</h3>
                                </div>
                                <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 h-[250px] overflow-y-auto no-scrollbar font-mono text-[10px] space-y-2 relative">
                                    {scanLog.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-zinc-600 italic">
                                            Čekám na záznam dat...
                                        </div>
                                    ) : (
                                        scanLog.map((log, i) => (
                                            <motion.div
                                                {...({ initial: { opacity: 0, x: -5 }, animate: { opacity: 1, x: 0 }, key: i } as any)}
                                                className="flex gap-2 text-zinc-400 border-l border-zinc-700 pl-2 py-0.5"
                                            >
                                                <span className="text-signal-cyan/50">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                                                <span className="text-zinc-300">{log}</span>
                                            </motion.div>
                                        ))
                                    )}
                                    <div ref={logEndRef} />
                                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]" />
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {activeTab === 'chat' && !isSolo && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {roomState.messages.map((msg) => {
                                const isOffer = msg.text.startsWith('[NABÍDKA]');
                                return (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender === roomState.nickname ? 'items-end' : 'items-start'}`}>
                                        {msg.isSystem ? (
                                            <div className="w-full text-center my-2">
                                                <span className="text-[9px] bg-zinc-900 px-3 py-1 rounded text-zinc-500 font-mono uppercase tracking-widest border border-white/5">{msg.text}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-[9px] font-black uppercase text-zinc-500 mb-1">{msg.sender}</span>
                                                {isOffer ? (
                                                    <div className={`p-4 rounded-2xl max-w-[90%] border bg-black overflow-hidden relative ${msg.sender === roomState.nickname ? 'border-signal-amber/50 rounded-tr-none' : 'border-signal-cyan/50 rounded-tl-none'}`}>
                                                        <div className={`absolute top-0 left-0 w-full h-0.5 animate-pulse ${msg.sender === roomState.nickname ? 'bg-signal-amber' : 'bg-signal-cyan'}`} />
                                                        <div className="flex items-start gap-3 mb-4">
                                                            <div className={`p-2 rounded-lg bg-white/5 ${msg.sender === roomState.nickname ? 'text-signal-amber' : 'text-signal-cyan'}`}>
                                                                <Package className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black uppercase text-zinc-500 mb-0.5 tracking-widest">Sektorový_Transfer</p>
                                                                <p className="text-sm font-bold text-white uppercase leading-tight">{msg.text.replace('[NABÍDKA] ', '').split(' (ID:')[0]}</p>
                                                            </div>
                                                        </div>
                                                        {msg.sender !== roomState.nickname && (
                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                <button onClick={() => handleInspectOffer(msg.text)} className="flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"><Search className="w-3 h-3" /> Inspekce</button>
                                                                <button onClick={() => handleRespondToOffer(msg.sender, msg.text)} className="flex items-center justify-center gap-2 py-2.5 bg-signal-cyan text-black hover:bg-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-[0_0_10px_rgba(0,242,255,0.2)]"><Handshake className="w-3 h-3" /> Převzít</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${msg.sender === roomState.nickname ? 'bg-signal-cyan/10 border border-signal-cyan/30 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-100 rounded-tl-none'}`}>
                                                        {msg.text}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendClick} className="p-3 bg-black border-t border-zinc-800 flex gap-2">
                            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Zpráva sektoru..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-signal-cyan text-sm" />
                            <button type="submit" disabled={!newMessage.trim()} className="bg-signal-cyan text-black p-3 rounded-xl active:scale-90"><Send className="w-5 h-5" /></button>
                        </form>
                    </div>
                )}

                {activeTab === 'trade' && !isSolo && (
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-3xl text-center space-y-4">
                            <TrendingUp className="w-12 h-12 text-signal-amber animate-pulse" />
                            <h3 className="text-xl font-black uppercase tracking-widest">Sektorová_Burza</h3>
                            <p className="text-xs text-zinc-500 font-mono leading-relaxed">Zde můžete směňovat assety z Batohu s ostatními jednotkami v sektoru v reálném čase.</p>
                            <button onClick={handleCreateOffer} className="px-6 py-3 bg-signal-amber text-black font-black uppercase text-[10px] tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,157,0,0.2)]">Vytvořit Nabídku</button>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showLeaveConfirmation && (
                    <motion.div {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)} className="fixed inset-0 z-[300] bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
                        <motion.div {...({ initial: { scale: 0.9, y: 20 }, animate: { scale: 1, y: 0 } } as any)} className="w-full max-w-sm space-y-10">
                            <div className="space-y-4">
                                <div className="w-20 h-20 bg-red-950/20 border border-red-500/50 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                                    <Trash2 className="w-10 h-10 text-red-500" />
                                </div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter chromatic-text">Odpojení</h2>
                                <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest">Opouštíte Sektor {isSolo ? 'LOKÁLNÍ' : roomState.id}. Jak chcete pokračovat?</p>
                            </div>

                            <div className="space-y-4">
                                <button onClick={onExitToMenu} className="w-full group p-5 bg-zinc-900 border border-zinc-700 hover:border-signal-cyan rounded-2xl flex items-center gap-5 transition-all active:scale-95 text-left">
                                    <div className="p-3 bg-signal-cyan/10 rounded-xl text-signal-cyan group-hover:scale-110 transition-transform"><Plus className="w-6 h-6" /></div>
                                    <div>
                                        <h4 className="font-black text-white uppercase text-sm tracking-widest">Založit Nový Sektor</h4>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Vytvořit novou místnost pro skupinu</p>
                                    </div>
                                </button>

                                <button onClick={onExitToMenu} className="w-full group p-5 bg-zinc-900 border border-zinc-700 hover:border-signal-amber rounded-2xl flex items-center gap-5 transition-all active:scale-95 text-left">
                                    <div className="p-3 bg-signal-amber/10 rounded-xl text-signal-amber group-hover:scale-110 transition-transform"><Hash className="w-6 h-6" /></div>
                                    <div>
                                        <h4 className="font-black text-white uppercase text-sm tracking-widest">Vstoupit do jiného Sektoru</h4>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Zadat kód pro připojení k jednotce</p>
                                    </div>
                                </button>

                                <button onClick={onExitToMenu} className="w-full group p-5 bg-zinc-900 border border-zinc-700 hover:border-white rounded-2xl flex items-center gap-5 transition-all active:scale-95 text-left">
                                    <div className="p-3 bg-white/10 rounded-xl text-white group-hover:scale-110 transition-transform"><Globe className="w-6 h-6" /></div>
                                    <div>
                                        <h4 className="font-black text-white uppercase text-sm tracking-widest">Samostatná Mise (Online)</h4>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Pokračovat sólo se synchronizací Vaultu</p>
                                    </div>
                                </button>
                            </div>

                            <button onClick={() => setShowLeaveConfirmation(false)} className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors">
                                Zrušit a zůstat v misi
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCharDetails && activeCharacter && (
                    <motion.div {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)} className="fixed inset-0 z-[400] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-6">
                        <motion.div {...({ initial: { scale: 0.9, y: 20 }, animate: { scale: 1, y: 0 } } as any)} className="w-full max-w-sm tactical-card border-signal-cyan/30 bg-black p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-signal-cyan to-transparent" />

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">{activeCharacter.name}</h3>
                                    <p className="text-[10px] text-signal-cyan font-black uppercase tracking-widest opacity-80">Přehled Jednotky</p>
                                </div>
                                <button onClick={() => setShowCharDetails(false)} className="p-2 bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Základní HP</p>
                                    <p className="text-lg font-mono font-black text-white">{activeCharacter.baseStats?.hp || 100}</p>
                                </div>
                                <div className="p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Základní Mana</p>
                                    <p className="text-lg font-mono font-black text-white">{activeCharacter.baseStats?.mana || 0}</p>
                                </div>
                                <div className="p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Základní Armor</p>
                                    <p className="text-lg font-mono font-black text-white">{activeCharacter.baseStats?.armor || 0}</p>
                                </div>
                                <div className="p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Základní DMG</p>
                                    <p className="text-lg font-mono font-black text-white">{activeCharacter.baseStats?.damage || 0}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Instalované_Moduly_(Perky)</h4>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                                    {activeCharacter.perks && activeCharacter.perks.length > 0 ? (
                                        activeCharacter.perks.map((perk: any, i: number) => {
                                            const cond = perk.effect.condition || 'always';
                                            const isActive = cond === 'always' || (cond === 'night' && isNight) || (cond === 'day' && !isNight);
                                            return (
                                                <div key={i} className={`p-3 rounded-xl border transition-all ${isActive ? 'bg-signal-cyan/5 border-signal-cyan/20' : 'bg-zinc-900/20 border-white/5 opacity-50'}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`text-xs font-black uppercase ${isActive ? 'text-signal-cyan' : 'text-zinc-500'}`}>{perk.name}</span>
                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${isActive ? 'bg-signal-cyan/20 text-signal-cyan' : 'bg-zinc-800 text-zinc-600'}`}>
                                                            {cond === 'always' ? 'Trvalý' : cond === 'night' ? 'Noční' : cond === 'day' ? 'Denní' : 'Bojový'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-400 font-medium leading-tight">{perk.description}</p>
                                                    <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono font-bold text-zinc-500">
                                                        <Activity className="w-2.5 h-2.5" />
                                                        <span>Modifikátor: {perk.effect.stat.toUpperCase()} {perk.effect.modifier > 0 ? '+' : ''}{perk.effect.modifier}{perk.effect.isPercentage ? '%' : ''}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-[10px] text-zinc-600 italic">Žádné moduly nejsou nainstalovány.</p>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setShowCharDetails(false)}
                                className="w-full mt-8 py-4 bg-zinc-900 border border-white/10 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl active:scale-95 transition-all"
                            >
                                Zavřít Diagnostiku
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {(isPickingForTrade || tradeResponseContext) && (
                    <motion.div {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)} className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase tracking-widest text-white">{tradeResponseContext ? 'Vyberte_Protihodnotu' : 'Vyberte_Asset_z_Batohu'}</h2>
                            <button onClick={() => { setIsPickingForTrade(false); setTradeResponseContext(null); }} className="p-2 bg-white/5 rounded-full text-zinc-400"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                            {inventory.map((item) => (
                                <button key={item.id} onClick={() => { if (tradeResponseContext) handleConfirmSwap(item); else handleSelectItemForTrade(item); }} className="w-full p-4 tactical-card border-white/10 bg-white/5 flex gap-4 text-left active:scale-[0.98] group overflow-hidden">
                                    <div className="w-14 h-14 bg-black border border-zinc-800 rounded-lg flex items-center justify-center shrink-0"><Package className="w-7 h-7 text-signal-cyan" /></div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[11px] font-black uppercase text-white truncate block">{item.title}</span>
                                        <p className="text-[9px] text-zinc-500 font-mono line-clamp-2 uppercase italic">{item.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Room;

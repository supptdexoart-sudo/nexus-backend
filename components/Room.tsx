import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, User, UserMinus, Play, Lock, Handshake, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../services/soundService';
import { GameEvent, RoomState } from '../types';
import { TradeSession } from './TradeSession';

interface RoomProps {
    roomState: RoomState;
    inventory: GameEvent[];
    scanLog?: string[];
    onExitToMenu: () => void;
    onSendMessage: (text: string) => void;
    onStartGame?: () => void;
    userEmail?: string;
    onToggleReady?: () => void;
    onKickPlayer?: (name: string) => void;
    activeCharacter?: any | null;
    isNight?: boolean;
    activeTrade?: any | null;
    onInitTrade?: (targetNick: string, item: GameEvent) => void;
    onCancelTrade?: () => void;
    onConfirmTrade?: (confirmed: boolean) => void;
    onTradeSelectOffer?: (item: GameEvent) => void;
}

const Room: React.FC<RoomProps> = ({
    roomState, inventory, scanLog = [], onExitToMenu, onSendMessage, onStartGame, userEmail, onToggleReady,
    onKickPlayer, activeCharacter, isNight,
    activeTrade, onInitTrade, onCancelTrade, onConfirmTrade, onTradeSelectOffer
}) => {
    const [activeTab, setActiveTab] = useState<'chat' | 'party'>('party');
    const [newMessage, setNewMessage] = useState('');
    const [isPickingForTrade, setIsPickingForTrade] = useState(false);
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
    const [showCharDetails, setShowCharDetails] = useState(false);
    const [tradeTarget, setTradeTarget] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isHost = roomState.host === roomState.nickname;
    const isSolo = !roomState.isInRoom || roomState.id.startsWith('SOLO-');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [roomState.messages, activeTab, scanLog]);

    const handleSendClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage('');
        playSound('message');
    };

    const handleStartTradeWith = (targetNick: string) => {
        setTradeTarget(targetNick);
        setIsPickingForTrade(true);
        playSound('open');
    };

    const handleItemPicked = (item: GameEvent) => {
        if (activeTrade && onTradeSelectOffer) {
            onTradeSelectOffer(item);
            setIsPickingForTrade(false);
        } else if (tradeTarget && onInitTrade) {
            onInitTrade(tradeTarget, item);
            setTradeTarget(null);
            setIsPickingForTrade(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950 overflow-hidden relative">
            {/* Background Dots */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            {/* LIVE TRADE OVERLAY */}
            {activeTrade && (
                <TradeSession
                    participants={activeTrade.participants}
                    currentUserEmail={userEmail || ''}
                    onConfirm={(c) => onConfirmTrade && onConfirmTrade(c)}
                    onCancel={() => onCancelTrade && onCancelTrade()}
                    onSelectItem={() => setIsPickingForTrade(true)}
                />
            )}

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

                {!isSolo && (
                    <div className="flex px-2">
                        <button onClick={() => setActiveTab('party')} className={`flex-1 py-3 text-xs font-bold uppercase border-b-2 transition-colors ${activeTab === 'party' ? 'border-signal-amber text-white' : 'border-transparent text-zinc-400'}`}>
                            Jednotka ({roomState.members?.length ?? 0})
                        </button>
                        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-xs font-bold uppercase border-b-2 transition-colors ${activeTab === 'chat' ? 'border-signal-amber text-white' : 'border-transparent text-zinc-400'}`}>
                            Spojení
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
                {activeTab === 'party' && (
                    <div className="p-3 space-y-3">
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 relative overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 mb-6">
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border ${roomState.isGameStarted || isSolo ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}`}>
                                    <Lock className="w-2.5 h-2.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                        {isSolo ? 'NEZÁVISLÁ_JEDNOTKA' : roomState.isGameStarted ? 'MISE_PROBÍHÁ' : 'SYSTÉM_PŘIPRAVEN'}
                                    </span>
                                </div>
                                {!isSolo && isHost && <div className="bg-signal-amber/10 text-signal-amber px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-signal-amber/30">AUTORITA_SEKTORU</div>}
                            </div>
                            <div className="flex justify-between items-end">
                                <div><span className="text-[10px] font-bold uppercase text-zinc-500 tracking-[0.2em] block mb-1">Označení_Sektoru</span><span className="text-xl font-mono font-black text-white leading-tight">{isSolo ? 'LOKÁLNÍ_BATOH' : roomState.id}</span></div>
                                <div className="text-right"><span className="text-[10px] font-bold uppercase text-zinc-500 tracking-[0.2em] block mb-1">Cyklus</span><span className="text-3xl font-mono font-black text-signal-cyan leading-none">{isSolo ? 1 : roomState.roundNumber}</span></div>
                            </div>

                            {!isSolo && !roomState.isGameStarted && (
                                <div className="mt-6 flex gap-2">
                                    {onToggleReady && (
                                        <button onClick={onToggleReady} className={`flex-1 py-4 font-black uppercase rounded-xl transition-all active:scale-95 border ${(roomState.members || []).find(m => m.name === roomState.nickname)?.isReady ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}>
                                            {(roomState.members || []).find(m => m.name === roomState.nickname)?.isReady ? 'JSME PŘIPRAVENI' : 'POTVRDIT PŘIPRAVENOST'}
                                        </button>
                                    )}
                                    {isHost && (
                                        <button onClick={onStartGame} disabled={!(roomState.members || []).every(m => m.isReady)} className={`flex-1 py-4 font-black uppercase rounded-xl flex items-center justify-center gap-3 transition-transform shadow-[0_0_20px_rgba(255,157,0,0.3)] active:scale-95 cursor-pointer ${(roomState.members || []).length > 0 && (roomState.members || []).every(m => m.isReady) ? 'bg-signal-amber text-black opacity-100' : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed shadow-none'}`}>
                                            <Play className="w-5 h-5 fill-current" /> START
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] pl-1">Aktivní_Jednotky</h3>
                            {roomState.members?.map((member, idx) => {
                                const isMe = member.name === roomState.nickname;
                                return (
                                    <div key={idx} className={`bg-black border p-4 rounded-xl flex flex-col gap-4 transition-all ${isMe ? 'border-signal-cyan/30 bg-signal-cyan/5' : 'border-zinc-800'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${isMe ? 'border-signal-cyan bg-signal-cyan/10 text-signal-cyan' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}>{member.name.substring(0, 2).toUpperCase()}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`font-bold text-sm ${isMe ? 'text-signal-cyan' : 'text-zinc-200'}`}>{member.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        {!isMe && (
                                                            <button onClick={() => handleStartTradeWith(member.name)} className="px-3 py-1 bg-zinc-800 hover:bg-signal-amber/20 hover:text-signal-amber border border-zinc-700 rounded text-[10px] uppercase font-bold transition-all flex items-center gap-1">
                                                                <Handshake className="w-3 h-3" /> Obchod
                                                            </button>
                                                        )}
                                                        {isHost && !isMe && onKickPlayer && (
                                                            <button onClick={() => onKickPlayer(member.name)} className="p-1.5 bg-red-900/10 text-red-500 rounded border border-red-900/20 hover:bg-red-900/30 transition-colors"><UserMinus className="w-3 h-3" /></button>
                                                        )}
                                                        <span className={`font-mono font-bold text-xs ${member.hp < 30 ? 'text-red-500' : 'text-green-500'}`}>{member.hp} HP</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-500 ${member.hp < 30 ? 'bg-red-600' : 'bg-green-500'}`} style={{ width: `${Math.min(100, Math.max(0, member.hp))}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && !isSolo && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {roomState.messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.sender === roomState.nickname ? 'items-end' : 'items-start'}`}>
                                    {msg.isSystem ? (
                                        <div className="w-full text-center my-2"><span className="text-[9px] bg-zinc-900 px-3 py-1 rounded text-zinc-500 font-mono uppercase tracking-widest border border-white/5">{msg.text}</span></div>
                                    ) : (
                                        <>
                                            <span className="text-[9px] font-black uppercase text-zinc-500 mb-1">{msg.sender}</span>
                                            <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${msg.sender === roomState.nickname ? 'bg-signal-cyan/10 border border-signal-cyan/30 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-100 rounded-tl-none'}`}>
                                                {msg.text}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendClick} className="p-3 bg-black border-t border-zinc-800 flex gap-2">
                            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Zpráva sektoru..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-signal-cyan text-sm" />
                            <button type="submit" disabled={!newMessage.trim()} className="bg-signal-cyan text-black p-3 rounded-xl active:scale-90"><Send className="w-5 h-5" /></button>
                        </form>
                    </div>
                )}
            </div>

            {/* ITEM SELECTION MODAL */}
            <AnimatePresence>
                {isPickingForTrade && (
                    <motion.div {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)} className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase tracking-widest text-white">
                                {activeTrade ? 'Změnit Nabídku' : tradeTarget ? `Obchod s: ${tradeTarget}` : 'Vybrat Předmět'}
                            </h2>
                            <button onClick={() => { setIsPickingForTrade(false); setTradeTarget(null); }} className="p-2 bg-white/5 rounded-full text-zinc-400"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                            {inventory.map((item) => (
                                <button key={item.id} onClick={() => handleItemPicked(item)} className="w-full p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex gap-4 text-left active:scale-[0.98] hover:border-signal-cyan/50 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-black uppercase text-white truncate block">{item.title}</span>
                                        <p className="text-[10px] text-zinc-500 font-mono line-clamp-2 uppercase">{item.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Leave Confirmation */}
            <AnimatePresence>
                {showLeaveConfirmation && (
                    <motion.div {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)} className="absolute inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
                            <h3 className="text-lg font-black uppercase text-white mb-4">Opustit místnost?</h3>
                            <p className="text-sm text-zinc-400 mb-6">Opravdu chcete opustit tuto místnost?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowLeaveConfirmation(false)} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-bold uppercase text-sm">Zrušit</button>
                                <button onClick={onExitToMenu} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold uppercase text-sm">Opustit</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Character Details */}
            <AnimatePresence>
                {showCharDetails && activeCharacter && (
                    <motion.div {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)} className="absolute inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-black uppercase text-white">{activeCharacter.name}</h3>
                                <button onClick={() => setShowCharDetails(false)} className="p-2 bg-white/5 rounded-full text-zinc-400"><X className="w-5 h-5" /></button>
                            </div>
                            <p className="text-sm text-zinc-400">{activeCharacter.description}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Room;

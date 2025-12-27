import React from 'react';
import { GameEvent } from '../types';

interface TradeSessionProps {
    participants: {
        email: string;
        nickname: string;
        offeredItem: GameEvent | null;
        isConfirmed: boolean;
    }[];
    currentUserEmail: string;
    onConfirm: (isConfirmed: boolean) => void;
    onCancel: () => void;
    onSelectItem: () => void; // Trigger inventory picker
}

export const TradeSession: React.FC<TradeSessionProps> = ({ participants, currentUserEmail, onConfirm, onCancel, onSelectItem }) => {
    // Determine who is who
    const me = participants.find(p => p.email === currentUserEmail);
    const partner = participants.find(p => p.email !== currentUserEmail);

    if (!me || !partner) return null;

    const bothConfirmed = me.isConfirmed && partner.isConfirmed;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-zinc-900 border border-signal-cyan rounded-xl w-full max-w-4xl p-6 shadow-[0_0_50px_rgba(0,242,255,0.2)]">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
                    <h2 className="text-2xl font-orbitron text-signal-cyan tracking-widest animate-pulse">
                        ZABEZPEČENÉ SPOJENÍ
                    </h2>
                    <button onClick={onCancel} className="text-zinc-500 hover:text-red-500 font-mono transition-colors">
                        [PŘERUŠIT SPOJENÍ]
                    </button>
                </div>

                {/* Trade Area */}
                <div className="grid grid-cols-2 gap-8 mb-8 relative">

                    {/* ME */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-zinc-400 font-mono text-sm">VYSIELAČ (JA)</h3>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${me.isConfirmed ? 'bg-signal-green/20 text-signal-green' : 'bg-zinc-800 text-zinc-500'}`}>
                                {me.isConfirmed ? 'PŘIPRAVEN' : 'ČEKÁ SE'}
                            </span>
                        </div>

                        <div
                            onClick={!me.isConfirmed ? onSelectItem : undefined}
                            className={`h-64 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-all relative overflow-hidden group
                                ${me.offeredItem ? 'border-signal-cyan bg-signal-cyan/5' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900'}
                                ${me.isConfirmed ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {me.offeredItem ? (
                                <div className="text-center p-4">
                                    <div className="w-24 h-24 mx-auto mb-2 bg-zinc-800 rounded flex items-center justify-center">
                                        {me.offeredItem.imageUrl ? (
                                            <img src={me.offeredItem.imageUrl} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <span className="text-2xl">📦</span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-white">{me.offeredItem.title}</h4>
                                    <p className="text-xs text-zinc-400 mt-1">{me.offeredItem.rarity || 'Common'}</p>
                                    {!me.isConfirmed && (
                                        <p className="text-xs text-signal-cyan mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            [KLIKNI PRO ZMĚNU]
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center">
                                    <span className="text-4xl mb-2 block text-zinc-600">+</span>
                                    <span className="text-zinc-500 font-mono text-sm">[VLOŽIT PŘEDMĚT]</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Divider Icon */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black border border-zinc-700 rounded-full flex items-center justify-center z-10 shadow-xl">
                        <span className="text-xl">⇄</span>
                    </div>

                    {/* PARTNER */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-zinc-400 font-mono text-sm">PŘÍJEMCE (PARTNER)</h3>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${partner.isConfirmed ? 'bg-signal-green/20 text-signal-green' : 'bg-zinc-800 text-zinc-500'}`}>
                                {partner.isConfirmed ? 'PŘIPRAVEN' : 'ČEKÁ SE'}
                            </span>
                        </div>

                        <div className={`h-64 border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center relative overflow-hidden bg-zinc-900/50
                            ${partner.isConfirmed ? 'border-signal-green/30 bg-signal-green/5' : ''}
                        `}>
                            {partner.offeredItem ? (
                                <div className="text-center p-4">
                                    <div className="w-24 h-24 mx-auto mb-2 bg-zinc-800 rounded flex items-center justify-center opacity-80">
                                        {partner.offeredItem.imageUrl ? (
                                            <img src={partner.offeredItem.imageUrl} className="max-w-full max-h-full object-contain grayscale-[30%]" />
                                        ) : (
                                            <span className="text-2xl">📦</span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-zinc-300">{partner.offeredItem.title}</h4>
                                    <p className="text-xs text-zinc-500 mt-1">{partner.offeredItem.rarity || 'Common'}</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <span className="text-zinc-600 font-mono text-sm animate-pulse">... ČEKÁNÍ NA PARTNERA ...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4 border-t border-zinc-800 pt-6">
                    <button
                        onClick={() => onConfirm(!me.isConfirmed)}
                        className={`
                            px-8 py-3 rounded font-bold tracking-wider transition-all w-full max-w-sm
                            ${me.isConfirmed
                                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-600'
                                : 'bg-signal-cyan/10 text-signal-cyan border border-signal-cyan/50 hover:bg-signal-cyan/20 hover:shadow-[0_0_20px_rgba(0,242,255,0.3)]'
                            }
                        `}
                    >
                        {me.isConfirmed
                            ? (bothConfirmed ? 'ČEKÁNÍ NA SERVER...' : 'ZRUŠIT PŘIPRAVENOST')
                            : 'POTVRDIT NABÍDKU'
                        }
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-xs text-zinc-500 font-mono">
                        {bothConfirmed
                            ? ">>> PŘENOS DAT INICIOVÁN <<<"
                            : partner.isConfirmed
                                ? ">>> PARTNER JE PŘIPRAVEN <<<"
                                : ">>> ČEKÁNÍ NA OBOUSTRANNÉ POTVRZENÍ <<<"
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

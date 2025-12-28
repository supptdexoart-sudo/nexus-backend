
import React, { useState } from 'react';
import { Edit, Trash2, QrCode, Plus, X, User } from 'lucide-react';
import { Character } from '../../types';

interface CharacterListProps {
    characters: Character[];
    onEdit: (character: Character) => void;
    onDelete: (characterId: string) => void;
    onCreate: () => void;
}

const CharacterList: React.FC<CharacterListProps> = ({ characters, onEdit, onDelete, onCreate }) => {
    const [showQR, setShowQR] = useState<Character | null>(null);

    const handleDelete = (char: Character) => {
        if (confirm(`Opravdu chcete smazat postavu "${char.name}"? Tuto akci nelze vzít zpět.`)) {
            onDelete(char.characterId);
        }
    };

    return (
        <div className="p-6 pt-8 h-full overflow-y-auto bg-black relative">
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            <div className="flex justify-between items-center mb-8 relative z-10 border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2 border border-white/20 text-white">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-0.5">SPRÁVA_DATABÁZE</span>
                        <h2 className="text-2xl font-black uppercase tracking-widest text-white">Postavy</h2>
                    </div>
                </div>
                <button
                    onClick={onCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-arc-yellow text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nová Postava
                </button>
            </div>

            {characters.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-zinc-900 relative z-10">
                    <div className="text-zinc-600 mb-4 flex flex-col items-center">
                        <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6">
                            <QrCode className="w-10 h-10 opacity-20" />
                        </div>
                        <p className="text-xl font-black uppercase tracking-widest text-zinc-500">Žádné postavy nenalezeny</p>
                        <p className="text-xs font-mono text-zinc-600 mt-2 uppercase">Databáze je prázdná. Vytvořte novou postavu.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                    {characters.map((char) => (
                        <div
                            key={char.characterId}
                            className="bg-black border border-white/10 p-5 group hover:border-arc-cyan transition-all relative shadow-lg"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-10 transition-opacity">
                                <span className="text-[8px] font-mono text-arc-cyan uppercase">AKTIVNÍ</span>
                            </div>

                            <div className="flex justify-between items-start mb-6 border-b border-zinc-900 pb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-white uppercase tracking-wider mb-1">{char.name}</h3>
                                    <p className="text-[9px] font-mono text-zinc-500 tracking-widest">{char.characterId}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setShowQR(char)}
                                        className="p-2 hover:bg-purple-900/20 text-zinc-600 hover:text-purple-400 transition-colors border border-transparent hover:border-purple-500/30"
                                        title="Zobrazit QR"
                                    >
                                        <QrCode className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onEdit(char)}
                                        className="p-2 hover:bg-arc-cyan/10 text-zinc-600 hover:text-arc-cyan transition-colors border border-transparent hover:border-arc-cyan/30"
                                        title="Upravit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(char)}
                                        className="p-2 hover:bg-red-900/20 text-zinc-600 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/30"
                                        title="Smazat"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {char.description && (
                                <p className="text-xs font-mono text-zinc-500 mb-6 line-clamp-2 h-8 leading-relaxed">{char.description}</p>
                            )}

                            <div className="grid grid-cols-3 gap-0 border border-zinc-800 mb-6 bg-zinc-900/20">
                                <div className="p-2 text-center border-r border-zinc-800">
                                    <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">HP</div>
                                    <div className="text-lg font-mono font-bold text-white">{char.baseStats.hp}</div>
                                </div>
                                <div className="p-2 text-center border-r border-zinc-800">
                                    <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">DMG</div>
                                    <div className="text-lg font-mono font-bold text-white">{char.baseStats.damage}</div>
                                </div>
                                <div className="p-2 text-center">
                                    <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">ARMOR</div>
                                    <div className="text-lg font-mono font-bold text-white">{char.baseStats.armor}</div>
                                </div>
                            </div>

                            {char.perks.length > 0 && (
                                <div className="mb-4">
                                    <div className="text-[9px] font-black text-arc-cyan uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="w-1 h-1 bg-arc-cyan rounded-full"></span>
                                        NAINSTALOVANÉ PERKY ({char.perks.length})
                                    </div>
                                    <div className="space-y-1 pl-2 border-l border-zinc-800">
                                        {char.perks.slice(0, 2).map((perk, i) => (
                                            <div key={i} className="text-[10px] text-zinc-400 font-mono truncate uppercase">
                                                {perk.name || 'NEZNÁMÝ_MOD'}
                                            </div>
                                        ))}
                                        {char.perks.length > 2 && (
                                            <div className="text-[9px] text-zinc-600 font-mono uppercase italic px-1">+{char.perks.length - 2} DALŠÍ</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {char.timeVariant?.enabled && (
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-purple-500 border-t border-zinc-900 pt-3">
                                    <div className="w-1.5 h-1.5 bg-purple-500 animate-pulse shadow-[0_0_5px_rgba(168,85,247,0.8)]" />
                                    NOČNÍ_REŽIM_AKTIVNÍ
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* QR Code Modal */}
            {showQR && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowQR(null)}>
                    <div className="bg-black border border-white/20 p-1 max-w-sm w-full relative shadow-[0_0_50px_rgba(255,255,255,0.1)]" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 p-4 z-10">
                            <button onClick={() => setShowQR(null)} className="p-1 hover:text-red-500 text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 pb-6 flex flex-col items-center">
                            <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-6 text-center border-b border-zinc-800 pb-4 w-full">{showQR.name}</h3>

                            <div className="bg-white p-2 mb-6">
                                <img
                                    id={`qr-${showQR.characterId}`}
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(showQR.characterId)}`}
                                    alt="QR Code"
                                    className="w-full h-auto max-w-[200px]"
                                />
                            </div>

                            <p className="text-center text-xs font-mono text-arc-cyan mb-6 tracking-widest">{showQR.characterId}</p>

                            <button
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(showQR.characterId)}`;
                                    link.download = `${showQR.characterId}_QR.png`;
                                    link.click();
                                }}
                                className="w-full py-4 bg-arc-cyan text-black font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-colors"
                            >
                                STÁHNOUT_QR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CharacterList;

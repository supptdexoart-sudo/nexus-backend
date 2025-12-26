import React from 'react';
import { Edit, Trash2, QrCode, Plus, X } from 'lucide-react';
import { Character } from '../../types';
import { useState } from 'react';

interface CharacterListProps {
    characters: Character[];
    onEdit: (character: Character) => void;
    onDelete: (characterId: string) => void;
    onCreate: () => void;
}

const CharacterList: React.FC<CharacterListProps> = ({ characters, onEdit, onDelete, onCreate }) => {
    const [showQR, setShowQR] = useState<Character | null>(null);

    const handleDelete = (char: Character) => {
        if (confirm(`Opravdu smazat postavu "${char.name}"?`)) {
            onDelete(char.characterId);
        }
    };

    return (
        <div className="p-6 pt-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase tracking-wider text-white">Správa postav</h2>
                <button
                    onClick={onCreate}
                    className="flex items-center gap-2 px-4 py-3 bg-signal-cyan text-black rounded-xl font-black uppercase hover:bg-white transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nová postava
                </button>
            </div>

            {characters.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-zinc-600 mb-4">
                        <QrCode className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-bold">Zatím žádné postavy</p>
                        <p className="text-sm mt-2">Klikni na "Nová postava" pro vytvoření první postavy.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {characters.map((char) => (
                        <div
                            key={char.characterId}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-signal-cyan transition-colors"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-white mb-1">{char.name}</h3>
                                    <p className="text-xs font-mono text-zinc-500">{char.characterId}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowQR(char)}
                                        className="p-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
                                        title="Zobrazit QR kód"
                                    >
                                        <QrCode className="w-4 h-4 text-purple-400" />
                                    </button>
                                    <button
                                        onClick={() => onEdit(char)}
                                        className="p-2 bg-signal-cyan/10 hover:bg-signal-cyan/20 rounded-lg transition-colors"
                                        title="Upravit"
                                    >
                                        <Edit className="w-4 h-4 text-signal-cyan" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(char)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="Smazat"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>

                            {char.description && (
                                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{char.description}</p>
                            )}

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-black/50 rounded-lg p-2 text-center">
                                    <div className="text-xs text-zinc-500 uppercase">HP</div>
                                    <div className="text-lg font-bold text-white">{char.baseStats.hp}</div>
                                </div>
                                <div className="bg-black/50 rounded-lg p-2 text-center">
                                    <div className="text-xs text-zinc-500 uppercase">DMG</div>
                                    <div className="text-lg font-bold text-white">{char.baseStats.damage}</div>
                                </div>
                                <div className="bg-black/50 rounded-lg p-2 text-center">
                                    <div className="text-xs text-zinc-500 uppercase">Armor</div>
                                    <div className="text-lg font-bold text-white">{char.baseStats.armor}</div>
                                </div>
                            </div>

                            {char.perks.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-xs font-bold text-signal-cyan uppercase mb-2">Perky ({char.perks.length})</div>
                                    <div className="space-y-1">
                                        {char.perks.slice(0, 2).map((perk, i) => (
                                            <div key={i} className="text-xs text-zinc-400 truncate">
                                                • {perk.name || 'Bez názvu'}
                                            </div>
                                        ))}
                                        {char.perks.length > 2 && (
                                            <div className="text-xs text-zinc-600">+{char.perks.length - 2} dalších</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {char.timeVariant?.enabled && (
                                <div className="flex items-center gap-2 text-xs text-purple-400">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                                    Noční režim aktivní
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* QR Code Modal */}
            {showQR && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowQR(null)}>
                    <div className="bg-zinc-900 border border-signal-cyan/30 rounded-2xl p-8 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase text-white">{showQR.name}</h3>
                            <button onClick={() => setShowQR(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="bg-white p-4 rounded-xl mb-4">
                            <img
                                id={`qr-${showQR.characterId}`}
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(showQR.characterId)}`}
                                alt="QR Code"
                                className="w-full h-auto"
                            />
                        </div>
                        <button
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(showQR.characterId)}`;
                                link.download = `${showQR.characterId}_QR.png`;
                                link.click();
                            }}
                            className="w-full py-3 mb-4 bg-signal-cyan text-black rounded-lg font-bold uppercase text-xs hover:bg-white transition-colors"
                        >
                            Stáhnout QR kód
                        </button>
                        <p className="text-center text-sm font-mono text-signal-cyan">{showQR.characterId}</p>
                        <p className="text-center text-xs text-zinc-500 mt-2">Naskenuj tento kód pro načtení postavy</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CharacterList;

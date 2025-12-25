
import React, { useState } from 'react';
import { GameEvent } from '../../types';
import { ShoppingBag, Coins, Plus, Trash2, Swords, Cross, Wand2, Footprints, Percent } from 'lucide-react';

interface MerchantPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
}

const MerchantPanel: React.FC<MerchantPanelProps> = ({ event, onUpdate }) => {
    // Local state for adding items (moved from Generator)
    const [merchantItemId, setMerchantItemId] = useState('');
    const [merchantItemStock, setMerchantItemStock] = useState(1);
    const [merchantItemPrice, setMerchantItemPrice] = useState(0);
    const [merchantItemSellPrice, setMerchantItemSellPrice] = useState(0);
    const [merchantItemSaleChance, setMerchantItemSaleChance] = useState(0); // ADDED

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ canSellToMerchant: e.target.checked });
    };

    const updateTradeConfig = (field: string, value: number) => {
        onUpdate({
            tradeConfig: {
                ...(event.tradeConfig || {
                    warriorDiscount: 10,
                    clericDiscount: 45,
                    mageDiscount: 25,
                    rogueStealChance: 30
                }),
                [field]: value
            }
        });
    };

    const addMerchantItem = () => {
        if (!merchantItemId) return;
        const newItem = {
            id: merchantItemId,
            stock: merchantItemStock,
            price: merchantItemPrice,
            sellPrice: merchantItemSellPrice,
            saleChance: merchantItemSaleChance
        };
        onUpdate({
            merchantItems: [...(event.merchantItems || []), newItem]
        });
        // Reset local inputs
        setMerchantItemId('');
        setMerchantItemStock(1);
        setMerchantItemPrice(0);
        setMerchantItemSellPrice(0);
        setMerchantItemSaleChance(0);
    };

    const removeMerchantItem = (index: number) => {
        onUpdate({
            merchantItems: (event.merchantItems || []).filter((_, i) => i !== index)
        });
    };

    return (
        <div className="bg-gradient-to-br from-yellow-900/30 to-black border border-yellow-700 rounded-xl p-5 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
            <div className="flex items-center gap-3 mb-4 text-yellow-500 border-b border-yellow-900/50 pb-2">
                <ShoppingBag className="w-6 h-6" />
                <h3 className="font-display font-bold uppercase tracking-widest">Sklad Obchodníka</h3>
            </div>

            {/* Merchant Settings */}
            <div className="mb-4 bg-yellow-900/20 p-3 rounded-lg border border-yellow-900/50 space-y-4">
                {/* Toggle Buying from players */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-yellow-200 uppercase tracking-wider flex items-center gap-2">
                        <Coins className="w-4 h-4" /> Povolit Výkup od hráčů?
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="canSellToMerchant"
                            className="sr-only peer"
                            checked={event.canSellToMerchant ?? false}
                            onChange={handleCheckboxChange}
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                </div>

                {/* Class Bonuses Config */}
                <div className="pt-2 border-t border-yellow-900/30">
                    <h4 className="text-[10px] font-bold text-yellow-500 uppercase mb-2">Třídní Bonusy</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/40 p-2 rounded border border-red-900/50 flex items-center gap-2">
                            <Swords className="w-4 h-4 text-red-500" />
                            <div className="flex-1">
                                <label className="text-[9px] text-zinc-400 block">Válečník Sleva %</label>
                                <input
                                    type="number"
                                    value={event.tradeConfig?.warriorDiscount ?? 10}
                                    onChange={(e) => updateTradeConfig('warriorDiscount', parseInt(e.target.value))}
                                    className="w-full bg-transparent text-white font-mono font-bold text-xs outline-none"
                                />
                            </div>
                        </div>
                        <div className="bg-black/40 p-2 rounded border border-yellow-900/50 flex items-center gap-2">
                            <Cross className="w-4 h-4 text-yellow-500" />
                            <div className="flex-1">
                                <label className="text-[9px] text-zinc-400 block">Kněz (Heal) Sleva %</label>
                                <input
                                    type="number"
                                    value={event.tradeConfig?.clericDiscount ?? 45}
                                    onChange={(e) => updateTradeConfig('clericDiscount', parseInt(e.target.value))}
                                    className="w-full bg-transparent text-white font-mono font-bold text-xs outline-none"
                                />
                            </div>
                        </div>
                        <div className="bg-black/40 p-2 rounded border border-blue-900/50 flex items-center gap-2">
                            <Wand2 className="w-4 h-4 text-blue-400" />
                            <div className="flex-1">
                                <label className="text-[9px] text-zinc-400 block">Mág (Svitky) Sleva %</label>
                                <input
                                    type="number"
                                    value={event.tradeConfig?.mageDiscount ?? 25}
                                    onChange={(e) => updateTradeConfig('mageDiscount', parseInt(e.target.value))}
                                    className="w-full bg-transparent text-white font-mono font-bold text-xs outline-none"
                                />
                            </div>
                        </div>
                        <div className="bg-black/40 p-2 rounded border border-green-900/50 flex items-center gap-2">
                            <Footprints className="w-4 h-4 text-green-500" />
                            <div className="flex-1">
                                <label className="text-[9px] text-zinc-400 block">Zloděj Krádež %</label>
                                <input
                                    type="number"
                                    value={event.tradeConfig?.rogueStealChance ?? 30}
                                    onChange={(e) => updateTradeConfig('rogueStealChance', parseInt(e.target.value))}
                                    className="w-full bg-transparent text-white font-mono font-bold text-xs outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap items-end bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="flex-[2] min-w-[150px]">
                    <label className="text-[9px] text-zinc-500 uppercase block mb-1">ID Předmětu (např. ITEM-001)</label>
                    <input
                        type="text"
                        value={merchantItemId}
                        onChange={(e) => setMerchantItemId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white font-mono text-sm uppercase"
                    />
                </div>
                <div className="w-16">
                    <label className="text-[9px] text-zinc-500 uppercase block mb-1">Sklad</label>
                    <input
                        type="number"
                        value={merchantItemStock}
                        onChange={(e) => setMerchantItemStock(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white font-mono text-sm text-center"
                    />
                </div>
                <div className="w-20">
                    <label className="text-[9px] text-yellow-500 uppercase block mb-1 font-bold">Cena (Buy)</label>
                    <input
                        type="number"
                        value={merchantItemPrice}
                        onChange={(e) => setMerchantItemPrice(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-yellow-500 font-mono text-sm font-bold text-center"
                    />
                </div>
                <div className="w-20">
                    <label className="text-[9px] text-green-500 uppercase block mb-1 font-bold">Výkup (Sell)</label>
                    <input
                        type="number"
                        value={merchantItemSellPrice}
                        onChange={(e) => setMerchantItemSellPrice(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-green-500 font-mono text-sm font-bold text-center"
                    />
                </div>
                <div className="w-20">
                    <label className="text-[9px] text-pink-500 uppercase block mb-1 font-bold flex gap-1"><Percent className="w-3 h-3"/> Sleva %</label>
                    <input
                        type="number"
                        min="0" max="100"
                        value={merchantItemSaleChance}
                        onChange={(e) => setMerchantItemSaleChance(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-pink-500 font-mono text-sm font-bold text-center"
                        title="Šance, že bude zboží při návštěvě ve slevě"
                    />
                </div>
                <button type="button" onClick={addMerchantItem} className="px-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded flex items-center justify-center h-9 shadow-lg">
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-2">
                {event.merchantItems?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-zinc-800 p-2 rounded border border-zinc-700">
                        <div className="flex-1">
                            <span className="text-white font-mono font-bold text-xs">{item.id}</span>
                            <span className="text-zinc-500 text-[10px] ml-2 font-mono bg-black/30 px-1.5 rounded">x{item.stock}</span>
                            <div className="flex gap-4 mt-1">
                                <span className="text-yellow-500 text-[10px] font-mono font-bold">Nákup: {item.price || 0} G</span>
                                <span className="text-green-500 text-[10px] font-mono font-bold">Výkup: {item.sellPrice || 0} G</span>
                                {item.saleChance && item.saleChance > 0 && (
                                    <span className="text-pink-500 text-[10px] font-mono font-bold flex items-center gap-1"><Percent className="w-3 h-3"/> Chance: {item.saleChance}%</span>
                                )}
                            </div>
                        </div>
                        <button type="button" onClick={() => removeMerchantItem(idx)} className="text-red-500 hover:text-white p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
                {(!event.merchantItems || event.merchantItems.length === 0) && (
                    <p className="text-zinc-600 text-xs italic text-center py-4">Žádné zboží na skladě.</p>
                )}
            </div>
        </div>
    );
};

export default MerchantPanel;

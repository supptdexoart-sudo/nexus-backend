
import React, { useState } from 'react';
import { GameEvent } from '../../types';
import { ShoppingBag, Coins, Trash2, Swords, Cross, Wand2, Footprints, Percent } from 'lucide-react';

interface MerchantPanelProps {
    event: GameEvent;
    onUpdate: (updates: Partial<GameEvent>) => void;
}

const MerchantPanel: React.FC<MerchantPanelProps> = ({ event, onUpdate }) => {
    // Local state for adding items
    const [merchantItemId, setMerchantItemId] = useState('');
    const [merchantItemStock, setMerchantItemStock] = useState(1);
    const [merchantItemPrice, setMerchantItemPrice] = useState(0);
    const [merchantItemSellPrice, setMerchantItemSellPrice] = useState(0);
    const [merchantItemSaleChance, setMerchantItemSaleChance] = useState(0);

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
        <div className="bg-black border border-white/10 p-6 relative shadow-lg">
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <ShoppingBag className="w-32 h-32 text-arc-yellow" />
            </div>

            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <div className="p-2 border border-arc-yellow text-arc-yellow">
                    <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                    <span className="text-[9px] font-mono text-yellow-800 uppercase tracking-widest block mb-0.5">COMMERCE_MODULE</span>
                    <h3 className="text-xl font-display font-black uppercase tracking-widest text-white">Merchant Stock</h3>
                </div>
            </div>

            {/* Merchant Settings */}
            <div className="mb-6 bg-yellow-950/10 p-4 border-l-2 border-arc-yellow space-y-6">
                {/* Toggle Buying from players */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-arc-yellow uppercase tracking-widest flex items-center gap-2">
                        <Coins className="w-4 h-4" /> ENABLE PLAYER SELLING
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="canSellToMerchant"
                            className="sr-only peer"
                            checked={event.canSellToMerchant ?? false}
                            onChange={handleCheckboxChange}
                        />
                        <div className="w-8 h-4 bg-zinc-900 peer-focus:outline-none rounded-none border border-zinc-700 peer peer-checked:border-arc-yellow peer-checked:bg-yellow-900/50 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-zinc-500 after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-arc-yellow"></div>
                    </label>
                </div>

                {/* Class Bonuses Config */}
                <div className="border-t border-yellow-900/30 pt-4">
                    <h4 className="text-[9px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">CLASS AFFINITY ADJUSTMENTS</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black border border-zinc-800 p-2 flex items-center gap-2 group hover:border-red-500 transition-colors">
                            <Swords className="w-4 h-4 text-red-500" />
                            <div className="flex-1">
                                <label className="text-[8px] text-zinc-500 block uppercase font-bold group-hover:text-red-500">WARRIOR DISCOUNT %</label>
                                <input
                                    type="number"
                                    value={event.tradeConfig?.warriorDiscount ?? 10}
                                    onChange={(e) => updateTradeConfig('warriorDiscount', parseInt(e.target.value))}
                                    className="w-full bg-transparent text-white font-mono font-bold text-sm outline-none"
                                />
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-800 p-2 flex items-center gap-2 group hover:border-yellow-500 transition-colors">
                            <Cross className="w-4 h-4 text-yellow-500" />
                            <div className="flex-1">
                                <label className="text-[8px] text-zinc-500 block uppercase font-bold group-hover:text-yellow-500">CLERIC DISCOUNT %</label>
                                <input
                                    type="number"
                                    value={event.tradeConfig?.clericDiscount ?? 45}
                                    onChange={(e) => updateTradeConfig('clericDiscount', parseInt(e.target.value))}
                                    className="w-full bg-transparent text-white font-mono font-bold text-sm outline-none"
                                />
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-800 p-2 flex items-center gap-2 group hover:border-blue-400 transition-colors">
                            <Wand2 className="w-4 h-4 text-blue-400" />
                            <div className="flex-1">
                                <label className="text-[8px] text-zinc-500 block uppercase font-bold group-hover:text-blue-400">MAGE DISCOUNT %</label>
                                <input
                                    type="number"
                                    value={event.tradeConfig?.mageDiscount ?? 25}
                                    onChange={(e) => updateTradeConfig('mageDiscount', parseInt(e.target.value))}
                                    className="w-full bg-transparent text-white font-mono font-bold text-sm outline-none"
                                />
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-800 p-2 flex items-center gap-2 group hover:border-green-500 transition-colors">
                            <Footprints className="w-4 h-4 text-green-500" />
                            <div className="flex-1">
                                <label className="text-[8px] text-zinc-500 block uppercase font-bold group-hover:text-green-500">ROGUE STEAL CHANCE %</label>
                                <input
                                    type="number"
                                    value={event.tradeConfig?.rogueStealChance ?? 30}
                                    onChange={(e) => updateTradeConfig('rogueStealChance', parseInt(e.target.value))}
                                    className="w-full bg-transparent text-white font-mono font-bold text-sm outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap items-end bg-black border border-zinc-800 p-4 relative group hover:border-arc-yellow transition-colors">
                <div className="flex-[2] min-w-[150px]">
                    <label className="text-[8px] text-zinc-500 uppercase block mb-1 font-bold tracking-widest group-hover:text-arc-yellow">ITEM ID (e.g. ITEM-001)</label>
                    <input
                        type="text"
                        value={merchantItemId}
                        onChange={(e) => setMerchantItemId(e.target.value)}
                        className="w-full bg-zinc-900 border-b border-zinc-700 text-white font-mono text-sm uppercase p-2 outline-none focus:border-arc-yellow"
                        placeholder="ID..."
                    />
                </div>
                <div className="w-20">
                    <label className="text-[8px] text-zinc-500 uppercase block mb-1 font-bold tracking-widest">STOCK</label>
                    <input
                        type="number"
                        value={merchantItemStock}
                        onChange={(e) => setMerchantItemStock(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border-b border-zinc-700 text-white font-mono text-sm text-center p-2 outline-none focus:border-white"
                    />
                </div>
                <div className="w-24">
                    <label className="text-[8px] text-arc-yellow uppercase block mb-1 font-bold tracking-widest">BUY PRICE</label>
                    <input
                        type="number"
                        value={merchantItemPrice}
                        onChange={(e) => setMerchantItemPrice(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border-b border-arc-yellow text-arc-yellow font-mono text-sm font-bold text-center p-2 outline-none"
                    />
                </div>
                <div className="w-24">
                    <label className="text-[8px] text-green-500 uppercase block mb-1 font-bold tracking-widest">SELL PRICE</label>
                    <input
                        type="number"
                        value={merchantItemSellPrice}
                        onChange={(e) => setMerchantItemSellPrice(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border-b border-green-500 text-green-500 font-mono text-sm font-bold text-center p-2 outline-none"
                    />
                </div>
                <div className="w-20">
                    <label className="text-[8px] text-pink-500 uppercase block mb-1 font-bold tracking-widest flex gap-1"><Percent className="w-3 h-3" /> SALE %</label>
                    <input
                        type="number"
                        min="0" max="100"
                        value={merchantItemSaleChance}
                        onChange={(e) => setMerchantItemSaleChance(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border-b border-pink-500 text-pink-500 font-mono text-sm font-bold text-center p-2 outline-none"
                        title="Sale Probability"
                    />
                </div>
                <button type="button" onClick={addMerchantItem} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase text-xs tracking-widest transition-colors h-10">
                    ADD
                </button>
            </div>

            <div className="space-y-1">
                {event.merchantItems?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-zinc-900/50 p-2 border border-zinc-800 hover:border-white transition-colors">
                        <div className="flex-1 flex items-center gap-4">
                            <span className="text-white font-mono font-bold text-xs">{item.id}</span>
                            <span className="text-zinc-500 text-[9px] font-mono bg-black border border-zinc-800 px-1.5 py-0.5">STOCK: {item.stock}</span>
                            <div className="flex gap-4 border-l border-zinc-800 pl-4">
                                <span className="text-arc-yellow text-[9px] font-mono font-bold uppercase">BUY: {item.price || 0} G</span>
                                <span className="text-green-500 text-[9px] font-mono font-bold uppercase">SELL: {item.sellPrice || 0} G</span>
                                {item.saleChance && item.saleChance > 0 && (
                                    <span className="text-pink-500 text-[9px] font-mono font-bold flex items-center gap-1 uppercase"><Percent className="w-3 h-3" /> {item.saleChance}%</span>
                                )}
                            </div>
                        </div>
                        <button type="button" onClick={() => removeMerchantItem(idx)} className="text-zinc-600 hover:text-red-500 p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
                {(!event.merchantItems || event.merchantItems.length === 0) && (
                    <div className="text-zinc-600 text-[10px] uppercase font-bold text-center py-6 border border-dashed border-zinc-800">
                        INVENTORY EMPTY
                    </div>
                )}
            </div>
        </div>
    );
};

export default MerchantPanel;

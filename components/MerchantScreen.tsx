
import React, { useState, useEffect, useMemo } from 'react';
import { GameEvent, GameEventType, PlayerClass, Stat } from '../types';
import { ShoppingBag, Coins, X, Loader2, Package, Ban, ArrowRightLeft, DollarSign, Brain, Footprints, Activity, Heart, Zap, Shield, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as apiService from '../services/apiService';
import { playSound } from '../services/soundService';

interface MerchantScreenProps {
    merchant: GameEvent;
    userGold: number;
    adminEmail: string;
    inventory?: GameEvent[]; 
    playerClass: PlayerClass | null; 
    onClose: () => void;
    onBuy: (item: GameEvent) => void;
    onSell?: (item: GameEvent, price: number) => void; 
    onAddFreeItem?: (item: GameEvent) => void;
    masterCatalog?: GameEvent[]; // ADDED: Access to global item database
}

const MerchantScreen: React.FC<MerchantScreenProps> = ({ merchant, userGold, adminEmail, inventory, playerClass, onClose, onBuy, onSell, onAddFreeItem, masterCatalog = [] }) => {
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [shopItems, setShopItems] = useState<GameEvent[]>([]);
    const [stockLevels, setStockLevels] = useState<{ [key: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [rogueMessage, setRogueMessage] = useState<string | null>(null);

    // Appraisal State
    const [appraisingItem, setAppraisingItem] = useState<GameEvent | null>(null);
    const [appraisalStatus, setAppraisalStatus] = useState<'thinking' | 'offer' | 'reject'>('thinking');
    const [offeredPrice, setOfferedPrice] = useState(0);

    // Get Config
    const config = merchant.tradeConfig || {
        warriorDiscount: 10,
        clericDiscount: 45,
        mageDiscount: 25,
        rogueStealChance: 30
    };

    // Calculate Active Sales ONCE
    const activeSales = useMemo(() => {
        const sales: Record<string, boolean> = {};
        merchant.merchantItems?.forEach(item => {
            if (item.saleChance && item.saleChance > 0) {
                const roll = Math.random() * 100;
                sales[item.id] = roll <= item.saleChance;
            }
        });
        return sales;
    }, [merchant.id]);

    useEffect(() => {
        const resolveItems = async () => {
            if (!merchant.merchantItems || merchant.merchantItems.length === 0) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const initialStock: { [key: string]: number } = {};
            const resolvedItems: GameEvent[] = [];

            // Process each item in Merchant's stock list
            for (const entry of merchant.merchantItems) {
                initialStock[entry.id] = entry.stock;
                const targetId = entry.id.trim();

                // 1. Try finding in Master Catalog (Fastest & Preferred "Cloud" Source)
                // Attempt A: Exact Match
                let item = masterCatalog.find(i => i.id === targetId);

                // Attempt B: Fuzzy Match (Match base ID if entry is like "ITEM-01" but catalog has "ITEM-01__12345")
                // This fixes the issue where generated items have unique suffixes but merchant config only has base ID.
                if (!item) {
                    item = masterCatalog.find(i => i.id.split('__')[0] === targetId);
                }

                // 2. If not found in catalog (fallback), try fetching from API
                if (!item) {
                    try {
                        item = (await apiService.getCardById(adminEmail, targetId)) || undefined;
                    } catch (e) {
                        console.warn(`Item ${targetId} not found anywhere.`);
                    }
                }

                if (item) {
                    // Merge specific Merchant overrides (price) with the actual Item Data
                    // We create a copy to ensure we don't mutate the master catalog
                    resolvedItems.push({
                        ...item,
                        // Use merchant price if set, otherwise fallback to item price
                        price: (entry.price !== undefined && entry.price > 0) ? entry.price : item.price, 
                        _merchantEntry: entry 
                    });
                } else {
                    console.log(`[Merchant] Could not resolve item ID: ${targetId}`);
                }
            }

            setStockLevels(initialStock);
            setShopItems(resolvedItems);
            setLoading(false);
        };

        resolveItems();
    }, [merchant, adminEmail, masterCatalog]);

    // --- PRICE CALCULATION ---
    const getCalculatedPrice = (item: GameEvent): { finalPrice: number, basePrice: number, discountType: string | null, isOnSale: boolean } => {
        // Use the price that was already resolved into the item object in useEffect
        const basePrice = item.price ?? 100;
        
        let currentPrice = basePrice;
        let discountType: string | null = null;

        // 1. Flash Sale
        // Check against the Merchant Entry ID (which might be the short ID) OR the resolved Item ID
        const entryId = item._merchantEntry?.id || item.id;
        const isOnSale = activeSales[entryId] || false;
        
        if (isOnSale) {
            currentPrice = Math.floor(basePrice * 0.7); // 30% OFF
            discountType = 'SALE';
        }
        
        // 2. Class Discounts
        if (playerClass === PlayerClass.WARRIOR) {
            const factor = (100 - config.warriorDiscount) / 100;
            currentPrice = Math.floor(currentPrice * factor);
            if(!discountType) discountType = 'CLASS';
        }
        if (playerClass === PlayerClass.CLERIC) {
            const isHealing = item.stats?.some(s => ['HP', 'HEAL', 'LÉČENÍ', 'ZDRAVÍ'].some(k => s.label.toUpperCase().includes(k)));
            if (isHealing) {
                const factor = (100 - config.clericDiscount) / 100;
                currentPrice = Math.floor(currentPrice * factor);
                if(!discountType) discountType = 'CLASS';
            }
        }
        if (playerClass === PlayerClass.MAGE) {
            if (item.isConsumable || item.type === GameEventType.ITEM) { 
                 const factor = (100 - config.mageDiscount) / 100;
                 currentPrice = Math.floor(currentPrice * factor);
                 if(!discountType) discountType = 'CLASS';
            }
        }

        return { finalPrice: Math.max(1, currentPrice), basePrice, discountType, isOnSale };
    };

    const handleBuyClick = (item: GameEvent) => {
        // We track stock by the ID defined in the merchant configuration
        const stockId = item._merchantEntry?.id || item.id;
        const currentStock = stockLevels[stockId] || 0;
        const { finalPrice } = getCalculatedPrice(item);

        if (currentStock > 0 && userGold >= finalPrice) {
            let stockReduction = 1;
            
            // Rogue Steal
            if (playerClass === PlayerClass.ROGUE && currentStock >= 2 && onAddFreeItem) {
                const chance = Math.random() * 100;
                if (chance < config.rogueStealChance) { 
                    stockReduction = 2; 
                    onAddFreeItem(item); 
                    playSound('success');
                    setRogueMessage(`Získal jsi ${item.title} navíc zdarma! (Krádež)`);
                    setTimeout(() => setRogueMessage(null), 3000);
                }
            }

            setStockLevels(prev => ({
                ...prev,
                [stockId]: Math.max(0, prev[stockId] - stockReduction)
            }));
            
            const itemToBuy = { ...item, price: finalPrice };
            onBuy(itemToBuy);
        }
    };

    const handleStartAppraisal = (item: GameEvent) => {
        setAppraisingItem(item);
        setAppraisalStatus('thinking');
        playSound('scan');
        
        setTimeout(() => {
            // Check if merchant wants this specific item
            // Fuzzy match logic again for selling
            const targetId = item.id.split('__')[0]; // Base ID of item in bag
            
            const merchantEntry = merchant.merchantItems?.find(entry => 
                entry.id === item.id || entry.id === targetId
            );

            if (merchantEntry && merchantEntry.sellPrice && merchantEntry.sellPrice > 0) {
                setOfferedPrice(merchantEntry.sellPrice);
                setAppraisalStatus('offer');
                playSound('success');
            } else {
                setAppraisalStatus('reject');
                playSound('error');
            }
        }, 1500);
    };

    const confirmSell = () => {
        if (appraisingItem && onSell) {
            onSell(appraisingItem, offeredPrice);
            playSound('success'); 
            setAppraisingItem(null); 
        }
    };

    const renderStats = (stats?: Stat[]) => {
        if (!stats || stats.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-2 mt-2">
                {stats.map((s, idx) => {
                    let icon = <Activity className="w-3 h-3" />;
                    let color = "text-zinc-400";
                    const label = s.label.toUpperCase();
                    if (label.includes('HP') || label.includes('HEAL')) { icon = <Heart className="w-3 h-3"/>; color = "text-red-400"; }
                    if (label.includes('DMG') || label.includes('ATK')) { icon = <Swords className="w-3 h-3"/>; color = "text-orange-400"; }
                    if (label.includes('DEF') || label.includes('ARMOR')) { icon = <Shield className="w-3 h-3"/>; color = "text-blue-400"; }
                    if (label.includes('MANA')) { icon = <Zap className="w-3 h-3"/>; color = "text-cyan-400"; }

                    return (
                        <div key={idx} className={`flex items-center gap-1 text-[9px] bg-black/60 px-2 py-1 rounded border border-white/10 ${color} font-bold`}>
                            {icon} {s.label}: {s.value}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <motion.div 
            {...({
                initial: { opacity: 0, y: '100%' },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: '100%' },
                transition: { type: 'spring', damping: 25, stiffness: 200 }
            } as any)}
            className="fixed inset-0 z-[60] bg-zinc-950/95 flex flex-col pt-28" // Added pt-28 to clear global HUD
        >
            {/* Background Dots */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0" 
                 style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            {/* --- HEADER --- */}
            <div className="p-4 bg-black border-b border-zinc-800 shadow-xl z-20 flex flex-col gap-4 relative">
                
                {/* Rogue Toast */}
                <AnimatePresence>
                    {rogueMessage && (
                        <motion.div 
                            {...({ initial: { y: -20, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -20, opacity: 0 } } as any)}
                            className="absolute top-2 left-2 right-2 bg-green-900/90 border border-green-500 text-green-100 p-3 rounded-xl z-50 flex items-center gap-2 shadow-xl"
                        >
                            <Footprints className="w-5 h-5 text-green-400" />
                            <span className="text-xs font-bold uppercase">{rogueMessage}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-display font-black text-white uppercase tracking-wider leading-none">{merchant.title}</h2>
                        {/* ID REMOVED FOR CLEANER UI */}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-500/50 rounded-lg text-red-500 hover:bg-red-900/40 active:scale-95 transition-all"
                    >
                        <span className="text-xs font-black uppercase tracking-widest">Odejít</span>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Dostupný Kredit</span>
                    <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        <span className="text-xl font-mono font-black text-white">{userGold}</span>
                    </div>
                </div>

                {/* TABS */}
                {merchant.canSellToMerchant && (
                    <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                        <button 
                            onClick={() => setActiveTab('buy')}
                            className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeTab === 'buy' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-200'}`}
                        >
                            Nákup
                        </button>
                        <button 
                            onClick={() => setActiveTab('sell')}
                            className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeTab === 'sell' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-200'}`}
                        >
                            Prodej
                        </button>
                    </div>
                )}
            </div>

            {/* --- CONTENT --- */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 pb-20 relative z-10">
                {activeTab === 'buy' ? (
                    loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-4">
                            <Loader2 className="w-8 h-8 text-signal-cyan animate-spin" />
                            <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Naskladňování zboží...</p>
                        </div>
                    ) : shopItems.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                            <p className="text-zinc-300 font-bold uppercase tracking-widest">Vyprodáno</p>
                            <p className="text-[10px] text-zinc-500 mt-2 max-w-xs mx-auto">Obchodník nemá na skladě žádné zboží odpovídající zadaným ID. Zkontrolujte Fabrikaci.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {shopItems.map(item => {
                                // Stock ID is likely the Base ID (from merchant config)
                                const stockId = item._merchantEntry?.id || item.id;
                                const currentStock = stockLevels[stockId] || 0;
                                const isOutOfStock = currentStock <= 0;
                                const { finalPrice, basePrice, discountType, isOnSale } = getCalculatedPrice(item);
                                const canAfford = userGold >= finalPrice;

                                return (
                                    <div key={item.id} className={`bg-zinc-900 border border-zinc-800 p-4 rounded-xl relative overflow-hidden transition-all ${isOutOfStock ? 'opacity-50 grayscale' : 'hover:border-zinc-600'}`}>
                                        {/* Sale Badge */}
                                        {isOnSale && !isOutOfStock && (
                                            <div className="absolute top-0 right-0 bg-pink-600 text-white text-[9px] font-black px-2 py-1 rounded-bl-xl uppercase tracking-wider animate-pulse shadow-[0_0_10px_#db2777]">
                                                BLESKOVÁ AKCE
                                            </div>
                                        )}

                                        {/* Rarity Stripe */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                            item.rarity === 'Legendary' ? 'bg-yellow-500' : 
                                            item.rarity === 'Epic' ? 'bg-purple-500' : 
                                            item.rarity === 'Rare' ? 'bg-blue-500' : 'bg-zinc-600'
                                        }`}></div>

                                        <div className="pl-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-white text-lg leading-tight">{item.title}</h3>
                                                <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                                                        isOutOfStock ? 'bg-red-900/20 text-red-500 border-red-900/40' : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                                                    }`}>
                                                        <Package className="w-3 h-3" />
                                                        {isOutOfStock ? 'Vyprodáno' : `Skladem: ${currentStock}`}
                                                </div>
                                            </div>
                                            
                                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-2">{item.type} • {item.rarity}</span>
                                            
                                            <p className="text-xs text-zinc-300 line-clamp-2 font-serif leading-relaxed mb-2 italic opacity-80">"{item.description}"</p>
                                            
                                            {/* STATS */}
                                            {renderStats(item.stats)}
                                        </div>
                                        
                                        {/* PRICE & BUY */}
                                        <div className="pl-3 mt-3 pt-3 border-t border-zinc-800 flex justify-between items-end">
                                            <div className="flex flex-col">
                                                {finalPrice < basePrice && (
                                                    <span className="text-[10px] text-zinc-500 line-through decoration-red-500 font-mono mb-0.5">
                                                        {basePrice} GOLD
                                                    </span>
                                                )}
                                                <div className={`flex items-center gap-1 font-mono font-black text-xl ${canAfford ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    {finalPrice} <Coins className="w-4 h-4" />
                                                </div>
                                                {discountType && <span className="text-[8px] text-green-500 font-bold uppercase">{discountType === 'SALE' ? 'Sleva' : 'Třídní Bonus'}</span>}
                                            </div>

                                            <button 
                                                onClick={() => handleBuyClick(item)}
                                                disabled={isOutOfStock || !canAfford}
                                                className={`px-6 py-3 rounded-lg font-bold uppercase tracking-widest text-xs transition-all shadow-lg flex items-center justify-center gap-2 ${
                                                    isOutOfStock
                                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                                                    : canAfford 
                                                        ? 'bg-signal-cyan text-black hover:bg-white shadow-[0_0_15px_rgba(0,242,255,0.4)] active:scale-95' 
                                                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                                                }`}
                                            >
                                                {isOutOfStock ? 'Vyprodáno' : canAfford ? <><ShoppingBag className="w-4 h-4" /> Koupit</> : 'Drahé'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    // SELL TAB
                    <div className="space-y-3">
                        <div className="mb-4 bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex items-center gap-3">
                            <ArrowRightLeft className="w-5 h-5 text-green-500" />
                            <p className="text-xs text-zinc-200 font-bold leading-relaxed">Vyberte předmět k prodeji.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {(inventory || []).filter(i => i.type === GameEventType.ITEM || i.type === 'PŘEDMĚT' as GameEventType).map(item => (
                                <button 
                                    key={item.id}
                                    onClick={() => handleStartAppraisal(item)}
                                    className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col gap-2 relative overflow-hidden hover:border-green-500/50 transition-colors text-left group active:scale-95"
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-black p-2 rounded-lg border border-zinc-800 group-hover:border-green-500/30 transition-colors">
                                                <Package className="w-5 h-5 text-zinc-400 group-hover:text-green-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm uppercase tracking-tight">{item.title}</h4>
                                                <span className="text-[9px] font-bold uppercase bg-black/40 px-1.5 rounded text-zinc-400 border border-white/10">{item.rarity}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {renderStats(item.stats)}
                                </button>
                            ))}
                            {(!inventory || inventory.filter(i => i.type === GameEventType.ITEM || i.type === 'PŘEDMĚT' as GameEventType).length === 0) && (
                                <p className="col-span-1 text-center text-zinc-500 text-xs py-10 uppercase font-bold tracking-widest">Váš batoh je prázdný.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* APPRAISAL MODAL */}
            <AnimatePresence>
                {appraisingItem && (
                    <motion.div 
                        {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)}
                        className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-6"
                    >
                        <motion.div 
                            {...({ initial: { scale: 0.9, y: 20 }, animate: { scale: 1, y: 0 }, exit: { scale: 0.9, y: 20 } } as any)}
                            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center relative overflow-hidden"
                        >
                            <button onClick={() => setAppraisingItem(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white"><X className="w-5 h-5"/></button>
                            
                            <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tighter">{appraisingItem.title}</h3>
                            
                            <div className="flex justify-center mb-4">
                                {renderStats(appraisingItem.stats)}
                            </div>

                            {appraisalStatus === 'thinking' && (
                                <div className="py-8 flex flex-col items-center gap-4">
                                    <Brain className="w-12 h-12 text-neon-purple animate-pulse" />
                                    <p className="text-sm font-bold text-neon-purple uppercase tracking-widest animate-pulse">Obchodník přemýšlí...</p>
                                </div>
                            )}

                            {appraisalStatus === 'reject' && (
                                <div className="py-4 flex flex-col items-center gap-4">
                                    <Ban className="w-12 h-12 text-red-500" />
                                    <div className="bg-black/60 p-4 rounded-xl border-l-4 border-red-500 text-left w-full border border-zinc-800">
                                        <p className="text-sm italic text-zinc-100 leading-relaxed font-serif">"Tohle? To je bezcenný krám. O to nemám zájem. Přines mi něco pořádného, co mám na seznamu."</p>
                                    </div>
                                    <button onClick={() => setAppraisingItem(null)} className="w-full py-3 bg-zinc-800 text-white font-bold uppercase rounded-lg border border-zinc-700 tracking-widest text-xs">Zpět k Batohu</button>
                                </div>
                            )}

                            {appraisalStatus === 'offer' && (
                                <div className="py-4 flex flex-col items-center gap-4">
                                    <DollarSign className="w-12 h-12 text-green-500" />
                                    <div className="bg-black/60 p-4 rounded-xl border-l-4 border-green-500 text-left w-full border border-zinc-800">
                                        <p className="text-sm italic text-zinc-200 mb-4 font-serif leading-relaxed">"Hmm, zajímavé. O tohle bych zájem měl."</p>
                                        <div className="flex justify-between items-center bg-black/50 p-3 rounded border border-zinc-800">
                                            <span className="text-xs font-bold uppercase text-zinc-300 tracking-wider">Nabídka:</span>
                                            <span className="text-xl font-mono font-bold text-green-500 flex items-center gap-1">
                                                {offeredPrice} <Coins className="w-4 h-4"/>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <button onClick={() => setAppraisingItem(null)} className="flex-1 py-3 bg-zinc-800 text-zinc-300 font-bold uppercase rounded-lg border border-zinc-700 text-xs tracking-widest">Odmítnout</button>
                                        <button onClick={confirmSell} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.4)] text-xs tracking-widest">PRODAT</button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MerchantScreen;

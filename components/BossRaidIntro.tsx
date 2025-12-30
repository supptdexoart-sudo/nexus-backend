import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Siren, AlertTriangle } from 'lucide-react';
import { playSound, vibrate } from '../services/soundService';

interface BossRaidIntroProps {
    bossName: string;
}

const BossRaidIntro: React.FC<BossRaidIntroProps> = ({ bossName }) => {
    useEffect(() => {
        // Initial Siren
        playSound('siren');
        vibrate([500, 200, 500, 200, 1000]);

        // Repeat Siren after 1.5s
        const timer = setTimeout(() => {
            playSound('siren');
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <motion.div 
            {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)}
            className="fixed inset-0 z-[90] bg-red-950 flex flex-col items-center justify-center overflow-hidden"
        >
            {/* Flashing Background */}
            <motion.div 
                {...({
                    animate: { opacity: [0, 0.6, 0] },
                    transition: { duration: 0.8, repeat: Infinity }
                } as any)}
                className="absolute inset-0 bg-red-600 pointer-events-none"
            />
            
            {/* Striped Warning Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 20px, #ff0000 20px, #ff0000 40px)'
            }}></div>

            <div className="relative z-10 text-center p-6 w-full">
                <motion.div
                    {...({
                        initial: { scale: 0.5, opacity: 0 },
                        animate: { scale: [1, 1.2, 1], opacity: 1 },
                        transition: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
                    } as any)}
                    className="mb-8 flex justify-center"
                >
                    <div className="p-6 bg-red-600 rounded-full border-4 border-black shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                        <Siren className="w-20 h-20 text-black animate-spin-slow" />
                    </div>
                </motion.div>

                <motion.div
                    {...({
                        initial: { y: 50, opacity: 0 },
                        animate: { y: 0, opacity: 1 },
                        transition: { delay: 0.5 }
                    } as any)}
                >
                    <div className="flex items-center justify-center gap-3 text-yellow-400 mb-2">
                        <AlertTriangle className="w-8 h-8" />
                        <span className="text-2xl font-black tracking-widest uppercase font-display">Varování Systému</span>
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,1)] scale-y-125 mb-4">
                        RAID ZAHÁJEN
                    </h1>
                    
                    <div className="bg-black/80 border-y-4 border-red-600 py-4 transform -skew-x-12 mx-4">
                        <p className="text-red-500 font-mono text-lg uppercase tracking-[0.2em] transform skew-x-12 animate-pulse">
                            Cíl: {bossName}
                        </p>
                    </div>

                    <p className="mt-8 text-zinc-300 font-bold uppercase tracking-widest text-sm">
                        Synchronizace Týmu...
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default BossRaidIntro;
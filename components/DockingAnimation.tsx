
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Satellite, Crosshair, ChevronUp, Lock, Radio, Cpu } from 'lucide-react';
import { playSound, vibrate } from '../services/soundService';

interface DockingAnimationProps {
  onComplete: () => void;
}

const DockingAnimation: React.FC<DockingAnimationProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'approach' | 'align' | 'dock' | 'flash'>('approach');
  const [distance, setDistance] = useState(8500);
  const [alignment, setAlignment] = useState(34);
  const [logLines, setLogLines] = useState<string[]>([]);

  // Generator random hex data stream
  useEffect(() => {
    const interval = setInterval(() => {
      const hex = Math.random().toString(16).substr(2, 8).toUpperCase();
      setLogLines(prev => [`SYS_DAT: 0x${hex}`, ...prev.slice(0, 6)]);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    playSound('open'); // Thrusters start

    // 1. APPROACH PHASE (High Speed)
    const approachInterval = setInterval(() => {
      setDistance(prev => Math.max(0, prev - 150));
    }, 30);

    // 2. ALIGN PHASE (Slowing down, locking)
    setTimeout(() => {
        setStage('align');
        playSound('scan'); // Radar locking
        // Start aligning
        const alignInterval = setInterval(() => {
            setAlignment(prev => Math.min(100, prev + 2));
        }, 50);
        setTimeout(() => clearInterval(alignInterval), 2000);
    }, 2000);

    // 3. DOCKING (Impact)
    setTimeout(() => {
        setStage('dock');
        clearInterval(approachInterval);
        setDistance(0);
        setAlignment(100);
        playSound('error'); // Heavy mechanical thud
        vibrate([80, 50, 80, 50]); // Heavy rumble
    }, 4000);

    // 4. FLASH & REVEAL
    setTimeout(() => {
        setStage('flash');
        playSound('success'); // Success chime
    }, 4800);

    // 5. CLEANUP
    setTimeout(() => {
        onComplete();
    }, 5500); // Wait for flash to fully white out screen

    return () => clearInterval(approachInterval);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] bg-black overflow-hidden flex flex-col items-center justify-center font-mono cursor-none select-none">
      
      {/* --- BACKGROUND TRAJECTORY EFFECT --- */}
      <div className="absolute inset-0 perspective-1000">
          {/* Moving Grid Floor */}
          <motion.div 
            className="absolute bottom-0 left-[-50%] right-[-50%] h-[50vh] bg-[linear-gradient(transparent_0%,rgba(0,242,255,0.2)_1px,transparent_1px),linear-gradient(90deg,transparent_0%,rgba(0,242,255,0.2)_1px,transparent_1px)]"
            style={{ 
                backgroundSize: '100px 100px', 
                transform: 'rotateX(60deg)',
                transformOrigin: 'bottom'
            }}
            animate={{ backgroundPositionY: ['0px', '1000px'] }}
            transition={{ duration: stage === 'approach' ? 1 : 5, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Warp Lines */}
          {stage === 'approach' && (
             <div className="absolute inset-0 flex items-center justify-center">
                 {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-0.5 h-1/2 bg-cyan-500/50"
                        style={{ 
                            left: `${50 + (Math.random() * 80 - 40)}%`, 
                            top: '50%',
                            transformOrigin: 'top'
                        }}
                        animate={{ 
                            scaleY: [0, 2],
                            opacity: [0, 1, 0],
                            rotate: (Math.random() * 60 - 30)
                        }}
                        transition={{ duration: 0.4, repeat: Infinity, delay: Math.random() * 0.5 }}
                    />
                 ))}
             </div>
          )}
      </div>

      {/* --- CENTRAL TARGET --- */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
          
          {/* Station Asset Scaling */}
          <motion.div
            initial={{ scale: 0.1, opacity: 0 }}
            animate={{ 
                scale: stage === 'approach' ? 0.4 : stage === 'align' ? 0.9 : 1.2,
                opacity: 1,
                rotate: stage === 'dock' ? 0 : 15 // Slight rotation reset on dock
            }}
            transition={{ duration: 4.5, ease: "circIn" }}
            className="relative"
          >
              <Satellite className="w-64 h-64 text-zinc-300 drop-shadow-[0_0_50px_rgba(0,242,255,0.2)]" strokeWidth={0.5} />
              
              {/* Virtual Trajectory Tunnel */}
              <div className="absolute inset-0 flex items-center justify-center">
                  {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute border border-cyan-500/30 rounded-full"
                        style={{ width: '100%', height: '100%' }}
                        animate={{ scale: [0.5, 2], opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "linear" }}
                      />
                  ))}
              </div>
          </motion.div>

          {/* Shake Effect Container for HUD */}
          <motion.div 
            className="absolute inset-0 pointer-events-none"
            animate={stage === 'dock' ? { x: [-5, 5, -5, 5, 0], y: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
              {/* CROSSHAIR & LOCK */}
              <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`relative transition-all duration-500 ${stage === 'dock' ? 'scale-90' : 'scale-100'}`}>
                      <div className="w-[280px] h-[280px] border border-cyan-500/30 rounded-full flex items-center justify-center border-dashed animate-spin-slow"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Crosshair className={`w-8 h-8 ${alignment === 100 ? 'text-green-500' : 'text-red-500'}`} />
                      </div>
                      
                      {/* Alignment Percentage */}
                      <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 text-center w-full">
                          <div className="text-[10px] font-black text-cyan-500 uppercase tracking-widest bg-black/50 px-2">
                              {alignment < 100 ? 'KALIBRACE VEKTORU' : 'ZAMĚŘENO'}
                          </div>
                          <div className="text-xl font-bold text-white font-mono">{alignment}%</div>
                      </div>
                  </div>
              </div>

              {/* TOP HUD: STATUS */}
              <div className="absolute top-12 w-full px-6 flex justify-between items-start">
                  <div className="bg-black/60 border-l-4 border-cyan-500 p-2 pl-4 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-cyan-400 mb-1">
                          <Radio className="w-4 h-4 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest">NEXUS_LINK</span>
                      </div>
                      <div className="text-xs text-white font-bold uppercase">Signál: SILNÝ</div>
                  </div>
                  
                  <div className="text-right">
                      <div className="text-3xl font-black text-white font-mono tracking-tighter tabular-nums">
                          {Math.floor(distance)}<span className="text-sm text-zinc-500 ml-1">m</span>
                      </div>
                      <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">
                          {stage === 'approach' ? 'PŘIBLIŽOVÁNÍ >>' : stage === 'align' ? 'BRZDĚNÍ...' : 'KONTAKT'}
                      </div>
                  </div>
              </div>

              {/* LEFT HUD: DATA STREAM */}
              <div className="absolute left-6 bottom-24 w-40 overflow-hidden">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2 border-b border-zinc-800 pb-1">
                      <Cpu className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase">Telemetrie</span>
                  </div>
                  <div className="space-y-1 font-mono text-[9px] text-cyan-500/70 h-24 flex flex-col-reverse opacity-80">
                      {logLines.map((line, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                              {line}
                          </motion.div>
                      ))}
                  </div>
              </div>

              {/* RIGHT HUD: SYSTEMS */}
              <div className="absolute right-6 bottom-24 w-32 text-right space-y-3">
                  <div>
                      <span className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">Tlak Kabiny</span>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-green-500" initial={{ width: "90%" }} animate={{ width: ["90%", "92%", "89%"] }} transition={{ repeat: Infinity, duration: 2 }} />
                      </div>
                  </div>
                  <div>
                      <span className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">Integrita Pláště</span>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 w-full" />
                      </div>
                  </div>
                  <div className="pt-2">
                      {stage === 'dock' || stage === 'flash' ? (
                          <div className="flex items-center justify-end gap-2 text-green-500">
                              <Lock className="w-4 h-4" /> <span className="font-black text-xs uppercase">ZAMČENO</span>
                          </div>
                      ) : (
                          <div className="flex items-center justify-end gap-2 text-yellow-500">
                              <ChevronUp className="w-4 h-4 animate-bounce" /> <span className="font-black text-xs uppercase">DOKOVÁNÍ</span>
                          </div>
                      )}
                  </div>
              </div>

              {/* BOTTOM HUD: SPEED BAR */}
              <div className="absolute bottom-10 left-10 right-10 flex flex-col items-center">
                  <div className="w-full max-w-md bg-zinc-900/50 h-2 rounded-full overflow-hidden border border-zinc-800">
                      <motion.div 
                        className={`h-full ${stage === 'dock' ? 'bg-green-500' : 'bg-red-500'}`}
                        animate={{ 
                            width: stage === 'approach' ? '80%' : stage === 'align' ? '20%' : '0%' 
                        }}
                        transition={{ duration: 0.5 }}
                      />
                  </div>
                  <div className="flex justify-between w-full max-w-md mt-1 text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                      <span>Rychlost</span>
                      <span>{stage === 'approach' ? '850 m/s' : stage === 'align' ? '120 m/s' : '0 m/s'}</span>
                  </div>
              </div>
          </motion.div>
      </div>

      {/* --- 5. FLASHBANG OVERLAY --- */}
      {stage === 'flash' && (
          <motion.div 
            className="absolute inset-0 bg-white z-[2100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeIn" }}
          />
      )}

    </div>
  );
};

export default DockingAnimation;

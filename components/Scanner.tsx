import React, { useState, useEffect, useRef } from 'react';
import { Keyboard, Camera, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { vibrate } from '../services/soundService';
// @ts-ignore
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerProps {
  onScanCode: (code: string) => void;
  isAIThinking?: boolean;
  isPaused?: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScanCode, isAIThinking, isPaused }) => {
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'active' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualId, setManualId] = useState("");
  
  const scannerRef = useRef<any>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode("qr-reader", { verbose: false });
    return () => {
        stopScanner();
    };
  }, []);

  useEffect(() => {
    if (isPaused || isAIThinking) {
        if (isScanningRef.current) {
            stopScanner();
        }
    }
  }, [isPaused, isAIThinking]);

  const startScanner = async () => {
    if (!scannerRef.current || isScanningRef.current) return;

    try {
        setCameraStatus('active');
        isScanningRef.current = true;
        
        await scannerRef.current.start(
            { facingMode: "environment" }, 
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39
                ]
            },
            (decodedText: string) => {
                if (isPaused || isAIThinking) return;
                onScanCode(decodedText);
                vibrate(50);
            },
            () => {}
        );
    } catch (err: any) {
        setCameraStatus('error');
        setErrorMessage(err.message || "Přístup ke kameře zamítnut.");
        isScanningRef.current = false;
    }
  };

  const stopScanner = async () => {
      if (scannerRef.current && isScanningRef.current) {
          try {
              await scannerRef.current.stop();
              scannerRef.current.clear(); 
          } catch (e) {
              console.error("Stop failed", e);
          } finally {
              isScanningRef.current = false;
              setCameraStatus('idle');
          }
      }
  };

  return (
    <div className="relative h-full w-full bg-black flex flex-col items-center justify-center p-6">
      
      <div className="absolute top-10 left-0 right-0 z-20 flex justify-center pointer-events-none">
         <div className="bg-white/5 backdrop-blur px-4 py-2 border border-white/10 rounded-full flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${cameraStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {isAIThinking ? 'AI_DEKÓDOVÁN...' : cameraStatus === 'active' ? 'OPTIKA_AKTIVNÍ' : 'SENZOR_OFFLINE'}
            </span>
         </div>
      </div>

      <div className="relative w-full aspect-square max-w-sm">
        <div className="absolute -inset-2 border-2 border-signal-cyan/20 rounded-3xl pointer-events-none z-10" />
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-signal-cyan rounded-tl-xl z-10" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-signal-cyan rounded-tr-xl z-10" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-signal-cyan rounded-bl-xl z-10" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-signal-cyan rounded-br-xl z-10" />

        <div className="w-full h-full bg-zinc-900 rounded-2xl overflow-hidden relative shadow-2xl">
           <div id="qr-reader" className="w-full h-full object-cover" />

           {cameraStatus !== 'active' && (
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-10 text-center gap-6 bg-zinc-900">
               {cameraStatus === 'error' ? (
                   <AlertTriangle className="w-12 h-12 text-red-500" />
               ) : (
                   <Camera className="w-12 h-12 text-white/20" />
               )}
               
               <p className="text-xs text-white/40 uppercase font-bold tracking-widest leading-relaxed">
                 {cameraStatus === 'error' ? errorMessage : 'Kamera v pohotovostním režimu'}
               </p>
               
               <button onClick={startScanner} className="button-primary py-3 px-8 text-xs relative overflow-hidden group">
                  <span className="relative z-10">{cameraStatus === 'error' ? 'Zkusit znovu' : 'Aktivovat Senzor'}</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
               </button>
             </div>
           )}

           <AnimatePresence>
             {isAIThinking && (
               <motion.div {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)} className="absolute inset-0 z-30 bg-signal-cyan/20 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                  <span className="text-xs font-black text-white uppercase tracking-[0.3em]">Analyzuji_Data...</span>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      <button onClick={() => setShowManualInput(true)} className="mt-12 flex items-center gap-3 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest active:scale-95">
         <Keyboard className="w-5 h-5" /> Manuální Identifikace
      </button>

      <AnimatePresence>
        {showManualInput && (
          <motion.div {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as any)} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8">
            <div className="w-full max-w-xs space-y-6">
               <h3 className="text-xl font-black text-white uppercase text-center tracking-widest">Zadejte_ID</h3>
               <input 
                 type="text" 
                 autoFocus
                 value={manualId}
                 onChange={(e) => setManualId(e.target.value)}
                 placeholder="NAPŘ. ITEM-01"
                 className="w-full bg-white/5 border border-white/10 p-4 text-white text-center text-xl font-mono uppercase rounded-xl outline-none focus:border-signal-cyan placeholder-white/20" 
               />
               <div className="flex gap-4">
                 <button onClick={() => setShowManualInput(false)} className="flex-1 py-4 text-xs font-bold text-white/40 uppercase hover:text-white transition-colors">Zrušit</button>
                 <button onClick={() => { onScanCode(manualId); setShowManualInput(false); }} className="flex-1 button-primary py-4 text-xs shadow-lg shadow-signal-amber/20">Potvrdit</button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        #qr-reader video { 
            object-fit: cover; 
            width: 100%; 
            height: 100%; 
            border-radius: 1rem;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
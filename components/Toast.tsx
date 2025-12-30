import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Gift, MessageSquare, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'error' | 'gift' | 'message' | 'warning';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  data: ToastData;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ data, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [data.id]);

  const getStyles = () => {
    switch (data.type) {
      case 'success': return { bg: 'bg-[#22c55e] text-black', icon: <CheckCircle className="w-5 h-5" />, label: 'POTVRZENO' };
      case 'error': return { bg: 'bg-signal-hazard text-white', icon: <AlertTriangle className="w-5 h-5" />, label: 'KRITICKÉ' };
      case 'gift': return { bg: 'bg-purple-600 text-white', icon: <Gift className="w-5 h-5" />, label: 'PŘENOS' };
      case 'message': return { bg: 'bg-signal-cyan text-black', icon: <MessageSquare className="w-5 h-5" />, label: 'SIGNÁL' };
      case 'warning': return { bg: 'bg-signal-amber text-black', icon: <AlertTriangle className="w-5 h-5" />, label: 'VAROVÁNÍ' };
      default: return { bg: 'bg-white text-black', icon: <Info className="w-5 h-5" />, label: 'INFO' };
    }
  };

  const style = getStyles();

  return (
    <motion.div
      {...({
        layout: true,
        initial: { opacity: 0, y: -50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.1 } }
      } as any)}
      key={data.id}
      className={`fixed top-4 left-4 right-4 z-[10000] pointer-events-auto shadow-[0_10px_40px_rgba(0,0,0,0.6)] border-l-8 border-black font-mono overflow-hidden ${style.bg} rounded-l-lg mx-auto max-w-sm`}
    >
      <div className="p-4 flex flex-col gap-2 relative">
        <div className="flex items-center justify-between border-b border-black/10 pb-1">
          <div className="flex items-center gap-2">
            {style.icon}
            <span className="text-[10px] font-black tracking-[0.3em]">{style.label}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="opacity-40 active:opacity-100 transition-opacity p-1"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[12px] font-bold uppercase leading-tight py-1 break-words">{data.message}</p>

        <motion.div
          {...({
            initial: { width: "100%" },
            animate: { width: "0%" },
            transition: { duration: 4, ease: "linear" }
          } as any)}
          className="absolute bottom-0 left-0 h-1 bg-black/20"
        />
      </div>
    </motion.div>
  );
};

export default Toast;
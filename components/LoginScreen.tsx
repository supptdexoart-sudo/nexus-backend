
import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { User, AlertCircle } from 'lucide-react';
import * as apiService from '../services/apiService';
import { motion } from 'framer-motion';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [loginError, setLoginError] = useState('');
  // const [isByPass, setIsByPass] = useState(false); // Unused for now

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoginError('');
    try {
      if (credentialResponse.credential) {
        const data = await apiService.loginWithGoogle(credentialResponse.credential);
        onLogin(data.email);
      }
    } catch (error: any) {
      console.error('Login Failed:', error);
      setLoginError(error.message || 'Přihlášení selhalo.');
    }
  };

  const handleGuestLogin = () => {
    onLogin('guest'); // Bypass auth
  };

  return (
    <div className="h-screen w-screen bg-transparent flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-white/20 bg-white/5 mb-6 rotate-45">
            <User className="w-8 h-8 text-white -rotate-45" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-[0.2em] mb-2">Identifikace</h1>
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Vyžadován přístupový klíč</p>
        </div>

        {/* Error Message */}
        {loginError && (
          <div className="mb-6 p-4 bg-red-900/10 border border-red-500/30 flex items-start gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-xs text-red-400 font-bold leading-tight">{loginError}</p>
          </div>
        )}

        {/* Initial Login Option */}
        <div className="bg-zinc-900/50 border border-white/10 p-1">
          <div className="flex justify-center py-6 bg-black">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setLoginError('Google Auth Error')}
              theme="filled_black"
              shape="rectangular"
              width="250"
            />
          </div>
        </div>

        {/* Guest / Dev Options provided via simple text button if desired, or relying on previous bypass logic */}
        <div className="mt-8 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-black px-2 text-zinc-600 tracking-widest">Nebo</span></div>
          </div>

          <button
            onClick={handleGuestLogin}
            className="text-xs text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2 w-full py-3 hover:bg-white/5"
          >
            <User className="w-4 h-4" /> Spustit jako Host (Offline)
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.3em]">
            Nexus Game Companion // Secured
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;

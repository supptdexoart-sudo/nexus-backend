
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertTriangle } from 'lucide-react';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[NEXUS] Taktický uzel aktivní:', reg.scope))
      .catch(err => console.error('[NEXUS] Chyba synchronizace uzlu:', err));
  });
}

const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "";

const root = ReactDOM.createRoot(rootElement);

if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.length < 10) {
    // Error screen if ENV is missing
    root.render(
        <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center text-white">
            <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center border border-red-500/50 mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-widest mb-2">Chyba Konfigurace</h1>
            <p className="text-sm text-zinc-400 font-mono mb-6 max-w-md">
                Aplikace postrádá <strong>VITE_GOOGLE_CLIENT_ID</strong>.<br/>
                Vytvořte soubor <code>.env</code> v kořenovém adresáři a přidejte vaše Google Client ID.
            </p>
            <div className="bg-black p-4 rounded border border-zinc-800 text-xs font-mono text-zinc-500">
                VITE_GOOGLE_CLIENT_ID=vaše-id-z-google-cloud.apps.googleusercontent.com
            </div>
        </div>
    );
} else {
    root.render(
      <React.StrictMode>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <App />
        </GoogleOAuthProvider>
      </React.StrictMode>
    );
}

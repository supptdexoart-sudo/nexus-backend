
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

// --- GLOBAL ERROR TRAP ---
window.onerror = function (msg, url, line, col, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100vw';
  errorDiv.style.height = '100vh';
  errorDiv.style.backgroundColor = '#000000';
  errorDiv.style.color = '#ff0000';
  errorDiv.style.zIndex = '999999';
  errorDiv.style.padding = '20px';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.style.overflow = 'auto';

  // ✅ SECURE - Using textContent instead of innerHTML to prevent XSS
  const errorTitle = document.createElement('h1');
  errorTitle.textContent = 'CRITICAL ERROR';

  const errorMessage = document.createElement('h3');
  errorMessage.textContent = String(msg); // Convert to string to handle Event | string type

  const errorLocation = document.createElement('p');
  errorLocation.textContent = `${url}:${line}:${col}`;

  const errorStack = document.createElement('pre');
  errorStack.textContent = error?.stack || 'No stack';

  errorDiv.appendChild(errorTitle);
  errorDiv.appendChild(errorMessage);
  errorDiv.appendChild(errorLocation);
  errorDiv.appendChild(errorStack);

  document.body.appendChild(errorDiv);
  return false;
};

window.onunhandledrejection = function (event) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50%';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100vw';
  errorDiv.style.height = '50vh';
  errorDiv.style.backgroundColor = '#1a0000';
  errorDiv.style.color = '#ff5555';
  errorDiv.style.zIndex = '999999';
  errorDiv.style.padding = '20px';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.style.borderTop = '2px solid red';
  errorDiv.style.overflow = 'auto';

  // ✅ SECURE - Using textContent instead of innerHTML to prevent XSS
  const errorTitle = document.createElement('h1');
  errorTitle.textContent = 'UNHANDLED PROMISE REJECTION';

  const errorStack = document.createElement('pre');
  errorStack.textContent = event.reason?.stack || event.reason;

  errorDiv.appendChild(errorTitle);
  errorDiv.appendChild(errorStack);

  document.body.appendChild(errorDiv);
};

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
        Aplikace postrádá <strong>VITE_GOOGLE_CLIENT_ID</strong>.<br />
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

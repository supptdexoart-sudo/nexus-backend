
import { GameEvent } from "../types";

// Při vývoji (import.meta.env.DEV) použijeme relativní cestu '/api', kterou Vite Proxy přesměruje na localhost:3001
// V produkci použijeme plnou URL na Render
const BASE_API_URL = (import.meta as any).env.DEV
  ? '/api'
  : 'https://nexus-backend-m492.onrender.com/api';

const ADMIN_TOKEN_KEY = 'nexus_admin_token';

// Fix TS error accessing env in Vite
const CLIENT_ID_FROM_ENV = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

export interface FriendRequest {
  fromEmail: string;
  timestamp: number;
}

const fetchData = async <T>(url: string, options: RequestInit = {}, silent: boolean = false): Promise<T> => {
  if (!navigator.onLine) throw new Error("OFFLINE_MODE");
  try {
    const adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    const currentUser = localStorage.getItem('nexus_current_user'); // Získání aktuálního uživatele

    const headers = new Headers(options.headers || {});

    // Autentizační hlavičky
    if (adminToken) headers.set('x-admin-key', adminToken);
    if (currentUser) headers.set('x-user-email', currentUser); // Identifikace pro backend

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      // Zkusíme přečíst JSON chybu, pokud to jde, jinak text statusu
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (!silent) console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
};

export const checkHealth = async (): Promise<boolean> => {
  if (!navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BASE_API_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch { return false; }
};

export const downloadBackup = async (): Promise<void> => {
  if (!navigator.onLine) throw new Error("Nelze zálohovat v offline režimu.");
  const adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  const response = await fetch(`${BASE_API_URL}/admin/backup`, {
    method: 'GET',
    headers: { 'x-admin-key': adminToken || '' }
  });
  if (!response.ok) throw new Error('Chyba při stahování zálohy (Access Denied?)');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexus_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const purgeItemFromAllUsers = async (cardId: string): Promise<any> => {
  return fetchData(`${BASE_API_URL}/admin/purge/${encodeURIComponent(cardId)}`, { method: 'DELETE' });
};

// UPDATED: Validate local items against Master DB using ID and TITLE
export const validateLocalItems = async (items: { id: string, title: string }[]): Promise<{ validIds: string[] }> => {
  return fetchData(`${BASE_API_URL}/inventory/validate`, {
    method: 'POST',
    body: JSON.stringify({ items })
  });
};

export const adminAction = async (roomId: string, targetName: string, actionType: 'damage' | 'heal' | 'kick' | 'broadcast', value: any): Promise<void> => {
  return fetchData(`${BASE_API_URL}/admin/action`, {
    method: 'POST',
    body: JSON.stringify({ roomId, targetName, actionType, value })
  });
};

export const transferCard = async (fromEmail: string, toEmail: string, itemId: string): Promise<any> => {
  return fetchData(`${BASE_API_URL}/inventory/transfer`, { method: 'POST', body: JSON.stringify({ fromEmail, toEmail, itemId }) });
};

export const swapItems = async (player1Email: string, player2Email: string, item1Id: string, item2Id: string): Promise<any> => {
  return fetchData(`${BASE_API_URL}/inventory/swap`, { method: 'POST', body: JSON.stringify({ player1Email, player2Email, item1Id, item2Id }) });
};

export const startGame = async (roomId: string): Promise<void> => { await fetchData(`${BASE_API_URL}/rooms/${roomId}/start-game`, { method: 'POST' }); };
export const acknowledgeRoundEnd = async (roomId: string, userName: string): Promise<void> => { await fetchData(`${BASE_API_URL}/rooms/${roomId}/acknowledge-round`, { method: 'POST', body: JSON.stringify({ userName }) }); };

// REMOVED: loginUser (Legacy password auth)

export const loginWithGoogle = async (credential: string): Promise<{ email: string; isNewUser: boolean }> => {
  const url = `${BASE_API_URL}/auth/google`;
  // Posíláme i Client ID z frontendu jako fallback pro backend
  return fetchData<{ email: string; isNewUser: boolean }>(url, {
    method: 'POST',
    body: JSON.stringify({ credential, clientId: CLIENT_ID_FROM_ENV })
  });
};

export const getInventory = async (userEmail: string): Promise<GameEvent[]> => fetchData<GameEvent[]>(`${BASE_API_URL}/inventory/${userEmail}`);
export const saveCard = async (userEmail: string, event: GameEvent): Promise<GameEvent> => fetchData<GameEvent>(`${BASE_API_URL}/inventory/${userEmail}`, { method: 'POST', body: JSON.stringify(event) });
export const deleteCard = async (userEmail: string, cardId: string): Promise<void> => fetchData<void>(`${BASE_API_URL}/inventory/${userEmail}/${encodeURIComponent(cardId)}`, { method: 'DELETE' });
export const getMasterCatalog = async (userEmail?: string): Promise<GameEvent[]> => {
  const targetEmail = userEmail || 'zbynekbal97@gmail.com';
  return fetchData<GameEvent[]>(`${BASE_API_URL}/inventory/${targetEmail}`);
};
export const getCardById = async (userEmail: string, cardId: string): Promise<GameEvent | null> => { try { return await fetchData<GameEvent>(`${BASE_API_URL}/inventory/${userEmail}/${encodeURIComponent(cardId)}`, undefined, true); } catch { return null; } };
export const getRoomStatus = async (roomId: string): Promise<any> => fetchData(`${BASE_API_URL}/rooms/${roomId}/status`);
export const updatePlayerStatus = async (roomId: string, userName: string, hp: number): Promise<void> => { fetchData(`${BASE_API_URL}/rooms/${roomId}/status`, { method: 'POST', body: JSON.stringify({ userName, hp }) }, true).catch(() => { }); };
export const nextTurn = async (roomId: string): Promise<any> => fetchData(`${BASE_API_URL}/rooms/${roomId}/next-turn`, { method: 'POST' });
export const leaveRoom = async (roomId: string, userName: string): Promise<void> => { fetchData(`${BASE_API_URL}/rooms/${roomId}/leave`, { method: 'POST', body: JSON.stringify({ userName }) }, true).catch(() => { }); };
export const sendMessage = async (roomId: string, sender: string, text: string): Promise<any> => fetchData(`${BASE_API_URL}/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify({ sender, text }) }, true);
export const getRoomMessages = async (roomId: string): Promise<any[]> => fetchData<any[]>(`${BASE_API_URL}/rooms/${roomId}/messages`);
export const createRoom = async (roomId: string, hostName: string, hostEmail?: string, password?: string): Promise<any> => fetchData(`${BASE_API_URL}/rooms`, { method: 'POST', body: JSON.stringify({ roomId, hostName, hostEmail, password }) });
export const joinRoom = async (roomId: string, userName: string, hp?: number, password?: string, email?: string): Promise<any> => fetchData(`${BASE_API_URL}/rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify({ userName, email, hp: hp || 100, password }) });
export const toggleReady = async (roomId: string, userName: string, isReady: boolean): Promise<any> => fetchData(`${BASE_API_URL}/rooms/${roomId}/ready`, { method: 'POST', body: JSON.stringify({ userName, isReady }) }, true);
export const setRoomEncounter = async (roomId: string, encounter: GameEvent | null): Promise<void> => { await fetchData(`${BASE_API_URL}/rooms/${roomId}/encounter`, { method: 'POST', body: JSON.stringify({ encounter }) }, true).catch(() => { }); };

export const attackRaidBoss = async (roomId: string, damage: number, userName: string): Promise<any> => {
  return fetchData(`${BASE_API_URL}/rooms/${roomId}/attack-boss`, { method: 'POST', body: JSON.stringify({ damage, userName }) });
};

export const endRaid = async (roomId: string): Promise<any> => {
  return fetchData(`${BASE_API_URL}/rooms/${roomId}/end-raid`, { method: 'POST' });
};

// CHARACTER API
export const getCharacters = async (adminEmail: string): Promise<any[]> => fetchData<any[]>(`${BASE_API_URL}/characters/${adminEmail}`);
export const getCharacterById = async (characterId: string): Promise<any | null> => { try { return await fetchData<any>(`${BASE_API_URL}/characters/by-id/${encodeURIComponent(characterId)}`, undefined, true); } catch { return null; } };
export const saveCharacter = async (adminEmail: string, character: any): Promise<any> => fetchData<any>(`${BASE_API_URL}/characters/${adminEmail}`, { method: 'POST', body: JSON.stringify(character) });
export const deleteCharacter = async (adminEmail: string, characterId: string): Promise<void> => fetchData<void>(`${BASE_API_URL}/characters/${adminEmail}/${encodeURIComponent(characterId)}`, { method: 'DELETE' });

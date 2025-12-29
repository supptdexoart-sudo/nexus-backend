
import { GameEvent } from "../types";

// Při vývoji (import.meta.env.DEV) použijeme relativní cestu '/api', kterou Vite Proxy přesměruje na localhost:3001
// V produkci použijeme plnou URL na Render
const BASE_API_URL = (import.meta as any).env.DEV
  ? '/api'
  : 'https://nexus-backend-m492.onrender.com/api';

// Fix TS error accessing env in Vite
const CLIENT_ID_FROM_ENV = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

export interface FriendRequest {
  fromEmail: string;
  timestamp: number;
}

const fetchData = async <T>(url: string, options: RequestInit = {}, silent: boolean = false): Promise<T> => {
  if (!navigator.onLine) throw new Error("OFFLINE_MODE");
  try {
    const currentUser = localStorage.getItem('nexus_current_user'); // Získání aktuálního uživatele

    const headers = new Headers(options.headers || {});

    // Autentizační hlavičky
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

// UPDATED: Validate local items against Master DB using ID and TITLE
export const validateLocalItems = async (items: { id: string, title: string }[]): Promise<{ validIds: string[] }> => {
  return fetchData(`${BASE_API_URL}/inventory/validate`, {
    method: 'POST',
    body: JSON.stringify({ items })
  });
};

export const transferCard = async (fromEmail: string, toEmail: string, itemId: string): Promise<any> => {
  return fetchData(`${BASE_API_URL}/inventory/transfer`, { method: 'POST', body: JSON.stringify({ fromEmail, toEmail, itemId }) });
};

export const swapItems = async (player1Email: string, player2Email: string, item1Id: string, item2Id: string): Promise<any> => {
  return fetchData(`${BASE_API_URL}/inventory/swap`, { method: 'POST', body: JSON.stringify({ player1Email, player2Email, item1Id, item2Id }) });
};

// TRADE V2
export const initTrade = async (roomId: string, initiatorEmail: string, initiatorNick: string, targetNick: string, item: any) =>
  fetchData<{ success: true, tradeId: string }>(`${BASE_API_URL}/trade/init`, { method: 'POST', body: JSON.stringify({ roomId, initiatorEmail, initiatorNick, targetNick, item }) });

export const cancelTrade = async (roomId: string, tradeId: string) =>
  fetchData(`${BASE_API_URL}/trade/cancel`, { method: 'POST', body: JSON.stringify({ roomId, tradeId }) });

export const updateTrade = async (roomId: string, tradeId: string, userEmail: string, item: any) =>
  fetchData(`${BASE_API_URL}/trade/update`, { method: 'POST', body: JSON.stringify({ roomId, tradeId, userEmail, item }) });

export const confirmTrade = async (roomId: string, tradeId: string, userEmail: string, isConfirmed: boolean) =>
  fetchData<{ success: true, status: string }>(`${BASE_API_URL}/trade/confirm`, { method: 'POST', body: JSON.stringify({ roomId, tradeId, userEmail, isConfirmed }) });

export const adminAction = async (roomId: string, targetName: string, actionType: string, value: any) =>
  fetchData(`${BASE_API_URL}/admin/action`, { method: 'POST', body: JSON.stringify({ roomId, targetName, actionType, value }) });

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
  if (!userEmail) throw new Error("Uživatel není přihlášen.");
  return fetchData<GameEvent[]>(`${BASE_API_URL}/inventory/${userEmail}`);
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
export const triggerSectorEvent = async (roomId: string, type: string, initiator: string, durationMinutes: number): Promise<any> => fetchData(`${BASE_API_URL}/rooms/${roomId}/sector-event`, { method: 'POST', body: JSON.stringify({ type, initiator, durationMinutes }) });

export const attackRaidBoss = async (roomId: string, damage: number, userName: string): Promise<any> => {
  return fetchData(`${BASE_API_URL}/rooms/${roomId}/attack-boss`, { method: 'POST', body: JSON.stringify({ damage, userName }) });
};

export const endRaid = async (roomId: string): Promise<any> => {
  return fetchData(`${BASE_API_URL}/rooms/${roomId}/end-raid`, { method: 'POST' });
};

// CHARACTER API
export const getCharacterById = async (characterId: string): Promise<any | null> => { try { return await fetchData<any>(`${BASE_API_URL}/characters/by-id/${encodeURIComponent(characterId)}`, undefined, true); } catch { return null; } };

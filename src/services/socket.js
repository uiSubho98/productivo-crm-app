/**
 * Socket.io client for real-time WhatsApp message delivery.
 *
 * Connects to the same host as the REST API (derived from API_BASE_URL).
 * Auth: Bearer token via both `auth.token` and `query.token` for broad compatibility
 * with server configs that read either.
 *
 * Event names handled (covers common server conventions — the first one the
 * server actually emits wins, others stay no-op):
 *   - `whatsapp:inbound`  / `whatsapp:message`
 *   - `message:new`       / `inbound_message`
 *
 * Payload shape expected: a message object matching conversationStore.appendInboundMessage
 * (phone, timestamp, type, content, _id/waMessageId, direction).
 */
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './api';
import useConversationStore from '../store/conversationStore';

let socket = null;
let connectPromise = null;

function deriveSocketOrigin() {
  // Strip API path suffix (e.g. "/api/v1") to get the server root
  try {
    const url = new URL(API_BASE_URL);
    return `${url.protocol}//${url.host}`;
  } catch {
    // API_BASE_URL is a relative path (dev proxy) or malformed — socket won't connect,
    // but this lets callers no-op gracefully.
    return null;
  }
}

export async function connectSocket() {
  if (socket?.connected || connectPromise) return socket;
  const origin = deriveSocketOrigin();
  if (!origin) return null;

  const token = await SecureStore.getItemAsync('token').catch(() => null);
  if (!token) return null;

  connectPromise = new Promise((resolve) => {
    socket = io(origin, {
      transports: ['websocket'],
      auth: { token },
      query: { token },
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
      timeout: 8000,
    });

    const onInbound = (msg) => {
      try {
        if (!msg || !msg.phone) return;
        useConversationStore.getState().appendInboundMessage(msg);
      } catch {}
    };

    const eventNames = [
      'whatsapp:inbound',
      'whatsapp:message',
      'message:new',
      'inbound_message',
    ];
    for (const name of eventNames) socket.on(name, onInbound);

    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', () => resolve(null));
    // If the server never accepts, resolve after timeout to unblock callers
    setTimeout(() => resolve(socket), 8500);
  });

  await connectPromise;
  connectPromise = null;
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    try { socket.removeAllListeners(); } catch {}
    try { socket.disconnect(); } catch {}
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

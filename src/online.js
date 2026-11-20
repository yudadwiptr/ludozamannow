// ============================================================================
// LudoZ — Dual-Transport Real-Time Online Multiplayer
//   • Local / Node Server: Built-in SSE + REST (/api/rooms/*)
//   • Vercel / Static CDN: Automatic WebRTC Peer-to-Peer (PeerJS) across internet!
// ============================================================================

import { NET_CONFIG } from './net-config.js';

const PEER_PREFIX = 'ludoz-v1-';
const HOST_OPEN_TIMEOUT = 15000;
const JOIN_TIMEOUT = 25000; // mobile networks + TURN negotiation can be slow

const DEFAULT_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

let iceCache = null;
/** STUN + optional TURN (needed for phones on 4G/5G carrier NAT). */
async function getIceServers() {
  if (iceCache) return iceCache;
  const servers = [...DEFAULT_ICE, ...(NET_CONFIG.turn || [])];
  if (NET_CONFIG.meteredApp && NET_CONFIG.meteredApiKey) {
    try {
      const url = `https://${NET_CONFIG.meteredApp}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(NET_CONFIG.meteredApiKey)}`;
      const res = await fetch(url);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) servers.push(...list);
      }
    } catch {
      /* TURN fetch failed — fall back to STUN only */
    }
  }
  iceCache = servers;
  return servers;
}

export function hasTurnConfigured() {
  return Boolean((NET_CONFIG.meteredApp && NET_CONFIG.meteredApiKey) || NET_CONFIG.turn?.length);
}

async function peerOptions() {
  return { debug: 0, config: { iceServers: await getIceServers() } };
}

/** Keep a PeerJS peer registered on the signaling server (phones drop it when backgrounded). */
function keepPeerAlive(peer) {
  const revive = () => {
    if (peer.destroyed || !peer.disconnected) return;
    try { peer.reconnect(); } catch { /* will retry on next trigger */ }
  };
  peer.on('disconnected', () => setTimeout(revive, 800));
  const onVisible = () => { if (document.visibilityState === 'visible') revive(); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', revive);
  peer.on('close', () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', revive);
  });
}

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'c_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

let peerJsPromise = null;
function loadPeerJS() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (peerJsPromise) return peerJsPromise;

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error('PeerJS unavailable')));
    s.onerror = () => reject(new Error('Gagal memuat library PeerJS'));
    document.head.appendChild(s);
  });

  peerJsPromise = loadScript('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js')
    .catch(() => loadScript('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'));
  return peerJsPromise;
}

export class OnlineClient {
  constructor({ onRoomUpdate, onMatchStart, onGameAction, onConnectionChange, onRoomClosed }) {
    this.onRoomUpdate = onRoomUpdate;
    this.onRoomClosed = onRoomClosed;
    this.onMatchStart = onMatchStart;
    this.onGameAction = onGameAction;
    this.onConnectionChange = onConnectionChange;

    this.transport = 'auto'; // 'sse' | 'webrtc'
    this.roomCode = null;
    this.clientId = null;
    this.seatIndex = null;
    this.room = null;

    // SSE state
    this.es = null;

    // WebRTC P2P state
    this.peer = null;
    this.hostConn = null; // Guest -> Host connection
    this.guestConns = new Map(); // Host: clientId -> DataConnection
    this._p2pSeq = 0;
  }

  get isConnected() {
    return Boolean(this.roomCode && this.clientId);
  }

  get isHost() {
    return Boolean(this.room && this.clientId && this.room.hostId === this.clientId);
  }

  async getServerInfo() {
    try {
      const res = await fetch('/api/info', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        this.transport = 'sse';
        return { ...data, transport: 'sse' };
      }
    } catch {
      // Static hosting (e.g. Vercel) -> use WebRTC P2P!
    }
    this.transport = 'webrtc';
    return { lanUrls: [], transport: 'webrtc' };
  }

  async _ensureTransport() {
    if (this.transport === 'auto') {
      await this.getServerInfo();
    }
    return this.transport;
  }

  // --------------------------------------------------------------------------
  // Create & Join Room (Auto-Selects SSE Server or WebRTC P2P)
  // --------------------------------------------------------------------------

  async createRoom({ name, mode, theme }) {
    const modeTransport = await this._ensureTransport();
    if (modeTransport === 'sse') {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mode, theme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat room');
      this._attachSSESession(data);
      return data;
    }
    return this._createWebRTCRoom({ name, mode, theme });
  }

  async joinRoom({ code, name }) {
    const modeTransport = await this._ensureTransport();
    const cleanCode = String(code || '').trim().toUpperCase();
    if (modeTransport === 'sse') {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal bergabung ke room');
      this._attachSSESession(data);
      return data;
    }
    return this._joinWebRTCRoom({ code: cleanCode, name });
  }

  // --------------------------------------------------------------------------
  // Transport A: Built-in Local SSE + REST Server
  // --------------------------------------------------------------------------

  _attachSSESession(data) {
    this.disconnect(false);
    this.room = data.room;
    this.roomCode = data.room.code;
    this.clientId = data.clientId;
    this.seatIndex = data.seatIndex;

    const url = `/api/rooms/${this.roomCode}/events?clientId=${encodeURIComponent(this.clientId)}`;
    this.es = new EventSource(url);

    this.es.addEventListener('open', () => this.onConnectionChange?.(true));
    this.es.addEventListener('error', () => this.onConnectionChange?.(false));

    this.es.addEventListener('room_update', (ev) => {
      try {
        this.room = JSON.parse(ev.data);
        this.onRoomUpdate?.(this.room);
      } catch {}
    });

    this.es.addEventListener('match_start', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.room = msg.room;
        this.onMatchStart?.(msg);
      } catch {}
    });

    this.es.addEventListener('game_action', (ev) => {
      try {
        this.onGameAction?.(JSON.parse(ev.data));
      } catch {}
    });

    this.es.addEventListener('room_closed', (ev) => {
      let reason = 'host_left';
      try { reason = JSON.parse(ev.data).reason || reason; } catch {}
      this._handleRoomClosed(reason);
    });
  }

  /** Guest side: the host left -> drop the session and tell the app. */
  _handleRoomClosed(reason) {
    if (!this.room || this.isHost) return;
    this.disconnect(false);
    this.onRoomClosed?.(reason);
  }

  // --------------------------------------------------------------------------
  // Transport B: Serverless Global Internet WebRTC P2P (PeerJS for Vercel!)
  // --------------------------------------------------------------------------

  async _createWebRTCRoom({ name, mode, theme }) {
    await this.disconnect(false);
    const Peer = await loadPeerJS();
    const code = randomRoomCode();
    const clientId = randomId();
    const hostPeerId = `${PEER_PREFIX}${code}`;
    const playerName = String(name || 'Host').trim().slice(0, 18) || 'Host';

    const opts = await peerOptions();
    await new Promise((resolve, reject) => {
      const peer = new Peer(hostPeerId, opts);
      this.peer = peer;
      keepPeerAlive(peer);
      const timer = setTimeout(() => reject(new Error('Timeout menyambung ke server P2P. Cek internet lalu coba lagi.')), HOST_OPEN_TIMEOUT);

      peer.on('open', () => {
        clearTimeout(timer);
        resolve();
      });
      peer.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Koneksi P2P gagal (${err.type || err.message})`));
      });
    });

    this.roomCode = code;
    this.clientId = clientId;
    this.seatIndex = 0;
    this._p2pSeq = 0;
    this.guestConns = new Map();
    this.room = {
      code,
      mode: mode === 'classic' ? 'classic' : 'blitz',
      theme: theme === 'neo' ? 'neo' : 'nusantara',
      started: false,
      matchSeed: null,
      hostId: clientId,
      seats: [
        { seatIndex: 0, type: 'human', clientId, name: playerName, connected: true },
        { seatIndex: 1, type: 'ai', clientId: null, name: null, connected: false },
        { seatIndex: 2, type: 'ai', clientId: null, name: null, connected: false },
        { seatIndex: 3, type: 'ai', clientId: null, name: null, connected: false },
      ],
    };

    // Accept incoming Guest DataChannels
    this.peer.on('connection', (conn) => {
      let boundClientId = null;

      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.cmd === 'join') {
          if (this.room.started) {
            conn.send({ event: 'join_error', error: 'Pertandingan di room ini sudah dimulai!' });
            return;
          }
          const freeIdx = this.room.seats.findIndex((s) => !s.clientId);
          if (freeIdx === -1) {
            conn.send({ event: 'join_error', error: 'Room sudah penuh (4/4 pemain)!' });
            return;
          }
          boundClientId = randomId();
          const guestName = String(msg.name || 'Pemain').trim().slice(0, 18) || 'Pemain';
          this.room.seats[freeIdx] = {
            seatIndex: freeIdx,
            type: 'human',
            clientId: boundClientId,
            name: guestName,
            connected: true,
          };
          this.guestConns.set(boundClientId, conn);
          conn.send({
            event: 'joined',
            room: this.room,
            clientId: boundClientId,
            seatIndex: freeIdx,
          });
          this._p2pBroadcast('room_update', this.room);
        } else if (msg.cmd === 'action' && boundClientId) {
          this._p2pRelayAction(boundClientId, msg.type, msg.payload || {});
        } else if (msg.cmd === 'leave' && boundClientId) {
          this._p2pRemoveGuest(boundClientId);
        }
      });

      conn.on('close', () => {
        if (boundClientId) this._p2pRemoveGuest(boundClientId);
      });
    });

    this.onConnectionChange?.(true);
    this.onRoomUpdate?.(this.room);
    return { room: this.room, clientId, seatIndex: 0 };
  }

  async _joinWebRTCRoom({ code, name }) {
    await this.disconnect(false);
    const Peer = await loadPeerJS();
    const hostPeerId = `${PEER_PREFIX}${code}`;
    const opts = await peerOptions();

    return new Promise((resolve, reject) => {
      const peer = new Peer(undefined, opts);
      this.peer = peer;
      keepPeerAlive(peer);
      let settled = false;
      let reachedHost = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.disconnect(false);
          reject(new Error(reachedHost
            ? `Room "${code}" ketemu, tapi koneksi ke host gagal. Kalau pakai data seluler, coba Wi-Fi atau minta host tetap membuka game.`
            : `Room "${code}" tidak ditemukan atau host sedang offline. Pastikan host tetap membuka game.`));
        }
      }, JOIN_TIMEOUT);

      peer.on('open', () => {
        const conn = peer.connect(hostPeerId, { reliable: true });
        this.hostConn = conn;
        // PeerJS reports ICE progress: "checking" means the host answered (room exists)
        conn.on('iceStateChanged', (state) => {
          if (state === 'checking' || state === 'connected') reachedHost = true;
        });

        conn.on('open', () => {
          conn.send({ cmd: 'join', name });
        });

        conn.on('data', (msg) => {
          if (!msg || typeof msg !== 'object') return;
          if (msg.event === 'join_error' && !settled) {
            settled = true;
            clearTimeout(timer);
            this.disconnect(false);
            reject(new Error(msg.error || 'Gagal gabung room'));
          } else if (msg.event === 'joined' && !settled) {
            settled = true;
            clearTimeout(timer);
            this.room = msg.room;
            this.roomCode = msg.room.code;
            this.clientId = msg.clientId;
            this.seatIndex = msg.seatIndex;
            this.onConnectionChange?.(true);
            this.onRoomUpdate?.(this.room);
            resolve({ room: msg.room, clientId: msg.clientId, seatIndex: msg.seatIndex });
          } else if (msg.event === 'room_update') {
            this.room = msg.payload;
            this.onRoomUpdate?.(this.room);
          } else if (msg.event === 'match_start') {
            this.room = msg.payload.room;
            this.onMatchStart?.(msg.payload);
          } else if (msg.event === 'game_action') {
            this.onGameAction?.(msg.payload);
          } else if (msg.event === 'room_closed') {
            this._handleRoomClosed(msg.payload?.reason || 'host_left');
          }
        });

        conn.on('close', () => {
          // In P2P the host *is* the room: losing it ends the session
          if (settled && this.hostConn === conn) {
            this._handleRoomClosed('host_disconnected');
            return;
          }
          this.onConnectionChange?.(false);
        });

        conn.on('error', () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(new Error(`Tidak bisa terhubung ke Room "${code}".`));
          }
        });
      });

      peer.on('error', (err) => {
        if (settled) return;
        // Transient signaling hiccups on mobile: keep waiting for the timeout
        if (err.type === 'network' || err.type === 'disconnected' || err.type === 'server-error') return;
        settled = true;
        clearTimeout(timer);
        this.disconnect(false);
        reject(new Error(err.type === 'peer-unavailable'
          ? `Room "${code}" tidak ditemukan. Cek lagi kodenya, dan pastikan host masih membuka game.`
          : `Gagal terhubung ke room "${code}" (${err.type || 'offline'}).`));
      });
    });
  }

  _p2pRemoveGuest(clientId) {
    this.guestConns.delete(clientId);
    if (!this.room) return;
    const idx = this.room.seats.findIndex((s) => s.clientId === clientId);
    if (idx !== -1) {
      const prevName = this.room.seats[idx].name || `Pemain ${idx + 1}`;
      this.room.seats[idx] = { seatIndex: idx, type: 'ai', clientId: null, name: null, connected: false };
      this._p2pBroadcast('room_update', this.room);
      if (this.room.started) {
        this._p2pSeq += 1;
        this._p2pBroadcast('game_action', {
          seq: this._p2pSeq,
          senderSeat: idx,
          isHost: true,
          type: 'player_to_bot',
          payload: { seatIndex: idx, name: prevName },
        });
      }
    }
  }

  _p2pBroadcast(event, payload) {
    for (const conn of this.guestConns.values()) {
      try {
        if (conn.open) conn.send({ event, payload });
      } catch {}
    }
    if (event === 'room_update') this.onRoomUpdate?.(payload);
    if (event === 'match_start') this.onMatchStart?.(payload);
    if (event === 'game_action') this.onGameAction?.(payload);
  }

  _p2pRelayAction(senderClientId, type, payload) {
    if (!this.room) return;
    const senderSeat = this.room.seats.findIndex((s) => s.clientId === senderClientId);
    if (senderSeat === -1) return;
    this._p2pSeq += 1;
    this._p2pBroadcast('game_action', {
      seq: this._p2pSeq,
      senderSeat,
      isHost: senderClientId === this.room.hostId,
      type,
      payload,
    });
  }

  // --------------------------------------------------------------------------
  // Shared Room Config, Start, Action & Disconnect API
  // --------------------------------------------------------------------------

  async updateConfig(patch) {
    if (!this.isConnected || !this.isHost) return;
    if (this.transport === 'sse') {
      await fetch(`/api/rooms/${this.roomCode}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: this.clientId, ...patch }),
      });
      return;
    }
    // WebRTC Host local config update + broadcast
    if (patch.mode === 'blitz' || patch.mode === 'classic') this.room.mode = patch.mode;
    if (patch.theme === 'nusantara' || patch.theme === 'neo') this.room.theme = patch.theme;
    if (typeof patch.toggleSeat === 'number' && patch.toggleSeat >= 0 && patch.toggleSeat < 4) {
      const seat = this.room.seats[patch.toggleSeat];
      if (!seat.clientId) seat.type = seat.type === 'ai' ? 'off' : 'ai';
    }
    this._p2pBroadcast('room_update', this.room);
  }

  async startMatch() {
    if (!this.isConnected || !this.isHost) return;
    if (this.transport === 'sse') {
      const res = await fetch(`/api/rooms/${this.roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: this.clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memulai match online');
      return data;
    }
    const activeCount = this.room.seats.filter((s) => s.type !== 'off').length;
    if (activeCount < 2) throw new Error('Minimal 2 pemain aktif!');
    this.room.started = true;
    this._p2pSeq = 0;
    this.room.matchSeed = Math.floor(Math.random() * 2_000_000_000) + 1;
    this._p2pBroadcast('match_start', { room: this.room, matchSeed: this.room.matchSeed });
    return { ok: true, matchSeed: this.room.matchSeed };
  }

  async sendAction(type, payload = {}) {
    if (!this.isConnected) return;
    if (this.transport === 'sse') {
      await fetch(`/api/rooms/${this.roomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: this.clientId, type, payload }),
      });
      return;
    }
    if (this.isHost) {
      this._p2pRelayAction(this.clientId, type, payload);
    } else if (this.hostConn?.open) {
      this.hostConn.send({ cmd: 'action', type, payload });
    }
  }

  /** Best-effort leave while the page is unloading (closes the room if we are the host). */
  leaveOnUnload() {
    if (!this.roomCode || !this.clientId) return;
    if (this.transport === 'sse') {
      try {
        const blob = new Blob([JSON.stringify({ clientId: this.clientId })], { type: 'application/json' });
        navigator.sendBeacon(`/api/rooms/${this.roomCode}/leave`, blob);
      } catch {}
    } else if (this.isHost) {
      this._p2pBroadcast('room_closed', { code: this.roomCode, reason: 'host_left' });
    }
  }

  async disconnect(notifyServer = true) {
    if (notifyServer && this.roomCode && this.clientId) {
      if (this.transport === 'sse') {
        try {
          await fetch(`/api/rooms/${this.roomCode}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: this.clientId }),
          });
        } catch {}
      } else if (this.isHost && this.guestConns.size > 0) {
        // P2P host leaving: tell every guest the room is closed
        this._p2pBroadcast('room_closed', { code: this.roomCode, reason: 'host_left' });
        await new Promise((r) => setTimeout(r, 150)); // let the message flush before closing
      } else if (this.hostConn?.open) {
        try {
          this.hostConn.send({ cmd: 'leave' });
        } catch {}
      }
    }
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    if (this.hostConn) {
      const conn = this.hostConn;
      this.hostConn = null;
      try { conn.close(); } catch {}
    }
    for (const c of this.guestConns.values()) {
      try { c.close(); } catch {}
    }
    this.guestConns.clear();
    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }
    this.roomCode = null;
    this.clientId = null;
    this.seatIndex = null;
    this.room = null;
    this.onConnectionChange?.(false);
  }
}

// ============================================================================
// LUDO OVERDRIVE — Real-Time Online Multiplayer Client (SSE + REST)
// ============================================================================

export class OnlineClient {
  constructor({ onRoomUpdate, onMatchStart, onGameAction, onConnectionChange }) {
    this.onRoomUpdate = onRoomUpdate;
    this.onMatchStart = onMatchStart;
    this.onGameAction = onGameAction;
    this.onConnectionChange = onConnectionChange;

    this.roomCode = null;
    this.clientId = null;
    this.seatIndex = null;
    this.room = null;
    this.es = null;
  }

  get isConnected() {
    return Boolean(this.roomCode && this.clientId);
  }

  get isHost() {
    return Boolean(this.room && this.clientId && this.room.hostId === this.clientId);
  }

  async getServerInfo() {
    try {
      const res = await fetch('/api/info');
      if (!res.ok) return { lanUrls: [] };
      return await res.json();
    } catch {
      return { lanUrls: [] };
    }
  }

  async createRoom({ name, mode, theme }) {
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mode, theme }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat room');
    this._attachSession(data);
    return data;
  }

  async joinRoom({ code, name }) {
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal bergabung ke room');
    this._attachSession(data);
    return data;
  }

  _attachSession(data) {
    this.disconnect(false);
    this.room = data.room;
    this.roomCode = data.room.code;
    this.clientId = data.clientId;
    this.seatIndex = data.seatIndex;

    const url = `/api/rooms/${this.roomCode}/events?clientId=${encodeURIComponent(this.clientId)}`;
    this.es = new EventSource(url);

    this.es.addEventListener('open', () => {
      if (this.onConnectionChange) this.onConnectionChange(true);
    });

    this.es.addEventListener('error', () => {
      if (this.onConnectionChange) this.onConnectionChange(false);
    });

    this.es.addEventListener('room_update', (ev) => {
      try {
        this.room = JSON.parse(ev.data);
        if (this.onRoomUpdate) this.onRoomUpdate(this.room);
      } catch {
        // Ignore malformed frame
      }
    });

    this.es.addEventListener('match_start', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.room = msg.room;
        if (this.onMatchStart) this.onMatchStart(msg);
      } catch {
        // Ignore
      }
    });

    this.es.addEventListener('game_action', (ev) => {
      try {
        const action = JSON.parse(ev.data);
        if (this.onGameAction) this.onGameAction(action);
      } catch {
        // Ignore
      }
    });
  }

  async updateConfig(patch) {
    if (!this.isConnected) return;
    await fetch(`/api/rooms/${this.roomCode}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: this.clientId, ...patch }),
    });
  }

  async startMatch() {
    if (!this.isConnected) return;
    const res = await fetch(`/api/rooms/${this.roomCode}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: this.clientId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memulai match online');
    return data;
  }

  async sendAction(type, payload = {}) {
    if (!this.isConnected) return;
    await fetch(`/api/rooms/${this.roomCode}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.clientId,
        type,
        payload,
      }),
    });
  }

  async disconnect(notifyServer = true) {
    if (notifyServer && this.roomCode && this.clientId) {
      try {
        await fetch(`/api/rooms/${this.roomCode}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: this.clientId }),
        });
      } catch {
        // Ignore network errors on leave
      }
    }
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    this.roomCode = null;
    this.clientId = null;
    this.seatIndex = null;
    this.room = null;
    if (this.onConnectionChange) this.onConnectionChange(false);
  }
}

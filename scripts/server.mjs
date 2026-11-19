// ============================================================================
// LudoZ — Local Static Server + Real-Time LAN/Local Multiplayer (SSE + REST)
// ============================================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), '..');
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

const rooms = new Map();

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? randomRoomCode() : code;
}

function getLanUrls() {
  const nets = os.networkInterfaces();
  const urls = [];
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${PORT}`);
      }
    }
  }
  return urls;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serializeRoom(room) {
  return {
    code: room.code,
    mode: room.mode,
    theme: room.theme,
    started: room.started,
    matchSeed: room.matchSeed,
    hostId: room.hostId,
    seats: room.seats.map((s, idx) => ({
      seatIndex: idx,
      type: s.type,
      clientId: s.clientId || null,
      name: s.name || null,
      connected: s.clientId ? room.clients.has(s.clientId) : false,
    })),
  };
}

function broadcast(room, eventName, payload) {
  const frame = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of room.clients.values()) {
    try {
      res.write(frame);
    } catch {
      // Ignore broken pipes
    }
  }
}

// Host left (or never came back) -> close the room for everyone
function closeRoom(code, room, reason) {
  clearTimeout(room.hostGraceTimer);
  broadcast(room, 'room_closed', { code, reason });
  for (const res of room.clients.values()) {
    try { res.end(); } catch { /* already closed */ }
  }
  room.clients.clear();
  rooms.delete(code);
}

setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (room.clients.size === 0 && room.lastActivity < cutoff) {
      rooms.delete(code);
    }
  }
}, 60_000);

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  if (req.method === 'GET' && pathname === '/api/info') {
    return sendJson(res, 200, {
      port: PORT,
      lanUrls: getLanUrls(),
      activeRooms: rooms.size,
    });
  }

  if (req.method === 'POST' && pathname === '/api/rooms/create') {
    try {
      const body = await readJsonBody(req);
      const code = randomRoomCode();
      const clientId = crypto.randomUUID();
      const playerName = String(body.name || 'Host').trim().slice(0, 18) || 'Host';

      const room = {
        code,
        hostId: clientId,
        mode: body.mode === 'classic' ? 'classic' : 'blitz',
        theme: body.theme === 'neo' ? 'neo' : 'nusantara',
        started: false,
        matchSeed: null,
        seq: 0,
        lastActivity: Date.now(),
        clients: new Map(),
        seats: [
          { type: 'human', clientId, name: playerName },
          { type: 'ai', clientId: null, name: null },
          { type: 'ai', clientId: null, name: null },
          { type: 'ai', clientId: null, name: null },
        ],
      };
      rooms.set(code, room);
      return sendJson(res, 200, {
        room: serializeRoom(room),
        clientId,
        seatIndex: 0,
      });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/rooms/join') {
    try {
      const body = await readJsonBody(req);
      const code = String(body.code || '').trim().toUpperCase();
      const playerName = String(body.name || 'Pemain').trim().slice(0, 18) || 'Pemain';
      const room = rooms.get(code);
      if (!room) return sendJson(res, 404, { error: `Room "${code}" tidak ditemukan!` });
      if (room.started) return sendJson(res, 409, { error: 'Pertandingan di room ini sudah dimulai!' });
      const freeSeatIdx = room.seats.findIndex((s) => !s.clientId);
      if (freeSeatIdx === -1) return sendJson(res, 409, { error: 'Room sudah penuh (4/4 pemain)!' });
      const clientId = crypto.randomUUID();
      room.seats[freeSeatIdx] = { type: 'human', clientId, name: playerName };
      room.lastActivity = Date.now();

      const snap = serializeRoom(room);
      broadcast(room, 'room_update', snap);
      return sendJson(res, 200, {
        room: snap,
        clientId,
        seatIndex: freeSeatIdx,
      });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  const roomMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]{4})\/(events|config|start|action|leave)$/i);
  if (roomMatch) {
    const code = roomMatch[1].toUpperCase();
    const sub = roomMatch[2];
    const room = rooms.get(code);
    if (!room) return sendJson(res, 404, { error: 'Room tidak ditemukan' });
    room.lastActivity = Date.now();

    if (req.method === 'GET' && sub === 'events') {
      const clientId = urlObj.searchParams.get('clientId') || '';
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`retry: 2000\n\n`);
      room.clients.set(clientId, res);
      if (clientId === room.hostId) clearTimeout(room.hostGraceTimer);
      broadcast(room, 'room_update', serializeRoom(room));

      const heartbeat = setInterval(() => {
        try {
          res.write(`: ping\n\n`);
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      req.on('close', () => {
        clearInterval(heartbeat);
        if (room.clients.get(clientId) === res) {
          room.clients.delete(clientId);
          broadcast(room, 'room_update', serializeRoom(room));
          // Give the host a window to reconnect (refresh, flaky Wi-Fi, or a phone
          // switching apps to share the room code). Longer while still in the lobby.
          if (clientId === room.hostId && rooms.get(room.code) === room) {
            clearTimeout(room.hostGraceTimer);
            room.hostGraceTimer = setTimeout(() => {
              if (!room.clients.has(room.hostId) && rooms.get(room.code) === room) {
                closeRoom(room.code, room, 'host_disconnected');
              }
            }, room.started ? 30_000 : 120_000);
          }
        }
      });
      return;
    }

    if (req.method === 'POST' && sub === 'config') {
      try {
        const body = await readJsonBody(req);
        if (body.clientId !== room.hostId) {
          return sendJson(res, 403, { error: 'Hanya Host yang bisa mengubah pengaturan room.' });
        }
        if (body.mode === 'blitz' || body.mode === 'classic') room.mode = body.mode;
        if (body.theme === 'nusantara' || body.theme === 'neo') room.theme = body.theme;
        if (typeof body.toggleSeat === 'number' && body.toggleSeat >= 0 && body.toggleSeat < 4) {
          const seat = room.seats[body.toggleSeat];
          if (!seat.clientId) {
            seat.type = seat.type === 'ai' ? 'off' : 'ai';
          }
        }
        const snap = serializeRoom(room);
        broadcast(room, 'room_update', snap);
        return sendJson(res, 200, { room: snap });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'POST' && sub === 'start') {
      try {
        const body = await readJsonBody(req);
        if (body.clientId !== room.hostId) {
          return sendJson(res, 403, { error: 'Hanya Host yang bisa memulai match.' });
        }
        const activeCount = room.seats.filter((s) => s.type !== 'off').length;
        if (activeCount < 2) return sendJson(res, 400, { error: 'Minimal 2 pemain aktif!' });
        room.started = true;
        room.seq = 0;
        room.matchSeed = Math.floor(Math.random() * 2_000_000_000) + 1;
        const snap = serializeRoom(room);
        broadcast(room, 'match_start', { room: snap, matchSeed: room.matchSeed });
        return sendJson(res, 200, { ok: true, matchSeed: room.matchSeed });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'POST' && sub === 'action') {
      try {
        const body = await readJsonBody(req);
        const senderSeat = room.seats.findIndex((s) => s.clientId === body.clientId);
        if (senderSeat === -1) return sendJson(res, 403, { error: 'Kamu bukan anggota room ini.' });
        room.seq += 1;
        const actionMsg = {
          seq: room.seq,
          senderSeat,
          isHost: body.clientId === room.hostId,
          type: body.type,
          payload: body.payload || {},
        };
        broadcast(room, 'game_action', actionMsg);
        return sendJson(res, 200, { ok: true, seq: room.seq });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'POST' && sub === 'leave') {
      try {
        const body = await readJsonBody(req);
        if (body.clientId === room.hostId) {
          closeRoom(room.code, room, 'host_left');
          return sendJson(res, 200, { ok: true, closed: true });
        }
        const idx = room.seats.findIndex((s) => s.clientId === body.clientId);
        if (idx !== -1) room.seats[idx] = { type: 'ai', clientId: null, name: null };
        room.clients.delete(body.clientId);
        broadcast(room, 'room_update', serializeRoom(room));
        return sendJson(res, 200, { ok: true });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  const relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const fullPath = path.resolve(ROOT_DIR, relPath);

  if (!fullPath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LudoZ - Ludo Zaman Now running at http://localhost:${PORT}`);
  const lans = getLanUrls();
  if (lans.length > 0) {
    console.log(`LAN Multiplayer URL: ${lans[0]}`);
  }
});

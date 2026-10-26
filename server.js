/**
 * Mini Craft Multiplayer Server
 * Express + Socket.io — prêt pour Render (Web Service)
 */
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

const PORT = process.env.PORT || 3000;

// Servir le jeu
app.use(express.static(path.join(__dirname, "public")));

// Health check pour Render
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, rooms: Object.keys(rooms).length, players: totalPlayers() });
});

// ---------- État des salles ----------
/** @type {Record<string, { seed: number, players: Map<string, any> }>} */
const rooms = {};

function totalPlayers() {
  let n = 0;
  for (const r of Object.values(rooms)) n += r.players.size;
  return n;
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[(Math.random() * chars.length) | 0];
  return c;
}

function cleanRoom(code) {
  const r = rooms[code];
  if (r && r.players.size === 0) {
    delete rooms[code];
    console.log("[room] deleted", code);
  }
}

// ---------- Socket.io ----------
io.on("connection", (socket) => {
  let roomCode = null;
  let playerName = "Joueur";

  socket.on("join", (data, cb) => {
    try {
      const name = (data && data.name ? String(data.name) : "Joueur").slice(0, 20).trim() || "Joueur";
      let code = (data && data.code ? String(data.code) : "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      playerName = name;

      // Créer une nouvelle salle si pas de code ou code inexistant
      if (!code || !rooms[code]) {
        code = code && code.length === 6 ? code : makeCode();
        if (!rooms[code]) {
          rooms[code] = {
            seed: (data && typeof data.seed === "number") ? data.seed : (Math.random() * 1e9) | 0,
            players: new Map(),
          };
          console.log("[room] created", code, "seed=", rooms[code].seed);
        }
      }

      // Quitter l'ancienne salle si besoin
      if (roomCode && roomCode !== code) {
        leaveRoom(socket, roomCode);
      }

      roomCode = code;
      const room = rooms[code];

      // Infos du joueur
      const player = {
        id: socket.id,
        name: playerName,
        x: 0, y: 80, z: 0,
        yaw: 0, pitch: 0,
        color: data && data.color ? data.color : randomColor(),
        mode: (data && data.mode) || "creatif",
        ts: Date.now(),
      };
      room.players.set(socket.id, player);
      socket.join(code);

      // Liste des autres joueurs déjà présents
      const others = [];
      for (const [id, p] of room.players) {
        if (id !== socket.id) others.push(p);
      }

      // Notifier les autres
      socket.to(code).emit("player_join", player);

      if (typeof cb === "function") {
        cb({
          ok: true,
          code,
          seed: room.seed,
          id: socket.id,
          players: others,
        });
      }
      console.log(`[join] ${playerName} → ${code} (${room.players.size} joueurs)`);
    } catch (e) {
      console.error("join error", e);
      if (typeof cb === "function") cb({ ok: false, error: String(e.message || e) });
    }
  });

  // Position / regard (throttle côté client recommandé)
  socket.on("pos", (data) => {
    if (!roomCode || !rooms[roomCode]) return;
    const p = rooms[roomCode].players.get(socket.id);
    if (!p) return;
    if (typeof data.x === "number") p.x = data.x;
    if (typeof data.y === "number") p.y = data.y;
    if (typeof data.z === "number") p.z = data.z;
    if (typeof data.yaw === "number") p.yaw = data.yaw;
    if (typeof data.pitch === "number") p.pitch = data.pitch;
    p.glide = !!data.glide;
    p.ts = Date.now();
    // Broadcast aux autres de la salle
    socket.to(roomCode).emit("pos", {
      id: socket.id,
      x: p.x, y: p.y, z: p.z,
      yaw: p.yaw, pitch: p.pitch,
      glide: p.glide,
    });
  });

  // Chat
  socket.on("chat", (msg) => {
    if (!roomCode) return;
    const text = String(msg || "").slice(0, 120).trim();
    if (!text) return;
    const payload = { name: playerName, text, id: socket.id, t: Date.now() };
    io.to(roomCode).emit("chat", payload);
  });

  // Changement de nom
  socket.on("name", (n) => {
    playerName = String(n || "Joueur").slice(0, 20).trim() || "Joueur";
    if (roomCode && rooms[roomCode]) {
      const p = rooms[roomCode].players.get(socket.id);
      if (p) {
        p.name = playerName;
        socket.to(roomCode).emit("player_update", { id: socket.id, name: playerName });
      }
    }
  });

  socket.on("disconnect", () => {
    if (roomCode) leaveRoom(socket, roomCode);
  });

  function leaveRoom(sock, code) {
    const room = rooms[code];
    if (!room) return;
    room.players.delete(sock.id);
    sock.to(code).emit("player_leave", sock.id);
    sock.leave(code);
    console.log(`[leave] ${playerName} ← ${code} (${room.players.size} restants)`);
    cleanRoom(code);
    roomCode = null;
  }
});

function randomColor() {
  const hues = [0, 30, 60, 120, 180, 210, 270, 300];
  const h = hues[(Math.random() * hues.length) | 0];
  return `hsl(${h},70%,55%)`;
}

// Nettoyage des joueurs inactifs (optionnel)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of Object.entries(rooms)) {
    for (const [id, p] of room.players) {
      if (now - p.ts > 120000) {
        room.players.delete(id);
        io.to(code).emit("player_leave", id);
      }
    }
    cleanRoom(code);
  }
}, 60000);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Mini Craft Multi listening on :${PORT}`);
});

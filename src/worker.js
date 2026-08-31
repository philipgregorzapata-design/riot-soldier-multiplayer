const MAX_PLAYERS = 10;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(
        "RIOT SOLDIER MULTIPLAYER SERVER ONLINE",
        { status: 200 }
      );
    }

    if (url.pathname !== "/ws") {
      return new Response("Not found", { status: 404 });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const id = env.RIOT_ROOM.idFromName("global-lobby");

    return env.RIOT_ROOM.get(id).fetch(request);
  }
};


export class RiotRoom {

  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.rooms = new Map();
  }

  async fetch(request) {

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();

    let roomKey = null;
    let playerId = null;
    let cleanedUp = false;

    const cleanup = () => {

      if (cleanedUp) return;
      cleanedUp = true;

      if (!roomKey || !playerId) return;

      const room = this.rooms.get(roomKey);

      if (!room) return;

      room.players.delete(playerId);
      room.sockets.delete(playerId);

      if (room.hostId === playerId) {
        room.hostId = room.players.keys().next().value || null;
      }

      if (room.players.size === 0) {
        this.rooms.delete(roomKey);
      } else {
        this.broadcast(room, {
          type: "player_left",
          player_id: playerId
        });

        this.broadcast(room, this.snapshot(room));
      }
    };


    server.addEventListener("message", event => {

      try {

        const msg = JSON.parse(event.data);
        const type = msg.type;


        if (type === "join_room") {

          if (roomKey) return;

          const key = String(msg.key || "")
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, "")
            .slice(0, 32);

          if (!key) {
            return this.send(server, {
              type: "error",
              message: "ENTER ROOM KEY"
            });
          }

          let room = this.rooms.get(key);

          if (!room) {
            room = {
              key,
              players: new Map(),
              sockets: new Map(),
              hostId: null
            };

            this.rooms.set(key, room);
          }

          if (room.players.size >= MAX_PLAYERS) {
            return this.send(server, {
              type: "error",
              message: "ROOM FULL"
            });
          }

          do {
            playerId = crypto.randomUUID()
              .replace(/-/g, "")
              .slice(0, 8);
          } while (room.players.has(playerId));

          roomKey = key;

          if (!room.hostId) {
            room.hostId = playerId;
          }

          const playerNumber = room.players.size + 1;

          const player = {
            id: playerId,
            name: `PLAYER-${playerNumber}`,
            x: 120 + Math.random() * 900,
            y: 100 + Math.random() * 500,
            angle: 0,
            hp: 100,
            maxHp: 100,
            class: "assaulter",
            alive: true
          };

          room.players.set(playerId, player);
          room.sockets.set(playerId, server);

          this.send(server, {
            type: "joined",
            room: key,
            player_id: playerId,
            is_host: playerId === room.hostId,
            max_players: MAX_PLAYERS
          });

          this.broadcast(room, this.snapshot(room));

          return;
        }


        if (!roomKey || !playerId) {
          return this.send(server, {
            type: "error",
            message: "JOIN A ROOM FIRST"
          });
        }


        const room = this.rooms.get(roomKey);
        const player = room?.players.get(playerId);

        if (!room || !player) return;


        if (type === "input") {

          const x = Number(msg.x);
          const y = Number(msg.y);
          const angle = Number(msg.angle);

          if (Number.isFinite(x)) {
            player.x = Math.max(20, Math.min(5000, x));
          }

          if (Number.isFinite(y)) {
            player.y = Math.max(20, Math.min(5000, y));
          }

          if (Number.isFinite(angle)) {
            player.angle = angle;
          }

          if (msg.class) {
            player.class = String(msg.class).slice(0, 30);
          }

          this.broadcast(room, {
            type: "player_input",
            player_id: playerId,
            x: player.x,
            y: player.y,
            angle: player.angle,
            class: player.class
          }, playerId);


        } else if (type === "hello") {

          const name = String(msg.name || "")
            .trim()
            .slice(0, 20);

          if (name) {
            player.name = name;
            this.broadcast(room, this.snapshot(room));
          }


        } else if (type === "ping") {

          this.send(server, {
            type: "pong"
          });
        }

      } catch (error) {

        this.send(server, {
          type: "error",
          message: "INVALID MESSAGE"
        });
      }

    });


    server.addEventListener("close", cleanup);
    server.addEventListener("error", cleanup);


    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }


  send(socket, data) {
    try {
      socket.send(JSON.stringify(data));
    } catch {}
  }


  broadcast(room, data, exclude = null) {

    const raw = JSON.stringify(data);

    for (const [id, socket] of room.sockets) {

      if (id === exclude) continue;

      try {
        socket.send(raw);
      } catch {}
    }
  }


  snapshot(room) {
    return {
      type: "state",
      players: [...room.players.values()]
    };
  }
}

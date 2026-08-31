const MAX_PLAYERS = 10;

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

const PLAYER_RADIUS = 16;
const TICK_RATE = 50;

const AUX_PER_KILL = 10;

const MAX_UPGRADE_LEVEL = 10;
const UPGRADE_COST_BASE = 10;
const UPGRADE_COST_STEP = 10;

const MOVE_BASE_SPEED = 4.25;
const MOVE_UPGRADE_SPEED = 0.25;

const RPG_RADIUS = 150;
const RPG_SELF_DAMAGE = 35;

const SHOTGUN_SPREAD = 0.22;

const CLASSES = {
  assaulter: {
    damage: 25,
    range: 700,
    fireRate: 120
  },

  sniper: {
    damage: 100,
    range: 5000,
    fireRate: 900
  },

  rpg: {
    damage: 120,
    range: 1600,
    fireRate: 2000
  },

  shotgun: {
    damage: 24,
    range: 420,
    fireRate: 700,
    pellets: 8
  }
};


/* =========================================================
   WORKER ENTRY
========================================================= */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(
        "RIOT SOLDIER MULTIPLAYER SERVER ONLINE",
        {
          status: 200,
          headers: {
            "content-type": "text/plain"
          }
        }
      );
    }

    if (url.pathname !== "/ws") {
      return new Response("Not found", {
        status: 404
      });
    }

    if (
      request.headers.get("Upgrade")?.toLowerCase() !==
      "websocket"
    ) {
      return new Response("Expected WebSocket", {
        status: 426
      });
    }

    const id = env.RIOT_ROOM.idFromName("global-lobby");

    return env.RIOT_ROOM
      .get(id)
      .fetch(request);
  }
};


/* =========================================================
   DURABLE OBJECT
========================================================= */

export class RiotRoom {

  constructor(ctx, env) {

    this.ctx = ctx;
    this.env = env;

    this.rooms = new Map();

    /*
      Every server instance gets a randomly generated map.
      Obstacles contain AUX text that the client can render.
    */
    this.world = this.generateWorld();

    /*
      Keep the game loop alive.
    */
    this.timer = setInterval(
      () => this.gameTick(),
      TICK_RATE
    );
  }


  /* =======================================================
     WEBSOCKET CONNECTION
  ======================================================= */

  async fetch(request) {

    const pair = new WebSocketPair();

    const client = pair[0];
    const server = pair[1];

    server.accept();

    let roomKey = null;
    let playerId = null;
    let cleanedUp = false;


    const cleanup = () => {

      if (cleanedUp) {
        return;
      }

      cleanedUp = true;

      if (!roomKey || !playerId) {
        return;
      }

      const room = this.rooms.get(roomKey);

      if (!room) {
        return;
      }

      room.players.delete(playerId);
      room.sockets.delete(playerId);


      /*
        If host leaves, another player becomes host.
      */

      if (room.hostId === playerId) {

        room.hostId =
          room.players.keys().next().value ||
          null;
      }


      /*
        Delete empty rooms.
      */

      if (room.players.size === 0) {

        this.rooms.delete(roomKey);

      } else {

        this.broadcast(
          room,
          {
            type: "player_left",
            player_id: playerId
          }
        );

        this.broadcast(
          room,
          this.snapshot(room)
        );
      }
    };


    server.addEventListener(
      "message",
      event => {

        try {

          const msg = JSON.parse(event.data);

          const type = msg.type;


          /* ================================================
             JOIN ROOM
          ================================================ */

          if (type === "join_room") {

            if (roomKey) {
              return;
            }

            /*
              IMPORTANT:
              Accept letters AND numbers.
            */

            const key = String(
              msg.key || ""
            )
              .trim()
              .toUpperCase()
              .replace(/[^A-Z0-9-]/g, "")
              .slice(0, 32);


            if (!key) {

              return this.send(
                server,
                {
                  type: "error",
                  message: "ENTER ROOM KEY"
                }
              );
            }


            let room =
              this.rooms.get(key);


            /*
              Create room if it does not exist.
            */

            if (!room) {

              room = {

                key,

                players: new Map(),

                sockets: new Map(),

                projectiles: [],

                hostId: null
              };

              this.rooms.set(
                key,
                room
              );
            }


            /*
              Maximum 10 players.
            */

            if (
              room.players.size >=
              MAX_PLAYERS
            ) {

              return this.send(
                server,
                {
                  type: "error",
                  message: "ROOM FULL"
                }
              );
            }


            /*
              Generate unique player ID.
            */

            do {

              playerId =
                crypto
                  .randomUUID()
                  .replace(/-/g, "")
                  .slice(0, 8);

            } while (
              room.players.has(playerId)
            );


            roomKey = key;


            /*
              First player becomes host.
            */

            if (!room.hostId) {

              room.hostId =
                playerId;
            }


            const spawn =
              this.findSpawn(room);


            const player = {

              id: playerId,

              name:
                `PLAYER-${room.players.size + 1}`,

              x: spawn.x,

              y: spawn.y,

              angle: 0,

              hp: 100,

              maxHp: 100,

              class: "assaulter",

              alive: true,

              aux: 0,


              /*
                Upgrade levels.
              */

              reloadLevel: 0,

              fireLevel: 0,

              moveLevel: 0,


              shooting: false,

              input: {

                w: false,

                a: false,

                s: false,

                d: false
              },


              lastShot: 0,

              reloadUntil: 0,

              respawnAt: 0
            };


            room.players.set(
              playerId,
              player
            );

            room.sockets.set(
              playerId,
              server
            );


            /*
              Tell client it joined successfully.
            */

            this.send(
              server,
              {

                type: "joined",

                room: key,

                player_id: playerId,

                is_host:
                  playerId === room.hostId,

                max_players:
                  MAX_PLAYERS,

                map: this.world
              }
            );


            /*
              Send complete state.
            */

            this.broadcast(
              room,
              this.snapshot(room)
            );


            return;
          }


          /* ================================================
             REQUIRE ROOM
          ================================================ */

          if (
            !roomKey ||
            !playerId
          ) {

            return this.send(
              server,
              {
                type: "error",
                message:
                  "JOIN A ROOM FIRST"
              }
            );
          }


          const room =
            this.rooms.get(roomKey);

          const player =
            room?.players.get(playerId);


          if (!room || !player) {
            return;
          }


          /* ================================================
             INPUT
          ================================================ */

          if (type === "input") {

            return this.handleInput(
              room,
              player,
              msg
            );
          }


          /* ================================================
             PLAYER NAME
          ================================================ */

          if (type === "hello") {

            const name =
              String(
                msg.name || ""
              )
                .trim()
                .slice(0, 20);


            if (name) {

              player.name = name;

              this.broadcast(
                room,
                this.snapshot(room)
              );
            }

            return;
          }


          /* ================================================
             UPGRADE
          ================================================ */

          if (type === "upgrade") {

            return this.handleUpgrade(
              room,
              player,
              msg.upgrade
            );
          }


          /* ================================================
             PING
          ================================================ */

          if (type === "ping") {

            return this.send(
              server,
              {
                type: "pong"
              }
            );
          }

        } catch (error) {

          this.send(
            server,
            {
              type: "error",
              message:
                "INVALID MESSAGE"
            }
          );
        }
      }
    );


    server.addEventListener(
      "close",
      cleanup
    );

    server.addEventListener(
      "error",
      cleanup
    );


    return new Response(
      null,
      {
        status: 101,
        webSocket: client
      }
    );
  }


  /* =======================================================
     INPUT
  ======================================================= */

  handleInput(
    room,
    player,
    msg
  ) {

    if (!player.alive) {
      return;
    }


    if (
      msg.input &&
      typeof msg.input === "object"
    ) {

      player.input = {

        w: !!msg.input.w,

        a: !!msg.input.a,

        s: !!msg.input.s,

        d: !!msg.input.d,

        shooting:
          !!msg.input.shooting
      };


      player.shooting =
        !!msg.input.shooting;
    }


    const angle =
      Number(msg.angle);


    if (
      Number.isFinite(angle)
    ) {

      player.angle =
        this.normalizeAngle(
          angle
        );
    }


    /*
      Soldier class selection.
    */

    if (
      typeof msg.class ===
      "string"
    ) {

      const requested =
        msg.class
          .toLowerCase()
          .trim();


      if (
        CLASSES[requested]
      ) {

        if (
          player.class !==
          requested
        ) {

          player.reloadUntil = 0;
        }

        player.class =
          requested;
      }
    }
  }


  /* =======================================================
     GAME LOOP
  ======================================================= */

  gameTick() {

    const now =
      Date.now();


    for (
      const room
      of this.rooms.values()
    ) {


      /*
        Movement.
      */

      for (
        const player
        of room.players.values()
      ) {

        this.updatePlayerMovement(
          player
        );

        this.updateRespawn(
          room,
          player,
          now
        );


        /*
          Automatic firing for
          Assaulter when holding click.
        */

        if (
          player.alive &&
          player.shooting
        ) {

          this.tryShoot(
            room,
            player,
            now
          );
        }
      }


      /*
        RPG projectiles.
      */

      this.updateProjectiles(
        room,
        now
      );


      /*
        Broadcast state.
      */

      this.broadcast(
        room,
        this.snapshot(room)
      );
    }
  }


  /* =======================================================
     MOVEMENT
  ======================================================= */

  updatePlayerMovement(
    player
  ) {

    if (!player.alive) {
      return;
    }


    let dx =
      (player.input.d ? 1 : 0) -
      (player.input.a ? 1 : 0);

    let dy =
      (player.input.s ? 1 : 0) -
      (player.input.w ? 1 : 0);


    if (
      !dx &&
      !dy
    ) {

      return;
    }


    const length =
      Math.hypot(
        dx,
        dy
      );


    dx /= length;
    dy /= length;


    /*
      Slightly faster base movement.
      Movement upgrade increases it further.
    */

    const speed =
      MOVE_BASE_SPEED +
      (
        player.moveLevel *
        MOVE_UPGRADE_SPEED
      );


    const oldX =
      player.x;

    const oldY =
      player.y;


    player.x +=
      dx * speed;

    player.y +=
      dy * speed;


    /*
      Keep player inside map.
    */

    player.x =
      Math.max(
        PLAYER_RADIUS,
        Math.min(
          WORLD_WIDTH -
            PLAYER_RADIUS,
          player.x
        )
      );


    player.y =
      Math.max(
        PLAYER_RADIUS,
        Math.min(
          WORLD_HEIGHT -
            PLAYER_RADIUS,
          player.y
        )
      );


    /*
      Collision with obstacles.
    */

    if (
      this.collidesWithObstacle(
        player.x,
        player.y,
        PLAYER_RADIUS
      )
    ) {

      player.x = oldX;
      player.y = oldY;
    }
  }


  /* =======================================================
     SHOOTING
  ======================================================= */

  tryShoot(
    room,
    player,
    now
  ) {

    const weapon =
      CLASSES[player.class];


    if (!weapon) {
      return;
    }


    /*
      Fire-rate upgrade.
    */

    const fireDelay =
      Math.max(
        60,
        weapon.fireRate /
          (
            1 +
            player.fireLevel *
            0.10
          )
      );


    if (
      now -
      player.lastShot <
      fireDelay
    ) {

      return;
    }


    /*
      RPG reload.
    */

    if (
      player.class === "rpg" &&
      player.reloadUntil > now
    ) {

      return;
    }


    player.lastShot =
      now;


    switch (
      player.class
    ) {

      case "assaulter":

        this.fireAssaulter(
          room,
          player
        );

        break;


      case "sniper":

        this.fireSniper(
          room,
          player
        );

        break;


      case "rpg":

        this.fireRPG(
          room,
          player,
          now
        );

        break;


      case "shotgun":

        this.fireShotgun(
          room,
          player
        );

        break;
    }
  }


  /* =======================================================
     ASSAULTER
     
     Hold click = rapid fire.
     Damage decreases with distance.
     Point blank = 100%.
  ======================================================= */

  fireAssaulter(
    room,
    shooter
  ) {

    const target =
      this.findRayTarget(
        room,
        shooter,
        700,
        0
      );


    if (!target) {
      return;
    }


    const distance =
      Math.hypot(
        target.x -
          shooter.x,

        target.y -
          shooter.y
      );


    /*
      Point blank:
      100% damage.

      Long distance:
      lower damage.
    */

    const factor =
      Math.max(
        0.25,

        1 -
          (
            distance /
            700
          ) *
          0.75
      );


    this.damagePlayer(
      room,
      shooter,
      target,
      25 * factor
    );
  }


  /* =======================================================
     SNIPER
     
     One click = one shot.
     Instant kill.
  ======================================================= */

  fireSniper(
    room,
    shooter
  ) {

    const target =
      this.findRayTarget(
        room,
        shooter,
        5000,
        0
      );


    if (!target) {
      return;
    }


    this.killPlayer(
      room,
      shooter,
      target,
      "sniper"
    );
  }


  /* =======================================================
     SHOTGUN
     
     Multiple pellets.
     Spread fire.
     Short range.
  ======================================================= */

  fireShotgun(
    room,
    shooter
  ) {

    const hitPlayers =
      new Set();


    const pellets =
      CLASSES.shotgun.pellets;


    for (
      let i = 0;
      i < pellets;
      i++
    ) {

      /*
        Spread from
        left to right.
      */

      const offset =
        (
          i /
          (pellets - 1) -
          0.5
        ) *
        SHOTGUN_SPREAD;


      const target =
        this.findRayTarget(
          room,
          shooter,
          420,
          offset
        );


      if (
        target &&
        !hitPlayers.has(
          target.id
        )
      ) {

        hitPlayers.add(
          target.id
        );


        const distance =
          Math.hypot(
            target.x -
              shooter.x,

            target.y -
              shooter.y
          );


        const factor =
          Math.max(
            0.15,

            1 -
              (
                distance /
                420
              ) *
              0.85
          );


        this.damagePlayer(
          room,
          shooter,
          target,
          24 * factor
        );
      }
    }
  }


  /* =======================================================
     RPG
     
     Fires a missile.
     2 second reload.
     Explodes on impact.
     Can hurt the shooter.
  ======================================================= */

  fireRPG(
    room,
    shooter,
    now
  ) {

    room.projectiles.push({

      id:
        crypto.randomUUID(),

      type:
        "rpg",

      ownerId:
        shooter.id,

      x:
        shooter.x +
        Math.cos(
          shooter.angle
        ) *
        25,

      y:
        shooter.y +
        Math.sin(
          shooter.angle
        ) *
        25,

      angle:
        shooter.angle,

      speed:
        18,

      damage:
        120,

      createdAt:
        now,

      maxLifetime:
        5000
    });


    /*
      Reload is exactly
      2 seconds before
      reload upgrades.
    */

    const reloadMultiplier =
      1 +
      shooter.reloadLevel *
      0.10;


    shooter.reloadUntil =
      now +
      Math.max(
        400,
        2000 /
          reloadMultiplier
      );
  }


  /* =======================================================
     RPG PROJECTILES
  ======================================================= */

  updateProjectiles(
    room,
    now
  ) {

    const remaining = [];


    for (
      const projectile
      of room.projectiles
    ) {

      projectile.x +=
        Math.cos(
          projectile.angle
        ) *
        projectile.speed;


      projectile.y +=
        Math.sin(
          projectile.angle
        ) *
        projectile.speed;


      let exploded =

        projectile.x < 0 ||

        projectile.x >
          WORLD_WIDTH ||

        projectile.y < 0 ||

        projectile.y >
          WORLD_HEIGHT ||


        this.collidesWithObstacle(
          projectile.x,
          projectile.y,
          5
        ) ||


        now -
          projectile.createdAt >
          projectile.maxLifetime;


      /*
        Direct player collision.
      */

      if (!exploded) {

        for (
          const target
          of room.players.values()
        ) {

          if (!target.alive) {
            continue;
          }


          const distance =
            Math.hypot(

              target.x -
                projectile.x,

              target.y -
                projectile.y
            );


          if (
            distance <=
            PLAYER_RADIUS
          ) {

            exploded = true;

            break;
          }
        }
      }


      if (exploded) {

        this.explodeRPG(
          room,
          projectile
        );

      } else {

        remaining.push(
          projectile
        );
      }
    }


    room.projectiles =
      remaining;
  }


  /* =======================================================
     RPG EXPLOSION
  ======================================================= */

  explodeRPG(
    room,
    projectile
  ) {

    const owner =
      room.players.get(
        projectile.ownerId
      );


    for (
      const target
      of room.players.values()
    ) {

      if (!target.alive) {
        continue;
      }


      const distance =
        Math.hypot(

          target.x -
            projectile.x,

          target.y -
            projectile.y
        );


      if (
        distance >
        RPG_RADIUS
      ) {

        continue;
      }


      const factor =
        Math.max(
          0,
          1 -
            distance /
            RPG_RADIUS
        );


      const damage =
        projectile.damage *
        factor;


      /*
        RPG can damage
        the person who fired it.
      */

      if (
        owner &&
        target.id === owner.id
      ) {

        this.damagePlayer(
          room,
          owner,
          target,
          Math.max(
            RPG_SELF_DAMAGE,
            damage
          ),
          true
        );

      } else if (owner) {

        this.damagePlayer(
          room,
          owner,
          target,
          damage
        );
      }
    }
  }


  /* =======================================================
     FIND TARGET
  ======================================================= */

  findRayTarget(
    room,
    shooter,
    range,
    angleOffset
  ) {

    const angle =
      shooter.angle +
      angleOffset;


    const dirX =
      Math.cos(angle);

    const dirY =
      Math.sin(angle);


    let closest =
      null;

    let closestDistance =
      Infinity;


    for (
      const target
      of room.players.values()
    ) {

      if (
        target.id ===
        shooter.id
      ) {

        continue;
      }


      if (!target.alive) {
        continue;
      }


      const vx =
        target.x -
        shooter.x;

      const vy =
        target.y -
        shooter.y;


      const distance =
        Math.hypot(
          vx,
          vy
        );


      if (
        distance >
        range
      ) {

        continue;
      }


      /*
        Player must be
        in front of shooter.
      */

      const dot =
        vx * dirX +
        vy * dirY;


      if (dot <= 0) {
        continue;
      }


      /*
        Distance from
        the bullet ray.
      */

      const perpendicular =
        Math.abs(
          vx * dirY -
          vy * dirX
        );


      if (
        perpendicular >
        PLAYER_RADIUS
      ) {

        continue;
      }


      /*
        Obstacles block shots.
      */

      if (
        this.rayHitsObstacle(
          shooter.x,
          shooter.y,
          target.x,
          target.y
        )
      ) {

        continue;
      }


      if (
        distance <
        closestDistance
      ) {

        closest =
          target;

        closestDistance =
          distance;
      }
    }


    return closest;
  }


  /* =======================================================
     DAMAGE
  ======================================================= */

  damagePlayer(
    room,
    attacker,
    target,
    damage,
    forceSelf = false
  ) {

    if (
      !target?.alive
    ) {

      return;
    }


    if (
      !Number.isFinite(
        damage
      ) ||
      damage <= 0
    ) {

      return;
    }


    target.hp -=
      damage;


    if (
      target.hp <= 0
    ) {

      target.hp = 0;


      this.killPlayer(
        room,
        attacker,
        target,
        attacker?.class ||
          "unknown",

        forceSelf
      );
    }
  }


  /* =======================================================
     KILL
  ======================================================= */

  killPlayer(
    room,
    attacker,
    target,
    weapon,
    forceSelf = false
  ) {

    if (!target?.alive) {
      return;
    }


    target.alive =
      false;

    target.hp =
      0;

    target.shooting =
      false;

    target.respawnAt =
      Date.now() + 3000;


    /*
      Give AUX for a normal kill.
    */

    if (
      attacker &&
      attacker.id !==
        target.id &&
      !forceSelf
    ) {

      attacker.aux +=
        AUX_PER_KILL;


      /*
        Small hit notification.
        Client can display:
        +10 AUX
      */

      this.sendToPlayer(
        room,
        attacker.id,
        {

          type: "hit",

          killer_id:
            attacker.id,

          victim_id:
            target.id,

          weapon,

          aux:
            AUX_PER_KILL
        }
      );
    }
  }


  /* =======================================================
     RESPAWN
  ======================================================= */

  updateRespawn(
    room,
    player,
    now
  ) {

    if (
      player.alive ||
      !player.respawnAt ||
      now <
        player.respawnAt
    ) {

      return;
    }


    const spawn =
      this.findSpawn(
        room
      );


    player.x =
      spawn.x;

    player.y =
      spawn.y;

    player.angle =
      0;

    player.hp =
      player.maxHp;

    player.alive =
      true;

    player.shooting =
      false;

    player.lastShot =
      0;

    player.reloadUntil =
      0;

    player.respawnAt =
      0;
  }


  /* =======================================================
     UPGRADES
     
     reload
     fire
     move
  ======================================================= */

  handleUpgrade(
    room,
    player,
    upgrade
  ) {

    const upgradeMap = {

      reload:
        "reloadLevel",

      fire:
        "fireLevel",

      move:
        "moveLevel"
    };


    const key =
      upgradeMap[upgrade];


    if (!key) {

      return this.sendToPlayer(
        room,
        player.id,
        {

          type: "error",

          message:
            "INVALID UPGRADE"
        }
      );
    }


    const level =
      Number(
        player[key] || 0
      );


    if (
      level >=
      MAX_UPGRADE_LEVEL
    ) {

      return this.sendToPlayer(
        room,
        player.id,
        {

          type: "error",

          message:
            "MAX UPGRADE"
        }
      );
    }


    /*
      Upgrade prices:

      Level 0 -> 1 = 10 AUX
      Level 1 -> 2 = 20 AUX
      Level 2 -> 3 = 30 AUX
      etc.
    */

    const cost =
      UPGRADE_COST_BASE +
      level *
        UPGRADE_COST_STEP;


    if (
      player.aux <
      cost
    ) {

      return this.sendToPlayer(
        room,
        player.id,
        {

          type: "error",

          message:
            `NEED ${cost} AUX`
        }
      );
    }


    player.aux -=
      cost;

    player[key] =
      level + 1;


    this.sendToPlayer(
      room,
      player.id,
      {

        type:
          "player_stats",

        player_id:
          player.id,

        aux:
          player.aux,

        reloadLevel:
          player.reloadLevel,

        fireLevel:
          player.fireLevel,

        moveLevel:
          player.moveLevel
      }
    );


    this.broadcast(
      room,
      this.snapshot(room)
    );
  }


  /* =======================================================
     RANDOM MAP
     
     Blocks have "AUX" text.
  ======================================================= */

  generateWorld() {

    const result = [];


    /*
      Random number of obstacles.
    */

    const count =
      28 +
      Math.floor(
        Math.random() * 18
      );


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const width =
        100 +
        Math.random() *
        260;


      const height =
        80 +
        Math.random() *
        220;


      result.push({

        x:
          100 +
          Math.random() *
          (
            WORLD_WIDTH -
            width -
            200
          ),

        y:
          100 +
          Math.random() *
          (
            WORLD_HEIGHT -
            height -
            200
          ),

        w:
          width,

        h:
          height,

        /*
          Client should render this
          text inside the block.
        */

        label:
          "AUX"
      });
    }


    return result;
  }


  /* =======================================================
     SPAWN
  ======================================================= */

  findSpawn(
    room
  ) {

    for (
      let attempt = 0;
      attempt < 100;
      attempt++
    ) {

      const point = {

        x:
          100 +
          Math.random() *
          (
            WORLD_WIDTH -
            200
          ),

        y:
          100 +
          Math.random() *
          (
            WORLD_HEIGHT -
            200
          )
      };


      /*
        Don't spawn inside
        an obstacle.
      */

      if (
        this.collidesWithObstacle(
          point.x,
          point.y,
          40
        )
      ) {

        continue;
      }


      /*
        Don't spawn directly
        on another player.
      */

      let tooClose =
        false;


      for (
        const player
        of room.players.values()
      ) {

        if (
          Math.hypot(

            player.x -
              point.x,

            player.y -
              point.y
          ) < 150
        ) {

          tooClose =
            true;

          break;
        }
      }


      if (!tooClose) {

        return point;
      }
    }


    /*
      Fallback.
    */

    return {

      x:
        WORLD_WIDTH / 2,

      y:
        WORLD_HEIGHT / 2
    };
  }


  /* =======================================================
     OBSTACLE COLLISION
  ======================================================= */

  collidesWithObstacle(
    x,
    y,
    radius
  ) {

    for (
      const obstacle
      of this.world
    ) {

      const cx =
        Math.max(
          obstacle.x,

          Math.min(
            x,
            obstacle.x +
              obstacle.w
          )
        );


      const cy =
        Math.max(
          obstacle.y,

          Math.min(
            y,
            obstacle.y +
              obstacle.h
          )
        );


      const dx =
        x - cx;

      const dy =
        y - cy;


      if (
        dx * dx +
        dy * dy <
        radius * radius
      ) {

        return true;
      }
    }


    return false;
  }


  /* =======================================================
     RAY / OBSTACLE
  ======================================================= */

  rayHitsObstacle(
    x1,
    y1,
    x2,
    y2
  ) {

    for (
      const obstacle
      of this.world
    ) {

      if (
        this.lineIntersectsRect(
          x1,
          y1,
          x2,
          y2,
          obstacle
        )
      ) {

        return true;
      }
    }


    return false;
  }


  lineIntersectsRect(
    x1,
    y1,
    x2,
    y2,
    rect
  ) {

    const left =
      rect.x;

    const right =
      rect.x +
      rect.w;

    const top =
      rect.y;

    const bottom =
      rect.y +
      rect.h;


    /*
      Quick bounding check.
    */

    if (
      Math.max(x1, x2) <
        left ||

      Math.min(x1, x2) >
        right ||

      Math.max(y1, y2) <
        top ||

      Math.min(y1, y2) >
        bottom
    ) {

      return false;
    }


    /*
      Starting point
      inside rectangle.
    */

    if (
      x1 >= left &&
      x1 <= right &&
      y1 >= top &&
      y1 <= bottom
    ) {

      return true;
    }


    /*
      Ending point
      inside rectangle.
    */

    if (
      x2 >= left &&
      x2 <= right &&
      y2 >= top &&
      y2 <= bottom
    ) {

      return true;
    }


    return (

      this.segmentsIntersect(
        x1,
        y1,
        x2,
        y2,
        left,
        top,
        right,
        top
      ) ||

      this.segmentsIntersect(
        x1,
        y1,
        x2,
        y2,
        right,
        top,
        right,
        bottom
      ) ||

      this.segmentsIntersect(
        x1,
        y1,
        x2,
        y2,
        right,
        bottom,
        left,
        bottom
      ) ||

      this.segmentsIntersect(
        x1,
        y1,
        x2,
        y2,
        left,
        bottom,
        left,
        top
      )
    );
  }


  /* =======================================================
     LINE INTERSECTION
  ======================================================= */

  segmentsIntersect(
    x1,
    y1,
    x2,
    y2,
    x3,
    y3,
    x4,
    y4
  ) {

    const d =
      (
        (y4 - y3) *
        (x2 - x1)
      ) -
      (
        (x4 - x3) *
        (y2 - y1)
      );


    if (
      Math.abs(d) <
      0.000001
    ) {

      return false;
    }


    const ua =
      (
        (x4 - x3) *
        (y1 - y3) -
        (y4 - y3) *
        (x1 - x3)
      ) / d;


    const ub =
      (
        (x2 - x1) *
        (y1 - y3) -
        (y2 - y1) *
        (x1 - x3)
      ) / d;


    return (

      ua >= 0 &&
      ua <= 1 &&
      ub >= 0 &&
      ub <= 1
    );
  }


  /* =======================================================
     NORMALIZE ANGLE
  ======================================================= */

  normalizeAngle(
    angle
  ) {

    while (
      angle > Math.PI
    ) {

      angle -=
        Math.PI * 2;
    }


    while (
      angle < -Math.PI
    ) {

      angle +=
        Math.PI * 2;
    }


    return angle;
  }


  /* =======================================================
     SEND TO PLAYER
  ======================================================= */

  sendToPlayer(
    room,
    playerId,
    data
  ) {

    const socket =
      room.sockets.get(
        playerId
      );


    if (socket) {

      this.send(
        socket,
        data
      );
    }
  }


  /* =======================================================
     SEND
  ======================================================= */

  send(
    socket,
    data
  ) {

    try {

      socket.send(
        JSON.stringify(data)
      );

    } catch {

      /*
        Socket may already
        be disconnected.
      */
    }
  }


  /* =======================================================
     BROADCAST
  ======================================================= */

  broadcast(
    room,
    data,
    exclude = null
  ) {

    const raw =
      JSON.stringify(
        data
      );


    for (
      const [
        id,
        socket
      ]
      of room.sockets
    ) {

      if (
        id === exclude
      ) {

        continue;
      }


      try {

        socket.send(
          raw
        );

      } catch {

        /*
          Ignore disconnected
          sockets.
        */
      }
    }
  }


  /* =======================================================
     GAME SNAPSHOT
  ======================================================= */

  snapshot(
    room
  ) {

    return {

      type:
        "state",


      players:
        [
          ...room.players.values()
        ].map(
          player => ({

            id:
              player.id,

            name:
              player.name,

            x:
              player.x,

            y:
              player.y,

            angle:
              player.angle,

            hp:
              player.hp,

            maxHp:
              player.maxHp,

            class:
              player.class,

            alive:
              player.alive,


            /*
              AUX shown by
              client UI.
            */

            aux:
              player.aux,


            /*
              Upgrade levels.
            */

            reloadLevel:
              player.reloadLevel,

            fireLevel:
              player.fireLevel,

            moveLevel:
              player.moveLevel,


            /*
              RPG reload status.
            */

            reloading:
              player.reloadUntil >
              Date.now()
          })
        ),


      /*
        RPG missiles.
      */

      projectiles:
        room.projectiles.map(
          projectile => ({

            id:
              projectile.id,

            type:
              projectile.type,

            x:
              projectile.x,

            y:
              projectile.y,

            angle:
              projectile.angle
          })
        ),


      /*
        Random map.
      */

      map:
        this.world
    };
  }
}

const MAX_PLAYERS = 10;

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

const PLAYER_RADIUS = 16;
const TICK_RATE = 50; // 20 server ticks/sec

const CLASSES = {
  assaulter: {
    damage: 25,
    range: 700,
    fireRate: 90,
    reload: 0,
    pellets: 1
  },

  sniper: {
    damage: 100,
    range: 5000,
    fireRate: 900,
    reload: 0,
    pellets: 1
  },

  rpg: {
    damage: 120,
    range: 1600,
    fireRate: 2000,
    reload: 2000,
    pellets: 1
  },

  shotgun: {
    damage: 24,
    range: 420,
    fireRate: 700,
    reload: 0,
    pellets: 8
  }
};

const AUX_PER_KILL = 10;

const UPGRADE_COST_BASE = 10;
const UPGRADE_COST_STEP = 10;

const MAX_UPGRADE_LEVEL = 10;

const MOVE_BASE_SPEED = 14;
const MOVE_UPGRADE_SPEED = 0.25;

const ASSAULTER_MIN_DAMAGE_MULTIPLIER = 0.25;

const RPG_RADIUS = 150;
const RPG_SELF_DAMAGE = 35;

const SHOTGUN_SPREAD = 0.22;

const obstacles = [];


/* =========================================================
   CLOUDFLARE WORKER
   ========================================================= */

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
      return new Response(
        "Not found",
        { status: 404 }
      );
    }

    if (
      request.headers.get("Upgrade")
        ?.toLowerCase() !== "websocket"
    ) {
      return new Response(
        "Expected WebSocket",
        { status: 426 }
      );
    }

    const id =
      env.RIOT_ROOM.idFromName(
        "global-lobby"
      );

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

    this.lastTick = Date.now();

    /*
     * Keep one generated world for this Durable Object.
     */
    this.world = this.generateWorld();

    /*
     * Server game loop.
     */
    this.timer = setInterval(
      () => this.gameTick(),
      TICK_RATE
    );
  }


  /* =======================================================
     CONNECTION
     ======================================================= */

  async fetch(request) {

    const pair =
      new WebSocketPair();

    const client = pair[0];
    const server = pair[1];

    server.accept();

    let roomKey = null;
    let playerId = null;
    let cleanedUp = false;

    const cleanup = () => {

      if (cleanedUp)
        return;

      cleanedUp = true;

      if (
        !roomKey ||
        !playerId
      )
        return;

      const room =
        this.rooms.get(roomKey);

      if (!room)
        return;

      room.players.delete(
        playerId
      );

      room.sockets.delete(
        playerId
      );

      if (
        room.hostId ===
        playerId
      ) {

        room.hostId =
          room.players
            .keys()
            .next()
            .value || null;
      }

      if (
        room.players.size === 0
      ) {

        this.rooms.delete(
          roomKey
        );

      } else {

        this.broadcast(
          room,
          {
            type:
              "player_left",

            player_id:
              playerId
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

          const msg =
            JSON.parse(
              event.data
            );

          const type =
            msg.type;


          /* =================================================
             JOIN ROOM
             ================================================= */

          if (
            type ===
            "join_room"
          ) {

            if (roomKey)
              return;

            const key =
              String(
                msg.key || ""
              )
                .trim()
                .toUpperCase()
                .replace(
                  /[^A-Z0-9-]/g,
                  ""
                )
                .slice(
                  0,
                  32
                );

            if (!key) {

              return this.send(
                server,
                {
                  type:
                    "error",

                  message:
                    "ENTER ROOM KEY"
                }
              );
            }


            let room =
              this.rooms.get(
                key
              );


            if (!room) {

              room = {

                key,

                players:
                  new Map(),

                sockets:
                  new Map(),

                projectiles:
                  [],

                hostId:
                  null

              };

              this.rooms.set(
                key,
                room
              );
            }


            if (
              room.players.size >=
              MAX_PLAYERS
            ) {

              return this.send(
                server,
                {
                  type:
                    "error",

                  message:
                    "ROOM FULL"
                }
              );
            }


            do {

              playerId =
                crypto
                  .randomUUID()
                  .replace(
                    /-/g,
                    ""
                  )
                  .slice(
                    0,
                    8
                  );

            } while (
              room.players.has(
                playerId
              )
            );


            roomKey =
              key;


            if (!room.hostId) {

              room.hostId =
                playerId;
            }


            const playerNumber =
              room.players.size + 1;


            const spawn =
              this.findSpawn(
                room
              );


            const player = {

              id:
                playerId,

              name:
                `PLAYER-${playerNumber}`,

              x:
                spawn.x,

              y:
                spawn.y,

              angle:
                0,

              hp:
                100,

              maxHp:
                100,

              class:
                null,

              alive:
                false,

              aux:
                0,

              reloadLevel:
                0,

              fireLevel:
                0,

              moveLevel:
                0,

              shooting:
                false,

              input: {

                w: false,
                a: false,
                s: false,
                d: false

              },

              lastShot:
                0,

              reloadUntil:
                0,

              respawnAt:
                0

            };


            room.players.set(
              playerId,
              player
            );

            room.sockets.set(
              playerId,
              server
            );


            this.send(
              server,
              {

                type:
                  "joined",

                room:
                  key,

                player_id:
                  playerId,

                is_host:
                  playerId ===
                  room.hostId,

                max_players:
                  MAX_PLAYERS,

                map:
                  this.world

              }
            );


            this.broadcast(
              room,
              this.snapshot(
                room
              )
            );

            return;
          }


          /* =================================================
             REQUIRE ROOM
             ================================================= */

          if (
            !roomKey ||
            !playerId
          ) {

            return this.send(
              server,
              {

                type:
                  "error",

                message:
                  "JOIN A ROOM FIRST"

              }
            );
          }


          const room =
            this.rooms.get(
              roomKey
            );

          const player =
            room?.players.get(
              playerId
            );


          if (
            !room ||
            !player
          )
            return;


          /* =================================================
             INPUT
             ================================================= */

          if (
            type ===
            "input"
          ) {

            this.handleInput(
              room,
              player,
              msg
            );

            return;
          }


          /* =================================================
             HELLO / NAME
             ================================================= */

          if (
            type ===
            "hello"
          ) {

            const name =
              String(
                msg.name || ""
              )
                .trim()
                .slice(
                  0,
                  20
                );

            if (name) {

              player.name =
                name;

              this.broadcast(
                room,
                this.snapshot(
                  room
                )
              );
            }

            return;
          }


          /* =================================================
             UPGRADE
             ================================================= */

          if (
            type ===
            "upgrade"
          ) {

            this.handleUpgrade(
              room,
              player,
              msg.upgrade
            );

            return;
          }


          /* =================================================
             PING
             ================================================= */

          if (
            type ===
            "ping"
          ) {

            this.send(
              server,
              {
                type:
                  "pong"
              }
            );

            return;
          }

        } catch {

          this.send(
            server,
            {

              type:
                "error",

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


  /* =========================================================
     INPUT
     ========================================================= */

  handleInput(
    room,
    player,
    msg
  ) {

    /*
     * A player must choose a class before spawning.
     * Class selection is accepted while unspawned.
     */
    if (typeof msg.class === "string") {
      const requested = msg.class.toLowerCase();
      if (CLASSES[requested]) {
        const changed = player.class !== requested;
        player.class = requested;
        if (!player.alive && !player.respawnAt) {
          const spawn = this.findSpawn(room);
          player.x = spawn.x;
          player.y = spawn.y;
          player.hp = player.maxHp;
          player.angle = 0;
          player.alive = true;
          player.shooting = false;
          player.lastShot = 0;
          player.reloadUntil = 0;
        }
        if (changed) player.reloadUntil = 0;
      }
    }

    if (!player.alive || !player.class)
      return;


    /*
     * Never trust the client's position.
     *
     * The server controls movement.
     */


    if (
      msg.input &&
      typeof msg.input ===
        "object"
    ) {

      player.input = {

        w:
          !!msg.input.w,

        a:
          !!msg.input.a,

        s:
          !!msg.input.s,

        d:
          !!msg.input.d

      };

      player.shooting =
        !!msg.input.shooting;
    }


    const angle =
      Number(
        msg.angle
      );


    if (
      Number.isFinite(
        angle
      )
    ) {

      player.angle =
        this.normalizeAngle(
          angle
        );
    }



  }


  /* =========================================================
     GAME LOOP
     ========================================================= */

  gameTick() {

    const now =
      Date.now();


    for (
      const room of
      this.rooms.values()
    ) {

      for (
        const player of
        room.players.values()
      ) {

        this.updatePlayerMovement(
          player
        );

        this.updateRespawn(
          room,
          player,
          now
        );

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


      this.updateProjectiles(
        room,
        now
      );


      /*
       * Broadcast state every server tick.
       */

      this.broadcast(
        room,
        this.snapshot(
          room
        )
      );
    }

    this.lastTick =
      now;
  }


  /* =========================================================
     MOVEMENT
     ========================================================= */

  updatePlayerMovement(
    player
  ) {

    if (!player.alive)
      return;


    let dx =
      (player.input.d ? 1 : 0) -
      (player.input.a ? 1 : 0);

    let dy =
      (player.input.s ? 1 : 0) -
      (player.input.w ? 1 : 0);


    if (!dx && !dy)
      return;


    const length =
      Math.hypot(
        dx,
        dy
      );


    dx /= length;
    dy /= length;


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
     * Obstacle collision.
     */

    if (
      this.collidesWithObstacle(
        player.x,
        player.y,
        PLAYER_RADIUS
      )
    ) {

      player.x =
        oldX;

      player.y =
        oldY;
    }
  }


  /* =========================================================
     SHOOTING
     ========================================================= */

  tryShoot(
    room,
    player,
    now
  ) {

    const weapon =
      CLASSES[
        player.class
      ];


    if (!weapon)
      return;


    /*
     * Fire-rate upgrade makes weapons shoot faster.
     */

    const fireMultiplier =
      1 +
      (
        player.fireLevel *
        0.10
      );


    const cooldown =
      Math.max(
        60,
        weapon.fireRate /
        fireMultiplier
      );


    /*
     * RPG has an explicit 2 second reload.
     */

    if (
      player.class ===
      "rpg"
    ) {

      if (
        player.reloadUntil >
        now
      ) {
        return;
      }
    }


    if (
      now -
      player.lastShot <
      cooldown
    ) {
      return;
    }


    player.lastShot =
      now;


    if (
      player.class ===
      "rpg"
    ) {

      this.fireRPG(
        room,
        player,
        now
      );

      player.reloadUntil =
        now +
        2000;

      return;
    }


    if (
      player.class ===
      "sniper"
    ) {

      this.fireSniper(
        room,
        player
      );

      return;
    }


    if (
      player.class ===
      "shotgun"
    ) {

      this.fireShotgun(
        room,
        player
      );

      return;
    }


    if (
      player.class ===
      "assaulter"
    ) {

      this.fireAssaulter(
        room,
        player
      );
    }
  }


  /* =========================================================
     ASSAULTER
     ========================================================= */

  fireAssaulter(
    room,
    shooter
  ) {

    const target =
      this.findRayTarget(
        room,
        shooter,
        CLASSES.assaulter.range,
        0
      );


    if (!target)
      return;


    const distance =
      Math.hypot(
        target.x -
          shooter.x,
        target.y -
          shooter.y
      );


    /*
     * Point blank = 100%.
     *
     * Damage gradually falls with distance.
     */

    const distanceFactor =
      Math.max(
        ASSAULTER_MIN_DAMAGE_MULTIPLIER,
        1 -
        (
          distance /
          CLASSES.assaulter.range
        ) *
        0.75
      );


    const damage =
      CLASSES.assaulter.damage *
      distanceFactor;


    this.damagePlayer(
      room,
      shooter,
      target,
      damage
    );
  }


  /* =========================================================
     SNIPER
     ========================================================= */

  fireSniper(
    room,
    shooter
  ) {

    const target =
      this.findRayTarget(
        room,
        shooter,
        CLASSES.sniper.range,
        0
      );


    if (!target)
      return;


    /*
     * Sniper is instant kill.
     */

    this.killPlayer(
      room,
      shooter,
      target,
      "sniper"
    );
  }


  /* =========================================================
     SHOTGUN
     ========================================================= */

  fireShotgun(
    room,
    shooter
  ) {

    const pellets =
      CLASSES.shotgun
        .pellets;


    const baseAngle =
      shooter.angle;


    const hitPlayers =
      new Set();


    for (
      let i = 0;
      i < pellets;
      i++
    ) {

      const t =
        pellets === 1
          ? 0
          :
          (
            i /
            (pellets - 1)
          ) - 0.5;


      const angle =
        baseAngle +
        (
          t *
          SHOTGUN_SPREAD
        );


      const target =
        this.findRayTarget(
          room,
          shooter,
          CLASSES.shotgun.range,
          angle -
          baseAngle
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


        /*
         * Shotgun is strongest up close.
         */

        const factor =
          Math.max(
            0.15,
            1 -
            (
              distance /
              CLASSES.shotgun.range
            ) *
            0.85
          );


        this.damagePlayer(
          room,
          shooter,
          target,
          CLASSES.shotgun.damage *
          factor
        );
      }
    }
  }


  /* =========================================================
     RPG
     ========================================================= */

  fireRPG(
    room,
    shooter,
    now
  ) {

    const speed =
      18;


    room.projectiles.push({

      id:
        crypto
          .randomUUID(),

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

      speed,

      damage:
        CLASSES.rpg.damage,

      createdAt:
        now,

      maxLifetime:
        5000

    });
  }


  /* =========================================================
     PROJECTILE LOOP
     ========================================================= */

  updateProjectiles(
    room,
    now
  ) {

    if (
      room.projectiles
        .length === 0
    )
      return;


    const remaining = [];


    for (
      const projectile of
      room.projectiles
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
        false;


      /*
       * World bounds.
       */

      if (
        projectile.x < 0 ||
        projectile.x >
          WORLD_WIDTH ||
        projectile.y < 0 ||
        projectile.y >
          WORLD_HEIGHT
      ) {

        exploded = true;
      }


      /*
       * Obstacle collision.
       */

      if (
        !exploded &&
        this.collidesWithObstacle(
          projectile.x,
          projectile.y,
          5
        )
      ) {

        exploded = true;
      }


      /*
       * Player collision.
       */

      if (!exploded) {

        for (
          const target of
          room.players.values()
        ) {

          if (
            !target.alive
          )
            continue;


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


      /*
       * Lifetime.
       */

      if (
        now -
        projectile.createdAt >
        projectile.maxLifetime
      ) {

        exploded = true;
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


  /* =========================================================
     RPG EXPLOSION
     ========================================================= */

  explodeRPG(
    room,
    projectile
  ) {

    const owner =
      room.players.get(
        projectile.ownerId
      );


    /*
     * Damage every player inside
     * the explosion radius.
     */

    for (
      const target of
      room.players.values()
    ) {

      if (
        !target.alive
      )
        continue;


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
      )
        continue;


      /*
       * Damage falls off from explosion center.
       */

      const factor =
        Math.max(
          0,
          1 -
          (
            distance /
            RPG_RADIUS
          )
        );


      const damage =
        projectile.damage *
        factor;


      /*
       * The shooter can be killed
       * by their own RPG.
       */

      if (
        owner &&
        target.id ===
        owner.id
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

        continue;
      }


      if (owner) {

        this.damagePlayer(
          room,
          owner,
          target,
          damage
        );
      }
    }
  }


  /* =========================================================
     RAYCAST
     ========================================================= */

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
      const target of
      room.players.values()
    ) {

      if (
        target.id ===
        shooter.id
      )
        continue;


      if (
        !target.alive
      )
        continue;


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
      )
        continue;


      const dot =
        vx * dirX +
        vy * dirY;


      if (
        dot <= 0
      )
        continue;


      /*
       * Perpendicular distance from
       * the player's center to the shot ray.
       */

      const perpendicular =
        Math.abs(
          vx * dirY -
          vy * dirX
        );


      if (
        perpendicular >
        PLAYER_RADIUS
      )
        continue;


      /*
       * Check obstacles between shooter
       * and target.
       */

      if (
        this.rayHitsObstacle(
          shooter.x,
          shooter.y,
          target.x,
          target.y
        )
      )
        continue;


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


  /* =========================================================
     DAMAGE
     ========================================================= */

  damagePlayer(
    room,
    attacker,
    target,
    damage,
    forceSelf = false
  ) {

    if (
      !target ||
      !target.alive
    )
      return;


    if (
      !Number.isFinite(
        damage
      ) ||
      damage <= 0
    )
      return;


    target.hp -=
      damage;


    if (
      target.hp <= 0
    ) {

      target.hp =
        0;


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


  /* =========================================================
     KILL
     ========================================================= */

  killPlayer(
    room,
    attacker,
    target,
    weapon,
    forceSelf = false
  ) {

    if (
      !target ||
      !target.alive
    )
      return;


    target.alive =
      false;

    target.hp =
      0;


    target.shooting =
      false;


    target.respawnAt =
      Date.now() +
      3000;


    /*
     * Award AUX only when someone else
     * kills the target.
     *
     * RPG self-kills don't reward AUX.
     */

    if (
      attacker &&
      attacker.id !==
      target.id &&
      !forceSelf
    ) {

      attacker.aux +=
        AUX_PER_KILL;


      this.sendToPlayer(
        room,
        attacker.id,
        {

          type:
            "hit",

          killer_id:
            attacker.id,

          victim_id:
            target.id,

          weapon,

          aux:
            AUX_PER_KILL

        }
      );


      this.sendToPlayer(
        room,
        attacker.id,
        {

          type:
            "player_stats",

          player_id:
            attacker.id,

          aux:
            attacker.aux,

          reloadLevel:
            attacker.reloadLevel,

          fireLevel:
            attacker.fireLevel,

          moveLevel:
            attacker.moveLevel

        }
      );
    }
  }


  /* =========================================================
     RESPAWN
     ========================================================= */

  updateRespawn(
    room,
    player,
    now
  ) {

    if (
      player.alive
    )
      return;


    if (
      !player.respawnAt ||
      now <
      player.respawnAt
    )
      return;


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
  }


  /* =========================================================
     UPGRADES
     ========================================================= */

  handleUpgrade(
    room,
    player,
    upgrade
  ) {

    const valid = [
      "reload",
      "fire",
      "move"
    ];


    if (
      !valid.includes(
        upgrade
      )
    ) {

      return this.sendToPlayer(
        room,
        player.id,
        {

          type:
            "error",

          message:
            "INVALID UPGRADE"

        }
      );
    }


    const levelKey = {

      reload:
        "reloadLevel",

      fire:
        "fireLevel",

      move:
        "moveLevel"

    }[upgrade];


    const currentLevel =
      Number(
        player[levelKey] ||
        0
      );


    if (
      currentLevel >=
      MAX_UPGRADE_LEVEL
    ) {

      return this.sendToPlayer(
        room,
        player.id,
        {

          type:
            "error",

          message:
            "MAX UPGRADE"

        }
      );
    }


    const cost =
      UPGRADE_COST_BASE +
      (
        currentLevel *
        UPGRADE_COST_STEP
      );


    if (
      player.aux <
      cost
    ) {

      return this.sendToPlayer(
        room,
        player.id,
        {

          type:
            "error",

          message:
            `NEED ${cost} AUX`

        }
      );
    }


    player.aux -=
      cost;

    player[levelKey] =
      currentLevel + 1;


    /*
     * Reload upgrade immediately affects
     * RPG reload time.
     */

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
      this.snapshot(
        room
      )
    );
  }


  /* =========================================================
     MAP GENERATION
     ========================================================= */

  generateWorld() {

    const result = [];

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

        label:
          "AUX"

      });
    }


    return result;
  }


  /* =========================================================
     SPAWN
     ========================================================= */

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


      if (
        this.collidesWithObstacle(
          point.x,
          point.y,
          40
        )
      )
        continue;


      let tooClose =
        false;


      for (
        const player of
        room.players.values()
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


      if (!tooClose)
        return point;
    }


    return {

      x:
        WORLD_WIDTH / 2,

      y:
        WORLD_HEIGHT / 2

    };
  }


  /* =========================================================
     OBSTACLE COLLISION
     ========================================================= */

  collidesWithObstacle(
    x,
    y,
    radius
  ) {

    for (
      const obstacle of
      this.world
    ) {

      const closestX =
        Math.max(
          obstacle.x,
          Math.min(
            x,
            obstacle.x +
              obstacle.w
          )
        );


      const closestY =
        Math.max(
          obstacle.y,
          Math.min(
            y,
            obstacle.y +
              obstacle.h
          )
        );


      const dx =
        x -
        closestX;

      const dy =
        y -
        closestY;


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


  /* =========================================================
     OBSTACLE RAYCAST
     ========================================================= */

  rayHitsObstacle(
    x1,
    y1,
    x2,
    y2
  ) {

    for (
      const obstacle of
      this.world
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
     * Fast bounding-box rejection.
     */

    if (
      Math.max(
        x1,
        x2
      ) < left ||
      Math.min(
        x1,
        x2
      ) > right ||
      Math.max(
        y1,
        y2
      ) < top ||
      Math.min(
        y1,
        y2
      ) > bottom
    ) {

      return false;
    }


    /*
     * Start/end point inside rectangle.
     */

    if (
      x1 >= left &&
      x1 <= right &&
      y1 >= top &&
      y1 <= bottom
    )
      return true;


    if (
      x2 >= left &&
      x2 <= right &&
      y2 >= top &&
      y2 <= bottom
    )
      return true;


    /*
     * Check each rectangle edge.
     */

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

    const denominator =
      (
        (y4 - y3) *
        (x2 - x1)
      ) -
      (
        (x4 - x3) *
        (y2 - y1)
      );


    if (
      Math.abs(
        denominator
      ) < 0.000001
    ) {

      return false;
    }


    const ua =
      (
        (x4 - x3) *
        (y1 - y3) -
        (y4 - y3) *
        (x1 - x3)
      ) /
      denominator;


    const ub =
      (
        (x2 - x1) *
        (y1 - y3) -
        (y2 - y1) *
        (x1 - x3)
      ) /
      denominator;


    return (
      ua >= 0 &&
      ua <= 1 &&
      ub >= 0 &&
      ub <= 1
    );
  }


  /* =========================================================
     HELPERS
     ========================================================= */

  normalizeAngle(
    angle
  ) {

    while (
      angle >
      Math.PI
    ) {

      angle -=
        Math.PI * 2;
    }


    while (
      angle <
      -Math.PI
    ) {

      angle +=
        Math.PI * 2;
    }


    return angle;
  }


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


  send(
    socket,
    data
  ) {

    try {

      socket.send(
        JSON.stringify(
          data
        )
      );

    } catch {}
  }


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
        id ===
        exclude
      )
        continue;


      try {

        socket.send(
          raw
        );

      } catch {}
    }
  }


  snapshot(
    room
  ) {

    return {

      type:
        "state",

      players:
        [
          ...room.players
            .values()
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

            aux:
              player.aux,

            reloadLevel:
              player.reloadLevel,

            fireLevel:
              player.fireLevel,

            moveLevel:
              player.moveLevel,

            /*
             * Useful for the client HUD.
             */

            reloading:
              player.reloadUntil >
              Date.now()

          })
        ],

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

      map:
        this.world

    };
  }
}

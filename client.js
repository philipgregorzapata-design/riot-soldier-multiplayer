(() => {
  "use strict";

  /*
   * RIOT SOLDIER MULTIPLAYER
   * Client for the Cloudflare Worker server.
   *
   * Controls:
   *   W A S D  = movement
   *   Mouse    = aim
   *   LMB      = fire
   *
   * Classes:
   *   ASSAULTER = hold LMB, rapid fire
   *   SNIPER    = one click / one shot
   *   RPG       = one click / missile / explosion
   *   SHOTGUN   = one click / spread
   */

  window.__riotSoldierCleanup?.();
  document.getElementById("riot-soldier-battle")?.remove();

  const root = document.createElement("div");
  root.id = "riot-soldier-battle";

  root.innerHTML = `
    <style>
      #riot-soldier-battle {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 999999;
        overflow: hidden;
        font-family: Arial, Helvetica, sans-serif;
        color: #fff;
        pointer-events: none;
        user-select: none;
      }

      #riot-soldier-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
      }

      .riot-panel {
        background: rgba(10, 13, 20, .88);
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 9px;
        box-shadow: 0 8px 28px rgba(0,0,0,.35);
        backdrop-filter: blur(8px);
      }

      #riot-soldier-controls {
        position: fixed;
        left: 14px;
        bottom: 46px;
        z-index: 1000001;
        width: 220px;
        display: flex;
        flex-direction: column;
        gap: 7px;
        pointer-events: auto;
      }

      #riot-soldier-room-controls {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 9px;
      }

      .riot-label {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1.2px;
        opacity: .72;
      }

      .riot-input {
        box-sizing: border-box;
        width: 100%;
        height: 31px;
        padding: 5px 8px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.14);
        outline: none;
        background: #171b25;
        color: #fff;
        font-size: 11px;
        user-select: text;
      }

      .riot-input:focus {
        border-color: rgba(255,73,101,.8);
      }

      #riot-soldier-key {
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 800;
      }

      .riot-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }

      .riot-button {
        height: 30px;
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 6px;
        background: #171b25;
        color: #fff;
        cursor: pointer;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1px;
      }

      .riot-button:hover {
        background: #292e3b;
      }

      .riot-button:active {
        transform: translateY(1px);
      }

      #riot-soldier-join {
        background: rgba(211,48,75,.75);
      }

      #riot-soldier-join:hover {
        background: rgba(230,58,85,.95);
      }

      #riot-soldier-room {
        position: fixed;
        left: 14px;
        bottom: 375px;
        z-index: 1000001;
        min-width: 205px;
        padding: 8px 10px;
        display: none;
        pointer-events: none;
      }

      #riot-soldier-room-key {
        color: #ff536c;
        font-size: 13px;
        letter-spacing: 2px;
        font-weight: 900;
      }

      #riot-soldier-status {
        position: fixed;
        right: 12px;
        bottom: 10px;
        z-index: 1000001;
        padding: 5px 8px;
        min-width: 92px;
        text-align: center;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 1px;
        pointer-events: none;
      }

      #riot-soldier-player-list {
        position: fixed;
        left: 12px;
        top: 12px;
        z-index: 1000001;
        width: 175px;
        padding: 9px 10px;
        display: none;
        pointer-events: none;
      }

      #riot-soldier-player-title {
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1.5px;
        margin-bottom: 6px;
      }

      .riot-player-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding: 3px 0;
        font-size: 9px;
        color: rgba(255,255,255,.72);
      }

      .riot-player-row.you {
        color: #65e0a2;
      }

      .riot-player-class {
        opacity: .5;
        font-size: 8px;
      }

      #riot-soldier-player-count {
        position: fixed;
        right: 12px;
        top: 12px;
        z-index: 1000001;
        padding: 6px 8px;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 1px;
        pointer-events: none;
      }

      #riot-soldier-hud {
        position: fixed;
        left: 50%;
        bottom: 12px;
        transform: translateX(-50%);
        z-index: 1000001;
        min-width: 270px;
        padding: 8px 12px;
        text-align: center;
        pointer-events: none;
      }

      #riot-soldier-class-name {
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 2px;
      }

      #riot-soldier-hp {
        margin-top: 5px;
        height: 5px;
        border-radius: 4px;
        overflow: hidden;
        background: rgba(255,255,255,.12);
      }

      #riot-soldier-hp-fill {
        width: 100%;
        height: 100%;
        background: #52d58b;
        transition: width .12s linear;
      }

      #riot-soldier-aux {
        margin-top: 5px;
        color: #ffd45a;
        font-size: 10px;
        font-weight: 900;
      }

      #riot-soldier-upgrades {
        position: fixed;
        right: 12px;
        bottom: 42px;
        z-index: 1000001;
        width: 185px;
        padding: 9px;
        display: none;
        pointer-events: auto;
      }

      .riot-upgrade-title {
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1.4px;
        margin-bottom: 7px;
      }

      .riot-upgrade {
        width: 100%;
        height: 29px;
        margin-top: 5px;
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 6px;
        background: #171b25;
        color: #fff;
        text-align: left;
        padding: 0 8px;
        font-size: 8px;
        font-weight: 900;
        cursor: pointer;
      }

      .riot-upgrade:hover {
        background: #282e3a;
      }

      .riot-upgrade span {
        float: right;
        color: #ffd45a;
      }

      #riot-soldier-class-panel {
        position: fixed;
        left: 50%;
        top: 12px;
        transform: translateX(-50%);
        z-index: 1000001;
        display: none;
        padding: 7px;
        gap: 5px;
        pointer-events: auto;
      }

      .riot-class-button {
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 6px;
        padding: 6px 8px;
        background: #171b25;
        color: rgba(255,255,255,.75);
        cursor: pointer;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .7px;
      }

      .riot-class-button.active {
        color: #fff;
        background: rgba(211,48,75,.78);
        border-color: rgba(255,83,108,.8);
      }

      #riot-soldier-kill-feed {
        position: fixed;
        left: 14px;
        top: 205px;
        z-index: 1000001;
        pointer-events: none;
      }

      .riot-feed {
        margin-top: 4px;
        color: #ffd45a;
        font-size: 10px;
        font-weight: 900;
        text-shadow: 0 1px 5px #000;
        animation: riotFade 2.5s forwards;
      }

      @keyframes riotFade {
        0% {
          opacity: 1;
          transform: translateX(0);
        }
        70% {
          opacity: 1;
        }
        100% {
          opacity: 0;
          transform: translateX(12px);
        }
      }

      #riot-soldier-help {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000000;
        color: rgba(255,255,255,.45);
        font-size: 9px;
        letter-spacing: 1px;
        pointer-events: none;
        text-align: center;
      }

      @media (max-width: 700px) {
        #riot-soldier-controls {
          width: 180px;
        }

        #riot-soldier-player-list {
          width: 140px;
        }

        #riot-soldier-upgrades {
          width: 155px;
        }

        .riot-class-button {
          padding: 5px;
          font-size: 7px;
        }
      }
    </style>

    <canvas id="riot-soldier-canvas"></canvas>

    <div id="riot-soldier-controls" class="riot-panel">
      <div id="riot-soldier-room-controls">
        <div class="riot-label">SERVER</div>

        <input
          id="riot-soldier-server"
          class="riot-input"
          value="wss://riot-soldier-multiplayer.philipgregorzapata.workers.dev/ws"
          placeholder="wss://your-worker.workers.dev/ws"
          autocomplete="off"
          spellcheck="false"
        >

        <div class="riot-label">ROOM KEY</div>

        <input
          id="riot-soldier-key"
          class="riot-input"
          placeholder="ROOM123"
          maxlength="32"
          autocomplete="off"
          spellcheck="false"
        >

        <div class="riot-buttons">
          <button id="riot-soldier-join" class="riot-button">
            JOIN ROOM
          </button>

          <button id="riot-soldier-leave" class="riot-button">
            LEAVE
          </button>
        </div>
      </div>
    </div>

    <div id="riot-soldier-room" class="riot-panel">
      ROOM:
      <span id="riot-soldier-room-key"></span>
    </div>

    <div id="riot-soldier-status" class="riot-panel">
      OFFLINE
    </div>

    <div id="riot-soldier-player-list" class="riot-panel">
      <div id="riot-soldier-player-title">PLAYERS</div>
      <div id="riot-soldier-players"></div>
    </div>

    <div id="riot-soldier-player-count" class="riot-panel">
      PLAYERS: 0 / 10
    </div>

    <div id="riot-soldier-class-panel" class="riot-panel">
      <button class="riot-class-button active" data-class="assaulter">
        ASSAULTER
      </button>

      <button class="riot-class-button" data-class="sniper">
        SNIPER
      </button>

      <button class="riot-class-button" data-class="rpg">
        RPG
      </button>

      <button class="riot-class-button" data-class="shotgun">
        SHOTGUN
      </button>
    </div>

    <div id="riot-soldier-upgrades" class="riot-panel">
      <div class="riot-upgrade-title">
        AUX UPGRADES
      </div>

      <button class="riot-upgrade" data-upgrade="reload">
        RELOAD SPEED
        <span id="riot-reload-level">LV 0</span>
      </button>

      <button class="riot-upgrade" data-upgrade="fire">
        SHOOTING SPEED
        <span id="riot-fire-level">LV 0</span>
      </button>

      <button class="riot-upgrade" data-upgrade="move">
        MOVEMENT SPEED
        <span id="riot-move-level">LV 0</span>
      </button>
    </div>

    <div id="riot-soldier-hud" class="riot-panel">
      <div id="riot-soldier-class-name">
        ASSAULTER
      </div>

      <div id="riot-soldier-hp">
        <div id="riot-soldier-hp-fill"></div>
      </div>

      <div id="riot-soldier-aux">
        AUX: 0
      </div>
    </div>

    <div id="riot-soldier-kill-feed"></div>

    <div id="riot-soldier-help">
      W A S D &nbsp; MOVE &nbsp; • &nbsp;
      MOUSE &nbsp; AIM &nbsp; • &nbsp;
      LMB &nbsp; FIRE
    </div>
  `;

  document.body.appendChild(root);

  const canvas =
    root.querySelector("#riot-soldier-canvas");

  const ctx =
    canvas.getContext("2d");

  const serverInput =
    root.querySelector("#riot-soldier-server");

  const keyInput =
    root.querySelector("#riot-soldier-key");

  const joinButton =
    root.querySelector("#riot-soldier-join");

  const leaveButton =
    root.querySelector("#riot-soldier-leave");

  const status =
    root.querySelector("#riot-soldier-status");

  const roomBox =
    root.querySelector("#riot-soldier-room");

  const roomKeyElement =
    root.querySelector("#riot-soldier-room-key");

  const playerList =
    root.querySelector("#riot-soldier-player-list");

  const playersElement =
    root.querySelector("#riot-soldier-players");

  const playerCount =
    root.querySelector("#riot-soldier-player-count");

  const classPanel =
    root.querySelector("#riot-soldier-class-panel");

  const upgradePanel =
    root.querySelector("#riot-soldier-upgrades");

  const classNameElement =
    root.querySelector("#riot-soldier-class-name");

  const hpFill =
    root.querySelector("#riot-soldier-hp-fill");

  const auxElement =
    root.querySelector("#riot-soldier-aux");

  const reloadLevelElement =
    root.querySelector("#riot-reload-level");

  const fireLevelElement =
    root.querySelector("#riot-fire-level");

  const moveLevelElement =
    root.querySelector("#riot-move-level");

  const killFeed =
    root.querySelector("#riot-soldier-kill-feed");

  const help =
    root.querySelector("#riot-soldier-help");


  /* =========================================================
     GAME CONSTANTS
  ========================================================= */

  const WORLD_WIDTH = 5000;
  const WORLD_HEIGHT = 5000;

  const MAX_PLAYERS = 10;

  const CLASSES = {
    assaulter: {
      label: "ASSAULTER",
      color: "#42b982"
    },

    sniper: {
      label: "SNIPER",
      color: "#82b1ff"
    },

    rpg: {
      label: "RPG",
      color: "#f39b70"
    },

    shotgun: {
      label: "SHOTGUN",
      color: "#e8c878"
    }
  };


  /* =========================================================
     STATE
  ========================================================= */

  let W = window.innerWidth;
  let H = window.innerHeight;

  let dpr = 1;

  let ws = null;

  let connected = false;

  let myId = null;

  let currentRoom = null;

  let currentMap = [];

  let projectiles = [];

  let animationId = 0;

  let inputTimer = 0;

  let destroyed = false;

  let mouseX = W / 2;

  let mouseY = H / 2;

  let mouseDown = false;

  let lastMouseDown = false;

  let pulseShot = false;

  let selectedClass = "assaulter";

  let cameraX = WORLD_WIDTH / 2;

  let cameraY = WORLD_HEIGHT / 2;

  let lastStateTime = 0;

  let serverLatency = 0;

  const keys = Object.create(null);

  const players = Object.create(null);


  /* =========================================================
     HELPERS
  ========================================================= */

  function setStatus(text) {
    status.textContent = text;
  }


  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }


  function lerp(a, b, t) {
    return a + (b - a) * t;
  }


  function normalizeAngle(angle) {
    while (angle > Math.PI) {
      angle -= Math.PI * 2;
    }

    while (angle < -Math.PI) {
      angle += Math.PI * 2;
    }

    return angle;
  }


  function lerpAngle(a, b, t) {
    const diff =
      normalizeAngle(b - a);

    return a + diff * t;
  }


  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /* =========================================================
     RESIZE
  ========================================================= */

  function resize() {

    W = window.innerWidth;
    H = window.innerHeight;

    dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );

    canvas.width =
      Math.floor(W * dpr);

    canvas.height =
      Math.floor(H * dpr);

    canvas.style.width =
      W + "px";

    canvas.style.height =
      H + "px";

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );
  }


  /* =========================================================
     CONNECTION
  ========================================================= */

  function normalizeServerURL(value) {

    let url =
      String(value || "")
        .trim();

    if (!url) {
      return "";
    }

    /*
      Automatically convert the normal
      Cloudflare HTTPS worker URL to
      the WebSocket endpoint.
    */

    if (
      /^https:\/\//i.test(url)
    ) {

      url =
        url.replace(
          /^https:\/\//i,
          "wss://"
        );
    }

    else if (
      /^http:\/\//i.test(url)
    ) {

      url =
        url.replace(
          /^http:\/\//i,
          "ws://"
        );
    }


    if (
      /^wss?:\/\//i.test(url) &&
      !url.endsWith("/ws")
    ) {

      url =
        url.replace(
          /\/+$/,
          ""
        ) + "/ws";
    }


    return url;
  }


  function connect() {

    const server =
      normalizeServerURL(
        serverInput.value
      );

    const key =
      keyInput.value
        .trim()
        .toUpperCase();


    if (!server) {

      setStatus(
        "ENTER SERVER"
      );

      return;
    }


    if (!/^wss?:\/\//i.test(server)) {

      setStatus(
        "INVALID SERVER"
      );

      return;
    }


    if (!key) {

      setStatus(
        "ENTER ROOM KEY"
      );

      keyInput.focus();

      return;
    }


    closeSocket();

    clearPlayers();

    connected = false;

    myId = null;

    currentRoom = null;

    setStatus(
      "CONNECTING..."
    );


    try {

      ws =
        new WebSocket(
          server
        );

    } catch {

      setStatus(
        "INVALID SERVER"
      );

      return;
    }


    ws.onopen = () => {

      if (!ws) {
        return;
      }


      setStatus(
        "JOINING ROOM..."
      );


      send({
        type:
          "join_room",

        key
      });
    };


    ws.onmessage =
      handleServerMessage;


    ws.onerror = () => {

      setStatus(
        "SERVER ERROR"
      );
    };


    ws.onclose = () => {

      connected = false;

      myId = null;

      currentRoom = null;

      projectiles = [];

      roomBox.style.display =
        "none";

      playerList.style.display =
        "none";

      classPanel.style.display =
        "none";

      upgradePanel.style.display =
        "none";

      setStatus(
        "OFFLINE"
      );
    };
  }


  function closeSocket() {

    if (!ws) {
      return;
    }


    try {

      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;

      ws.close();

    } catch {}


    ws = null;
  }


  function send(data) {

    if (
      !ws ||
      ws.readyState !==
        WebSocket.OPEN
    ) {

      return false;
    }


    try {

      ws.send(
        JSON.stringify(data)
      );

      return true;

    } catch {

      return false;
    }
  }


  /* =========================================================
     SERVER MESSAGE
  ========================================================= */

  function handleServerMessage(event) {

    let message;


    try {

      message =
        JSON.parse(
          event.data
        );

    } catch {

      return;
    }


    if (
      message.type ===
      "joined"
    ) {

      connected = true;

      myId =
        message.player_id;

      currentRoom =
        message.room || "";

      currentMap =
        Array.isArray(
          message.map
        )
          ? message.map
          : [];


      roomKeyElement.textContent =
        currentRoom;


      roomBox.style.display =
        "block";

      playerList.style.display =
        "block";

      classPanel.style.display =
        "flex";

      upgradePanel.style.display =
        "block";

      help.style.display =
        "none";


      setStatus(
        message.is_host
          ? "ONLINE • HOST"
          : "ONLINE"
      );


      return;
    }


    if (
      message.type ===
      "state"
    ) {

      applyState(
        message
      );

      return;
    }


    if (
      message.type ===
      "hit"
    ) {

      const amount =
        Number(
          message.aux || 0
        );


      if (amount > 0) {

        addFeed(
          "+" +
          amount +
          " AUX  •  KILL"
        );
      }


      return;
    }


    if (
      message.type ===
      "player_stats"
    ) {

      const me =
        players[myId];

      if (me) {

        me.aux =
          Number(
            message.aux ??
            me.aux
          );

        me.reloadLevel =
          Number(
            message.reloadLevel ??
            me.reloadLevel ??
            0
          );

        me.fireLevel =
          Number(
            message.fireLevel ??
            me.fireLevel ??
            0
          );

        me.moveLevel =
          Number(
            message.moveLevel ??
            me.moveLevel ??
            0
          );
      }


      updateHUD();

      return;
    }


    if (
      message.type ===
      "player_left"
    ) {

      delete players[
        message.player_id
      ];

      updatePlayerList();

      return;
    }


    if (
      message.type ===
      "error"
    ) {

      setStatus(
        String(
          message.message ||
          "SERVER ERROR"
        )
      );

      return;
    }


    if (
      message.type ===
      "pong"
    ) {

      serverLatency =
        Date.now() -
        lastStateTime;

      return;
    }
  }


  /* =========================================================
     STATE
  ========================================================= */

  function applyState(message) {

    lastStateTime =
      Date.now();


    if (
      Array.isArray(
        message.map
      )
    ) {

      currentMap =
        message.map;
    }


    projectiles =
      Array.isArray(
        message.projectiles
      )
        ? message.projectiles
        : [];


    const incoming =
      Array.isArray(
        message.players
      )
        ? message.players
        : [];


    const incomingIds =
      new Set(
        incoming.map(
          p => String(p.id)
        )
      );


    Object.keys(
      players
    ).forEach(id => {

      if (
        !incomingIds.has(
          String(id)
        )
      ) {

        delete players[id];
      }
    });


    incoming.forEach(
      updatePlayer
    );


    updatePlayerList();

    updateHUD();
  }


  function updatePlayer(data) {

    if (
      !data ||
      data.id == null
    ) {

      return;
    }


    const id =
      String(data.id);


    const existing =
      players[id];


    if (!existing) {

      players[id] = {

        id,

        name:
          data.name ||
          "PLAYER",

        x:
          Number(data.x) || 0,

        y:
          Number(data.y) || 0,

        targetX:
          Number(data.x) || 0,

        targetY:
          Number(data.y) || 0,

        angle:
          Number(data.angle) || 0,

        targetAngle:
          Number(data.angle) || 0,

        hp:
          Number(data.hp) || 100,

        maxHp:
          Number(data.maxHp) || 100,

        class:
          data.class ||
          "assaulter",

        alive:
          data.alive !== false,

        aux:
          Number(data.aux) || 0,

        reloadLevel:
          Number(data.reloadLevel) || 0,

        fireLevel:
          Number(data.fireLevel) || 0,

        moveLevel:
          Number(data.moveLevel) || 0,

        reloading:
          !!data.reloading,

        deathShown:
          false
      };


      return;
    }


    existing.name =
      data.name ||
      existing.name;


    existing.targetX =
      Number.isFinite(
        Number(data.x)
      )
        ? Number(data.x)
        : existing.targetX;


    existing.targetY =
      Number.isFinite(
        Number(data.y)
      )
        ? Number(data.y)
        : existing.targetY;


    existing.targetAngle =
      Number.isFinite(
        Number(data.angle)
      )
        ? Number(data.angle)
        : existing.targetAngle;


    existing.hp =
      Number.isFinite(
        Number(data.hp)
      )
        ? Number(data.hp)
        : existing.hp;


    existing.maxHp =
      Number.isFinite(
        Number(data.maxHp)
      )
        ? Number(data.maxHp)
        : existing.maxHp;


    existing.class =
      data.class ||
      existing.class;


    existing.alive =
      data.alive !== false;


    existing.aux =
      Number.isFinite(
        Number(data.aux)
      )
        ? Number(data.aux)
        : existing.aux;


    existing.reloadLevel =
      Number(
        data.reloadLevel ??
        existing.reloadLevel ??
        0
      );


    existing.fireLevel =
      Number(
        data.fireLevel ??
        existing.fireLevel ??
        0
      );


    existing.moveLevel =
      Number(
        data.moveLevel ??
        existing.moveLevel ??
        0
      );


    existing.reloading =
      !!data.reloading;
  }


  function clearPlayers() {

    Object.keys(
      players
    ).forEach(
      id => delete players[id]
    );


    projectiles = [];

    updatePlayerList();

    updateHUD();
  }


  /* =========================================================
     PLAYER LIST
  ========================================================= */

  function updatePlayerList() {

    const list =
      Object.values(
        players
      );


    playerCount.textContent =
      `PLAYERS: ${list.length} / ${MAX_PLAYERS}`;


    playersElement.innerHTML =
      "";


    list
      .sort((a, b) => {

        if (a.id === myId) {
          return -1;
        }

        if (b.id === myId) {
          return 1;
        }

        return String(
          a.name
        ).localeCompare(
          String(b.name)
        );
      })
      .forEach(
        player => {

          const row =
            document.createElement(
              "div"
            );


          row.className =
            "riot-player-row" +
            (
              player.id === myId
                ? " you"
                : ""
            );


          const name =
            player.id === myId
              ? "YOU"
              : (
                  player.name ||
                  "PLAYER"
                );


          const cls =
            (
              player.class ||
              "assaulter"
            )
              .toUpperCase();


          row.innerHTML =
            `
              <span>
                ${escapeHTML(name)}
              </span>
              <span class="riot-player-class">
                ${escapeHTML(cls)}
              </span>
            `;


          playersElement.appendChild(
            row
          );
        }
      );
  }


  /* =========================================================
     HUD
  ========================================================= */

  function updateHUD() {

    const me =
      players[myId];


    if (!me) {
      return;
    }


    const cls =
      CLASSES[
        me.class
      ] ||
      CLASSES.assaulter;


    classNameElement.textContent =
      cls.label;


    const hp =
      clamp(
        Number(me.hp) || 0,
        0,
        Number(me.maxHp) || 100
      );


    const maxHp =
      Number(me.maxHp) || 100;


    hpFill.style.width =
      (
        hp / maxHp * 100
      ) + "%";


    auxElement.textContent =
      `AUX: ${Math.floor(
        Number(me.aux) || 0
      )}`;


    reloadLevelElement.textContent =
      `LV ${Number(
        me.reloadLevel || 0
      )}`;


    fireLevelElement.textContent =
      `LV ${Number(
        me.fireLevel || 0
      )}`;


    moveLevelElement.textContent =
      `LV ${Number(
        me.moveLevel || 0
      )}`;


    selectedClass =
      me.class ||
      selectedClass;


    updateClassButtons();
  }


  function updateClassButtons() {

    root
      .querySelectorAll(
        ".riot-class-button"
      )
      .forEach(
        button => {

          button.classList.toggle(
            "active",

            button.dataset.class ===
              selectedClass
          );
        }
      );
  }


  /* =========================================================
     CLASS SWITCH
  ========================================================= */

  function chooseClass(className) {

    if (
      !CLASSES[className]
    ) {

      return;
    }


    selectedClass =
      className;


    updateClassButtons();


    send({

      type:
        "input",

      input: {

        w: !!keys.w,

        a: !!keys.a,

        s: !!keys.s,

        d: !!keys.d,

        shooting: false
      },

      angle:
        getAimAngle(),

      class:
        selectedClass
    });
  }


  /* =========================================================
     UPGRADES
  ========================================================= */

  function buyUpgrade(upgrade) {

    if (!connected) {
      return;
    }


    send({

      type:
        "upgrade",

      upgrade
    });
  }


  /* =========================================================
     CAMERA
  ========================================================= */

  function updateCamera() {

    const me =
      players[myId];


    if (!me) {

      cameraX =
        lerp(
          cameraX,
          WORLD_WIDTH / 2,
          .08
        );

      cameraY =
        lerp(
          cameraY,
          WORLD_HEIGHT / 2,
          .08
        );

      return;
    }


    cameraX =
      lerp(
        cameraX,
        Number(me.x) || 0,
        .18
      );


    cameraY =
      lerp(
        cameraY,
        Number(me.y) || 0,
        .18
      );


    /*
      Keep camera inside world.
    */

    const halfW =
      W / 2;

    const halfH =
      H / 2;


    cameraX =
      clamp(
        cameraX,
        halfW,
        WORLD_WIDTH - halfW
      );


    cameraY =
      clamp(
        cameraY,
        halfH,
        WORLD_HEIGHT - halfH
      );
  }


  function worldToScreen(x, y) {

    return {

      x:
        x -
        cameraX +
        W / 2,

      y:
        y -
        cameraY +
        H / 2
    };
  }


  function screenToWorld(x, y) {

    return {

      x:
        x -
        W / 2 +
        cameraX,

      y:
        y -
        H / 2 +
        cameraY
    };
  }


  /* =========================================================
     AIM
  ========================================================= */

  function getAimAngle() {

    const me =
      players[myId];


    if (!me) {
      return 0;
    }


    const screen =
      worldToScreen(
        me.x,
        me.y
      );


    return Math.atan2(
      mouseY -
        screen.y,

      mouseX -
        screen.x
    );
  }


  /* =========================================================
     INPUT
  ========================================================= */

  function sendInput() {

    if (
      !connected ||
      !ws ||
      ws.readyState !==
        WebSocket.OPEN ||
      !myId
    ) {

      return;
    }


    const me =
      players[myId];


    if (!me) {
      return;
    }


    /*
      Assaulter:
        holding click stays true.

      Sniper/RPG/Shotgun:
        only send a single true pulse
        when mouse is first pressed.
    */

    const shooting =
      me.class ===
        "assaulter"
        ? mouseDown
        : pulseShot;


    send({

      type:
        "input",

      input: {

        w: !!keys.w,

        a: !!keys.a,

        s: !!keys.s,

        d: !!keys.d,

        shooting
      },

      angle:
        getAimAngle(),

      class:
        me.class ||
        selectedClass
    });


    pulseShot =
      false;


    lastMouseDown =
      mouseDown;
  }


  /* =========================================================
     SMOOTH PLAYERS
  ========================================================= */

  function updatePlayers() {

    Object.values(
      players
    ).forEach(
      player => {

        /*
          Local player position is
          server-authoritative.

          Smooth only the camera.
        */

        if (
          player.id !== myId
        ) {

          player.x =
            lerp(
              player.x,
              player.targetX,
              .24
            );


          player.y =
            lerp(
              player.y,
              player.targetY,
              .24
            );


          player.angle =
            lerpAngle(
              player.angle,
              player.targetAngle,
              .24
            );

        } else {

          /*
            Small interpolation for
            local rendering.
          */

          player.x =
            lerp(
              player.x,
              player.targetX,
              .18
            );


          player.y =
            lerp(
              player.y,
              player.targetY,
              .18
            );


          player.angle =
            lerpAngle(
              player.angle,
              player.targetAngle,
              .18
            );
        }
      }
    );
  }


  /* =========================================================
     DRAW BACKGROUND
  ========================================================= */

  function drawBackground() {

    ctx.fillStyle =
      "#080a0f";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );


    /*
      Grid.
    */

    const grid =
      100;


    const startX =
      -(
        (
          cameraX -
          W / 2
        ) %
        grid
      );


    const startY =
      -(
        (
          cameraY -
          H / 2
        ) %
        grid
      );


    ctx.strokeStyle =
      "rgba(255,255,255,.035)";

    ctx.lineWidth =
      1;


    for (
      let x = startX;
      x < W;
      x += grid
    ) {

      ctx.beginPath();

      ctx.moveTo(
        Math.round(x) + .5,
        0
      );

      ctx.lineTo(
        Math.round(x) + .5,
        H
      );

      ctx.stroke();
    }


    for (
      let y = startY;
      y < H;
      y += grid
    ) {

      ctx.beginPath();

      ctx.moveTo(
        0,
        Math.round(y) + .5
      );

      ctx.lineTo(
        W,
        Math.round(y) + .5
      );

      ctx.stroke();
    }


    /*
      World border.
    */

    const topLeft =
      worldToScreen(
        0,
        0
      );


    ctx.strokeStyle =
      "rgba(255,73,101,.25)";

    ctx.lineWidth =
      2;

    ctx.strokeRect(
      topLeft.x,
      topLeft.y,
      WORLD_WIDTH,
      WORLD_HEIGHT
    );
  }


  /* =========================================================
     DRAW OBSTACLES
  ========================================================= */

  function drawObstacles() {

    for (
      const obstacle
      of currentMap
    ) {

      if (!obstacle) {
        continue;
      }


      const p =
        worldToScreen(
          Number(obstacle.x) || 0,
          Number(obstacle.y) || 0
        );


      const w =
        Number(obstacle.w) || 0;

      const h =
        Number(obstacle.h) || 0;


      /*
        Skip objects completely
        outside the viewport.
      */

      if (
        p.x + w < 0 ||
        p.x > W ||
        p.y + h < 0 ||
        p.y > H
      ) {

        continue;
      }


      /*
        Block.
      */

      ctx.fillStyle =
        "rgba(25,29,39,.96)";

      ctx.fillRect(
        p.x,
        p.y,
        w,
        h
      );


      ctx.strokeStyle =
        "rgba(255,255,255,.13)";

      ctx.lineWidth =
        1;

      ctx.strokeRect(
        p.x + .5,
        p.y + .5,
        w - 1,
        h - 1
      );


      /*
        AUX text inside obstacle.
      */

      ctx.save();

      ctx.globalAlpha =
        .24;

      ctx.fillStyle =
        "#ffd45a";

      ctx.font =
        "900 12px Arial";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";


      const label =
        obstacle.label ||
        "AUX";


      ctx.fillText(
        label,
        p.x + w / 2,
        p.y + h / 2
      );


      ctx.restore();
    }
  }


  /* =========================================================
     DRAW RPG MISSILES
  ========================================================= */

  function drawProjectiles() {

    projectiles.forEach(
      projectile => {

        if (
          projectile.type !==
          "rpg"
        ) {

          return;
        }


        const p =
          worldToScreen(
            Number(projectile.x) || 0,
            Number(projectile.y) || 0
          );


        ctx.save();

        ctx.translate(
          p.x,
          p.y
        );


        ctx.rotate(
          Number(projectile.angle) || 0
        );


        /*
          Smoke/trail.
        */

        ctx.fillStyle =
          "rgba(255,150,80,.22)";

        ctx.beginPath();

        ctx.arc(
          -9,
          0,
          6,
          0,
          Math.PI * 2
        );

        ctx.fill();


        /*
          Missile body.
        */

        ctx.fillStyle =
          "#d6d6d6";

        ctx.fillRect(
          -5,
          -2,
          16,
          4
        );


        ctx.fillStyle =
          "#f39b70";

        ctx.beginPath();

        ctx.moveTo(
          13,
          0
        );

        ctx.lineTo(
          5,
          -4
        );

        ctx.lineTo(
          5,
          4
        );

        ctx.closePath();

        ctx.fill();


        ctx.restore();
      }
    );
  }


  /* =========================================================
     DRAW PLAYER
  ========================================================= */

  function drawPlayer(
    player,
    index
  ) {

    if (!player) {
      return;
    }


    const p =
      worldToScreen(
        Number(player.x) || 0,
        Number(player.y) || 0
      );


    /*
      Don't draw far outside
      viewport.
    */

    if (
      p.x < -100 ||
      p.x > W + 100 ||
      p.y < -100 ||
      p.y > H + 100
    ) {

      return;
    }


    const cls =
      CLASSES[
        player.class
      ] ||
      CLASSES.assaulter;


    const color =
      cls.color;


    ctx.save();

    ctx.translate(
      p.x,
      p.y
    );

    ctx.rotate(
      Number(player.angle) || 0
    );


    /*
      Shadow.
    */

    ctx.fillStyle =
      "rgba(0,0,0,.42)";

    ctx.beginPath();

    ctx.ellipse(
      0,
      13,
      16,
      7,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();


    /*
      Dead player.
    */

    if (
      player.alive === false
    ) {

      ctx.globalAlpha =
        .28;
    }


    /*
      Body.
    */

    ctx.fillStyle =
      color;

    ctx.beginPath();

    ctx.roundRect(
      -11,
      -13,
      22,
      26,
      4
    );

    ctx.fill();


    /*
      Head.
    */

    ctx.fillStyle =
      "#d7b29a";

    ctx.beginPath();

    ctx.arc(
      7,
      0,
      6,
      0,
      Math.PI * 2
    );

    ctx.fill();


    /*
      Weapon.
    */

    ctx.fillStyle =
      "#252932";

    const weaponLength =
      player.class === "sniper"
        ? 34
        : player.class === "rpg"
          ? 30
          : 25;


    ctx.fillRect(
      7,
      -2,
      weaponLength,
      4
    );


    /*
      RPG launcher shape.
    */

    if (
      player.class ===
      "rpg"
    ) {

      ctx.fillStyle =
        "#343943";

      ctx.fillRect(
        4,
        -5,
        24,
        10
      );
    }


    /*
      Shotgun double barrel.
    */

    if (
      player.class ===
      "shotgun"
    ) {

      ctx.fillStyle =
        "#22252b";

      ctx.fillRect(
        6,
        -5,
        24,
        2
      );

      ctx.fillRect(
        6,
        3,
        24,
        2
      );
    }


    ctx.restore();


    /*
      Health bar.
    */

    const hp =
      clamp(
        (
          Number(player.hp) || 0
        ) /
        (
          Number(player.maxHp) ||
          100
        ),
        0,
        1
      );


    ctx.fillStyle =
      "rgba(0,0,0,.75)";

    ctx.fillRect(
      p.x - 22,
      p.y - 30,
      44,
      4
    );


    ctx.fillStyle =
      color;

    ctx.fillRect(
      p.x - 22,
      p.y - 30,
      44 * hp,
      4
    );


    /*
      Name.
    */

    ctx.font =
      "900 9px Arial";

    ctx.textAlign =
      "center";

    ctx.fillStyle =
      player.id === myId
        ? "#65e0a2"
        : "rgba(255,255,255,.82)";


    ctx.fillText(
      player.id === myId
        ? "YOU"
        : (
            player.name ||
            "PLAYER"
          ),
      p.x,
      p.y + 27
    );


    /*
      Class marker.
    */

    ctx.font =
      "7px Arial";

    ctx.fillStyle =
      "rgba(255,255,255,.42)";


    ctx.fillText(
      (
        player.class ||
        "assaulter"
      ).toUpperCase(),
      p.x,
      p.y + 38
    );


    /*
      Local player aim line.
    */

    if (
      player.id === myId &&
      player.alive !== false
    ) {

      ctx.save();

      ctx.strokeStyle =
        "rgba(255,255,255,.08)";

      ctx.lineWidth =
        1;

      ctx.beginPath();

      ctx.moveTo(
        p.x,
        p.y
      );

      ctx.lineTo(
        p.x +
          Math.cos(player.angle) *
          65,

        p.y +
          Math.sin(player.angle) *
          65
      );

      ctx.stroke();

      ctx.restore();
    }


    /*
      Reload indicator.
    */

    if (
      player.id === myId &&
      player.reloading
    ) {

      ctx.font =
        "900 8px Arial";

      ctx.fillStyle =
        "#ffd45a";

      ctx.fillText(
        "RELOADING...",
        p.x,
        p.y - 39
      );
    }
  }


  /* =========================================================
     DRAW GAME
  ========================================================= */

  function draw() {

    if (destroyed) {
      return;
    }


    ctx.clearRect(
      0,
      0,
      W,
      H
    );


    updatePlayers();

    updateCamera();

    drawBackground();

    drawObstacles();

    drawProjectiles();


    const list =
      Object.values(
        players
      );


    list.forEach(
      (player, index) => {

        drawPlayer(
          player,
          index
        );
      }
    );


    /*
      Crosshair.
    */

    if (connected) {

      drawCrosshair();
    }


    animationId =
      requestAnimationFrame(
        draw
      );
  }


  /* =========================================================
     CROSSHAIR
  ========================================================= */

  function drawCrosshair() {

    const size =
      7;


    ctx.save();

    ctx.strokeStyle =
      "rgba(255,255,255,.7)";

    ctx.lineWidth =
      1;


    ctx.beginPath();

    ctx.moveTo(
      mouseX - size,
      mouseY
    );

    ctx.lineTo(
      mouseX - 2,
      mouseY
    );


    ctx.moveTo(
      mouseX + 2,
      mouseY
    );

    ctx.lineTo(
      mouseX + size,
      mouseY
    );


    ctx.moveTo(
      mouseX,
      mouseY - size
    );

    ctx.lineTo(
      mouseX,
      mouseY - 2
    );


    ctx.moveTo(
      mouseX,
      mouseY + 2
    );

    ctx.lineTo(
      mouseX,
      mouseY + size
    );


    ctx.stroke();

    ctx.restore();
  }


  /* =========================================================
     KILL FEED
  ========================================================= */

  function addFeed(text) {

    const item =
      document.createElement(
        "div"
      );


    item.className =
      "riot-feed";


    item.textContent =
      text;


    killFeed.appendChild(
      item
    );


    window.setTimeout(
      () => item.remove(),
      2600
    );


    /*
      Prevent the feed from growing.
    */

    while (
      killFeed.children.length >
      5
    ) {

      killFeed.firstChild.remove();
    }
  }


  /* =========================================================
     LEAVE
  ========================================================= */

  function leave() {

    mouseDown =
      false;

    pulseShot =
      false;

    connected =
      false;

    myId =
      null;

    currentRoom =
      null;

    closeSocket();

    clearPlayers();


    roomBox.style.display =
      "none";

    playerList.style.display =
      "none";

    classPanel.style.display =
      "none";

    upgradePanel.style.display =
      "none";


    help.style.display =
      "block";


    setStatus(
      "OFFLINE"
    );
  }


  /* =========================================================
     KEYBOARD
  ========================================================= */

  function onKeyDown(event) {

    /*
      Don't steal letters/numbers
      while typing the room key.
    */

    if (
      event.target ===
        keyInput ||
      event.target ===
        serverInput
    ) {

      return;
    }


    const key =
      event.key.toLowerCase();


    if (
      [
        "w",
        "a",
        "s",
        "d"
      ].includes(key)
    ) {

      keys[key] =
        true;

      event.preventDefault();
    }
  }


  function onKeyUp(event) {

    if (
      event.target ===
        keyInput ||
      event.target ===
        serverInput
    ) {

      return;
    }


    const key =
      event.key.toLowerCase();


    if (
      [
        "w",
        "a",
        "s",
        "d"
      ].includes(key)
    ) {

      keys[key] =
        false;

      event.preventDefault();
    }
  }


  /* =========================================================
     MOUSE
  ========================================================= */

  function onMouseMove(event) {

    mouseX =
      event.clientX;

    mouseY =
      event.clientY;
  }


  function onMouseDown(event) {

    /*
      Never let the game background
      steal a click from UI controls.
    */

    if (
      event.target.closest(
        "#riot-soldier-controls"
      ) ||

      event.target.closest(
        "#riot-soldier-upgrades"
      ) ||

      event.target.closest(
        "#riot-soldier-class-panel"
      ) ||

      event.target.closest(
        "input"
      ) ||

      event.target.closest(
        "button"
      )
    ) {

      return;
    }


    if (
      event.button !== 0
    ) {

      return;
    }


    if (!connected) {
      return;
    }


    mouseDown =
      true;


    const me =
      players[myId];


    if (!me) {
      return;
    }


    /*
      Only Assaulter uses continuous
      fire.

      The other classes use a pulse,
      giving one click = one shot.
    */

    if (
      me.class !==
      "assaulter"
    ) {

      pulseShot =
        true;
    }
  }


  function onMouseUp(event) {

    if (
      event.button === 0
    ) {

      mouseDown =
        false;

      pulseShot =
        false;
    }
  }


  /* =========================================================
     ROOM KEY INPUT
  ========================================================= */

  function onKeyInput() {

    /*
      IMPORTANT:
      Letters AND numbers are allowed.
    */

    keyInput.value =
      keyInput.value
        .toUpperCase()
        .replace(
          /[^A-Z0-9-]/g,
          ""
        )
        .slice(
          0,
          32
        );
  }


  /* =========================================================
     PREVENT BACKGROUND CLICK
  ========================================================= */

  function onContextMenu(event) {

    if (
      event.target ===
      canvas
    ) {

      event.preventDefault();
    }
  }


  /* =========================================================
     CLASS BUTTONS
  ========================================================= */

  root
    .querySelectorAll(
      ".riot-class-button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            chooseClass(
              button.dataset.class
            );
          }
        );
      }
    );


  /* =========================================================
     UPGRADE BUTTONS
  ========================================================= */

  root
    .querySelectorAll(
      ".riot-upgrade"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            buyUpgrade(
              button.dataset.upgrade
            );
          }
        );
      }
    );


  /* =========================================================
     ROOM BUTTONS
  ========================================================= */

  joinButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      connect();
    }
  );


  leaveButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      leave();
    }
  );


  keyInput.addEventListener(
    "input",
    onKeyInput
  );


  /*
    Enter in room key joins.
  */

  keyInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        event.preventDefault();

        connect();
      }
    }
  );


  /* =========================================================
     WINDOW EVENTS
  ========================================================= */

  window.addEventListener(
    "resize",
    resize
  );


  document.addEventListener(
    "keydown",
    onKeyDown,
    true
  );


  document.addEventListener(
    "keyup",
    onKeyUp,
    true
  );


  document.addEventListener(
    "mousemove",
    onMouseMove
  );


  document.addEventListener(
    "mousedown",
    onMouseDown
  );


  document.addEventListener(
    "mouseup",
    onMouseUp
  );


  document.addEventListener(
    "contextmenu",
    onContextMenu
  );


  /* =========================================================
     INPUT LOOP
  ========================================================= */

  inputTimer =
    window.setInterval(
      () => {

        if (connected) {

          sendInput();
        }
      },
      50
    );


  /* =========================================================
     CLEANUP
  ========================================================= */

  window.__riotSoldierCleanup =
    () => {

      destroyed =
        true;


      cancelAnimationFrame(
        animationId
      );


      clearInterval(
        inputTimer
      );


      window.removeEventListener(
        "resize",
        resize
      );


      document.removeEventListener(
        "keydown",
        onKeyDown,
        true
      );


      document.removeEventListener(
        "keyup",
        onKeyUp,
        true
      );


      document.removeEventListener(
        "mousemove",
        onMouseMove
      );


      document.removeEventListener(
        "mousedown",
        onMouseDown
      );


      document.removeEventListener(
        "mouseup",
        onMouseUp
      );


      document.removeEventListener(
        "contextmenu",
        onContextMenu
      );


      closeSocket();

      root.remove();

      delete window.__riotSoldierCleanup;
    };


  /* =========================================================
     START
  ========================================================= */

  resize();

  updatePlayerList();

  setStatus(
    "OFFLINE"
  );


  console.log(
    "%cRIOT SOLDIER",
    "color:#ff4965;font-weight:900;font-size:18px"
  );

  console.log(
    "Client loaded. Server:",
    serverInput.value
  );

  draw();

})();

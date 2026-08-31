(() => {
  "use strict";

  // RIOT SOLDIER MULTIPLAYER
  // Transparent overlay client for the existing Riot dashboard.
  // The Riot page remains visible underneath. The game world is fixed to
  // the browser viewport; server-world coordinates are fitted into it.

  window.__riotSoldierCleanup?.();
  document.getElementById("riot-soldier-battle")?.remove();

  const SERVER_URL =
    "wss://riot-soldier-multiplayer.philipgregorzapata.workers.dev/ws";

  const WORLD_WIDTH = 5000;
  const WORLD_HEIGHT = 5000;
  const MAX_PLAYERS = 10;

  const CLASSES = {
    assaulter: { label: "ASSAULTER", color: "#e3485c" },
    sniper:    { label: "SNIPER",    color: "#82b1ff" },
    rpg:       { label: "RPG",       color: "#e8c878" },
    shotgun:   { label: "SHOTGUN",   color: "#f39b70" }
  };

  const root = document.createElement("div");
  root.id = "riot-soldier-battle";

  root.innerHTML = `
    <style>
      #riot-soldier-battle {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483000;
        overflow: hidden;
        pointer-events: none;
        font-family: Arial, Helvetica, sans-serif;
      }

      #riot-soldier-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
      }

      #riot-soldier-battle.game-active #riot-soldier-canvas {
        pointer-events: auto;
        cursor: crosshair;
      }

      .rs-ui {
        box-sizing: border-box;
        color: rgba(255,255,255,.92);
        background: rgba(18,20,29,.72);
        border: 1px solid rgba(255,255,255,.10);
        box-shadow: 0 5px 20px rgba(0,0,0,.18);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      #rs-controls {
        position: fixed;
        left: 14px;
        bottom: 14px;
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        pointer-events: auto;
      }

      #rs-room-controls {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      #rs-room-key {
        width: 142px;
        height: 29px;
        padding: 0 9px;
        border-radius: 6px;
        outline: none;
        border: 1px solid rgba(255,255,255,.13);
        background: rgba(12,14,21,.78);
        color: #fff;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 11px;
        font-weight: 700;
        pointer-events: auto;
      }

      #rs-room-key::placeholder {
        color: rgba(255,255,255,.38);
      }

      #rs-room-key:focus {
        border-color: rgba(227,72,92,.75);
      }

      .rs-row {
        display: flex;
        gap: 5px;
        align-items: center;
      }

      .rs-button {
        height: 29px;
        padding: 0 10px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(18,21,30,.82);
        color: rgba(255,255,255,.92);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .8px;
        cursor: pointer;
      }

      .rs-button:hover {
        background: rgba(215,48,76,.82);
      }

      #rs-leave {
        display: none;
      }

      #rs-status {
        padding: 5px 8px;
        border-radius: 5px;
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .7px;
        color: rgba(255,255,255,.70);
        white-space: nowrap;
      }

      #rs-room {
        display: none;
        position: fixed;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 20;
        padding: 5px 9px;
        border-radius: 5px;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1px;
        pointer-events: none;
      }

      #rs-room span {
        color: #ff4965;
      }

      #rs-players {
        display: none;
        position: fixed;
        left: 14px;
        top: 14px;
        z-index: 20;
        width: 150px;
        padding: 8px 9px;
        border-radius: 7px;
        pointer-events: none;
      }

      #rs-players-title {
        color: rgba(255,255,255,.90);
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 1.2px;
        margin-bottom: 5px;
      }

      .rs-player {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        padding: 2px 0;
        font-size: 8px;
        color: rgba(255,255,255,.62);
      }

      .rs-player.you {
        color: #42b982;
      }

      #rs-hud {
        display: none;
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 20;
        min-width: 175px;
        padding: 8px 10px;
        border-radius: 7px;
        pointer-events: auto;
      }

      #rs-hud-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
      }

      #rs-class-label {
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1px;
      }

      #rs-aux {
        color: #e8c878;
        font-size: 11px;
        font-weight: 900;
      }

      #rs-kill-note {
        margin-top: 3px;
        min-height: 10px;
        color: rgba(255,255,255,.68);
        font-size: 8px;
        font-weight: 700;
      }

      #rs-upgrades {
        display: flex;
        gap: 4px;
        margin-top: 6px;
      }

      .rs-upgrade {
        flex: 1;
        padding: 5px 4px;
        border-radius: 5px;
        border: 1px solid rgba(255,255,255,.09);
        background: rgba(0,0,0,.20);
        color: rgba(255,255,255,.76);
        font-size: 7px;
        font-weight: 800;
        cursor: pointer;
      }

      .rs-upgrade:hover {
        background: rgba(255,255,255,.10);
      }

      #rs-class {
        display: none;
        position: fixed;
        left: 14px;
        bottom: 83px;
        z-index: 20;
        pointer-events: auto;
      }

      #rs-class-title {
        margin-bottom: 4px;
        color: rgba(255,255,255,.58);
        font-size: 7px;
        font-weight: 900;
        letter-spacing: 1.1px;
      }

      #rs-class-buttons {
        display: flex;
        gap: 4px;
      }

      .rs-class-button {
        padding: 6px 7px;
        border-radius: 5px;
        border: 1px solid rgba(255,255,255,.09);
        background: rgba(18,20,29,.72);
        color: rgba(255,255,255,.68);
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .4px;
        cursor: pointer;
      }

      .rs-class-button:hover,
      .rs-class-button.active {
        color: #fff;
        border-color: rgba(227,72,92,.65);
        background: rgba(227,72,92,.28);
      }

      #rs-aux-popup {
        position: fixed;
        left: 14px;
        bottom: 126px;
        z-index: 20;
        display: none;
        padding: 4px 7px;
        border-radius: 5px;
        color: #e8c878;
        background: rgba(18,20,29,.68);
        border: 1px solid rgba(232,200,120,.18);
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .5px;
        pointer-events: none;
      }

      #rs-respawn {
        display: none;
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%,-50%);
        z-index: 20;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1px;
        pointer-events: none;
      }

      @media (max-width: 700px) {
        #rs-players {
          width: 125px;
        }

        #rs-hud {
          min-width: 145px;
        }

        .rs-class-button {
          padding: 5px 5px;
          font-size: 6px;
        }
      }
    </style>

    <canvas id="riot-soldier-canvas"></canvas>

    <div id="rs-controls">
      <div id="rs-room-controls">
        <input id="rs-room-key"
          maxlength="32"
          autocomplete="off"
          spellcheck="false"
          placeholder="ROOM KEY">
        <div class="rs-row">
          <button id="rs-join" class="rs-button">JOIN ROOM</button>
          <button id="rs-leave" class="rs-button">LEAVE</button>
          <div id="rs-status" class="rs-ui">OFFLINE</div>
        </div>
      </div>
    </div>

    <div id="rs-room" class="rs-ui">
      ROOM: <span id="rs-room-value"></span>
    </div>

    <div id="rs-players" class="rs-ui">
      <div id="rs-players-title">PLAYERS <span id="rs-count">0/10</span></div>
      <div id="rs-player-list"></div>
    </div>

    <div id="rs-hud" class="rs-ui">
      <div id="rs-hud-top">
        <div id="rs-class-label">ASSAULTER</div>
        <div id="rs-aux">AUX 0</div>
      </div>
      <div id="rs-kill-note"></div>
      <div id="rs-upgrades">
        <button class="rs-upgrade" data-upgrade="reload">RELOAD<br>LV 0</button>
        <button class="rs-upgrade" data-upgrade="fire">FIRE<br>LV 0</button>
        <button class="rs-upgrade" data-upgrade="move">MOVE<br>LV 0</button>
      </div>
    </div>

    <div id="rs-class">
      <div id="rs-class-title">CLASS</div>
      <div id="rs-class-buttons">
        <button class="rs-class-button active" data-class="assaulter">ASSAULT</button>
        <button class="rs-class-button" data-class="sniper">SNIPER</button>
        <button class="rs-class-button" data-class="rpg">RPG</button>
        <button class="rs-class-button" data-class="shotgun">SHOTGUN</button>
      </div>
    </div>

    <div id="rs-aux-popup"></div>
    <div id="rs-respawn" class="rs-ui">RESPAWNING...</div>
  `;

  document.body.appendChild(root);

  const canvas = root.querySelector("#riot-soldier-canvas");
  const ctx = canvas.getContext("2d");

  const roomKeyInput = root.querySelector("#rs-room-key");
  const joinButton = root.querySelector("#rs-join");
  const leaveButton = root.querySelector("#rs-leave");
  const statusEl = root.querySelector("#rs-status");

  const roomEl = root.querySelector("#rs-room");
  const roomValueEl = root.querySelector("#rs-room-value");

  const playersEl = root.querySelector("#rs-players");
  const playerListEl = root.querySelector("#rs-player-list");
  const countEl = root.querySelector("#rs-count");

  const hudEl = root.querySelector("#rs-hud");
  const classLabelEl = root.querySelector("#rs-class-label");
  const auxEl = root.querySelector("#rs-aux");
  const killNoteEl = root.querySelector("#rs-kill-note");

  const classEl = root.querySelector("#rs-class");
  const auxPopupEl = root.querySelector("#rs-aux-popup");
  const respawnEl = root.querySelector("#rs-respawn");

  let W = window.innerWidth;
  let H = window.innerHeight;
  let dpr = 1;

  let ws = null;
  let connected = false;
  let myId = null;
  let roomKey = null;

  let worldMap = [];
  let worldProjectiles = [];
  let visualProjectiles = [];
  let explosions = [];

  const players = Object.create(null);
  const keys = Object.create(null);

  let mouseX = W / 2;
  let mouseY = H / 2;
  let mouseDown = false;

  let selectedClass = "assaulter";
  let myAux = 0;
  let myReloadLevel = 0;
  let myFireLevel = 0;
  let myMoveLevel = 0;

  let auxPopupTimer = 0;
  let killNoteTimer = 0;
  let animationId = 0;
  let inputTimer = 0;
  let destroyed = false;

  const palette = [
    "#42b982", "#e3485c", "#82b1ff", "#e8c878", "#f39b70",
    "#b58cff", "#5bd7d0", "#ff8ca1", "#d2e66e", "#ff9b52"
  ];

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function resize() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /*
   * Fit the complete server world into the visible browser area.
   * There is deliberately NO camera and NO scrolling.
   */
  function worldViewport() {
    const marginX = Math.min(28, W * 0.02);
    const marginY = Math.min(70, H * 0.07);

    const availableW = Math.max(100, W - marginX * 2);
    const availableH = Math.max(100, H - marginY * 2);

    const scale = Math.min(
      availableW / WORLD_WIDTH,
      availableH / WORLD_HEIGHT
    );

    const mapW = WORLD_WIDTH * scale;
    const mapH = WORLD_HEIGHT * scale;

    return {
      x: (W - mapW) / 2,
      y: (H - mapH) / 2,
      w: mapW,
      h: mapH,
      scale
    };
  }

  function worldToScreen(x, y) {
    const v = worldViewport();
    return {
      x: v.x + x * v.scale,
      y: v.y + y * v.scale
    };
  }

  function screenToWorld(x, y) {
    const v = worldViewport();
    return {
      x: (x - v.x) / v.scale,
      y: (y - v.y) / v.scale
    };
  }

  function normalizePlayer(data) {
    return {
      id: data.id,
      name: data.name || "PLAYER",
      x: Number.isFinite(data.x) ? data.x : WORLD_WIDTH / 2,
      y: Number.isFinite(data.y) ? data.y : WORLD_HEIGHT / 2,
      targetX: Number.isFinite(data.x) ? data.x : WORLD_WIDTH / 2,
      targetY: Number.isFinite(data.y) ? data.y : WORLD_HEIGHT / 2,
      angle: Number.isFinite(data.angle) ? data.angle : 0,
      targetAngle: Number.isFinite(data.angle) ? data.angle : 0,
      hp: Number.isFinite(data.hp) ? data.hp : 100,
      maxHp: Number.isFinite(data.maxHp) ? data.maxHp : 100,
      class: data.class || "assaulter",
      alive: data.alive !== false,
      aux: Number.isFinite(data.aux) ? data.aux : 0,
      reloadLevel: Number(data.reloadLevel || 0),
      fireLevel: Number(data.fireLevel || 0),
      moveLevel: Number(data.moveLevel || 0),
      reloading: !!data.reloading
    };
  }

  function updatePlayer(data) {
    if (!data || data.id == null) return;

    const id = String(data.id);
    const p = players[id];

    if (!p) {
      players[id] = normalizePlayer(data);
      return;
    }

    p.name = data.name || p.name;
    if (Number.isFinite(data.x)) p.targetX = data.x;
    if (Number.isFinite(data.y)) p.targetY = data.y;
    if (Number.isFinite(data.angle)) p.targetAngle = data.angle;
    if (Number.isFinite(data.hp)) p.hp = data.hp;
    if (Number.isFinite(data.maxHp)) p.maxHp = data.maxHp;
    if (data.class) p.class = data.class;
    p.alive = data.alive !== false;

    if (Number.isFinite(data.aux)) p.aux = data.aux;
    if (Number.isFinite(data.reloadLevel)) p.reloadLevel = data.reloadLevel;
    if (Number.isFinite(data.fireLevel)) p.fireLevel = data.fireLevel;
    if (Number.isFinite(data.moveLevel)) p.moveLevel = data.moveLevel;
    if ("reloading" in data) p.reloading = !!data.reloading;
  }

  function applyMyStats(data) {
    if (!data) return;

    if (Number.isFinite(data.aux)) myAux = data.aux;
    if (Number.isFinite(data.reloadLevel)) myReloadLevel = data.reloadLevel;
    if (Number.isFinite(data.fireLevel)) myFireLevel = data.fireLevel;
    if (Number.isFinite(data.moveLevel)) myMoveLevel = data.moveLevel;

    const me = players[myId];
    if (me) {
      me.aux = myAux;
      me.reloadLevel = myReloadLevel;
      me.fireLevel = myFireLevel;
      me.moveLevel = myMoveLevel;
    }

    updateHud();
  }

  function updateHud() {
    const me = players[myId];

    const cls = me?.class || selectedClass;
    selectedClass = cls;

    classLabelEl.textContent =
      CLASSES[cls]?.label || String(cls).toUpperCase();

    auxEl.textContent = `AUX ${myAux}`;

    root.querySelector('[data-upgrade="reload"]').innerHTML =
      `RELOAD<br>LV ${myReloadLevel}`;

    root.querySelector('[data-upgrade="fire"]').innerHTML =
      `FIRE<br>LV ${myFireLevel}`;

    root.querySelector('[data-upgrade="move"]').innerHTML =
      `MOVE<br>LV ${myMoveLevel}`;

    root.querySelectorAll(".rs-class-button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.class === cls);
    });
  }

  function updatePlayerList() {
    const list = Object.values(players);

    countEl.textContent = `${list.length}/${MAX_PLAYERS}`;
    playerListEl.innerHTML = "";

    list.forEach((p, index) => {
      const row = document.createElement("div");
      row.className = "rs-player" + (p.id === myId ? " you" : "");

      const left = document.createElement("span");
      left.textContent =
        `${index + 1}. ${p.id === myId ? "YOU" : (p.name || "PLAYER")}`;

      const right = document.createElement("span");
      right.textContent =
        CLASSES[p.class]?.label?.slice(0, 3) || "???";

      row.appendChild(left);
      row.appendChild(right);
      playerListEl.appendChild(row);
    });
  }

  function setGameActive(active) {
    root.classList.toggle("game-active", active);

    roomEl.style.display = active ? "block" : "none";
    playersEl.style.display = active ? "block" : "none";
    hudEl.style.display = active ? "block" : "none";
    classEl.style.display = active ? "block" : "none";
    leaveButton.style.display = active ? "inline-block" : "none";
    joinButton.style.display = active ? "none" : "inline-block";

    // Before joining, the game layer cannot intercept the Riot dashboard.
    // After joining, the transparent overlay captures mouse interaction.
    root.style.pointerEvents = active ? "auto" : "none";

    // Restore interaction for the small pre-game controls.
    if (!active) {
      root.style.pointerEvents = "none";
      document.body.style.cursor = "";
    } else {
      document.body.style.cursor = "";
    }
  }

  function clearPlayers() {
    for (const id of Object.keys(players)) delete players[id];
    worldProjectiles = [];
    updatePlayerList();
  }

  function closeSocket() {
    if (!ws) return;

    try {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
    } catch {}

    ws = null;
  }

  function showAuxPopup(amount) {
    auxPopupEl.textContent = `+${amount} AUX`;
    auxPopupEl.style.display = "block";

    clearTimeout(auxPopupTimer);
    auxPopupTimer = setTimeout(() => {
      auxPopupEl.style.display = "none";
    }, 1400);
  }

  function showKillNote(text) {
    killNoteEl.textContent = text;

    clearTimeout(killNoteTimer);
    killNoteTimer = setTimeout(() => {
      killNoteEl.textContent = "";
    }, 2200);
  }

  function joinRoom() {
    const key = roomKeyInput.value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 32);

    roomKeyInput.value = key;

    if (!key) {
      setStatus("ENTER ROOM KEY");
      roomKeyInput.focus();
      return;
    }

    closeSocket();
    clearPlayers();

    connected = false;
    myId = null;
    roomKey = null;
    myAux = 0;
    myReloadLevel = 0;
    myFireLevel = 0;
    myMoveLevel = 0;

    setStatus("CONNECTING...");

    try {
      ws = new WebSocket(SERVER_URL);
    } catch {
      setStatus("INVALID SERVER");
      return;
    }

    ws.onopen = () => {
      if (!ws) return;

      setStatus("JOINING ROOM...");

      ws.send(JSON.stringify({
        type: "join_room",
        key
      }));
    };

    ws.onmessage = event => {
      let message;

      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === "joined") {
        connected = true;
        myId = String(message.player_id);
        roomKey = message.room || key;

        roomValueEl.textContent = roomKey;
        setStatus(message.is_host ? "ONLINE HOST" : "ONLINE");

        if (Array.isArray(message.map)) {
          worldMap = message.map;
        }

        setGameActive(true);
        updatePlayerList();
        updateHud();

        console.log(
          "[RIOT SOLDIER] joined",
          roomKey,
          myId
        );
        return;
      }

      if (message.type === "state") {
        const incoming = Array.isArray(message.players)
          ? message.players
          : [];

        const ids = new Set(incoming.map(p => String(p.id)));

        for (const id of Object.keys(players)) {
          if (!ids.has(String(id))) delete players[id];
        }

        incoming.forEach(updatePlayer);

        if (Array.isArray(message.projectiles)) {
          const next = message.projectiles;
          const nextIds = new Set(next.map(p => String(p.id)));
          for (const old of worldProjectiles) {
            if (old?.type === "rpg" && old?.id && !nextIds.has(String(old.id))) {
              createRpgExplosion(old.x, old.y);
            }
          }
          worldProjectiles = next;
        }

        if (Array.isArray(message.map)) {
          worldMap = message.map;
        }

        const me = players[myId];

        if (me) {
          myAux = Number(me.aux || 0);
          myReloadLevel = Number(me.reloadLevel || 0);
          myFireLevel = Number(me.fireLevel || 0);
          myMoveLevel = Number(me.moveLevel || 0);
          selectedClass = me.class || selectedClass;
        }

        updatePlayerList();
        updateHud();
        return;
      }

      if (message.type === "player_joined" && message.player) {
        updatePlayer(message.player);
        updatePlayerList();
        return;
      }

      if (message.type === "player_left") {
        delete players[String(message.player_id)];
        updatePlayerList();
        return;
      }

      if (message.type === "player_input") {
        const p = players[String(message.player_id)];
        if (!p) return;

        if (Number.isFinite(message.x)) p.targetX = message.x;
        if (Number.isFinite(message.y)) p.targetY = message.y;
        if (Number.isFinite(message.angle)) p.targetAngle = message.angle;
        if (message.class) p.class = message.class;
        return;
      }

      if (message.type === "player_stats") {
        if (String(message.player_id) === String(myId)) {
          applyMyStats(message);
        }
        return;
      }

      if (message.type === "hit") {
        if (String(message.killer_id) === String(myId)) {
          const amount = Number(message.aux || 10);
          myAux = Number(message.auxTotal ?? myAux + amount);

          showAuxPopup(amount);
          showKillNote(
            `KILL +${amount} AUX${message.weapon ? ` • ${String(message.weapon).toUpperCase()}` : ""}`
          );

          updateHud();
        }
        return;
      }

      if (message.type === "error") {
        setStatus(String(message.message || "ERROR"));

        if (!connected) {
          setGameActive(false);
        }
        return;
      }

      if (message.type === "pong") {
        return;
      }
    };

    ws.onerror = () => {
      setStatus("SERVER ERROR");
    };

    ws.onclose = () => {
      if (destroyed) return;

      connected = false;
      myId = null;
      roomKey = null;
      mouseDown = false;

      clearPlayers();
      setGameActive(false);
      setStatus("OFFLINE");
    };
  }

  function leaveRoom() {
    mouseDown = false;
    keys.w = keys.a = keys.s = keys.d = false;

    closeSocket();

    connected = false;
    myId = null;
    roomKey = null;

    clearPlayers();

    setGameActive(false);
    setStatus("OFFLINE");
  }

  function sendInput() {
    if (
      !connected ||
      !ws ||
      ws.readyState !== WebSocket.OPEN ||
      !myId
    ) return;

    const me = players[myId];
    if (!me) return;

    const input = {
      w: !!keys.w,
      a: !!keys.a,
      s: !!keys.s,
      d: !!keys.d,
      shooting: !!mouseDown
    };

    const target = screenToWorld(mouseX, mouseY);

    const angle = Math.atan2(
      target.y - me.y,
      target.x - me.x
    );

    try {
      ws.send(JSON.stringify({
        type: "input",
        input,
        angle,
        class: selectedClass
      }));
    } catch {
      setStatus("SEND FAILED");
    }
  }

  function chooseClass(className) {
    if (!CLASSES[className] || !connected) return;

    selectedClass = className;
    updateHud();
    sendInput();
  }

  function buyUpgrade(upgrade) {
    if (!connected || !ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      ws.send(JSON.stringify({
        type: "upgrade",
        upgrade
      }));
    } catch {}
  }

  function lerpAngle(a, b, amount) {
    let diff = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
    return a + diff * amount;
  }

  function updatePlayers() {
    for (const p of Object.values(players)) {
      if (p.id === myId) {
        // Local player follows authoritative server state without camera movement.
        p.x += (p.targetX - p.x) * 0.30;
        p.y += (p.targetY - p.y) * 0.30;
      } else {
        p.x += (p.targetX - p.x) * 0.22;
        p.y += (p.targetY - p.y) * 0.22;
      }

      p.angle = lerpAngle(p.angle, p.targetAngle, 0.25);
    }
  }

  function drawMap() {
    const v = worldViewport();

    // Very subtle map framing only. No opaque game background is added.
    ctx.save();

    ctx.beginPath();
    ctx.rect(v.x, v.y, v.w, v.h);
    ctx.clip();

    // Subtle grid that blends into the existing dashboard.
    ctx.strokeStyle = "rgba(255,255,255,.045)";
    ctx.lineWidth = 1;

    const grid = 250;

    for (let x = 0; x <= WORLD_WIDTH; x += grid) {
      const sx = v.x + x * v.scale;
      ctx.beginPath();
      ctx.moveTo(sx, v.y);
      ctx.lineTo(sx, v.y + v.h);
      ctx.stroke();
    }

    for (let y = 0; y <= WORLD_HEIGHT; y += grid) {
      const sy = v.y + y * v.scale;
      ctx.beginPath();
      ctx.moveTo(v.x, sy);
      ctx.lineTo(v.x + v.w, sy);
      ctx.stroke();
    }

    // Random server-generated AUX blocks.
    for (const ob of worldMap) {
      if (!ob) continue;

      const sx = v.x + Number(ob.x || 0) * v.scale;
      const sy = v.y + Number(ob.y || 0) * v.scale;
      const sw = Math.max(4, Number(ob.w || 100) * v.scale);
      const sh = Math.max(4, Number(ob.h || 80) * v.scale);

      ctx.fillStyle = "rgba(30,33,43,.34)";
      ctx.strokeStyle = "rgba(232,200,120,.22)";
      ctx.lineWidth = 1;

      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeRect(sx, sy, sw, sh);

      ctx.fillStyle = "rgba(232,200,120,.40)";
      ctx.font = `${Math.max(6, Math.min(10, sw / 13))}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        ob.label || "AUX",
        sx + sw / 2,
        sy + sh / 2
      );
    }

    ctx.restore();
  }

  function drawProjectile(projectile) {
    const v = worldViewport();
    const p = worldToScreen(Number(projectile.x || 0), Number(projectile.y || 0));
    const size = Math.max(3, 5.5 * Math.max(v.scale * 2.2, 0.65));

    ctx.save();
    ctx.translate(p.x, p.y);

    // Every projectile is a fast, round projectile. RPG is a larger shell.
    const r = projectile.type === "rpg" ? size * 1.65 : size;
    ctx.shadowBlur = projectile.type === "rpg" ? 16 : 10;
    ctx.shadowColor = "rgba(255,255,255,.95)";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    if (projectile.type === "rpg") {
      ctx.shadowBlur = 5;
      ctx.fillStyle = "#fff6c9";
      ctx.beginPath();
      ctx.arc(0, 0, r * .55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function spawnShotVisual(className) {
    if (!connected || !myId) return;
    const me = players[myId];
    if (!me) return;
    const origin = worldToScreen(me.x, me.y);
    const target = { x: mouseX, y: mouseY };
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const count = className === "shotgun" ? 8 : 1;
    const spread = className === "shotgun" ? 0.22 : 0;
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(uy, ux) + (count === 1 ? 0 : (i / (count - 1) - .5) * spread);
      visualProjectiles.push({
        x: origin.x + Math.cos(a) * 10,
        y: origin.y + Math.sin(a) * 10,
        vx: Math.cos(a) * (className === "shotgun" ? 26 : 34),
        vy: Math.sin(a) * (className === "shotgun" ? 26 : 34),
        life: className === "sniper" ? 9 : 13,
        radius: className === "shotgun" ? 2.2 : 2.8
      });
    }
  }

  function createRpgExplosion(x, y) {
    const pos = worldToScreen(Number(x || 0), Number(y || 0));
    const count = 18;
    const particles = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const speed = 2.5 + Math.random() * 2.5;
      particles.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 24 + Math.random() * 10 });
    }
    explosions.push({ x: pos.x, y: pos.y, radius: 3, maxRadius: 45, life: 28, particles });
  }

  function updateVisualEffects() {
    for (const b of visualProjectiles) { b.x += b.vx; b.y += b.vy; b.life--; }
    visualProjectiles = visualProjectiles.filter(b => b.life > 0);

    for (const e of explosions) {
      e.radius += (e.maxRadius - e.radius) * .18;
      e.life--;
      for (const b of e.particles) { b.x += b.vx; b.y += b.vy; b.vx *= .94; b.vy *= .94; b.life--; }
    }
    explosions = explosions.filter(e => e.life > 0);
  }

  function drawVisualEffects() {
    for (const b of visualProjectiles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, b.life / 13);
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(255,255,255,.95)";
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const e of explosions) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, e.life / 14);
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(255,255,255,.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();
      for (const b of e.particles) {
        if (b.life <= 0) continue;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawPlayer(p, index) {
    if (!p) return;

    const pos = worldToScreen(p.x, p.y);

    // If the fitted map is tiny on a very large screen, keep soldiers readable.
    const radius = Math.max(6, Math.min(13, 16 * worldViewport().scale * 2.2));
    const bodyColor =
      p.id === myId
        ? "#42b982"
        : (CLASSES[p.class]?.color || palette[index % palette.length]);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(p.angle || 0);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,.24)";
    ctx.beginPath();
    ctx.ellipse(0, radius * .85, radius * .9, radius * .42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-radius * .62, -radius, radius * 1.24, radius * 2);

    // Weapon
    ctx.fillStyle = "#17191f";
    ctx.fillRect(radius * .25, -radius * .16, radius * 1.7, Math.max(2, radius * .28));

    // Class indicator
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fillRect(-radius * .15, -radius * .62, radius * .3, radius * .3);

    if (!p.alive) {
      ctx.globalAlpha = .32;
      ctx.fillStyle = "#000";
      ctx.fillRect(-radius * .8, -radius * 1.15, radius * 1.6, radius * 2.3);
    }

    ctx.restore();

    // HP bar
    const hp = Math.max(
      0,
      Math.min(1, Number(p.hp || 0) / Math.max(1, Number(p.maxHp || 100)))
    );

    const barW = Math.max(24, radius * 3);
    const barH = 3;

    ctx.fillStyle = "rgba(0,0,0,.65)";
    ctx.fillRect(
      pos.x - barW / 2,
      pos.y - radius - 10,
      barW,
      barH
    );

    ctx.fillStyle = bodyColor;
    ctx.fillRect(
      pos.x - barW / 2,
      pos.y - radius - 10,
      barW * hp,
      barH
    );

    // Name
    ctx.font = "8px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle =
      p.id === myId
        ? "rgba(66,185,130,.95)"
        : "rgba(255,255,255,.72)";

    ctx.fillText(
      p.id === myId ? "YOU" : (p.name || "PLAYER"),
      pos.x,
      pos.y + radius + 5
    );
  }

  function draw() {
    if (destroyed) return;

    ctx.clearRect(0, 0, W, H);

    if (connected) {
      updatePlayers();
      updateVisualEffects();
      drawMap();

      for (const projectile of worldProjectiles) {
        drawProjectile(projectile);
      }
      drawVisualEffects();

      Object.values(players).forEach(drawPlayer);
    }

    animationId = requestAnimationFrame(draw);
  }

  function onRoomKeyInput() {
    // Do not block typing: every A-Z and 0-9 character is accepted.
    // Hyphens are also accepted.
    roomKeyInput.value = roomKeyInput.value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 32);
  }

  function onRoomKeyKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      joinRoom();
    }
  }

  function onKeyDown(event) {
    if (!connected) return;

    const target = event.target;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable;

    if (typing) return;

    const key = event.key.toLowerCase();

    if (["w", "a", "s", "d"].includes(key)) {
      keys[key] = true;
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    const key = event.key.toLowerCase();

    if (["w", "a", "s", "d"].includes(key)) {
      keys[key] = false;
      if (connected) event.preventDefault();
    }
  }

  function onMouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }

  function onMouseDown(event) {
    if (!connected) return;

    // Do not turn HUD/class controls into shooting clicks.
    if (event.target.closest("#rs-hud") ||
        event.target.closest("#rs-class") ||
        event.target.closest("#rs-controls")) {
      return;
    }

    if (event.button === 0) {
      mouseDown = true;
      spawnShotVisual(selectedClass);
      sendInput();
      event.preventDefault();
    }
  }

  function onMouseUp(event) {
    if (event.button === 0) {
      mouseDown = false;
    }
  }

  function onBlur() {
    mouseDown = false;
    keys.w = keys.a = keys.s = keys.d = false;
  }

  joinButton.addEventListener("click", joinRoom);
  leaveButton.addEventListener("click", leaveRoom);

  roomKeyInput.addEventListener("input", onRoomKeyInput);
  roomKeyInput.addEventListener("keydown", onRoomKeyKeyDown);

  root.querySelectorAll(".rs-class-button").forEach(btn => {
    btn.addEventListener("click", event => {
      event.preventDefault();
      chooseClass(btn.dataset.class);
    });
  });

  root.querySelectorAll(".rs-upgrade").forEach(btn => {
    btn.addEventListener("click", event => {
      event.preventDefault();
      buyUpgrade(btn.dataset.upgrade);
    });
  });

  window.addEventListener("resize", resize);
  window.addEventListener("blur", onBlur);

  // Capture only after the game is active.
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", onMouseDown, true);
  document.addEventListener("mouseup", onMouseUp, true);

  /*
   * Because the root is pointer-events:none before joining, the small
   * controls would also be unreachable. Put a transparent event shield
   * behind the controls only while disconnected.
   */
  root.style.pointerEvents = "none";
  root.querySelector("#rs-controls").style.pointerEvents = "auto";

  // When joined, the entire transparent overlay captures the page.
  // When disconnected, only the room controls can be clicked.
  const originalSetGameActive = setGameActive;
  setGameActive = function(active) {
    root.classList.toggle("game-active", active);

    roomEl.style.display = active ? "block" : "none";
    playersEl.style.display = active ? "block" : "none";
    hudEl.style.display = active ? "block" : "none";
    classEl.style.display = active ? "block" : "none";

    leaveButton.style.display = active ? "inline-block" : "none";
    joinButton.style.display = active ? "none" : "inline-block";

    if (active) {
      root.style.pointerEvents = "auto";
      canvas.style.pointerEvents = "auto";
      root.querySelector("#rs-controls").style.pointerEvents = "auto";
    } else {
      root.style.pointerEvents = "none";
      canvas.style.pointerEvents = "none";
      root.querySelector("#rs-controls").style.pointerEvents = "auto";
    }

    updateHud();
  };

  resize();
  setGameActive(false);

  inputTimer = window.setInterval(() => {
    if (connected) sendInput();
  }, 50);

  window.__riotSoldierCleanup = () => {
    destroyed = true;

    cancelAnimationFrame(animationId);
    clearInterval(inputTimer);
    clearTimeout(auxPopupTimer);
    clearTimeout(killNoteTimer);

    window.removeEventListener("resize", resize);
    window.removeEventListener("blur", onBlur);

    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mousedown", onMouseDown, true);
    document.removeEventListener("mouseup", onMouseUp, true);

    closeSocket();
    root.remove();

    delete window.__riotSoldierCleanup;
  };

  console.log(
    "%cRIOT SOLDIER%c overlay client ready",
    "color:#e3485c;font-weight:900",
    "color:inherit;font-weight:700"
  );
  console.log(
    "Room server:",
    SERVER_URL
  );

  draw();
})();

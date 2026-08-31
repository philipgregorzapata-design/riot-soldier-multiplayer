(() => {
  // Remove a previous instance cleanly.
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
        font-family: Arial, sans-serif;
        pointer-events: none;
      }

      #riot-soldier-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      #riot-soldier-controls {
        position: fixed;
        left: 16px;
        bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        z-index: 1000000;
        pointer-events: auto;
      }

      .riot-box {
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(12,15,24,.82);
        border: 1px solid rgba(255,255,255,.12);
        color: rgba(255,255,255,.92);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
        box-shadow: 0 4px 18px rgba(0,0,0,.25);
        backdrop-filter: blur(8px);
      }

      .riot-input {
        width: 180px;
        margin-left: 5px;
        padding: 6px 8px;
        border-radius: 5px;
        border: 1px solid #444;
        background: #181b24;
        color: white;
        outline: none;
      }

      #riot-soldier-key {
        width: 105px;
        text-transform: uppercase;
      }

      .riot-button {
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,.11);
        background: rgba(18,21,30,.86);
        color: rgba(255,255,255,.95);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
        cursor: pointer;
      }

      .riot-button:hover {
        background: rgba(215,48,76,.85);
      }

      #riot-soldier-status {
        min-width: 130px;
      }

      #riot-soldier-player-count {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 1000000;
      }

      #riot-soldier-room {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000000;
        display: none;
      }

      #riot-soldier-room-key {
        color: #ff4965;
      }

      #riot-soldier-list {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 1000000;
        min-width: 170px;
        display: none;
      }

      #riot-soldier-list-title {
        margin-bottom: 7px;
        color: white;
      }

      .riot-player {
        font-size: 10px;
        padding: 3px 0;
        color: rgba(255,255,255,.75);
      }

      .riot-player.you {
        color: #42b982;
      }

      #riot-soldier-controls-help {
        position: fixed; left: clamp(8px,1vw,16px); bottom: clamp(78px,9vh,105px);
        z-index: 1000001; display:none; pointer-events:none;
        color:rgba(255,255,255,.45); font-size:clamp(7px,.58vw,9px);
        line-height:1.55; letter-spacing:.35px; text-shadow:0 1px 2px rgba(0,0,0,.4);
      }
      #riot-soldier-controls-help .help-title { color:rgba(255,255,255,.65); font-weight:800; letter-spacing:1px; margin-bottom:2px; }
      #riot-soldier-controls-help b { display:inline-block; min-width:48px; color:rgba(255,255,255,.72); }

      #riot-soldier-key-display { display:none; }
      .riot-neon-bullet { filter:drop-shadow(0 0 5px #fff) drop-shadow(0 0 10px #fff); }
    </style>

    <canvas id="riot-soldier-canvas"></canvas>

    <div id="riot-soldier-controls">
      <div class="riot-box">
        SERVER
        <input
          id="riot-soldier-server"
          class="riot-input"
          placeholder="ws://YOUR-VM:8080"
        >
      </div>

      <div class="riot-box">
        KEY
        <input
          id="riot-soldier-key"
          class="riot-input"
          placeholder="ABCD-1234"
          maxlength="9"
        >
      </div>

      <button id="riot-soldier-join" class="riot-button">JOIN ROOM</button>
      <button id="riot-soldier-leave" class="riot-button">LEAVE</button>

      <div id="riot-soldier-status" class="riot-box">OFFLINE</div>
    </div>

    <div id="riot-soldier-room" class="riot-box">
      ROOM: <span id="riot-soldier-room-key"></span>
    </div>

    <div id="riot-soldier-list" class="riot-box">
      <div id="riot-soldier-list-title">PLAYERS</div>
      <div id="riot-soldier-players"></div>
    </div>

    <div id="riot-soldier-player-count" class="riot-box">
      PLAYERS: 0 / 10
    </div>

    <div id="riot-soldier-controls-help">
      <div class="help-title">CONTROLS</div>
      <div><b>W A S D</b> MOVE</div>
      <div><b>LMB</b> SHOOT</div>
      <div><b>R</b> RELOAD</div>
      <div><b>1</b> ASSAULTER</div>
      <div><b>2</b> SNIPER</div>
      <div><b>3</b> RPG</div>
      <div><b>4</b> SHOTGUN</div>
    </div>
  `;

  document.body.appendChild(root);

  const canvas = root.querySelector("#riot-soldier-canvas");
  const ctx = canvas.getContext("2d");

  const serverInput = root.querySelector("#riot-soldier-server");
  const keyInput = root.querySelector("#riot-soldier-key");
  const joinButton = root.querySelector("#riot-soldier-join");
  const leaveButton = root.querySelector("#riot-soldier-leave");
  const status = root.querySelector("#riot-soldier-status");
  const roomBox = root.querySelector("#riot-soldier-room");
  const roomKey = root.querySelector("#riot-soldier-room-key");
  const playerList = root.querySelector("#riot-soldier-list");
  const playersElement = root.querySelector("#riot-soldier-players");
  const playerCount = root.querySelector("#riot-soldier-player-count");
  const controlsHelp = root.querySelector("#riot-soldier-controls-help");

  let W = innerWidth;
  let H = innerHeight;
  let animationId = 0;
  let inputTimer = 0;
  let destroyed = false;

  let ws = null;
  let connected = false;
  let myId = null;
  let currentRoom = null;

  const players = Object.create(null);
  const keys = Object.create(null);

  let mouseX = W / 2;
  let mouseY = H / 2;
  let mouseDown = false;
  let selectedClass = null;
  const CLASS_KEYS = {"1":"assaulter","2":"sniper","3":"rpg","4":"shotgun"};

  const palette = [
    "#42b982", "#e3485c", "#82b1ff", "#e8c878", "#f39b70",
    "#b58cff", "#5bd7d0", "#ff8ca1", "#d2e66e", "#ff9b52"
  ];

  function chooseClass(cls) {
    selectedClass = cls;
    root.dataset.class = cls;
    const labels = {assaulter:"ASSAULTER", sniper:"SNIPER", rpg:"RPG", shotgun:"SHOTGUN"};
    document.querySelectorAll("#riot-soldier-class-select button").forEach(b => b.classList.toggle("selected", b.dataset.class===cls));
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type:"select_class", class:cls}));
  }

  function onKeyDown(e) {
    if (!connected) return;
    const t=e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return;
    const k=e.key.toLowerCase();
    if (CLASS_KEYS[e.key]) { chooseClass(CLASS_KEYS[e.key]); e.preventDefault(); return; }
    if (["w","a","s","d"].includes(k)) { keys[k]=true; e.preventDefault(); return; }
    if (k==="r") { if(ws?.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:"reload"})); e.preventDefault(); }
  }
  function onKeyUp(e) { if(["w","a","s","d"].includes(e.key.toLowerCase())) { keys[e.key.toLowerCase()]=false; e.preventDefault(); } }

  function resize() {
    W = innerWidth;
    H = innerHeight;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function randomSpawn() {
    return {
      x: 70 + Math.random() * Math.max(100, W - 140),
      y: 100 + Math.random() * Math.max(100, H - 170)
    };
  }

  function normalizePlayer(data) {
    const spawn = randomSpawn();

    return {
      id: data.id,
      name: data.name || "PLAYER",
      x: Number.isFinite(data.x) ? data.x : spawn.x,
      y: Number.isFinite(data.y) ? data.y : spawn.y,
      targetX: Number.isFinite(data.x) ? data.x : spawn.x,
      targetY: Number.isFinite(data.y) ? data.y : spawn.y,
      angle: Number.isFinite(data.angle) ? data.angle : 0,
      targetAngle: Number.isFinite(data.angle) ? data.angle : 0,
      hp: Number.isFinite(data.hp) ? data.hp : 100,
      maxHp: Number.isFinite(data.maxHp) ? data.maxHp : 100,
      class: data.class || "assaulter",
      alive: data.alive !== false
    };
  }

  function updatePlayer(data) {
    if (!data || data.id == null) return;

    const existing = players[data.id];
    if (!existing) {
      players[data.id] = normalizePlayer(data);
      return;
    }

    existing.name = data.name || existing.name;
    existing.targetX = Number.isFinite(data.x) ? data.x : existing.targetX;
    existing.targetY = Number.isFinite(data.y) ? data.y : existing.targetY;
    existing.targetAngle = Number.isFinite(data.angle)
      ? data.angle
      : existing.targetAngle;
    existing.hp = Number.isFinite(data.hp) ? data.hp : existing.hp;
    existing.maxHp = Number.isFinite(data.maxHp) ? data.maxHp : existing.maxHp;
    existing.class = data.class || existing.class;
    existing.alive = data.alive !== false;
  }

  function updatePlayerList() {
    const list = Object.values(players);

    playerCount.textContent = `PLAYERS: ${list.length} / 10`;
    playersElement.innerHTML = "";

    list.forEach((player, index) => {
      const row = document.createElement("div");
      row.className = "riot-player" + (player.id === myId ? " you" : "");
      row.textContent = `${index + 1}. ${
        player.id === myId ? "YOU" : (player.name || "PLAYER")
      }`;
      playersElement.appendChild(row);
    });
  }

  function resetConnectionUI() {
    roomBox.style.display = "none";
    playerList.style.display = "none";
  }

  function clearPlayers() {
    Object.keys(players).forEach(id => delete players[id]);
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

  function connect() {
    const server = serverInput.value.trim();
    const key = keyInput.value.trim().toUpperCase();

    if (!server) {
      setStatus("ENTER SERVER");
      return;
    }

    if (!key) {
      setStatus("ENTER ROOM KEY");
      return;
    }

    if (!/^wss?:\/\//i.test(server)) {
      setStatus("USE ws:// OR wss://");
      return;
    }

    closeSocket();
    clearPlayers();
    connected = false;
    controlsHelp.style.display = "none";
    myId = null;
    keyInput.readOnly = true;
  keyInput.style.display = "none";
  roomBox.style.display = "block";
  currentRoom = null;

    try {
      ws = new WebSocket(server);
    } catch {
      setStatus("INVALID SERVER");
      return;
    }

    setStatus("CONNECTING...");

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
    controlsHelp.style.display = "block";
        myId = message.player_id;
        keyInput.readOnly = true;
  keyInput.style.display = "none";
  roomBox.style.display = "block";
  currentRoom = message.room || key;

        roomKey.textContent = currentRoom;
        roomBox.style.display = "block";
        playerList.style.display = "block";

        setStatus(message.is_host ? "CONNECTED HOST" : "CONNECTED");

        console.log(
          "[RIOT SOLDIER] Joined room:",
          currentRoom,
          "Player ID:",
          myId
        );
        return;
      }

      if (message.type === "state") {
        const incoming = message.players || [];
        const incomingIds = new Set(incoming.map(p => String(p.id)));

        Object.keys(players).forEach(id => {
          if (!incomingIds.has(String(id))) delete players[id];
        });

        incoming.forEach(updatePlayer);
        updatePlayerList();
        return;
      }

      if (message.type === "player_joined" && message.player) {
        updatePlayer(message.player);
        updatePlayerList();
        return;
      }

      if (message.type === "player_input") {
        const player = players[message.player_id];
        if (!player) return;

        if (Number.isFinite(message.x)) player.targetX = message.x;
        if (Number.isFinite(message.y)) player.targetY = message.y;
        if (Number.isFinite(message.angle)) player.targetAngle = message.angle;
        if (message.class) player.class = message.class;
        return;
      }

      if (message.type === "player_left") {
        delete players[message.player_id];
        updatePlayerList();
        return;
      }

      if (message.type === "error") {
        connected = false;
    controlsHelp.style.display = "none";
        setStatus(message.message || "ERROR");
        return;
      }
    };

    ws.onerror = () => {
      setStatus("SERVER ERROR");
    };

    ws.onclose = () => {
      connected = false;
    controlsHelp.style.display = "none";
      myId = null;
      keyInput.readOnly = true;
  keyInput.style.display = "none";
  roomBox.style.display = "block";
  currentRoom = null;
      resetConnectionUI();
      setStatus("DISCONNECTED");
    };
  }

  function sendInput() {
    if (
      !connected ||
      !ws ||
      ws.readyState !== WebSocket.OPEN ||
      myId == null
    ) return;

    const me = players[myId];
    if (!me) return;

    let dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    let dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);

    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;

      const speed = 3.8;
      me.x += dx * speed;
      me.y += dy * speed;
      me.targetX = me.x;
      me.targetY = me.y;

      me.x = Math.max(22, Math.min(W - 22, me.x));
      me.y = Math.max(22, Math.min(H - 22, me.y));
      me.targetX = me.x;
      me.targetY = me.y;
    }

    me.angle = Math.atan2(mouseY - me.y, mouseX - me.x);
    me.targetAngle = me.angle;

    try {
      ws.send(JSON.stringify({
        type: "input",
        input: {
          w: !!keys.w,
          a: !!keys.a,
          s: !!keys.s,
          d: !!keys.d,
          shooting: mouseDown
        },
        angle: me.angle,
        class: me.class
      }));
    } catch {
      setStatus("SEND FAILED");
    }
  }

  function lerpAngle(from, to, amount) {
    let diff = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
    return from + diff * amount;
  }

  function updatePlayers() {
    Object.values(players).forEach(player => {
      if (player.id === myId) return;

      player.x += (player.targetX - player.x) * 0.22;
      player.y += (player.targetY - player.y) * 0.22;
      player.angle = lerpAngle(
        player.angle,
        player.targetAngle,
        0.22
      );
    });
  }

  function drawPlayer(player, index) {
    if (!player) return;

    const x = Number.isFinite(player.x) ? player.x : W / 2;
    const y = Number.isFinite(player.y) ? player.y : H / 2;
    const angle = Number.isFinite(player.angle) ? player.angle : 0;
    const bodyColor = palette[index % palette.length];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath();
    ctx.ellipse(0, 11, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-10, -13, 20, 26);

    ctx.fillStyle = "#202126";
    ctx.fillRect(4, -3, 23, 5);

    if (!player.alive) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#000";
      ctx.fillRect(-12, -15, 24, 30);
    }

    ctx.restore();

    const hp = Math.max(
      0,
      Math.min(1, (player.hp ?? 100) / (player.maxHp || 100))
    );

    ctx.fillStyle = "rgba(0,0,0,.7)";
    ctx.fillRect(x - 20, y - 28, 40, 3);

    ctx.fillStyle = bodyColor;
    ctx.fillRect(x - 20, y - 28, 40 * hp, 3);

    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,.88)";
    ctx.fillText(
      player.id === myId ? "YOU" : (player.name || "PLAYER"),
      x,
      y + 25
    );
  }

  function draw() {
    if (destroyed) return;

    ctx.clearRect(0, 0, W, H);
    updatePlayers();

    if (connected) {
      Object.values(players).forEach((player, index) => {
        drawPlayer(player, index);
      });
    }

    animationId = requestAnimationFrame(draw);
  }

  function leave() {
    closeSocket();
    connected = false;
    controlsHelp.style.display = "none";
    myId = null;
    keyInput.readOnly = true;
  keyInput.style.display = "none";
  roomBox.style.display = "block";
  currentRoom = null;
    mouseDown = false;
    clearPlayers();
    resetConnectionUI();
    setStatus("OFFLINE");
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    keys[key] = true;

    if (["w", "a", "s", "d"].includes(key)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
  }

  function onMouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }

  function onMouseDown(event) {
    if (
      event.button === 0 &&
      !event.target.closest("input") &&
      !event.target.closest("button")
    ) {
      mouseDown = true;
    }
  }

  function onMouseUp(event) {
    if (event.button === 0) mouseDown = false;
  }

  function onKeyInput() {
    keyInput.value = keyInput.value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");
  }

  joinButton.addEventListener("click", connect);
  leaveButton.addEventListener("click", leave);
  keyInput.addEventListener("input", onKeyInput);

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);

  canvas.addEventListener("mousedown", e => {
    if (!connected || e.button !== 0) return;
    mouseDown = true;
    e.preventDefault();
  }, true);
  window.addEventListener("mouseup", e => { if(e.button===0) mouseDown=false; }, true);
  canvas.addEventListener("mousemove", e => { mouseX=e.clientX; mouseY=e.clientY; }, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);

  resize();

  inputTimer = window.setInterval(() => {
    if (connected) sendInput();
  }, 50);

  window.__riotSoldierCleanup = () => {
    destroyed = true;
    cancelAnimationFrame(animationId);
    clearInterval(inputTimer);

    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mouseup", onMouseUp);

    closeSocket();
    root.remove();
    delete window.__riotSoldierCleanup;
  };

  console.log(
    "%cRIOT SOLDIER | 10 PLAYER INTERNET MULTIPLAYER READY",
    "color:#e94560;font-weight:bold;font-size:14px"
  );
  console.log(
    "Enter your VM WebSocket address and room key, then click JOIN ROOM."
  );

  draw();
})();

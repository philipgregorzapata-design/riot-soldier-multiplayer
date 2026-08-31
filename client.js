(() => {
  window.__riotSoldierCleanup?.();
  document.getElementById("riot-soldier-battle")?.remove();

  const root = document.createElement("div");
  root.id = "riot-soldier-battle";

  root.innerHTML = `
    <style>
      #riot-soldier-battle{
        position:fixed;
        inset:0;
        width:100vw;
        height:100vh;
        z-index:999999;
        overflow:hidden;
        font-family:Arial,sans-serif;
        pointer-events:none;
        background:#0b0e14;
      }

      #riot-soldier-canvas{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        pointer-events:none;
      }

      /* TOP ROOM CONTROLS */
      #riot-soldier-controls{
        position:fixed;
        top:12px;
        left:50%;
        transform:translateX(-50%);
        display:flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        flex-wrap:wrap;
        z-index:1000001;
        pointer-events:auto;
      }

      .riot-box,
      .riot-button{
        box-sizing:border-box;
        padding:7px 9px;
        border-radius:7px;
        background:rgba(12,15,24,.91);
        border:1px solid rgba(255,255,255,.12);
        color:rgba(255,255,255,.94);
        font-size:10px;
        font-weight:700;
        letter-spacing:.7px;
        box-shadow:0 4px 18px rgba(0,0,0,.25);
        backdrop-filter:blur(8px);
      }

      .riot-input{
        width:150px;
        margin-left:5px;
        padding:6px 7px;
        border-radius:5px;
        border:1px solid #444;
        background:#181b24;
        color:white;
        outline:none;
        pointer-events:auto;
        box-sizing:border-box;
      }

      /* Room key now supports letters + numbers */
      #riot-soldier-key{
        width:130px;
        text-transform:uppercase;
        letter-spacing:1px;
        font-family:monospace;
      }

      .riot-button{
        cursor:pointer;
      }

      .riot-button:hover{
        background:rgba(215,48,76,.85);
      }

      #riot-soldier-status{
        min-width:100px;
        text-align:center;
      }

      /* ROOM KEY ABOVE JOIN ROOM */
      #riot-soldier-room{
        position:fixed;
        top:58px;
        left:50%;
        transform:translateX(-50%);
        z-index:1000001;
        display:none;
      }

      #riot-soldier-room-key{
        color:#ff4965;
        font-size:12px;
      }

      /* PLAYER LIST LEFT CORNER */
      #riot-soldier-list{
        position:fixed;
        top:72px;
        left:10px;
        z-index:1000001;
        width:170px;
        display:none;
      }

      #riot-soldier-list-title{
        margin-bottom:6px;
        color:white;
      }

      .riot-player{
        font-size:9px;
        padding:3px 0;
        color:rgba(255,255,255,.76);
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .riot-player.you{
        color:#42b982;
      }

      /* AUX / KILL HUD */
      #riot-soldier-hud{
        position:fixed;
        left:10px;
        bottom:10px;
        z-index:1000001;
        display:none;
        pointer-events:none;
      }

      #riot-soldier-hud .small{
        font-size:9px;
        line-height:1.5;
      }

      /* SMALL ONLINE STATUS */
      #riot-soldier-online{
        position:fixed;
        right:9px;
        bottom:9px;
        z-index:1000001;
        display:none;
        padding:5px 7px;
        min-width:0;
        font-size:8px;
        opacity:.68;
        pointer-events:none;
      }

      /* CLASS SELECT */
      #riot-soldier-classbar{
        position:fixed;
        right:10px;
        bottom:42px;
        z-index:1000001;
        display:none;
        pointer-events:auto;
      }

      #riot-soldier-class{
        padding:5px 7px;
        border-radius:5px;
        border:1px solid #444;
        background:#181b24;
        color:#fff;
        font-size:9px;
      }

      /* UPGRADES */
      #riot-soldier-upgrades{
        position:fixed;
        right:10px;
        bottom:76px;
        z-index:1000001;
        width:180px;
        display:none;
        pointer-events:auto;
      }

      .upgrade{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:8px;
        margin:5px 0;
        font-size:9px;
      }

      .upgrade button{
        border:1px solid rgba(255,255,255,.15);
        background:#181b24;
        color:#fff;
        border-radius:4px;
        padding:3px 6px;
        font-size:8px;
        cursor:pointer;
      }

      .upgrade button:hover{
        background:#313746;
      }

      @media(max-width:700px){
        #riot-soldier-controls{
          width:96%;
        }

        .riot-input{
          width:115px;
        }

        #riot-soldier-list{
          top:112px;
        }
      }
    </style>

    <canvas id="riot-soldier-canvas"></canvas>

    <div id="riot-soldier-controls">

      <div class="riot-box">
        SERVER
        <input
          id="riot-soldier-server"
          class="riot-input"
          placeholder="wss://YOUR-VM/ws"
          autocomplete="off"
        >
      </div>

      <div class="riot-box">
        ROOM KEY
        <input
          id="riot-soldier-key"
          class="riot-input"
          placeholder="ABCD-1234"
          maxlength="32"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
        >
      </div>

      <button id="riot-soldier-join" class="riot-button">
        JOIN ROOM
      </button>

      <button id="riot-soldier-leave" class="riot-button">
        LEAVE
      </button>

      <div id="riot-soldier-status" class="riot-box">
        OFFLINE
      </div>

    </div>

    <div id="riot-soldier-room" class="riot-box">
      ROOM:
      <span id="riot-soldier-room-key"></span>
    </div>

    <div id="riot-soldier-list" class="riot-box">
      <div id="riot-soldier-list-title">
        PLAYERS
      </div>

      <div id="riot-soldier-players"></div>
    </div>

    <div id="riot-soldier-hud" class="riot-box">

      <div class="small">
        CLASS:
        <b id="riot-class-label">ASSAULTER</b>
      </div>

      <div class="small">
        HP:
        <b id="riot-hp-label">100</b>
        · AUX:
        <b id="riot-aux-label">0</b>
      </div>

      <div class="small">
        LAST KILL:
        +<b id="riot-kill-aux">0</b> AUX
      </div>

      <div class="small">
        WASD MOVE · MOUSE AIM/FIRE
      </div>

      <div class="small">
        1 ASSAULTER · 2 SNIPER · 3 RPG · 4 SHOTGUN
      </div>

    </div>

    <div id="riot-soldier-upgrades" class="riot-box">

      <b>UPGRADES</b>

      <div class="upgrade">
        <span>
          RELOAD LV
          <b id="up-reload">0</b>
        </span>

        <button data-up="reload">
          + AUX
        </button>
      </div>

      <div class="upgrade">
        <span>
          FIRE LV
          <b id="up-fire">0</b>
        </span>

        <button data-up="fire">
          + AUX
        </button>
      </div>

      <div class="upgrade">
        <span>
          MOVE LV
          <b id="up-move">0</b>
        </span>

        <button data-up="move">
          + AUX
        </button>
      </div>

    </div>

    <div id="riot-soldier-classbar" class="riot-box">

      CLASS

      <select id="riot-soldier-class">

        <option value="assaulter">
          1 ASSAULTER
        </option>

        <option value="sniper">
          2 SNIPER
        </option>

        <option value="rpg">
          3 RPG
        </option>

        <option value="shotgun">
          4 SHOTGUN
        </option>

      </select>

    </div>

    <div id="riot-soldier-online" class="riot-box">

      ONLINE ·
      <span id="riot-soldier-player-count">0</span>/10

    </div>
  `;

  document.body.appendChild(root);

  const canvas =
    root.querySelector("#riot-soldier-canvas");

  const ctx = canvas.getContext("2d");

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

  const roomKey =
    root.querySelector("#riot-soldier-room-key");

  const playerList =
    root.querySelector("#riot-soldier-list");

  const playersElement =
    root.querySelector("#riot-soldier-players");

  const playerCount =
    root.querySelector("#riot-soldier-player-count");

  const hud =
    root.querySelector("#riot-soldier-hud");

  const classSelect =
    root.querySelector("#riot-soldier-class");

  const classLabel =
    root.querySelector("#riot-class-label");

  const hpLabel =
    root.querySelector("#riot-hp-label");

  const auxLabel =
    root.querySelector("#riot-aux-label");

  const killAux =
    root.querySelector("#riot-kill-aux");

  const upgrades =
    root.querySelector("#riot-soldier-upgrades");

  const classbar =
    root.querySelector("#riot-soldier-classbar");

  const online =
    root.querySelector("#riot-soldier-online");

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

  const localProgress = {
    aux: 0,
    reload: 0,
    fire: 0,
    move: 0
  };

  const palette = [
    "#42b982",
    "#e3485c",
    "#82b1ff",
    "#e8c878",
    "#f39b70",
    "#b58cff",
    "#5bd7d0",
    "#ff8ca1",
    "#d2e66e",
    "#ff9b52"
  ];

  /*
   * RANDOM MAP OBSTACLES
   *
   * These are regenerated when the game window changes.
   * Worker-side collision will be added in the server update.
   */

  const obstacles = [];

  function generateMap() {

    obstacles.length = 0;

    const count =
      12 + Math.floor(Math.random() * 9);

    for (let i = 0; i < count; i++) {

      const w =
        45 + Math.random() * 105;

      const h =
        35 + Math.random() * 80;

      obstacles.push({

        x:
          25 +
          Math.random() *
          Math.max(40, W - w - 50),

        y:
          82 +
          Math.random() *
          Math.max(40, H - h - 105),

        w,
        h,

        label:"AUX"
      });
    }
  }

  function resize() {

    W = innerWidth;
    H = innerHeight;

    const dpr =
      Math.min(devicePixelRatio || 1, 2);

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

    generateMap();
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function randomSpawn() {

    return {

      x:
        70 +
        Math.random() *
        Math.max(100, W - 140),

      y:
        100 +
        Math.random() *
        Math.max(100, H - 170)

    };
  }

  function normalizePlayer(data) {

    const spawn =
      randomSpawn();

    return {

      id:data.id,

      name:
        data.name ||
        "PLAYER",

      x:
        Number.isFinite(data.x)
          ? data.x
          : spawn.x,

      y:
        Number.isFinite(data.y)
          ? data.y
          : spawn.y,

      targetX:
        Number.isFinite(data.x)
          ? data.x
          : spawn.x,

      targetY:
        Number.isFinite(data.y)
          ? data.y
          : spawn.y,

      angle:
        Number.isFinite(data.angle)
          ? data.angle
          : 0,

      targetAngle:
        Number.isFinite(data.angle)
          ? data.angle
          : 0,

      hp:
        Number.isFinite(data.hp)
          ? data.hp
          : 100,

      maxHp:
        Number.isFinite(data.maxHp)
          ? data.maxHp
          : 100,

      class:
        data.class ||
        "assaulter",

      alive:
        data.alive !== false,

      aux:
        Number.isFinite(data.aux)
          ? data.aux
          : 0,

      reloadLevel:
        Number(data.reloadLevel || 0),

      fireLevel:
        Number(data.fireLevel || 0),

      moveLevel:
        Number(data.moveLevel || 0)

    };
  }

  function updatePlayer(data) {

    if (!data || data.id == null)
      return;

    const existing =
      players[data.id];

    if (!existing) {

      players[data.id] =
        normalizePlayer(data);

      return;
    }

    existing.name =
      data.name ||
      existing.name;

    if (Number.isFinite(data.x))
      existing.targetX = data.x;

    if (Number.isFinite(data.y))
      existing.targetY = data.y;

    if (Number.isFinite(data.angle))
      existing.targetAngle =
        data.angle;

    if (Number.isFinite(data.hp))
      existing.hp =
        data.hp;

    if (Number.isFinite(data.maxHp))
      existing.maxHp =
        data.maxHp;

    if (data.class)
      existing.class =
        data.class;

    existing.alive =
      data.alive !== false;

    if (Number.isFinite(data.aux))
      existing.aux =
        data.aux;

    if (data.reloadLevel != null)
      existing.reloadLevel =
        Number(data.reloadLevel);

    if (data.fireLevel != null)
      existing.fireLevel =
        Number(data.fireLevel);

    if (data.moveLevel != null)
      existing.moveLevel =
        Number(data.moveLevel);
  }

  function syncMyHud() {

    const me =
      players[myId];

    if (!me)
      return;

    localProgress.aux =
      Number(me.aux || 0);

    localProgress.reload =
      Number(me.reloadLevel || 0);

    localProgress.fire =
      Number(me.fireLevel || 0);

    localProgress.move =
      Number(me.moveLevel || 0);

    classSelect.value =
      me.class ||
      "assaulter";

    classLabel.textContent =
      String(
        me.class ||
        "assaulter"
      ).toUpperCase();

    hpLabel.textContent =
      Math.max(
        0,
        Math.ceil(me.hp ?? 100)
      );

    auxLabel.textContent =
      localProgress.aux;

    root.querySelector(
      "#up-reload"
    ).textContent =
      localProgress.reload;

    root.querySelector(
      "#up-fire"
    ).textContent =
      localProgress.fire;

    root.querySelector(
      "#up-move"
    ).textContent =
      localProgress.move;
  }

  function updatePlayerList() {

    const list =
      Object.values(players);

    playerCount.textContent =
      list.length;

    playersElement.innerHTML =
      "";

    list.forEach(
      (player,index) => {

        const row =
          document.createElement("div");

        row.className =
          "riot-player" +
          (
            player.id === myId
              ? " you"
              : ""
          );

        row.textContent =
          `${index + 1}. ${
            player.id === myId
              ? "YOU"
              : player.name
          } · ${
            String(
              player.class ||
              "assaulter"
            ).toUpperCase()
          }`;

        playersElement.appendChild(row);

      }
    );
  }

  function showGameUI() {

    roomBox.style.display =
      "block";

    playerList.style.display =
      "block";

    hud.style.display =
      "block";

    upgrades.style.display =
      "block";

    classbar.style.display =
      "block";

    online.style.display =
      "block";
  }

  function resetConnectionUI() {

    roomBox.style.display =
      "none";

    playerList.style.display =
      "none";

    hud.style.display =
      "none";

    upgrades.style.display =
      "none";

    classbar.style.display =
      "none";

    online.style.display =
      "none";
  }

  function clearPlayers() {

    Object.keys(players)
      .forEach(
        id => delete players[id]
      );

    updatePlayerList();
  }

  function closeSocket() {

    if (!ws)
      return;

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

    const server =
      serverInput.value.trim();

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

    if (!key) {

      setStatus(
        "ENTER ROOM KEY"
      );

      return;
    }

    if (!/^wss?:\\/\\//i.test(server)) {

      setStatus(
        "USE ws:// OR wss://"
      );

      return;
    }

    closeSocket();
    clearPlayers();

    connected = false;
    myId = null;
    currentRoom = null;

    try {

      ws =
        new WebSocket(server);

    } catch {

      setStatus(
        "INVALID SERVER"
      );

      return;
    }

    setStatus(
      "CONNECTING..."
    );

    ws.onopen = () => {

      setStatus(
        "JOINING ROOM..."
      );

      ws.send(
        JSON.stringify({
          type:"join_room",
          key
        })
      );
    };

    ws.onmessage = event => {

      let message;

      try {

        message =
          JSON.parse(event.data);

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
          message.room ||
          key;

        roomKey.textContent =
          currentRoom;

        showGameUI();

        setStatus(
          message.is_host
            ? "CONNECTED HOST"
            : "CONNECTED"
        );

        return;
      }

      if (
        message.type ===
        "state"
      ) {

        const incoming =
          message.players ||
          [];

        const incomingIds =
          new Set(
            incoming.map(
              p => String(p.id)
            )
          );

        Object.keys(players)
          .forEach(id => {

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

        syncMyHud();
        updatePlayerList();

        return;
      }

      if (
        message.type ===
        "player_joined" &&
        message.player
      ) {

        updatePlayer(
          message.player
        );

        updatePlayerList();

        return;
      }

      if (
        message.type ===
        "player_input"
      ) {

        const player =
          players[
            message.player_id
          ];

        if (!player)
          return;

        if (
          Number.isFinite(
            message.x
          )
        )
          player.targetX =
            message.x;

        if (
          Number.isFinite(
            message.y
          )
        )
          player.targetY =
            message.y;

        if (
          Number.isFinite(
            message.angle
          )
        )
          player.targetAngle =
            message.angle;

        if (message.class)
          player.class =
            message.class;

        return;
      }

      /*
       * Server will emit this after a successful kill.
       */
      if (
        message.type ===
        "hit" &&
        message.killer_id === myId
      ) {

        const reward =
          Number(
            message.aux || 0
          );

        killAux.textContent =
          reward;

        setTimeout(
          () => {
            killAux.textContent =
              "0";
          },
          900
        );

        return;
      }

      /*
       * Server can send updated AUX/upgrades.
       */
      if (
        message.type ===
        "player_stats"
      ) {

        if (
          message.player_id ===
          myId
        ) {

          const me =
            players[myId];

          if (me) {

            if (
              Number.isFinite(
                message.aux
              )
            )
              me.aux =
                message.aux;

            if (
              message.reloadLevel != null
            )
              me.reloadLevel =
                Number(
                  message.reloadLevel
                );

            if (
              message.fireLevel != null
            )
              me.fireLevel =
                Number(
                  message.fireLevel
                );

            if (
              message.moveLevel != null
            )
              me.moveLevel =
                Number(
                  message.moveLevel
                );
          }

          syncMyHud();
        }

        return;
      }

      if (
        message.type ===
        "error"
      ) {

        setStatus(
          message.message ||
          "ERROR"
        );

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

      }
    };

    ws.onerror = () => {

      setStatus(
        "SERVER ERROR"
      );
    };

    ws.onclose = () => {

      connected = false;
      myId = null;
      currentRoom = null;

      resetConnectionUI();

      setStatus(
        "DISCONNECTED"
      );
    };
  }

  function sendInput() {

    if (
      !connected ||
      !ws ||
      ws.readyState !==
        WebSocket.OPEN ||
      myId == null
    )
      return;

    const me =
      players[myId];

    if (!me)
      return;

    let dx =
      (keys.d ? 1 : 0) -
      (keys.a ? 1 : 0);

    let dy =
      (keys.s ? 1 : 0) -
      (keys.w ? 1 : 0);

    if (dx || dy) {

      const length =
        Math.hypot(dx,dy);

      dx /= length;
      dy /= length;

      /*
       * Slightly faster movement.
       *
       * Worker.js must enforce the authoritative
       * movement speed next.
       */
      const speed =
        4.25 +
        localProgress.move * 0.25;

      me.x +=
        dx * speed;

      me.y +=
        dy * speed;

      me.x =
        Math.max(
          22,
          Math.min(
            W - 22,
            me.x
          )
        );

      me.y =
        Math.max(
          82,
          Math.min(
            H - 22,
            me.y
          )
        );

      me.targetX =
        me.x;

      me.targetY =
        me.y;
    }

    me.angle =
      Math.atan2(
        mouseY - me.y,
        mouseX - me.x
      );

    me.targetAngle =
      me.angle;

    try {

      ws.send(
        JSON.stringify({

          type:"input",

          input:{
            w:!!keys.w,
            a:!!keys.a,
            s:!!keys.s,
            d:!!keys.d,
            shooting:mouseDown
          },

          x:me.x,
          y:me.y,

          angle:
            me.angle,

          class:
            me.class

        })
      );

    } catch {

      setStatus(
        "SEND FAILED"
      );
    }
  }

  function lerpAngle(
    from,
    to,
    amount
  ) {

    let diff =
      (
        to -
        from +
        Math.PI
      ) %
      (Math.PI * 2) -
      Math.PI;

    return (
      from +
      diff * amount
    );
  }

  function updatePlayers() {

    Object.values(players)
      .forEach(player => {

        if (
          player.id ===
          myId
        )
          return;

        player.x +=
          (
            player.targetX -
            player.x
          ) * 0.22;

        player.y +=
          (
            player.targetY -
            player.y
          ) * 0.22;

        player.angle =
          lerpAngle(
            player.angle,
            player.targetAngle,
            0.22
          );

      });
  }

  function drawMap() {

    ctx.fillStyle =
      "#0b0e14";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    /*
     * Subtle map grid.
     */
    ctx.strokeStyle =
      "rgba(255,255,255,.035)";

    ctx.lineWidth = 1;

    for (
      let x = 0;
      x < W;
      x += 40
    ) {

      ctx.beginPath();

      ctx.moveTo(
        x,
        70
      );

      ctx.lineTo(
        x,
        H
      );

      ctx.stroke();
    }

    for (
      let y = 70;
      y < H;
      y += 40
    ) {

      ctx.beginPath();

      ctx.moveTo(
        0,
        y
      );

      ctx.lineTo(
        W,
        y
      );

      ctx.stroke();
    }

    /*
     * Random blocks with AUX text.
     */
    obstacles.forEach(o => {

      ctx.fillStyle =
        "rgba(45,50,62,.94)";

      ctx.fillRect(
        o.x,
        o.y,
        o.w,
        o.h
      );

      ctx.strokeStyle =
        "rgba(255,255,255,.10)";

      ctx.strokeRect(
        o.x,
        o.y,
        o.w,
        o.h
      );

      ctx.font =
        "bold 9px Arial";

      ctx.textAlign =
        "center";

      ctx.fillStyle =
        "rgba(255,255,255,.23)";

      ctx.fillText(
        "AUX",
        o.x + o.w / 2,
        o.y + o.h / 2 + 3
      );
    });
  }

  function drawPlayer(
    player,
    index
  ) {

    if (!player)
      return;

    const x =
      Number.isFinite(player.x)
        ? player.x
        : W / 2;

    const y =
      Number.isFinite(player.y)
        ? player.y
        : H / 2;

    const angle =
      Number.isFinite(player.angle)
        ? player.angle
        : 0;

    const bodyColor =
      palette[
        index %
        palette.length
      ];

    ctx.save();

    ctx.translate(
      x,
      y
    );

    ctx.rotate(
      angle
    );

    /*
     * Shadow.
     */
    ctx.fillStyle =
      "rgba(0,0,0,.32)";

    ctx.beginPath();

    ctx.ellipse(
      0,
      11,
      14,
      7,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    /*
     * Soldier body.
     */
    ctx.fillStyle =
      bodyColor;

    ctx.fillRect(
      -10,
      -13,
      20,
      26
    );

    /*
     * Weapon barrel length changes visually by class.
     */
    ctx.fillStyle =
      "#202126";

    let barrel =
      23;

    if (
      player.class ===
      "sniper"
    )
      barrel = 32;

    if (
      player.class ===
      "rpg"
    )
      barrel = 28;

    if (
      player.class ===
      "shotgun"
    )
      barrel = 24;

    ctx.fillRect(
      4,
      -3,
      barrel,
      5
    );

    /*
     * Dead player.
     */
    if (!player.alive) {

      ctx.globalAlpha =
        0.35;

      ctx.fillStyle =
        "#000";

      ctx.fillRect(
        -12,
        -15,
        24,
        30
      );
    }

    ctx.restore();

    /*
     * HP bar.
     */
    const hp =
      Math.max(
        0,
        Math.min(
          1,
          (player.hp ?? 100) /
          (player.maxHp || 100)
        )
      );

    ctx.fillStyle =
      "rgba(0,0,0,.7)";

    ctx.fillRect(
      x - 20,
      y - 28,
      40,
      3
    );

    ctx.fillStyle =
      bodyColor;

    ctx.fillRect(
      x - 20,
      y - 28,
      40 * hp,
      3
    );

    ctx.font =
      "9px Arial";

    ctx.textAlign =
      "center";

    ctx.fillStyle =
      "rgba(255,255,255,.88)";

    ctx.fillText(
      player.id === myId
        ? "YOU"
        : (
            player.name ||
            "PLAYER"
          ),
      x,
      y + 25
    );

    ctx.font =
      "8px Arial";

    ctx.fillStyle =
      "rgba(255,255,255,.55)";

    ctx.fillText(
      String(
        player.class ||
        "assaulter"
      ).toUpperCase(),
      x,
      y + 35
    );
  }

  function draw() {

    if (destroyed)
      return;

    ctx.clearRect(
      0,
      0,
      W,
      H
    );

    drawMap();

    updatePlayers();

    if (connected) {

      Object.values(players)
        .forEach(
          (player,index) => {

            drawPlayer(
              player,
              index
            );

          }
        );
    }

    animationId =
      requestAnimationFrame(
        draw
      );
  }

  function leave() {

    closeSocket();

    connected = false;
    myId = null;
    currentRoom = null;
    mouseDown = false;

    clearPlayers();

    resetConnectionUI();

    setStatus(
      "OFFLINE"
    );
  }

  /*
   * Keyboard controls.
   *
   * IMPORTANT:
   * Do not steal letters/numbers while typing
   * inside the room key or server field.
   */
  function onKeyDown(event) {

    if (
      document.activeElement ===
        keyInput ||
      document.activeElement ===
        serverInput
    ) {
      return;
    }

    const key =
      event.key.toLowerCase();

    /*
     * Soldier class hotkeys.
     */
    if (
      key === "1" ||
      key === "2" ||
      key === "3" ||
      key === "4"
    ) {

      const index =
        Number(key) - 1;

      classSelect.selectedIndex =
        index;

      classSelect.dispatchEvent(
        new Event("change")
      );

      return;
    }

    keys[key] = true;

    if (
      ["w","a","s","d"," "]
        .includes(key)
    ) {

      event.preventDefault();
    }
  }

  function onKeyUp(event) {

    if (
      document.activeElement ===
        keyInput ||
      document.activeElement ===
        serverInput
    ) {
      return;
    }

    keys[
      event.key.toLowerCase()
    ] = false;
  }

  function onMouseMove(event) {

    mouseX =
      event.clientX;

    mouseY =
      event.clientY;
  }

  function onMouseDown(event) {

    if (
      !connected ||
      event.button !== 0
    )
      return;

    /*
     * UI controls must still receive clicks.
     * Only the game area fires.
     */
    if (
      event.target.closest(
        "input,button,select"
      )
    )
      return;

    mouseDown = true;
  }

  function onMouseUp(event) {

    if (
      event.button === 0
    )
      mouseDown = false;
  }

  /*
   * FIX:
   * Room key accepts ALL letters and numbers.
   *
   * We do NOT rebuild the input value on every keydown.
   * This prevents dropped characters.
   */
  function onKeyInput() {

    const start =
      keyInput.selectionStart;

    const oldLength =
      keyInput.value.length;

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

    const removed =
      oldLength -
      keyInput.value.length;

    if (
      removed > 0 &&
      start != null
    ) {

      const pos =
        Math.max(
          0,
          start - removed
        );

      try {

        keyInput.setSelectionRange(
          pos,
          pos
        );

      } catch {}
    }
  }

  /*
   * Class selection.
   */
  classSelect.addEventListener(
    "change",
    () => {

      const me =
        players[myId];

      if (!me)
        return;

      me.class =
        classSelect.value;

      classLabel.textContent =
        classSelect.value
          .toUpperCase();
    }
  );

  /*
   * Upgrade buttons.
   *
   * Worker.js will validate AUX and actually
   * apply the upgrade.
   */
  root.querySelectorAll(
    "[data-up]"
  ).forEach(button => {

    button.addEventListener(
      "click",
      () => {

        if (
          !connected ||
          !ws ||
          ws.readyState !==
            WebSocket.OPEN
        )
          return;

        const upgrade =
          button.dataset.up;

        const level =
          Number(
            localProgress[
              upgrade
            ] || 0
          );

        const cost =
          10 +
          level * 10;

        if (
          localProgress.aux <
          cost
        ) {

          setStatus(
            `NEED ${cost} AUX`
          );

          return;
        }

        ws.send(
          JSON.stringify({

            type:"upgrade",

            upgrade

          })
        );
      }
    );
  });

  joinButton.addEventListener(
    "click",
    connect
  );

  leaveButton.addEventListener(
    "click",
    leave
  );

  keyInput.addEventListener(
    "input",
    onKeyInput
  );

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

  resize();

  inputTimer =
    window.setInterval(
      () => {

        if (connected)
          sendInput();

      },
      50
    );

  window.__riotSoldierCleanup =
    () => {

      destroyed = true;

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

      closeSocket();

      root.remove();

      delete window.__riotSoldierCleanup;
    };

  console.log(
    "%cRIOT SOLDIER | UPDATED CLIENT",
    "color:#e94560;font-weight:bold;font-size:14px"
  );

  draw();

})();

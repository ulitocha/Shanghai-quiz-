let game = { state: "lobby" };
let players = {};
let answers = {};
let watchingQ = null;
let ansRef = null;
let revealing = false;

const app = document.getElementById("app");
const playUrl = location.href.replace(/host\.html.*$/, "");

db.ref("game").on("value", s => {
  game = s.val() || { state: "lobby" };
  syncAnswers();
  render();
});

db.ref("players").on("value", s => {
  players = s.val() || {};
  render();
});

function syncAnswers() {
  const q = game.state === "lobby" ? null : game.q;
  if (q === watchingQ) return;
  if (ansRef) ansRef.off();
  watchingQ = q;
  answers = {};
  if (q == null) return;
  ansRef = db.ref("answers/" + q);
  ansRef.on("value", s => {
    if (q !== watchingQ) return;
    answers = s.val() || {};
    render();
    autoReveal();
  });
}

function timeLeft() {
  if (!game.startedAt) return TIME;
  return Math.max(0, TIME - (serverNow() - game.startedAt) / 1000);
}

function start() {
  const upd = { answers: null, game: { state: "question", q: 0, startedAt: NOW } };
  for (const pid in players) upd["players/" + pid + "/score"] = 0;
  db.ref().update(upd);
}

function next() {
  if (game.q + 1 < QUESTIONS.length) {
    db.ref("game").set({ state: "question", q: game.q + 1, startedAt: NOW });
  } else {
    db.ref("game/state").set("final");
  }
}

function reset() {
  db.ref().update({ players: null, answers: null, game: { state: "lobby" } });
}

function autoReveal() {
  const total = Object.keys(players).length;
  if (game.state === "question" && total > 0 && Object.keys(answers).length >= total) reveal();
}

function reveal() {
  if (game.state !== "question" || revealing || watchingQ !== game.q) return;
  revealing = true;
  const qi = game.q;
  const Q = QUESTIONS[qi];
  const upd = { "game/state": "reveal" };
  for (const [pid, a] of Object.entries(answers)) {
    if (!players[pid]) continue;
    const pts = a.choice === Q.c ? pointsFor(a, game.startedAt) : 0;
    upd["answers/" + qi + "/" + pid + "/points"] = pts;
    upd["players/" + pid + "/score"] = (players[pid].score || 0) + pts;
  }
  db.ref().update(upd).finally(() => { revealing = false; });
}

function optsHtml(Q, showRight) {
  const counts = [0, 0, 0, 0];
  for (const a of Object.values(answers)) if (counts[a.choice] !== undefined) counts[a.choice]++;
  return `<div class="opts">${Q.a.map((t, i) => `
    <div class="opt c${i}${showRight && i !== Q.c ? " dim" : ""}">
      <span class="sh">${SHAPES[i]}</span>${esc(t)}
      ${showRight ? `<span class="cnt">${counts[i]}</span>` : ""}
    </div>`).join("")}</div>`;
}

function boardHtml(limit) {
  return `<div class="board">${ranking(players).slice(0, limit).map((p, i) => `
    <div class="line${i === 0 ? " first" : ""}"><span class="n">${i + 1}</span>${esc(p.name)}<span class="s">${p.score}</span></div>`).join("")}</div>`;
}

function render() {
  const total = Object.keys(players).length;
  const Q = QUESTIONS[game.q];

  if (game.state === "lobby") {
    app.innerHTML = `
      <div class="card"><div class="lobby">
        <div class="qr" id="qr"></div>
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
          <div class="hanbig">上海</div>
          <h1>Один день в Шанхае</h1>
          <p>Сканируй QR-код или открой <b>${esc(playUrl)}</b></p>
          <p class="tag">В игре: ${total}</p>
          <div class="names">${Object.values(players).map(p => `<span class="name">${esc(p.name)}</span>`).join("")}</div>
          <div class="row">
            <button class="btn" id="start">Начать игру</button>
            <button class="btn light" id="reset">Очистить список</button>
          </div>
        </div>
        <img class="map" src="map.jpg" alt="Карта Шанхая" onerror="this.remove()">
      </div></div>`;
    new QRCode(document.getElementById("qr"), { text: playUrl, width: 240, height: 240 });
    document.getElementById("start").onclick = start;
    document.getElementById("reset").onclick = reset;
    return;
  }

  if (game.state === "question") {
    const place = PLACES[Q.p];
    app.innerHTML = `
      <div class="top"><span>Вопрос ${game.q + 1} из ${QUESTIONS.length}</span><span>Ответили: ${Object.keys(answers).length} из ${total}</span><span class="big" id="left">${Math.ceil(timeLeft())}</span></div>
      <div class="bar"><i id="tb"></i></div>
      <div class="card">
        <div class="row"><span class="han">${place[0]}</span><span class="tag">${place[1]}</span></div>
        <div class="q">${esc(Q.q)}</div>
        ${optsHtml(Q, false)}
        <div class="row"><button class="btn light" id="rv">Показать ответ</button></div>
      </div>`;
    document.getElementById("rv").onclick = reveal;
    tick();
    return;
  }

  if (game.state === "reveal") {
    app.innerHTML = `
      <div class="top"><span>Вопрос ${game.q + 1} из ${QUESTIONS.length}</span></div>
      <div class="card">
        <div class="q">${esc(Q.q)}</div>
        ${optsHtml(Q, true)}
        <p class="big">${esc(Q.f)}</p>
        <div class="row"><button class="btn" id="bd">Рейтинг</button></div>
      </div>`;
    document.getElementById("bd").onclick = () => db.ref("game/state").set("board");
    return;
  }

  if (game.state === "board") {
    const last = game.q + 1 >= QUESTIONS.length;
    app.innerHTML = `
      <div class="card">
        <h1>Рейтинг</h1>
        ${boardHtml(5)}
        <div class="row"><button class="btn" id="nx">${last ? "Итоги" : "Следующий вопрос"}</button></div>
      </div>`;
    document.getElementById("nx").onclick = next;
    return;
  }

  if (game.state === "final") {
    app.innerHTML = `
      <div class="card center">
        <div class="hanbig">谢谢!</div>
        <h1>Победители</h1>
      </div>
      <div class="card">
        ${boardHtml(10)}
        <div class="row"><button class="btn light" id="reset">Новая игра</button></div>
      </div>`;
    document.getElementById("reset").onclick = reset;
  }
}

function tick() {
  if (game.state !== "question") return;
  const left = timeLeft();
  const el = document.getElementById("left");
  const tb = document.getElementById("tb");
  if (el) el.textContent = Math.ceil(left);
  if (tb) tb.style.width = (left / TIME * 100) + "%";
  if (left <= 0) reveal();
}
setInterval(tick, 200);

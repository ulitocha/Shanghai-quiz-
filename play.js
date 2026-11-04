let pid = null;
try { pid = localStorage.getItem("sq_pid"); } catch (e) {}
if (!pid) {
  pid = Math.random().toString(36).slice(2, 10);
  try { localStorage.setItem("sq_pid", pid); } catch (e) {}
}

let game = { state: "lobby" };
let players = {};
let me = null;
let myAns = null;
let ansRef = null;
let watchingQ = null;
let lastHtml = "";

const app = document.getElementById("app");

db.ref("game").on("value", s => {
  game = s.val() || { state: "lobby" };
  syncAnswer();
  render();
});

db.ref("players").on("value", s => {
  players = s.val() || {};
  me = players[pid] || null;
  render();
});

function syncAnswer() {
  const q = game.state === "lobby" ? null : game.q;
  if (q === watchingQ) return;
  if (ansRef) ansRef.off();
  watchingQ = q;
  myAns = null;
  if (q == null) return;
  ansRef = db.ref("answers/" + q + "/" + pid);
  ansRef.on("value", s => {
    if (q !== watchingQ) return;
    myAns = s.val();
    render();
  });
}

function timeLeft() {
  if (!game.startedAt) return TIME;
  return Math.max(0, TIME - (serverNow() - game.startedAt) / 1000);
}

function join() {
  const name = document.getElementById("nm").value.trim().slice(0, 20);
  if (!name) { document.getElementById("nm").focus(); return; }
  db.ref("players/" + pid).set({ name, score: 0 });
}

function answer(k) {
  if (myAns || game.state !== "question" || timeLeft() <= 0) return;
  myAns = { choice: k };
  render();
  db.ref("answers/" + game.q + "/" + pid).set({ choice: k, at: NOW });
}

function myPlace() {
  const r = ranking(players);
  return r.findIndex(p => p.id === pid) + 1;
}

function screen() {
  if (!me) {
    return `<div class="card">
      <div class="hanbig">上海</div>
      <h1>Один день в Шанхае</h1>
      <label class="tag" for="nm">Как тебя зовут?</label>
      <input id="nm" maxlength="20" autocomplete="off" placeholder="Например, Маша">
      <button class="btn" id="join">Войти в игру</button>
    </div>`;
  }

  const Q = QUESTIONS[game.q];

  if (game.state === "lobby") {
    return `<div class="card center">
      <div class="hanbig">你好!</div>
      <p class="big">${esc(me.name)}, ты в игре</p>
      <p class="muted">Смотри на большой экран, скоро начнём</p>
    </div>`;
  }

  if (game.state === "question") {
    if (myAns) {
      return `<div class="card center"><p class="big">Ответ принят</p><p class="muted">Ждём остальных…</p></div>`;
    }
    if (timeLeft() <= 0) {
      return `<div class="card center"><p class="big bad">Время вышло</p></div>`;
    }
    return `<div class="top"><span>Вопрос ${game.q + 1} из ${QUESTIONS.length}</span><span>${me.score || 0} очков</span></div>
      <div class="bar"><i id="tb"></i></div>
      <div class="card">
        <div class="q">${esc(Q.q)}</div>
        <div class="opts">${Q.a.map((t, i) => `<button class="opt c${i}" data-k="${i}"><span class="sh">${SHAPES[i]}</span>${esc(t)}</button>`).join("")}</div>
      </div>`;
  }

  if (game.state === "reveal" || game.state === "board") {
    let verdict;
    if (!myAns) verdict = `<p class="big bad">Не успел(а)</p>`;
    else if (myAns.points === undefined) verdict = `<p class="big">Считаем очки…</p>`;
    else if (myAns.points > 0) verdict = `<p class="big ok">Верно! +${myAns.points}</p>`;
    else verdict = `<p class="big bad">Мимо</p>`;
    return `<div class="card center">
      ${verdict}
      <p class="muted">Правильный ответ: ${esc(Q.a[Q.c])}</p>
      <div class="score">${me.score || 0}</div>
      <p class="tag">Ты на ${myPlace()} месте</p>
    </div>`;
  }

  if (game.state === "final") {
    return `<div class="card center">
      <div class="hanbig">谢谢!</div>
      <p class="big">${myPlace()} место</p>
      <div class="score">${me.score || 0}</div>
      <p class="muted">Спасибо за игру, ${esc(me.name)}!</p>
    </div>`;
  }

  return "";
}

function render() {
  const html = screen();
  if (html === lastHtml) return;
  lastHtml = html;
  app.innerHTML = html;
  const j = document.getElementById("join");
  if (j) {
    j.onclick = join;
    document.getElementById("nm").onkeydown = e => { if (e.key === "Enter") join(); };
  }
  app.querySelectorAll("button.opt").forEach(b => b.onclick = () => answer(+b.dataset.k));
  tick();
}

function tick() {
  if (game.state !== "question" || myAns || !me) return;
  const left = timeLeft();
  const tb = document.getElementById("tb");
  if (tb) tb.style.width = (left / TIME * 100) + "%";
  if (left <= 0) render();
}
setInterval(tick, 200);

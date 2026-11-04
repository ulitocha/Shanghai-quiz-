firebase.initializeApp(window.FIREBASE_CONFIG);
const db = firebase.database();
const NOW = firebase.database.ServerValue.TIMESTAMP;

let serverOffset = 0;
db.ref(".info/serverTimeOffset").on("value", s => { serverOffset = s.val() || 0; });
const serverNow = () => Date.now() + serverOffset;

const SHAPES = ["▲", "◆", "●", "■"];

function esc(t) {
  return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function ranking(players) {
  return Object.entries(players || {})
    .map(([id, p]) => ({ id, name: p.name || "Без имени", score: p.score || 0 }))
    .sort((a, b) => b.score - a.score);
}

function pointsFor(answer, startedAt) {
  const sec = (answer.at - startedAt) / 1000;
  if (sec > TIME + 1) return 0;
  const part = Math.min(1, Math.max(0, sec / TIME));
  return Math.round(1000 * (1 - part / 2));
}

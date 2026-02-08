const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ── Helper: read/write JSON files ── */
function readJSON(filename, fallback) {
  const fp = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch (e) {
    console.error(`Error reading ${filename}:`, e.message);
  }
  return fallback;
}
function writeJSON(filename, data) {
  const fp = path.join(DATA_DIR, filename);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf8");
}

/* ── API: Users ── */
// GET /api/users
app.get("/api/users", (req, res) => {
  const users = readJSON("users.json", { users: ["WAKASA", "TEZUKA"], current: "WAKASA" });
  res.json(users);
});

// POST /api/users  { name: "NEW_USER" }
app.post("/api/users", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const data = readJSON("users.json", { users: ["WAKASA", "TEZUKA"], current: "WAKASA" });
  const upper = name.trim().toUpperCase();
  if (!data.users.includes(upper)) data.users.push(upper);
  writeJSON("users.json", data);
  res.json({ ok: true, users: data.users });
});

/* ── API: Menus (training data) ── */
// GET /api/menus/:user
app.get("/api/menus/:user", (req, res) => {
  const user = req.params.user.toUpperCase();
  const menus = readJSON(`menus_${user}.json`, null);
  res.json({ menus }); // null = use defaults on client
});

// PUT /api/menus/:user  { menus: {...} }
app.put("/api/menus/:user", (req, res) => {
  const user = req.params.user.toUpperCase();
  const { menus } = req.body;
  if (!menus) return res.status(400).json({ error: "menus required" });
  writeJSON(`menus_${user}.json`, menus);
  res.json({ ok: true });
});

// PATCH /api/menus/:user/:tab  { exercises: [...] }
// Save a single menu tab (used by save button)
app.patch("/api/menus/:user/:tab", (req, res) => {
  const user = req.params.user.toUpperCase();
  const tab = req.params.tab;
  const { exercises } = req.body;
  if (!exercises) return res.status(400).json({ error: "exercises required" });
  const menus = readJSON(`menus_${user}.json`, null);
  if (!menus) return res.status(404).json({ error: "no data yet" });
  menus[tab] = exercises;
  writeJSON(`menus_${user}.json`, menus);
  res.json({ ok: true });
});

/* ── API: Comments ── */
// GET /api/comments/:user
app.get("/api/comments/:user", (req, res) => {
  const user = req.params.user.toUpperCase();
  const comments = readJSON(`comments_${user}.json`, {});
  res.json({ comments });
});

// POST /api/comments/:user  { key: "2/8_Push", author: "トレーナー", text: "いい感じ！" }
app.post("/api/comments/:user", (req, res) => {
  const user = req.params.user.toUpperCase();
  const { key, author, text } = req.body;
  if (!key || !text) return res.status(400).json({ error: "key and text required" });
  const comments = readJSON(`comments_${user}.json`, {});
  if (!comments[key]) comments[key] = [];
  comments[key].push({ author: author || "匿名", text, time: new Date().toISOString() });
  writeJSON(`comments_${user}.json`, comments);
  res.json({ ok: true, comments: comments[key] });
});

/* ── API: Full data refresh (for polling) ── */
// GET /api/sync/:user — returns menus + comments + timestamp
app.get("/api/sync/:user", (req, res) => {
  const user = req.params.user.toUpperCase();
  const menus = readJSON(`menus_${user}.json`, null);
  const comments = readJSON(`comments_${user}.json`, {});
  const measurements = readJSON(`measurements_${user}.json`, []);
  res.json({ menus, comments, measurements, serverTime: Date.now() });
});

/* ── API: Body Measurements ── */
// GET /api/measurements/:user
app.get("/api/measurements/:user", (req, res) => {
  const user = req.params.user.toUpperCase();
  const data = readJSON(`measurements_${user}.json`, []);
  res.json({ measurements: data });
});

// POST /api/measurements/:user  { date, weight, waist, chest, arm, thigh, hip, memo }
app.post("/api/measurements/:user", (req, res) => {
  const user = req.params.user.toUpperCase();
  const m = req.body;
  if (!m.date) return res.status(400).json({ error: "date required" });
  const data = readJSON(`measurements_${user}.json`, []);
  // Replace if same date exists, otherwise add
  const idx = data.findIndex(d => d.date === m.date);
  const entry = { date: m.date, weight: m.weight || "", waist: m.waist || "", chest: m.chest || "", arm: m.arm || "", thigh: m.thigh || "", hip: m.hip || "", memo: m.memo || "", updatedAt: new Date().toISOString() };
  if (idx >= 0) data[idx] = entry; else data.push(entry);
  data.sort((a, b) => new Date(b.date) - new Date(a.date));
  writeJSON(`measurements_${user}.json`, data);
  res.json({ ok: true, measurements: data });
});

// DELETE /api/measurements/:user/:date
app.delete("/api/measurements/:user/:date", (req, res) => {
  const user = req.params.user.toUpperCase();
  const date = decodeURIComponent(req.params.date);
  let data = readJSON(`measurements_${user}.json`, []);
  data = data.filter(d => d.date !== date);
  writeJSON(`measurements_${user}.json`, data);
  res.json({ ok: true, measurements: data });
});

/* ── API: CSV Export ── */
app.get("/api/export/:user", (req, res) => {
  const user = req.params.user.toUpperCase();
  const menus = readJSON(`menus_${user}.json`, {});
  const comments = readJSON(`comments_${user}.json`, {});

  const esc = (s) => { s = String(s || ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = ["type,user,date,menu,exercise,bodyPart,setNum,kg,reps,repRange,author,comment"];

  for (const [mn, exs] of Object.entries(menus)) {
    for (const ex of exs) {
      if (!ex.records?.length) continue;
      for (const rec of ex.records) {
        for (let si = 0; si < rec.sets.length; si++) {
          const s = rec.sets[si];
          if (!(parseFloat(s.kg) || 0) && !(parseFloat(s.reps) || 0)) continue;
          rows.push(["RECORD", esc(user), esc(rec.date), esc(mn), esc(ex.name), esc(ex.body), si + 1, s.kg || "", s.reps || "", esc(ex.repRange), "", ""].join(","));
        }
      }
    }
  }
  for (const [key, list] of Object.entries(comments)) {
    const [date, ...rest] = key.split("_");
    const mn = rest.join("_");
    for (const c of list) {
      rows.push(["COMMENT", esc(user), esc(date), esc(mn), "", "", "", "", "", "", esc(c.author), esc(c.text)].join(","));
    }
  }

  const csv = "\uFEFF" + rows.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="workout_${user}_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

/* ── Fallback to index.html (SPA) ── */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🏋️  ワークアウトトラッカー サーバー起動`);
  console.log(`   http://localhost:${PORT}\n`);
  console.log(`   トレーナー・トレーニーが同じURLにアクセスして使えます。`);
  console.log(`   データは data/ フォルダにJSON形式で保存されます。\n`);
});

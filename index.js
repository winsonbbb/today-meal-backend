// index.js (updated with login & auth, still using JSON file storage)

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const USERS_PATH = path.join(__dirname, "users.json");
const DATA_PATH = path.join(__dirname, "data.json");

let users = {}; // { username: { password, token } }
let data = {};  // { username: [ restaurants... ] }

try {
  users = JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));
  console.log("✅ Loaded users.json");
} catch {
  console.log("⚠️ No users.json found, starting fresh.");
}

try {
  data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  console.log("✅ Loaded data.json");
} catch {
  console.log("⚠️ No data.json found, starting fresh.");
}

function saveUsers() {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function saveData() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Helper: authenticate request by token
function getUsernameFromToken(req) {
  const token = req.header("X-Auth-Token");
  if (!token) return null;
  for (const [username, info] of Object.entries(users)) {
    if (info.token === token) return username;
  }
  return null;
}

// POST /api/register
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  if (users[username]) return res.status(400).json({ error: "Username already exists" });

  const token = crypto.randomUUID();
  users[username] = { password, token };
  data[username] = [];
  saveUsers();
  saveData();

  res.status(201).json({ token });
});

// POST /api/login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ token: user.token });
});

// GET /api/restaurants
app.get("/api/restaurants", (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  res.json(data[username] || []);
});

// POST /api/restaurants
app.post("/api/restaurants", (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  const restaurant = req.body;
  if (!restaurant.name) return res.status(400).json({ error: "Name required" });

  const list = data[username] ||= [];
  if (list.some(r => r.name === restaurant.name)) return res.status(400).json({ error: "Duplicate" });
  list.push(restaurant);
  saveData();
  res.status(201).json(restaurant);
});

// PUT /api/restaurants/:id
app.put("/api/restaurants/:id", (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  const id = req.params.id;
  const update = req.body;

  data[username] = data[username].map(r =>
    r.id === id ? { ...r, ...update } : r
  );
  saveData();
  res.json({ message: "Updated" });
});

// DELETE /api/restaurants/:id
app.delete("/api/restaurants/:id", (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  const id = req.params.id;
  data[username] = data[username].filter(r => r.id !== id);
  saveData();
  res.json({ message: "Deleted" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// index.js (with id-based routing)
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
let data = {};  // { username: [ { id, name, ... } ] }

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

function getUsernameFromToken(req) {
  const token = req.header("X-Auth-Token");
  if (!token) return null;
  for (const [username, info] of Object.entries(users)) {
    if (info.token === token) return username;
  }
  return null;
}

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

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ token: user.token });
});

app.get("/api/restaurants", (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  res.json(data[username] || []);
});

app.post("/api/restaurants", (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  const restaurant = req.body;
  if (!restaurant.name) return res.status(400).json({ error: "Name is required" });
  restaurant.id = crypto.randomUUID();
  data[username] ||= [];
  data[username].push(restaurant);
  saveData();
  res.status(201).json(restaurant);
});

app.put("/api/restaurants/:id", (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: "Unauthorized" });

  const id = req.params.id;
  const update = req.body;

  const list = data[username] || [];
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) return res.status(404).json({ error: "Not found" });

  data[username][index] = {
    ...list[index],
    ...update,
    drawHistory: update.drawHistory ?? list[index].drawHistory ?? [],
  };

  saveData();
  res.json({ message: "Updated" });
});


app.delete("/api/restaurants/:id", (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  const id = req.params.id;
  data[username] = (data[username] || []).filter((r) => r.id !== id);
  saveData();
  res.json({ message: "Deleted" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

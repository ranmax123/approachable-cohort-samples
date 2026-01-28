const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

app.use(cors());
app.use(bodyParser.json());

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// AUTHENTICATION ROUTES

// Register
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
    [username, hashedPassword],
    function (err) {
      if (err) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
      res.json({ token, userId: this.lastID, username });
    }
  );
});

// Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  db.get(
    `SELECT * FROM users WHERE username = ?`,
    [username],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      res.json({ token, userId: user.id, username: user.username });
    }
  );
});

// IDEAS ROUTES (all require auth)

// Get all ideas for current user
app.get("/api/ideas", authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM ideas WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id],
    (err, ideas) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(ideas.map(idea => ({
        ...idea,
        categories: idea.categories ? idea.categories.split(",") : []
      })));
    }
  );
});

// Create idea
app.post("/api/ideas", authenticateToken, (req, res) => {
  const { title, notes, categories, excitement } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title required" });
  }

  if (excitement && (excitement < 1 || excitement > 10)) {
    return res.status(400).json({ error: "Excitement must be 1-10" });
  }

  const categoriesStr = Array.isArray(categories) ? categories.join(",") : (categories || "");

  db.run(
    `INSERT INTO ideas (user_id, title, notes, categories, excitement) VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, title, notes || "", categoriesStr, excitement || 5],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({
        id: this.lastID,
        user_id: req.user.id,
        title,
        notes,
        categories: categories || [],
        excitement: excitement || 5,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Update idea
app.put("/api/ideas/:id", authenticateToken, (req, res) => {
  const { title, notes, categories, excitement } = req.body;
  const ideaId = req.params.id;

  if (excitement && (excitement < 1 || excitement > 10)) {
    return res.status(400).json({ error: "Excitement must be 1-10" });
  }

  const categoriesStr = Array.isArray(categories) ? categories.join(",") : (categories || "");

  db.run(
    `UPDATE ideas SET title = ?, notes = ?, categories = ?, excitement = ? 
     WHERE id = ? AND user_id = ?`,
    [title, notes || "", categoriesStr, excitement || 5, ideaId, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0) {
        return res.status(404).json({ error: "Idea not found" });
      }
      res.json({ success: true });
    }
  );
});

// Delete idea
app.delete("/api/ideas/:id", authenticateToken, (req, res) => {
  const ideaId = req.params.id;

  db.run(
    `DELETE FROM ideas WHERE id = ? AND user_id = ?`,
    [ideaId, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0) {
        return res.status(404).json({ error: "Idea not found" });
      }
      res.json({ success: true });
    }
  );
});

// Serve static files
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`Idea Tracker API running on http://localhost:${PORT}`);
});

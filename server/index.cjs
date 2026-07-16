const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { pool, ensureSchema } = require("./db.cjs");

const PORT = process.env.PORT || 3000;
const SALT = "NORTH_SALT_2026";
const SESSION_DAYS = 30;

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "15mb" }));

// ---------- uploads ----------
const UPLOAD_ROOT = path.join(__dirname, "uploads");
for (const b of ["product-images", "banners", "receipts"]) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, b), { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket;
    if (!["product-images", "banners", "receipts"].includes(bucket)) return cb(new Error("bad bucket"));
    cb(null, path.join(UPLOAD_ROOT, bucket));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });
app.use("/uploads", express.static(UPLOAD_ROOT));

app.post("/api/storage/:bucket", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });
  res.json({ path: req.file.filename, publicUrl: `/uploads/${req.params.bucket}/${req.file.filename}` });
});

// ---------- auth helpers ----------
function hashPassword(pw) {
  return crypto.createHash("sha256").update(pw + SALT).digest("hex");
}

async function getUserFromSession(req) {
  const sid = req.cookies.north_sid;
  if (!sid) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [sid]
  );
  return rows[0] || null;
}

async function isAdminUser(userId) {
  const { rows } = await pool.query(`SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin'`, [userId]);
  return rows.length > 0;
}

async function attachUser(req, res, next) {
  req.user = await getUserFromSession(req);
  next();
}
app.use(attachUser);

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  const ok = await isAdminUser(req.user.id);
  if (!ok) return res.status(403).json({ error: "forbidden" });
  next();
}

// ---------- auth routes ----------
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const u = (username || "").trim();
    if (u.length < 3) return res.status(400).json({ error: "الاسم يجب أن يكون 3 أحرف فأكثر." });
    if (!password || password.length < 6) return res.status(400).json({ error: "كلمة المرور 6 أحرف فأكثر." });

    const { rows: exists } = await pool.query(`SELECT id FROM users WHERE username = $1`, [u]);
    if (exists.length) return res.status(400).json({ error: "الاسم مستخدم — اختر اسماً مختلفاً." });

    const { rows } = await pool.query(
      `INSERT INTO users(username, password_hash, display_name) VALUES ($1,$2,$1) RETURNING id, username, display_name`,
      [u, hashPassword(password)]
    );
    const user = rows[0];
    await createSession(res, user.id);
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
console.log("BODY:", req.body);
console.log("USERNAME:", username);
console.log("PASSWORD:", password);
    console.log("BODY:", req.body);

    const u = (username || "").trim();

    const { rows } = await pool.query(
      `SELECT id, username, display_name, password_hash FROM users WHERE username = $1`,
      [u]
    );

    console.log("DB:", rows[0]);
    console.log("INPUT HASH:", hashPassword(password || ""));
    console.log("DB HASH:", rows[0]?.password_hash);
    const row = rows[0];
    if (!row || row.password_hash !== hashPassword(password || "")) {
      return res.status(401).json({ error: "اسم أو كلمة مرور غير صحيحة." });
    }
    await createSession(res, row.id);
    res.json({ user: { id: row.id, username: row.username, display_name: row.display_name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const sid = req.cookies.north_sid;
  if (sid) await pool.query(`DELETE FROM sessions WHERE id = $1`, [sid]);
  res.clearCookie("north_sid");
  res.json({ ok: true });
});

app.get("/api/auth/me", async (req, res) => {
  if (!req.user) return res.json({ user: null, profile: null, isAdmin: false });
  const isAdmin = await isAdminUser(req.user.id);
  res.json({
    user: { id: req.user.id, username: req.user.username },
    profile: { id: req.user.id, username: req.user.username, display_name: req.user.display_name },
    isAdmin,
  });
});

async function createSession(res, userId) {
  const sid = crypto.randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(`INSERT INTO sessions(id, user_id, expires_at) VALUES ($1,$2,$3)`, [sid, userId, expires]);
  res.cookie("north_sid", sid, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

// ---------- generic REST layer (mimics the subset of PostgREST we use) ----------
const TABLES = {
  categories: { pk: "id", public: true },
  products: { pk: "id", public: true },
  banners: { pk: "id", public: true },
  orders: { pk: "id", public: false },
  reviews: { pk: "id", public: true },
  chat_threads: { pk: "id", public: false },
  chat_messages: { pk: "id", public: false },
  site_content: { pk: "key", public: true },
  profiles: { pk: "id", public: true }, // virtual view over users
  user_roles: { pk: "id", public: false },
};

function parseFilters(query) {
  const filters = [];
  let order = null;
  let limit = null;
  let select = "*";
  for (const [key, raw] of Object.entries(query)) {
    if (key === "select") { select = raw; continue; }
    if (key === "order") { order = raw; continue; }
    if (key === "limit") { limit = parseInt(raw, 10); continue; }
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (typeof val === "string" && val.startsWith("eq.")) filters.push({ col: key, op: "=", val: val.slice(3) });
    else if (typeof val === "string" && val.startsWith("in.")) {
      const list = val.slice(3).replace(/^\(|\)$/g, "").split(",").map((s) => s.trim());
      filters.push({ col: key, op: "in", val: list });
    }
  }
  return { filters, order, limit, select };
}

async function profilesQuery(filters, order, limit, select) {
  let sql = `SELECT id, username, username AS display_name, username AS username FROM users`;
  const cols = select === "*" ? ["id", "username", "display_name"] : select.split(",").map((c) => c.trim());
  const conds = [];
  const params = [];
  filters.forEach((f) => {
    if (f.op === "=") { params.push(f.val); conds.push(`${f.col === "id" ? "id" : f.col} = $${params.length}`); }
    if (f.op === "in") { params.push(f.val); conds.push(`${f.col} = ANY($${params.length})`); }
  });
  sql = `SELECT id, username, display_name FROM users`;
  if (conds.length) sql += " WHERE " + conds.join(" AND ");
  if (order) { const [c, dir] = order.split("."); sql += ` ORDER BY ${c} ${dir === "desc" ? "DESC" : "ASC"}`; }
  if (limit) sql += ` LIMIT ${limit}`;
  const { rows } = await pool.query(sql, params);
  return rows.map((r) => {
    const out = {};
    cols.forEach((c) => { out[c] = r[c]; });
    return out;
  });
}

app.get("/api/rest/:table", async (req, res) => {
  const { table } = req.params;
  if (!TABLES[table]) return res.status(404).json({ error: "unknown table" });
  const meta = TABLES[table];
  if (!meta.public) {
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const { filters, order, limit, select } = parseFilters(req.query);

    if (table === "profiles") {
      return res.json(await profilesQuery(filters, order, limit, select));
    }

    // authorization narrowing for non-public/ownable tables
    const isAdmin = req.user ? await isAdminUser(req.user.id) : false;
    if (table === "orders" && !isAdmin) {
      filters.push({ col: "user_id", op: "=", val: req.user.id });
    }
    if (table === "chat_threads" && !isAdmin) {
      filters.push({ col: "user_id", op: "=", val: req.user.id });
    }
    if (table === "user_roles" && !isAdmin) {
      // only admin lookups list allowed publicly for "who is admin" checks
    }

    const cols = select === "*" ? "*" : select;
    let sql = `SELECT ${cols} FROM ${table}`;
    const conds = [];
    const params = [];
    filters.forEach((f) => {
      if (f.op === "=") { params.push(f.val); conds.push(`${f.col} = $${params.length}`); }
      if (f.op === "in") { params.push(f.val); conds.push(`${f.col} = ANY($${params.length})`); }
    });
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    if (order) { const [c, dir] = order.split("."); sql += ` ORDER BY ${c} ${dir === "desc" ? "DESC" : "ASC"}`; }
    if (limit) sql += ` LIMIT ${limit}`;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

function buildInsert(table, obj) {
  const cols = Object.keys(obj);
  const params = cols.map((c) => obj[c]);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  return {
    sql: `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`,
    params,
  };
}

app.post("/api/rest/:table", async (req, res) => {
  const { table } = req.params;
  if (!TABLES[table]) return res.status(404).json({ error: "unknown table" });
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  try {
    const isAdmin = await isAdminUser(req.user.id);
    const writeTables = ["categories", "products", "banners", "orders", "reviews", "chat_threads", "chat_messages", "site_content"];
    if (!writeTables.includes(table)) return res.status(403).json({ error: "forbidden" });

    const adminOnly = ["categories", "products", "banners", "site_content"];
    if (adminOnly.includes(table) && !isAdmin) return res.status(403).json({ error: "forbidden" });

    const body = Array.isArray(req.body) ? req.body : [req.body];
    const onConflict = req.query.on_conflict;

    const results = [];
    for (const obj of body) {
      if (table === "orders") obj.user_id = req.user.id;
      if (table === "reviews") obj.user_id = req.user.id;
      if (table === "chat_threads") obj.user_id = req.user.id;
      if (table === "chat_messages" && !isAdmin) obj.sender_id = req.user.id;

      if (onConflict && table === "site_content") {
        const { rows } = await pool.query(
          `INSERT INTO site_content(key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now() RETURNING *`,
          [obj.key, obj.value]
        );
        results.push(rows[0]);
        continue;
      }
      const { sql, params } = buildInsert(table, obj);
      const { rows } = await pool.query(sql, params);
      results.push(rows[0]);
    }
    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.patch("/api/rest/:table", async (req, res) => {
  const { table } = req.params;
  if (!TABLES[table]) return res.status(404).json({ error: "unknown table" });
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  try {
    const isAdmin = await isAdminUser(req.user.id);
    const { filters } = parseFilters(req.query);
    const adminOnly = ["categories", "products", "banners", "site_content"];
    if (adminOnly.includes(table) && !isAdmin) return res.status(403).json({ error: "forbidden" });
    if (table === "orders" && !isAdmin) filters.push({ col: "user_id", op: "=", val: req.user.id });
    if (table === "chat_threads" && !isAdmin) filters.push({ col: "user_id", op: "=", val: req.user.id });
    if (table === "reviews" && !isAdmin) filters.push({ col: "user_id", op: "=", val: req.user.id });

    const setCols = Object.keys(req.body);
    if (!setCols.length) return res.status(400).json({ error: "empty update" });
    const params = setCols.map((c) => req.body[c]);
    const setSql = setCols.map((c, i) => `${c} = $${i + 1}`).join(",");
    let sql = `UPDATE ${table} SET ${setSql}`;
    if ("updated_at" in req.body === false && ["categories", "products", "banners", "orders", "chat_threads"].includes(table)) {
      sql += `, updated_at = now()`;
    }
    const conds = [];
    filters.forEach((f) => {
      if (f.op === "=") { params.push(f.val); conds.push(`${f.col} = $${params.length}`); }
      if (f.op === "in") { params.push(f.val); conds.push(`${f.col} = ANY($${params.length})`); }
    });
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    sql += " RETURNING *";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.delete("/api/rest/:table", async (req, res) => {
  const { table } = req.params;
  if (!TABLES[table]) return res.status(404).json({ error: "unknown table" });
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  try {
    const isAdmin = await isAdminUser(req.user.id);
    const adminOnly = ["categories", "products", "banners", "site_content"];
    if (adminOnly.includes(table) && !isAdmin) return res.status(403).json({ error: "forbidden" });
    const { filters } = parseFilters(req.query);
    if (table === "reviews" && !isAdmin) filters.push({ col: "user_id", op: "=", val: req.user.id });

    const conds = [];
    const params = [];
    filters.forEach((f) => {
      if (f.op === "=") { params.push(f.val); conds.push(`${f.col} = $${params.length}`); }
      if (f.op === "in") { params.push(f.val); conds.push(`${f.col} = ANY($${params.length})`); }
    });
    let sql = `DELETE FROM ${table}`;
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    await pool.query(sql, params);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

// admin-only user list
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.created_at,
            EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role='admin') AS is_admin
     FROM users u ORDER BY u.created_at DESC`
  );
  res.json(rows);
});

app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: "كلمة مرور قصيرة" });
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashPassword(password), req.params.id]);
  res.json({ ok: true });
});

// live visitor counter (real sessions pinging in)
const activeVisitors = new Map(); // id -> lastSeen
app.post("/api/presence/ping", (req, res) => {
  const vid = req.body.visitorId || req.cookies.north_sid || crypto.randomBytes(8).toString("hex");
  activeVisitors.set(vid, Date.now());
  for (const [k, t] of activeVisitors) if (Date.now() - t > 60000) activeVisitors.delete(k);
  res.json({ count: activeVisitors.size });
});
app.get("/api/presence/count", (req, res) => {
  for (const [k, t] of activeVisitors) if (Date.now() - t > 60000) activeVisitors.delete(k);
  res.json({ count: activeVisitors.size });
});

// ---------- static frontend ----------
const DIST = path.join(__dirname, "..", "dist");
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(DIST, "index.html"));
  });
}

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`North Store server running on :${PORT}`));
  })
  .catch((e) => {
    console.error("Failed to init schema", e);
    process.exit(1);
  });

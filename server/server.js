import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

// Load environment variables from .env files
const ENV_FILE = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
try {
  const envPath = path.resolve(process.cwd(), ENV_FILE);
  dotenv.config({ path: envPath });
} catch (_) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// Configuração CORS baseada no ambiente
const corsOptions = {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const DATA_PATH = process.env.DATA_PATH 
  ? path.resolve(process.env.DATA_PATH)
  : path.resolve(process.cwd(), "src/data/tasks.json");

// --- Auth helpers (scrypt hash verify + signed cookie) ---
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'gantt_auth';
const COOKIE_SECRET = process.env.AUTH_COOKIE_SECRET;

function hashPasswordWithScrypt(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function verifyPassword(plain, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const got = hashPasswordWithScrypt(String(plain || ''), salt);
  return safeEqual(got, expectedHex);
}

function sign(value) {
  if (!COOKIE_SECRET) return '';
  return crypto.createHmac('sha256', COOKIE_SECRET).update(String(value)).digest('hex');
}

function issueSession(res) {
  const payload = String(Date.now());
  const token = payload + '.' + sign(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: (Number(process.env.AUTH_COOKIE_MAX_AGE_DAYS) || 30) * 24 * 60 * 60 * 1000
  });
}

function getCookieValue(req, name) {
  const raw = String(req.headers.cookie || '');
  const part = raw.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  if (!part) return null;
  return decodeURIComponent(part.split('=')[1] || '');
}

function isSessionValidFromCookie(req) {
  const val = getCookieValue(req, COOKIE_NAME);
  if (!val) return false;
  const [payload, mac] = String(val).split('.');
  if (!payload || !mac) return false;
  return safeEqual(sign(payload), mac);
}

function requireAuth(req, res, next) {
  if (isSessionValidFromCookie(req)) return next();
  return res.status(401).send('Unauthorized');
}

// Auth endpoints (before API routes)
app.post('/auth/login', (req, res) => {
  try {
    const { password } = req.body || {};
    const stored = process.env.AUTH_PASSWORD_HASH;
    if (!stored || !COOKIE_SECRET) {
      return res.status(500).json({ error: 'Auth not configured' });
    }
    if (verifyPassword(password, stored)) {
      issueSession(res);
      return res.json({ ok: true });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  } catch (err) {
    console.error('❌ Error on /auth/login:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/auth/logout', (req, res) => {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('❌ Error on /auth/logout:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/auth/me', (req, res) => {
  try {
    return isSessionValidFromCookie(req)
      ? res.json({ ok: true })
      : res.status(401).json({ ok: false });
  } catch (err) {
    console.error('❌ Error on /auth/me:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Proteger todas as rotas /api/* com autenticação (ANTES de definir as rotas)
app.use('/api', requireAuth);

// Servir ficheiros estáticos do frontend em produção
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, { index: false })); // index: false para não servir automaticamente index.html
    console.log(`📦 Servindo ficheiros estáticos de: ${distPath}`);
  }
}

// Helpers para normalização de dados
function ensureDataFile() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(
      DATA_PATH,
      JSON.stringify({ tasks: [], links: [], scales: [] }, null, 2)
    );
  }
}

function toISO(value) {
  if (!value) return null;
  if (typeof value === "string") {
    // Se já tiver 'T', assume ISO (ou quase) e tenta parse
    let str = value;
    if (!str.includes("T") && str.includes(" ")) {
      // Converte "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ssZ"
      str = str.replace(" ", "T");
      if (!/[zZ]$/.test(str)) str = str + "Z";
    }
    // Se for apenas "YYYY-MM-DD", deixa como está (navegadores aceitam) ou força T00:00:00Z
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      str = str + "T00:00:00Z";
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function flattenAndNormalizeTasks(tasks) {
  const flat = (tasks || []).map((item) => {
    const t = item && item.task ? { ...item.task } : { ...item };
    // Garante id coerente
    if (typeof t.id === "undefined" && typeof item.id !== "undefined") {
      t.id = item.id;
    }
    // Normaliza datas
    const isoStart = toISO(t.start);
    const isoEnd = toISO(t.end);
    let start = isoStart;
    let end = isoEnd;
    if (!start && end && typeof t.duration === "number") {
      const endDate = new Date(end);
      start = new Date(endDate.getTime() - t.duration * 24 * 60 * 60 * 1000).toISOString();
    }
    if (!end && start && typeof t.duration === "number") {
      const startDate = new Date(start);
      end = new Date(startDate.getTime() + t.duration * 24 * 60 * 60 * 1000).toISOString();
    }

    // Evita enviar start/end nulos, o que pode fazer o Gantt recuar para 1970
    const normalized = { ...t };
    if (start) normalized.start = start; else delete normalized.start;
    if (end) normalized.end = end; else delete normalized.end;
    return normalized;
  });
  return flat;
}

let __tempIdsMigrated = false;
function readData() {
  ensureDataFile();
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

  // Passo 1: normalizar datas/estrutura
  const normalizedTasks = flattenAndNormalizeTasks(raw.tasks);
  let data = { ...raw };
  let updated = false;
  if (JSON.stringify(normalizedTasks) !== JSON.stringify(raw.tasks)) {
    data.tasks = normalizedTasks;
    updated = true;
  }

  // Garante que tasks/links existem como arrays
  if (!Array.isArray(data.tasks)) {
    data.tasks = [];
    updated = true;
  }
  if (!Array.isArray(data.links)) {
    data.links = [];
    updated = true;
  }

  // Passo 2: migrar quaisquer IDs temporários para IDs numéricos e corrigir referências
  // Executa migração de temp ids apenas uma vez por arranque
  if (!__tempIdsMigrated) {
    const changedByIdFix = normalizeTempIds(data);
    if (changedByIdFix) updated = true;
    __tempIdsMigrated = true;
  }

  // Passo 3: remover links inválidos que apontam para tarefas inexistentes
  const idSet = new Set((data.tasks || []).map((t) => String(t.id)));
  const filteredLinks = (data.links || []).filter(
    (l) => idSet.has(String(l.source)) && idSet.has(String(l.target))
  );
  if (filteredLinks.length !== (data.links || []).length) {
    data.links = filteredLinks;
    updated = true;
  }

  // Passo 4: normalizar parents inexistentes para 0 (raiz)
  for (const t of data.tasks) {
    const hasParent = typeof t.parent !== "undefined" && t.parent !== null;
    if (hasParent && String(t.parent) !== "0" && !idSet.has(String(t.parent))) {
      t.parent = 0;
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  }
  return data;
}

function writeData(json) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(json, null, 2));
}

// Migração: converte ids temp://* para ids numéricos e ajusta parents/links
function normalizeTempIds(data) {
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const links = Array.isArray(data.links) ? data.links : [];

  const tempTasks = tasks.filter(t => typeof t.id === "string" && t.id.startsWith("temp://"));
  if (tempTasks.length === 0) return false;

  const currentMaxId = tasks.reduce((m, t) => (typeof t.id === "number" && t.id > m ? t.id : m), 0);
  let nextId = currentMaxId + 1;
  const mapTempToReal = new Map();

  // Atribuir novos ids
  for (const t of tempTasks) {
    mapTempToReal.set(String(t.id), nextId++);
  }

  // Atualizar tasks (id e parent)
  for (const t of tasks) {
    if (typeof t.id === "string" && mapTempToReal.has(String(t.id))) {
      t.id = mapTempToReal.get(String(t.id));
    }
    if (typeof t.parent === "string" && mapTempToReal.has(String(t.parent))) {
      t.parent = mapTempToReal.get(String(t.parent));
    }
  }

  // Atualizar links (source/target)
  for (const l of links) {
    if (typeof l.source === "string" && mapTempToReal.has(String(l.source))) {
      l.source = mapTempToReal.get(String(l.source));
    }
    if (typeof l.target === "string" && mapTempToReal.has(String(l.target))) {
      l.target = mapTempToReal.get(String(l.target));
    }
  }

  data.tasks = tasks;
  data.links = links;
  return true;
}

app.get("/api/data", (req, res) => {
  try {
    const json = readData();
    res.json(json);
  } catch (err) {
    console.error("❌ Erro ao ler JSON:", err.message);
    res.status(500).json({ error: "Erro ao ler ficheiro JSON", details: err.message });
  }
});

app.post("/api/data", (req, res) => {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erro ao gravar JSON:", err.message);
    res.status(500).json({ error: "Erro ao gravar ficheiro JSON", details: err.message });
  }
});

// Novos endpoints para o RestDataProvider
app.get("/api", (req, res) => {
  try {
    const json = readData();
    const requestedId = req.query.id ?? req.query.parent ?? req.query.parentId;
    if (typeof requestedId !== "undefined") {
      const idStr = String(requestedId);
      const tasks = (json.tasks || []).filter((t) => String(t.parent ?? "") === idStr);
      // Opcional: filtra links que tocam as tarefas encontradas
      const ids = new Set(tasks.map((t) => String(t.id)));
      const links = (json.links || []).filter(
        (l) => ids.has(String(l.source)) || ids.has(String(l.target))
      );
      return res.json({ tasks, links });
    }
    res.json(json);
  } catch (err) {
    console.error("❌ Erro ao ler JSON:", err.message);
    res.status(500).json({ error: "Erro ao ler ficheiro JSON", details: err.message });
  }
});

// Endpoints específicos para tasks e links (que o RestDataProvider espera)
app.get("/api/tasks", (req, res) => {
  try {
    const json = readData();
    res.json(json.tasks || []);
  } catch (err) {
    console.error("❌ Erro ao ler tasks:", err.message);
    res.status(500).json({ error: "Erro ao ler tasks", details: err.message });
  }
});

app.get("/api/links", (req, res) => {
  try {
    const json = readData();
    res.json(json.links || []);
  } catch (err) {
    console.error("❌ Erro ao ler links:", err.message);
    res.status(500).json({ error: "Erro ao ler links", details: err.message });
  }
});

// Endpoints para utilizadores (catálogo de responsáveis)
app.get("/api/users", (req, res) => {
  try {
    const json = readData();
    res.json(json.users || []);
  } catch (err) {
    console.error("❌ Erro ao ler users:", err.message);
    res.status(500).json({ error: "Erro ao ler users", details: err.message });
  }
});

app.post("/api/users", (req, res) => {
  try {
    const raw = readData();
    const incoming = Array.isArray(req.body) ? req.body : (req.body && req.body.users) || [];
    raw.users = incoming;
    writeData(raw);
    console.log("📝 Users substituídos via POST /api/users (array)");
    res.json({ ok: true, users: raw.users });
  } catch (err) {
    console.error("❌ Erro ao gravar users:", err.message);
    res.status(500).json({ error: "Erro ao gravar users", details: err.message });
  }
});

app.post("/api", (req, res) => {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(req.body, null, 2));
    console.log("📝 Dados atualizados via POST /api");
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erro ao gravar JSON:", err.message);
    res.status(500).json({ error: "Erro ao gravar ficheiro JSON", details: err.message });
  }
});

// Endpoints POST para tasks e links
app.post("/api/tasks", (req, res) => {
  try {
    const raw = readData();
    console.log("📥 POST /api/tasks", { body: req.body });
    
    // Suporta tanto substituição total (array) como criação de uma única task (objeto)
    if (Array.isArray(req.body)) {
      raw.tasks = req.body;
      raw.tasks = flattenAndNormalizeTasks(raw.tasks);
      writeData(raw);
      console.log("📝 Tasks substituídas via POST /api/tasks (array)");
      res.json({ ok: true, tasks: raw.tasks });
      return;
    }

    const incoming = (req.body && (req.body.task || req.body)) || {};
    // Substitui IDs temporários por um novo ID numérico
    const hasTempId = typeof incoming.id === "string" && incoming.id.startsWith("temp://");
    const nextId =
      typeof incoming.id !== "undefined" && !hasTempId
        ? incoming.id
        : (raw.tasks.reduce((m, t) => (t.id > m ? t.id : m), 0) || 0) + 1;
    // Garantir que o id final seja o nextId (não sobrescrever com temp)
    const newTask = flattenAndNormalizeTasks([{ ...incoming, id: nextId }])[0];
    // Garante consistência mínima de campos comuns
    if (!newTask.start && newTask.end && newTask.duration) {
      // nada a fazer, apenas deixa como veio
    }
    raw.tasks.push(newTask);
    writeData(raw);
    console.log("➕ Task criada via POST /api/tasks", newTask.id, "a partir de", incoming.id);
    // RestDataProvider espera apenas a tarefa, não um objeto com { ok, task }
    res.status(201).json(newTask);
  } catch (err) {
    console.error("❌ Erro ao gravar tasks:", err.message);
    res.status(500).json({ error: "Erro ao gravar tasks", details: err.message });
  }
});

app.post("/api/links", (req, res) => {
  try {
    const raw = readData();
    // Suporta tanto substituição total (array) como criação de um único link (objeto)
    if (Array.isArray(req.body)) {
      raw.links = req.body;
      writeData(raw);
      console.log("📝 Links substituídos via POST /api/links (array)");
      res.json({ ok: true, links: raw.links });
      return;
    }

    const incoming = (req.body && (req.body.link || req.body)) || {};
    const nextId =
      typeof incoming.id !== "undefined"
        ? incoming.id
        : (raw.links.reduce((m, l) => (l.id > m ? l.id : m), 0) || 0) + 1;
    const newLink = { id: nextId, ...incoming };
    raw.links.push(newLink);
    writeData(raw);
    console.log("➕ Link criado via POST /api/links", newLink.id);
    res.status(201).json({ ok: true, link: newLink });
  } catch (err) {
    console.error("❌ Erro ao gravar links:", err.message);
    res.status(500).json({ error: "Erro ao gravar links", details: err.message });
  }
});

// Novos endpoints RESTful esperados pelo RestDataProvider
app.put("/api/tasks/:id", (req, res) => {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return res.status(404).json({ error: "Ficheiro de dados não encontrado" });
    }
    const raw = readData();
    const idParam = req.params.id;
    const incoming = (req.body && (req.body.task || req.body)) || {};
    
    console.log(`📥 PUT /api/tasks/${idParam}`, { body: req.body });
    
    // Se for um ID temporário, tenta encontrar pela estrutura da tarefa
    if (typeof idParam === "string" && idParam.startsWith("temp://")) {
      console.log(`🔄 Tentando atualizar tarefa temporária ${idParam}:`, incoming);
      
      // O problema é que temp:// significa que a tarefa ainda não existe no servidor
      // Devemos criá-la com um ID real
      console.log(`⚠️ Tarefa temporária ${idParam} - criando nova tarefa`);
      const nextId = (raw.tasks.reduce((m, t) => (t.id > m ? t.id : m), 0) || 0) + 1;
      // Garantir que o id final seja o nextId (não sobrescrever com temp)
      const newTask = flattenAndNormalizeTasks([{ ...incoming, id: nextId }])[0];
      raw.tasks.push(newTask);
      writeData(raw);
      console.log(`➕ Nova task criada com ID ${newTask.id} a partir de ${idParam}`);
      // RestDataProvider espera apenas a tarefa, não um objeto com { ok, task }
      res.status(201).json(newTask);
      return;
    }
    
    // Comportamento normal para IDs não-temporários
    const idx = raw.tasks.findIndex((t) => String(t.id) === String(idParam));
    if (idx >= 0) {
      const merged = { ...raw.tasks[idx], ...incoming };
      raw.tasks[idx] = flattenAndNormalizeTasks([merged])[0];
      writeData(raw);
      console.log(`🔄 Task ${raw.tasks[idx].id} atualizada via PUT /api/tasks/:id`);
      // RestDataProvider espera apenas a tarefa, não um objeto com { ok, task }
      res.json(raw.tasks[idx]);
    } else {
      console.log(`❌ Task ${idParam} não encontrada`);
      res.status(404).json({ error: "Task não encontrada" });
    }
  } catch (err) {
    console.error("❌ Erro ao atualizar task:", err.message, err.stack);
    res.status(500).json({ error: "Erro ao atualizar task", details: err.message });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return res.status(404).json({ error: "Ficheiro de dados não encontrado" });
    }
    const raw = readData();
    const idParam = req.params.id;
    const initialLength = raw.tasks.length;
    raw.tasks = raw.tasks.filter((t) => String(t.id) !== String(idParam));
    if (raw.tasks.length < initialLength) {
      writeData(raw);
      console.log(`❌ Task ${idParam} removida via DELETE /api/tasks/:id`);
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: "Task não encontrada" });
    }
  } catch (err) {
    console.error("❌ Erro ao remover task:", err.message);
    res.status(500).json({ error: "Erro ao remover task", details: err.message });
  }
});

app.put("/api/links/:id", (req, res) => {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return res.status(404).json({ error: "Ficheiro de dados não encontrado" });
    }
    const raw = readData();
    const idParam = req.params.id;
    const idx = raw.links.findIndex((l) => String(l.id) === String(idParam));
    if (idx >= 0) {
      const incoming = (req.body && (req.body.link || req.body)) || {};
      raw.links[idx] = { ...raw.links[idx], ...incoming };
      writeData(raw);
      console.log(`🔄 Link ${raw.links[idx].id} atualizado via PUT /api/links/:id`);
      res.json({ ok: true, link: raw.links[idx] });
    } else {
      res.status(404).json({ error: "Link não encontrado" });
    }
  } catch (err) {
    console.error("❌ Erro ao atualizar link:", err.message);
    res.status(500).json({ error: "Erro ao atualizar link", details: err.message });
  }
});

app.delete("/api/links/:id", (req, res) => {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return res.status(404).json({ error: "Ficheiro de dados não encontrado" });
    }
    const raw = readData();
    const idParam = req.params.id;
    const initialLength = raw.links.length;
    raw.links = raw.links.filter((l) => String(l.id) !== String(idParam));
    if (raw.links.length < initialLength) {
      writeData(raw);
      console.log(`❌ Link ${idParam} removido via DELETE /api/links/:id`);
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: "Link não encontrado" });
    }
  } catch (err) {
    console.error("❌ Erro ao remover link:", err.message);
    res.status(500).json({ error: "Erro ao remover link", details: err.message });
  }
});

app.put("/api/:id", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    const idx = raw.tasks.findIndex(t => t.id === +req.params.id);
    if (idx >= 0) {
      raw.tasks[idx] = { ...raw.tasks[idx], ...req.body };
      fs.writeFileSync(DATA_PATH, JSON.stringify(raw, null, 2));
      console.log(`🔄 Task ${req.params.id} atualizada via PUT`);
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: "Task não encontrada" });
    }
  } catch (err) {
    console.error("❌ Erro ao atualizar task:", err.message);
    res.status(500).json({ error: "Erro ao atualizar task", details: err.message });
  }
});

app.delete("/api/:id", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    const initialLength = raw.tasks.length;
    raw.tasks = raw.tasks.filter(t => t.id !== +req.params.id);
    if (raw.tasks.length < initialLength) {
      fs.writeFileSync(DATA_PATH, JSON.stringify(raw, null, 2));
      console.log(`❌ Task ${req.params.id} removida via DELETE`);
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: "Task não encontrada" });
    }
  } catch (err) {
    console.error("❌ Erro ao remover task:", err.message);
    res.status(500).json({ error: "Erro ao remover task", details: err.message });
  }
});

// Fallback para SPA - deve vir DEPOIS das rotas API
// Serve o index.html para todas as rotas não-API (permite SPA routing)
// NÃO proteger com requireAuth aqui - o AuthGate no frontend é que pede a senha
if (process.env.NODE_ENV === 'production') {
  // Qualquer rota que NÃO comece com /api|/auth devolve index.html (SPA)
  app.get(/^(?!\/(api|auth)).*/, (req, res) => {
    const indexPath = path.resolve(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend não encontrado');
    }
  });
}

const PORT = process.env.PORT || 3025;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✅ Server em http://${HOST}:${PORT}`);
  console.log(`📂 Caminho dos dados: ${DATA_PATH}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS: ${JSON.stringify(corsOptions.origin)}`);
});

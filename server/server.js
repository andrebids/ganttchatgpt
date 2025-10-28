import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const DATA_PATH = path.resolve(process.cwd(), "src/data/tasks.json");

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
    return { ...t, start, end };
  });
  return flat;
}

function readData() {
  ensureDataFile();
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  const normalizedTasks = flattenAndNormalizeTasks(raw.tasks);
  const changed = JSON.stringify(normalizedTasks) !== JSON.stringify(raw.tasks);
  if (changed) {
    const fixed = { ...raw, tasks: normalizedTasks };
    fs.writeFileSync(DATA_PATH, JSON.stringify(fixed, null, 2));
    return fixed;
  }
  return raw;
}

function writeData(json) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(json, null, 2));
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
    const nextId =
      typeof incoming.id !== "undefined"
        ? incoming.id
        : (raw.tasks.reduce((m, t) => (t.id > m ? t.id : m), 0) || 0) + 1;
    const newTask = flattenAndNormalizeTasks([{ id: nextId, ...incoming }])[0];
    // Garante consistência mínima de campos comuns
    if (!newTask.start && newTask.end && newTask.duration) {
      // nada a fazer, apenas deixa como veio
    }
    raw.tasks.push(newTask);
    writeData(raw);
    console.log("➕ Task criada via POST /api/tasks", newTask.id);
    res.status(201).json({ ok: true, task: newTask });
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
    const idx = raw.tasks.findIndex((t) => String(t.id) === String(idParam));
    if (idx >= 0) {
      const incoming = (req.body && (req.body.task || req.body)) || {};
      const merged = { ...raw.tasks[idx], ...incoming };
      raw.tasks[idx] = flattenAndNormalizeTasks([merged])[0];
      writeData(raw);
      console.log(`🔄 Task ${raw.tasks[idx].id} atualizada via PUT /api/tasks/:id`);
      res.json({ ok: true, task: raw.tasks[idx] });
    } else {
      res.status(404).json({ error: "Task não encontrada" });
    }
  } catch (err) {
    console.error("❌ Erro ao atualizar task:", err.message);
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

const PORT = 3025;
app.listen(PORT, () => console.log(`✅ Server em http://localhost:${PORT}`));

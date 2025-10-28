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

app.get("/api/data", (req, res) => {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      console.warn("⚠️ Ficheiro JSON não encontrado, a criar novo...");
      fs.writeFileSync(
        DATA_PATH,
        JSON.stringify({ tasks: [], links: [], scales: [] }, null, 2)
      );
    }
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const json = JSON.parse(raw);
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

const PORT = 3025;
app.listen(PORT, () => console.log(`✅ Server em http://localhost:${PORT}`));

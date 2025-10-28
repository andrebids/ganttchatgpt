import React, { useEffect, useState } from "react";
import { Gantt, Toolbar, Editor, ContextMenu } from "@svar-ui/react-gantt";
import axios from "axios";

export default function BasicInit({ skinSettings }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:3025/api/data")
      .then((res) => {
        if (res.data && Array.isArray(res.data.tasks)) {
          setData(res.data);
        } else {
          throw new Error("Formato de dados inválido");
        }
      })
      .catch((err) => {
        console.error("❌ Erro ao carregar dados:", err);
        setError(err.message);
      });
  }, []);

  const handleChange = (tasks, links) => {
    if (!data) return;
    const updated = { ...data, tasks, links };
    setData(updated);
    axios.post("http://localhost:3025/api/data", updated).catch(console.error);
  };

  const handleAddProject = () => {
    if (!data) return;
    const tasks = [...data.tasks];
    const nextId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    const now = new Date();

    const newProject = {
      id: nextId,
      text: `Novo Projeto ${nextId}`,
      start: now,
      end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      type: "summary",
      progress: 0,
      open: true,
      parent: 0
    };

    const subtask = {
      id: nextId + 1,
      text: `Tarefa inicial ${nextId}`,
      start: now,
      end: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      type: "task",
      progress: 0,
      parent: nextId
    };

    const updated = {
      ...data,
      tasks: [...tasks, newProject, subtask]
    };

    setData(updated);
    axios.post("http://localhost:3025/api/data", updated).catch(console.error);
  };

  if (error) return <div style={{ color: "red" }}>Erro: {error}</div>;
  if (!data) return <div>A carregar dados do Gantt...</div>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Barra superior com o botão custom */}
      <div
        style={{
          padding: "8px 12px",
          background: "#1a1a1a",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <span style={{ color: "#ccc", fontWeight: "bold" }}>Painel de Projetos</span>
        <button
          onClick={handleAddProject}
          style={{
            background: "#3983eb",
            color: "#fff",
            border: "none",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          + Novo Projeto
        </button>
      </div>

      {/* O Gantt com tudo dentro */}
      <div style={{ flexGrow: 1 }}>
        <Gantt
          {...skinSettings}
          tasks={data.tasks}
          links={data.links}
          scales={data.scales}
          onChange={handleChange}
        >
          <Toolbar />
          <Editor />
          <ContextMenu />
        </Gantt>
      </div>
    </div>
  );
}

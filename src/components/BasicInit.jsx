import React, { useEffect, useState } from "react";
import { Gantt } from "@svar-ui/react-gantt";
import axios from "axios";

export default function BasicInit({ skinSettings }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:3025/api/data")
      .then((res) => {
        if (res.data && Array.isArray(res.data.tasks) && Array.isArray(res.data.scales)) {
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

  // === Fase de carregamento / erro ===
  if (error) return <div style={{ color: "red" }}>Erro: {error}</div>;
  if (!data) return <div>A carregar dados do Gantt...</div>;

  // === Fase normal ===
  return (
    <div style={{ height: "100vh" }}>
      <Gantt
        {...skinSettings}
        tasks={data.tasks}
        links={data.links}
        scales={data.scales}
        onChange={handleChange}
      />
    </div>
  );
}

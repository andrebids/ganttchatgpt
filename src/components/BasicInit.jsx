import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Gantt, Toolbar, Editor, ContextMenu, Fullscreen } from "@svar-ui/react-gantt";
import { RestDataProvider } from "@svar-ui/gantt-data-provider";

export default function BasicInit({ skinSettings }) {
  const restProvider = useMemo(
    () => new RestDataProvider("http://localhost:3025/api"),
    []
  );

  const [api, setApi] = useState();
  const [tasks, setTasks] = useState();
  const [links, setLinks] = useState();

  // Carrega os dados iniciais do JSON
  useEffect(() => {
    restProvider.getData().then(({ tasks: t, links: l }) => {
      setTasks(t);
      setLinks(l);
      console.log("📦 Dados carregados do backend:", { t, l });
    });
  }, [restProvider]);

  // Inicializa o Gantt e liga o Event Bus
  const init = useCallback(
    (api) => {
      console.log("🔌 Ligado ao Event Bus do Gantt");
      setApi(api);

      // Liga o backend como "next" na cadeia de eventos
      api.setNext(restProvider);

      // Handler para request-data (importante para o funcionamento correto)
      api.on("request-data", (ev) => {
        restProvider.getData(ev.id).then(({ tasks, links }) => {
          api.exec("provide-data", {
            id: ev.id,
            data: {
              tasks,
              links,
            },
          });
        });
      });

      // Loga os eventos principais
      api.on("update-task", (ev) => {
        console.log("🔄 Task atualizada via drag/resize:", ev);
      });

      api.on("add-task", (ev) => {
        console.log("➕ Nova tarefa adicionada:", ev);
      });

      api.on("delete-task", (ev) => {
        console.log("❌ Tarefa removida:", ev);
      });

      api.on("move-task", (ev) => {
        console.log("🚚 Tarefa movida:", ev);
      });
    },
    [restProvider]
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
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
          onClick={() => {
            if (!api) return;
            const start = new Date();
            const end = new Date(start);
            end.setDate(start.getDate() + 2);
            const task = {
              text: "Nova tarefa",
              start: start.toISOString(),
              end: end.toISOString(),
              type: "task",
              progress: 0,
              parent: 0,
            };
            api.exec("add-task", { task });
          }}
          style={{
            background: "#2b2b2b",
            color: "#ddd",
            border: "1px solid #444",
            padding: "6px 10px",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Adicionar Tarefa
        </button>
      </div>

      <div style={{ flexGrow: 1 }}>
        <ContextMenu api={api}>
          <Fullscreen hotkey="ctrl+shift+f">
            <Gantt
              {...skinSettings}
              editable={true}
              tasks={tasks}
              links={links}
              init={init}
              scales={[
                { unit: "month", step: 1, format: "MMMM yyyy" },
                { unit: "day", step: 1, format: "d" },
              ]}
            >
              <Toolbar />
            </Gantt>
          </Fullscreen>
        </ContextMenu>
        {api && <Editor api={api} />}
      </div>
    </div>
  );
}

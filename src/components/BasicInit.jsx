import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Gantt, Toolbar, Editor, ContextMenu, Fullscreen } from "@svar-ui/react-gantt";
import { RestDataProvider } from "@svar-ui/gantt-data-provider";

export default function BasicInit({ skinSettings }) {
  const restProvider = useMemo(
    () => new RestDataProvider("http://localhost:3025/api"),
    []
  );

  const [api, setApi] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);

  // Carrega os dados iniciais - exatamente como no exemplo oficial
  useEffect(() => {
    restProvider.getData().then(({ tasks: t, links: l }) => {
      setTasks(t);
      setLinks(l);
      console.log("📦 Dados carregados do backend:", t.length, "tarefas");
    });
  }, [restProvider]);

  // Inicializa o Gantt - exatamente como no exemplo oficial
  const init = useCallback((api) => {
    setApi(api);
    
    // Liga o backend como "next" na cadeia de eventos
    api.setNext(restProvider);

    // DEBUG: logar chamadas REST do browser (apenas para localhost:3025)
    try {
      if (!window.__ganttFetchLogged) {
        window.__ganttFetchLogged = true;
        const _fetch = window.fetch;
        window.fetch = async (input, init) => {
          const url = typeof input === "string" ? input : input?.url;
          const method = init?.method || "GET";
          if (url && url.includes("http://localhost:3025")) {
            // Tenta clonar body para log
            let body = init?.body;
            try { body = typeof body === "string" ? body : body && JSON.stringify(body); } catch (_) {}
            console.log(`🌐 ${method} ${url}`, body || "");
          }
          const res = await _fetch(input, init);
          try {
            if (url && url.includes("http://localhost:3025")) {
              const clone = res.clone();
              const text = await clone.text();
              console.log(`🌐 ← ${res.status} ${method} ${url}`, text);
            }
          } catch (_) {}
          return res;
        };
      }
    } catch (_) {}

    // Handler para request-data (carregamento dinâmico)
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

    // Logs das ações principais (não alteram o fluxo)
    api.on("add-task", (ev) => {
      console.log("➕ add-task", ev);
    });
    api.on("update-task", (ev) => {
      console.log("🔄 update-task", ev);
    });
    api.on("delete-task", (ev) => {
      console.log("🗑️ delete-task", ev);
    });
    api.on("move-task", (ev) => {
      console.log("🚚 move-task", ev);
    });
    api.on("copy-task", (ev) => {
      console.log("📋 copy-task", ev);
    });

    // Também interceptamos apenas para logar antes do envio ao RestDataProvider
    api.intercept("add-task", (ev) => { console.log("➡️ sending add-task", ev); return ev; });
    api.intercept("update-task", (ev) => { console.log("➡️ sending update-task", ev); return ev; });
    api.intercept("delete-task", (ev) => { console.log("➡️ sending delete-task", ev); return ev; });
    api.intercept("move-task", (ev) => { console.log("➡️ sending move-task", ev); return ev; });
    api.intercept("copy-task", (ev) => { console.log("➡️ sending copy-task", ev); return ev; });

    // Abrir o Editor com um clique na barra da tarefa
    api.on("click-task", (ev) => {
      if (!ev || ev.id == null) return;
      api.exec("show-editor", { id: ev.id });
    });
  }, [restProvider]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flexGrow: 1 }}>
        <ContextMenu api={api}>
          <Fullscreen hotkey="ctrl+shift+f">
            <Toolbar api={api} />
            <Gantt
              {...skinSettings}
              editable={true}
              tasks={tasks}
              links={links}
              init={init}
              scales={[
                { unit: "month", step: 1, format: "MMMM yyyy" },
                { unit: "week", step: 1, format: "II" },
              ]}
            />
          </Fullscreen>
        </ContextMenu>
        {api && <Editor api={api} />}
      </div>
    </div>
  );
}

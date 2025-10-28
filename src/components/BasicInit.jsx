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
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // (sem override de columns) — usa colunas padrão do Gantt

  // Carrega os dados iniciais do JSON
  useEffect(() => {
    restProvider.getData().then(({ tasks: t, links: l }) => {
      setTasks(t);
      setLinks(l);
      console.log("📦 Dados carregados do backend:", { t, l });
    });
  }, [restProvider]);

  // Log de verificação dos ícones (wxi-*) no DOM
  useEffect(() => {
    const logIcons = () => {
      try {
        const nodeList = document.querySelectorAll('.wxi, [class*="wxi-"]');
        const icons = Array.from(nodeList);
        const first = icons[0];
        let details = null;
        if (first) {
          const cs = getComputedStyle(first);
          details = {
            classes: first.className,
            maskImage: cs.maskImage,
            webkitMaskImage: cs.webkitMaskImage,
            backgroundImage: cs.backgroundImage,
            width: cs.width,
            height: cs.height,
          };
        }
        console.log(`🧩 Verificação de ícones: ${icons.length} elementos wxi encontrados`, details);
      } catch (err) {
        console.warn('⚠️ Falha ao verificar ícones wxi:', err);
      }
    };
    // executa após render e após possíveis montagens tardias
    const t1 = setTimeout(logIcons, 0);
    const t2 = setTimeout(logIcons, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [tasks, links]);

  // Inicializa o Gantt e liga o Event Bus
  const init = useCallback(
    (api) => {
      console.log("🔌 Ligado ao Event Bus do Gantt");
      setApi(api);
      // Expor API globalmente para debug no DevTools
      try { window._ganttApi = api; } catch (_) {}

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

      // Guarda seleção atual para permitir adicionar subtarefas
      api.on("select-task", (ev) => {
        const id = ev?.id ?? ev?.task?.id;
        if (id != null) setSelectedTaskId(id);
      });
      api.on("unselect-task", () => setSelectedTaskId(null));

      api.on("add-task", (ev) => {
        console.log("➕ Nova tarefa adicionada:", ev);
      });

      api.on("delete-task", (ev) => {
        console.log("❌ Tarefa removida:", ev);
      });

      api.on("move-task", (ev) => {
        console.log("🚚 Tarefa movida:", ev);
      });

      // Abrir o Editor com um clique na barra da tarefa
      api.on("click-task", (ev) => {
        if (!ev || ev.id == null) return;
        console.log("🖱️ click-task", ev);
        api.exec("show-editor", { id: ev.id });
      });

      // Alternativa: abrir com duplo clique
      api.on("doubleclick-task", (ev) => {
        if (!ev || ev.id == null) return;
        console.log("🖱️ doubleclick-task", ev);
        api.exec("show-editor", { id: ev.id });
      });

      // Observa quando o editor é solicitado (sem alterar o fluxo)
      api.intercept("show-editor", (payload) => {
        console.log("🪄 intercept show-editor", payload);
        // não retornar nada para não alterar o comportamento padrão
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
        <button
          onClick={() => {
            if (!api || selectedTaskId == null) return;
            const start = new Date();
            const end = new Date(start);
            end.setDate(start.getDate() + 1);
            const task = {
              text: "Nova subtarefa",
              start: start.toISOString(),
              end: end.toISOString(),
              type: "task",
              progress: 0,
              parent: selectedTaskId,
            };
            api.exec("add-task", { task });
          }}
          style={{
            background: "#2b2b2b",
            color: "#ddd",
            border: "1px solid #444",
            padding: "6px 10px",
            borderRadius: 6,
            cursor: selectedTaskId == null ? "not-allowed" : "pointer",
            opacity: selectedTaskId == null ? 0.6 : 1,
            marginLeft: 8
          }}
          title={selectedTaskId == null ? "Seleciona uma tarefa para adicionar subtarefa" : ""}
        >
          Adicionar Subtarefa
        </button>
        <button
          onClick={() => {
            if (!api || selectedTaskId == null) return;
            console.log("🧭 Botão abrir editor para id:", selectedTaskId);
            api.exec("show-editor", { id: selectedTaskId });
          }}
          style={{
            background: "#2b2b2b",
            color: "#ddd",
            border: "1px solid #444",
            padding: "6px 10px",
            borderRadius: 6,
            cursor: selectedTaskId == null ? "not-allowed" : "pointer",
            opacity: selectedTaskId == null ? 0.6 : 1,
            marginLeft: 8
          }}
          title={selectedTaskId == null ? "Seleciona uma tarefa para editar" : ""}
        >
          Editar Selecionada
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
                { unit: "week", step: 1, format: "II" },
              ]}
            >
              <Toolbar />
            </Gantt>
          </Fullscreen>
        </ContextMenu>
        {api && <DebugEditor api={api} />}
      </div>
    </div>
  );
}

function DebugEditor({ api }) {
  useEffect(() => {
    console.log("🧩 Editor montado");
    return () => console.log("🧩 Editor desmontado");
  }, []);
  return <Editor api={api} />;
}

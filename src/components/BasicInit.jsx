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
            >
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

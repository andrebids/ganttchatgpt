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
    });
  }, [restProvider]);

  // Inicializa o Gantt - exatamente como no exemplo oficial
  const init = useCallback((api) => {
    setApi(api);
    // Liga o backend como "next" na cadeia de eventos
    api.setNext(restProvider);
    // Carregamento dinâmico
    api.on("request-data", (ev) => {
      restProvider.getData(ev.id).then(({ tasks, links }) => {
        api.exec("provide-data", { id: ev.id, data: { tasks, links } });
      });
    });
    // Abrir Editor ao clicar
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

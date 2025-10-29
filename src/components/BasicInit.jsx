import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Gantt, Toolbar, Editor, ContextMenu, Fullscreen } from "@svar-ui/react-gantt";
import { RestDataProvider } from "@svar-ui/gantt-data-provider";
import AvatarCell from "./AvatarCell.jsx";
import AssignDialog from "./AssignDialog.jsx";
import NameAndDateCell from "./NameAndDateCell.jsx";
import AddTaskCell from "./AddTaskCell.jsx";
import StartDateCell from "./StartDateCell.jsx";
import EndDateCell from "./EndDateCell.jsx";
import WeeksCell from "./WeeksCell.jsx";
import EditorAssignDropdown from "./EditorAssignDropdown.jsx";

export default function BasicInit({ skinSettings }) {
  const API_URL = import.meta.env.VITE_API_URL || "/api";
  
  const restProvider = useMemo(
    () => new RestDataProvider(API_URL),
    []
  );

  const [api, setApi] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);
  const [users, setUsers] = useState([]);
  const [editorTaskId, setEditorTaskId] = useState(null);
  const [assignDialog, setAssignDialog] = useState({ open: false, id: null });

  // Carrega os dados iniciais - robusto a diferentes formatos de retorno
  useEffect(() => {
    restProvider.getData().then((res) => {
      const tasksData = res?.tasks ?? res?.data?.tasks ?? [];
      const linksData = res?.links ?? res?.data?.links ?? [];
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setLinks(Array.isArray(linksData) ? linksData : []);
    });
    // carrega catálogo de utilizadores
    fetch(`${API_URL}/users`)
      .then((r) => r.json())
      .then((u) => setUsers(u))
      .catch(() => setUsers([]));
  }, [restProvider, API_URL]);

  // Inicializa o Gantt - exatamente como no exemplo oficial
  const init = useCallback((api) => {
    setApi(api);
    // Liga o backend como "next" na cadeia de eventos
    api.setNext(restProvider);
    // Carregamento dinâmico
    api.on("request-data", (ev) => {
      restProvider.getData(ev.id).then((res) => {
        const tasksData = res?.tasks ?? res?.data?.tasks ?? [];
        const linksData = res?.links ?? res?.data?.links ?? [];
        api.exec("provide-data", {
          id: ev.id,
          data: {
            tasks: Array.isArray(tasksData) ? tasksData : [],
            links: Array.isArray(linksData) ? linksData : [],
          },
        });
      });
    });
    // Abrir Editor ao clicar
    api.on("click-task", (ev) => {
      if (!ev || ev.id == null) return;
      setEditorTaskId(ev.id);
      api.exec("show-editor", { id: ev.id });
    });

    // Reage quando o editor é aberto/fechado por outros caminhos (toolbar, etc.)
    api.on?.("show-editor", (ev) => {
      if (ev?.id != null) setEditorTaskId(ev.id);
    });
    api.on?.("hide-editor", () => setEditorTaskId(null));
    // Observa mudanças de zoom
    api.on("zoom-scale", () => {
      console.log("Zoom level:", api.getState().zoom);
    });
  }, [restProvider]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flexGrow: 1 }}>
        <ContextMenu api={api}>
          <Fullscreen hotkey="ctrl+shift+f">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, padding: "6px 0" }}>
              <Toolbar api={api} />
            </div>
            <Gantt
              {...skinSettings}
              editable={true}
              tasks={tasks}
              links={links}
              init={init}
              cellWidth={100}
              zoom
              markers={[{ start: new Date(), text: "Today", css: "today-marker" }]}
              highlightTime={(date, unit) => {
                const now = new Date();
                const isSameDay = date?.toDateString?.() === now.toDateString();
                return unit === "day" && isSameDay ? "today-marker" : "";
              }}
              columns={[
                { id: "text", header: { text: "Task", css: "header-center" }, width: 220, cell: NameAndDateCell },
                { id: "start", header: { text: "Start Date", css: "header-center" }, width: 110, cell: (props) => <StartDateCell {...props} api={api} /> },
                { id: "end", header: { text: "End Date", css: "header-center" }, width: 110, cell: (props) => <EndDateCell {...props} api={api} /> },
                { id: "weeks", header: { text: "Weeks", css: "header-center" }, width: 55, align: "center", cell: WeeksCell },
                {
                  id: "assigned",
                  header: { text: "Assigned", css: "header-center" },
                  width: 100,
                  cell: (props) => (
                    <AvatarCell {...props} users={users} onEdit={(taskId) => setAssignDialog({ open: true, id: taskId })} />
                  ),
                },
                {
                  id: "add-task",
                  header: { text: "", css: "header-center" },
                  width: 80,
                  align: "center",
                  cell: (props) => <AddTaskCell {...props} api={api} />,
                },
              ]}
              scales={[
                { unit: "month", step: 1, format: "MMMM yyyy" },
                { unit: "week", step: 1, format: "II" },
              ]}
            />
          </Fullscreen>
        </ContextMenu>
        {api && (
          <div style={{ position: "relative" }}>
            <Editor api={api} />
            {editorTaskId != null && (
              <EditorAssignDropdown
                api={api}
                users={users}
                taskId={editorTaskId}
                onSave={(ids) => {
                  api?.exec("update-task", { id: editorTaskId, task: { assigned: ids } });
                }}
              />
            )}
          </div>
        )}
        {/* O diálogo de atribuição direto pela célula continua disponível */}
        <AssignDialog
          open={assignDialog.open}
          task={tasks?.find((t) => String(t.id) === String(assignDialog.id))}
          users={users}
          onClose={() => setAssignDialog({ open: false, id: null })}
          onSave={(ids) => {
            const id = assignDialog.id;
            api?.exec("update-task", { id, task: { assigned: ids } });
            setAssignDialog({ open: false, id: null });
          }}
        />
      </div>
    </div>
  );
}

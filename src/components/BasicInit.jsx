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
  const restProvider = useMemo(
    () => new RestDataProvider("http://localhost:3025/api"),
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
    fetch("http://localhost:3025/api/users")
      .then((r) => r.json())
      .then((u) => setUsers(u))
      .catch(() => setUsers([]));
  }, [restProvider]);

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
              columns={[
                { id: "text", header: "Task", width: 220, cell: NameAndDateCell },
                { id: "start", header: "Start date", width: 95, cell: (props) => <StartDateCell {...props} api={api} /> },
                { id: "end", header: "End date", width: 95, cell: (props) => <EndDateCell {...props} api={api} /> },
                { id: "weeks", header: "Weeks", width: 55, align: "center", cell: WeeksCell },
                {
                  id: "assigned",
                  header: "Assigned",
                  width: 100,
                  cell: (props) => (
                    <AvatarCell {...props} users={users} onEdit={(taskId) => setAssignDialog({ open: true, id: taskId })} />
                  ),
                },
                {
                  id: "add-task",
                  header: { text: "" },
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

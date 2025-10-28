import React, { useMemo, useState, useEffect } from "react";

export default function EditorAssignedInline({ api, users, taskId, onSave }) {
  const [checked, setChecked] = useState(new Set());

  // pega a tarefa atual para popular checks
  const task = useMemo(() => {
    if (!taskId) return null;
    try {
      const all = api?.getState?.()?.tasks || [];
      // fallback: o consumidor passa tasks via prop onSave (não necessário aqui)
      return (all.find?.((t) => String(t.id) === String(taskId))) || null;
    } catch (_) {
      return null;
    }
  }, [api, taskId]);

  useEffect(() => {
    const initial = new Set(Array.isArray(task?.assigned) ? task.assigned.map(String) : []);
    setChecked(initial);
  }, [taskId, task?.assigned]);

  if (!taskId) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", opacity: 0.75, marginBottom: 6 }}>Assigned</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(users || []).map((u) => {
          const id = String(u.id);
          const isOn = checked.has(id);
          return (
            <label key={id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={isOn}
                onChange={(e) => {
                  const set = new Set(checked);
                  if (e.target.checked) set.add(id);
                  else set.delete(id);
                  setChecked(set);
                }}
              />
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "#4f46e5", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
              }}>{u.name?.slice(0,1)?.toUpperCase()}</div>
              <span>{u.name}</span>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button
          onClick={() => onSave?.(Array.from(checked).map((s) => (isNaN(+s) ? s : +s)))}
          style={{ background: "#10b981", color: "#0b0f0f", padding: "6px 10px", borderRadius: 6 }}
        >
          Save
        </button>
      </div>
    </div>
  );
}



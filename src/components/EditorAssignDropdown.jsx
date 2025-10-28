import React, { useMemo, useState, useEffect } from "react";

function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || first.toUpperCase() || "?";
}

export default function EditorAssignDropdown({ api, users, taskId, onSave }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(new Set());

  const task = useMemo(() => {
    if (!taskId) return null;
    try {
      const all = api?.getState?.()?.tasks || [];
      return (all.find?.((t) => String(t.id) === String(taskId))) || null;
    } catch (_) {
      return null;
    }
  }, [api, taskId]);

  useEffect(() => {
    const initial = new Set(Array.isArray(task?.assigned) ? task.assigned.map(String) : []);
    setChecked(initial);
  }, [taskId, task?.assigned]);

  const selected = useMemo(() => {
    const byId = new Map((users || []).map((u) => [String(u.id), u]));
    return Array.from(checked).map((id) => byId.get(String(id))).filter(Boolean);
  }, [checked, users]);

  return (
    <div style={{ position: "absolute", right: 16, top: 210 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", opacity: 0.75, marginBottom: 6 }}>Assigned</div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: "#111827",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 8,
          color: "#e5e7eb",
          minWidth: 140,
        }}
        title="Assign developers"
      >
        {selected.length ? (
          <div style={{ display: "flex", gap: 6 }}>
            {selected.slice(0, 3).map((p) => (
              <div key={p.id} style={{
                width: 20, height: 20, borderRadius: "50%", background: "#4f46e5", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
              }}>{initials(p.name)}</div>
            ))}
            {selected.length > 3 && <span style={{ fontSize: 12, opacity: 0.8 }}>+{selected.length - 3}</span>}
          </div>
        ) : (
          <span style={{ opacity: 0.7 }}>Unassigned ▾</span>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 6,
          width: 260,
          background: "#1f2937",
          color: "#fff",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 8,
          boxShadow: "0 10px 25px rgba(0,0,0,.35)",
          zIndex: 80,
        }}>
          <div style={{ maxHeight: 220, overflow: "auto", padding: 10 }}>
            {(users || []).map((u) => {
              const id = String(u.id);
              const isOn = checked.has(id);
              return (
                <label key={id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
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
                  }}>{initials(u.name)}</div>
                  <span>{u.name}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: 10, borderTop: "1px solid rgba(255,255,255,.08)" }}>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "#374151", color: "#fff", padding: "6px 10px", borderRadius: 6 }}
            >
              Close
            </button>
            <button
              onClick={() => {
                onSave?.(Array.from(checked).map((s) => (isNaN(+s) ? s : +s)));
                setOpen(false);
              }}
              style={{ background: "#10b981", color: "#0b0f0f", padding: "6px 10px", borderRadius: 6 }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



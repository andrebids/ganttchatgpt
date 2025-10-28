import React, { useMemo, useState, useEffect } from "react";

export default function AssignDialog({ open, task, users, onClose, onSave }) {
  const initialChecked = useMemo(() => new Set(Array.isArray(task?.assigned) ? task.assigned.map(String) : []), [task]);
  const [checked, setChecked] = useState(initialChecked);

  useEffect(() => {
    setChecked(initialChecked);
  }, [initialChecked]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    }}>
      <div style={{ background: "#1f2937", color: "#fff", padding: 16, borderRadius: 8, minWidth: 320 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Assign developers</div>
        <div style={{ maxHeight: 260, overflow: "auto", paddingRight: 6 }}>
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
                  width: 22, height: 22, borderRadius: "50%", background: "#4f46e5", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                }}>
                  {u.name?.slice(0,1)?.toUpperCase()}
                </div>
                <span>{u.name}</span>
              </label>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={{ background: "#374151", color: "#fff", padding: "6px 10px", borderRadius: 6 }}>Cancel</button>
          <button
            onClick={() => onSave(Array.from(checked).map((s) => (isNaN(+s) ? s : +s)))}
            style={{ background: "#10b981", color: "#0b0f0f", padding: "6px 10px", borderRadius: 6 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}



import React, { useMemo } from "react";

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || first.toUpperCase() || "?";
}

export default function AvatarCell({ row, users, onEdit }) {
  const assignedIds = Array.isArray(row?.assigned) ? row.assigned : (row?.assigned != null ? [row.assigned] : []);

  const people = useMemo(() => {
    const byId = new Map((users || []).map((u) => [String(u.id), u]));
    return (assignedIds || [])
      .map((id) => byId.get(String(id)))
      .filter(Boolean);
  }, [assignedIds, users]);

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseDown={(e) => { e.preventDefault(); onEdit?.(row?.id); }}
      onClick={() => onEdit?.(row?.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEdit?.(row?.id); }}
      style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer", width: "100%" }}
      title={people.length ? people.map((p) => p.name).join(", ") : "Unassigned"}
    >
      {people.length ? (
        people.map((p) => (
          <div
            key={p.id}
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#4f46e5",
              color: "#fff",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none",
            }}
          >
            {getInitials(p.name)}
          </div>
        ))
      ) : (
        <span style={{ opacity: 0.6 }}>Unassigned</span>
      )}
    </div>
  );
}



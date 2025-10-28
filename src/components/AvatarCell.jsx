import React, { useMemo } from "react";
import { getAvatarColor } from "../utils/avatarColors.js";

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

  const maxVisible = 4;
  const hasMore = people.length > maxVisible;
  const visiblePeople = people.slice(0, maxVisible);
  const remainingCount = people.length - maxVisible;

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseDown={(e) => { e.preventDefault(); onEdit?.(row?.id); }}
      onClick={() => onEdit?.(row?.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEdit?.(row?.id); }}
      style={{ 
        display: "flex", 
        flexDirection: "row",
        alignItems: "center",
        cursor: "pointer", 
        width: "100%",
        height: "100%",
        position: "relative"
      }}
      title={people.length ? people.map((p) => p.name).join(", ") : "Unassigned"}
    >
      {people.length ? (
        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
          {visiblePeople.map((p, index) => (
            <div
              key={p.id}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: getAvatarColor(p),
                color: "#fff",
                fontSize: 11,
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                userSelect: "none",
                border: "2px solid rgba(50, 50, 50, 0.8)",
                position: "relative",
                marginLeft: index === 0 ? 0 : -10,
                zIndex: visiblePeople.length - index,
              }}
            >
              {getInitials(p.name)}
            </div>
          ))}
          {hasMore && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(120, 120, 120, 0.85)",
                color: "#fff",
                fontSize: 10,
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                userSelect: "none",
                border: "2px solid rgba(50, 50, 50, 0.8)",
                position: "relative",
                marginLeft: -10,
                zIndex: 0,
              }}
            >
              +{remainingCount}
            </div>
          )}
        </div>
      ) : (
        <span style={{ opacity: 0.5, fontSize: "10px" }}>-</span>
      )}
    </div>
  );
}



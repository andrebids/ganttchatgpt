import React from "react";

function toInputDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function StartDateCell({ row, api }) {
  const value = toInputDate(row?.start);
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => {
        const v = e.target.value; // yyyy-MM-dd
        if (!v) return;
        const iso = new Date(`${v}T00:00:00Z`).toISOString();
        const payload = { start: iso };
        if (typeof row?.duration === "number") payload.duration = row.duration;
        api?.exec("update-task", { id: row?.id, task: payload });
      }}
      style={{
        width: "100%",
        background: "transparent",
        color: "inherit",
        border: "1px solid rgba(203,213,225,.25)",
        borderRadius: 4,
        height: 24,
        padding: "0 6px",
      }}
    />
  );
}



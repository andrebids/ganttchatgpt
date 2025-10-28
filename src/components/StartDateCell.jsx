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
        background: "rgba(255, 255, 255, 0.05)",
        color: "inherit",
        border: "1px solid rgba(203,213,225,.15)",
        borderRadius: 6,
        height: 28,
        padding: "2px 8px",
        fontSize: "13px",
        fontFamily: "inherit",
        outline: "none",
        transition: "all 0.2s ease",
        cursor: "pointer",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "rgba(59, 130, 246, 0.5)";
        e.target.style.background = "rgba(255, 255, 255, 0.1)";
        e.target.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.1)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "rgba(203,213,225,.15)";
        e.target.style.background = "rgba(255, 255, 255, 0.05)";
        e.target.style.boxShadow = "none";
      }}
    />
  );
}



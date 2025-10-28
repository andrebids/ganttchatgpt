import React from "react";

function toInputDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch (error) {
    console.warn("Invalid date format:", iso);
    return "";
  }
}

export default function EndDateCell({ row, api }) {
  const value = toInputDate(row?.end);
  
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => {
        const v = e.target.value; // yyyy-MM-dd
        if (!v) return;
        try {
          const newEnd = new Date(`${v}T00:00:00Z`);
          const iso = newEnd.toISOString();
          
          // Calculate duration based on start and new end
          const payload = { end: iso };
          if (row?.start) {
            const startDate = new Date(row.start);
            const diffTime = newEnd - startDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            payload.duration = Math.max(1, diffDays); // Minimum 1 day
          }
          
          api?.exec("update-task", { id: row?.id, task: payload });
        } catch (error) {
          console.warn("Error updating end date:", error);
        }
      }}
      style={{
        width: "100%",
        background: "transparent",
        color: "inherit",
        border: "none",
        borderRadius: 0,
        height: "100%",
        padding: "4px 8px",
        fontSize: "13px",
        fontFamily: "inherit",
        outline: "none",
        transition: "all 0.2s ease",
        cursor: "pointer",
      }}
      onFocus={(e) => {
        e.target.style.background = "rgba(255, 255, 255, 0.1)";
        e.target.style.border = "1px solid rgba(59, 130, 246, 0.5)";
        e.target.style.borderRadius = "4px";
      }}
      onBlur={(e) => {
        e.target.style.background = "transparent";
        e.target.style.border = "none";
        e.target.style.borderRadius = "0";
      }}
    />
  );
}


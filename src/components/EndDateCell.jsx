import React from "react";

function formatDateDisplay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDate(dateStr) {
  // Parse dd/mm/yyyy format
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(Date.UTC(year, month, day));
}

export default function EndDateCell({ row, api }) {
  const displayValue = formatDateDisplay(row?.end);
  
  const handleClick = () => {
    const newDate = prompt("Enter date (dd/mm/yyyy):", displayValue);
    if (!newDate) return;
    
    const parsedDate = parseDate(newDate);
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      alert("Invalid date format. Please use dd/mm/yyyy");
      return;
    }
    
    const iso = parsedDate.toISOString();
    const payload = { end: iso };
    
    // Calculate duration based on start and new end
    if (row?.start) {
      const startDate = new Date(row.start);
      const diffTime = parsedDate - startDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      payload.duration = Math.max(1, diffDays); // Minimum 1 day
    }
    
    api?.exec("update-task", { id: row?.id, task: payload });
  };
  
  return (
    <div
      onClick={handleClick}
      style={{
        width: "100%",
        background: "rgba(255, 255, 255, 0.05)",
        color: "inherit",
        border: "1px solid rgba(203,213,225,.15)",
        borderRadius: 4,
        height: 22,
        padding: "2px 4px",
        fontSize: "10.5px",
        fontFamily: "inherit",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(203,213,225,.15)";
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
      }}
    >
      {displayValue || "dd/mm/yyyy"}
    </div>
  );
}

